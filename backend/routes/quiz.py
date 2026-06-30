import random
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Question, Subject, QuizSession, AnswerRecord

router = APIRouter()


# ── 答案归一化 ───────────────────────────────────────────────
# 判断题：AI 返回的 answer 可能是 "对/错/True/False/T/F/✓/✗/正确/错误"，
# 统一映射成 "A"(对) / "B"(错)。前端选项卡合成 "A. 对" / "B. 错"。
_JUDGE_TRUE = {"对", "正确", "是", "true", "t", "yes", "y", "✓", "√", "a", "对 ✓"}
_JUDGE_FALSE = {"错", "错误", "否", "false", "f", "no", "n", "✗", "×", "b", "错 ✗"}


def normalize_judge(answer: str) -> str:
    """把判断题答案归一化为 A 或 B；无法识别时原样返回大写。"""
    if not answer:
        return ""
    a = answer.strip().lower()
    if a in {x.lower() for x in _JUDGE_TRUE}:
        return "A"
    if a in {x.lower() for x in _JUDGE_FALSE}:
        return "B"
    # 兜底：单字符 A/B 直接保留
    if a in {"a", "b"}:
        return a.upper()
    return answer.strip().upper()


def normalize_text(answer: str) -> str:
    """填空/简答题归一化：去标点空白、全角转半角，做宽松匹配。"""
    if not answer:
        return ""
    s = answer.strip()
    # 全角→半角
    fullwidth = str.maketrans("　ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ"
                              "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ"
                              "０１２３４５６７８９",
                              " ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                              "abcdefghijklmnopqrstuvwxyz"
                              "0123456789")
    s = s.translate(fullwidth)
    # 去除中英文标点
    s = re.sub(r"[\s，。、；：！？,.;:!?'\"()（）\[\]【】《》<>]+", "", s)
    return s.lower()


class QuizGenerateRequest(BaseModel):
    subject_id: int
    chapter_ids: list[int] | None = None
    types: list[str] = ["choice"]
    is_ai_generated: bool | None = None
    only_exam_priority: bool = False  # 仅考试重点题目（PDF来源）
    count: int = 20
    question_ids: list[int] | None = None  # 指定题目（错题重练用）


class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: str


class QuizSubmitRequest(BaseModel):
    answers: list[AnswerSubmit]
    time_seconds: int = 0


