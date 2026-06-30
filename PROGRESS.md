# 期末复习网站 — 开发进度

## 项目概况

期末复习刷题工具，支持文件自动解析 → AI 识别题目 → 题库管理 → 刷题练习 → 错题复习的完整闭环。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + TypeScript + Vite |
| 样式 | Tailwind CSS 4 + CSS 变量体系 + KaTeX |
| 动画 | CSS @keyframes |
| 后端 | Python FastAPI + SQLAlchemy + SQLite |
| AI | DeepSeek API (deepseek-chat) |
| 文件解析 | PyMuPDF (PDF) + python-docx + python-pptx |

## 目录结构

```
期末复习网站/
├── frontend/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css            # 设计变量 + 全局样式
│       ├── components/
│       │   ├── Layout.tsx       # 导航 + 页面切换
│       │   ├── LatexRenderer.tsx
│       │   ├── MarkdownRenderer.tsx   # Markdown → HTML
│       │   ├── KnowledgeTree.tsx      # 知识树导航
│       │   ├── CodeEditor.tsx         # CodeMirror 6 封装
│       │   └── ErrorBoundary.tsx
│       ├── contexts/
│       │   └── ThemeContext.tsx
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── SubjectDetail.tsx
│       │   ├── Upload.tsx
│       │   ├── QuestionBank.tsx
│       │   ├── QuizSetup.tsx
│       │   ├── QuizPractice.tsx
│       │   ├── QuizResult.tsx
│       │   ├── QuizHistory.tsx
│       │   ├── WrongQuestions.tsx
│       │   ├── WeaknessDiagnosis.tsx   # 弱项诊断（按知识点聚合错题）
│       │   ├── JavaReview.tsx          # Java知识复习（知识树+Markdown正文）
│       │   ├── JavaRunner.tsx          # Java代码运行器（CodeMirror+Wandbox）
│       │   ├── JavaLearningPath.tsx    # 学习路径/闯关（13章时间线）
│       │   ├── JavaMockExam.tsx        # 模拟考试组卷
│       │   ├── JavaMockResult.tsx      # 模拟考结果（分题型统计）
│       │   └── NotFound.tsx
│       └── services/
│           └── api.ts
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py                # 8 张表
│   ├── routes/
│   │   ├── subjects.py
│   │   ├── questions.py
│   │   ├── quiz.py
│   │   ├── documents.py
│   │   └── java.py              # Java板块全部API
│   ├── services/
│   │   ├── parser.py
│   │   ├── ai.py
│   │   └── jdoodle.py           # Java在线运行
│   ├── seed_java.py             # 知识节点初始化
│   └── seed_exam_questions.py   # PDF真题导入
├── java/                        # Java复习资料
│   ├── 2025级面向对象程序设计课程复习&模拟卷.pdf
│   └── 面向对象ppt资料/（14个.pptx）
├── data/study.db
└── uploads/
```

## 设计系统

### 色彩（Clean Dark）

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg` | `#0a0a0b` | 页面背景 |
| `--bg-card` | `#161618` | 卡片表面 |
| `--bg-raised` | `#131316` | 悬浮/次级表面 |
| `--border` | `#252529` | 边框 |
| `--text` | `#f4f4f6` | 主文字 |
| `--text-secondary` | `#a0a0a8` | 次级文字 |
| `--text-muted` | `#6b6b75` | 辅助文字 |
| `--accent` | `#818cf8` | 强调色 (indigo) |
| `--success` | `#34d399` | 正确/成功 (emerald) |
| `--error` | `#f87171` | 错误/危险 (red) |

### 字体

- Display: Playfair Display + Noto Serif SC
- Body: Source Sans 3 + Noto Serif SC
- Mono: JetBrains Mono

## Phase 1 — MVP 功能清单 (已完成)

### 学科管理
- [x] 创建/列表/删除学科
- [x] 章节添加

### 资料导入 & AI 识别
- [x] 文件上传 (PDF/Word/PPT/TXT)
- [x] AI 自动识别题目（题型/选项/答案）
- [x] 识别结果预览（答案已隐藏）
- [x] 逐题编辑/删除
- [x] 导入时自动记录 source_document

### 题库管理
- [x] 按学科/题型/关键词筛选 + 分页
- [x] 单题编辑/删除/批量删除
- [x] **列表视图** — 传统分页浏览
- [x] **套题视图** — 按 source_document 分组，折叠展开，支持删除整套路
- [x] AI 生成解析（持久化存储，可折叠）
- [x] AI 生成同类题

### 刷题练习
- [x] 按学科/章节/题型/题量随机抽题
- [x] 逐题作答 + 即时反馈
- [x] 计时器 + 进度条 + 答题导航
- [x] 练习中查看 AI 解析（可折叠）

