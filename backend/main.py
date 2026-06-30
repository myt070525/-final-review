import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from config import UPLOAD_DIR, DEEPSEEK_API_KEY
import models  # noqa: F401 - ensure models are registered before create_all

if not DEEPSEEK_API_KEY:
    import sys
    msg = "\n[WARNING] DEEPSEEK_API_KEY not set. AI features will be unavailable.\n"
    msg += "  Please create .env file or set DEEPSEEK_API_KEY environment variable.\n"
    try:
        print(msg)
    except UnicodeEncodeError:
        sys.stderr.write(msg)

Base.metadata.create_all(bind=engine)

os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="期末复习网站 API", version="1.0.0")

# CORS — 个人使用，默认放行所有源；生产环境可用 CORS_ORIGINS 环境变量收紧
_cors_env = os.getenv("CORS_ORIGINS", "*")
_origins = [o.strip() for o in _cors_env.split(",")] if _cors_env != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,  # 无 cookie 场景，用 * 必须配 False
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ── 数据库恢复 ─────────────────────────────
from fastapi import UploadFile, File
from fastapi.responses import JSONResponse
import shutil, tempfile


@app.post("/api/admin/restore-db")
async def restore_db(file: UploadFile = File(...)):
    """上传 SQLite 数据库文件替换当前数据库（仅管理员使用）"""
    if not file.filename or not file.filename.endswith(".db"):
        return JSONResponse({"error": "只接受 .db 文件"}, status_code=400)
    # 先写到临时文件验证
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()
        # 简单校验：能打开
        import sqlite3
        conn = sqlite3.connect(tmp.name)
        conn.execute("SELECT COUNT(*) FROM questions")
        conn.close()
        # 覆盖目标
        shutil.copy(tmp.name, "/data/study.db")
        os.unlink(tmp.name)
        return {"ok": True, "message": "数据库已恢复，请重启应用使连接池重建"}
    except Exception as e:
        os.unlink(tmp.name)
        return JSONResponse({"error": str(e)}, status_code=500)


from routes import subjects, questions, quiz, documents, java, answers, bookmarks

app.include_router(subjects.router, prefix="/api", tags=["subjects"])
app.include_router(questions.router, prefix="/api", tags=["questions"])
app.include_router(quiz.router, prefix="/api", tags=["quiz"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(java.router, prefix="/api", tags=["java"])
app.include_router(answers.router, prefix="/api", tags=["answers"])
app.include_router(bookmarks.router, prefix="/api", tags=["bookmarks"])
