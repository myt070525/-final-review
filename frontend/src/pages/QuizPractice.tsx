import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { submitQuiz, submitGateQuiz, getExplanation, getSessionQuestions } from "../services/api";
import { useToast } from "../components/Toast";
import { Lightbulb, Loader2, ChevronLeft, ChevronRight, Timer, Check } from "lucide-react";
import LatexRenderer from "../components/LatexRenderer";
import MarkdownRenderer from "../components/MarkdownRenderer";

interface QuestionInfo { id: number; stem: string; options: string[] | null; type: string; _section_label?: string; }

// 判断题统一选项（后端已归一化为 A/B）
const JUDGE_OPTIONS = ["A. 对", "B. 错"];

export default function QuizPractice() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const gateMode = (location.state as any)?.gateMode || false;
  const mockExam = (location.state as any)?.mockExam || false;
  const gateChapterId = (location.state as any)?.chapterId;
  // gateChapterId unused locally — used in submit flow only
  void gateChapterId;
  const gateSubjectId = (location.state as any)?.subjectId;

  // 题目初始化：优先用 location.state（导航传入），否则调接口恢复（刷新场景）
  const [questions, setQuestions] = useState<QuestionInfo[]>(() => {
    const s = location.state as any;
    return s?.questions || [];
  });
  const [recovering, setRecovering] = useState(() => {
    const s = location.state as any;
    return !s?.questions || s.questions.length === 0;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [explainingId, setExplainingId] = useState<number | null>(null);
  const [explanationCache, setExplanationCache] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 刷新恢复：题目为空时调用接口
  useEffect(() => {
    if (!recovering) return;
    let cancelled = false;
    getSessionQuestions(Number(sessionId))
      .then((d) => {
        if (cancelled) return;
        if (d.completed) {
          // 已完成的 session 跳到对应结果页
          if (gateMode) navigate(`/subject/${gateSubjectId}/java/path`, { replace: true });
          else if (mockExam) navigate(`/quiz/${sessionId}/mock-result`, { replace: true });
          else navigate(`/quiz/${sessionId}/result`, { replace: true });
          return;
        }
        if (d.questions && d.questions.length > 0) {
          setQuestions(d.questions);
          setRecovering(false);
        } else {
          toast.error("练习题目已失效，请重新生成");
          navigate("/", { replace: true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("练习不存在或已失效");
          navigate("/", { replace: true });
        }
      });
    return () => { cancelled = true; };
  }, [recovering, sessionId, navigate, toast]);

  useEffect(() => {
    if (questions.length > 0 && !recovering) {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [questions, recovering]);

  const question = questions[currentIndex];
  const selectedAnswer = question ? answers[question.id] : null;

  const selectAnswer = (opt: string) => {
    if (!question) return;
    const letter = opt.charAt(0).toUpperCase();
    if (question.type === "multi_choice") {
      setAnswers((p) => {
        const cur = (p[question.id] || "").split("").filter(Boolean);
        const idx = cur.indexOf(letter);
        if (idx >= 0) cur.splice(idx, 1);
        else cur.push(letter);
        return { ...p, [question.id]: cur.sort().join("") };
      });
    } else {
      setAnswers((p) => ({ ...p, [question.id]: letter }));
    }
  };

  // 文本题（填空/简答）：直接存原文，由后端做归一化匹配
  const setTextAnswer = (text: string) => {
    if (!question) return;
    setAnswers((p) => ({ ...p, [question.id]: text }));
  };

  const typeLabel = (t: string) => ({ choice: "单选题", multi_choice: "多选题", fill: "填空题", essay: "简答题", judge: "判断题" } as any)[t] || t;

  const handleSubmit = async () => {
    if (submitting) return;
    // 未答题二次确认
    const unanswered = questions.filter((q) => !answers[q.id] || !answers[q.id].trim()).length;
    if (unanswered > 0) {
      if (!confirm(`还有 ${unanswered} 题未作答，确定提交吗？`)) return;
    }
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const al = questions.map((q) => ({
      question_id: q.id,
      selected_answer: answers[q.id] || "",
    }));
    try {
      // 闯关模式
      if (gateMode) {
        const result = await submitGateQuiz(Number(sessionId), al, elapsed);
        if (result.passed) {
          toast.success(`闯关成功！得分 ${result.score}%`);
        } else {
          toast.info(`还需努力（得分 ${result.score}%，需要60%）`);
        }
        navigate(`/subject/${gateSubjectId}/java/path`);
        return;
      }
      // 模拟考模式
      if (mockExam) {
        await submitQuiz(Number(sessionId), al, elapsed);
        toast.success("模拟考试已提交！");
        navigate(`/quiz/${sessionId}/mock-result`);
        return;
      }
      // 普通模式
      await submitQuiz(Number(sessionId), al, elapsed);
      toast.success("已提交，正在生成结果...");
      navigate(`/quiz/${sessionId}/result`);
    } catch (e: any) {
      toast.error(e.message || "提交失败");
      setSubmitting(false);
    }
  };

  const handleExplain = async (qid: number) => {
    setExplainingId(qid);
    try {
      const d = await getExplanation(qid);
      setExplanationCache((p) => ({ ...p, [qid]: d.explanation }));
    } catch (e: any) {
      toast.error(e.message || "解析生成失败");
    }
    setExplainingId(null);
  };

  const fm = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (recovering || !question) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-6 h-6 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
        <p className="text-caption">正在恢复练习...</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter((k) => answers[Number(k)] && answers[Number(k)].trim()).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const isMulti = question.type === "multi_choice";
  const isText = question.type === "fill" || question.type === "essay";

  // 判断题用合成选项；其它题用 q.options
  const displayOptions = question.type === "judge" ? JUDGE_OPTIONS : (question.options || []);

  const isOptionSelected = (letter: string) => {
    if (!selectedAnswer) return false;
    return isMulti ? selectedAnswer.includes(letter) : selectedAnswer === letter;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="stat-number text-2xl" style={{ color: "var(--accent)" }}>{String(currentIndex + 1).padStart(2, "0")}</span>
          <span className="mono-label" style={{ color: "var(--text-muted)" }}>/ {questions.length}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--success)" }} />
            <Timer className="w-3.5 h-3.5" /><span className="mono-label">{fm(elapsed)}</span>
          </div>
          <span className="mono-label" style={{ color: "var(--text-muted)" }}>已答 <span style={{ color: "var(--success-text)" }}>{answeredCount}</span></span>
        </div>
      </div>

      <div className="progress-track mb-8"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>

      <div className="card mb-6" style={{ padding: "var(--s-8)" }}>
        <div className="flex items-center gap-3 mb-5">
          <p className="section-overline" style={{ color: "var(--accent)" }}>{typeLabel(question.type)}</p>
          {isMulti && <span className="tag tag-muted">可多选</span>}
          {isText && <span className="tag tag-muted">{question.type === "fill" ? "填空" : "自由作答"}</span>}
        </div>
        <p className="text-xl font-medium leading-relaxed mb-8" style={{ color: "var(--text)" }}><LatexRenderer text={question.stem} /></p>

        {/* 选择题 / 判断题：选项卡 */}
        {!isText && displayOptions.length > 0 && (
          <div className="space-y-3">
            {displayOptions.map((opt) => {
              const letter = opt.charAt(0).toUpperCase();
              const sel = isOptionSelected(letter);
              return (
                <div key={letter} className={`option-item ${sel ? "is-selected" : ""}`} onClick={() => selectAnswer(opt)}>
                  <div className={`option-indicator ${sel ? "is-selected" : ""}`}>
                    {sel ? <Check className="w-4 h-4" /> : (isMulti ? <span className="text-xs">{letter}</span> : letter)}
                  </div>
                  <span className="text-base" style={{ color: sel ? "var(--text)" : "var(--text-secondary)" }}><LatexRenderer text={opt.substring(2).trim()} /></span>
                </div>
              );
            })}
          </div>
        )}

        {/* 填空 / 简答：文本输入框 */}
        {isText && (
          <div>
            <textarea
              className="input-base"
              rows={question.type === "fill" ? 2 : 5}
              placeholder={question.type === "fill" ? "输入答案（填空题做模糊匹配，去标点空白）" : "输入你的答案（简答题同样做模糊匹配）"}
              value={selectedAnswer || ""}
              onChange={(e) => setTextAnswer(e.target.value)}
              autoFocus
              style={{ resize: "vertical", fontFamily: "var(--font-body)", lineHeight: 1.6 }}
            />
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              提示：填空/简答题会去标点空白、忽略大小写做宽松匹配；如答案有多个分点可换行输入。
            </p>
          </div>
        )}

        {isMulti && selectedAnswer && (
          <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>已选: {selectedAnswer.split("").join(", ")}</p>
        )}
      </div>

      {explanationCache[question.id] && (
        <details className="mb-6">
          <summary className="p-5 rounded-xl cursor-pointer" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
            <span className="section-overline" style={{ color: "var(--accent)" }}>AI 解析 ▾</span>
          </summary>
          <div className="p-5 rounded-b-xl -mt-px" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", borderTop: "none" }}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}><MarkdownRenderer text={explanationCache[question.id]} /></p>
          </div>
        </details>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="btn-ghost"><ChevronLeft className="w-4 h-4" /> 上一题</button>
        <button onClick={() => handleExplain(question.id)} className="btn-ghost" style={{ borderColor: "rgba(129,140,248,0.2)", color: "var(--accent)" }}>{explainingId === question.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />} 解析</button>
        {currentIndex < questions.length - 1 ? (
          <button onClick={() => setCurrentIndex((i) => i + 1)} className="btn-primary">下一题 <ChevronRight className="w-4 h-4" /></button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{ background: "var(--success)" }}>{submitting ? "提交中..." : "提交答案"}</button>
        )}
      </div>

      <div className="mt-10 flex flex-wrap gap-1.5 justify-center">
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id]?.trim();
          const isCurrent = idx === currentIndex;
          return (
            <button key={q.id} onClick={() => setCurrentIndex(idx)} className="w-8 h-8 rounded-lg text-xs font-mono border transition-all"
              style={{
                background: isCurrent ? "var(--accent)" : isAnswered ? "var(--accent-muted)" : "var(--bg-raised)",
                color: isCurrent ? "#fff" : isAnswered ? "var(--accent)" : "var(--text-muted)",
                borderColor: isCurrent ? "transparent" : isAnswered ? "rgba(129,140,248,0.2)" : "var(--border)",
              }}>{idx + 1}</button>
          );
        })}
      </div>
    </div>
  );
}
