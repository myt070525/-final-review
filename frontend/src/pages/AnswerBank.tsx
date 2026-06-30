import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAnswers, getSubject, deleteAnswer } from "../services/api";
import { useToast } from "../components/Toast";
import { ArrowLeft, BookOpen, Trash2, ChevronDown, ChevronRight, FileText } from "lucide-react";
import LatexRenderer from "../components/LatexRenderer";

interface AnswerEntry {
  id: number;
  subject_id: number;
  subject_name: string;
  chapter_id: number | null;
  title: string;
  content: string;
  question_numbers: number[];
  source_document: string;
  created_at: string;
}

export default function AnswerBank() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [subjectName, setSubjectName] = useState("");
  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    try {
      const [subj, data] = await Promise.all([
        getSubject(Number(id)),
        getAnswers({ subject_id: String(id), page_size: "200" }),
      ]);
      setSubjectName(subj.name);
      setAnswers(data.items || []);
    } catch (e: any) {
      toast.error(e.message || "加载失败");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async (answerId: number) => {
    if (deleting) return;
    setDeleting(answerId);
    try {
      await deleteAnswer(answerId);
      setAnswers((prev) => prev.filter((a) => a.id !== answerId));
      toast.success("已删除");
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    }
    setDeleting(null);
  };

  // 按来源文件分组
  const grouped = answers.reduce<Record<string, AnswerEntry[]>>((acc, a) => {
    const key = a.source_document || "手动添加";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link to={`/subject/${id}`} className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-8" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft className="w-3 h-3" /> /subject/{subjectName}
      </Link>

      <div className="mb-10">
        <p className="section-overline mb-2">Answer Bank</p>
        <h1 className="text-display" style={{ color: "var(--text)" }}>答案库</h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          {subjectName} · {answers.length} 条答案
        </p>
      </div>

      {answers.length === 0 ? (
        <div className="card text-center py-16" style={{ padding: "var(--s-12)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <BookOpen className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-headline mb-1" style={{ color: "var(--text-secondary)" }}>暂无答案</p>
          <p className="text-caption" style={{ color: "var(--text-muted)" }}>
            导入带有参考答案的文档时，AI 会自动识别并提取
          </p>
          <Link to={`/subject/${id}/upload`} className="btn-primary inline-flex mt-6 no-underline">
            导入资料
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([source, items]) => (
            <div key={source}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{source}</span>
                <span className="mono-label" style={{ color: "var(--text-muted)" }}>{items.length} 条</span>
              </div>
              <div className="space-y-3">
                {items.map((a) => {
                  const isExpanded = expandedId === a.id;
                  return (
                    <div key={a.id} className="card" style={{ padding: "var(--s-5)" }}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : a.id)}
                        className="w-full flex items-center gap-3 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                        )}
                        <span className="text-sm font-medium flex-1" style={{ color: "var(--text)" }}>{a.title}</span>
                        {a.question_numbers.length > 0 && (
                          <span className="text-xs mono-label" style={{ color: "var(--text-muted)" }}>
                            题号 {a.question_numbers.slice(0, 10).join(", ")}{a.question_numbers.length > 10 ? "…" : ""}
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                          disabled={deleting === a.id}
                          className="p-1.5 rounded-lg hover:bg-opacity-10"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </button>
                      {isExpanded && (
                        <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--bg-raised)" }}>
                          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ color: "var(--text-secondary)" }}>
                            <LatexRenderer text={a.content} />
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
