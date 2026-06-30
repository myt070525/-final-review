import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, History, AlertTriangle, Star, Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const navItems = [
  { to: "/", label: "学科", icon: BookOpen },
  { to: "/bookmarks", label: "收藏", icon: Star },
  { to: "/history", label: "历史", icon: History },
  { to: "/wrong-questions", label: "错题本", icon: AlertTriangle },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const el = mainRef.current; if (!el) return;
    el.classList.remove("page-enter"); void el.offsetWidth; el.classList.add("page-enter");
  }, [location.pathname]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header className="sticky top-0 z-50" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <div className="header-inner max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: "var(--accent-muted)" }}>
              <BookOpen className="w-4 h-4" style={{ color: "var(--accent)" }} />
            </div>
            <span className="font-display text-sm tracking-wide" style={{ color: "var(--text)" }}>期末复习</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
              return (
                <Link key={item.to} to={item.to}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium no-underline transition-colors"
                  style={{
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    background: isActive ? "var(--accent-muted)" : "transparent",
                  }}>
                  <item.icon className="w-4 h-4" /><span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)", background: "transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              title={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </nav>
        </div>
      </header>
      <main ref={mainRef} className="main-container page-enter relative z-10 max-w-6xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
