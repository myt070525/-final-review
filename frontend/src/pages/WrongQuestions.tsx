import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getWrongQuestions, getExplanation, generateQuiz, markQuestionMastered } from "../services/api";
import { useToast } from "../components/Toast";
import { Lightbulb, Loader2, AlertTriangle, BookOpen, ChevronDown, RotateCcw, Check, TrendingDown } from "lucide-react";
import LatexRenderer from "../components/LatexRenderer";
import MarkdownRenderer from "../components/MarkdownRenderer";

interface WrongItem { record_id: number; question_id: number; subject_id: number; subject_name: string; stem: string; options: string[] | null; answer: string; explanation: string; type: string; selected_answer: string; wrong_count: number; }

const typeLabel = (t: string) => ({ choice: "单选题", multi_choice: "多选题", fill: "填空题", essay: "简答题", judge: "判断题" } as any)[t] || t;
const JUDGE_OPTIONS = ["A. 对", "B. 错"];

function normalizeJudge(ans: string): string {
  if (!ans) return "";
  const a = ans.trim().toLowerCase();
  if (["对", "正确", "是", "true", "t", "yes", "y", "✓", "√", "a"].includes(a)) return "A";
  if (["错", "错误", "否", "false", "f", "no", "n", "✗", "×", "b"].includes(a)) return "B";
  return ans.trim().toUpperCase();
}

