"""
Java 复习板块 API — 知识树 / 错题联动 / 学习路径 / 模拟考试 / 代码运行
"""

import json
import re
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Subject, Chapter, Question, KnowledgeNode, WrongQuestionKnowledge, LearningProgress, QuizSession, AnswerRecord
from services.ai import client as ai_client
from services.parser import extract_text_from_file
from services.jdoodle import run_java
from config import AI_MODEL

router = APIRouter()


# ── JSON 安全解析（复用 ai.py 模式）─────────────────────────────

def _parse_json_safe(text: str) -> list | dict:
    """四级兜底 JSON 解析"""
    if not text:
        return []
    # 1) 直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # 2) 提取 markdown 代码块
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass
    # 3) 截断修复 — 找最后一个完整的对象/数组
    try:
        # 找最外层 [ 或 {
        trimmed = text.strip()
        if trimmed.startswith("["):
            depth = 0
            last_good = 0
            for i, ch in enumerate(trimmed):
                if ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        last_good = i + 1
                        break
            if last_good > 0:
                return json.loads(trimmed[:last_good])
        elif trimmed.startswith("{"):
            depth = 0
            last_good = 0
            in_string = False
            escape = False
            for i, ch in enumerate(trimmed):
                if escape:
                    escape = False
                    continue
                if ch == "\\":
                    escape = True
                    continue
                if ch == '"':
                    in_string = not in_string
                if in_string:
                    continue
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        last_good = i + 1
                        break
            if last_good > 0:
                return json.loads(trimmed[:last_good])
    except json.JSONDecodeError:
        pass
    # 4) 正则暴力提取最外层 JSON 数组
    m = re.search(r"\[([\s\S]*)\]", text)
    if m:
        try:
            return json.loads("[" + m.group(1) + "]")
        except json.JSONDecodeError:
            pass
    return []


# ── Pydantic 模型 ─────────────────────────────────────────────

class KnowledgeNodeCreate(BaseModel):
    title: str
    content: str = ""
    key_terms: list[str] = []
    chapter: str | None = None
    difficulty: str = "medium"
    order: int = 0
    parent_index: int | None = None  # 父节点在平铺列表中的索引


class KnowledgeImportRequest(BaseModel):
    subject_id: int
    chapter_id: int | None = None
    chapter_name: str | None = None
    nodes: list[KnowledgeNodeCreate]


class CodeRunRequest(BaseModel):
    code: str
    stdin: str = ""


class GateQuizRequest(BaseModel):
    chapter_id: int


class MockExamRequest(BaseModel):
    subject_id: int


# ═══════════════════════════════════════════════════════════════
# Phase 4.1 — 知识树 CRUD
# ═══════════════════════════════════════════════════════════════

