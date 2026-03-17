import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const PASSWORD = "yunxiaojia2026";

const T = {
  bg: "#faf8f3",
  card: "#ffffff",
  border: "#e8e0d0",
  primary: "#4a7c3f",
  primaryLight: "#e8f0e5",
  primaryDark: "#2d5a24",
  text: "#2c2416",
  textMid: "#6b5c45",
  textLight: "#9e8c78",
  red: "#c0392b",
  shadow: "0 2px 12px rgba(74,124,63,0.08)",
};

function LoginPage({ onSuccess }) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);

  const handleLogin = () => {
    if (input === PASSWORD) {
      onSuccess();
    } else {
      setErr("密码错误，请重试");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      fontFamily: "'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
        .shake { animation: shake 0.5s ease; }
      `}</style>

      {/* Logo区域 */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, margin: "0 auto 16px",
          boxShadow: "0 8px 24px rgba(74,124,63,0.3)",
        }}>🌾</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: T.text, margin: "0 0 6px" }}>云小稼 · 农事文案助手</h1>
        <p style={{ fontSize: 13, color: T.textLight, margin: 0 }}>短视频文案生成系统</p>
      </div>

      {/* 登录卡片 */}
      <div className={shake ? "shake" : ""} style={{
        width: "100%", maxWidth: 360,
        background: T.card, borderRadius: 20,
        border: `1px solid ${T.border}`,
        padding: "32px 28px",
        boxShadow: T.shadow,
      }}>
        <p style={{ fontSize: 14, color: T.textMid, textAlign: "center", marginBottom: 24 }}>
          请输入访问密码
        </p>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setErr(""); }}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="输入密码..."
          style={{
            width: "100%", padding: "13px 16px", borderRadius: 10,
            border: `1.5px solid ${err ? T.red : T.border}`,
            background: "#fdfcf9", color: T.text, fontSize: 15,
            outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            marginBottom: 8, transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = T.primary}
          onBlur={e => e.target.style.borderColor = err ? T.red : T.border}
          autoFocus
        />
        {err && <p style={{ color: T.red, fontSize: 12, margin: "0 0 12px", textAlign: "center" }}>{err}</p>}
        {!err && <div style={{ height: 20 }} />}
        <button onClick={handleLogin} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
          color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(74,124,63,0.3)", letterSpacing: 0.5,
        }}>进入系统</button>
      </div>

      <p style={{ fontSize: 11, color: T.textLight, marginTop: 32, textAlign: "center" }}>
        仅限内部使用 · 云稼集团
      </p>
    </div>
  );
}

function Root() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) return <LoginPage onSuccess={() => setUnlocked(true)} />;
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);