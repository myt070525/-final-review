FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./backend/

# 数据/上传目录（运行时挂载持久卷）
RUN mkdir -p /data/uploads

# 环境变量
ENV DATABASE_URL=sqlite:////data/study.db
ENV DATA_DIR=/data
ENV UPLOAD_DIR=/data/uploads
ENV CORS_ORIGINS=*
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# 启动时自动建表，数据库文件由持久卷提供
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
