import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getQuestions, getQuestionSets, deleteQuestion, batchDeleteQuestions, updateQuestion, getExplanation, generateSimilar, getSubject, addBookmark, removeBookmark, checkBookmarks } from "../services/api";
import { useToast } from "../components/Toast";
import { Trash2, Edit3, Check, Sparkles, Lightbulb, Loader2, ArrowLeft, Search, List, FolderOpen, Star } from "lucide-react";
import LatexRenderer from "../components/LatexRenderer";
import MarkdownRenderer from "../components/MarkdownRenderer";

interface Question {
  id: number; subject_id: number; chapter_id: number | null; type: string;
  stem: string; options: string[] | null; answer: string; explanation: string;
  source_document: string; is_ai_generated: boolean; tags: string[]; difficulty: string;
}
interface QuestionSet {
  source_document: string; count: number;
  types: Record<string, number>; questions: Question[];
}

const typeLabel = (t: string) => ({ choice: "单选题", multi_choice: "多选题", fill: "填空题", essay: "简答题", judge: "判断题" } as any)[t] || t;
const typeOrder = ["choice", "multi_choice", "fill", "judge", "essay"];

// 判断题选项统一显示（后端 answer 已归一化为 A/B）
const JUDGE_OPTIONS = ["A. 对", "B. 错"];

// 判断题答案归一化：A/B/对/错/True/False → A 或 B
function normalizeJudge(ans: string): string {
  if (!ans) return "";
  const a = ans.trim().toLowerCase();
  if (["对", "正确", "是", "true", "t", "yes", "y", "✓", "√", "a"].includes(a)) return "A";
  if (["错", "错误", "否", "false", "f", "no", "n", "✗", "×", "b"].includes(a)) return "B";
  return ans.trim().toUpperCase();
}

