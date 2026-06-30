"""答案库 API — 浏览、管理从文档中提取的参考答案"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import AnswerBank, Subject

router = APIRouter()


class AnswerCreate(BaseModel):
    subject_id: int
    chapter_id: int | None = None
    title: str
    content: str
    question_numbers: list[int] = []
    source_document: str = ""


class AnswerUpdate(BaseModel):
    chapter_id: int | None = None
    title: str
    content: str
    question_numbers: list[int] = []


@router.get("/answers")
def list_answers(
    subject_id: int | None = None,
    chapter_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(AnswerBank)
    if subject_id:
        q = q.filter(AnswerBank.subject_id == subject_id)
    if chapter_id:
        q = q.filter(AnswerBank.chapter_id == chapter_id)

    total = q.count()
    items = (
        q.order_by(AnswerBank.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # 批量获取学科名称
    subject_ids = {a.subject_id for a in items}
    subj_map = {
        s.id: s.name
        for s in db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
    } if subject_ids else {}

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": a.id,
                "subject_id": a.subject_id,
                "subject_name": subj_map.get(a.subject_id, ""),
                "chapter_id": a.chapter_id,
                "title": a.title,
                "content": a.content,
                "question_numbers": a.question_numbers or [],
                "source_document": a.source_document,
                "created_at": a.created_at.isoformat() if a.created_at else "",
            }
            for a in items
        ],
    }


@router.get("/answers/{answer_id}")
def get_answer(answer_id: int, db: Session = Depends(get_db)):
    a = db.query(AnswerBank).filter(AnswerBank.id == answer_id).first()
    if not a:
        raise HTTPException(404, "答案条目不存在")
    subj = db.query(Subject).filter(Subject.id == a.subject_id).first()
    return {
        "id": a.id,
        "subject_id": a.subject_id,
        "subject_name": subj.name if subj else "",
        "chapter_id": a.chapter_id,
        "title": a.title,
        "content": a.content,
        "question_numbers": a.question_numbers or [],
        "source_document": a.source_document,
        "created_at": a.created_at.isoformat() if a.created_at else "",
    }


@router.post("/answers")
def create_answer(data: AnswerCreate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subj:
        raise HTTPException(404, "学科不存在")
    a = AnswerBank(
        subject_id=data.subject_id,
        chapter_id=data.chapter_id,
        title=data.title,
        content=data.content,
        question_numbers=data.question_numbers,
        source_document=data.source_document,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id}


@router.put("/answers/{answer_id}")
def update_answer(answer_id: int, data: AnswerUpdate, db: Session = Depends(get_db)):
    a = db.query(AnswerBank).filter(AnswerBank.id == answer_id).first()
    if not a:
        raise HTTPException(404, "答案条目不存在")
    a.chapter_id = data.chapter_id
    a.title = data.title
    a.content = data.content
    a.question_numbers = data.question_numbers
    db.commit()
    return {"ok": True}


@router.delete("/answers/{answer_id}")
def delete_answer(answer_id: int, db: Session = Depends(get_db)):
    a = db.query(AnswerBank).filter(AnswerBank.id == answer_id).first()
    if not a:
        raise HTTPException(404, "答案条目不存在")
    db.delete(a)
    db.commit()
    return {"ok": True}


@router.delete("/answers/subject/{subject_id}/all")
def delete_all_answers(subject_id: int, db: Session = Depends(get_db)):
    """清空某学科的全部答案库条目"""
    deleted = (
        db.query(AnswerBank)
        .filter(AnswerBank.subject_id == subject_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"deleted": deleted}
