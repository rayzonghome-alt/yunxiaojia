import { useState } from "react";

const API_KEY = "sk-lxhffloiragxtzxkdzaydvcqisoxsdigkytppduvmpxntzbj";
const FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/86d4f6cb-1eb8-455d-a656-4b036fb1217f";
const API_URL = "https://api.siliconflow.cn/v1/chat/completions";

async function sendLog(form, dims, topic, script) {
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  
  const content = [
    `🕐 时间：${timeStr}`,
    `👤 账号类型：${form.accountType}`,
    `🌿 触发源：${form.triggerType}`,
    `👨‍🌾 目标人群：${form.audience}`,
    `🎯 经营目的：${form.purpose}`,
    `📝 具体内容：${form.content}`,
    `📍 本地信息：${form.localInfo}`,
    `💡 选题：${topic}`,
    `✍️ 文案：\n${script}`,
  ].join("\n");

  try {
    await fetch(FEISHU_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_type: "text",
        content: { text: content }
      }),
    });
  } catch (e) {
    console.log("日志发送失败", e);
  }
}
async function callAI(prompt) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-ai/DeepSeek-V3",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    }),
  });
  if (!res.ok) throw new Error(`请求失败 ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function deriveAllDims(form) {
  const { accountType, triggerType, audience, purpose } = form;
  const expressionMap = {
    "农事节点|流量获取": ["农技干货讲解", "情绪共鸣表达"],
    "农事节点|信任建立": ["田间实拍教学", "客户案例记录"],
    "农事节点|成交转化": ["产品方案演示", "数据对比展示"],
    "农事节点|关系维护": ["提醒口播", "农技干货讲解"],
    "门店经营|流量获取": ["⚠️ 不推荐", "段子演绎"],
    "门店经营|信任建立": ["客户案例记录", "门店实力展示"],
    "门店经营|成交转化": ["产品方案演示", "客户案例记录"],
    "门店经营|关系维护": ["客户案例记录", "提醒口播"],
    "用户情绪|流量获取": ["情绪共鸣表达", "段子演绎"],
    "用户情绪|信任建立": ["客户案例记录", "情绪共鸣表达"],
    "用户情绪|成交转化": ["情绪共鸣+方案承接", "产品方案演示"],
    "用户情绪|关系维护": ["情绪共鸣表达", "提醒口播"],
  };
  const triggerKey = triggerType === "农事周期节点" ? "农事节点" : triggerType === "门店经营事件" ? "门店经营" : "用户情绪";
  const exKey = `${triggerKey}|${purpose}`;
  const expression = expressionMap[exKey] || ["农技干货讲解", "情绪共鸣表达"];
  let duration = "60秒以内";
  if (purpose === "信任建立") duration = "90秒故事型";
  if (accountType === "店长个人账号" && duration === "60秒以内") duration = "90秒故事型";
  if (accountType === "职人账号") duration = "3分钟讲透型";
  const ctaMap = { "流量获取": "评论互动 / 点赞 / 收藏 / 转发", "信任建立": "私信咨询 / 收藏备用", "成交转化": "到店 / 下单 / 私信咨询", "关系维护": "进群 / 加微信 / 关注账号" };
  const ctaStrength = purpose === "成交转化" ? "直接表达" : "软化表达";
  const moodMap = { "农事节点|流量获取": "焦虑预警", "农事节点|信任建立": "专业陪伴", "农事节点|成交转化": "价值感知", "农事节点|关系维护": "专业陪伴", "门店经营|信任建立": "信任背书", "门店经营|成交转化": "价值感知", "门店经营|关系维护": "情绪陪伴", "用户情绪|流量获取": "情绪共鸣", "用户情绪|信任建立": "情绪共鸣", "用户情绪|成交转化": "情绪共鸣+价值感知", "用户情绪|关系维护": "情绪陪伴" };
  let example = "假设情境";
  if (purpose === "信任建立" || purpose === "关系维护") example = "真实人物";
  if (purpose === "成交转化") example = "数据对比";
  if (audience === "大户") example = "数据对比";
  if (audience === "零散老农") example = "真实人物";
  let density = "低密度（一个观点打透）";
  if (purpose === "信任建立") density = "中密度（有过程有细节）";
  if (audience === "大户") density = "中高密度";
  if (audience === "零散老农") density = "低密度（越简单越好）";
  const localMap = { "大户": "中等", "中小户": "强", "零散老农": "最强" };
  const isWarning = triggerType === "门店经营事件" && purpose === "流量获取";
  return { expression, duration, ctaDirection: ctaMap[purpose] || "", ctaStrength, mood: moodMap[exKey] || "情绪共鸣", example, density, localStrength: localMap[audience] || "强", isWarning };
}

function buildPrompt(form, dims, step, selectedTopic, script) {
  const base = `你是农资门店短视频文案专家。\n【参数】账号:${form.accountType} 触发源:${form.triggerType} 人群:${form.audience} 目的:${form.purpose}\n具体内容:${form.content}\n本地信息:${form.localInfo}\n语感:${form.voice || "朴实口语"}\n【维度】表达:${dims.expression[0]} 时长:${dims.duration} CTA:${dims.ctaDirection}(${dims.ctaStrength}) 情绪:${dims.mood} 举例:${dims.example} 密度:${dims.density} 本地化:${dims.localStrength}`;
  if (step === "topics") return base + `\n\n生成2个选题，方案一用「${dims.expression[0]}」，方案二用「${dims.expression[1]}」。严格只返回JSON数组，不加任何说明：\n[{"title":"标题一","style":"${dims.expression[0]}","angle":"角度一句话"},{"title":"标题二","style":"${dims.expression[1]}","angle":"角度一句话"}]`;
  if (step === "script") return base + `\n\n选题：${selectedTopic}\n写完整口播文案，全程口语，植入本地信息，数据用「xx」占位，真实人物用「x老板」占位，按格式输出：\n【开头钩子】\n内容\n\n【正文】\n内容\n\n【结尾CTA】\n内容\n\n📌占位符提示：说明需要用户替换的内容`;
  if (step === "storyboard") return `你是短视频分镜头脚本专家。将以下文案拆分为5-8个分镜头。\n\n文案：\n${script}\n\n严格只返回JSON数组，不加任何说明文字：\n[{"shot":"镜次1","scene":"画面描述","voiceover":"口播内容","duration":"xx秒"}]\n\n然后另起一行输出：TIPS:提示1|提示2|提示3`;
}

function parseStoryboard(raw) {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*?\]/);
    const tipsMatch = raw.match(/TIPS:(.*)/);
    const shots = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const tips = tipsMatch ? tipsMatch[1].split("|").map(t => t.trim()) : [];
    return { shots, tips };
  } catch { return { shots: [], tips: [], raw }; }
}

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
  amber: "#c17f2a",
  amberLight: "#fef3e2",
  amberBorder: "#f0c070",
  green: "#4a7c3f",
  greenLight: "#e8f0e5",
  red: "#c0392b",
  shadow: "0 2px 12px rgba(74,124,63,0.08)",
  shadowHover: "0 4px 20px rgba(74,124,63,0.15)",
};

const STEP_ICONS = ["📋","🔍","💡","✍️","🎬"];
const STEP_NAMES = ["填写参数","确认维度","选择选题","生成文案","分镜脚本"];

function StepBar({ current }) {
  return (
    <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "16px 24px", marginBottom: 0 }}>
      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center" }}>
        {STEP_NAMES.map((name, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEP_NAMES.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: i < current ? T.primary : i === current ? T.primary : T.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: i <= current ? 16 : 13, fontWeight: 700,
                color: i <= current ? "#fff" : T.textLight,
                boxShadow: i === current ? `0 0 0 4px ${T.primaryLight}` : "none",
                transition: "all 0.3s",
              }}>
                {i < current ? "✓" : STEP_ICONS[i]}
              </div>
              <span style={{ fontSize: 11, color: i === current ? T.primary : T.textLight, whiteSpace: "nowrap", fontWeight: i === current ? 600 : 400 }}>{name}</span>
            </div>
            {i < STEP_NAMES.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 6px 16px", background: i < current ? T.primary : T.border, borderRadius: 2, transition: "all 0.3s" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children, hint }) {
  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: "24px", marginBottom: 16, boxShadow: T.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hint ? 4 : 16 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</span>
      </div>
      {hint && <p style={{ fontSize: 12, color: T.textLight, margin: "0 0 16px", paddingLeft: 32 }}>{hint}</p>}
      {children}
    </div>
  );
}

function OptionBtn({ label, sub, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 80, padding: "12px 8px", borderRadius: 10,
      border: `2px solid ${selected ? T.primary : T.border}`,
      background: selected ? T.primaryLight : T.card,
      color: selected ? T.primaryDark : T.textMid,
      cursor: "pointer", transition: "all 0.18s", textAlign: "center",
      boxShadow: selected ? T.shadowHover : "none",
    }}>
      <div style={{ fontSize: 13, fontWeight: selected ? 700 : 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: selected ? T.primary : T.textLight, marginTop: 2 }}>{sub}</div>}
    </button>
  );
}

function OptionGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map(opt => (
        <OptionBtn key={opt.label || opt} label={opt.label || opt} sub={opt.sub}
          selected={value === (opt.label || opt)} onClick={() => onChange(opt.label || opt)} />
      ))}
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 4, hint }) {
  return (
    <div>
      {hint && <p style={{ fontSize: 12, color: T.textLight, marginBottom: 8, lineHeight: 1.6 }}>{hint}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10,
          border: `1.5px solid ${T.border}`, background: "#fdfcf9",
          color: T.text, fontSize: 13, lineHeight: 1.7, resize: "vertical",
          outline: "none", fontFamily: "inherit", boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = T.primary}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}

function ContentGuides() {
  const guides = [
    { icon: "🌱", q: "现在是什么农事节点？附近农户在做什么？" },
    { icon: "🏪", q: "你作为店长，做了哪些准备或动作？" },
    { icon: "💡", q: "你最想让农户知道你们店的什么？" },
    { icon: "👨‍🌾", q: "农户现在心里在想什么、担心什么？" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
      {guides.map((g, i) => (
        <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: T.primaryLight, border: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 14 }}>{g.icon}</span>
          <p style={{ fontSize: 11, color: T.textMid, margin: "4px 0 0", lineHeight: 1.5 }}>{g.q}</p>
        </div>
      ))}
    </div>
  );
}

function DimTag({ label, value, isAdvanced }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12, color: T.textLight, minWidth: 80, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: isAdvanced ? T.textMid : T.primaryDark, fontWeight: 600, textAlign: "right", maxWidth: 320, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

const DIM_OPTIONS = {
  expression: ["农技干货讲解","田间实拍教学","客户案例记录","情绪共鸣表达","产品方案演示","数据对比展示","提醒口播","门店实力展示","段子演绎"],
  duration: ["60秒以内","90秒故事型","3分钟讲透型"],
  ctaDirection: ["评论互动 / 点赞 / 收藏 / 转发","私信咨询 / 收藏备用","到店 / 下单 / 私信咨询","进群 / 加微信 / 关注账号"],
  ctaStrength: ["软化表达","直接表达"],
  mood: ["焦虑预警","专业陪伴","价值感知","信任背书","情绪陪伴","情绪共鸣","情绪共鸣+价值感知"],
  example: ["假设情境","真实人物","数据对比"],
  density: ["低密度（一个观点打透）","中密度（有过程有细节）","中高密度","低密度（越简单越好）"],
  localStrength: ["中等","强","最强"],
};

function DimSelector({ label, value, options, onChange, isAdvanced }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: open ? 10 : 0 }}>
        <span style={{ fontSize: 12, color: T.textLight, minWidth: 80 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: isAdvanced ? T.textMid : T.primaryDark, fontWeight: 600 }}>{value}</span>
          <button onClick={() => setOpen(!open)} style={{
            padding: "3px 10px", borderRadius: 6,
            border: `1px solid ${T.border}`, background: open ? T.primaryLight : T.card,
            color: open ? T.primary : T.textLight, fontSize: 11, cursor: "pointer",
          }}>{open ? "收起" : "修改"}</button>
        </div>
      </div>
      {open && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, paddingLeft: 80 }}>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              border: `1px solid ${value === opt ? T.primary : T.border}`,
              background: value === opt ? T.primaryLight : T.card,
              color: value === opt ? T.primaryDark : T.textMid,
              fontWeight: value === opt ? 700 : 400,
            }}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Spinner({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ display: "inline-block", width: 36, height: 36, border: `3px solid ${T.primaryLight}`, borderTop: `3px solid ${T.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color: T.textLight, fontSize: 13, marginTop: 12 }}>{msg}</p>
    </div>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      style={{ padding: "6px 16px", borderRadius: 8, border: `1px solid ${ok ? T.primary : T.border}`, background: ok ? T.primaryLight : T.card, color: ok ? T.primary : T.textLight, fontSize: 12, cursor: "pointer", fontWeight: ok ? 600 : 400 }}>
      {ok ? "✓ 已复制" : "复制"}
    </button>
  );
}

