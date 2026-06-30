import { useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { parseDocument, importQuestions } from "../services/api";
import { useToast } from "../components/Toast";
import LatexRenderer from "../components/LatexRenderer";
import { UploadCloud, FileText, X, Sparkles, ArrowLeft, Check, Loader2, AlertTriangle, RotateCw } from "lucide-react";

interface ParsedQuestion { stem: string; type: string; options: string[] | null; answer: string; tags: string[]; chapter?: string; }
interface ParsedAnswer { title: string; content: string; question_numbers: number[]; }
const typeLabel = (t: string) => ({ choice: "单选题", multi_choice: "多选题", fill: "填空题", essay: "简答题", judge: "判断题" } as any)[t] || t;

interface FileEntry {
  id: string;
  file: File;
  status: "pending" | "parsing" | "done" | "error";
  questions: ParsedQuestion[];
  answers: ParsedAnswer[];
  filename: string;
  error: string;
}

let _uid = 0;
const uid = () => String(++_uid);

export default function Upload() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<{ fid: string; qi: number } | null>(null);

  const parseOne = useCallback(async (entry: FileEntry) => {
    setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "parsing" as const } : e));
    try {
      const result = await parseDocument(entry.file, Number(id));
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "done", questions: Array.isArray(result.questions) ? result.questions : [], answers: Array.isArray(result.answers) ? result.answers : [], filename: result.filename || entry.file.name } : e));
    } catch (err: any) {
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "error", error: err.message } : e));
    }
  }, [id]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newEntries: FileEntry[] = Array.from(files).map((f) => ({
      id: uid(), file: f, status: "pending" as const, questions: [], answers: [], filename: f.name, error: "",
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    // Start parsing each new file concurrently
    newEntries.forEach((entry) => parseOne(entry));
  }, [parseOne]);

  const removeEntry = (eid: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== eid));
    if (expandedFile === eid) setExpandedFile(null);
  };

  const retryEntry = (eid: string) => {
    const entry = entries.find((e) => e.id === eid);
    if (entry) {
      setEntries((prev) => prev.map((e) => e.id === eid ? { ...e, status: "pending" as const, error: "" } : e));
      parseOne(entry);
    }
  };

  const upd = (fid: string, qi: number, field: string, v: any) => {
    setEntries((prev) => prev.map((e) => {
      if (e.id !== fid) return e;
      return { ...e, questions: e.questions.map((q, j) => j === qi ? { ...q, [field]: v } : q) };
    }));
  };

  const totalQuestions = entries.reduce((s, e) => s + e.questions.length, 0);
  const hasParsing = entries.some((e) => e.status === "parsing" || e.status === "pending");
  const doneEntries = entries.filter((e) => e.status === "done" && e.questions.length > 0);

  const handleImport = async () => {
    if (!doneEntries.length) return;
    setImporting(true);
    try {
      const allQuestions = doneEntries.flatMap((e) =>
        e.questions.map((q) => ({ ...q, source_document: e.filename }))
      );
      const allAnswers = doneEntries.flatMap((e) =>
        (e.answers || []).map((a) => ({ ...a, source_document: e.filename }))
      );
      const result = await importQuestions({ subject_id: Number(id), questions: allQuestions, answers: allAnswers });
      toast.success(`已导入 ${allQuestions.length} 题${result.answer_count ? ` + ${result.answer_count} 条答案` : ""}`);
      navigate(`/subject/${id}/questions`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || "导入失败");
    }
    setImporting(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <Link to={`/subject/${id}`} className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-8" style={{ color: "var(--text-muted)" }}><ArrowLeft className="w-3 h-3" /> /subject</Link>
      <div className="mb-10">
        <p className="section-overline mb-2">Import</p>
        <h1 className="text-display" style={{ color: "var(--text)" }}>导入资料</h1>
      </div>

      {/* Drop zone – always visible */}
      <div className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all mb-6"
        style={{ borderColor: dragOver ? "var(--accent)" : "var(--border)", background: dragOver ? "var(--accent-muted)" : "var(--bg-raised)" }}
        onClick={() => fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <UploadCloud className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
        </div>
        <p className="text-headline mb-1" style={{ color: "var(--text-secondary)" }}>拖拽文件或点击选择</p>
        <p className="mono-label" style={{ color: "var(--text-muted)" }}>PDF · DOCX · PPTX · TXT（可多选）</p>
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt" multiple className="hidden"
          onChange={(e) => { if (e.target.files && e.target.files.length > 0) { addFiles(e.target.files); e.target.value = ""; } }} />
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="space-y-3 mb-8">
          {entries.map((entry) => (
            <div key={entry.id} className="card" style={{ padding: "var(--s-4)" }}>
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <span className="text-sm font-mono flex-1 truncate" style={{ color: "var(--text)" }}>{entry.file.name}</span>
                {entry.status === "parsing" && (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--accent)" }}>
                    <Loader2 className="w-3 h-3 animate-spin" />识别中
                  </span>
                )}
                {entry.status === "pending" && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>排队中</span>
                )}
                {entry.status === "done" && (
                  <button onClick={() => setExpandedFile(expandedFile === entry.id ? null : entry.id)}
                    className="text-xs font-mono" style={{ color: "var(--accent-text)" }}>
                    {entry.questions.length} 题{entry.answers.length > 0 ? ` + ${entry.answers.length} 答案` : ""} {expandedFile === entry.id ? "▲" : "▼"}
                  </button>
                )}
                {entry.status === "error" && (
                  <>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--error)" }}>
                      <AlertTriangle className="w-3 h-3" />失败
                    </span>
                    <button onClick={() => retryEntry(entry.id)} className="p-1 rounded-lg hover:bg-white/10 transition-colors" style={{ color: "var(--accent-text)" }} title="重试">
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button onClick={() => removeEntry(entry.id)} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}><X className="w-3.5 h-3.5" /></button>
              </div>
              {entry.status === "error" && (
                <p className="text-xs mt-2 px-1" style={{ color: "var(--error)" }}>{entry.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Parsing indicator */}
      {hasParsing && (
        <div className="flex items-center gap-3 py-4 mb-6 px-4 rounded-xl" style={{ background: "var(--accent-muted)" }}>
          <Sparkles className="w-4 h-4 animate-spin shrink-0" style={{ color: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--accent-text)" }}>AI 正在识别题目...（{entries.filter(e => e.status === "done").length}/{entries.length} 完成）</p>
        </div>
      )}

      {/* Question preview – grouped by file */}
      {doneEntries.length > 0 && (
        <div>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="section-overline mb-1">AI Recognition</p>
              <h2 className="text-headline" style={{ color: "var(--text)" }}>识别结果 <span className="text-base font-body ml-2" style={{ color: "var(--text-muted)" }}>{totalQuestions} 题 / {doneEntries.length} 个文件</span></h2>
            </div>
            <button onClick={handleImport} disabled={importing || hasParsing} className="btn-primary"><Check className="w-4 h-4" /> 全部导入 ({totalQuestions} 题)</button>
          </div>

          {doneEntries.map((entry) => {
            const isExpanded = expandedFile === entry.id;
            return (
              <div key={entry.id} className="mb-4">
                <button onClick={() => setExpandedFile(isExpanded ? null : entry.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors mb-2"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
                  <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm font-medium flex-1 truncate" style={{ color: "var(--text)" }}>{entry.filename}</span>
                  <span className="mono-label shrink-0" style={{ color: "var(--accent-text)" }}>{entry.questions.length} 题</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="space-y-3 pl-2">
                    {entry.questions.map((q, i) => (
                      <div key={i} className="card" style={{ padding: "var(--s-5)" }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="mono-label" style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
                            <span className="tag tag-accent">{typeLabel(q.type)}</span>
                            {q.chapter && <span className="tag tag-muted">{q.chapter}</span>}
                            {q.tags?.map((tag: string) => <span key={tag} className="tag tag-success">{tag}</span>)}
                          </div>
                          <button onClick={() => {
                            setEntries((prev) => prev.map((e) => e.id === entry.id
                              ? { ...e, questions: e.questions.filter((_, j) => j !== i) }
                              : e));
                          }} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}><X className="w-3.5 h-3.5" /></button>
                        </div>
                        {editingIndex?.fid === entry.id && editingIndex?.qi === i ? (
                          <div className="space-y-2">
                            <textarea className="input-base" rows={3} value={q.stem} onChange={(e2) => upd(entry.id, i, "stem", e2.target.value)} />
                            {q.options && <div className="space-y-1.5">{q.options.map((opt: string, oi: number) => (
                              <input key={oi} className="input-base" value={opt} onChange={(e2) => { const o = [...(q.options || [])]; o[oi] = e2.target.value; upd(entry.id, i, "options", o); }} />
                            ))}</div>}
                            <div className="flex gap-2"><input className="input-base flex-1" placeholder="答案" value={q.answer} onChange={(e2) => upd(entry.id, i, "answer", e2.target.value)} /><button onClick={() => setEditingIndex(null)} className="btn-ghost">完成</button></div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text)" }}><LatexRenderer text={q.stem} /></p>
                            {q.options && <div className="text-sm ml-2 space-y-1 mb-2" style={{ color: "var(--text-secondary)" }}>{q.options.map((opt: string) => (
                              <div key={opt}><LatexRenderer text={opt} /></div>
                            ))}</div>}
                            <button onClick={() => setEditingIndex({ fid: entry.id, qi: i })} className="text-xs" style={{ color: "var(--text-muted)" }}>编辑</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* 答案库预览 */}
                    {entry.answers.length > 0 && (
                      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--accent-text)" }}>📝 识别到 {entry.answers.length} 条参考答案</p>
                        <div className="space-y-2">
                          {entry.answers.map((a, ai) => (
                            <div key={ai} className="p-3 rounded-lg" style={{ background: "var(--bg)" }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{a.title}</span>
                                {a.question_numbers && a.question_numbers.length > 0 && (
                                  <span className="text-xs mono-label" style={{ color: "var(--text-muted)" }}>
                                    (题号 {a.question_numbers.slice(0, 15).join(", ")}{a.question_numbers.length > 15 ? "…" : ""})
                                  </span>
                                )}
                              </div>
                              <pre className="text-xs whitespace-pre-wrap font-sans" style={{ color: "var(--text-secondary)", maxHeight: 120, overflow: "hidden" }}>
                                {a.content.length > 300 ? a.content.slice(0, 300) + "…" : a.content}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
