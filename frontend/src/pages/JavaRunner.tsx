import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { runJavaCode } from "../services/api";
import { useToast } from "../components/Toast";
import CodeEditor from "../components/CodeEditor";
import { Play, RotateCcw, ArrowLeft, Terminal, Loader2 } from "lucide-react";

const TEMPLATES = [
  {
    label: "Hello World",
    code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Java!");\n    }\n}\n',
  },
  {
    label: "循环示例",
    code: 'public class Main {\n    public static void main(String[] args) {\n        int sum = 0;\n        for (int i = 1; i <= 100; i++) {\n            sum += i;\n        }\n        System.out.println("1+2+...+100 = " + sum);\n    }\n}\n',
  },
  {
    label: "继承多态",
    code: 'class Animal {\n    public void speak() { System.out.println("..."); }\n}\n\nclass Dog extends Animal {\n    @Override\n    public void speak() { System.out.println("Woof!"); }\n}\n\nclass Cat extends Animal {\n    @Override\n    public void speak() { System.out.println("Meow!"); }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Animal[] animals = {new Dog(), new Cat(), new Animal()};\n        for (Animal a : animals) {\n            System.out.print(a.getClass().getSimpleName() + ": ");\n            a.speak();\n        }\n    }\n}\n',
  },
  {
    label: "异常处理",
    code: 'public class Main {\n    public static void main(String[] args) {\n        try {\n            int[] arr = {1, 2, 3};\n            System.out.println(arr[5]);\n        } catch (ArrayIndexOutOfBoundsException e) {\n            System.out.println("捕获: " + e.getClass().getSimpleName());\n        } finally {\n            System.out.println("finally块始终执行");\n        }\n    }\n}\n',
  },
  {
    label: "Comparable排序",
    code: 'import java.util.*;\n\nclass Student implements Comparable<Student> {\n    String name;\n    double score;\n    Student(String n, double s) { name = n; score = s; }\n    public int compareTo(Student o) {\n        return Double.compare(o.score, this.score);\n    }\n    public String toString() { return name + ": " + score; }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Student> list = new ArrayList<>();\n        list.add(new Student("Alice", 85));\n        list.add(new Student("Bob", 92));\n        list.add(new Student("Charlie", 78));\n        Collections.sort(list);\n        for (Student s : list) System.out.println(s);\n    }\n}\n',
  },
  {
    label: "接口实现",
    code: 'interface Flyable {\n    void fly();\n}\n\nclass Bird implements Flyable {\n    public void fly() { System.out.println("Bird is flying"); }\n}\n\nclass Airplane implements Flyable {\n    public void fly() { System.out.println("Airplane is flying"); }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Flyable[] things = {new Bird(), new Airplane()};\n        for (Flyable f : things) f.fly();\n    }\n}\n',
  },
];

export default function JavaRunner() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(0);

  const handleRun = useCallback(async () => {
    if (!code.trim()) return;
    setRunning(true);
    setOutput("");
    setError("");
    try {
      const result = await runJavaCode(code, stdin);
      setOutput(result.output || "");
      setError(result.error || "");
    } catch (e: any) {
      toast.error(e.message || "运行失败");
    } finally {
      setRunning(false);
    }
  }, [code, stdin, toast]);

  const handleTemplate = (index: number) => {
    setActiveTemplate(index);
    setCode(TEMPLATES[index].code);
    setOutput("");
    setError("");
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-overline mb-2">Code Runner</p>
          <h1 className="text-display" style={{ color: "var(--text)" }}>
            Java 代码运行器
          </h1>
        </div>
      </div>

      <div className="flex gap-6" style={{ minHeight: "70vh" }}>
        {/* 左侧模板列表 */}
        <div className="shrink-0" style={{ width: "200px" }}>
          <div
            className="card sticky space-y-1"
            style={{
              top: "var(--s-16)",
              padding: "var(--s-4)",
            }}
          >
            <p
              className="section-overline mb-3"
              style={{ paddingLeft: "var(--s-2)" }}
            >
              代码模板
            </p>
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => handleTemplate(i)}
                className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
                style={{
                  color: activeTemplate === i ? "var(--accent)" : "var(--text-secondary)",
                  background: activeTemplate === i ? "var(--accent-muted)" : "transparent",
                  fontWeight: activeTemplate === i ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 中间编辑区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="card flex-1 flex flex-col" style={{ padding: "0", overflow: "hidden" }}>
            {/* 工具栏 */}
            <div
              className="flex items-center justify-between shrink-0"
              style={{
                padding: "var(--s-3) var(--s-4)",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-raised)",
              }}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="mono-label">Main.java</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCode(TEMPLATES[activeTemplate].code);
                    setOutput("");
                    setError("");
                  }}
                  className="btn-ghost"
                  style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                >
                  <RotateCcw className="w-3 h-3" /> 重置
                </button>
                <button
                  onClick={handleRun}
                  disabled={running || !code.trim()}
                  className="btn-primary"
                  style={{ padding: "4px 14px", fontSize: "0.75rem" }}
                >
                  {running ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  运行
                </button>
              </div>
            </div>
            {/* 编辑器 */}
            <div className="flex-1" style={{ overflow: "hidden" }}>
              <CodeEditor value={code} onChange={setCode} />
            </div>
          </div>
        </div>

        {/* 右侧输出面板 */}
        <div className="shrink-0 flex flex-col" style={{ width: "320px", gap: "var(--s-4)" }}>
          {/* stdin */}
          <div className="card" style={{ padding: "var(--s-4)" }}>
            <p className="section-overline mb-2">标准输入 (stdin)</p>
            <textarea
              className="input-base w-full"
              rows={3}
              style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", resize: "vertical" }}
              placeholder="输入参数，每行一个..."
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
            />
          </div>

          {/* 输出 */}
          <div
            className="card flex-1 flex flex-col"
            style={{ padding: "var(--s-4)", minHeight: "200px" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="section-overline">输出</p>
              {running && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
                  <Loader2 className="w-3 h-3 animate-spin" /> 运行中...
                </span>
              )}
            </div>
            <pre
              className="flex-1 text-xs overflow-auto"
              style={{
                fontFamily: "var(--font-mono)",
                color: output ? "var(--success)" : "var(--text-muted)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                margin: 0,
              }}
            >
              {output || "点击「运行」查看代码输出"}
            </pre>
            {error && (
              <>
                <p className="section-overline mt-3 mb-1" style={{ color: "var(--error)" }}>
                  错误
                </p>
                <pre
                  className="text-xs overflow-auto"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--error)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: 0,
                  }}
                >
                  {error}
                </pre>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
