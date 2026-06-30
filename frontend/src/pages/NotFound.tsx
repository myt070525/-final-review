import { Link } from "react-router-dom";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
        <Compass className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
      </div>
      <p className="stat-number text-7xl mb-3" style={{ color: "var(--text-muted)" }}>404</p>
      <p className="text-headline mb-2" style={{ color: "var(--text-secondary)" }}>找不到这个页面</p>
      <p className="text-caption mb-8">链接可能已过期或输错了</p>
      <Link to="/" className="btn-primary no-underline">
        <Home className="w-4 h-4" /> 回到首页
      </Link>
    </div>
  );
}
