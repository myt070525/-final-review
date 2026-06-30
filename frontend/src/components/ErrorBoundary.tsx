import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "var(--error-muted)", border: "1px solid var(--border)" }}>
          <AlertTriangle className="w-8 h-8" style={{ color: "var(--error)" }} />
        </div>
        <p className="text-headline mb-2" style={{ color: "var(--text)" }}>页面出错了</p>
        <p className="text-caption mb-6" style={{ maxWidth: 420 }}>
          {this.state.error?.message || "渲染时发生未知错误"}
        </p>
        <div className="flex gap-3">
          <button onClick={this.handleReset} className="btn-primary">
            <RotateCcw className="w-4 h-4" /> 重试
          </button>
          <button onClick={() => window.location.href = "/"} className="btn-ghost">
            回到首页
          </button>
        </div>
      </div>
    );
  }
}