### 练习结果
- [x] 正确率 + 用时统计
- [x] 逐题详情（答案对比 + 解析可折叠）

### 历史 & 错题
- [x] 练习历史列表
- [x] 错题本（答案隐藏，解析可折叠）

## API 端点

```
# ── 学科 ──
POST   /api/subjects                  创建学科
GET    /api/subjects                  学科列表（含 has_exam_priority）
GET    /api/subjects/:id              学科详情（含 has_exam_priority）
POST   /api/subjects/:id/chapters     添加章节
PUT    /api/subjects/:id              更新学科
DELETE /api/subjects/:id              删除学科

# ── 文件 & AI ──
POST   /api/documents/parse           上传文件 + AI 识别
POST   /api/documents/import          确认导入题目

# ── 题库 ──
GET    /api/questions                 题目列表（分页/筛选/priority 全量过滤）
GET    /api/questions/sets            套题分组（按 source_document）
POST   /api/questions                 手动新增题目
GET    /api/questions/:id             题目详情
PUT    /api/questions/:id             编辑题目
DELETE /api/questions/:id             删除题目
POST   /api/questions/batch-delete    批量删除
POST   /api/questions/:id/explain     AI 生成/获取解析（自动缓存，max_tokens=4096）
POST   /api/questions/:id/generate-similar  生成同类题

# ── 练习 ──
POST   /api/quiz/generate             生成练习（支持 only_exam_priority、question_ids 错题重做 + 自动 shuffle）
POST   /api/quiz/:id/submit           提交答案
GET    /api/quiz/:id                  练习结果详情
GET    /api/quiz/:id/questions        刷新恢复题目
GET    /api/quiz/history              练习历史
GET    /api/quiz/wrong-questions      错题本（含 wrong_count，limit 500）
DELETE /api/quiz/wrong-questions/:id  标记已掌握

# ── Java 板块 ──
GET    /api/java/subjects/:id/knowledge-tree     知识树
GET    /api/java/knowledge/search                知识点搜索
GET    /api/java/knowledge/:node_id              节点详情
POST   /api/java/subjects/:id/extract-knowledge  AI提取知识
POST   /api/java/knowledge/import                批量导入知识节点
POST   /api/java/run                             在线运行Java代码
POST   /api/java/wrong-question/:id/link-knowledge  AI错题关联
POST   /api/java/wrong-question/auto-link-all     批量错题关联
GET    /api/java/wrong-knowledge-stats            弱项诊断
GET    /api/java/subjects/:id/learning-path       学习路径
POST   /api/java/subjects/:id/gate-quiz           生成闯关测验
POST   /api/java/gate-quiz/:id/submit             提交闯关
POST   /api/java/mock-exam/generate               生成模拟考试
GET    /api/java/mock-exam/:id/result             模拟考结果
```

## 数据库表

| 表 | 关键字段 |
|----|---------|
| subjects | id, name, description, created_at |
| chapters | id, subject_id(FK), name |
| questions | id, subject_id(FK), chapter_id(FK), type, stem, options(JSON), answer, explanation, explanation_generated_at, source_document, is_ai_generated, tags(JSON), difficulty, **exam_type** |
| quiz_sessions | id, date, subject_id(FK), filters(JSON), total_questions, correct_count, time_seconds, completed |
| answer_records | id, session_id(FK), question_id(FK), selected_answer, is_correct |
| **knowledge_nodes** | id, subject_id(FK), chapter_id(FK), parent_id(self-FK), title, content(Markdown), key_terms(JSON), difficulty, source |
| **wrong_question_knowledge** | id, question_id(FK), knowledge_node_id(FK), relevance_score |
| **learning_progress** | id, subject_id(FK), chapter_id(FK), status(locked/unlocked/completed), quiz_passed, score |

**粗体** = Phase 4 新增

## 启动方式