export default function QuestionBank() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<"list" | "sets">("list");

  // List view state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState(""); const [priorityFilter, setPriorityFilter] = useState(""); const [search, setSearch] = useState("");
  const [hasExamPriority, setHasExamPriority] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [listLoading, setListLoading] = useState(false);

  // Sets view state
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  // Shared state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [explainingId, setExplainingId] = useState<number | null>(null);
  const [explanationMap, setExplanationMap] = useState<Record<number, string>>({});
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [similarMap, setSimilarMap] = useState<Record<number, any[]>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [bookmarkToggling, setBookmarkToggling] = useState<number | null>(null);

  // Load subject info for has_exam_priority (Java subjects only)
  useEffect(() => {
    getSubject(Number(id)).then((d) => {
      const name = (d.name || "").toLowerCase();
      const isJava = name.includes("java");
      setSubjectName(d.name || "");
      setHasExamPriority(isJava && !!d.has_exam_priority);
    }).catch(() => {});
  }, [id]);

  // List view loader
  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const p: Record<string, string> = { subject_id: id!, page: String(page), page_size: "20" };
      if (typeFilter) p.type = typeFilter; if (priorityFilter) p.priority = priorityFilter; if (search) p.search = search;
      const d = await getQuestions(p); setQuestions(d.items); setTotal(d.total);
    } catch (e: any) { toast.error(e.message || "加载题库失败"); }
    setListLoading(false);
  }, [id, page, typeFilter, priorityFilter, search]);
  useEffect(() => { if (viewMode === "list") loadList(); }, [loadList, viewMode]);

  // Sets view loader
  const loadSets = useCallback(async () => {
    setSetsLoading(true);
    try { const d = await getQuestionSets(Number(id)); setSets(d.sets); } catch (e: any) { toast.error(e.message || "加载套题失败"); }
    setSetsLoading(false);
  }, [id]);
  useEffect(() => { if (viewMode === "sets") loadSets(); }, [loadSets, viewMode]);

  const handleDelete = async (qid: number) => { if (!confirm("确定删除？")) return; try { await deleteQuestion(qid); toast.success("已删除"); viewMode === "list" ? loadList() : loadSets(); } catch (e: any) { toast.error(e.message); } };
  const handleDeleteSet = async (doc: string) => {
    const qs = sets.find((s) => s.source_document === doc)?.questions || [];
    if (!confirm(`删除整套「${doc}」（共 ${qs.length} 题）？`)) return;
    try { await batchDeleteQuestions(qs.map((q) => q.id)); toast.success(`已删除 ${qs.length} 题`); loadSets(); } catch (e: any) { toast.error(e.message); }
  };
  const startEdit = (q: Question) => { setEditingId(q.id); setEditData({ stem: q.stem, type: q.type, options: q.options || [], answer: q.answer, tags: q.tags || [], difficulty: q.difficulty, explanation: q.explanation }); };
  const saveEdit = async () => { if (!editingId) return; try { await updateQuestion(editingId, editData); setEditingId(null); toast.success("已保存"); viewMode === "list" ? loadList() : loadSets(); } catch (e: any) { toast.error(e.message); } };
  const handleExplain = async (qid: number) => {
    setExplainingId(qid);
    try {
      const d = await getExplanation(qid);
      setExplanationMap((p) => ({ ...p, [qid]: d.explanation }));
      // Also update local question state so <details> picks it up
      if (viewMode === "list") {
        setQuestions((prev) => prev.map((q) => q.id === qid ? { ...q, explanation: d.explanation } : q));
      } else {
        setSets((prev) => prev.map((s) => ({
          ...s,
          questions: s.questions.map((q) => q.id === qid ? { ...q, explanation: d.explanation } : q),
        })));
      }
      toast.success(d.cached ? "已加载已有解析" : "AI 解析已生成，点击下方「AI 解析」查看");
    } catch (e: any) { toast.error(e.message); }
    setExplainingId(null);
  };
  const handleGenerate = async (qid: number) => { setGeneratingId(qid); try { const d = await generateSimilar(qid, 2); setSimilarMap((p) => ({ ...p, [qid]: d.questions })); toast.success("已生成同类题"); } catch (e: any) { toast.error(e.message); } setGeneratingId(null); };

  // Bookmark check & toggle
  const loadBookmarkedIds = useCallback(async () => {
    // Collect all visible question IDs
    const allIds = viewMode === "list" ? questions.map(q => q.id) : sets.flatMap(s => s.questions.map(q => q.id));
    if (allIds.length === 0) return;
    try {
      const data = await checkBookmarks(allIds);
      setBookmarkedIds(new Set(data.bookmarked_ids));
    } catch { /* silent */ }
  }, [viewMode, questions, sets]);

  useEffect(() => { loadBookmarkedIds(); }, [loadBookmarkedIds]);

  const handleToggleBookmark = async (qid: number) => {
    setBookmarkToggling(qid);
    const isBookmarked = bookmarkedIds.has(qid);
    // Optimistic update
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(qid); else next.add(qid);
      return next;
    });
    try {
      if (isBookmarked) {
        await removeBookmark(qid);
        toast.success("已取消收藏");
      } else {
        await addBookmark(qid);
        toast.success("已加入收藏");
      }
    } catch (e: any) {
      // Revert
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (isBookmarked) next.add(qid); else next.delete(qid);
        return next;
      });
      toast.error(e.message);
    }
    setBookmarkToggling(null);
  };

  const totalPages = Math.ceil(total / 20);

  // ── Question card (shared between views) ──
  const renderQuestionCard = (q: Question, num: number) => (
    <div key={q.id} className="card relative overflow-hidden" style={{ padding: "var(--s-5)", animation: `fade-up var(--slow) var(--ease) 0.02s both` }}>
      {editingId === q.id ? (
        <div className="space-y-3">
          <select className="input-base" style={{ width: "auto" }} value={editData.type} onChange={(e) => {
            const nt = e.target.value;
            const u: any = { ...editData, type: nt };
            if (nt === "judge") { u.options = ["A. 对", "B. 错"]; u.answer = u.answer || "A"; }
            else if (nt === "choice" || nt === "multi_choice") { u.options = u.options?.length ? u.options : []; u.answer = ""; }
            else { u.options = null; u.answer = ""; }
            setEditData(u);
          }}>
            <option value="choice">单选题</option><option value="multi_choice">多选题</option><option value="fill">填空题</option><option value="judge">判断题</option><option value="essay">简答题</option>
          </select>
          <textarea className="input-base" rows={3} value={editData.stem} onChange={(e) => setEditData({ ...editData, stem: e.target.value })} />
          {editData.type === "choice" || editData.type === "multi_choice" ? (editData.options?.length > 0 && <div className="space-y-1.5">{editData.options.map((o: string, oi: number) => (
            <input key={oi} className="input-base" value={o} onChange={(e) => { const x = [...editData.options]; x[oi] = e.target.value; setEditData({ ...editData, options: x }); }} />
          ))}</div>) : null}
          {editData.type === "judge" && (
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>答案：</span>
              {JUDGE_OPTIONS.map((label) => {
                const v = label.charAt(0);
                return (
                  <label key={v} className="flex items-center gap-2 cursor-pointer select-none" style={{ color: normalizeJudge(editData.answer) === v ? "var(--accent)" : "var(--text-muted)" }}>
                    <input type="radio" name={`judge-${q.id}`} checked={normalizeJudge(editData.answer) === v} onChange={() => setEditData({ ...editData, answer: v })} className="accent" />
                    {label}
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            {editData.type !== "judge" && <input className="input-base w-28" placeholder={editData.type === "multi_choice" ? "如 ABD" : "答案"} value={editData.answer} onChange={(e) => setEditData({ ...editData, answer: e.target.value })} />}
            <button onClick={saveEdit} className="btn-primary" style={{ background: "var(--success)" }}><Check className="w-3.5 h-3.5" />保存</button>
            <button onClick={() => setEditingId(null)} className="btn-ghost">取消</button>
          </div>
        </div>
      ) : (
        <div className="flex" style={{ gap: "var(--s-6)" }}>
          <div className="hidden sm:flex shrink-0 items-center justify-end" style={{ width: 36 }}>
            <div className="stat-number" style={{ fontSize: "1.75rem", color: "var(--border)", lineHeight: 1 }}>{String(num).padStart(2, "0")}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="tag tag-accent">{typeLabel(q.type)}</span>
              {subjectName.toLowerCase().includes("java") && (q as any).priority === "high" && (
                <span className="tag tag-nowrap" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", borderColor: "rgba(239,68,68,0.25)" }}>🎯 考试重点</span>
              )}
              {(q as any).source_document && !(subjectName.toLowerCase().includes("java") && (q as any).priority === "high") && (
                <span className="tag tag-muted tag-nowrap">📎 {(q as any).source_label || (q as any).source_document}</span>
              )}
              {q.is_ai_generated && <span className="tag tag-muted">AI</span>}
              {q.tags?.map((tag: string) => <span key={tag} className="tag tag-muted">{tag}</span>)}
            </div>
            <p className="text-base leading-relaxed mb-3" style={{ color: "var(--text)" }}><LatexRenderer text={q.stem} /></p>
            {(q.options || q.type === "judge") && (
              <div className="mb-3 space-y-1">
                {(q.type === "judge" ? JUDGE_OPTIONS : (q.options || [])).map((opt: string) => {
                  const letter = opt.charAt(0).toUpperCase();
                  // judge 题用 normalizeJudge 归一化后再比对，避免 AI 存"对/错"导致高亮失效
                  const normalizedAns = q.type === "judge" ? normalizeJudge(q.answer) : (q.answer || "").toUpperCase();
                  const isMulti = q.type === "multi_choice";
                  const isCorrect = isMulti ? normalizedAns.includes(letter) : letter === normalizedAns.charAt(0);
                  return (
                    <div key={opt} className="text-sm pl-3 py-0.5 flex items-center gap-2"
                      style={{ color: isCorrect ? "var(--success-text)" : "var(--text-secondary)", fontWeight: isCorrect ? 500 : 400 }}>
                      <LatexRenderer text={opt} />
                      {isCorrect && q.type === "judge" && <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />}
                    </div>
                  );
                })}
              </div>
            )}
            {(q.explanation || explanationMap[q.id]) && (
              <details className="mt-2" open={!q.explanation && !!explanationMap[q.id]}>
                <summary className="text-xs cursor-pointer" style={{ color: "var(--accent-text)" }}>
                  {q.explanation ? "查看解析" : "AI 解析"} {!q.explanation && explanationMap[q.id] && <span className="tag tag-accent" style={{ fontSize: "0.65rem", marginLeft: 4 }}>新</span>}
                </summary>
                <div className="mt-2 p-3 rounded-lg" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    <MarkdownRenderer text={explanationMap[q.id] || q.explanation} />
                  </p>
                </div>
              </details>
            )}
            {similarMap[q.id]?.length > 0 && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--success-muted)", border: "1px solid rgba(52,211,153,0.15)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--success-text)" }}>已生成同类题</p>
                {similarMap[q.id].map((sq: any, si: number) => (
                  <div key={si} className="mb-2 p-2 rounded-lg" style={{ background: "var(--bg-card)" }}>
                    <p className="text-sm" style={{ color: "var(--text)" }}><LatexRenderer text={sq.stem} /></p>
                    {sq.options && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sq.options.join(" / ")}</p>}
                    <p className="text-xs mt-1" style={{ color: "var(--accent-text)" }}>答案: {sq.answer}</p>
                  </div>
                ))}
                <button onClick={() => setSimilarMap((p) => { const n = { ...p }; delete n[q.id]; return n; })} className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>收起</button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-0.5 shrink-0">
            <button onClick={() => handleToggleBookmark(q.id)} className="p-2 rounded-lg transition-colors" style={{ color: bookmarkedIds.has(q.id) ? "#f59e0b" : "var(--text-muted)" }} title={bookmarkedIds.has(q.id) ? "取消收藏" : "加入收藏"}>
              {bookmarkToggling === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" fill={bookmarkedIds.has(q.id) ? "#f59e0b" : "none"} />}
            </button>
            <button onClick={() => handleExplain(q.id)} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }} title={q.explanation ? "重新生成 AI 解析" : "AI 生成解析"}>{explainingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}</button>
            {q.type === "choice" || q.type === "multi_choice" ? <button onClick={() => handleGenerate(q.id)} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}>{generatingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}</button> : null}
            <button onClick={() => startEdit(q)} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}><Edit3 className="w-4 h-4" /></button>
            <button onClick={() => handleDelete(q.id)} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <Link to={`/subject/${id}`} className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-8" style={{ color: "var(--text-muted)" }}><ArrowLeft className="w-3 h-3" /> /subject</Link>

      {/* Header with view toggle */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="section-overline mb-2">Question Bank</p>
          <h1 className="text-display" style={{ color: "var(--text)" }}>题库</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="stat-number text-3xl" style={{ color: "var(--text-muted)" }}>{viewMode === "list" ? total : sets.reduce((s, x) => s + x.count, 0)}</span>
          {/* View toggle */}
          <div className="flex rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => setViewMode("list")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-l-lg transition-colors"
              style={{ background: viewMode === "list" ? "var(--accent-muted)" : "transparent", color: viewMode === "list" ? "var(--accent)" : "var(--text-muted)" }}>
              <List className="w-3.5 h-3.5" />列表
            </button>
            <button onClick={() => setViewMode("sets")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-r-lg transition-colors"
              style={{ background: viewMode === "sets" ? "var(--accent-muted)" : "transparent", color: viewMode === "sets" ? "var(--accent)" : "var(--text-muted)" }}>
              <FolderOpen className="w-3.5 h-3.5" />套题
            </button>
          </div>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {viewMode === "list" && (
        <>
          <div className="flex gap-3 mb-10">
            <select className="input-base" style={{ width: "auto", minWidth: 120 }} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">全部题型</option><option value="choice">单选题</option><option value="multi_choice">多选题</option><option value="fill">填空题</option><option value="essay">简答题</option><option value="judge">判断题</option>
            </select>
            {hasExamPriority && (
              <button
                onClick={() => { setPriorityFilter(priorityFilter === "high" ? "" : "high"); setPage(1); }}
                className="btn-ghost"
                style={{
                  padding: "6px 14px", fontSize: "0.8125rem", whiteSpace: "nowrap",
                  borderColor: priorityFilter === "high" ? "rgba(239,68,68,0.3)" : "var(--border)",
                  color: priorityFilter === "high" ? "#f87171" : "var(--text-muted)",
                  background: priorityFilter === "high" ? "rgba(239,68,68,0.08)" : "transparent",
                }}
              >
                🎯 仅考试重点
              </button>
            )}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <input className="input-base pl-10" placeholder="搜索题干关键词..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          {listLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: "var(--s-5)", animation: `fade-up var(--slow) var(--ease) ${i * 0.03}s both` }}>
                  <div className="flex" style={{ gap: "var(--s-6)" }}>
                    <div style={{ width: 36 }}><div className="skeleton" style={{ width: "1.75rem", height: "1.75rem" }} /></div>
                    <div className="flex-1">
                      <div className="flex gap-2 mb-3"><div className="skeleton" style={{ width: 48, height: 20 }} /><div className="skeleton" style={{ width: 48, height: 20 }} /></div>
                      <div className="skeleton" style={{ height: "1rem", width: "80%", marginBottom: "var(--s-2)" }} />
                      <div className="skeleton" style={{ height: "1rem", width: "60%" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, i) => renderQuestionCard(q, (page - 1) * 20 + i + 1))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-8 mt-10">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-ghost">上一页</button>
              <span className="mono-label" style={{ color: "var(--text-muted)" }}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost">下一页</button>
            </div>
          )}
        </>
      )}

      {/* ── SETS VIEW ── */}
      {viewMode === "sets" && (
        <>
          {setsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: "var(--s-5) var(--s-6)", animation: `fade-up var(--slow) var(--ease) ${i * 0.05}s both` }}>
                  <div className="skeleton" style={{ height: "1.5rem", width: "50%", marginBottom: "var(--s-3)" }} />
                  <div className="flex gap-2"><div className="skeleton" style={{ width: 56, height: 20 }} /><div className="skeleton" style={{ width: 56, height: 20 }} /></div>
                </div>
              ))}
            </div>
          ) : sets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24" style={{ color: "var(--text-muted)" }}>
              <FolderOpen className="w-10 h-10 mb-4" />
              <p className="text-headline mb-2" style={{ color: "var(--text-secondary)" }}>暂无套题</p>
              <p className="text-caption">导入文档后，可按套题查看</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sets.map((set, i) => {
                const isExpanded = expandedSet === set.source_document;
                return (
                  <div key={set.source_document} className="card overflow-hidden" style={{ animation: `fade-up var(--slow) var(--ease) ${i * 0.05}s both` }}>
                    {/* Set header */}
                    <div
                      className="flex items-center justify-between cursor-pointer transition-colors"
                      style={{ padding: "var(--s-5) var(--s-6)", background: isExpanded ? "var(--bg-raised)" : "transparent" }}
                      onClick={() => setExpandedSet(isExpanded ? null : set.source_document)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="stat-number text-xl" style={{ color: "var(--text)" }}>{set.count}</span>
                          <span className="mono-label" style={{ color: "var(--text-muted)" }}>题</span>
                          <h3 className="text-base font-semibold truncate" style={{ color: "var(--text)" }}>{set.source_document}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {typeOrder.map((t) => {
                            const n = set.types[t];
                            if (!n) return null;
                            return <span key={t} className="tag tag-muted">{typeLabel(t)} ×{n}</span>;
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.source_document); }}
                          className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.background = "var(--error-muted)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}>
                          <Trash2 className="w-4 h-4" /></button>
                        <span className="mono-label" style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
                      </div>
                    </div>

                    {/* Expanded questions */}
                    {isExpanded && (
                      <div style={{ padding: "0 var(--s-6) var(--s-6)", borderTop: "1px solid var(--border)" }}>
                        <div className="space-y-3 mt-4">
                          {set.questions.map((q, qi) => renderQuestionCard(q, qi + 1))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