@router.get("/java/subjects/{subject_id}/knowledge-tree")
def get_knowledge_tree(subject_id: int, db: Session = Depends(get_db)):
    """返回按章节组织的完整知识树"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(404, "学科不存在")

    # 取该学科所有知识节点
    nodes = db.query(KnowledgeNode).filter(
        KnowledgeNode.subject_id == subject_id
    ).order_by(KnowledgeNode.order).all()

    # 构建 node_id → node 映射
    node_map = {}
    for n in nodes:
        node_map[n.id] = {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "key_terms": n.key_terms or [],
            "difficulty": n.difficulty,
            "order": n.order,
            "source": n.source,
            "parent_id": n.parent_id,
            "chapter_id": n.chapter_id,
            "children": [],
        }

    # 构建树：先按章节分组，再处理父子关系
    chapters = db.query(Chapter).filter(Chapter.subject_id == subject_id).order_by(Chapter.id).all()
    tree = []
    orphan_nodes = []  # 没有章节归属的节点
    node_ids_by_chapter = {ch.id: [] for ch in chapters}
    node_ids_by_chapter[None] = []

    for n in nodes:
        cid = n.chapter_id if n.chapter_id in node_ids_by_chapter else None
        node_ids_by_chapter[cid].append(n.id)

    for ch in chapters:
        chapter_nodes = []
        ch_node_ids = node_ids_by_chapter.get(ch.id, [])
        # 找出顶级节点（parent_id 为空或不在当前节点集合中）
        all_ids = set(ch_node_ids)
        roots = []
        children_map = {}
        for nid in ch_node_ids:
            nd = node_map[nid]
            if nd["parent_id"] and nd["parent_id"] in all_ids:
                children_map.setdefault(nd["parent_id"], []).append(nd)
            else:
                roots.append(nd)
        # 递归构建子树
        def _build_tree(node):
            node["children"] = sorted(children_map.get(node["id"], []), key=lambda x: x["order"])
            for child in node["children"]:
                _build_tree(child)
            return node
        chapter_nodes = sorted([_build_tree(r) for r in roots], key=lambda x: x["order"])
        tree.append({
            "chapter_id": ch.id,
            "chapter_name": ch.name,
            "nodes": chapter_nodes,
        })

    return {"subject_id": subject_id, "subject_name": subject.name, "tree": tree}


@router.get("/java/knowledge/search")
def search_knowledge(q: str, subject_id: int | None = None, db: Session = Depends(get_db)):
    """按关键词搜索知识点"""
    query = db.query(KnowledgeNode)
    if subject_id:
        query = query.filter(KnowledgeNode.subject_id == subject_id)
    # 搜索 title + key_terms JSON 字段
    nodes = query.all()
    q_lower = q.lower()
    results = []
    for n in nodes:
        title_match = q_lower in n.title.lower()
        terms_match = any(q_lower in t.lower() for t in (n.key_terms or []))
        content_match = q_lower in n.content.lower()[:500]
        if title_match or terms_match or content_match:
            results.append({
                "id": n.id,
                "title": n.title,
                "chapter_id": n.chapter_id,
                "key_terms": n.key_terms or [],
                "score": 3 if title_match else (2 if terms_match else 1),
            })
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"items": results[:20]}


@router.get("/java/knowledge/{node_id}")
def get_knowledge_node(node_id: int, db: Session = Depends(get_db)):
    """获取单个知识节点详情"""
    node = db.query(KnowledgeNode).filter(KnowledgeNode.id == node_id).first()
    if not node:
        raise HTTPException(404, "知识点不存在")

    # 获取关联题目
    related_questions = db.query(Question).filter(
        Question.subject_id == node.subject_id
    ).limit(20).all()  # 后续通过 tags/key_terms 精确匹配

    return {
        "id": node.id,
        "title": node.title,
        "content": node.content,
        "key_terms": node.key_terms or [],
        "difficulty": node.difficulty,
        "source": node.source,
        "chapter_id": node.chapter_id,
        "parent_id": node.parent_id,
        "related_questions": [
            {"id": q.id, "stem": q.stem[:120], "type": q.type}
            for q in related_questions[:10]
        ],
    }


@router.post("/java/subjects/{subject_id}/extract-knowledge")
async def extract_knowledge_from_ppt(
    subject_id: int,
    file: UploadFile = File(...),
    chapter_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    """上传 PPT/PDF，AI 提取结构化知识点"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(404, "学科不存在")

    # 验证文件格式
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pptx", "pdf", "docx", "txt"):
        raise HTTPException(400, "仅支持 pptx/pdf/docx/txt 格式")

    # 保存临时文件
    import os
    from config import UPLOAD_DIR, MAX_UPLOAD_SIZE
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    tmp_path = os.path.join(UPLOAD_DIR, f"_java_knowledge_{datetime.utcnow().timestamp()}.{ext}")
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(413, f"文件过大，最大支持 {MAX_UPLOAD_SIZE // 1024 // 1024}MB")
    with open(tmp_path, "wb") as f:
        f.write(content)

    try:
        # 提取文本
        text = extract_text_from_file(tmp_path, ext)

        # 获取章节列表作为参考
        chapters = db.query(Chapter).filter(Chapter.subject_id == subject_id).all()
        chapter_names = [ch.name for ch in chapters]

        # AI 提取结构化知识
        system_prompt = """你是一个 Java 面向对象程序设计课程的教学助手。
请从给定的PPT/PDF文本中提取结构化的知识点。

要求：
1. 按章节组织知识点（如果文本中有章节标识）
2. 每个知识点包含 title（标题）、content（正文，Markdown格式，不超过800字）、key_terms（关键术语列表，3-8个）
3. 支持层级结构：大知识点下可以有子知识点，用 parent_index 表示（根节点 parent_index 为 null）
4. content 要精炼准确，不要直接复制PPT中的大段文字

输出纯 JSON 数组（不要 markdown 代码块，不要任何解释文字）：
[{"title": "JDK、JRE、JVM 的区别", "content": "JDK（Java Development Kit）是...", "key_terms": ["JDK", "JRE", "JVM"], "chapter": "第1章 Java概述", "difficulty": "easy", "order": 1, "parent_index": null}]"""

        user_prompt = f"""课程：{subject.name}
已有章节：{', '.join(chapter_names) if chapter_names else '暂无'}
指定章节ID（可为空）：{chapter_id}

PPT/PDF 文本内容：
{text[:6000]}

请提取所有知识点，返回 JSON 数组。"""

        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=8192,
        )
        raw = response.choices[0].message.content or ""

        nodes = _parse_json_safe(raw)
        if not isinstance(nodes, list) or len(nodes) == 0:
            return {"nodes": [], "raw_text": text[:1000], "ai_response": raw[:500]}

        return {
            "subject_id": subject_id,
            "chapter_id": chapter_id,
            "source": file.filename,
            "nodes": nodes,
            "raw_text_preview": text[:1000],
        }
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/java/knowledge/import")
def import_knowledge_nodes(data: KnowledgeImportRequest, db: Session = Depends(get_db)):
    """批量导入确认后的知识点"""
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(404, "学科不存在")

    # 处理章节
    chapter_id = data.chapter_id
    if not chapter_id and data.chapter_name:
        ch = db.query(Chapter).filter(
            Chapter.subject_id == data.subject_id,
            Chapter.name == data.chapter_name,
        ).first()
        if not ch:
            ch = Chapter(subject_id=data.subject_id, name=data.chapter_name)
            db.add(ch)
            db.flush()
        chapter_id = ch.id

    # 逐层插入节点（先根节点，再子节点）
    id_map = {}  # 平铺索引 → DB ID
    imported = 0

    for i, nd in enumerate(data.nodes):
        parent_id = None
        if nd.parent_index is not None and nd.parent_index in id_map:
            parent_id = id_map[nd.parent_index]

        kn = KnowledgeNode(
            subject_id=data.subject_id,
            chapter_id=chapter_id,
            parent_id=parent_id,
            title=nd.title,
            content=nd.content,
            key_terms=nd.key_terms,
            difficulty=nd.difficulty,
            order=nd.order,
            is_ai_generated=True,
        )
        db.add(kn)
        db.flush()
        id_map[i] = kn.id
        imported += 1

    db.commit()
    return {"imported": imported, "chapter_id": chapter_id}


