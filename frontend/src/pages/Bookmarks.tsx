import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getBookmarks, removeBookmark, updateBookmarkNotes } from "../services/api";
import { useToast } from "../components/Toast";
import { Star, Trash2, ArrowLeft, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import LatexRenderer from "../components/LatexRenderer";
import MarkdownRenderer from "../components/MarkdownRenderer";

interface BookmarkItem {
  id: number;
  question_id: number;
  stem: string;
  type: string;
  options: string[] | null;
  answer: string;
  explanation: string;
  tags: string[];
  difficulty: string;
  subject_id: number;
  subject_name: string;
  chapter_id: number | null;
  source_document: string;
  notes: string;
  bookmarked_at: string;
}

interface GroupedBookmarks {
  subject_name: string;
  subject_id: number;
  items: BookmarkItem[];
}

const TYPE_LABELS: Record<string, string> = {
  choice: "单选题", multi_choice: "多选题", fill: "填空题",
  essay: "简答题", judge: "判断题",
};

function typeLabel(t: string) { return TYPE_LABELS[t] || t; }

export default function Bookmarks() {
  const [grouped, setGrouped] = useState<GroupedBookmarks[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await getBookmarks();
      setGrouped(data.grouped || []);
      setTotal(data.total || 0);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<number, boolean>>({});

  const handleSaveNotes = async (questionId: number) => {
    const notes = editingNotes[questionId];
    if (notes === undefined) return;
    setSavingNotes((prev) => ({ ...prev, [questionId]: true }));
    try {
      await updateBookmarkNotes(questionId, notes);
      toast.success("笔记已保存");
      // Update local state
      setGrouped((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.map((it) =>
            it.question_id === questionId ? { ...it, notes } : it
          ),
        }))
      );
      // Clear editing state
      setEditingNotes((prev) => { const n = { ...prev }; delete n[questionId]; return n; });
    } catch (e: any) {
      toast.error(e.message);
    }
    setSavingNotes((prev) => ({ ...prev, [questionId]: false }));
  };

  const handleRemove = async (questionId: number) => {
    try {
      await removeBookmark(questionId);
      toast.success("已取消收藏");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleQuestion = (qid: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [qid]: !prev[qid] }));
  };

  // Expand all groups by default on first load
  useEffect(() => {
    if (grouped.length > 0) {
      const all: Record<string, boolean> = {};
      grouped.forEach((g) => { all[g.subject_name] = true; });
      setExpandedGroups(all);
    }
  }, [grouped.length]);

  if (loading) {
    return (
      <div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-8" style={{ color: "var(--text-muted)" }}><ArrowLeft className="w-3 h-3" /> /home</Link>
        <div className="skeleton-card h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-8" style={{ color: "var(--text-muted)" }}><ArrowLeft className="w-3 h-3" /> /home</Link>

      <div className="flex items-center gap-3 mb-8">
        <Star className="w-6 h-6" style={{ color: "#f59e0b", fill: "#f59e0b" }} />
        <div>
          <p className="section-overline mb-1">Bookmarks</p>
          <h1 className="text-display" style={{ color: "var(--text)" }}>我的收藏</h1>
        </div>
        <span className="tag tag-muted ml-2" style={{ fontSize: "0.8rem" }}>{total} 题</span>
      </div>

      {total === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2" style={{ color: "var(--text-secondary)" }}>收藏夹为空</p>
          <p className="text-sm">去<Link to="/" style={{ color: "var(--accent-text)" }}>题库</Link>找到重点题目，点击 ⭐ 即可收藏</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => {
            const isExpanded = expandedGroups[group.subject_name] !== false;
            return (
              <div key={group.subject_name} className="rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <button
                  onClick={() => toggleGroup(group.subject_name)}
                  className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl transition-colors"
                  style={{ background: "var(--bg-raised)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-raised)"; }}>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                    <Link
                      to={`/subject/${group.subject_id}/questions`}
                      className="text-sm font-semibold no-underline transition-colors"
                      style={{ color: "var(--text)" }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text)"; }}>
                      {group.subject_name}
                    </Link>
                  </div>
                  <span className="tag tag-muted text-xs">{group.items.length} 题</span>
                </button>

                {isExpanded && (
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {group.items.map((item) => {
                      const isQExpanded = expandedQuestions[item.question_id] || false;
                      return (
                        <div key={item.id}>
                          <div className="px-5 py-3 flex items-start gap-3 cursor-pointer" onClick={() => toggleQuestion(item.question_id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="tag tag-accent" style={{ fontSize: "0.65rem" }}>{typeLabel(item.type)}</span>
                                {item.difficulty && item.difficulty !== "medium" && (
                                  <span className="tag tag-muted" style={{ fontSize: "0.65rem" }}>{item.difficulty === "hard" ? "困难" : "简单"}</span>
                                )}
                                {item.tags?.slice(0, 3).map((tag) => (
                                  <span key={tag} className="tag tag-muted" style={{ fontSize: "0.65rem" }}>{tag}</span>
                                ))}
                              </div>
                              <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text)" }}>
                                <LatexRenderer text={item.stem} />
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemove(item.question_id); }}
                              className="shrink-0 p-2 rounded-lg transition-colors"
                              style={{ color: "var(--text-muted)" }}
                              title="取消收藏"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {isQExpanded && (
                            <div className="px-5 pb-4 pl-10">
                              {item.options && item.options.length > 0 && (
                                <div className="mb-3 space-y-0.5">
                                  {item.options.map((opt) => {
                                    const letter = opt.charAt(0).toUpperCase();
                                    const isCorrect = item.type === "multi_choice"
                                      ? (item.answer || "").toUpperCase().includes(letter)
                                      : letter === (item.answer || "").charAt(0).toUpperCase();
                                    return (
                                      <p key={opt} className="text-sm" style={{ color: isCorrect ? "var(--success-text)" : "var(--text-secondary)", fontWeight: isCorrect ? 500 : 400 }}>
                                        <LatexRenderer text={opt} />
                                      </p>
                                    );
                                  })}
                                </div>
                              )}
                              <p className="text-sm mb-2" style={{ color: "var(--accent-text)" }}>
                                答案：<LatexRenderer text={item.answer} />
                              </p>
                              {item.explanation && (
                                <details className="mt-2">
                                  <summary className="text-xs cursor-pointer" style={{ color: "var(--accent-text)" }}>查看解析</summary>
                                  <div className="mt-2 p-3 rounded-lg" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
                                    <MarkdownRenderer text={item.explanation} />
                                  </div>
                                </details>
                              )}
                              {/* 笔记 */}
                              <div className="mt-3">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Pencil className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>笔记</span>
                                  {savingNotes[item.question_id] && (
                                    <span className="text-xs" style={{ color: "var(--accent-text)" }}>保存中...</span>
                                  )}
                                </div>
                                <textarea
                                  className="w-full rounded-lg p-2.5 text-sm resize-y transition-colors"
                                  style={{
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                    minHeight: "60px",
                                  }}
                                  placeholder="添加私人笔记..."
                                  value={editingNotes[item.question_id] !== undefined ? editingNotes[item.question_id] : item.notes || ""}
                                  onChange={(e) => {
                                    setEditingNotes((prev) => ({ ...prev, [item.question_id]: e.target.value }));
                                  }}
                                  onBlur={() => {
                                    const current = editingNotes[item.question_id];
                                    if (current !== undefined && current !== (item.notes || "")) {
                                      handleSaveNotes(item.question_id);
                                    }
                                  }}
                                  onFocus={() => {
                                    if (editingNotes[item.question_id] === undefined) {
                                      setEditingNotes((prev) => ({ ...prev, [item.question_id]: item.notes || "" }));
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex gap-2 mt-3">
                                <Link
                                  to={`/subject/${item.subject_id}/questions`}
                                  className="text-xs no-underline px-3 py-1.5 rounded-lg transition-colors"
                                  style={{ color: "var(--accent-text)", background: "var(--accent-muted)" }}>
                                  去题库查看
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
