import React, { useState, useEffect, useRef } from "react";

/* ============================================================
   EL SISTEMA — Tracker RPG (Solo Leveling / 8-bit)
   Misiones · Retos (semana/mes/año) · Calendario 2026 · Formas editables
   ============================================================ */

const C = {
  bg: "#05080f", panel: "rgba(10,22,40,0.72)", cyan: "#3fc9ff", cyanDim: "#1b6f99",
  glow: "rgba(63,201,255,0.55)", gold: "#ffcf4d", purple: "#b06bff", green: "#5cf08a",
  red: "#ff5d6c", text: "#dff1ff", textDim: "#7fa8c7", line: "rgba(63,201,255,0.35)",
};
const RANKS = [
  { min: 1, name: "E", color: "#9aa6b2", label: "RANGO E" },
  { min: 5, name: "D", color: C.green, label: "RANGO D" },
  { min: 10, name: "C", color: C.cyan, label: "RANGO C" },
  { min: 15, name: "B", color: C.purple, label: "RANGO B" },
  { min: 20, name: "A", color: C.gold, label: "RANGO A" },
  { min: 25, name: "S", color: "#ff7ad9", label: "RANGO S" },
];
const SKIN = "#f4c8a0", SKINSH = "#d79a72", GI = "#ef8a2b", GISH = "#c96f18", OUT = "#0b0d16", BLUE = "#2b4cff", BLUESH = "#1832b8";
const STAGES = [
  { min: 1, name: "NIÑO", hair: "#2a2a2e", hairShade: "#000", aura: "#ffb04d", particles: 0 },
  { min: 4, name: "GUERRERO", hair: "#1a1a22", hairShade: "#000", aura: "#6fd0ff", particles: 4 },
  { min: 8, name: "SÚPER GUERRERO", hair: "#ffd23b", hairShade: "#c98a12", aura: "#ffe14d", particles: 8 },
  { min: 12, name: "FASE ASCENDIDA", hair: "#ffdf3b", hairShade: "#cf8f12", aura: "#fff07a", particles: 10, lightning: true },
  { min: 16, name: "FASE 3", hair: "#ffe14d", hairShade: "#cf8f12", aura: "#fff6b0", particles: 12, lightning: true, longHair: true },
  { min: 22, name: "FASE DIVINA", hair: "#2aa8ff", hairShade: "#1466b0", aura: "#4fd2ff", particles: 12, lightning: true },
  { min: 30, name: "INSTINTO SUPERIOR", hair: "#e6f0f7", hairShade: "#9fc4dd", aura: "#cfe9ff", particles: 14, lightning: true },
];
const stageIndexFor = (lvl, stages) => { let i = 0; stages.forEach((s, j) => { if (lvl >= s.min) i = j; }); return i; };
function ensureStages(d) { const sd = d.stages || []; return STAGES.map((s, i) => ({ name: sd[i]?.name ?? s.name, min: sd[i]?.min ?? s.min, img: sd[i]?.img || null })); }
function effStages(d) { const sd = d.stages || []; return STAGES.map((s, i) => ({ ...s, name: sd[i]?.name ?? s.name, min: sd[i]?.min ?? s.min, img: sd[i]?.img || null })); }

const DIFF = {
  E: { label: "FÁCIL", exp: 15, color: C.green },
  D: { label: "NORMAL", exp: 30, color: C.cyan },
  C: { label: "DIFÍCIL", exp: 50, color: C.purple },
  B: { label: "ÉLITE", exp: 80, color: C.gold },
};
const PERIODS = {
  week: { label: "SEMANAL", exp: 60, color: C.cyan },
  month: { label: "MENSUAL", exp: 150, color: C.purple },
  year: { label: "ANUAL", exp: 400, color: C.gold },
};
const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WD = ["L", "M", "X", "J", "V", "S", "D"];

const todayStr = () => toStr(new Date());
function toStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
const reqOf = (lvl, b, s) => b + lvl * s;
function levelInfoOf(t, b, s) { let level = 1, r = t; while (r >= reqOf(level, b, s)) { r -= reqOf(level, b, s); level++; } return { level, currentExp: r, neededExp: reqOf(level, b, s), progress: r / reqOf(level, b, s) } }
function expToReachOf(level, b, s) { let e = 0; for (let k = 1; k < level; k++) e += reqOf(k, b, s); return e; }
function rankFor(level) { let r = RANKS[0]; for (const rk of RANKS) if (level >= rk.min) r = rk; return r; }
function compSet(h) { const s = new Set(); h.forEach((x) => (x.done || []).forEach((d) => s.add(d))); return s; }
function doneCountOn(h, ds) { return h.filter((x) => (x.done || []).includes(ds)).length; }
function currentStreak(h) { const s = compSet(h); if (!s.size) return 0; let n = 0; const c = new Date(); if (!s.has(toStr(c))) c.setDate(c.getDate() - 1); while (s.has(toStr(c))) { n++; c.setDate(c.getDate() - 1); } return n; }
function longestStreak(h) { const a = [...compSet(h)].sort(); if (!a.length) return 0; let b = 1, run = 1; for (let i = 1; i < a.length; i++) { const p = new Date(a[i - 1]); p.setDate(p.getDate() + 1); run = toStr(p) === a[i] ? run + 1 : 1; b = Math.max(b, run); } return b; }
function totalExpOf(d) { return d.habits.reduce((s, h) => s + (h.done || []).length * h.exp, 0) + (d.bonusExp || 0); }
function isoWeek(d) { const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = (date.getUTCDay() + 6) % 7; date.setUTCDate(date.getUTCDate() - day + 3); const ft = new Date(Date.UTC(date.getUTCFullYear(), 0, 4)); const w = 1 + Math.round(((date - ft) / 864e5 - 3 + ((ft.getUTCDay() + 6) % 7)) / 7); return [date.getUTCFullYear(), w]; }
function periodKey(p, d = new Date()) { if (p === "week") { const [y, w] = isoWeek(d); return `${y}-W${String(w).padStart(2, "0")}`; } if (p === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; return `${d.getFullYear()}`; }

function fileToDataURL(file, max = 240) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => { const img = new Image(); img.onload = () => { const sc = Math.min(1, max / Math.max(img.width, img.height)); const w = Math.round(img.width * sc), h = Math.round(img.height * sc); const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(img, 0, 0, w, h); res(cv.toDataURL("image/png")); }; img.onerror = rej; img.src = reader.result; };
    reader.onerror = rej; reader.readAsDataURL(file);
  });
}

/* ---- AUDIO ---- */
let _ctx = null;
function ac() { try { if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)(); if (_ctx.state === "suspended") _ctx.resume(); return _ctx; } catch (e) { return null; } }
function tone(f, s, d, t = "square", v = 0.16) { const c = ac(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; o.connect(g); g.connect(c.destination); const tt = c.currentTime + s; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(v, tt + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, tt + d); o.start(tt); o.stop(tt + d + 0.05); }
const sfx = {
  blip() { tone(880, 0, 0.07, "square", 0.16); tone(1318, 0.06, 0.12, "square", 0.14); },
  jingle() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.1, "square", 0.15)); tone(1047, 0.3, 0.22, "square", 0.17); tone(1568, 0.3, 0.26, "triangle", 0.07); },
  fanfare() { [[392, 0, 0.11], [392, 0.13, 0.11], [523, 0.26, 0.11], [659, 0.39, 0.11], [784, 0.52, 0.3], [698, 0.86, 0.11], [880, 0.99, 0.11], [1047, 1.12, 0.5]].forEach(([f, s, d]) => tone(f, s, d, "sawtooth", 0.12)); tone(523, 0.52, 0.3, "square", 0.08); tone(659, 0.52, 0.3, "square", 0.08); tone(784, 1.12, 0.5, "square", 0.08); tone(659, 1.12, 0.5, "square", 0.07); tone(131, 0, 0.5, "triangle", 0.12); tone(98, 0.52, 0.34, "triangle", 0.12); tone(131, 1.12, 0.5, "triangle", 0.12); tone(2093, 1.12, 0.45, "triangle", 0.06); },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