# ═══════════════════════════════════════════════════════════════
# Phase 4.3 — 代码运行器
# ═══════════════════════════════════════════════════════════════

@router.post("/java/run")
async def run_java_code(data: CodeRunRequest):
    """在线运行 Java 代码"""
    try:
        result = await run_java(data.code, data.stdin)
        return result
    except RuntimeError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"代码运行失败: {str(e)}")


# ═══════════════════════════════════════════════════════════════
# Phase 4.2 — 错题-知识点联动
# ═══════════════════════════════════════════════════════════════

@router.post("/java/wrong-question/{question_id}/link-knowledge")
def link_wrong_question_knowledge(question_id: int, db: Session = Depends(get_db)):
    """AI 分析错题，匹配关联知识点"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(404, "题目不存在")

    # 获取该学科所有知识节点作为候选
    nodes = db.query(KnowledgeNode).filter(
        KnowledgeNode.subject_id == question.subject_id
    ).all()

    if not nodes:
        return {"linked": [], "message": "该学科暂无知识点，请先导入知识库"}

    # 构建候选列表
    candidates = [{"id": n.id, "title": n.title, "key_terms": n.key_terms or []} for n in nodes]

    # AI 匹配
    system_prompt = """你是 Java 课程助教。请分析这道错题涉及哪些知识点，从候选列表中选出最相关的（最多3个）。
返回纯 JSON 数组（不要 markdown 代码块）：
[{"node_id": 1, "relevance": 0.95, "reason": "题目考察继承中的super关键字调用"}]"""

    user_prompt = f"""题目：{question.stem}
答案：{question.answer}
题型：{question.type}

候选知识点列表：
{json.dumps(candidates, ensure_ascii=False)}