```bash
# 1. 后端
cd backend
python -m uvicorn main:app --port 8000

# 2. 前端
cd frontend
npm run dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 设计迭代记录

1. **初版** — 白底灰边卡片，无设计感
2. **玻璃拟态** — 暗色 + backdrop-filter blur + 三层 Token 体系，被评"太普通"
3. **触感暗色** — 去掉玻璃效果，物理阴影，被评"风格一般"
4. **纸墨主题** — 米白纸质卡片 + 暗灰桌面，被评"丑的没边"
5. **Clean Dark（当前）** — 回归本质，干净暗色主题，Indigo 强调色，无隐喻无花活

## Phase 2 — 迭代改进 (2026-06-21 ~ 2026-06-22)

### 多文件上传
- [x] 前端支持一次选择多个文件（`<input multiple>` + 拖拽多文件投放）
- [x] 每个文件独立并行解析，各自显示识别状态（排队中/识别中/✅/失败）
- [x] 识别结果按文件分组预览，点击展开/折叠
- [x] "全部导入"一次性发送所有文件题目，各自保留 `source_document`
- [x] 上传区常驻，可随时追加文件

### 视觉打磨
- [x] 按钮/卡片/选项添加 `:active` 按压反馈（`translateY(1px)` / `scale(0.995)`）
- [x] 按钮/输入框添加 `focus-visible` 聚焦环（`box-shadow: 0 0 0 3px`）
- [x] 主按钮从纯色改为微渐变 `linear-gradient(135deg, accent-hover, accent)`
- [x] 骨架屏加载：Home、QuestionBank（列表+套题）、QuizHistory
- [x] `.mono-label` / `.stat-number` 添加 `font-feature-settings: "tnum"` 等宽数字
- [x] 新增 `.skeleton` shimmer 动画

### AI 解析容错
- [x] `_parse_json_safe()` 4 层容错策略：直接解析 → 提取 markdown 代码块 → 截断修复 → 正则提取
- [x] `_repair_truncated_json()` 重写：前向扫描 bracket 嵌套，精确找到最后一个完整对象
- [x] `_try_parse()` 双模式：`strict=True` → `strict=False`（容控制字符）
- [x] `_call_with_retry()`：解析失败时将错误信息发回模型自修复（temperature=0.0）
- [x] `max_tokens` 从 4096 提升到 8192
- [x] 输入文本截断从 8000 降到 7000 字符，给输出留更多 token 空间
- [x] Prompt 加强：要求双引号转义、确保 `]` 结尾

### Bug 修复
- [x] **FastAPI 路由顺序**：`/questions/sets` 移到 `/{question_id}` 之前，否则 `sets` 被当成 `question_id` 解析报 `int_parsing` 错误，导致套题视图静默失败
- [x] Python 3.11+ 裸 `raise` 兼容：改为显式 `raise last_exc`
- [x] 残留旧 Python 进程占用端口导致代码不更新：强制 kill + 清 `__pycache__`

### 后端临时调试日志
- 导入端点加了 `print` 输出 `source_document` 集合（可后续去掉）

## Phase 3 — GLM5.2 改进 (2026-06-23)

### 功能正确性修复

- [x] **判断题归一化**：后端加 `normalize_judge` 把"对/错/True/False/✓/✗"统一成 A/B；前端高亮逻辑同步归一化（QuizPractice.tsx、QuizResult.tsx、QuestionBank.tsx、WrongQuestions.tsx）
- [x] **填空/简答题作答**：前端加 textarea 输入框（填空2行、简答5行），后端做宽松匹配（去标点空白、全角转半角、忽略大小写）
- [x] **刷新恢复题目**：后端新增 `GET /quiz/{session_id}/questions`，前端 `recovering` 状态 + 三层判断（已完成→跳结果页、有题目→恢复、无→报错回首页）

### 体验改进

- [x] **路由 404 兜底 + React 错误边界**：新建 NotFound.tsx、ErrorBoundary.tsx，改 App.tsx
- [x] **Toast 替代 alert()**：新建 Toast.tsx（Context + Provider 全局注入），改 8 个页面
- [x] **筛选 0 题提示 + 未答题二次确认**：QuizSetup.tsx、QuizPractice.tsx
- [x] **移动端响应式**：index.css（640/768px 断点）、Layout.tsx、SubjectDetail.tsx、WrongQuestions.tsx

### 功能补全

- [x] **错题本重练 + 已掌握**：后端新增 `DELETE /quiz/wrong-questions/{id}` + `generate_quiz` 支持 `question_ids` 参数；WrongQuestions.tsx 加「重练本学科错题」+「已掌握」按钮
- [x] **练习历史统计仪表盘**：QuizHistory.tsx 用 recharts 实现 4 张统计卡 + 正确率趋势折线图（带 60%/80% 参考线）+ 成绩分布柱状图

### 工程清理

- [x] `submit_quiz` 查询优化：`db.query(Question).all()` → `Question.id.in_(qids)` 单次查询
- [x] 删除 Upload.tsx 残留 console.log、documents.py 残留 print、Upload 未使用的 allDone
- [x] TypeScript 类型检查通过（修 4 个 verbatimModuleSyntax 类型导入 + 1 个未用变量）
- [x] vite build 构建成功、Python ast.parse 语法 OK

### API 新增端点

```
# Phase 3
GET    /api/quiz/:session_id/questions   刷新恢复题目
DELETE /api/quiz/wrong-questions/:id     标记已掌握

