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

from routes import subjects, questions, quiz, documents, java, answers, bookmarks

app.include_router(subjects.router, prefix="/api", tags=["subjects"])
app.include_router(questions.router, prefix="/api", tags=["questions"])
app.include_router(quiz.router, prefix="/api", tags=["quiz"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(java.router, prefix="/api", tags=["java"])
app.include_router(answers.router, prefix="/api", tags=["answers"])
app.include_router(bookmarks.router, prefix="/api", tags=["bookmarks"])
