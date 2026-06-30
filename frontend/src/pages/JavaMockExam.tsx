import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { generateMockExam } from "../services/api";
import { useToast } from "../components/Toast";
import { ArrowLeft, FileCheck, Loader2 } from "lucide-react";

export default function JavaMockExam() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateMockExam(Number(id));
      // Navigate to QuizPractice with mock exam sections
      const allQuestions = data.sections.flatMap((s: any) =>
        s.questions.map((q: any) => ({ ...q, _section_type: s.type, _section_label: s.label }))
      );
      navigate(`/quiz/${data.session_id}`, {
        state: {
          questions: allQuestions,
          mockExam: true,
          subjectId: Number(id),
          sections: data.sections,
          totalQuestions: data.total_questions,
        },
      });
    } catch (e: any) {
      toast.error(e.message || "生成模拟考试失败");
      setLoading(false);
    }
  };

  return (
    <div>
      <Link
        to={`/subject/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-6"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft className="w-3 h-3" /> /subject
      </Link>

      <div className="mb-10">
        <p className="section-overline mb-2">Mock Exam</p>
        <h1 className="text-display" style={{ color: "var(--text)" }}>
          模拟考试
        </h1>
        <p className="text-caption mt-3">
          参照期末试卷格式组卷，共5大题60小题，建议用时120分钟
        </p>
      </div>

      <div className="card mb-10" style={{ padding: "var(--s-8)" }}>
        <h2 className="text-headline mb-6" style={{ color: "var(--text)" }}>
          试卷结构
        </h2>

        <div className="space-y-3 mb-8">
          {[
            { type: "choice", label: "一、选择题", count: 20, desc: "基本概念考察，涉及所有章节" },
            { type: "fill", label: "二、填空题", count: 17, desc: "关键术语和核心概念" },
            { type: "essay", label: "三、简答题", count: 10, desc: "概念解释和简要说明" },
            { type: "code_reading", label: "四、程序阅读题", count: 8, desc: "阅读代码写出运行结果" },
            { type: "code_design", label: "五、程序设计题", count: 5, desc: "编写完整程序" },
          ].map((s) => (
            <div
              key={s.type}
              className="flex items-center justify-between px-5 py-4 rounded-lg"
              style={{ background: "var(--bg-raised)" }}
            >
              <div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--text)" }}>
                  {s.label}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.desc}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="stat-number text-2xl" style={{ color: "var(--accent)" }}>
                  {s.count}
                </span>
                <span className="mono-label" style={{ color: "var(--text-muted)" }}>
                  道
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          className="flex items-center justify-between px-5 py-4 rounded-lg mb-8"
          style={{
            background: "var(--accent-muted)",
            border: "1px solid var(--border-accent)",
          }}
        >
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              合计
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              建议用时 120 分钟 · 每题提交后即时批改
            </div>
          </div>
          <div className="stat-number text-3xl" style={{ color: "var(--accent)" }}>
            60
          </div>
        </div>

        <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> 正在组卷...
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" /> 开始模拟考试
            </>
          )}
        </button>

        <p className="text-xs mt-3 text-center" style={{ color: "var(--text-muted)" }}>
          题目从题库中随机抽取，若某题型题量不足将等比降低
        </p>
      </div>
    </div>
  );
}