# Phase 4 - Java板块
GET    /api/java/subjects/:id/knowledge-tree     知识树
GET    /api/java/knowledge/search                知识点搜索
GET    /api/java/knowledge/:node_id              节点详情
POST   /api/java/subjects/:id/extract-knowledge  AI提取知识
POST   /api/java/knowledge/import                批量导入知识节点
POST   /api/java/run                             在线运行Java代码
POST   /api/java/wrong-question/:id/link-knowledge  AI错题关联
POST   /api/java/wrong-question/auto-link-all     批量错题关联
GET    /api/java/wrong-knowledge-stats            弱项诊断
GET    /api/java/subjects/:id/learning-path       学习路径
POST   /api/java/subjects/:id/gate-quiz           生成闯关测验
POST   /api/java/gate-quiz/:id/submit             提交闯关
POST   /api/java/mock-exam/generate               生成模拟考试
GET    /api/java/mock-exam/:id/result             模拟考结果
```

## 待开发

- [ ] 试卷分析页面（题型分布/章节覆盖/难度预估）
- [ ] OCR 扫描件处理
- [ ] 数据导出 (JSON/CSV/Word)

---

## Phase 7 — LaTeX 渲染 & 跨学科 UI 修正 (2026-06-29)

### 问题背景

1. 题库和上传预览中数学公式显示为原始 LaTeX 代码（`$\ln z = \frac{x}{z}$`），而非渲染公式
2. AI 识别出的公式缺少 `$` 包裹、混用 Unicode 符号（`→` `∞` `∂`）、缺少反斜杠（`lim`→`\lim`）→ KaTeX 报错产生红色 HTML 碎片
3. AI 解析返回 HTML 格式（`<p>` `<strong>` `<h3>`），被 MarkdownRenderer 转义后原文显示
4. "仅考试重点"筛选按钮在非 Java 学科（高数）中也显示，但该功能应专属 Java 板块

### LaTeX 渲染修复

#### 前端

| 文件 | 改动 |
|------|------|
| `LatexRenderer.tsx` | 导出 `renderTextWithLatex`；新增 Phase 0 裸命令自动补 `\`（lim/sin/cos/ln/log/exp）；新增 `\sin` `\cos` `\ln` `\log` `\exp` `\lim` 到自动检测列表；`renderFormula` 内部二次 Unicode 转换 + `strict: false` |
| `MarkdownRenderer.tsx` | 恢复 LaTeX 标记后调用 `renderTextWithLatex` 真正渲染；新增 HTML 检测：AI 返回含 `<p>` `<h3>` 等标签时直接渲染（后端 AI 可信），无需 Markdown 处理 |
| `Upload.tsx` | 识别结果预览的题目和选项用 `<LatexRenderer>` 包裹，而非裸 `{q.stem}` |

#### 后端

| 文件 | 改动 |
|------|------|
| `backend/services/ai.py` | EXTRACT_SYSTEM prompt 加规则：数学公式必须用 `$...$` 包裹；`generate_explanation` 提示词加"禁止使用 HTML 标签" |
| `backend/fix_stems.py` | **临时脚本** — 批量修复数据库中 115+ 道题目：Unicode 数学符号→LaTeX 命令（`→`→`\to`、`∞`→`\infty`、`∂`→`\partial` 等）；裸命令补反斜杠（`lim`→`\lim`、`sin`→`\sin`、`ln`→`\ln` 等）；清理因 Shell 转义造成的 TAB 字符和双反斜杠。执行后删除 |

### "仅考试重点"限制为 Java 专属

| 文件 | 改动 |
|------|------|
| `QuestionBank.tsx` | 加载学科时判断 `name.includes("java")`，仅 Java 学科设置 `hasExamPriority=true`；题目卡片上的"🎯 考试重点"标签也仅 Java 显示 |
| `QuizSetup.tsx` | 同上逻辑，仅 Java 学科显示"仅练习考试重点题目"复选框 |

### 启动脚本修复

| 文件 | 改动 |
|------|------|
| `start.bat` | `cd /d backend` → `cd /d "%~dp0backend"`（绝对路径），防止新 cmd 窗口找不到目录 |
| `code/start.bat` | **删除** — 父目录下的重复副本，容易点错且没有 backend/frontend 子目录 |

### 本次会话修改文件清单

| 文件 | 改动类型 |
|------|----------|
| `start.bat` | 修复（绝对路径） |
| `code/start.bat` | 删除 |
| `frontend/src/components/LatexRenderer.tsx` | 增强（导出函数 + Phase 0 + 命令列表 + 容错） |
| `frontend/src/components/MarkdownRenderer.tsx` | 增强（LaTeX 渲染 + HTML 检测） |
| `frontend/src/pages/Upload.tsx` | 修复（LaTeX 渲染） |
| `frontend/src/pages/QuestionBank.tsx` | 修复（Java 专属限制 + LaTeX） |
| `frontend/src/pages/QuizSetup.tsx` | 修复（Java 专属限制） |
| `backend/services/ai.py` | 增强（prompt 规范 LaTeX + 禁 HTML） |
| `backend/fix_stems.py` | 临时脚本（数据库批量修复，已删） |

---

## Phase 5 — 错题系统增强 & Bug 修复 (2026-06-24 ~ 2026-06-27)

### Bug 修复

- [x] **优先级筛选分页 bug**：`list_questions` 端点中 `priority` 过滤在 SQL 分页**之后**才执行，导致"仅考试重点"只过滤当前页 20 条而非全量。修复：先查全量 `(id, source_document)` → Python 侧过滤 → 再分页（`backend/routes/questions.py`）
- [x] **`has_exam_priority` 智能显示**：马原等学科没有 PDF 真题，不应显示"仅考试重点"开关。后端 `subjects.py` 新增 `_subject_has_exam_priority()` 辅助函数，`GET /subjects` 和 `GET /subjects/:id` 均返回 `has_exam_priority` 字段。前端 `QuizSetup.tsx` 和 `QuestionBank.tsx` 仅在 `hasExamPriority === true` 时渲染切换按钮
- [x] **AI 解析截断**：`generate_explanation` 的 `max_tokens` 从 1024 提升到 4096，解决长题目解析显示不完全（`backend/services/ai.py`）
- [x] **多选题类型修复**：30 道答案含多字母（如 BCD、ABC）的题目被 AI 错误标为 `choice` → 批量改为 `multi_choice`。修复后单选题 269 题、多选题 48 题

### 错题系统增强

- [x] **错题重做（练习结果页）**：`QuizResult.tsx` 新增「随机重做」按钮。提交练习后，自动收集答错题目 ID，调用 `generateQuiz({ question_ids })` 生成新练习。全部答对时不显示
- [x] **错题计数**：`GET /quiz/wrong-questions` 新增 `wrong_count` 字段（通过 `Counter` 统计每道题的 `AnswerRecord` 数）。前端错题卡片显示红色「错了 N 次」徽章（仅 ≥2 次时显示）。查询上限从 200 提升到 500
- [x] **错题重做随机打乱**：`generate_quiz` 收到 `question_ids` 时自动 `random.shuffle(all_ids)`，确保每次重做题目顺序不同
- [x] **错题重做数量选择器**：`QuizResult.tsx` 和 `WrongQuestions.tsx` 的重做区域新增 5/10/20/全部(N) 分段选择器 + 「开始重做/重练」按钮。选 N 题时从错题池随机抽取 N 道

### 修改文件（7个）

| 文件 | 改动 |
|------|------|
| `backend/routes/questions.py` | 优先级过滤改为先全量过滤再分页 |
| `backend/routes/quiz.py` | `wrong_questions` 加 `wrong_count` 计数；`generate_quiz` 收到 `question_ids` 时自动 shuffle |
| `backend/routes/subjects.py` | 新增 `_subject_has_exam_priority()`，返回 `has_exam_priority` 字段 |
| `backend/services/ai.py` | `generate_explanation` 的 `max_tokens` 1024→4096 |
| `frontend/src/pages/QuizSetup.tsx` | 根据 `hasExamPriority` 条件渲染"仅考试重点"开关 |
| `frontend/src/pages/QuestionBank.tsx` | 获取 subject 信息，根据 `hasExamPriority` 条件渲染筛选按钮 |
| `frontend/src/pages/QuizResult.tsx` | 新增错题重做：数量选择器 + 随机重做按钮 |
| `frontend/src/pages/WrongQuestions.tsx` | 错题计数徽章 + 数量选择器 + 随机重练按钮 |

### API 变更

```
# 已有端点增强（非新增）
GET    /api/questions        priority 筛选改为全量过滤 + 后分页
GET    /api/subjects         + has_exam_priority 字段
GET    /api/subjects/:id     + has_exam_priority 字段
GET    /api/quiz/wrong-questions  + wrong_count 字段，limit 200→500
POST   /api/quiz/generate    收到 question_ids 时自动 random.shuffle
```

---

## Phase 4 — Java 专属复习板块 (2026-06-24)

### 概述

根据 `java/` 目录下的复习资料（18页PDF模拟卷 + 14个PPT课件），为面向对象程序设计（Java）课程构建了完整的专属复习系统。

### 数据库新增

| 表 | 关键字段 | 用途 |
|----|---------|------|
| `knowledge_nodes` | id, subject_id(FK), chapter_id(FK), parent_id(self-FK), title, content(Markdown), key_terms(JSON), difficulty, source | 树形知识节点：考试指南 + 20个核心术语 + 各章节知识点 |
| `wrong_question_knowledge` | id, question_id(FK), knowledge_node_id(FK), relevance_score | 错题与知识点多对多关联 |
| `learning_progress` | id, subject_id(FK), chapter_id(FK), status(locked/unlocked/completed), quiz_passed, score | 章节闯关进度 |
| `questions.exam_type` | VARCHAR(20) nullable | 模拟考题型标签（code_reading, code_design） |

### 新建文件（18个）

**后端**
| 文件 | 说明 |
|------|------|
| `backend/routes/java.py` | 知识树CRUD + AI提取知识 + 错题联动 + 学习路径/闯关 + 模拟考试 + 代码运行 |
| `backend/services/jdoodle.py` | Java在线运行服务（优先JDoodle，默认Wandbox免费API） |
| `backend/seed_java.py` | Java知识库初始化脚本（考试指南 + 20个核心术语 + 各章节知识点） |
| `backend/seed_exam_questions.py` | PDF模拟卷60道真题导入脚本 |

**前端页面**
| 文件 | 路由 | 说明 |
|------|------|------|
| `JavaReview.tsx` | `/subject/:id/java/review` | 知识复习主页：左右分栏（知识树 + Markdown正文） |
| `JavaRunner.tsx` | `/subject/:id/java/runner` | 代码运行器：CodeMirror编辑器 + 6个Java模板 + Wandbox在线运行 |
| `JavaLearningPath.tsx` | `/subject/:id/java/path` | 学习路径：13章时间线闯关，第一章解锁，>=60%通过解锁下一章 |
| `JavaMockExam.tsx` | `/subject/:id/java/mock-exam` | 模拟考试：5大题60小题，按PDF格式组卷 |
| `JavaMockResult.tsx` | `/quiz/:sessionId/mock-result` | 模拟考结果：总分 + 分题型统计 + 答题详情 |
| `WeaknessDiagnosis.tsx` | `/weakness-diagnosis` | 弱项诊断：按知识点聚合错题次数 |
| `JavaReview.tsx` | — | (已列出) |

**前端组件**
| 文件 | 说明 |
|------|------|
| `KnowledgeTree.tsx` | 树形导航：章节折叠 + 搜索 + 难度色标 |
| `MarkdownRenderer.tsx` | 轻量Markdown渲染：标题/列表/代码块/粗体/KaTeX |
| `CodeEditor.tsx` | CodeMirror 6封装：Java语法高亮 + 自动补全 + One Dark主题 |
| `GateCard.tsx` | 闯关关卡卡片（预留） |
| `ChapterTimeline.tsx` | 学习路径时间线（预留） |

### 修改文件（9个）

| 文件 | 改动 |
|------|------|
| `backend/models.py` | 新增 KnowledgeNode, WrongQuestionKnowledge, LearningProgress 三表 + Question 加 exam_type 字段 |
| `backend/main.py` | 注册 java.router |
| `backend/config.py` | 新增 JDOODLE_CLIENT_ID/SECRET、WANDBOX_URL、MAX_UPLOAD_SIZE |
| `backend/requirements.txt` | 新增 httpx |
| `backend/routes/quiz.py` | QuizGenerateRequest 新增 only_exam_priority 参数，支持仅考试重点抽题 |
| `backend/routes/questions.py` | 题目列表返回 priority/source_label 字段，支持 priority 筛选 |
| `frontend/src/App.tsx` | 新增6条路由（/java/review, /java/runner, /java/path, /java/mock-exam, /mock-result, /weakness-diagnosis） |
| `frontend/src/services/api.ts` | 新增~20个Java板块API函数 |
| `frontend/src/pages/SubjectDetail.tsx` | Java学科显示4个专属入口卡片（知识复习/代码运行器/学习路径/模拟考试） |
| `frontend/src/pages/QuizPractice.tsx` | 支持闯关模式（submitGateQuiz）和模拟考模式（导航到mock-result） |
| `frontend/src/pages/QuestionBank.tsx` | 题目卡片显示🎯考试重点/📎章节练习标签 + 优先级筛选按钮 |
| `frontend/src/pages/QuizSetup.tsx` | 新增"仅考试重点"开关，开启后仅从PDF真题抽题 |
| `frontend/src/pages/WrongQuestions.tsx` | 新增弱项诊断入口链接 |
| `frontend/src/pages/QuizResult.tsx` | （此前已改）显示学科名 |
| `frontend/src/index.css` | .tag 增加 white-space: nowrap |
| `frontend/package.json` | 新增 CodeMirror 6 依赖（7个包） |

### 题目优先级体系

| 优先级 | 来源 | 数量 | 标识 |
|--------|------|------|------|
| 考试重点 | PDF模拟卷 + 复习PDF | 109道 | 🎯 红色标签 |
| 章节练习 | 14个PPT课件 | 345道 | 📎 灰色标签 |

优先级贯穿题库浏览、练习配置、知识复习所有页面。

### 新增API端点（14个）

```
GET    /api/java/subjects/:id/knowledge-tree     知识树
GET    /api/java/knowledge/search?q=&subject_id=  知识点搜索
GET    /api/java/knowledge/:node_id                节点详情
POST   /api/java/subjects/:id/extract-knowledge   AI提取知识（上传PPT）
POST   /api/java/knowledge/import                 批量导入知识节点
POST   /api/java/run                              在线运行Java代码