const BOOK_COLORS = [
  { spine: "#6366f1", face: "#818cf8", bg: "rgba(99,102,241,0.12)" },
  { spine: "#ec4899", face: "#f472b6", bg: "rgba(236,72,153,0.12)" },
  { spine: "#14b8a6", face: "#2dd4bf", bg: "rgba(20,184,166,0.12)" },
  { spine: "#f59e0b", face: "#fbbf24", bg: "rgba(245,158,11,0.12)" },
  { spine: "#8b5cf6", face: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
  { spine: "#06b6d4", face: "#22d3ee", bg: "rgba(6,182,212,0.12)" },
  { spine: "#ef4444", face: "#f87171", bg: "rgba(239,68,68,0.12)" },
  { spine: "#22c55e", face: "#4ade80", bg: "rgba(34,197,94,0.12)" },
];

export default function WrongQuestions() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<WrongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSubject, setOpenSubject] = useState<number | null>(null);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [explainingId, setExplainingId] = useState<number | null>(null);
  const [masteringId, setMasteringId] = useState<number | null>(null);
  const [redoCount, setRedoCount] = useState(0); // 0 = 全部

  const reload = () => {
    setLoading(true);
    getWrongQuestions()
      .then((d) => setItems(d.items))
      .catch((e: any) => toast.error(e.message || "加载错题失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const handleExplain = async (qid: number) => { if (explanations[qid]) return; setExplainingId(qid); try { const d = await getExplanation(qid); setExplanations((p) => ({ ...p, [qid]: d.explanation })); } catch (e: any) { toast.error(e.message || "解析失败"); } setExplainingId(null); };

  const handleMastered = async (qid: number) => {
    setMasteringId(qid);
    try {
      await markQuestionMastered(qid);
      setItems((prev) => prev.filter((x) => x.question_id !== qid));
      toast.success("已标记为掌握，从错题本移除");
    } catch (e: any) {
      toast.error(e.message || "操作失败");
    }
    setMasteringId(null);
  };

  // 重练本学科错题：直接用错题 question_ids 发起 session（随机打乱 + 可选数量）
  const handlePractice = async (subjectId: number, subjectName: string, count: number) => {
    const qids = items.filter((x) => x.subject_id === subjectId).map((x) => x.question_id);
    if (qids.length === 0) return;
    const actualCount = count === 0 ? qids.length : Math.min(count, qids.length);
    try {
      const sess = await generateQuiz({
        subject_id: subjectId,
        types: ["choice", "multi_choice", "fill", "essay", "judge"],
        count: actualCount,
        question_ids: qids,
      });
      if (!sess.session_id) throw new Error("生成失败");
      toast.success(`开始重练「${subjectName}」${actualCount} 道错题`);
      navigate(`/quiz/${sess.session_id}`, { state: { questions: sess.questions } });
    } catch (e: any) {
      toast.error(e.message || "生成练习失败");
    }
  };

  const grouped = useMemo(() => {
    const map: Record<number, { name: string; items: WrongItem[] }> = {};
    for (const item of items) {
      if (!map[item.subject_id]) map[item.subject_id] = { name: item.subject_name, items: [] };
      map[item.subject_id].items.push(item);
    }
    return Object.entries(map).map(([id, g]) => ({ subject_id: Number(id), name: g.name, items: g.items }));
  }, [items]);

  const openGroup = useMemo(() => grouped.find((g) => g.subject_id === openSubject), [grouped, openSubject]);

  const renderQuestion = (item: WrongItem) => {
    const normAns = item.type === "judge" ? normalizeJudge(item.answer) : item.answer;
    const normSel = item.type === "judge" ? normalizeJudge(item.selected_answer) : item.selected_answer;
    return (
      <div key={item.record_id} className="card" style={{ padding: "var(--s-6)", borderLeft: "3px solid var(--error)", animation: "fade-up var(--slow) var(--ease) 0.02s both" }}>
        <div className="flex items-start" style={{ gap: "var(--s-5)" }}>
          <span className="mono-label shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>#{item.question_id}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 text-xs flex-wrap">
              <span className="tag tag-accent">{typeLabel(item.type)}</span>
              {item.wrong_count > 1 && (
                <span className="tag" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", borderColor: "rgba(239,68,68,0.25)" }}>错了 {item.wrong_count} 次</span>
              )}
              <span style={{ color: "var(--error)" }}>你的: <strong style={{ textDecoration: "line-through" }}>{normSel || "未答"}</strong></span>
              <span style={{ color: "var(--success)" }}>正确: <strong>{normAns}</strong></span>
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text)" }}><LatexRenderer text={item.stem} /></p>
            {(item.options || item.type === "judge") && (
              <div className="text-xs space-y-0.5 mb-3" style={{ color: "var(--text-muted)" }}>
                {(item.type === "judge" ? JUDGE_OPTIONS : (item.options || ["A. 对 ✓", "B. 错 ✗"])).map((opt) => {
                  const l = opt.charAt(0).toUpperCase(); let s: any = {};
                  const isMulti = item.type === "multi_choice";
                  if (isMulti) {
                    if (normAns.includes(l)) s.color = "var(--success)";
                    if (normSel.includes(l)) { s.color = "var(--error)"; s.textDecoration = "line-through"; }
                    if (normAns.includes(l) && normSel.includes(l)) s.color = "var(--success)";
                  } else {
                    if (l === normAns) s.color = "var(--success)";
                    if (l === normSel) { s.color = "var(--error)"; s.textDecoration = "line-through"; }
                  }
                  return <div key={l} className="pl-2" style={s}><LatexRenderer text={opt} /></div>;
                })}
              </div>
            )}
            {(item.explanation || explanations[item.question_id]) && (
              <details className="mt-2">
                <summary className="section-overline cursor-pointer" style={{ color: "var(--accent-text)" }}>解析 ▾</summary>
                <div className="mt-2 p-4 rounded-lg" style={{ background: "var(--accent-muted)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}><MarkdownRenderer text={item.explanation || explanations[item.question_id]} /></p>
                </div>
              </details>
            )}
            {!item.explanation && !explanations[item.question_id] && (
              <button onClick={() => handleExplain(item.question_id)} className="flex items-center gap-1 text-xs mt-2" style={{ color: "var(--accent-text)" }}>
                {explainingId === item.question_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />} AI 解析
              </button>
            )}
            {/* 已掌握按钮 */}
            <button
              onClick={() => handleMastered(item.question_id)}
              disabled={masteringId === item.question_id}
              className="flex items-center gap-1 text-xs mt-3 ml-4"
              style={{ color: "var(--success-text)" }}
            >
              {masteringId === item.question_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} 已掌握
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} /></div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <p className="section-overline mb-2">Review</p>
        <h1 className="text-display mb-2" style={{ color: "var(--text)" }}>错题本</h1>
        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <p className="text-caption">{items.length} 道错题 · {grouped.length} 个学科</p>
            <Link to="/weakness-diagnosis" className="inline-flex items-center gap-1.5 text-xs font-medium no-underline" style={{ color: "var(--accent)" }}>
              <TrendingDown className="w-3 h-3" /> 弱项诊断
            </Link>
          </div>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
            <AlertTriangle className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-headline mb-2" style={{ color: "var(--text-secondary)" }}>暂无错题</p>
          <p className="text-caption">继续保持</p>
        </div>
      )}

      {/* Open book detail view */}
      {openGroup && (
        <div style={{ animation: "fade-up var(--slow) var(--ease) 0.05s both" }}>
          {/* Back to shelf + 重练按钮 */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <button
              onClick={() => setOpenSubject(null)}
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <ChevronDown className="w-4 h-4" style={{ transform: "rotate(90deg)" }} />
              返回书架
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              {(() => {
                const total = openGroup.items.length;
                const countOptions = [
                  { n: 5, label: "5题" },
                  { n: 10, label: "10题" },
                  { n: 20, label: "20题" },
                  { n: 0, label: `全部(${total})` },
                ].filter((o) => o.n === 0 || o.n < total);
                return (
                  <>
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
                      onClick={() => handlePractice(openGroup.subject_id, openGroup.name, redoCount)}
                      className="btn-primary inline-flex"
                      style={{ background: "var(--success)", padding: "6px 14px", fontSize: "0.8125rem" }}
                    >
                      <RotateCcw className="w-4 h-4" /> 开始重练
                    </button>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Book open spread */}
          <div className="flex gap-8 mb-10" style={{ flexWrap: "wrap" }}>
            {/* Left page - book cover info */}
            <div className="hidden md:flex shrink-0 flex-col items-center" style={{ width: 180 }}>
              <div
                className="w-full rounded-r-lg rounded-l-sm"
                style={{
                  height: 240,
                  background: `linear-gradient(135deg, ${BOOK_COLORS[openSubject! % BOOK_COLORS.length].spine}, ${BOOK_COLORS[openSubject! % BOOK_COLORS.length].face})`,
                  boxShadow: `8px 4px 24px ${BOOK_COLORS[openSubject! % BOOK_COLORS.length].bg}, inset -4px 0 8px rgba(0,0,0,0.2)`,
                  position: "relative",
                }}
              >
                {/* Spine line */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: "rgba(0,0,0,0.25)", borderRadius: "0 2px 2px 0" }} />
                {/* Book title */}
                <div className="flex flex-col items-center justify-center h-full px-4" style={{ paddingLeft: 24 }}>
                  <BookOpen className="w-8 h-8 mb-4" style={{ color: "rgba(255,255,255,0.9)" }} />
                  <p className="text-base font-display font-semibold text-center leading-tight" style={{ color: "#fff" }}>{openGroup.name}</p>
                  <p className="text-xs mt-3 font-mono opacity-80" style={{ color: "#fff" }}>{openGroup.items.length} 道错题</p>
                </div>
              </div>
            </div>

            {/* Right page - questions */}
            <div className="flex-1 min-w-0" style={{ minWidth: 280 }}>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-headline" style={{ color: "var(--text)" }}>{openGroup.name}</h2>
                <span className="mono-label" style={{ color: "var(--text-muted)" }}>{openGroup.items.length} 题</span>
              </div>
              <div className="space-y-3">
                {openGroup.items.map(renderQuestion)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bookshelf */}
      {!openSubject && (
        <div style={{ position: "relative", paddingBottom: 48 }}>
          {/* Shelf surface */}
          <div style={{
            position: "absolute", bottom: 0, left: -40, right: -40, height: 20,
            background: "var(--bg-card)",
            borderRadius: 4,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.04) inset",
            borderTop: "1px solid var(--border)",
          }} />
          {/* Shelf shadow */}
          <div style={{
            position: "absolute", bottom: 20, left: -40, right: -40, height: 32,
            background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 100%)",
          }} />

          {/* Books row */}
          <div className="flex flex-wrap items-end gap-1" style={{ paddingBottom: 16 }}>
            {grouped.map((group, i) => {
              const palette = BOOK_COLORS[i % BOOK_COLORS.length];
              const height = 160 + (group.items.length % 5) * 12;
              return (
                <button
                  key={group.subject_id}
                  onClick={() => setOpenSubject(group.subject_id)}
                  className="relative cursor-pointer transition-all duration-300 shrink-0 group"
                  style={{
                    width: 100,
                    height,
                    marginBottom: 4,
                    animation: `fade-up var(--slow) var(--ease) ${i * 0.08}s both`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-8px)";
                    e.currentTarget.style.zIndex = "10";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.zIndex = "1";
                  }}
                >
                  {/* Book body */}
                  <div
                    className="w-full h-full rounded-r-md rounded-l-sm relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${palette.spine} 0%, ${palette.face} 100%)`,
                      boxShadow: `4px 2px 12px rgba(0,0,0,0.2), -1px 0 1px rgba(0,0,0,0.08) inset`,
                    }}
                  >
                    {/* Spine */}
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0, width: 14,
                      background: "linear-gradient(90deg, rgba(0,0,0,0.25), rgba(0,0,0,0.1) 50%, transparent)",
                      borderRadius: "0 3px 3px 0",
                    }} />

                    {/* Page edge lines on the right side */}
                    <div style={{
                      position: "absolute", right: 2, top: 8, bottom: 8, width: 4,
                      background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 4px)",
                      borderRadius: 1,
                    }} />

                    {/* Subject name - vertical */}
                    <div className="flex flex-col items-center justify-center h-full px-3" style={{ paddingLeft: 20 }}>
                      <p
                        className="font-display font-semibold leading-tight text-center"
                        style={{
                          color: "#fff",
                          fontSize: group.name.length > 4 ? (group.name.length > 8 ? 12 : 13) : 14,
                          textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        }}
                      >
                        {group.name}
                      </p>

                      {/* Badge */}
                      <div className="mt-3 px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
                        <span className="text-xs font-mono font-semibold" style={{ color: "#fff" }}>{group.items.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom shadow on book */}
                  <div style={{
                    position: "absolute", bottom: -2, left: 2, right: 2, height: 4,
                    background: "rgba(0,0,0,0.12)",
                    borderRadius: "0 0 4px 4px",
                    filter: "blur(2px)",
                  }} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
