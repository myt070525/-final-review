from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Question, Subject
from services.ai import generate_explanation, generate_similar_questions

router = APIRouter()


def get_priority(source: str) -> str:
    """根据来源判断优先级：PDF=考试重点，PPT=章节练习"""
    if not source:
        return "normal"
    s = source.lower()
    if "pdf" in s or "模拟卷" in s or "复习" in s:
        return "high"
    return "normal"


def get_source_label(source: str) -> str:
    """返回带emoji的来源标签"""
    p = get_priority(source)
    if p == "high":
        return f"🎯 {source}"
    return f"📎 {source}"


class QuestionCreate(BaseModel):
    subject_id: int
    chapter_id: int | None = None
    type: str = "choice"
    stem: str
    options: list[str] | None = None
    answer: str
    tags: list[str] = []
    difficulty: str = "medium"


class QuestionUpdate(BaseModel):
    chapter_id: int | None = None
    type: str = "choice"
    stem: str
    options: list[str] | None = None
    answer: str
    tags: list[str] = []
    difficulty: str = "medium"
    explanation: str = ""


@router.get("/questions")
def list_questions(
    subject_id: int | None = None,
    chapter_id: int | None = None,
    type: str | None = None,
    is_ai_generated: bool | None = None,
    priority: str | None = None,  # high=考试重点 / normal=章节练习
    search: str | None = None,
    page: int = 1,
    page_size: int = 30,
    db: Session = Depends(get_db),
):
    q = db.query(Question)

    if subject_id:
        q = q.filter(Question.subject_id == subject_id)
    if chapter_id:
        q = q.filter(Question.chapter_id == chapter_id)
    if type:
        q = q.filter(Question.type == type)
    if is_ai_generated is not None:
        q = q.filter(Question.is_ai_generated == is_ai_generated)
    if search:
        q = q.filter(Question.stem.contains(search))

    # 如果指定了priority筛选，需要先查出全量再过滤，再分页
    # （SQLite不支持在source_document上做复杂LIKE，必须在Python侧过滤）
    if priority:
        # 先把所有匹配的 (id, source_document) 查出来
        all_rows = q.with_entities(Question.id, Question.source_document).all()
        # Python侧过滤
        filtered_ids = [row.id for row in all_rows if get_priority(row.source_document or "") == priority]
        total = len(filtered_ids)
        # 分页
        start = (page - 1) * page_size
        page_ids = filtered_ids[start:start + page_size]
        # 按 ID 顺序查出完整题目（保持与过滤前一致的排序）
        questions = db.query(Question).filter(Question.id.in_(page_ids)).order_by(Question.created_at.desc()).all() if page_ids else []
        # 恢复 page_ids 的顺序
        qmap = {qq.id: qq for qq in questions}
        questions = [qmap[i] for i in page_ids if i in qmap]
    else:
        total = q.count()
        questions = (
            q.order_by(Question.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": qq.id,
                "subject_id": qq.subject_id,
                "chapter_id": qq.chapter_id,
                "type": qq.type,
                "stem": qq.stem,
                "options": qq.options,
                "answer": qq.answer,
                "explanation": qq.explanation,
                "source_document": qq.source_document,
                "source_label": get_source_label(qq.source_document or ""),
                "priority": get_priority(qq.source_document or ""),
                "is_ai_generated": qq.is_ai_generated,
                "tags": qq.tags or [],
                "difficulty": qq.difficulty,
            }
            for qq in questions
        ],
    }