POST   /api/java/wrong-question/:id/link-knowledge  AI分析错题关联知识点
POST   /api/java/wrong-question/auto-link-all      批量关联所有错题
GET    /api/java/wrong-knowledge-stats             弱项诊断数据

GET    /api/java/subjects/:id/learning-path        学习路径状态
POST   /api/java/subjects/:id/gate-quiz            生成闯关测验
POST   /api/java/gate-quiz/:id/submit              提交闯关测验

POST   /api/java/mock-exam/generate                生成模拟考试
GET    /api/java/mock-exam/:id/result              模拟考结果
```

### 新增npm依赖

```
@codemirror/view, @codemirror/state, @codemirror/lang-java,
@codemirror/theme-one-dark, @codemirror/commands,
@codemirror/language, @codemirror/autocomplete
```

### 新增pip依赖

```
httpx==0.28.0
```

---

## Phase 6 — 答案库（2026-06-27）

### 概述

题目导入时，AI 同时识别文档中的参考答案章节（如"参考答案 - 选择题 1-5: ABCDD"），提取并保存至对应科目的答案库。

### 新增数据模型

```python
class AnswerBank(Base):           # answer_bank 表
    id, subject_id(FK), chapter_id(FK nullable)
    title, content(Text), question_numbers(JSON)
    source_document, created_at