请选出最相关的知识点（最多3个），按相关性排序。"""

    try:
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=1024,
        )
        raw = response.choices[0].message.content or ""
        matches = _parse_json_safe(raw)
        if not isinstance(matches, list):
            matches = []
    except Exception:
        matches = []

    # 写入关联表（先清除旧关联）
    db.query(WrongQuestionKnowledge).filter(
        WrongQuestionKnowledge.question_id == question_id
    ).delete()

    linked = []
    for m in matches[:3]:
        nid = m.get("node_id") if isinstance(m, dict) else m
        score = m.get("relevance", 0.8) if isinstance(m, dict) else 0.8
        if isinstance(nid, int):
            wqk = WrongQuestionKnowledge(
                question_id=question_id,
                knowledge_node_id=nid,
                relevance_score=score,
            )
            db.add(wqk)
            linked.append({"node_id": nid, "relevance": score})
    db.commit()

    return {"linked": linked}


@router.post("/java/wrong-question/auto-link-all")
def auto_link_all_wrong_questions(subject_id: int | None = None, db: Session = Depends(get_db)):
    """批量分析所有未关联的错题"""
    # 查询所有错题
    q = db.query(AnswerRecord).filter(AnswerRecord.is_correct == False)
    if subject_id:
        q = q.join(QuizSession).filter(QuizSession.subject_id == subject_id)

    records = q.order_by(AnswerRecord.id.desc()).limit(100).all()

    # 去重
    seen = set()
    processed = 0
    for ar in records:
        if ar.question_id in seen:
            continue
        seen.add(ar.question_id)

        # 检查是否已关联
        existing = db.query(WrongQuestionKnowledge).filter(
            WrongQuestionKnowledge.question_id == ar.question_id
        ).first()
        if existing:
            continue

        # 调用单题关联逻辑
        try:
            link_wrong_question_knowledge(ar.question_id, db)
            processed += 1
        except Exception:
            continue

    return {"processed": processed}


@router.get("/java/wrong-knowledge-stats")
def wrong_knowledge_stats(subject_id: int | None = None, db: Session = Depends(get_db)):
    """按知识点聚合错误次数（弱项诊断）"""
    q = db.query(
        WrongQuestionKnowledge.knowledge_node_id,
        KnowledgeNode.title,
        KnowledgeNode.chapter_id,
    ).join(
        KnowledgeNode, WrongQuestionKnowledge.knowledge_node_id == KnowledgeNode.id
    )

    if subject_id:
        q = q.filter(KnowledgeNode.subject_id == subject_id)

    rows = q.all()

    from collections import Counter
    counter = Counter()
    node_info = {}
    for nid, title, ch_id in rows:
        counter[nid] += 1
        node_info[nid] = {"title": title, "chapter_id": ch_id}

    stats = sorted(
        [{"node_id": nid, "title": node_info[nid]["title"], "chapter_id": node_info[nid]["chapter_id"], "wrong_count": cnt}
         for nid, cnt in counter.items()],
        key=lambda x: x["wrong_count"], reverse=True,
    )
    return {"items": stats}


# ═══════════════════════════════════════════════════════════════
# Phase 4.4 — 学习路径 / 闯关模式
# ═══════════════════════════════════════════════════════════════

@router.get("/java/subjects/{subject_id}/learning-path")
def get_learning_path(subject_id: int, db: Session = Depends(get_db)):
    """获取学习路径状态"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(404, "学科不存在")

    chapters = db.query(Chapter).filter(Chapter.subject_id == subject_id).order_by(Chapter.id).all()

    # 确保每个章节都有 LearningProgress 记录
    existing = {
        lp.chapter_id: lp
        for lp in db.query(LearningProgress).filter(
            LearningProgress.subject_id == subject_id
        ).all()
    }

    path = []
    for i, ch in enumerate(chapters):
        lp = existing.get(ch.id)
        if not lp:
            lp = LearningProgress(
                subject_id=subject_id,
                chapter_id=ch.id,
                status="unlocked" if i == 0 else "locked",
            )
            db.add(lp)
            db.flush()

        # 统计该章节知识点数和题目数
        knowledge_count = db.query(KnowledgeNode).filter(
            KnowledgeNode.chapter_id == ch.id
        ).count()
        question_count = db.query(Question).filter(
            Question.subject_id == subject_id,
            Question.chapter_id == ch.id,
        ).count()

        path.append({
            "chapter_id": ch.id,
            "chapter_name": ch.name,
            "status": lp.status,
            "quiz_passed": lp.quiz_passed,
            "score": lp.score,
            "knowledge_count": knowledge_count,
            "question_count": question_count,
            "completed_at": lp.completed_at.isoformat() if lp.completed_at else None,
        })

    db.commit()
    return {"subject_id": subject_id, "subject_name": subject.name, "path": path}


