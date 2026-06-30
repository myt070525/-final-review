import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSubject, addChapter } from "../services/api";
import { useToast } from "../components/Toast";
import { Upload, FileQuestion, PlaySquare, Plus, ArrowLeft, BookOpen, Code, Route, FileCheck } from "lucide-react";

interface Chapter { id: number; name: string; }
interface SubjectData { id: number; name: string; description: string; chapters: Chapter[]; question_count: number; }

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [newChapterName, setNewChapterName] = useState("");
  const toast = useToast();

  const load = async () => { try { setSubject(await getSubject(Number(id))); } catch (e: any) { toast.error(e.message || "加载失败"); } };
  useEffect(() => { load(); }, [id]);

  const handleAddChapter = async () => {
    if (!newChapterName.trim()) return;
    try { await addChapter(Number(id), newChapterName.trim()); setNewChapterName(""); toast.success("章节已添加"); await load(); } catch (e: any) { toast.error(e.message); }
  };

  if (!subject) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} /></div>;

  const actions = [
    { to: `/subject/${id}/upload`, label: "导入资料", desc: "Word/PPT/PDF 自动识别", icon: Upload },
    { to: `/subject/${id}/questions`, label: "题库管理", desc: "浏览、编辑、搜索题目", icon: FileQuestion },
    { to: `/subject/${id}/answers`, label: "答案库", desc: "浏览参考答案与解析", icon: BookOpen },
    { to: `/subject/${id}/quiz`, label: "开始练习", desc: "按章节和题型抽题", icon: PlaySquare },
  ];

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-8" style={{ color: "var(--text-muted)" }}><ArrowLeft className="w-3 h-3" /> /home</Link>

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="section-overline mb-2">{subject.description || "Subject"}</p>
          <h1 className="text-display" style={{ color: "var(--text)" }}>{subject.name}</h1>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl border" style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}>
          <div className="text-right">
            <div className="stat-number text-3xl" style={{ color: "var(--accent)" }}>{subject.question_count}</div>
            <p className="mono-label" style={{ color: "var(--text-muted)" }}>道题目</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {actions.map((a, i) => (
          <Link key={a.to} to={a.to} className="card-interactive no-underline group"
            style={{ padding: "var(--s-6)", animation: `fade-up var(--slow) var(--ease) ${i * 0.08}s both` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
              style={{ background: "var(--accent-muted)" }}>
              <a.icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>{a.label}</div>
            <div className="text-caption">{a.desc}</div>
          </Link>
        ))}
      </div>

      {/* Java 专属板块入口 */}
      {subject.name.toLowerCase().includes("java") && (
        <>
          <div className="mb-6">
            <p className="section-overline mb-4">Java 专属复习</p>
            <div className="grid grid-cols-3 gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Link to={`/subject/${id}/java/review`} className="card-interactive no-underline group"
                style={{ padding: "var(--s-6)", borderColor: "var(--border-accent)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: "var(--accent-muted)" }}>
                  <BookOpen className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>知识复习</div>
                <div className="text-caption">按章节浏览结构化知识</div>
              </Link>
              <Link to={`/subject/${id}/java/runner`} className="card-interactive no-underline group"
                style={{ padding: "var(--s-6)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: "var(--accent-muted)" }}>
                  <Code className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>代码运行器</div>
                <div className="text-caption">在线编辑运行Java代码</div>
              </Link>
              <Link to={`/subject/${id}/java/path`} className="card-interactive no-underline group"
                style={{ padding: "var(--s-6)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: "var(--accent-muted)" }}>
                  <Route className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>学习路径</div>
                <div className="text-caption">逐章闯关 · 顺序解锁</div>
              </Link>
              <Link to={`/subject/${id}/java/mock-exam`} className="card-interactive no-underline group"
                style={{ padding: "var(--s-6)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: "var(--accent-muted)" }}>
                  <FileCheck className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>模拟考试</div>
                <div className="text-caption">5大题60小题 · 按试卷格式</div>
              </Link>
            </div>
          </div>
          <div className="mb-10" style={{ borderTop: "1px solid var(--border)" }} />
        </>
      )}

      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-overline mb-1">Chapters</p>
            <h2 className="text-headline" style={{ color: "var(--text)" }}>章节</h2>
          </div>
          <span className="mono-label" style={{ color: "var(--text-muted)" }}>{subject.chapters.length} 个</span>
        </div>
        <div className="flex gap-2 mb-5">
          <input className="input-base flex-1" placeholder="输入章节名称，Enter 添加" value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddChapter()} />
          <button onClick={handleAddChapter} className="btn-primary"><Plus className="w-4 h-4" /> 添加</button>
        </div>
        {subject.chapters.length === 0 ? (
          <p className="text-caption italic">暂无章节 — 导入资料时会自动创建</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subject.chapters.map((ch, i) => (
              <span key={ch.id} className="px-4 py-2.5 rounded-lg text-sm border cursor-default"
                style={{ background: "var(--bg-raised)", borderColor: "var(--border)", color: "var(--text-secondary)", animation: `fade-up var(--slow) var(--ease) ${i * 0.03}s both` }}>{ch.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