```

### 修改文件

| 文件 | 改动 |
|------|------|
| `backend/models.py` | 新增 AnswerBank 模型 |
| `backend/services/ai.py` | EXTRACT_SYSTEM prompt 增加答案章节识别；`extract_questions_from_text` 返回 `{"questions": [...], "answers": [...]}`；兼容旧数组格式 |
| `backend/routes/documents.py` | `parse_document` 解析时同时返回 answers；`import_questions` 接受 answers 参数并写入 answer_bank 表 |
| `backend/routes/answers.py` | **新建** — 答案库 CRUD + 按学科浏览 |
| `backend/main.py` | 注册 answers.router |
| `frontend/src/services/api.ts` | 新增 6 个答案库 API 函数 |
| `frontend/src/pages/AnswerBank.tsx` | **新建** — 答案库浏览页（按来源文件分组 + 展开查看） |
| `frontend/src/pages/Upload.tsx` | 导入预览增加答案条目展示；导入时传递 answers 到后端 |
| `frontend/src/pages/SubjectDetail.tsx` | 学科主页增加「答案库」入口卡片 |
| `frontend/src/App.tsx` | 新增 `/subject/:id/answers` 路由 |

### API 端点变更

| 端点 | 变更说明 |
|------|----------|
| `POST /api/documents/parse` | 响应新增 `answers` 字段 |
| `POST /api/documents/import` | 请求可选 `answers` 参数，响应新增 `answer_count` |
| `GET /api/answers` | **新增** — 按学科/章节查询答案列表 |
| `GET /api/answers/{id}` | **新增** — 单条答案详情 |
| `POST /api/answers` | **新增** — 手动创建答案条目 |
| `PUT /api/answers/{id}` | **新增** — 更新答案条目 |
| `DELETE /api/answers/{id}` | **新增** — 删除单条答案 |
| `DELETE /api/answers/subject/{id}/all` | **新增** — 清空学科全部答案 |

### AI 提取增强

- 新 prompt 要求 AI 以 `{"questions": [...], "answers": [...]}` 格式输出
- 自动检测"参考答案"、"试题答案"、"答案与解析"等章节
- 兼容旧格式：若 AI 仍返回纯数组，自动包装为 `{"questions": [...], "answers": []}`
- 答案条目包含：标题（如"参考答案 - 选择题"）、原文内容、覆盖题号列表

---

## Phase 6.1 — 导入修复 & 解析格式优化（2026-06-27）

### 问题
中国近现代史纲要 8 个章节 DOCX 文件全部导入失败："Unexpected end of JSON input"

### 根因
1. **`_repair_truncated_json` 仅处理数组格式** `[{...}]`，Phase 6 将 AI 输出格式改为对象 `{"questions": [...], "answers": [...]}`，截断修复逻辑对新格式完全无效
2. **`max_tokens=8192` 太小** — 大文档提取题目+答案时容易截断
3. **输入截断 `text[:7000]`** — 章节练习题文本量远超此值

### 修复
| 改动 | Before | After |
|------|--------|-------|
| `_repair_truncated_json` | 仅处理数组顶层的 `[...]` | 同时处理对象顶层 `{"questions": ..., "answers": ...}` |
| `extract_questions_from_text` max_tokens | 8192 | 16384 |
| 输入文本截断 | `text[:7000]` | `text[:12000]` |

### AI 解析格式优化
- 后端 prompt 改为要求 Markdown 格式输出（`### 标题`、`**粗体**`、列表等）
- 前端 5 个页面的解析渲染从 `LatexRenderer`（纯文本）替换为 `MarkdownRenderer`（支持标题/粗体/列表/代码块/LaTeX）

