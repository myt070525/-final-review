FROM python:3.11-slim

# 安装依赖（requirements 在 backend/ 目录）
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# 复制后端代码
COPY backend/ /app/

# 切换工作目录
WORKDIR /app

# 数据/上传目录
RUN mkdir -p /data/uploads

# 环境变量
ENV DATABASE_URL=sqlite:////data/study.db
ENV DATA_DIR=/data
ENV UPLOAD_DIR=/data/uploads
ENV CORS_ORIGINS=*
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
