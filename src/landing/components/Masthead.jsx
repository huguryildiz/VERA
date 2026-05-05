import { useNavigate } from "react-router-dom";
import { Sun, Moon, KeyRound, ArrowRight } from "lucide-react";
import { useTheme } from "@/shared/theme/ThemeProvider";
import logoDark from "@/assets/vera_logo_dark.png";
import logoWhite from "@/assets/vera_logo_white.png";

export default function Masthead() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <header className="ed-masthead">
      <div className="ed-masthead-inner">
        <div className="ed-brand">
          <img
            src={theme === "dark" ? logoDark : logoWhite}
            alt="VERA"
            className="ed-brand-logo"
          />
          <span className="ed-brand-sub">Visual Evaluation, Reporting &amp; Analytics</span>
        </div>

        <div className="ed-mast-actions">
          <button
            type="button"
            className="ed-theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />}
          </button>
          <button
            type="button"
            className="ed-mast-btn ed-mast-btn--code"
            onClick={() => navigate("/eval")}
          >
            <KeyRound size={13} strokeWidth={1.8} />
            Enter code
          </button>
          <button
            type="button"
            className="ed-mast-btn ed-mast-btn--signin"
            data-testid="admin-landing-signin"
            onClick={() => navigate("/login")}
          >
            Sign in
            <ArrowRight size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
