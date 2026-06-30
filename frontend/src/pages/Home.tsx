import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSubjects, createSubject, deleteSubject } from "../services/api";
import { useToast } from "../components/Toast";
import { Plus, Trash2, BookOpen, Layers } from "lucide-react";

interface Subject { id: number; name: string; description: string; chapter_count: number; question_count: number; }

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => { try { setSubjects(await getSubjects()); } catch (e: any) { toast.error(e.message || "加载学科失败"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return; setLoading(true);
    try { await createSubject({ name: name.trim(), description: description.trim() }); setName(""); setDescription(""); setShowCreate(false); toast.success("学科已创建"); await load(); } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  const handleDelete = async (e: React.MouseEvent, id: number, n: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`删除「${n}」？该学科下所有题目都会被删除。`)) return;
    try { await deleteSubject(id); toast.success("已删除"); await load(); } catch (e: any) { toast.error(e.message); }
  };

  const totalQ = subjects.reduce((s, x) => s + x.question_count, 0);

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="section-overline mb-2">Study Space</p>
          <h1 className="text-display" style={{ color: "var(--text)" }}>学科</h1>
          {subjects.length > 0 && <p className="text-caption mt-3">共 {subjects.length} 门，{totalQ} 题</p>}
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> 新建学科</button>
      </div>

      {showCreate && (
        <div className="card mb-10" style={{ padding: "var(--s-6)" }}>
          <p className="section-overline mb-4">New Subject</p>
          <input className="input-base mb-3" placeholder="学科名称" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input className="input-base mb-5" placeholder="描述（可选）" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={loading || !name.trim()} className="btn-primary">{loading ? "创建中..." : "创建"}</button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">取消</button>
          </div>
        </div>
      )}

      {loading && subjects.length === 0 ? (
        <div className="card-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: "var(--s-6)", animation: `fade-up var(--slow) var(--ease) ${i * 0.05}s both` }}>
              <div className="skeleton" style={{ width: "3rem", height: "3rem", borderRadius: "var(--r-md)", marginBottom: "var(--s-5)" }} />
              <div className="skeleton" style={{ height: "1.5rem", width: "60%", marginBottom: "var(--s-3)" }} />
              <div className="skeleton" style={{ height: "0.75rem", width: "40%" }} />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
            <BookOpen className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-headline mb-2" style={{ color: "var(--text-secondary)" }}>尚无学科</p>
          <p className="text-caption">点击右上角「新建学科」开始</p>
        </div>
      ) : (
        <div className="card-grid">
          {subjects.map((s, i) => (
            <Link key={s.id} to={`/subject/${s.id}`} className="card-interactive no-underline group relative overflow-hidden"
              style={{ padding: "var(--s-6)", animation: `fade-up var(--slow) var(--ease) ${i * 0.05}s both` }}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="stat-number text-5xl" style={{ color: "var(--accent)" }}>{s.question_count}</div>
                  <p className="mono-label mt-1" style={{ color: "var(--text-muted)" }}>道题目</p>
                </div>
                <button onClick={(e) => handleDelete(e, s.id, s.name)}
                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.background = "var(--error-muted)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}>
                  <Trash2 className="w-4 h-4" /></button>
              </div>
              <h3 className="text-headline mb-2" style={{ color: "var(--text)" }}>{s.name}</h3>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-caption"><Layers className="w-3 h-3" />{s.chapter_count} 章节</span>
                {s.description && <span className="text-caption">{s.description}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