---

## Phase 6.2 — 导入 NOT NULL 约束修复 & 批量导入（2026-06-27）

### 问题
用户第三次尝试导入 8 个 DOCX 文件时仍报 "Internal Server Error"

### 根因
AI 部分题目返回 `"answer": null`（无法判断答案），代码 `item.get("answer", "")` 在 key 存在值为 `None` 时返回 `None`（非 `""`），SQLite `questions.answer` 字段 `NOT NULL` 约束冲突 → `IntegrityError` → 500

### 修复
- `routes/documents.py`：所有字段取值从 `.get("key", default)` 改为 `.get("key") or default`，确保 `None` → 默认值
- 新增跳过无题干题目的保护逻辑
- 新增完整 try-except + uvicorn logging 错误日志
- 新增 `answers` 字段 null-safety（前后端均加 `Array.isArray()` 检查）

### 服务器端批量导入
用户 8 个 DOCX 文件之前已上传至 `uploads/` 目录，为免用户重复消耗 AI token，直接从服务器端解析导入：

| 章节 | 题数 |
|------|------|
| 第一章 反对外国侵略的斗争与抗争 | 35 |
| 第三章 中华民族的抗日战争 | 46 |
| 第四章 为中国而奋斗 | 47 |
| 第五章 中国社会主义专政制度的建立 | 39 |
| 第六章 中国共产党与新中国革命 | 40 |
| 第七章 中国革命的新道路 | 47 |
| 第八章 中华民族伟大复兴的中国梦 | 41 |
| 第九章 改革开放与中国特色社会主义 | 44 |
| **合计** | **339 题 + 18 条答案库** |