@router.post("/java/subjects/{subject_id}/gate-quiz")
def generate_gate_quiz(subject_id: int, data: GateQuizRequest, db: Session = Depends(get_db)):
    """生成章节闯关测验"""
    chapter = db.query(Chapter).filter(Chapter.id == data.chapter_id).first()
    if not chapter:
        raise HTTPException(404, "章节不存在")

    # 查询该章节的题目
    qids = [row.id for row in db.query(Question.id).filter(
        Question.subject_id == subject_id,
        Question.chapter_id == data.chapter_id,
    ).all()]

    if len(qids) < 5:
        raise HTTPException(400, f"该章节仅有 {len(qids)} 道题，至少需要5道题才能闯关")

    count = min(20, len(qids))
    selected_ids = random.sample(qids, count)
    questions = db.query(Question).filter(Question.id.in_(selected_ids)).all()
    qmap = {qq.id: qq for qq in questions}

    session = QuizSession(
        subject_id=subject_id,
        filters={
            "chapter_ids": [data.chapter_id],
            "gate_mode": True,
            "question_ids": selected_ids,
        },
        total_questions=len(selected_ids),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "chapter_id": data.chapter_id,
        "chapter_name": chapter.name,
        "questions": [
            {"id": qmap[i].id, "stem": qmap[i].stem, "options": qmap[i].options, "type": qmap[i].type}
            for i in selected_ids if i in qmap
        ],
    }


@router.post("/java/gate-quiz/{session_id}/submit")
def submit_gate_quiz(session_id: int, data: dict, db: Session = Depends(get_db)):
    """提交闯关测验并更新学习进度"""
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "练习不存在")
    if session.completed:
        raise HTTPException(400, "练习已完成")

    answers = data.get("answers", [])
    time_seconds = data.get("time_seconds", 0)

    # 复用 quiz.py 的归一化逻辑
    from routes.quiz import normalize_judge, normalize_text

    correct_count = 0
    qids = [a.get("question_id") for a in answers]
    question_map = {q.id: q for q in db.query(Question).filter(Question.id.in_(qids)).all()}

    for ans in answers:
        q = question_map.get(ans.get("question_id"))
        if not q:
            continue
        selected_raw = (ans.get("selected_answer") or "").strip()
        expected_raw = (q.answer or "").strip()

        if q.type == "judge":
            is_correct = normalize_judge(selected_raw) == normalize_judge(expected_raw)
        elif q.type == "multi_choice":
            is_correct = sorted(selected_raw.upper()) == sorted(expected_raw.upper())
        elif q.type in ("fill", "essay"):
            is_correct = bool(selected_raw) and normalize_text(selected_raw) == normalize_text(expected_raw)
        else:
            is_correct = selected_raw.upper() == expected_raw.upper()

        if is_correct:
            correct_count += 1
        db.add(AnswerRecord(
            session_id=session_id,
            question_id=ans.get("question_id"),
            selected_answer=ans.get("selected_answer", ""),
            is_correct=is_correct,
        ))

    total = len(answers)
    score = round(correct_count / total * 100, 1) if total else 0
    passed = score >= 60

    session.correct_count = correct_count
    session.time_seconds = time_seconds
    session.completed = True
    db.flush()

    # 更新学习进度
    chapter_ids = (session.filters or {}).get("chapter_ids", [])
    if chapter_ids:
        ch_id = chapter_ids[0]
        lp = db.query(LearningProgress).filter(
            LearningProgress.subject_id == session.subject_id,
            LearningProgress.chapter_id == ch_id,
        ).first()
        if lp:
            lp.quiz_passed = passed
            lp.score = score
            if passed:
                lp.status = "completed"
                lp.completed_at = datetime.utcnow()
                # 解锁下一章
                next_chapter = db.query(Chapter).filter(
                    Chapter.subject_id == session.subject_id,
                    Chapter.id > ch_id,
                ).order_by(Chapter.id).first()
                if next_chapter:
                    next_lp = db.query(LearningProgress).filter(
                        LearningProgress.subject_id == session.subject_id,
                        LearningProgress.chapter_id == next_chapter.id,
                    ).first()
                    if next_lp:
                        next_lp.status = "unlocked"

    db.commit()

    return {
        "correct_count": correct_count,
        "total": total,
        "score": score,
        "passed": passed,
        "message": "闯关成功！" if passed else f"还需努力（需要60%，当前{score}%），请复习后再试",
    }


