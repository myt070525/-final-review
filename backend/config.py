import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 支持环境变量覆盖，Render 等托管平台把持久磁盘挂载到 /data、/uploads
DATA_DIR = os.getenv("DATA_DIR", os.path.join(os.path.dirname(BASE_DIR), "data"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(BASE_DIR), "uploads"))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(DATA_DIR, 'study.db')}")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
AI_MODEL = os.getenv("AI_MODEL", "deepseek-chat")

# JDoodle API — 在线 Java 代码运行（免费套餐 200次/天）
JDOODLE_CLIENT_ID = os.getenv("JDOODLE_CLIENT_ID", "")
JDOODLE_CLIENT_SECRET = os.getenv("JDOODLE_CLIENT_SECRET", "")

# Wandbox API — 免费 Java 代码运行（无需 API Key，默认回退方案）
WANDBOX_URL = "https://wandbox.org/api/compile.json"

# 文件上传限制
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB
