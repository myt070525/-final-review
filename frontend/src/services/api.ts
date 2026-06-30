// 开发环境 Vite 代理 /api → localhost:8000
// 生产环境指向 Render 后端（部署时设置 VITE_API_BASE 环境变量）
const BASE = import.meta.env.VITE_API_BASE || "/api";

async function request(url: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// Subjects
export const getSubjects = () => request("/subjects");
export const getSubject = (id: number) => request(`/subjects/${id}`);
export const createSubject = (data: { name: string; description: string }) =>
  request("/subjects", { method: "POST", body: JSON.stringify(data) });
export const updateSubject = (id: number, data: { name: string; description: string }) =>
  request(`/subjects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteSubject = (id: number) =>
  request(`/subjects/${id}`, { method: "DELETE" });
export const addChapter = (subjectId: number, name: string) =>
  request(`/subjects/${subjectId}/chapters`, { method: "POST", body: JSON.stringify({ name }) });

// Questions
export const getQuestions = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/questions?${qs}`);
};
export const getQuestion = (id: number) => request(`/questions/${id}`);
export const createQuestion = (data: any) =>
  request("/questions", { method: "POST", body: JSON.stringify(data) });
export const updateQuestion = (id: number, data: any) =>
  request(`/questions/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteQuestion = (id: number) =>
  request(`/questions/${id}`, { method: "DELETE" });
export const batchDeleteQuestions = (ids: number[]) =>
  request("/questions/batch-delete", { method: "POST", body: JSON.stringify(ids) });
export const getQuestionSets = (subjectId: number) =>
  request(`/questions/sets?subject_id=${subjectId}`);
export const getExplanation = (id: number) =>
  request(`/questions/${id}/explain`, { method: "POST" });
export const generateSimilar = (id: number, count: number = 2) =>
  request(`/questions/${id}/generate-similar?count=${count}`, { method: "POST" });

// Bookmarks
export const getBookmarks = () => request("/bookmarks");
export const addBookmark = (questionId: number) =>
  request(`/bookmarks/${questionId}`, { method: "POST" });
export const removeBookmark = (questionId: number) =>
  request(`/bookmarks/${questionId}`, { method: "DELETE" });
export const checkBookmarks = (ids: number[]) =>
  request(`/bookmarks/check?ids=${ids.join(",")}`);
export const updateBookmarkNotes = (questionId: number, notes: string) =>
  request(`/bookmarks/${questionId}/notes`, { method: "PUT", body: JSON.stringify({ notes }) });

// Documents
export const parseDocument = (file: File, subjectId: number, chapterId?: number) => {
  const form = new FormData();
  form.append("file", file);
  form.append("subject_id", String(subjectId));
  if (chapterId) form.append("chapter_id", String(chapterId));
  return fetch(`${BASE}/documents/parse`, { method: "POST", body: form }).then((r) => {
    if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || "Parse failed"); });
    return r.json();
  });
};
export const importQuestions = (data: { subject_id: number; chapter_id?: number; questions: any[]; answers?: any[] }) =>
  request("/documents/import", { method: "POST", body: JSON.stringify(data) });

// Quiz
export const generateQuiz = (data: {
  subject_id: number;
  chapter_ids?: number[];
  types?: string[];
  count?: number;
  question_ids?: number[];  // 错题重练用
  only_exam_priority?: boolean;  // 仅出考频高的题
}) => request("/quiz/generate", { method: "POST", body: JSON.stringify(data) });
export const submitQuiz = (sessionId: number, answers: { question_id: number; selected_answer: string }[], timeSeconds: number) =>
  request(`/quiz/${sessionId}/submit`, { method: "POST", body: JSON.stringify({ answers, time_seconds: timeSeconds }) });
export const getQuizResult = (sessionId: number) => request(`/quiz/${sessionId}`);
export const getSessionQuestions = (sessionId: number) => request(`/quiz/${sessionId}/questions`);
export const getQuizHistory = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/quiz/history?${qs}`);
};
export const getWrongQuestions = (subjectId?: number) => {
  const qs = subjectId ? `?subject_id=${subjectId}` : "";
  return request(`/quiz/wrong-questions${qs}`);
};
export const markQuestionMastered = (questionId: number) =>
  request(`/quiz/wrong-questions/${questionId}`, { method: "DELETE" });

// ── Java 复习板块 ───────────────────────────────────────────

// 知识树
export const getKnowledgeTree = (subjectId: number) =>
  request(`/java/subjects/${subjectId}/knowledge-tree`);
export const getKnowledgeNode = (nodeId: number) =>
  request(`/java/knowledge/${nodeId}`);
export const searchKnowledge = (q: string, subjectId?: number) => {
  const qs = subjectId ? `?q=${encodeURIComponent(q)}&subject_id=${subjectId}` : `?q=${encodeURIComponent(q)}`;
  return request(`/java/knowledge/search${qs}`);
};

// 知识提取（上传 PPT 文件）
export const extractKnowledge = (file: File, subjectId: number, chapterId?: number) => {
  const form = new FormData();
  form.append("file", file);
  form.append("subject_id", String(subjectId));
  if (chapterId) form.append("chapter_id", String(chapterId));
  return fetch(`${BASE}/java/subjects/${subjectId}/extract-knowledge`, {
    method: "POST",
    body: form,
  }).then((r) => {
    if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || "Extract failed"); });
    return r.json();
  });
};
export const importKnowledgeNodes = (data: {
  subject_id: number;
  chapter_id?: number;
  chapter_name?: string;
  nodes: any[];
}) => request("/java/knowledge/import", { method: "POST", body: JSON.stringify(data) });

// 代码运行
export const runJavaCode = (code: string, stdin?: string) =>
  request("/java/run", { method: "POST", body: JSON.stringify({ code, stdin: stdin || "" }) });

// 错题-知识点联动
export const linkWrongQuestionKnowledge = (questionId: number) =>
  request(`/java/wrong-question/${questionId}/link-knowledge`, { method: "POST" });
export const autoLinkAllWrongQuestions = (subjectId?: number) =>
  request("/java/wrong-question/auto-link-all", {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId }),
  });
export const getWrongKnowledgeStats = (subjectId?: number) => {
  const qs = subjectId ? `?subject_id=${subjectId}` : "";
  return request(`/java/wrong-knowledge-stats${qs}`);
};

// 学习路径 / 闯关
export const getLearningPath = (subjectId: number) =>
  request(`/java/subjects/${subjectId}/learning-path`);
export const generateGateQuiz = (subjectId: number, chapterId: number) =>
  request(`/java/subjects/${subjectId}/gate-quiz`, {
    method: "POST",
    body: JSON.stringify({ chapter_id: chapterId }),
  });
export const submitGateQuiz = (sessionId: number, answers: { question_id: number; selected_answer: string }[], timeSeconds: number) =>
  request(`/java/gate-quiz/${sessionId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers, time_seconds: timeSeconds }),
  });

// ── 答案库 ───────────────────────────────────────────
export const getAnswers = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/answers?${qs}`);
};
export const getAnswer = (id: number) => request(`/answers/${id}`);
export const createAnswer = (data: {
  subject_id: number;
  chapter_id?: number;
  title: string;
  content: string;
  question_numbers?: number[];
  source_document?: string;
}) => request("/answers", { method: "POST", body: JSON.stringify(data) });
export const updateAnswer = (id: number, data: {
  chapter_id?: number;
  title: string;
  content: string;
  question_numbers?: number[];
}) => request(`/answers/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteAnswer = (id: number) =>
  request(`/answers/${id}`, { method: "DELETE" });
export const deleteAllAnswers = (subjectId: number) =>
  request(`/answers/subject/${subjectId}/all`, { method: "DELETE" });

// 模拟考试
export const generateMockExam = (subjectId: number) =>
  request("/java/mock-exam/generate", {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId }),
  });
export const getMockExamResult = (sessionId: number) =>
  request(`/java/mock-exam/${sessionId}/result`);
