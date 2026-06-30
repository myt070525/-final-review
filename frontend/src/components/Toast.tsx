import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; type: ToastType; message: string; }

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used inside ToastProvider");
  return c;
}

let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, type, message }]);
    // 自动消失，错误信息稍长一些
    setTimeout(() => remove(id), type === "error" ? 5000 : 3000);
  }, [remove]);

  const api: ToastCtx = {
    toast,
    success: (m) => toast(m, "success"),
    error: (m) => toast(m, "error"),
    info: (m) => toast(m, "info"),
  };

  const config = {
    success: { icon: CheckCircle2, color: "var(--success)", bg: "var(--success-muted)" },
    error:   { icon: AlertCircle,  color: "var(--error)",   bg: "var(--error-muted)" },
    info:    { icon: Info,         color: "var(--accent)",  bg: "var(--accent-muted)" },
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {/* Toast 容器：右上角，避开 sticky header */}
      <div style={{
        position: "fixed", top: 64, right: 16, zIndex: 100,
        display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none",
        maxWidth: "calc(100vw - 32px)",
      }}>
        {toasts.map((t) => {
          const c = config[t.type];
          const Icon = c.icon;
          return (
            <div key={t.id} style={{
              pointerEvents: "auto",
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 14px",
              background: "var(--bg-card)",
              border: `1px solid var(--border)`,
              borderLeft: `3px solid ${c.color}`,
              borderRadius: "var(--r-md)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              animation: "toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both",
              minWidth: 260, maxWidth: 380,
            }}>
              <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: c.color }} />
              <p className="text-sm flex-1" style={{ color: "var(--text)", lineHeight: 1.5 }}>{t.message}</p>
              <button onClick={() => remove(t.id)}
                className="shrink-0 p-0.5 rounded transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
