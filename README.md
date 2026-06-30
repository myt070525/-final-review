# 期末复习网站

题库管理与智能练习平台 — FastAPI + React + TypeScript + DeepSeek AI

## 功能

- **题库管理**: 支持单选题、多选题、填空题、简答题、判断题，按学科/章节组织
- **智能导入**: 上传 PDF/PPT/Word/TXT 文档，AI 自动识别题目和答案
- **练习模式**: 自定义筛选条件（题型、难度、章节、来源），计时答题
- **错题本**: 自动记录错题，关联知识点，支持标记已掌握
- **Java 复习**: 知识树、代码在线运行（JDoodle/Wandbox）、模拟考试
- **AI 辅助**: 题目解析、相似题生成、知识图谱提取

## 技术栈

| 层 | 技术 |
|---|---|
| 后端框架 | FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 + SQLite |
| AI | DeepSeek (OpenAI-compatible SDK) |
| 前端框架 | React 19 + Vite |
| 语言 | TypeScript |
| 代码编辑器 | CodeMirror 6 (Java) |
| 样式 | Tailwind CSS 4 + CSS Variables |

## 快速启动

### 环境要求

- Python 3.10+
- Node.js 18+
- [DeepSeek API Key](https://platform.deepseek.com)（用于 AI 功能）

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`，后端 API 在 `http://localhost:8000`。

## 项目结构

```
期末复习网站/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置（环境变量）
│   ├── models.py            # 数据库模型
│   ├── database.py          # 数据库连接
│   ├── routes/
│   │   ├── subjects.py      # 学科管理
│   │   ├── questions.py     # 题库 CRUD + AI 生成
│   │   ├── quiz.py          # 练习 + 错题
│   │   ├── documents.py     # 文档导入 + AI 解析
│   │   ├── java.py          # Java 复习板块
│   │   └── answers.py       # 答案库
│   ├── services/
│   │   ├── ai.py            # DeepSeek AI 调用
│   │   └── parser.py        # 文档文本提取
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 通用组件
│   │   └── services/        # API 调用
│   └── package.json
├── data/                    # SQLite 数据库（自动生成）
├── uploads/                 # 上传文件临时目录
├── .env.example             # 环境变量模板
└── .gitignore
```

## 上传文件支持格式

| 格式 | 扩展名 | 说明 |
|---|---|---|
| PDF | `.pdf` | 文字型 PDF（扫描件不支持） |
| Word | `.docx` | |
| PowerPoint | `.pptx` | |
| 纯文本 | `.txt` | |

单个文件最大 50MB。

## 数据库

使用 SQLite，数据库文件位置由 `DATABASE_URL` 环境变量指定（默认 `data/study.db`）。

**首次启动**时自动创建表结构。修改模型后需手动重建数据库：

```bash
# 备份
cp data/study.db data/study.db.bak
# 删除后重启自动重建
rm data/study.db
```

## API 文档

启动后端后访问 `http://localhost:8000/docs` 查看 Swagger UI。