@keyframes grid{0%{background-position:0 0}100%{background-position:46px 46px}}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 10px rgba(63,201,255,.55),inset 0 0 14px rgba(63,201,255,.1)}50%{box-shadow:0 0 22px rgba(63,201,255,.55),inset 0 0 22px rgba(63,201,255,.18)}}
@keyframes floatUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-46px);opacity:0}}
@keyframes lvlBurst{0%{transform:scale(.5);opacity:0}30%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes flicker{0%,100%{opacity:1}50%{opacity:.86}}
@keyframes shimmer{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
@keyframes appear{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
@keyframes auraPulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.14);opacity:.85}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes rise{0%{transform:translateY(6px) scale(1);opacity:0}20%{opacity:1}100%{transform:translateY(-46px) scale(.4);opacity:0}}
@keyframes bolt{0%,100%{opacity:0}45%{opacity:0}50%{opacity:1}60%{opacity:.3}70%{opacity:1}80%{opacity:0}}
*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
`;
const pxFont = { fontFamily: "'Press Start 2P', monospace" };
const bdyFont = { fontFamily: "'VT323', monospace" };

function Corners({ color = C.cyan }) {
  const b = { position: "absolute", width: 12, height: 12, borderColor: color, pointerEvents: "none" };
  return (<><span style={{ ...b, top: -1, left: -1, borderTop: "2px solid", borderLeft: "2px solid" }} /><span style={{ ...b, top: -1, right: -1, borderTop: "2px solid", borderRight: "2px solid" }} /><span style={{ ...b, bottom: -1, left: -1, borderBottom: "2px solid", borderLeft: "2px solid" }} /><span style={{ ...b, bottom: -1, right: -1, borderBottom: "2px solid", borderRight: "2px solid" }} /></>);
}
function Panel({ children, style, accent = C.cyan, pulse, onClick }) {
  return (<div onClick={onClick} style={{ position: "relative", background: C.panel, border: `1px solid ${accent}55`, boxShadow: `0 0 12px ${accent}33,inset 0 0 16px rgba(0,0,0,.4)`, backdropFilter: "blur(2px)", animation: pulse ? "pulseGlow 3.5s ease-in-out infinite" : undefined, ...style }}><Corners color={accent} />{children}</div>);
}
function ExpBar({ progress, color = C.cyan, height = 16 }) {
  const p = Math.max(0, Math.min(1, progress));
  return (<div style={{ position: "relative", height, background: "rgba(0,0,0,.55)", border: `1px solid ${color}66`, overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, width: `${p * 100}%`, background: `linear-gradient(90deg,${color}aa,${color})`, boxShadow: `0 0 10px ${color}`, transition: "width .5s cubic-bezier(.2,.9,.2,1)" }}><div style={{ position: "absolute", top: 0, bottom: 0, width: "40%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)", animation: "shimmer 2.4s linear infinite" }} /></div>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg,transparent 0,transparent 9px,rgba(0,0,0,.55) 9px,rgba(0,0,0,.55) 11px)", pointerEvents: "none" }} />
  </div>);
}
function RankBadge({ rank, size = 54 }) {
  return (<div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${rank.color}`, color: rank.color, background: `radial-gradient(circle at 50% 35%,${rank.color}22,rgba(0,0,0,.4))`, boxShadow: `0 0 14px ${rank.color}66,inset 0 0 10px ${rank.color}33`, ...pxFont, fontSize: size * 0.42, textShadow: `0 0 8px ${rank.color}`, position: "relative" }}><Corners color={rank.color} />{rank.name}</div>);
}