# ═══════════════════════════════════════════════════════════════
# Phase 4.5 — 模拟考试
# ═══════════════════════════════════════════════════════════════

@router.post("/java/mock-exam/generate")
def generate_mock_exam(data: MockExamRequest, db: Session = Depends(get_db)):
    """按 PDF 模拟卷格式组卷"""
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(404, "学科不存在")

    # 配比：选择题20 / 填空17 / 简答10 / 程序阅读8 / 程序设计5 = 60题
    config = [
        ("choice", "一、选择题", 20, "choice"),
        ("fill", "二、填空题", 17, "fill"),
        ("essay", "三、简答题", 10, "essay"),
        ("code_reading", "四、程序阅读题", 8, None),
        ("code_design", "五、程序设计题", 5, None),
    ]

    sections = []
    all_qids = []

    for section_key, label, target_count, type_filter in config:
        if type_filter:
            pool = [r.id for r in db.query(Question.id).filter(
                Question.subject_id == data.subject_id,
                Question.type == type_filter,
            ).all()]
        else:
            pool = [r.id for r in db.query(Question.id).filter(
                Question.subject_id == data.subject_id,
                Question.exam_type == section_key,
            ).all()]

        count = min(target_count, len(pool))
        if count > 0:
            selected = random.sample(pool, count)
            all_qids.extend(selected)
            qs = db.query(Question).filter(Question.id.in_(selected)).all()
            qmap = {q.id: q for q in qs}
            sections.append({
                "type": section_key,
                "label": label,
                "questions": [
                    {"id": qmap[i].id, "stem": qmap[i].stem, "options": qmap[i].options, "type": qmap[i].type}
                    for i in selected if i in qmap
                ],
            })

    if not all_qids:
        raise HTTPException(400, "该学科没有足够的题目组卷，请先导入题库")

    session = QuizSession(
        subject_id=data.subject_id,
        filters={"mock_exam": True, "question_ids": all_qids},
        total_questions=len(all_qids),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "subject_name": subject.name,
        "total_questions": len(all_qids),
        "sections": sections,
    }


@router.get("/java/mock-exam/{session_id}/result")
def get_mock_exam_result(session_id: int, db: Session = Depends(get_db)):
    """获取模拟考试结果（分题型统计）"""
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "练习不存在")

    answers = []
    section_stats = {}  # type → {correct, total}

    for ar in session.answers:
        q = db.query(Question).filter(Question.id == ar.question_id).first()
        if not q:
            continue
        section_key = q.exam_type or q.type
        if section_key not in section_stats:
            section_stats[section_key] = {"correct": 0, "total": 0, "label": ""}
        section_stats[section_key]["total"] += 1
        if ar.is_correct:
            section_stats[section_key]["correct"] += 1
        answers.append({
            "question_id": q.id,
            "stem": q.stem,
            "options": q.options,
            "answer": q.answer,
            "explanation": q.explanation,
            "type": q.type,
            "exam_type": q.exam_type,
            "selected_answer": ar.selected_answer,
            "is_correct": ar.is_correct,
        })

    # 题型标签映射
    label_map = {
        "choice": "一、选择题", "fill": "二、填空题", "essay": "三、简答题",
        "code_reading": "四、程序阅读题", "code_design": "五、程序设计题",
    }
    for k, v in section_stats.items():
        v["label"] = label_map.get(k, k)
        v["accuracy"] = round(v["correct"] / v["total"] * 100, 1) if v["total"] else 0

    subject = db.query(Subject).filter(Subject.id == session.subject_id).first()

    return {
        "session_id": session.id,
        "date": session.date.isoformat(),
        "subject_name": subject.name if subject else "",
        "total_questions": session.total_questions,
        "correct_count": session.correct_count,
        "time_seconds": session.time_seconds,
        "overall_accuracy": round(session.correct_count / session.total_questions * 100, 1) if session.total_questions else 0,
        "section_stats": section_stats,
        "answers": answers,
    }