@router.post("/questions")
def create_question(data: QuestionCreate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subj:
        raise HTTPException(404, "学科不存在")
    q = Question(
        subject_id=data.subject_id,
        chapter_id=data.chapter_id,
        type=data.type,
        stem=data.stem,
        options=data.options,
        answer=data.answer,
        tags=data.tags,
        difficulty=data.difficulty,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"id": q.id}


@router.get("/questions/sets")
def list_question_sets(subject_id: int, db: Session = Depends(get_db)):
    """Group questions by source_document for a subject."""
    questions = (
        db.query(Question)
        .filter(Question.subject_id == subject_id)
        .order_by(Question.created_at.desc())
        .all()
    )

    groups: dict[str, list] = {}
    for q in questions:
        key = q.source_document or "手动添加"
        if key not in groups:
            groups[key] = []
        groups[key].append({
            "id": q.id,
            "type": q.type,
            "stem": q.stem,
            "options": q.options,
            "answer": q.answer,
            "explanation": q.explanation,
            "is_ai_generated": q.is_ai_generated,
            "tags": q.tags or [],
            "difficulty": q.difficulty,
        })

    sets = []
    for doc_name, qs in groups.items():
        type_counts = {}
        for q in qs:
            t = q["type"]
            type_counts[t] = type_counts.get(t, 0) + 1
        sets.append({
            "source_document": doc_name,
            "count": len(qs),
            "types": type_counts,
            "questions": qs,
        })

    sets.sort(key=lambda s: s["count"], reverse=True)
    return {"subject_id": subject_id, "total_sets": len(sets), "sets": sets}


@router.get("/questions/{question_id}")
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "题目不存在")
    return {
        "id": q.id,
        "subject_id": q.subject_id,
        "chapter_id": q.chapter_id,
        "type": q.type,
        "stem": q.stem,
        "options": q.options,
        "answer": q.answer,
        "explanation": q.explanation,
        "source_document": q.source_document,
        "is_ai_generated": q.is_ai_generated,
        "tags": q.tags or [],
        "difficulty": q.difficulty,
    }


@router.put("/questions/{question_id}")
def update_question(question_id: int, data: QuestionUpdate, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "题目不存在")
    q.chapter_id = data.chapter_id
    q.type = data.type
    q.stem = data.stem
    q.options = data.options
    q.answer = data.answer
    q.tags = data.tags
    q.difficulty = data.difficulty
    q.explanation = data.explanation
    db.commit()
    return {"ok": True}


@router.delete("/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "题目不存在")
    db.delete(q)
    db.commit()
    return {"ok": True}


@router.post("/questions/{question_id}/explain")
def get_or_generate_explanation(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "题目不存在")

    if q.explanation and q.explanation_generated_at:
        return {"explanation": q.explanation, "cached": True}

    # 查学科名，用于判断文科/理科以调整解析风格
    subject_name = ""
    if q.subject_id:
        subj = db.query(Subject).filter(Subject.id == q.subject_id).first()
        if subj:
            subject_name = subj.name

    explanation = generate_explanation(
        stem=q.stem,
        options=q.options,
        answer=q.answer,
        question_type=q.type,
        subject_name=subject_name,
    )

    q.explanation = explanation
    from datetime import datetime
    q.explanation_generated_at = datetime.utcnow()
    db.commit()

    return {"explanation": explanation, "cached": False}


@router.post("/questions/{question_id}/generate-similar")
def generate_similar(question_id: int, count: int = 2, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "题目不存在")

    similar = generate_similar_questions(
        stem=q.stem,
        options=q.options,
        answer=q.answer,
        explanation=q.explanation,
        question_type=q.type,
        count=count,
    )

    result = []
    for item in similar:
        new_q = Question(
            subject_id=q.subject_id,
            chapter_id=q.chapter_id,
            type=q.type,
            stem=item["stem"],
            options=item.get("options"),
            answer=item["answer"],
            is_ai_generated=True,
            tags=item.get("tags", q.tags or []),
            difficulty=q.difficulty,
        )
        db.add(new_q)
        result.append(new_q)

    # 一次性提交所有新题
    db.commit()
    for new_q in result:
        db.refresh(new_q)

    return {"questions": [
        {
            "id": new_q.id,
            "stem": new_q.stem,
            "options": new_q.options,
            "answer": new_q.answer,
        }
        for new_q in result
    ]}


@router.post("/questions/batch-delete")
def batch_delete_questions(ids: list[int], db: Session = Depends(get_db)):
    db.query(Question).filter(Question.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}