function StoryboardTable({ shots, tips, raw }) {
  if (!shots || shots.length === 0) {
    return <div style={{ padding: 16, color: T.textMid, fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{raw}</div>;
  }
  return (
    <div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${T.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.primaryLight }}>
              {["镜次", "画面描述", "口播内容", "时长"].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: T.primaryDark, fontWeight: 700, fontSize: 12, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shots.map((s, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? T.card : "#fdfcf9", borderBottom: i < shots.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <td style={{ padding: "10px 14px", color: T.primary, fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", verticalAlign: "top" }}>{s.shot}</td>
                <td style={{ padding: "10px 14px", color: T.textMid, lineHeight: 1.6, verticalAlign: "top", minWidth: 120 }}>{s.scene}</td>
                <td style={{ padding: "10px 14px", color: T.text, lineHeight: 1.6, verticalAlign: "top", minWidth: 160 }}>{s.voiceover}</td>
                <td style={{ padding: "10px 14px", color: T.amber, whiteSpace: "nowrap", verticalAlign: "top", fontWeight: 600 }}>{s.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tips && tips.length > 0 && (
        <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: T.amberLight, border: `1px solid ${T.amberBorder}` }}>
          <p style={{ fontSize: 12, color: T.amber, fontWeight: 700, margin: "0 0 8px" }}>📌 拍摄提示</p>
          {tips.map((t, i) => <p key={i} style={{ fontSize: 12, color: T.textMid, lineHeight: 1.6, margin: "0 0 4px" }}>· {t}</p>)}
        </div>
      )}
    </div>
  );
}

const INIT = { accountType: "门店官方账号", triggerType: "农事周期节点", audience: "中小户", purpose: "流量获取", content: "", localInfo: "", voice: "" };

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INIT);
  const [dims, setDims] = useState(null);
  const [topics, setTopics] = useState([]);
  const [sel, setSel] = useState(0);
  const [script, setScript] = useState("");
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const go1 = () => {
    if (!form.content.trim() || !form.localInfo.trim()) { setErr("请填写「具体内容」和「本地信息」"); return; }
    setErr(""); setDims(deriveAllDims(form)); setStep(1);
  };
  const go2 = async () => {
    setLoading(true); setMsg("正在生成选题，请稍候..."); setErr("");
    try {
      const r = await callAI(buildPrompt(form, dims, "topics"));
      const clean = r.replace(/```json|```/g, "").trim();
      const start = clean.indexOf("["); const end = clean.lastIndexOf("]") + 1;
      const p = JSON.parse(clean.slice(start, end));
      setTopics(p); setSel(0); setStep(2);
    } catch (e) { setErr("生成失败：" + e.message); }
    setLoading(false);
  };
  const go3 = async () => {
    setLoading(true); setMsg("正在生成文案，请稍候..."); setErr("");
    try {
      const t = `《${topics[sel].title}》— ${topics[sel].style}`;
      const r = await callAI(buildPrompt(form, dims, "script", t));
      await sendLog(form, dims, `《${topics[sel].title}》— ${topics[sel].style}`, r);
      setScript(r); setStep(3);
    } catch (e) { setErr("生成失败：" + e.message); }
    setLoading(false);
  };
  const go4 = async () => {
    setLoading(true); setMsg("正在生成分镜头脚本，请稍候..."); setErr("");
    try {
      const r = await callAI(buildPrompt(form, dims, "storyboard", null, script));
      setBoardData(parseStoryboard(r)); setStep(4);
    } catch (e) { setErr("生成失败：" + e.message); }
    setLoading(false);
  };
  const reset = () => { setStep(0); setForm(INIT); setDims(null); setTopics([]); setSel(0); setScript(""); setBoardData(null); setErr(""); };

  const btnPrimary = { width: "100%", padding: "15px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(74,124,63,0.3)", letterSpacing: 0.5 };
  const btnSecondary = { padding: "12px 20px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.card, color: T.textMid, fontSize: 14, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif", color: T.text }}>

      {/* 顶部 Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})`, padding: "28px 24px 24px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", padding: "4px 14px", borderRadius: 20, marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>🌾</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", letterSpacing: 2, fontWeight: 600 }}>云小稼 · 农事文案助手</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 6px", letterSpacing: -0.5 }}>短视频文案生成系统</h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: 0 }}>填写参数 → AI推导维度 → 确认选题 → 生成文案 → 分镜脚本</p>
      </div>

      <StepBar current={step} />

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* STEP 0 */}
        {step === 0 && (
          <div>
            <SectionCard title="账号类型" icon="👤" hint="这条视频以谁的身份发出去？">
              <OptionGroup value={form.accountType} onChange={set("accountType")} options={[
                { label: "门店官方账号", sub: "品牌形象" },
                { label: "店长个人账号", sub: "真人出镜" },
                { label: "职人账号", sub: "农技员等" },
              ]} />
            </SectionCard>

            <SectionCard title="触发源类型" icon="🌿" hint="这条视频是因为什么事情才拍的？">
              <OptionGroup value={form.triggerType} onChange={set("triggerType")} options={[
                { label: "农事周期节点", sub: "播种/施肥/采收..." },
                { label: "门店经营事件", sub: "新品/活动/展示..." },
                { label: "用户情绪事件", sub: "焦虑/丰收/被坑..." },
              ]} />
            </SectionCard>

            <SectionCard title="目标人群" icon="👨‍🌾" hint="这条视频主要想让谁看到？">
              <OptionGroup value={form.audience} onChange={set("audience")} options={[
                { label: "大户", sub: "100亩以上" },
                { label: "中小户", sub: "10-100亩" },
                { label: "零散老农", sub: "10亩以下" },
              ]} />
            </SectionCard>

            <SectionCard title="经营目的" icon="🎯" hint="这条视频最想达到什么效果？">
              <OptionGroup value={form.purpose} onChange={set("purpose")} options={[
                { label: "流量获取", sub: "让陌生人看到我" },
                { label: "信任建立", sub: "让人觉得我靠谱" },
                { label: "成交转化", sub: "推动到店/下单" },
                { label: "关系维护", sub: "维护老客户" },
              ]} />
            </SectionCard>

            <SectionCard title="具体内容" icon="📝" hint="写你知道的就好，不需要每个都回答，越真实越详细越好">
              <ContentGuides />
              <TextArea value={form.content} onChange={set("content")} rows={6}
                placeholder="综合以上角度描述你的真实情况。例如：现在3月底了，多宝镇附近种豆角花生的农户都开始备肥了。我特意进了几款播种专用肥。我们店有张站长40年经验，帮农户算成本、配方案。我们明码标价，附近同行价格不透明..." />
            </SectionCard>

            <SectionCard title="本地信息" icon="📍" hint="地名 · 主要作物 · 本地农户称谓">
              <TextArea value={form.localInfo} onChange={set("localInfo")} rows={2}
                placeholder="例如：多宝镇 / 豆角 花生 玉米 / 老乡" />
            </SectionCard>

            <SectionCard title="语感提炼" icon="🗣️" hint="粘贴你过去写过的文案或喜欢的博主文案，AI会提炼风格。没有可以不填。">
              <TextArea value={form.voice} onChange={set("voice")} rows={3} placeholder="粘贴文案片段..." />
            </SectionCard>

            {err && <p style={{ color: T.red, fontSize: 12, textAlign: "center", marginBottom: 12 }}>{err}</p>}
            <button onClick={go1} style={{ ...btnPrimary, opacity: (!form.content.trim() || !form.localInfo.trim()) ? 0.5 : 1 }}>
              开始生成文案 →
            </button>
          </div>
        )}

        {/* STEP 1 */}
        {step===1&&dims&&(
  <div>
    {dims.isWarning&&(
      <div style={{padding:"16px 20px",borderRadius:12,marginBottom:16,background:T.amberLight,border:`1px solid ${T.amberBorder}`}}>
        <p style={{color:T.amber,fontSize:13,margin:"0 0 10px",lineHeight:1.7,fontWeight:600}}>⚠️ 组合建议</p>
        <p style={{color:T.textMid,fontSize:12,margin:"0 0 10px",lineHeight:1.7}}>「门店经营事件 + 流量获取」效果有限。门店内容天然是店家视角，陌生人缺乏观看动机。建议将经营目的改为：信任建立 / 成交转化 / 关系维护</p>
        <button onClick={()=>setStep(0)} style={{...btnSecondary,fontSize:12,padding:"6px 14px"}}>← 返回修改</button>
      </div>
    )}

    <SectionCard title="基础层" icon="📐" hint="可直接修改，点击任意维度右侧「修改」按钮">
      <DimSelector label="表达方式" value={dims.expression[0]}
        options={DIM_OPTIONS.expression}
        onChange={v => setDims(d => ({...d, expression:[v, d.expression[1]]}))}
        isAdvanced={false}/>
      <DimSelector label="时长节奏" value={dims.duration}
        options={DIM_OPTIONS.duration}
        onChange={v => setDims(d => ({...d, duration:v}))}
        isAdvanced={false}/>
    </SectionCard>

    <SectionCard title="进阶层" icon="⚙️" hint="AI已匹配最优参数，小白用户不建议修改">
      <DimSelector label="CTA方向" value={dims.ctaDirection}
        options={DIM_OPTIONS.ctaDirection}
        onChange={v => setDims(d => ({...d, ctaDirection:v}))}
        isAdvanced/>
      <DimSelector label="CTA强度" value={dims.ctaStrength}
        options={DIM_OPTIONS.ctaStrength}
        onChange={v => setDims(d => ({...d, ctaStrength:v}))}
        isAdvanced/>
      <DimSelector label="情绪底色" value={dims.mood}
        options={DIM_OPTIONS.mood}
        onChange={v => setDims(d => ({...d, mood:v}))}
        isAdvanced/>
      <DimSelector label="举例方式" value={dims.example}
        options={DIM_OPTIONS.example}
        onChange={v => setDims(d => ({...d, example:v}))}
        isAdvanced/>
      <DimSelector label="信息密度" value={dims.density}
        options={DIM_OPTIONS.density}
        onChange={v => setDims(d => ({...d, density:v}))}
        isAdvanced/>
      <DimSelector label="本地化强度" value={dims.localStrength}
        options={DIM_OPTIONS.localStrength}
        onChange={v => setDims(d => ({...d, localStrength:v}))}
        isAdvanced/>
      <DimTag label="开头钩子" value="AI自动匹配最优钩子" isAdvanced/>
    </SectionCard>

    {err&&<p style={{color:T.red,fontSize:12,textAlign:"center",marginBottom:12}}>{err}</p>}
    {loading?<Spinner msg={msg}/>:(
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setStep(0)} style={{...btnSecondary,flex:1}}>← 返回</button>
        <button onClick={go2} style={{...btnPrimary,flex:2}}>确认维度，生成选题 →</button>
      </div>
    )}
  </div>
)}

        {/* STEP 2 */}
        {step === 2 && topics.length > 0 && (
          <div>
            <SectionCard title="选择选题" icon="💡" hint="AI生成了2个方案，分别使用不同表达方式，选择你想继续的那个">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topics.map((t, i) => (
                  <div key={i} onClick={() => setSel(i)} style={{
                    padding: 20, borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${sel === i ? T.primary : T.border}`,
                    background: sel === i ? T.primaryLight : T.card,
                    transition: "all 0.2s", boxShadow: sel === i ? T.shadowHover : "none",
                  }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, border: `2px solid ${sel === i ? T.primary : T.border}`, background: sel === i ? T.primary : T.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: sel === i ? "#fff" : T.textLight, fontWeight: 700 }}>{sel === i ? "✓" : i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, color: T.text, fontWeight: 700, margin: "0 0 8px", lineHeight: 1.4 }}>《{t.title}》</p>
                        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, background: sel === i ? "#fff" : T.primaryLight, color: T.primary, fontWeight: 600 }}>{t.style}</span>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, background: "#f5f0e8", color: T.textMid }}>{t.angle}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
            {err && <p style={{ color: T.red, fontSize: 12, textAlign: "center", marginBottom: 12 }}>{err}</p>}
            {loading ? <Spinner msg={msg} /> : (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ ...btnSecondary, flex: 1 }}>← 返回</button>
                <button onClick={go3} style={{ ...btnPrimary, flex: 2 }}>生成文案 →</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && script && (
          <div>
            <SectionCard title="视频口播文案" icon="✍️">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <CopyBtn text={script} />
              </div>
              <div style={{ background: "#fdfcf9", borderRadius: 10, padding: "18px", color: T.textMid, fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap", border: `1px solid ${T.border}`, maxHeight: 420, overflowY: "auto" }}>{script}</div>
            </SectionCard>
            {err && <p style={{ color: T.red, fontSize: 12, textAlign: "center", marginBottom: 12 }}>{err}</p>}
            {loading ? <Spinner msg={msg} /> : (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(2)} style={{ ...btnSecondary, flex: 1 }}>← 返回</button>
                <button onClick={go4} style={{ ...btnPrimary, flex: 2 }}>生成分镜头脚本 →</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && boardData && (
          <div>
            <SectionCard title="视频口播文案" icon="✍️">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <CopyBtn text={script} />
              </div>
              <div style={{ background: "#fdfcf9", borderRadius: 10, padding: "18px", color: T.textMid, fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap", border: `1px solid ${T.border}`, maxHeight: 280, overflowY: "auto" }}>{script}</div>
            </SectionCard>
            <SectionCard title="分镜头脚本" icon="🎬">
              <StoryboardTable shots={boardData.shots} tips={boardData.tips} raw={boardData.raw} />
            </SectionCard>
            <button onClick={reset} style={{ ...btnSecondary, width: "100%", textAlign: "center", padding: "14px", fontSize: 14 }}>+ 生成新的文案</button>
          </div>
        )}

      </div>
    </div>
  );
}