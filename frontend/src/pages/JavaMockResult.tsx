import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getMockExamResult } from "../services/api";
import { useToast } from "../components/Toast";
import LatexRenderer from "../components/LatexRenderer";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { ArrowLeft, Check, X, Award } from "lucide-react";

interface SectionStat {
  label: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface AnswerDetail {
  question_id: number;
  stem: string;
  options: string[] | null;
  answer: string;
  explanation: string;
  type: string;
  exam_type: string;
  selected_answer: string;
  is_correct: boolean;
}

interface MockResult {
  session_id: number;
  date: string;
  subject_name: string;
  total_questions: number;
  correct_count: number;
  time_seconds: number;
  overall_accuracy: number;
  section_stats: Record<string, SectionStat>;
  answers: AnswerDetail[];
}

const SECTION_ORDER = ["choice", "fill", "essay", "code_reading", "code_design"];

export default function JavaMockResult() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const toast = useToast();
  const [result, setResult] = useState<MockResult | null>(null);

  useEffect(() => {
    getMockExamResult(Number(sessionId))
      .then(setResult)
      .catch((e: any) => toast.error(e.message || "加载结果失败"));
  }, [sessionId, toast]);

  if (!result)
    return (
      <div className="flex items-center justify-center py-24">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );

  const clr =
    result.overall_accuracy >= 80
      ? "var(--success)"
      : result.overall_accuracy >= 60
      ? "var(--accent)"
      : "var(--error)";
  const label =
    result.overall_accuracy >= 80
      ? "Excellent"
      : result.overall_accuracy >= 60
      ? "Good"
      : "Keep Trying";

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/history"
        className="inline-flex items-center gap-1.5 text-xs font-mono no-underline mb-6"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft className="w-3 h-3" /> /history
      </Link>

      {/* 总分卡片 */}
      <div className="card text-center mb-10" style={{ padding: "var(--s-12)", borderColor: clr }}>
        <p className="section-overline mb-4" style={{ color: clr }}>
          {label}
        </p>
        <div className="stat-number text-8xl mb-3" style={{ color: clr }}>
          {result.overall_accuracy}
          <span className="text-3xl">%</span>
        </div>
        <p className="text-base mb-4" style={{ color: "var(--text-secondary)" }}>
          答对 {result.correct_count}/{result.total_questions} 题
        </p>
        <div className="flex items-center justify-center gap-6 text-xs">
          <span className="tag tag-accent">{result.subject_name} 模拟考</span>
          <span className="mono-label" style={{ color: "var(--text-muted)" }}>
            {new Date(result.date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* 分题型统计 */}
      {Object.keys(result.section_stats).length > 0 && (
        <div className="card mb-10" style={{ padding: "var(--s-6)" }}>
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <p className="section-overline" style={{ color: "var(--accent)" }}>
              分题型成绩
            </p>
          </div>
          <div className="space-y-3">
            {SECTION_ORDER.map((key) => {
              const s = result.section_stats[key];
              if (!s) return null;
              const sc =
                s.accuracy >= 80
                  ? "var(--success)"
                  : s.accuracy >= 60
                  ? "var(--accent)"
                  : "var(--error)";
              return (
                <div
                  key={key}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{ background: "var(--bg-raised)" }}
                >
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {s.correct}/{s.total}
                    </span>
                    <span
                      className="stat-number text-xl"
                      style={{ color: sc, minWidth: "3.5rem", textAlign: "right" }}
                    >
                      {s.accuracy}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 答题详情 */}
      <div className="mb-4">
        <p className="section-overline mb-1">Details</p>
        <h2 className="text-headline" style={{ color: "var(--text)" }}>
          答题详情
        </h2>
      </div>

      <div className="space-y-4">
        {result.answers.map((a, i) => (
          <div
            key={a.question_id}
            className="card"
            style={{
              padding: "var(--s-6)",
              borderLeft: `3px solid ${a.is_correct ? "var(--success)" : "var(--error)"}`,
            }}
          >
            <div className="flex items-start" style={{ gap: "var(--s-5)" }}>
              <div
                className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: a.is_correct ? "var(--success-muted)" : "var(--error-muted)",
                  color: a.is_correct ? "var(--success)" : "var(--error)",
                }}
              >
                {a.is_correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="mono-label" style={{ color: "var(--text-muted)" }}>
                    #{i + 1}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    你的:{" "}
                    <strong
                      style={{ color: a.is_correct ? "var(--success)" : "var(--error)" }}
                    >
                      {a.selected_answer || "未答"}
                    </strong>
                  </span>
                  {!a.is_correct && (
                    <span className="text-xs" style={{ color: "var(--success)" }}>
                      正确: <strong>{a.answer}</strong>
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text)" }}>
                  <LatexRenderer text={a.stem} />
                </p>
                {a.options && a.type !== "judge" && (
                  <div className="text-xs space-y-0.5" style={{ color: "var(--text-muted)" }}>
                    {(a.options as string[]).map((opt) => {
                      const l = opt.charAt(0).toUpperCase();
                      const inAnswer = a.type === "multi_choice"
                        ? a.answer.includes(l)
                        : l === a.answer;
                      const inSelected = a.type === "multi_choice"
                        ? a.selected_answer.includes(l)
                        : l === a.selected_answer;
                      let style: any = {};
                      if (inAnswer && inSelected) style.color = "var(--success)";
                      else if (inAnswer) style.color = "var(--success)";
                      else if (inSelected) {
                        style.color = "var(--error)";
                        style.textDecoration = "line-through";
                      }
                      return (
                        <div key={l} className="pl-2" style={style}>
                          <LatexRenderer text={opt} />
                        </div>
                      );
                    })}
                  </div>
                )}
                {a.explanation && (
                  <details className="mt-2">
                    <summary className="section-overline cursor-pointer" style={{ color: "var(--accent-text)" }}>
                      解析
                    </summary>
                    <div className="mt-2 p-4 rounded-lg" style={{ background: "var(--accent-muted)" }}>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        <MarkdownRenderer text={a.explanation} />
                      </p>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
