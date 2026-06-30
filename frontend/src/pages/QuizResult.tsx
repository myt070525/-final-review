import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getQuizResult, getExplanation, generateQuiz } from "../services/api";
import { useToast } from "../components/Toast";
import { Check, X, Lightbulb, Loader2, RotateCcw, Clock, RefreshCw } from "lucide-react";
import LatexRenderer from "../components/LatexRenderer";
import MarkdownRenderer from "../components/MarkdownRenderer";

interface AnswerDetail { question_id: number; stem: string; options: string[] | null; answer: string; explanation: string; type: string; selected_answer: string; is_correct: boolean; }
interface ResultData { session_id: number; date: string; subject_id: number; subject_name: string; total_questions: number; correct_count: number; time_seconds: number; answers: AnswerDetail[]; }

const JUDGE_OPTIONS = ["A. 对", "B. 错"];

function normalizeJudge(ans: string): string {
  if (!ans) return "";
  const a = ans.trim().toLowerCase();
  if (["对", "正确", "是", "true", "t", "yes", "y", "✓", "√", "a"].includes(a)) return "A";
  if (["错", "错误", "否", "false", "f", "no", "n", "✗", "×", "b"].includes(a)) return "B";
  return ans.trim().toUpperCase();
}

export default function QuizResult() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [result, setResult] = useState<ResultData | null>(null);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [explainingId, setExplainingId] = useState<number | null>(null);
  const [redoing, setRedoing] = useState(false);
  const [redoCount, setRedoCount] = useState(0); // 0 = 全部

  useEffect(() => {
    getQuizResult(Number(sessionId))
      .then(setResult)
      .catch((e: any) => toast.error(e.message || "加载结果失败"));
  }, [sessionId, toast]);
  const handleExplain = async (qid: number) => { if (explanations[qid]) return; setExplainingId(qid); try { const d = await getExplanation(qid); setExplanations((p) => ({ ...p, [qid]: d.explanation })); } catch (e: any) { toast.error(e.message || "解析失败"); } setExplainingId(null); };

  const handleRedoWrong = async (count: number) => {
    if (!result || redoing) return;
    const wrongIds = result.answers.filter((a) => !a.is_correct).map((a) => a.question_id);
    if (wrongIds.length === 0) {
      toast.info("没有错题，太棒了！");
      return;
    }
    const actualCount = count === 0 ? wrongIds.length : Math.min(count, wrongIds.length);
    setRedoing(true);
    try {
      const d = await generateQuiz({
        subject_id: result.subject_id,
        question_ids: wrongIds,
        count: actualCount,
      });
      if (!d.questions || d.questions.length === 0) {
        toast.error("生成错题练习失败");
        setRedoing(false);
        return;
      }
      toast.success(`已生成错题练习（${d.questions.length} 题）`);
      navigate(`/quiz/${d.session_id}`, { state: { questions: d.questions } });
    } catch (e: any) {
      toast.error(e.message || "生成错题练习失败");
      setRedoing(false);
    }
  };

  if (!result) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} /></div>;

  const accuracy = result.total_questions > 0 ? Math.round((result.correct_count / result.total_questions) * 100) : 0;
  const min = Math.floor(result.time_seconds / 60);
  const clr = accuracy >= 80 ? "var(--success)" : accuracy >= 60 ? "var(--accent)" : "var(--error)";
  const label = accuracy >= 80 ? "Excellent" : accuracy >= 60 ? "Good" : "Keep Trying";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card text-center mb-10" style={{ padding: "var(--s-12)", borderColor: clr }}>
        <p className="section-overline mb-4" style={{ color: clr }}>{label}</p>
        <div className="stat-number text-8xl mb-3" style={{ color: clr }}>{accuracy}<span className="text-3xl">%</span></div>
        <p className="text-base mb-8" style={{ color: "var(--text-secondary)" }}>答对 {result.correct_count}/{result.total_questions} 题</p>
        <div className="flex items-center justify-center gap-8 text-xs mb-8">
          <span className="tag tag-accent">{result.subject_name}</span>
          <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}><Clock className="w-4 h-4" /><span className="mono-label">{min}分{result.time_seconds % 60}秒</span></div>
          <span className="mono-label" style={{ color: "var(--text-muted)" }}>{new Date(result.date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link to={`/subject/${result.subject_id}/quiz`} className="btn-primary no-underline inline-flex"><RotateCcw className="w-4 h-4" /> 再来一轮</Link>
          {result.correct_count < result.total_questions && (() => {
            const wc = result.total_questions - result.correct_count;
            const countOptions = [
              { n: 5, label: "5题" },
              { n: 10, label: "10题" },
              { n: 20, label: "20题" },
              { n: 0, label: `全部(${wc})` },
            ].filter((o) => o.n === 0 || o.n < wc);
            return (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <div className="flex rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  {countOptions.map((o, i) => (
                    <button
                      key={o.n}
                      onClick={() => setRedoCount(o.n)}
                      className="px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        background: redoCount === o.n ? "var(--error-muted)" : "transparent",
                        color: redoCount === o.n ? "#f87171" : "var(--text-muted)",
                        borderRight: i < countOptions.length - 1 ? "1px solid var(--border)" : "none",
                        borderRadius: i === 0 ? "5px 0 0 5px" : i === countOptions.length - 1 ? "0 5px 5px 0" : "0",
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleRedoWrong(redoCount)}
                  disabled={redoing}
                  className="btn-primary inline-flex"
                  style={{ background: "var(--error)", padding: "6px 14px", fontSize: "0.8125rem" }}
                >
                  {redoing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  开始重做
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="mb-4">
        <p className="section-overline mb-1">Details</p>
        <h2 className="text-headline" style={{ color: "var(--text)" }}>答题详情</h2>
      </div>

      <div className="space-y-4">
        {result.answers.map((a, i) => {
          // 判断题答案归一化（后端可能存"对/错"也可能存 A/B）
          const normAns = a.type === "judge" ? normalizeJudge(a.answer) : a.answer;
          const normSel = a.type === "judge" ? normalizeJudge(a.selected_answer) : a.selected_answer;
          return (
          <div key={a.question_id} className="card" style={{ padding: "var(--s-6)", borderLeft: `3px solid ${a.is_correct ? "var(--success)" : "var(--error)"}` }}>
            <div className="flex items-start" style={{ gap: "var(--s-5)" }}>
              <div className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: a.is_correct ? "var(--success-muted)" : "var(--error-muted)", color: a.is_correct ? "var(--success)" : "var(--error)" }}>
                {a.is_correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-3">
                  <span className="mono-label" style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>你的: <strong style={{ color: a.is_correct ? "var(--success)" : "var(--error)" }}>{normSel || "未答"}</strong></span>
                  {!a.is_correct && <span className="text-xs" style={{ color: "var(--success)" }}>正确: <strong>{normAns}</strong></span>}
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text)" }}><LatexRenderer text={a.stem} /></p>
                {(a.options || a.type === "judge") && (
                  <div className="text-xs space-y-0.5 mb-3" style={{ color: "var(--text-muted)" }}>
                    {(a.type === "judge" ? JUDGE_OPTIONS : (a.options || ["A. 对 ✓", "B. 错 ✗"])).map((opt) => {
                      const l = opt.charAt(0).toUpperCase(); let s: any = {};
                      const isMulti = a.type === "multi_choice";
                      const inAnswer = isMulti ? normAns.includes(l) : l === normAns;
                      const inSelected = isMulti ? normSel.includes(l) : l === normSel;
                      if (inAnswer && inSelected) s.color = "var(--success)";
                      else if (inAnswer) s.color = "var(--success)";
                      else if (inSelected) { s.color = "var(--error)"; s.textDecoration = "line-through"; }
                      return <div key={l} className="pl-2" style={s}><LatexRenderer text={opt} /></div>;
                    })}
                  </div>
                )}
                {(a.explanation || explanations[a.question_id]) && (
                  <details className="mt-2">
                    <summary className="section-overline cursor-pointer" style={{ color: "var(--accent-text)" }}>解析 ▾</summary>
                    <div className="mt-2 p-4 rounded-lg" style={{ background: "var(--accent-muted)" }}>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}><MarkdownRenderer text={a.explanation || explanations[a.question_id]} /></p>
                    </div>
                  </details>
                )}
                {!a.explanation && !explanations[a.question_id] && (
                  <button onClick={() => handleExplain(a.question_id)} className="flex items-center gap-1 text-xs mt-2" style={{ color: "var(--accent-text)" }}>
                    {explainingId === a.question_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />} AI 解析
                  </button>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
