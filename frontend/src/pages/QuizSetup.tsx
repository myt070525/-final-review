import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getSubject, generateQuiz } from "../services/api";
import { useToast } from "../components/Toast";
import { Play, Loader2, ArrowLeft } from "lucide-react";

interface Chapter { id: number; name: string; }
const typeOptions = [{ value: "choice", label: "单选题" }, { value: "multi_choice", label: "多选题" }, { value: "fill", label: "填空题" }, { value: "essay", label: "简答题" }, { value: "judge", label: "判断题" }];
const countOptions = [10, 20, 30, 50];

export default function QuizSetup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [hasExamPriority, setHasExamPriority] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [types, setTypes] = useState<string[]>(["choice"]);
  const [count, setCount] = useState(20);
  const [onlyExam, setOnlyExam] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSubject(Number(id))
      .then((d) => {
        setSubjectName(d.name);
        setChapters(d.chapters);
        const isJava = (d.name || "").toLowerCase().includes("java");
        setHasExamPriority(isJava && !!d.has_exam_priority);
      })
      .catch((e: any) => toast.error(e.message || "加载学科失败"));
  }, [id]);
  const toggle = (v: number, arr: number[], set: (a: number[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const handleStart = async () => {
    if (types.length === 0) {
      toast.error("至少选择一种题型");
      return;
    }
    setLoading(true);
    try {
      const d = await generateQuiz({
        subject_id: Number(id),
        chapter_ids: selectedChapters.length > 0 ? selectedChapters : undefined,
        types, count, only_exam_priority: onlyExam,
      });
      // 0 题提示
      if (!d.questions || d.questions.length === 0) {
        toast.error("该筛选条件下没有题目，请调整章节或题型");
        setLoading(false);
        return;
      }
      if (d.questions.length < count) {
        toast.info(`符合条件只有 ${d.questions.length} 题，已全部加入`);
      } else {
        toast.success(`已抽取 ${d.questions.length} 题，开始练习`);
      }
      navigate(`/quiz/${d.session_id}`, { state: { questions: d.questions } });
    } catch (e: any) {
      toast.error(e.message || "生成练习失败");
    }
    setLoading(false);
  };

  const btnOn = { background: "var(--accent)", color: "#fff", borderColor: "transparent" };
  const btnOff = { background: "var(--bg-raised)", color: "var(--text-secondary)", borderColor: "var(--border)" };

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/subject/${id}`} className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-8" style={{ color: "var(--text-muted)" }}><ArrowLeft className="w-3 h-3" /> /subject</Link>
      <div className="mb-10">
        <p className="section-overline mb-2">New Session</p>
        <h1 className="text-display mb-1" style={{ color: "var(--text)" }}>{subjectName}</h1>
        <p className="text-caption">配置练习参数</p>
      </div>

      <div className="space-y-8">
        <div>
          <p className="section-overline mb-3">题型</p>
          <div className="flex gap-2 flex-wrap">
            {typeOptions.map((t) => { const a = types.includes(t.value); return (
              <button key={t.value} onClick={() => setTypes((p) => p.includes(t.value) ? p.filter((x) => x !== t.value) : [...p, t.value])}
                className="px-5 py-3 rounded-xl text-sm font-medium border transition-all" style={a ? btnOn : btnOff}>{t.label}</button>
            );})}
          </div>
        </div>

        {chapters.length > 0 && (
          <div>
            <p className="section-overline mb-3">章节 <span className="font-body normal-case tracking-normal text-xs" style={{ color: "var(--text-muted)" }}>（不选 = 全部）</span></p>
            <div className="flex gap-2 flex-wrap">
              {chapters.map((ch) => { const a = selectedChapters.includes(ch.id); return (
                <button key={ch.id} onClick={() => toggle(ch.id, selectedChapters, setSelectedChapters)}
                  className="px-4 py-2.5 rounded-xl text-sm border transition-all"
                  style={a ? { background: "var(--success-muted)", color: "var(--success-text)", borderColor: "rgba(52,211,153,0.2)" } : btnOff}>{ch.name}</button>
              );})}
            </div>
          </div>
        )}

        <div>
          <p className="section-overline mb-3">题量</p>
          <div className="flex gap-3">
            {countOptions.map((n) => { const a = count === n; return (
              <button key={n} onClick={() => setCount(n)} className="w-16 h-12 rounded-xl text-lg font-display border transition-all" style={a ? btnOn : btnOff}>{n}</button>
            );})}
          </div>
        </div>

        {/* 仅考试重点 — 仅当该学科有区分考试重点/章节练习时显示 */}
        {hasExamPriority && (
          <div className="card mb-4" style={{ padding: "var(--s-4)" }}>
            <button
              onClick={() => setOnlyExam(!onlyExam)}
              className="w-full flex items-center justify-between px-1"
              style={{ color: onlyExam ? "#f87171" : "var(--text-muted)" }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "1rem" }}>{onlyExam ? "🎯" : "📎"}</span>
                <span className="text-sm font-medium">仅练习考试重点题目</span>
              </div>
              <div
                className="w-10 h-6 rounded-full relative transition-colors"
                style={{ background: onlyExam ? "rgba(239,68,68,0.3)" : "var(--border)" }}
              >
                <div
                  className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                  style={{
                    background: onlyExam ? "#f87171" : "var(--text-muted)",
                    left: onlyExam ? "22px" : "2px",
                  }}
                />
              </div>
            </button>
            {onlyExam && (
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                仅从 PDF 模拟卷中抽题，排除 PPT 章节练习题
              </p>
            )}
          </div>
        )}

        <button onClick={handleStart} disabled={loading || types.length === 0}
          className="w-full py-4 rounded-xl text-lg font-display tracking-wide disabled:opacity-30 transition-all relative overflow-hidden"
          style={{ background: "var(--accent)", color: "#fff" }}>
          <span className="relative z-10 flex items-center justify-center gap-3">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}{loading ? "生成中..." : "开始练习"}</span>
        </button>
      </div>
    </div>
  );
}