@router.post("/quiz/generate")
def generate_quiz(data: QuizGenerateRequest, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subj:
        raise HTTPException(404, "学科不存在")

    q = db.query(Question).filter(
        Question.subject_id == data.subject_id,
        Question.type.in_(data.types),
    )

    if data.chapter_ids:
        q = q.filter(Question.chapter_id.in_(data.chapter_ids))
    if data.is_ai_generated is not None:
        q = q.filter(Question.is_ai_generated == data.is_ai_generated)

    # 指定题目模式（错题重练）：直接用 question_ids，打乱顺序
    if data.question_ids:
        all_ids = list(data.question_ids)
        random.shuffle(all_ids)
    else:
        all_ids = [row.id for row in q.all()]

    # 仅考试重点：在Python侧过滤
    if data.only_exam_priority and not data.question_ids and all_ids:
        from routes.questions import get_priority
        sources = dict(db.query(Question.id, Question.source_document).filter(Question.id.in_(all_ids)).all())
        all_ids = [qid for qid in all_ids if get_priority(sources.get(qid) or "") == "high"]

    if len(all_ids) < data.count:
        selected_ids = all_ids
    else:
        selected_ids = random.sample(all_ids, data.count)

    questions = db.query(Question).filter(Question.id.in_(selected_ids)).all()
    # 保持 selected_ids 的顺序
    qmap = {qq.id: qq for qq in questions}
    questions = [qmap[i] for i in selected_ids if i in qmap]

    session = QuizSession(
        subject_id=data.subject_id,
        filters={
            "chapter_ids": data.chapter_ids,
            "types": data.types,
            "is_ai_generated": data.is_ai_generated,
            "question_ids": selected_ids,  # 持久化抽中的题目，用于刷新恢复
        },
        total_questions=len(questions),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "questions": [
            {
                "id": qq.id,
                "stem": qq.stem,
                "options": qq.options,
                "type": qq.type,
            }
            for qq in questions
        ],
    }


@router.post("/quiz/{session_id}/submit")
def submit_quiz(session_id: int, data: QuizSubmitRequest, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "练习不存在")
    if session.completed:
        raise HTTPException(400, "练习已完成")

    correct_count = 0
    # 性能修复：只查本次练习涉及到的题目，避免全表扫描
    qids = [a.question_id for a in data.answers]
    question_map = {q.id: q for q in db.query(Question).filter(Question.id.in_(qids)).all()}

    for ans in data.answers:
        q = question_map.get(ans.question_id)
        if not q:
            continue
        selected_raw = (ans.selected_answer or "").strip()
        expected_raw = (q.answer or "").strip()

        if q.type == "judge":
            is_correct = normalize_judge(selected_raw) == normalize_judge(expected_raw)
        elif q.type == "multi_choice":
            is_correct = sorted(selected_raw.upper()) == sorted(expected_raw.upper())
        elif q.type in ("fill", "essay"):
            # 文本题：宽松匹配（去标点空白、全角转半角、忽略大小写）
            is_correct = bool(selected_raw) and normalize_text(selected_raw) == normalize_text(expected_raw)
        else:  # choice
            is_correct = selected_raw.upper() == expected_raw.upper()

        if is_correct:
            correct_count += 1
        db.add(AnswerRecord(
            session_id=session_id,
            question_id=ans.question_id,
            selected_answer=ans.selected_answer,
            is_correct=is_correct,
        ))

    session.correct_count = correct_count
    session.time_seconds = data.time_seconds
    session.completed = True
    db.commit()

    return {
        "correct_count": correct_count,
        "total": len(data.answers),
        "accuracy": round(correct_count / len(data.answers) * 100, 1) if data.answers else 0,
    }


# Fixed-path GET routes must come BEFORE /{session_id} to avoid FastAPI path conflict

@router.get("/quiz/history")
def quiz_history(
    subject_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(QuizSession).filter(QuizSession.completed == True)
    if subject_id:
        q = q.filter(QuizSession.subject_id == subject_id)

    total = q.count()
    sessions = (
        q.order_by(QuizSession.date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # 一次查出所有涉及的学科名，避免 N+1
    subject_ids = {s.subject_id for s in sessions}
    subjects_map = {
        sub.id: sub.name
        for sub in db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
    } if subject_ids else {}

    return {
        "total": total,
        "items": [
            {
                "id": s.id,
                "date": s.date.isoformat(),
                "subject_id": s.subject_id,
                "subject_name": subjects_map.get(s.subject_id, ""),
                "total_questions": s.total_questions,
                "correct_count": s.correct_count,
                "accuracy": round(s.correct_count / s.total_questions * 100, 1) if s.total_questions else 0,
                "time_seconds": s.time_seconds,
            }
            for s in sessions
        ],
    }


@router.get("/quiz/wrong-questions")
def wrong_questions(
    subject_id: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(AnswerRecord).filter(AnswerRecord.is_correct == False)
    if subject_id:
        q = q.join(QuizSession).filter(QuizSession.subject_id == subject_id)

    records = q.order_by(AnswerRecord.id.desc()).limit(500).all()

    # Count wrong occurrences per question
    from collections import Counter
    wrong_counts = Counter(ar.question_id for ar in records)

    # 批量查询 — 避免 N+1
    unique_qids = list(set(ar.question_id for ar in records))
    questions_map = {}
    subjects_map = {}
    if unique_qids:
        questions_list = db.query(Question).filter(Question.id.in_(unique_qids)).all()
        questions_map = {qq.id: qq for qq in questions_list}
        unique_sids = list(set(qq.subject_id for qq in questions_list))
        if unique_sids:
            subjects_list = db.query(Subject).filter(Subject.id.in_(unique_sids)).all()
            subjects_map = {s.id: s for s in subjects_list}

    seen = set()
    result = []
    for ar in records:
        if ar.question_id in seen:
            continue
        seen.add(ar.question_id)
        question = questions_map.get(ar.question_id)
        if not question:
            continue
        subject = subjects_map.get(question.subject_id)
        result.append({
            "record_id": ar.id,
            "question_id": question.id,
            "subject_id": question.subject_id,
            "subject_name": subject.name if subject else "",
            "stem": question.stem,
            "options": question.options,
            "answer": question.answer,
            "explanation": question.explanation,
            "type": question.type,
            "selected_answer": ar.selected_answer,
            "wrong_count": wrong_counts[ar.question_id],
        })

    return {"items": result}


@router.delete("/quiz/wrong-questions/{question_id}")
def mark_question_mastered(question_id: int, db: Session = Depends(get_db)):
    """把题目从错题本移除（标记为已掌握）。
    策略：删除该题所有错答记录。如果以后又答错，会重新进入错题本。"""
    deleted = db.query(AnswerRecord).filter(
        AnswerRecord.question_id == question_id,
        AnswerRecord.is_correct == False,
    ).delete(synchronize_session=False)
    db.commit()
    return {"removed": deleted}


@router.get("/quiz/{session_id}")
def get_quiz_result(session_id: int, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "练习不存在")

    # 批量查询题目和学科 — 避免 N+1
    question_ids = [ar.question_id for ar in session.answers]
    questions_map = {}
    subject = db.query(Subject).filter(Subject.id == session.subject_id).first()
    if question_ids:
        q_list = db.query(Question).filter(Question.id.in_(question_ids)).all()
        questions_map = {qq.id: qq for qq in q_list}

    answers = []
    for ar in session.answers:
        q = questions_map.get(ar.question_id)
        if q:
            answers.append({
                "question_id": q.id,
                "stem": q.stem,
                "options": q.options,
                "answer": q.answer,
                "explanation": q.explanation,
                "type": q.type,
                "selected_answer": ar.selected_answer,
                "is_correct": ar.is_correct,
            })

    return {
        "session_id": session.id,
        "date": session.date.isoformat(),
        "subject_id": session.subject_id,
        "subject_name": subject.name if subject else "",
        "total_questions": session.total_questions,
        "correct_count": session.correct_count,
        "time_seconds": session.time_seconds,
        "answers": answers,
    }


@router.get("/quiz/{session_id}/questions")
def get_session_questions(session_id: int, db: Session = Depends(get_db)):
    """刷新练习页时恢复题目。
    - 未完成：从 session.filters.question_ids 恢复题干（不含答案）。
    - 已完成：返回完整结果（含正确答案与是否正确）。
    """
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "练习不存在")

    if session.completed:
        records = {ar.question_id: ar for ar in session.answers}
        qs = db.query(Question).filter(Question.id.in_(list(records.keys()))).all() if records else []
        qmap = {q.id: q for q in qs}
        questions = []
        for qid, ar in records.items():
            q = qmap.get(qid)
            if not q:
                continue
            questions.append({
                "id": q.id, "stem": q.stem, "options": q.options, "type": q.type,
                "answer": q.answer, "explanation": q.explanation,
                "selected_answer": ar.selected_answer, "is_correct": ar.is_correct,
            })
        return {"session_id": session.id, "subject_id": session.subject_id,
                "completed": True, "questions": questions}

    # 未完成：从 filters.question_ids 恢复
    filters = session.filters or {}
    qids = filters.get("question_ids") or []
    if not qids:
        raise HTTPException(404, "题目快照丢失，请重新生成练习")
    qs = db.query(Question).filter(Question.id.in_(qids)).all()
    qmap = {q.id: q for q in qs}
    # 按 filters 里的原始顺序返回
    questions = []
    for qid in qids:
        q = qmap.get(qid)
        if q:
            questions.append({"id": q.id, "stem": q.stem, "options": q.options, "type": q.type})
    return {"session_id": session.id, "subject_id": session.subject_id,
            "completed": False, "questions": questions}
