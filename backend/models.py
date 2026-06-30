from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship, backref
from database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    chapters = relationship("Chapter", back_populates="subject", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="subject", cascade="all, delete-orphan")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    name = Column(String(200), nullable=False)

    subject = relationship("Subject", back_populates="chapters")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True, index=True)
    type = Column(String(20), nullable=False, default="choice", index=True)  # choice, multi_choice, fill, essay, judge
    stem = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)  # ["A. ...", "B. ..."] for choice questions
    answer = Column(String(500), nullable=False)
    explanation = Column(Text, default="")
    explanation_generated_at = Column(DateTime, nullable=True)
    source_document = Column(String(300), default="")
    is_ai_generated = Column(Boolean, default=False)
    tags = Column(JSON, default=list)  # knowledge point tags
    difficulty = Column(String(20), default="medium")  # easy, medium, hard
    exam_type = Column(String(20), nullable=True)  # Java mock exam: code_reading, code_design, etc.
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    subject = relationship("Subject", back_populates="questions")


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, default=datetime.utcnow)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    filters = Column(JSON, default=dict)  # filter conditions used
    total_questions = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    time_seconds = Column(Integer, default=0)
    completed = Column(Boolean, default=False, index=True)

    answers = relationship("AnswerRecord", back_populates="session", cascade="all, delete-orphan")


class AnswerRecord(Base):
    __tablename__ = "answer_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("quiz_sessions.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    selected_answer = Column(String(500), default="")
    is_correct = Column(Boolean, default=False)

    session = relationship("QuizSession", back_populates="answers")


# ── Java 复习板块专用表 ─────────────────────────────────────────

class KnowledgeNode(Base):
    """知识节点 — 树形结构：章节 > 大知识点 > 子知识点"""
    __tablename__ = "knowledge_nodes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True, index=True)
    parent_id = Column(Integer, ForeignKey("knowledge_nodes.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, default="")            # Markdown 正文
    key_terms = Column(JSON, default=list)        # ["JDK", "JVM", "多态"]
    order = Column(Integer, default=0)            # 同级排序
    difficulty = Column(String(20), default="medium")
    source = Column(String(300), default="")      # 来源 PPT/PDF 文件名
    is_ai_generated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject")
    chapter = relationship("Chapter")
    children = relationship("KnowledgeNode", backref=backref("parent", remote_side=[id]))


class WrongQuestionKnowledge(Base):
    """错题与知识点的多对多关联"""
    __tablename__ = "wrong_question_knowledge"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    knowledge_node_id = Column(Integer, ForeignKey("knowledge_nodes.id"), nullable=False)
    relevance_score = Column(Float, default=1.0)  # 0.0 ~ 1.0
    created_at = Column(DateTime, default=datetime.utcnow)


class AnswerBank(Base):
    """答案库 — 从文档中提取的标准答案/参考答案"""
    __tablename__ = "answer_bank"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    title = Column(String(300), nullable=False)                # 如 "参考答案 - 选择题"
    content = Column(Text, default="")                          # Markdown/纯文本答案内容
    question_numbers = Column(JSON, default=list)               # 覆盖的题号 [1,2,3,...]
    source_document = Column(String(300), default="")           # 来源文件名
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject")


class Bookmark(Base):
    """收藏夹 — 用户收藏的题目"""
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, unique=True, index=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question")


class LearningProgress(Base):
    """学习路径进度 — 每学科每章节一条记录"""
    __tablename__ = "learning_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)
    status = Column(String(20), default="locked")  # locked / unlocked / completed
    quiz_passed = Column(Boolean, default=False)
    score = Column(Float, default=0.0)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
