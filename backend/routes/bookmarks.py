from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Bookmark, Question, Subject

router = APIRouter()


class UpdateNotesRequest(BaseModel):
    notes: str


@router.get("/bookmarks")
def list_bookmarks(db: Session = Depends(get_db)):
    """获取所有收藏，按学科分组"""
    bookmarks = (
        db.query(Bookmark)
        .order_by(Bookmark.created_at.desc())
        .all()
    )

    result = []
    for bm in bookmarks:
        q = bm.question
        if not q:
            continue
        subject = q.subject
        result.append({
            "id": bm.id,
            "question_id": q.id,
            "stem": q.stem,
            "type": q.type,
            "options": q.options,
            "answer": q.answer,
            "explanation": q.explanation,
            "tags": q.tags or [],
            "difficulty": q.difficulty,
            "subject_id": q.subject_id,
            "subject_name": subject.name if subject else "",
            "chapter_id": q.chapter_id,
            "source_document": q.source_document,
            "notes": bm.notes or "",
            "bookmarked_at": bm.created_at.isoformat() if bm.created_at else None,
        })

    # Group by subject
    grouped = {}
    for item in result:
        subj_name = item["subject_name"] or "未分类"
        if subj_name not in grouped:
            grouped[subj_name] = {"subject_name": subj_name, "subject_id": item["subject_id"], "items": []}
        grouped[subj_name]["items"].append(item)

    return {"bookmarks": result, "grouped": list(grouped.values()), "total": len(result)}


@router.post("/bookmarks/{question_id}")
def add_bookmark(question_id: int, db: Session = Depends(get_db)):
    """收藏题目"""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "题目不存在")

    existing = db.query(Bookmark).filter(Bookmark.question_id == question_id).first()
    if existing:
        return {"ok": True, "message": "已收藏", "bookmark_id": existing.id}

    bm = Bookmark(question_id=question_id)
    db.add(bm)
    db.commit()
    db.refresh(bm)
    return {"ok": True, "message": "已收藏", "bookmark_id": bm.id}


@router.delete("/bookmarks/{question_id}")
def remove_bookmark(question_id: int, db: Session = Depends(get_db)):
    """取消收藏"""
    bm = db.query(Bookmark).filter(Bookmark.question_id == question_id).first()
    if not bm:
        raise HTTPException(404, "未收藏该题目")

    db.delete(bm)
    db.commit()
    return {"ok": True, "message": "已取消收藏"}


@router.put("/bookmarks/{question_id}/notes")
def update_notes(question_id: int, body: UpdateNotesRequest, db: Session = Depends(get_db)):
    """更新收藏题目的笔记"""
    bm = db.query(Bookmark).filter(Bookmark.question_id == question_id).first()
    if not bm:
        raise HTTPException(404, "未收藏该题目")

    bm.notes = body.notes
    db.commit()
    return {"ok": True, "message": "笔记已保存", "notes": bm.notes}


@router.get("/bookmarks/check")
def check_bookmarks(ids: str = "", db: Session = Depends(get_db)):
    """批量检查哪些题目已收藏。ids 为逗号分隔的 question_id"""
    if not ids:
        return {"bookmarked_ids": []}
    try:
        id_list = [int(x.strip()) for x in ids.split(",") if x.strip()]
    except ValueError:
        return {"bookmarked_ids": []}

    existing = (
        db.query(Bookmark.question_id)
        .filter(Bookmark.question_id.in_(id_list))
        .all()
    )
    return {"bookmarked_ids": [e[0] for e in existing]}
