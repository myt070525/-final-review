from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Subject, Chapter, Question
from routes.questions import get_priority

router = APIRouter()


def _subject_has_exam_priority(subject_id: int, db: Session) -> bool:
    """检查该学科是否有考试重点题目（source_document 包含 pdf/模拟卷/复习）"""
    sources = (
        db.query(Question.source_document)
        .filter(Question.subject_id == subject_id, Question.source_document != None, Question.source_document != "")
        .distinct()
        .all()
    )
    return any(get_priority(s[0]) == "high" for s in sources)


class SubjectCreate(BaseModel):
    name: str
    description: str = ""


class ChapterCreate(BaseModel):
    name: str


@router.post("/subjects")
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    if db.query(Subject).filter(Subject.name == data.name).first():
        raise HTTPException(400, "学科已存在")
    subj = Subject(name=data.name, description=data.description)
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return {"id": subj.id, "name": subj.name, "description": subj.description}


@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).order_by(Subject.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "chapter_count": len(s.chapters),
            "question_count": len(s.questions),
            "has_exam_priority": _subject_has_exam_priority(s.id, db),
        }
        for s in subjects
    ]


@router.get("/subjects/{subject_id}")
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(404, "学科不存在")
    return {
        "id": subj.id,
        "name": subj.name,
        "description": subj.description,
        "chapters": [{"id": c.id, "name": c.name} for c in subj.chapters],
        "question_count": len(subj.questions),
        "has_exam_priority": _subject_has_exam_priority(subject_id, db),
    }


@router.post("/subjects/{subject_id}/chapters")
def add_chapter(subject_id: int, data: ChapterCreate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(404, "学科不存在")
    ch = Chapter(subject_id=subject_id, name=data.name)
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return {"id": ch.id, "name": ch.name}


@router.put("/subjects/{subject_id}")
def update_subject(subject_id: int, data: SubjectCreate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(404, "学科不存在")
    subj.name = data.name
    subj.description = data.description
    db.commit()
    return {"id": subj.id, "name": subj.name, "description": subj.description}


@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(404, "学科不存在")
    db.delete(subj)
    db.commit()
    return {"ok": True}