/* ---- SPRITE GUERRERO (arte original mejorado) ---- */
function WarriorSprite({ stage, w }) {
  const hi = "rgba(255,255,255,0.28)";
  return (
    <svg viewBox="0 0 120 152" width={w} height={w * 1.27} style={{ shapeRendering: "geometricPrecision" }}>
      <g stroke={OUT} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
        {/* melena trasera (fase larga) */}
        {stage.longHair && <polygon points="40,52 16,98 30,124 46,80" fill={stage.hair} />}
        {stage.longHair && <polygon points="80,52 104,98 90,124 74,80" fill={stage.hair} />}
        {/* piernas */}
        <path d="M47 116 L46 138 L59 138 L59 116 Z" fill={GI} />
        <path d="M61 116 L61 138 L74 138 L73 116 Z" fill={GI} />
        {/* botas */}
        <rect x="43" y="135" width="17" height="14" rx="2" fill={BLUE} />
        <rect x="60" y="135" width="17" height="14" rx="2" fill={BLUE} />
        {/* brazos: manga + antebrazo + puño */}
        <path d="M40 80 L27 84 L30 104 L41 102 Z" fill={GI} />
        <path d="M80 80 L93 84 L90 104 L79 102 Z" fill={GI} />
        <rect x="27" y="100" width="13" height="16" rx="3" fill={SKIN} />
        <rect x="80" y="100" width="13" height="16" rx="3" fill={SKIN} />
        <circle cx="33" cy="120" r="8" fill={SKIN} />
        <circle cx="87" cy="120" r="8" fill={SKIN} />
        {/* torso gi */}
        <path d="M39 80 Q37 75 44 74 L76 74 Q83 75 81 80 L78 114 Q77 118 72 118 L48 118 Q43 118 42 114 Z" fill={GI} />
        {/* cuello + cabeza */}
        <rect x="52" y="65" width="16" height="12" fill={SKIN} />
        <ellipse cx="38" cy="48" rx="4" ry="6" fill={SKIN} />
        <ellipse cx="82" cy="48" rx="4" ry="6" fill={SKIN} />
        <ellipse cx="60" cy="46" rx="21" ry="23" fill={SKIN} />
      </g>
      {/* detalles sin trazo grueso */}
      {/* sombreado piel cara */}
      <path d="M60 60 Q74 64 78 50 Q74 70 60 70 Q46 70 42 50 Q46 64 60 60 Z" fill={SKINSH} opacity="0.35" />
      {/* undershirt azul (V) */}
      <path d="M50 74 L60 98 L70 74 Z" fill={BLUE} />
      {/* solapas gi cruzadas */}
      <path d="M40 80 L60 96 L57 74 L44 74 Z" fill={GI} stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
      <path d="M80 80 L60 96 L63 74 L76 74 Z" fill={GISH} stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
      {/* sombra torso */}
      <path d="M78 80 L75 114 Q74 118 72 118 L66 118 L72 80 Z" fill={GISH} opacity="0.5" />
      {/* cinturón + nudo */}
      <rect x="42" y="111" width="36" height="9" fill={BLUE} stroke={OUT} strokeWidth="2.4" />
      <rect x="55" y="109" width="11" height="13" fill={BLUESH} stroke={OUT} strokeWidth="2" />
      <rect x="54" y="120" width="4" height="8" fill={BLUE} stroke={OUT} strokeWidth="1.5" />
      <rect x="62" y="120" width="4" height="8" fill={BLUE} stroke={OUT} strokeWidth="1.5" />
      {/* muñequeras */}
      <rect x="26" y="113" width="14" height="5" fill={BLUE} stroke={OUT} strokeWidth="1.6" />
      <rect x="80" y="113" width="14" height="5" fill={BLUE} stroke={OUT} strokeWidth="1.6" />
      {/* trim botas */}
      <rect x="43" y="135" width="17" height="3.5" fill="#dfe9ff" />
      <rect x="60" y="135" width="17" height="3.5" fill="#dfe9ff" />
      {/* ojos */}
      <ellipse cx="51" cy="47" rx="5" ry="6" fill="#fff" />
      <ellipse cx="69" cy="47" rx="5" ry="6" fill="#fff" />
      <circle cx="52.5" cy="48" r="2.8" fill="#16242f" />
      <circle cx="67.5" cy="48" r="2.8" fill="#16242f" />
      <circle cx="53.6" cy="46.8" r="0.9" fill="#fff" />
      <circle cx="68.6" cy="46.8" r="0.9" fill="#fff" />
      {/* cejas determinadas */}
      <path d="M45 39 L57 43" stroke={stage.hairShade} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M75 39 L63 43" stroke={stage.hairShade} strokeWidth="3.4" strokeLinecap="round" />
      {/* nariz + boca */}
      <path d="M60 49 L58 55 L62 55 Z" fill={SKINSH} opacity="0.5" />
      <path d="M54 59 Q60 62 66 59" stroke="#9c5a44" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* pelo pincho (base + brillo) */}
      <polygon points="39,52 35,28 45,33 47,6 54,30 60,3 66,30 73,8 76,32 84,30 81,52 77,41 71,47 65,38 60,47 55,38 49,47 43,41"
        fill={stage.hair} stroke={OUT} strokeWidth="2.4" strokeLinejoin="round" />
      <polygon points="47,12 51,30 54,12" fill={hi} />
      <polygon points="58,9 62,30 66,12" fill={hi} />
      <polygon points="70,14 74,32 77,18" fill={hi} />
    </svg>
  );
}
function Avatar({ stage, size = 120, simple }) {
  const pc = simple ? 0 : stage.particles;
  const lightning = simple ? false : stage.lightning;
  const parts = Array.from({ length: pc }).map((_, i) => ({ left: 12 + (i * 76 / Math.max(1, pc)) + (i % 2 ? 5 : -3), delay: ((i * 0.31) % 2.1).toFixed(2), dur: (1.7 + (i % 3) * 0.4).toFixed(2), sz: 3 + (i % 3) }));
  return (
    <div style={{ position: "relative", width: size, height: size * 1.27, margin: "0 auto" }}>
      <div style={{ position: "absolute", left: "50%", top: "48%", width: size * 1.05, height: size * 1.18, transform: "translate(-50%,-50%)", borderRadius: "50%", background: `radial-gradient(circle,${stage.aura}cc 0%,${stage.aura}33 45%,transparent 70%)`, filter: "blur(2px)", animation: simple ? undefined : "auraPulse 2.4s ease-in-out infinite", opacity: simple ? 0.5 : 1, zIndex: 1 }} />
      <div style={{ position: "relative", zIndex: 2, animation: simple ? undefined : "bob 2.8s ease-in-out infinite", filter: `drop-shadow(0 0 6px ${stage.aura}aa)`, width: size, height: size * 1.27, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {stage.img
          ? <img src={stage.img} alt={stage.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", imageRendering: "auto" }} />
          : <WarriorSprite stage={stage} w={size} />}
      </div>
      {lightning && (<svg viewBox="0 0 100 120" width={size} height={size * 1.27} style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
        <polyline points="18,28 27,46 21,52 30,70" fill="none" stroke={stage.aura} strokeWidth="1.6" style={{ animation: "bolt 1.6s infinite", filter: `drop-shadow(0 0 3px ${stage.aura})` }} />
        <polyline points="82,26 73,44 79,50 70,66" fill="none" stroke={stage.aura} strokeWidth="1.6" style={{ animation: "bolt 1.6s infinite .5s", filter: `drop-shadow(0 0 3px ${stage.aura})` }} />
      </svg>)}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
        {parts.map((p, i) => <div key={i} style={{ position: "absolute", left: `${p.left}%`, bottom: "14%", width: p.sz, height: p.sz, borderRadius: "50%", background: stage.aura, boxShadow: `0 0 5px ${stage.aura}`, animation: `rise ${p.dur}s ease-out ${p.delay}s infinite` }} />)}
      </div>
    </div>
  );
}

const DEFAULT_DATA = {
  hunter: "CAZADOR", soundOn: true, bonusExp: 0, expBase: 80, expStep: 40, stages: null, achievements: [],
  habits: [
    { id: "h1", name: "Entrenar 30 min", diff: "D", exp: DIFF.D.exp, done: [] },
    { id: "h2", name: "Leer 20 páginas", diff: "E", exp: DIFF.E.exp, done: [] },
    { id: "h3", name: "Beber 2L de agua", diff: "E", exp: DIFF.E.exp, done: [] },
    { id: "h4", name: "Trabajo profundo 1h", diff: "C", exp: DIFF.C.exp, done: [] },
  ],
  challenges: [
    { id: "c1", name: "Entrenar 4 días", period: "week", current: 0, target: 4, unit: "días", exp: 60, periodKey: "", done: false },
    { id: "c2", name: "Leer 5 días esta semana", period: "week", current: 0, target: 5, unit: "días", exp: 60, periodKey: "", done: false },
    { id: "c3", name: "Entrenar 16 días este mes", period: "month", current: 0, target: 16, unit: "días", exp: 150, periodKey: "", done: false },
    { id: "c4", name: "Terminar 1 libro", period: "month", current: 0, target: 1, unit: "libro", exp: 150, periodKey: "", done: false },
    { id: "c5", name: "Leer 12 libros en 2026", period: "year", current: 0, target: 12, unit: "libros", exp: 400, periodKey: "", done: false },
    { id: "c6", name: "Correr 500 km en 2026", period: "year", current: 0, target: 500, unit: "km", exp: 400, periodKey: "", done: false },
  ],
};
function normalize(data) {
  let changed = false;
  const challenges = (data.challenges || []).map((c) => { const k = periodKey(c.period); if (c.periodKey !== k) { changed = true; return { ...c, current: 0, done: false, periodKey: k }; } return c; });
  return changed ? { ...data, challenges } : data;
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("quests");
  const [chPeriod, setChPeriod] = useState("week");
  const [calMonth, setCalMonth] = useState(() => (new Date().getFullYear() === 2026 ? new Date().getMonth() : 0));
  const [floats, setFloats] = useState([]);
  const [popup, setPopup] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formsEdit, setFormsEdit] = useState(false);
  const [adding, setAdding] = useState(null);
  const [draft, setDraft] = useState({ name: "", diff: "D", target: "", unit: "" });
  const [editingName, setEditingName] = useState(false);
  const prevLevel = useRef(null);
  const prevStage = useRef(null);
  const suppress = useRef(false);
  const fileInput = useRef(null);
  const pendingImg = useRef(null);
  const KEY = "el-sistema-save-v3";

  useEffect(() => {
    (async () => {
      try { const saved = localStorage.getItem(KEY); setData(normalize(saved ? { ...DEFAULT_DATA, ...JSON.parse(saved) } : DEFAULT_DATA)); }
      catch { setData(normalize(DEFAULT_DATA)); }
      setLoading(false);
    })();
  }, []);
  useEffect(() => { if (loading || !data) return; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }, [data, loading]);

  const base = data ? (data.expBase ?? 80) : 80;
  const step = data ? (data.expStep ?? 40) : 40;
  const stages = data ? effStages(data) : STAGES;
  const total = data ? totalExpOf(data) : 0;
  const info = levelInfoOf(total, base, step);
  const rank = rankFor(info.level);
  const stageIdx = stageIndexFor(info.level, stages);
  const stage = stages[stageIdx];
  const sound = data ? data.soundOn !== false : true;

  useEffect(() => {
    if (loading || !data) return;
    if (prevLevel.current === null) { prevLevel.current = info.level; prevStage.current = stageIdx; return; }
    if (suppress.current) { prevLevel.current = info.level; prevStage.current = stageIdx; suppress.current = false; return; }
    if (stageIdx > prevStage.current) { setPopup({ type: "transform", stage: stages[stageIdx] }); if (sound) sfx.fanfare(); const nm = stages[stageIdx].name; setData((d) => { const list = d.achievements || []; if (list.some((a) => a.date === todayStr() && a.kind === "transform" && a.name === nm)) return d; return { ...d, achievements: [...list, { date: todayStr(), kind: "transform", name: nm }] }; }); }
    else if (info.level > prevLevel.current) { setPopup({ type: "levelup", from: prevLevel.current, to: info.level, rank: rankFor(info.level) }); if (sound) sfx.jingle(); }
    prevLevel.current = info.level; prevStage.current = stageIdx;
  }, [info.level, stageIdx, loading]); // eslint-disable-line

  const pushFloat = (text, color) => { const id = Math.random().toString(36).slice(2); setFloats((f) => [...f, { id, text, color }]); setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100); };

  // edición de formas / curva
  const editStage = (i, patch) => { suppress.current = true; setData((d) => { const st = ensureStages(d); st[i] = { ...st[i], ...patch }; return { ...d, stages: st }; }); };
  const editStageMin = (i, val) => {
    suppress.current = true;
    setData((d) => { const st = ensureStages(d); let n = parseInt(val) || 1; if (i === 0) n = 1; else n = Math.max(st[i - 1].min + 1, n); st[i] = { ...st[i], min: n }; return { ...d, stages: st }; });
  };
  const setCurve = (patch) => { suppress.current = true; setData((d) => ({ ...d, ...patch })); };
  const pickImage = (i) => { pendingImg.current = i; fileInput.current && fileInput.current.click(); };
  const onFile = async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f || pendingImg.current === null) return; try { const url = await fileToDataURL(f); editStage(pendingImg.current, { img: url }); } catch (err) {} pendingImg.current = null; };

  if (loading || !data) return (<div style={{ ...bdyFont, background: C.bg, color: C.cyan, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><style>{CSS}</style><div style={{ ...pxFont, fontSize: 12, animation: "flicker 1s infinite" }}>CARGANDO EL SISTEMA...</div></div>);

  const today = todayStr();
  const doneToday = data.habits.filter((h) => (h.done || []).includes(today)).length;
  const allDone = data.habits.length > 0 && doneToday === data.habits.length;
  const streak = currentStreak(data.habits);

  const toggleHabit = (id) => {
    const h = data.habits.find((x) => x.id === id);
    const willComplete = !(h.done || []).includes(today);
    setData((d) => ({ ...d, habits: d.habits.map((x) => x.id !== id ? x : (x.done || []).includes(today) ? { ...x, done: x.done.filter((q) => q !== today) } : { ...x, done: [...(x.done || []), today] }) }));
    if (willComplete) { pushFloat(`+${h.exp} EXP`, C.gold); if (sound) sfx.blip(); }
  };
  const stepChallenge = (id, delta) => {
    let claimed = null;
    setData((d) => {
      const challenges = d.challenges.map((c) => { if (c.id !== id) return c; const current = Math.max(0, Math.min(c.target, c.current + delta)); const done = c.done || current >= c.target; if (!c.done && done) claimed = c; return { ...c, current, done }; });
      const bonusExp = (d.bonusExp || 0) + (claimed ? claimed.exp : 0);
      const achievements = claimed ? [...(d.achievements || []), { date: todayStr(), kind: claimed.period, name: claimed.name }] : (d.achievements || []);
      return { ...d, challenges, bonusExp, achievements };
    });
    if (claimed) { pushFloat(`RETO ${PERIODS[claimed.period].label} +${claimed.exp} EXP`, PERIODS[claimed.period].color); if (sound) sfx.fanfare(); setPopup({ type: "challenge", ch: claimed }); }
  };
  const deleteHabit = (id) => setData((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id) }));
  const deleteChallenge = (id) => setData((d) => ({ ...d, challenges: d.challenges.filter((c) => c.id !== id) }));
  const addQuest = () => { if (!draft.name.trim()) return; setData((d) => ({ ...d, habits: [...d.habits, { id: "h" + Date.now(), name: draft.name.trim(), diff: draft.diff, exp: DIFF[draft.diff].exp, done: [] }] })); setDraft({ name: "", diff: "D", target: "", unit: "" }); setAdding(null); };
  const addChallenge = () => { if (!draft.name.trim() || !draft.target) return; setData((d) => ({ ...d, challenges: [...d.challenges, { id: "c" + Date.now(), name: draft.name.trim(), period: chPeriod, current: 0, target: Math.max(1, parseInt(draft.target) || 1), unit: draft.unit.trim() || "ud", exp: PERIODS[chPeriod].exp, periodKey: periodKey(chPeriod), done: false }] })); setDraft({ name: "", diff: "D", target: "", unit: "" }); setAdding(null); };

  const lbl = { ...pxFont, fontSize: 9, letterSpacing: 1, color: C.textDim };
  const secTitle = { ...pxFont, fontSize: 11, color: C.cyan, textShadow: `0 0 8px ${C.glow}`, letterSpacing: 1 };
  const btnPx = { ...pxFont, fontSize: 9, padding: "10px 12px", background: "rgba(63,201,255,.08)", border: `1px solid ${C.cyan}66`, color: C.cyan, cursor: "pointer", letterSpacing: 1 };
  const inp = { ...bdyFont, fontSize: 20, width: "100%", padding: "8px 10px", background: "rgba(0,0,0,.5)", border: `1px solid ${C.cyan}55`, color: C.text, outline: "none" };

  const periodChallenges = data.challenges.filter((c) => c.period === chPeriod);
  const periodLabelNow = chPeriod === "week" ? `Semana ${isoWeek(new Date())[1]} · 2026` : chPeriod === "month" ? `${MONTHS_ES[new Date().getMonth()]} 2026` : "Año 2026";

  return (
    <div style={{ ...bdyFont, background: C.bg, minHeight: "100vh", color: C.text, position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <input ref={fileInput} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(63,201,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(63,201,255,.05) 1px,transparent 1px)", backgroundSize: "46px 46px", animation: "grid 9s linear infinite", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 50% 0%,rgba(63,201,255,.1),transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0,rgba(0,0,0,.16) 1px,transparent 2px,transparent 4px)", pointerEvents: "none", zIndex: 50 }} />

      <div style={{ position: "fixed", top: 110, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 60, pointerEvents: "none" }}>
        {floats.map((f) => <div key={f.id} style={{ ...pxFont, fontSize: 10, color: f.color, textShadow: `0 0 10px ${f.color}`, animation: "floatUp 1.1s ease-out forwards", textAlign: "center" }}>{f.text}</div>)}
      </div>

      <div style={{ position: "relative", zIndex: 10, maxWidth: 540, margin: "0 auto", padding: "0 14px 96px" }}>
        {/* STATUS STRIP */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, paddingTop: 12, paddingBottom: 8, background: "linear-gradient(180deg,#05080f 70%,transparent)" }}>
          <Panel pulse style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 44, flexShrink: 0 }}><Avatar stage={stage} size={44} simple /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ ...pxFont, fontSize: 9, color: C.text }}>NV {info.level} · <span style={{ color: stage.aura }}>{stage.name}</span></span>
                <span style={{ ...bdyFont, fontSize: 15, color: streak > 0 ? C.gold : C.textDim }}>🔥 {streak}</span>
              </div>
              <div style={{ marginTop: 5 }}><ExpBar progress={info.progress} height={12} /></div>
            </div>
            <button onClick={() => setData((d) => ({ ...d, soundOn: !sound }))} style={{ flexShrink: 0, background: "transparent", border: `1px solid ${C.cyan}44`, color: sound ? C.cyan : C.textDim, fontSize: 14, width: 32, height: 32, cursor: "pointer" }}>{sound ? "🔊" : "🔇"}</button>
          </Panel>
        </div>

        {/* MISIONES */}
        {tab === "quests" && (
          <div style={{ marginTop: 8, animation: "appear .4s both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span style={secTitle}>⚔ MISIONES DIARIAS</span><span style={{ ...bdyFont, fontSize: 16, color: C.textDim }}>{doneToday}/{data.habits.length}</span></div>
            {allDone && <div style={{ textAlign: "center", marginBottom: 12, ...pxFont, fontSize: 9, color: C.green, textShadow: `0 0 10px ${C.green}`, animation: "flicker 1.5s infinite" }}>✦ DÍA COMPLETADO ✦</div>}
            {data.habits.map((h, i) => { const done = (h.done || []).includes(today); const dcol = DIFF[h.diff]?.color || C.cyan; return (<Panel key={h.id} accent={done ? C.green : C.cyanDim} style={{ padding: 12, marginBottom: 10, animation: `appear .4s ${i * 0.04}s both` }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><button onClick={() => toggleHabit(h.id)} style={{ width: 34, height: 34, flexShrink: 0, cursor: "pointer", background: done ? `${C.green}22` : "rgba(0,0,0,.4)", border: `2px solid ${done ? C.green : C.cyan}`, color: done ? C.green : "transparent", boxShadow: done ? `0 0 12px ${C.green}` : "none", ...pxFont, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</button><div style={{ flex: 1, minWidth: 0 }}><div style={{ ...bdyFont, fontSize: 21, lineHeight: 1.1, color: done ? C.textDim : C.text, textDecoration: done ? "line-through" : "none" }}>{h.name}</div><div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}><span style={{ ...pxFont, fontSize: 7, color: dcol, border: `1px solid ${dcol}66`, padding: "2px 4px" }}>{DIFF[h.diff]?.label}</span><span style={{ ...bdyFont, fontSize: 15, color: C.gold }}>+{h.exp} EXP</span></div></div>{editMode && <button onClick={() => deleteHabit(h.id)} style={{ ...pxFont, fontSize: 12, background: "transparent", border: "none", color: C.red, cursor: "pointer", padding: 6 }}>✕</button>}</div></Panel>); })}
            {adding === "quest" ? (<Panel style={{ padding: 14, marginTop: 4 }}><div style={{ ...lbl, marginBottom: 6 }}>NUEVA MISIÓN DIARIA</div><input style={inp} placeholder="Nombre del hábito..." value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>{Object.entries(DIFF).map(([k, v]) => (<button key={k} onClick={() => setDraft({ ...draft, diff: k })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", cursor: "pointer", flex: "1 1 0", minWidth: 70, background: draft.diff === k ? `${v.color}22` : "rgba(0,0,0,.4)", border: `1px solid ${v.color}${draft.diff === k ? "" : "55"}`, color: v.color, boxShadow: draft.diff === k ? `0 0 8px ${v.color}66` : "none" }}>{v.label}<br /><span style={{ opacity: 0.8 }}>+{v.exp}</span></button>))}</div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={addQuest} style={{ ...btnPx, flex: 1, background: `${C.cyan}22` }}>AÑADIR</button><button onClick={() => { setAdding(null); setDraft({ name: "", diff: "D", target: "", unit: "" }); }} style={{ ...btnPx, color: C.textDim, borderColor: `${C.textDim}66` }}>CANCELAR</button></div></Panel>) : (<button onClick={() => setAdding("quest")} style={{ ...btnPx, width: "100%", marginTop: 4, background: "rgba(63,201,255,.05)" }}>＋ NUEVA MISIÓN</button>)}
            <button onClick={() => setEditMode((e) => !e)} style={{ ...btnPx, width: "100%", marginTop: 8, fontSize: 8, color: editMode ? C.gold : C.textDim, borderColor: editMode ? C.gold : `${C.textDim}55`, background: "transparent" }}>{editMode ? "✓ TERMINAR EDICIÓN" : "✎ EDITAR"}</button>
          </div>
        )}

        {/* RETOS */}
        {tab === "challenges" && (
          <div style={{ marginTop: 8, animation: "appear .4s both" }}>
            <div style={{ marginBottom: 10 }}><span style={secTitle}>◆ RETOS</span></div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>{Object.entries(PERIODS).map(([k, v]) => (<button key={k} onClick={() => { setChPeriod(k); setAdding(null); }} style={{ ...pxFont, fontSize: 8, padding: "9px 4px", flex: 1, cursor: "pointer", background: chPeriod === k ? `${v.color}22` : "rgba(0,0,0,.4)", border: `1px solid ${v.color}${chPeriod === k ? "" : "55"}`, color: v.color, boxShadow: chPeriod === k ? `0 0 8px ${v.color}66` : "none" }}>{v.label}</button>))}</div>
            <div style={{ ...bdyFont, fontSize: 16, color: C.textDim, textAlign: "center", marginBottom: 12 }}>{periodLabelNow}</div>
            {periodChallenges.length === 0 && <div style={{ ...bdyFont, fontSize: 17, color: C.textDim, textAlign: "center", padding: "20px 0" }}>Sin retos {PERIODS[chPeriod].label.toLowerCase()} todavía.</div>}
            {periodChallenges.map((c, i) => { const prog = c.target ? c.current / c.target : 0; const col = c.done ? C.gold : PERIODS[c.period].color; return (<Panel key={c.id} accent={col} style={{ padding: 14, marginBottom: 10, animation: `appear .4s ${i * 0.04}s both` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}><div style={{ ...bdyFont, fontSize: 21, color: C.text, lineHeight: 1.1 }}>{c.name}</div>{editMode && <button onClick={() => deleteChallenge(c.id)} style={{ ...pxFont, fontSize: 12, background: "transparent", border: "none", color: C.red, cursor: "pointer" }}>✕</button>}</div><div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}><span style={{ ...pxFont, fontSize: 7, color: col, border: `1px solid ${col}66`, padding: "2px 4px" }}>{PERIODS[c.period].label}</span><span style={{ ...bdyFont, fontSize: 14, color: C.gold }}>+{c.exp} EXP</span>{c.done && <span style={{ ...pxFont, fontSize: 7, color: C.gold, textShadow: `0 0 6px ${C.gold}` }}>✦ LOGRADO</span>}</div><div style={{ margin: "10px 0 8px" }}><ExpBar progress={prog} color={col} height={14} /></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ ...bdyFont, fontSize: 18, color: col }}>{c.current} / {c.target} {c.unit}</span><div style={{ display: "flex", gap: 6 }}><button onClick={() => stepChallenge(c.id, -1)} style={{ ...pxFont, fontSize: 12, width: 36, height: 32, cursor: "pointer", background: "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}66`, color: C.cyan }}>−</button><button onClick={() => stepChallenge(c.id, 1)} style={{ ...pxFont, fontSize: 12, width: 36, height: 32, cursor: "pointer", background: `${C.cyan}22`, border: `1px solid ${C.cyan}`, color: C.cyan }}>＋</button></div></div></Panel>); })}
            {adding === "challenge" ? (<Panel accent={PERIODS[chPeriod].color} style={{ padding: 14, marginTop: 4 }}><div style={{ ...lbl, marginBottom: 6 }}>NUEVO RETO {PERIODS[chPeriod].label}</div><input style={inp} placeholder="Nombre del reto..." value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><div style={{ display: "flex", gap: 8, marginTop: 10 }}><input style={{ ...inp, flex: 1 }} placeholder="Meta (nº)" inputMode="numeric" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value.replace(/[^0-9]/g, "") })} /><input style={{ ...inp, flex: 1 }} placeholder="Unidad" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></div><div style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginTop: 8 }}>Recompensa: +{PERIODS[chPeriod].exp} EXP</div><div style={{ display: "flex", gap: 8, marginTop: 10 }}><button onClick={addChallenge} style={{ ...btnPx, flex: 1, color: PERIODS[chPeriod].color, borderColor: PERIODS[chPeriod].color, background: `${PERIODS[chPeriod].color}22` }}>AÑADIR</button><button onClick={() => { setAdding(null); setDraft({ name: "", diff: "D", target: "", unit: "" }); }} style={{ ...btnPx, color: C.textDim, borderColor: `${C.textDim}66` }}>CANCELAR</button></div></Panel>) : (<button onClick={() => setAdding("challenge")} style={{ ...btnPx, width: "100%", marginTop: 4, color: PERIODS[chPeriod].color, borderColor: `${PERIODS[chPeriod].color}66`, background: `${PERIODS[chPeriod].color}11` }}>＋ NUEVO RETO {PERIODS[chPeriod].label}</button>)}
            <button onClick={() => setEditMode((e) => !e)} style={{ ...btnPx, width: "100%", marginTop: 8, fontSize: 8, color: editMode ? C.gold : C.textDim, borderColor: editMode ? C.gold : `${C.textDim}55`, background: "transparent" }}>{editMode ? "✓ TERMINAR EDICIÓN" : "✎ EDITAR"}</button>
          </div>
        )}

        {/* CALENDARIO */}
        {tab === "calendar" && (() => {
          const first = new Date(2026, calMonth, 1); const startDow = (first.getDay() + 6) % 7; const ndays = new Date(2026, calMonth + 1, 0).getDate();
          const cells = []; for (let i = 0; i < startDow; i++) cells.push(null); for (let d = 1; d <= ndays; d++) cells.push(d); while (cells.length % 7) cells.push(null);
          let activeDays = 0; for (let d = 1; d <= ndays; d++) { const ds = `2026-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; if (doneCountOn(data.habits, ds) > 0) activeDays++; }
          const maxH = Math.max(1, data.habits.length);
          return (<div style={{ marginTop: 8, animation: "appear .4s both" }}>
            <div style={{ marginBottom: 12 }}><span style={secTitle}>▦ CALENDARIO 2026</span></div>
            <Panel style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><button onClick={() => setCalMonth((m) => Math.max(0, m - 1))} style={{ ...pxFont, fontSize: 12, width: 36, height: 32, cursor: "pointer", background: "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}66`, color: calMonth === 0 ? C.textDim : C.cyan }}>‹</button><div style={{ ...pxFont, fontSize: 11, color: C.cyan, textShadow: `0 0 8px ${C.glow}` }}>{MONTHS_ES[calMonth].toUpperCase()}</div><button onClick={() => setCalMonth((m) => Math.min(11, m + 1))} style={{ ...pxFont, fontSize: 12, width: 36, height: 32, cursor: "pointer", background: "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}66`, color: calMonth === 11 ? C.textDim : C.cyan }}>›</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {WD.map((w, i) => <div key={i} style={{ ...pxFont, fontSize: 7, color: C.textDim, textAlign: "center", paddingBottom: 4 }}>{w}</div>)}
                {cells.map((d, i) => { if (!d) return <div key={i} />; const ds = `2026-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; const cnt = doneCountOn(data.habits, ds); const isToday = ds === today; const ratio = cnt / maxH; const lit = cnt > 0; const dayAch = (data.achievements || []).filter((a) => a.date === ds); const hasCrown = dayAch.some((a) => a.kind === "week" || a.kind === "month" || a.kind === "year"); const hasComet = !hasCrown && dayAch.some((a) => a.kind === "transform"); return (<div key={i} onClick={() => setPopup({ type: "day", date: ds })} style={{ position: "relative", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", ...bdyFont, fontSize: 16, borderRadius: 3, color: lit ? "#06121f" : C.textDim, fontWeight: lit ? "bold" : "normal", background: lit ? `rgba(63,201,255,${0.3 + ratio * 0.7})` : "rgba(255,255,255,0.03)", boxShadow: lit ? `0 0 ${4 + ratio * 8}px ${C.glow}` : "none", border: isToday ? `2px solid ${C.gold}` : "1px solid rgba(63,201,255,0.08)" }}>{d}{hasCrown && <span style={{ position: "absolute", top: -7, right: -3, fontSize: 11, filter: `drop-shadow(0 0 3px ${C.gold})` }}>👑</span>}{hasComet && <span style={{ position: "absolute", top: -5, right: -1, fontSize: 9 }}>☄</span>}</div>); })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}><span style={{ ...pxFont, fontSize: 8, color: C.textDim }}>DÍAS ACTIVOS</span><span style={{ ...bdyFont, fontSize: 18, color: C.cyan }}>{activeDays} / {ndays}</span></div>
            </Panel>
            <div style={{ ...bdyFont, fontSize: 15, color: C.textDim, textAlign: "center", marginTop: 14, lineHeight: 1.3 }}>Cada día con al menos una misión cumplida<br />se ilumina. Cuantas más, más brilla.</div>
          </div>);
        })()}

        {/* FORMAS */}
        {tab === "forms" && (
          <div style={{ marginTop: 8, animation: "appear .4s both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={secTitle}>☄ FORMAS</span>
              <button onClick={() => setFormsEdit((e) => !e)} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", cursor: "pointer", background: formsEdit ? `${C.gold}22` : "transparent", border: `1px solid ${formsEdit ? C.gold : C.cyan}66`, color: formsEdit ? C.gold : C.cyan }}>{formsEdit ? "✓ LISTO" : "✎ PERSONALIZAR"}</button>
            </div>

            {formsEdit && (
              <Panel accent={C.gold} style={{ padding: 14, marginBottom: 14 }}>
                <div style={{ ...lbl, marginBottom: 8, color: C.gold }}>CURVA DE CRECIMIENTO</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}><div style={{ ...bdyFont, fontSize: 14, color: C.textDim }}>EXP base</div><input style={inp} inputMode="numeric" value={base} onChange={(e) => setCurve({ expBase: Math.max(10, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 10) })} /></div>
                  <div style={{ flex: 1 }}><div style={{ ...bdyFont, fontSize: 14, color: C.textDim }}>Incremento/nivel</div><input style={inp} inputMode="numeric" value={step} onChange={(e) => setCurve({ expStep: Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0) })} /></div>
                </div>
                <div style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginTop: 8, lineHeight: 1.3 }}>EXP para subir del nivel N = {base} + N×{step}. Sube los números para una progresión más lenta.</div>
              </Panel>
            )}

            {!formsEdit && (
              <Panel pulse accent={stage.aura} style={{ padding: 16, textAlign: "center", marginBottom: 16 }}>
                <Avatar stage={stage} size={150} />
                <div style={{ ...pxFont, fontSize: 13, color: stage.aura, textShadow: `0 0 12px ${stage.aura}`, marginTop: 6 }}>{stage.name}</div>
                <div style={{ ...bdyFont, fontSize: 17, color: C.textDim, marginTop: 4 }}>Forma actual · Nivel {info.level}</div>
              </Panel>
            )}

            {stages.map((s, i) => {
              const unlocked = info.level >= s.min; const isCurrent = i === stageIdx; const isNext = i === stageIdx + 1;
              const col = unlocked ? s.aura : C.textDim;
              let bar = null;
              if (isNext) { const baseE = expToReachOf(stage.min, base, step); const goal = expToReachOf(s.min, base, step); bar = { p: (total - baseE) / Math.max(1, goal - baseE), faltanExp: Math.max(0, goal - total), faltanNv: s.min - info.level }; }
              return (
                <Panel key={i} accent={isCurrent || isNext ? s.aura : C.textDim} style={{ padding: 10, marginBottom: 8, opacity: unlocked || formsEdit ? 1 : 0.8, animation: `appear .4s ${i * 0.05}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 50, flexShrink: 0, filter: unlocked || formsEdit ? "none" : "grayscale(.7) brightness(.7)" }}><Avatar stage={s} size={50} simple /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {formsEdit ? (
                        <>
                          <input value={s.name} onChange={(e) => editStage(i, { name: e.target.value.toUpperCase().slice(0, 22) })} style={{ ...inp, fontSize: 16, padding: "5px 8px" }} />
                          <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                            <span style={{ ...bdyFont, fontSize: 15, color: C.textDim }}>Nv.</span>
                            <input value={s.min} disabled={i === 0} inputMode="numeric" onChange={(e) => editStageMin(i, e.target.value.replace(/[^0-9]/g, ""))} style={{ ...inp, fontSize: 16, padding: "5px 8px", width: 64, opacity: i === 0 ? 0.5 : 1 }} />
                            <button onClick={() => pickImage(i)} style={{ ...pxFont, fontSize: 7, padding: "7px 8px", cursor: "pointer", background: "rgba(63,201,255,.1)", border: `1px solid ${C.cyan}66`, color: C.cyan }}>📷 IMAGEN</button>
                            {s.img && <button onClick={() => editStage(i, { img: null })} style={{ ...pxFont, fontSize: 7, padding: "7px 8px", cursor: "pointer", background: "transparent", border: `1px solid ${C.red}66`, color: C.red }}>QUITAR</button>}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ ...pxFont, fontSize: 8, color: col }}>{s.name}</span>
                            {isCurrent ? <span style={{ ...pxFont, fontSize: 7, color: s.aura, textShadow: `0 0 6px ${s.aura}` }}>ACTUAL</span> : unlocked ? <span style={{ ...pxFont, fontSize: 9, color: C.green }}>✓</span> : <span style={{ ...pxFont, fontSize: 8, color: C.textDim }}>🔒 Nv.{s.min}</span>}
                          </div>
                          {bar ? (<div style={{ marginTop: 6 }}><ExpBar progress={bar.p} color={s.aura} height={12} /><div style={{ ...bdyFont, fontSize: 15, color: C.textDim, marginTop: 3 }}>Faltan {bar.faltanExp} EXP · {bar.faltanNv} {bar.faltanNv === 1 ? "nivel" : "niveles"}</div></div>) : (<div style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginTop: 4 }}>Se desbloquea en el nivel {s.min}</div>)}
                        </>
                      )}
                    </div>
                  </div>
                </Panel>
              );
            })}
            {formsEdit && <div style={{ ...bdyFont, fontSize: 15, color: C.textDim, textAlign: "center", marginTop: 6, lineHeight: 1.3 }}>Pon tu propia imagen, renombra la fase y ajusta<br />el nivel necesario. Los niveles van de menor a mayor.</div>}
          </div>
        )}

        {/* ESTADO */}
        {tab === "status" && (
          <div style={{ marginTop: 8, animation: "appear .4s both" }}>
            <div style={{ marginBottom: 12 }}><span style={secTitle}>◈ ESTADO DEL CAZADOR</span></div>
            <Panel style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
                <RankBadge rank={rank} size={64} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingName ? (<input autoFocus value={data.hunter} onChange={(e) => setData((d) => ({ ...d, hunter: e.target.value.toUpperCase().slice(0, 16) }))} onBlur={() => setEditingName(false)} onKeyDown={(e) => e.key === "Enter" && setEditingName(false)} style={{ ...inp, fontSize: 20 }} />) : (<div onClick={() => setEditingName(true)} style={{ ...bdyFont, fontSize: 24, color: C.text, cursor: "pointer" }}>{data.hunter} <span style={{ fontSize: 14, opacity: 0.5 }}>✎</span></div>)}
                  <div style={{ ...pxFont, fontSize: 10, color: C.cyan, marginTop: 5 }}>NIVEL {info.level} · {rank.label}</div>
                  <div style={{ ...pxFont, fontSize: 8, color: stage.aura, marginTop: 4, textShadow: `0 0 6px ${stage.aura}` }}>{stage.name}</div>
                </div>
              </div>
              {[["EXP TOTAL", total, C.gold], ["EXP AL SIGUIENTE NIVEL", info.neededExp - info.currentExp, C.cyan], ["RACHA ACTUAL", `${streak} días`, streak > 0 ? C.gold : C.textDim], ["MEJOR RACHA", `${longestStreak(data.habits)} días`, C.purple], ["MISIONES COMPLETADAS", data.habits.reduce((s, h) => s + (h.done || []).length, 0), C.green], ["RETOS LOGRADOS", data.challenges.filter((c) => c.done).length, C.gold]].map(([k, v, col], i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < 5 ? `1px solid ${C.line}` : "none" }}><span style={{ ...pxFont, fontSize: 8, color: C.textDim, letterSpacing: 1, maxWidth: "62%" }}>{k}</span><span style={{ ...bdyFont, fontSize: 20, color: col, textShadow: `0 0 8px ${col}66` }}>{v}</span></div>))}
            </Panel>
            <button onClick={() => { if (confirm("¿Reiniciar TODO el progreso? No se puede deshacer.")) { setData(normalize({ ...DEFAULT_DATA })); prevLevel.current = 1; prevStage.current = 0; } }} style={{ ...btnPx, width: "100%", marginTop: 14, fontSize: 8, color: C.red, borderColor: `${C.red}55`, background: `${C.red}0d` }}>⚠ REINICIAR PROGRESO</button>
            <div style={{ ...bdyFont, fontSize: 15, color: C.textDim, textAlign: "center", marginTop: 16, lineHeight: 1.3 }}>Tu progreso se guarda solo. Personaliza tus<br />formas en la pestaña ☄ FORMAS.</div>
          </div>
        )}
      </div>

      {/* NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "rgba(5,8,15,.92)", borderTop: `1px solid ${C.line}`, backdropFilter: "blur(6px)", display: "flex", maxWidth: 540, margin: "0 auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[["quests", "⚔", "DIARIO"], ["challenges", "◆", "RETOS"], ["calendar", "▦", "2026"], ["forms", "☄", "FORMAS"], ["status", "◈", "ESTADO"]].map(([id, icon, txt]) => { const active = tab === id; return (<button key={id} onClick={() => { setTab(id); setAdding(null); }} style={{ flex: 1, padding: "11px 0 13px", background: active ? "rgba(63,201,255,.1)" : "transparent", border: "none", borderTop: active ? `2px solid ${C.cyan}` : "2px solid transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}><span style={{ fontSize: 16, color: active ? C.cyan : C.textDim, textShadow: active ? `0 0 10px ${C.glow}` : "none" }}>{icon}</span><span style={{ ...pxFont, fontSize: 6.5, color: active ? C.cyan : C.textDim, letterSpacing: 1 }}>{txt}</span></button>); })}
      </div>

      {/* MODALES */}
      {popup && (
        <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(2,5,12,.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          {popup.type === "transform" && (<div style={{ animation: "lvlBurst .5s both", textAlign: "center", position: "relative", padding: "28px 24px 26px", border: `2px solid ${popup.stage.aura}`, background: `radial-gradient(circle at 50% 30%,${popup.stage.aura}22,rgba(5,8,15,.96))`, boxShadow: `0 0 44px ${popup.stage.aura}aa,inset 0 0 30px ${popup.stage.aura}33`, maxWidth: 360, width: "100%" }}><Corners color={popup.stage.aura} /><div style={{ ...pxFont, fontSize: 9, color: C.textDim, letterSpacing: 2 }}>◈ EL SISTEMA ◈</div><div style={{ ...pxFont, fontSize: 18, color: popup.stage.aura, textShadow: `0 0 18px ${popup.stage.aura}`, margin: "14px 0", letterSpacing: 1, animation: "flicker .7s infinite" }}>¡TRANSFORMACIÓN!</div><Avatar stage={popup.stage} size={150} /><div style={{ ...pxFont, fontSize: 12, color: popup.stage.aura, textShadow: `0 0 12px ${popup.stage.aura}`, marginTop: 8 }}>{popup.stage.name}</div><button onClick={() => setPopup(null)} style={{ ...btnPx, marginTop: 18, width: "100%", color: popup.stage.aura, borderColor: popup.stage.aura, background: `${popup.stage.aura}22` }}>CONTINUAR</button></div>)}
          {popup.type === "levelup" && (<div style={{ animation: "lvlBurst .5s both", textAlign: "center", position: "relative", padding: "36px 28px", border: `2px solid ${C.cyan}`, background: "radial-gradient(circle at 50% 30%,rgba(63,201,255,.18),rgba(5,8,15,.95))", boxShadow: `0 0 40px ${C.glow},inset 0 0 30px rgba(63,201,255,.2)`, maxWidth: 360, width: "100%" }}><Corners color={C.cyan} /><div style={{ ...pxFont, fontSize: 9, color: C.textDim, letterSpacing: 2 }}>◈ EL SISTEMA ◈</div><div style={{ ...pxFont, fontSize: 22, color: C.cyan, textShadow: `0 0 18px ${C.glow}`, margin: "18px 0", letterSpacing: 2, animation: "flicker .8s infinite" }}>⟪ SUBIDA<br />DE NIVEL ⟫</div><div style={{ ...bdyFont, fontSize: 26, color: C.text }}>NIVEL {popup.from} <span style={{ color: C.cyan }}>▸</span> <span style={{ color: C.gold, textShadow: `0 0 12px ${C.gold}` }}>{popup.to}</span></div><div style={{ margin: "16px auto 0", width: "fit-content" }}><RankBadge rank={popup.rank} size={56} /></div><div style={{ ...pxFont, fontSize: 8, color: popup.rank.color, marginTop: 10, textShadow: `0 0 8px ${popup.rank.color}` }}>{popup.rank.label}</div><button onClick={() => setPopup(null)} style={{ ...btnPx, marginTop: 22, width: "100%", background: `${C.cyan}22` }}>CONTINUAR</button></div>)}
          {popup.type === "challenge" && (<div style={{ animation: "lvlBurst .5s both", textAlign: "center", position: "relative", padding: "32px 26px", border: `2px solid ${PERIODS[popup.ch.period].color}`, background: `radial-gradient(circle at 50% 30%,${PERIODS[popup.ch.period].color}22,rgba(5,8,15,.96))`, boxShadow: `0 0 40px ${PERIODS[popup.ch.period].color}aa,inset 0 0 30px ${PERIODS[popup.ch.period].color}33`, maxWidth: 360, width: "100%" }}><Corners color={PERIODS[popup.ch.period].color} /><div style={{ ...pxFont, fontSize: 9, color: C.textDim, letterSpacing: 2 }}>◈ EL SISTEMA ◈</div><div style={{ fontSize: 26, margin: "14px 0 6px", animation: "flicker .8s infinite" }}>🏆</div><div style={{ ...pxFont, fontSize: 14, color: PERIODS[popup.ch.period].color, textShadow: `0 0 16px ${PERIODS[popup.ch.period].color}`, letterSpacing: 1 }}>RETO {PERIODS[popup.ch.period].label} LOGRADO</div><div style={{ ...bdyFont, fontSize: 24, color: C.text, marginTop: 12 }}>{popup.ch.name}</div><div style={{ ...pxFont, fontSize: 9, color: C.gold, marginTop: 14 }}>+{popup.ch.exp} EXP</div><button onClick={() => setPopup(null)} style={{ ...btnPx, marginTop: 20, width: "100%", color: PERIODS[popup.ch.period].color, borderColor: PERIODS[popup.ch.period].color, background: `${PERIODS[popup.ch.period].color}22` }}>CONTINUAR</button></div>)}
          {popup.type === "day" && (() => {
            const [yy, mm, dd] = popup.date.split("-").map(Number);
            const done = data.habits.filter((h) => (h.done || []).includes(popup.date));
            const ach = (data.achievements || []).filter((a) => a.date === popup.date);
            const isFuture = popup.date > today;
            return (
              <div onClick={(e) => e.stopPropagation()} style={{ animation: "lvlBurst .5s both", position: "relative", padding: "22px 20px", border: `2px solid ${C.cyan}`, background: "radial-gradient(circle at 50% 0%,rgba(63,201,255,.14),rgba(5,8,15,.97))", boxShadow: `0 0 36px ${C.glow},inset 0 0 26px rgba(63,201,255,.16)`, maxWidth: 360, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
                <Corners color={C.cyan} />
                <div style={{ ...pxFont, fontSize: 8, color: C.textDim, letterSpacing: 2, textAlign: "center" }}>◈ REGISTRO DEL DÍA ◈</div>
                <div style={{ ...pxFont, fontSize: 13, color: C.cyan, textShadow: `0 0 10px ${C.glow}`, textAlign: "center", margin: "10px 0 16px" }}>{dd} {MONTHS_ES[mm - 1].toUpperCase()}</div>
                {ach.length > 0 && (<div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ ...pxFont, fontSize: 8, color: C.gold, marginBottom: 10 }}>LOGROS</div>
                  {ach.map((a, j) => (<div key={j} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><span style={{ fontSize: 18, filter: a.kind === "transform" ? "none" : `drop-shadow(0 0 4px ${C.gold})` }}>{a.kind === "transform" ? "☄" : "👑"}</span><div><div style={{ ...bdyFont, fontSize: 19, color: a.kind === "transform" ? C.cyan : C.gold, lineHeight: 1 }}>{a.name}</div><div style={{ ...pxFont, fontSize: 6.5, color: C.textDim, marginTop: 3 }}>{a.kind === "transform" ? "TRANSFORMACIÓN" : `RETO ${PERIODS[a.kind].label}`}</div></div></div>))}
                </div>)}
                <div style={{ ...pxFont, fontSize: 8, color: C.green, marginBottom: 10 }}>MISIONES ({done.length})</div>
                {done.length === 0 ? (<div style={{ ...bdyFont, fontSize: 18, color: C.textDim }}>{isFuture ? "Día por venir." : "Sin misiones completadas ese día."}</div>) : done.map((h, j) => (<div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ color: C.green, ...pxFont, fontSize: 9 }}>✓</span><span style={{ ...bdyFont, fontSize: 19, color: C.text, flex: 1, minWidth: 0 }}>{h.name}</span><span style={{ ...bdyFont, fontSize: 15, color: C.gold }}>+{h.exp}</span></div>))}
                <button onClick={() => setPopup(null)} style={{ ...btnPx, marginTop: 18, width: "100%", background: `${C.cyan}22` }}>CERRAR</button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
