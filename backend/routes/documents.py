import os
import uuid
import traceback
import sys
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Question, Subject, Chapter, AnswerBank
from config import UPLOAD_DIR, MAX_UPLOAD_SIZE
from services.parser import extract_text_from_file
from services.ai import extract_questions_from_text

router = APIRouter()


class ImportQuestionsRequest(BaseModel):
    subject_id: int
    chapter_id: int | None = None
    questions: list[dict]
    answers: list[dict] = []  # 答案库条目


@router.post("/documents/parse")
async def parse_document(
    file: UploadFile = File(...),
    subject_id: int = Form(...),
    chapter_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(404, "学科不存在")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".docx", ".pptx", ".txt"):
        raise HTTPException(400, f"不支持的文件格式: {ext}，支持 PDF/Word/PPT/TXT")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(413, f"文件过大，最大支持 {MAX_UPLOAD_SIZE // 1024 // 1024}MB")
    with open(filepath, "wb") as f:
        f.write(content)

    try:
        text = extract_text_from_file(filepath, ext)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(500, f"文件解析失败: {str(e)}")

    if not text or len(text.strip()) < 50:
        os.remove(filepath)
        raise HTTPException(400, "文件内容过少，可能是扫描件或图片PDF，暂不支持自动识别。请尝试文字型文件。")

    try:
        result = extract_questions_from_text(text)
        questions = result.get("questions", []) if isinstance(result, dict) else result
        answer_entries = result.get("answers", []) if isinstance(result, dict) else []
        # 确保 questions/answers 不为 None
        if not isinstance(questions, list):
            questions = []
        if not isinstance(answer_entries, list):
            answer_entries = []
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(500, f"AI识别失败: {str(e)}")

    return {
        "filename": file.filename,
        "text_preview": text[:500],
        "questions": questions,
        "answers": answer_entries,
        "chapter_id": chapter_id,
    }


@router.post("/documents/import")
def import_questions(data: ImportQuestionsRequest, db: Session = Depends(get_db)):
    try:
        subj = db.query(Subject).filter(Subject.id == data.subject_id).first()
        if not subj:
            raise HTTPException(404, "学科不存在")

        # Auto-create chapters if they don't exist
        chapter_name_map: dict[str, int] = {}  # name -> id
        existing = db.query(Chapter).filter(Chapter.subject_id == data.subject_id).all()
        for ch in existing:
            chapter_name_map[ch.name] = ch.id

        def get_or_create_chapter(name: str) -> int | None:
            if not name or not name.strip():
                return None
            name = name.strip()
            if name in chapter_name_map:
                return chapter_name_map[name]
            ch = Chapter(subject_id=data.subject_id, name=name)
            db.add(ch)
            db.flush()  # get the id without committing
            chapter_name_map[name] = ch.id
            return ch.id

        count = 0
        for item in data.questions:
            # Resolve chapter_id: explicit > item.chapter (auto-detect) > item.chapter_id (legacy)
            chapter_id = data.chapter_id
            if not chapter_id and item.get("chapter"):
                chapter_id = get_or_create_chapter(item["chapter"])
            if not chapter_id:
                chapter_id = item.get("chapter_id")

            # Safely extract fields — use `or` to turn None into default
            stem_val = item.get("stem") or ""
            type_val = item.get("type") or "choice"
            answer_val = item.get("answer") or ""
            tags_val = item.get("tags") or []
            options_val = item.get("options")  # nullable in DB
            source_val = item.get("source_document") or ""

            if not stem_val.strip():
                continue  # 跳过无题干的题目

            q = Question(
                subject_id=data.subject_id,
                chapter_id=chapter_id,
                type=type_val,
                stem=stem_val,
                options=options_val,
                answer=answer_val,
                tags=tags_val,
                source_document=source_val,
            )
            db.add(q)
            count += 1

        # 保存答案库条目（容错：答案保存失败不影响题目导入）
        answer_count = 0
        for item in data.answers:
            try:
                title = str(item.get("title") or "").strip()
                content = str(item.get("content") or "").strip()
                if not title or not content:
                    continue
                qnums = item.get("question_numbers") or []
                if isinstance(qnums, list):
                    qnums = [int(n) for n in qnums if str(n).isdigit()]
                else:
                    qnums = []
                ab = AnswerBank(
                    subject_id=data.subject_id,
                    chapter_id=data.chapter_id,
                    title=title,
                    content=content,
                    question_numbers=qnums,
                    source_document=str(item.get("source_document") or ""),
                )
                db.add(ab)
                answer_count += 1
            except Exception:
                continue  # 单条答案保存失败不影响其他

        db.commit()
        return {"imported_count": count, "answer_count": answer_count}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger("uvicorn.error").error(f"[IMPORT ERROR] {type(e).__name__}: {e}\n{traceback.format_exc()}")
        raise HTTPException(500, f"导入失败: {type(e).__name__}: {str(e)[:300]}")