### 本次会话全部修改文件（累计）

| 文件 | 改动 |
|------|------|
| `backend/models.py` | 新增 AnswerBank 模型 |
| `backend/services/ai.py` | 答案章节识别；对象格式输出；截断修复支持对象；max_tokens 16384；文科简洁模式；Markdown prompt |
| `backend/routes/documents.py` | 解析返回 answers；导入保存 AnswerBank；None→default 修复；完整错误日志 |
| `backend/routes/answers.py` | **新建** — 答案库 CRUD |
| `backend/main.py` | 注册 answers.router |
| `frontend/src/services/api.ts` | 新增 6 个答案库 API；importQuestions 类型加 answers |
| `frontend/src/pages/AnswerBank.tsx` | **新建** — 答案库浏览页 |
| `frontend/src/pages/Upload.tsx` | 导入预览加答案展示；null-safety；导入传递 answers |
| `frontend/src/pages/SubjectDetail.tsx` | 加答案库入口卡片 |
| `frontend/src/App.tsx` | 加 `/subject/:id/answers` 路由 |
| `frontend/src/pages/QuizResult.tsx` | 解析渲染换 MarkdownRenderer |
| `frontend/src/pages/QuizPractice.tsx` | 解析渲染换 MarkdownRenderer |
| `frontend/src/pages/WrongQuestions.tsx` | 解析渲染换 MarkdownRenderer |
| `frontend/src/pages/QuestionBank.tsx` | 解析渲染换 MarkdownRenderer |
| `frontend/src/pages/JavaMockResult.tsx` | 解析渲染换 MarkdownRenderer |
