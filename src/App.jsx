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
const C_DEFAULT = { ...C };
function hexToRgb(h) { h = (h || "").replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); const n = parseInt(h, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
function shade(hex, f) { const { r, g, b } = hexToRgb(hex); const m = (v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); return `#${[m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`; }
const THEMES = [
  { id: "cyan", name: "CIAN", accent: "#3fc9ff", bg: "#05080f" },
  { id: "purple", name: "MORADO", accent: "#b06bff", bg: "#0b0614" },
  { id: "green", name: "VERDE", accent: "#5cf08a", bg: "#03110a" },
  { id: "gold", name: "DORADO", accent: "#ffcf4d", bg: "#0f0c03" },
  { id: "red", name: "ROJO", accent: "#ff5d6c", bg: "#11050708".slice(0, 7) },
  { id: "pink", name: "ROSA", accent: "#ff7ad9", bg: "#120512" },
  { id: "ice", name: "HIELO", accent: "#cfe9ff", bg: "#060a12" },
];
// Recolorea el objeto global C a partir de un color de acento + fondo
function applyTheme(accent, bg) {
  const a = accent || C_DEFAULT.cyan;
  const { r, g, b } = hexToRgb(a);
  C.cyan = a;
  C.cyanDim = shade(a, -0.45);
  C.glow = `rgba(${r},${g},${b},0.55)`;
  C.line = `rgba(${r},${g},${b},0.35)`;
  C.bg = bg || C_DEFAULT.bg;
  C.panel = `rgba(${Math.round(r * 0.18)},${Math.round(g * 0.22)},${Math.round(b * 0.3)},0.72)`;
  C.text = shade(a, 0.75);
  C.textDim = shade(a, -0.2);
}
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
// Si el usuario nunca tocó las formas (d.stages == null), usa las 7 por defecto.
// Si las tocó, d.stages es la fuente de verdad (puede tener más o menos de 7).
function effStages(d) {
  const sd = d.stages;
  if (!sd || !Array.isArray(sd) || sd.length === 0) return STAGES.map((s) => ({ ...s }));
  return sd.map((s, i) => {
    const base = STAGES[i] || STAGES[STAGES.length - 1];
    return { ...base, ...s, name: s.name ?? base.name, min: s.min ?? base.min, img: s.img || null };
  });
}
// Devuelve siempre un array editable de formas (materializa las por defecto si hacía falta)
function ensureStages(d) { return effStages(d).map((s) => ({ ...s })); }

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
// ---- CATEGORÍAS: rangos por rareza de videojuego ----
const CAT_RANKS = [
  { name: "C", color: "#ffcf4d" },   // amarillo
  { name: "B", color: "#5cf08a" },   // verde
  { name: "A", color: "#4f9cff" },   // azul
  { name: "S", color: "#3fc9ff" },   // cian
  { name: "SS", color: "#b06bff" },  // morado épico
  { name: "SSS", color: "#ff8a3d" }, // naranja legendario
];
// EXP acumulada por defecto para alcanzar cada rango (índice 0 = C desde 0)
const CAT_DEFAULT_THRESHOLDS = [0, 150, 400, 800, 1500, 3000];
// Set de 16 iconos temáticos (emoji con buen render universal)
const CAT_ICONS = ["💰","❤️","💪","📚","🧠","🎨","📷","🏠","💼","🏃","🍎","🎵","🌱","⚡","🎯","🧘"];
const CAT_COLORS = ["#3fc9ff","#ff5d6c","#5cf08a","#ffcf4d","#b06bff","#ff8a3d","#ff7ad9","#4f9cff","#5ce6e0","#ffffff"];
function catRankInfo(exp, thresholds) {
  const th = thresholds && thresholds.length === 6 ? thresholds : CAT_DEFAULT_THRESHOLDS;
  let idx = 0;
  for (let i = 0; i < th.length; i++) if (exp >= th[i]) idx = i;
  const rank = CAT_RANKS[idx];
  const isMax = idx === CAT_RANKS.length - 1;
  const floor = th[idx];
  const ceil = isMax ? floor : th[idx + 1];
  const progress = isMax ? 1 : (exp - floor) / Math.max(1, ceil - floor);
  return { idx, rank, isMax, progress, floor, ceil, nextExp: isMax ? 0 : ceil - exp };
}
function effThresholds(cat, globalTh) { if (cat && cat.thresholds && cat.thresholds.length === 6) return cat.thresholds; if (globalTh && globalTh.length === 6) return globalTh; return CAT_DEFAULT_THRESHOLDS; }
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
function expOnDay(h, ds) { return h.reduce((s, x) => s + ((x.done || []).includes(ds) ? x.exp : 0), 0); }
function dayColorFor(exp, thresholds) { const t = thresholds || { gold: 400, red: 800 }; if (exp >= t.red) return "red"; if (exp >= t.gold) return "gold"; if (exp > 0) return "cyan"; return null; }
function tasksDoneOn(tasks, ds) { return (tasks || []).filter((t) => t.done && t.date === ds); }
function tasksOnDay(tasks, ds) { return (tasks || []).filter((t) => t.date === ds); }
function catExpOf(d, catId) {
  let exp = 0;
  (d.habits || []).forEach((h) => { if (h.category === catId) exp += (h.done || []).length * h.exp; });
  (d.challenges || []).forEach((c) => { if (c.category === catId && c.done) exp += c.exp; });
  return exp;
}
const STREAK_MSGS = [
  { min:1,  name:'EL SISTEMA',    text:'Un nuevo día comienza.\nCompleta tus misiones.' },
  { min:3,  name:'EL SISTEMA',    text:'Tres días seguidos.\nEl hábito empieza a forjarse.' },
  { min:7,  name:'EL SISTEMA',    text:'Una semana perfecta.\nTu nombre se anota en los registros.' },
  { min:14, name:'EL SISTEMA',    text:'Catorce días sin fisuras.\nLa voluntad se ha vuelto acero.' },
  { min:21, name:'EL SISTEMA',    text:'Veintiún días.\nEl hábito ya es parte de ti.' },
  { min:30, name:'EL SISTEMA',    text:'¡MES DE HIERRO completado!\nEres imparable.' },
  { min:60, name:'SISTEMA S-RANK',text:'Sesenta días.\nPocos cazadores llegan tan lejos.' },
  { min:100,name:'SISTEMA S-RANK',text:'Cien días de racha.\nCazador de Élite reconocido.' },
];
function getStreakMsg(s) { let m = STREAK_MSGS[0]; for (const x of STREAK_MSGS) { if (s >= x.min) m = x; } return m; }
function drawPortraitCanvas(canvas, auraCol) {
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,64,64);
  const bg = ctx.createLinearGradient(0,0,0,64);
  bg.addColorStop(0,'#0d2040'); bg.addColorStop(1,'#060e18');
  ctx.fillStyle = bg; ctx.fillRect(0,0,64,64);
  const aura = ctx.createRadialGradient(32,46,4,32,46,22);
  aura.addColorStop(0,auraCol+'55'); aura.addColorStop(1,'transparent');
  ctx.fillStyle = aura; ctx.fillRect(0,0,64,64);
  const S=3,OX=8,OY=4;
  const px=(c,x,y,w=1,h=1)=>{ ctx.fillStyle=c; ctx.fillRect(OX+x*S,OY+y*S,w*S,h*S); };
  px('#1a1a22',1,0,8,1); px('#1a1a22',0,1,10,1);
  px('#f4c8a0',1,2,8,3);
  px(auraCol,2,3,2,1); px(auraCol,6,3,2,1);
  px('#fff',2,3,1,1); px('#fff',6,3,1,1);
  px('#c87060',3,5,4,1);
  px('#f4c8a0',4,5,2,1);
  px('#ef8a2b',1,6,8,1); px('#ef8a2b',0,7,10,1); px('#c96f18',2,7,6,1);
  px('#0a0a14',0,8,10,1); px(auraCol,4,8,2,1);
  px('#2b4cff',1,9,3,3); px('#2b4cff',6,9,3,3);
  px('#1832b8',1,12,4,1); px('#1832b8',5,12,4,1);
  px('#ef8a2b',0,6,1,3); px('#ef8a2b',9,6,1,3);
  px('#f4c8a0',0,9,1,1); px('#f4c8a0',9,9,1,1);
  ctx.strokeStyle='#6fd0ff'; ctx.lineWidth=2; ctx.strokeRect(1,1,62,62);
  ctx.strokeStyle='#1a4060'; ctx.lineWidth=1; ctx.strokeRect(3,3,58,58);
}
function gcalLink(task) {
  if (!task.date) return null;
  const ymd = task.date.replace(/-/g, "");
  const start = ymd, end = ymd; // evento de día completo
  const text = encodeURIComponent(task.name);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${encodeURIComponent("Tarea de El Sistema")}`;
}
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
let _sfxVol = 1; // multiplicador global de efectos (0..1)
function setSfxVol(v) { _sfxVol = Math.max(0, Math.min(1, v)); }
function ac() { try { if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)(); if (_ctx.state === "suspended") _ctx.resume(); return _ctx; } catch (e) { return null; } }
function tone(f, s, d, t = "square", v = 0.16) { const c = ac(); if (!c || _sfxVol <= 0) return; const o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; o.connect(g); g.connect(c.destination); const tt = c.currentTime + s; const vol = Math.max(0.0001, v * _sfxVol); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(vol, tt + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, tt + d); o.start(tt); o.stop(tt + d + 0.05); }
const sfx = {
  blip() { tone(880, 0, 0.07, "square", 0.16); tone(1318, 0.06, 0.12, "square", 0.14); },
  jingle() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.1, "square", 0.15)); tone(1047, 0.3, 0.22, "square", 0.17); tone(1568, 0.3, 0.26, "triangle", 0.07); },
  fanfare() { [[392, 0, 0.11], [392, 0.13, 0.11], [523, 0.26, 0.11], [659, 0.39, 0.11], [784, 0.52, 0.3], [698, 0.86, 0.11], [880, 0.99, 0.11], [1047, 1.12, 0.5]].forEach(([f, s, d]) => tone(f, s, d, "sawtooth", 0.12)); tone(523, 0.52, 0.3, "square", 0.08); tone(659, 0.52, 0.3, "square", 0.08); tone(784, 1.12, 0.5, "square", 0.08); tone(659, 1.12, 0.5, "square", 0.07); tone(131, 0, 0.5, "triangle", 0.12); tone(98, 0.52, 0.34, "triangle", 0.12); tone(131, 1.12, 0.5, "triangle", 0.12); tone(2093, 1.12, 0.45, "triangle", 0.06); },
  goldDay() { [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.08, 0.16, "square", 0.14)); tone(1568, 0.34, 0.3, "triangle", 0.08); },
  redDay() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.07, 0.18, "sawtooth", 0.13)); tone(2093, 0.45, 0.4, "triangle", 0.09); tone(784, 0.45, 0.4, "square", 0.07); },
  tick() { tone(660, 0, 0.05, "square", 0.1); },
  // --- nuevos efectos de interfaz ---
  tab() { tone(523, 0, 0.05, "square", 0.09); tone(784, 0.04, 0.07, "square", 0.08); },      // cambiar pestaña
  nav() { tone(440, 0, 0.04, "triangle", 0.08); },                                           // navegación menor (periodo/filtro)
  open() { tone(587, 0, 0.05, "square", 0.08); tone(880, 0.05, 0.09, "triangle", 0.07); },   // abrir panel/formulario
  close() { tone(440, 0, 0.05, "square", 0.07); tone(330, 0.05, 0.08, "square", 0.06); },     // cerrar/cancelar
  add() { tone(659, 0, 0.06, "square", 0.1); tone(988, 0.06, 0.1, "square", 0.09); },         // crear/añadir
  del() { tone(330, 0, 0.06, "sawtooth", 0.09); tone(220, 0.06, 0.1, "sawtooth", 0.08); },    // borrar
  step() { tone(740, 0, 0.04, "square", 0.08); },                                             // +/- en retos
  undo() { tone(392, 0, 0.05, "triangle", 0.07); },                                           // desmarcar
  taskDone() { tone(880, 0, 0.05, "square", 0.11); tone(1175, 0.05, 0.08, "square", 0.1); tone(1568, 0.1, 0.12, "triangle", 0.07); }, // completar tarea
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
@keyframes grid{0%{background-position:0 0}100%{background-position:46px 46px}}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 10px var(--glow,rgba(63,201,255,.55)),inset 0 0 14px var(--glowin,rgba(63,201,255,.1))}50%{box-shadow:0 0 22px var(--glow,rgba(63,201,255,.55)),inset 0 0 22px var(--glowin,rgba(63,201,255,.18))}}
@keyframes floatUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-46px);opacity:0}}
@keyframes lvlBurst{0%{transform:scale(.5);opacity:0}30%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes flicker{0%,100%{opacity:1}50%{opacity:.86}}
@keyframes shimmer{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
@keyframes appear{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes arrowBounce{0%{transform:translateX(0)}100%{transform:translateX(3px)}}
@keyframes tokenSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes trailFade{0%{opacity:.7;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(.2)}}
@keyframes todayGlow{0%,100%{box-shadow:0 0 4px rgba(255,207,77,.4)}50%{box-shadow:0 0 10px rgba(255,207,77,.7)}}
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
function CatIcon({ cat, size = 24 }) {
  if (!cat) return <span style={{ fontSize: size * 0.8, opacity: 0.5 }}>▫</span>;
  if (cat.customIcon) return <img src={cat.customIcon} alt={cat.name} style={{ width: size, height: size, objectFit: "contain", borderRadius: 4 }} />;
  return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{cat.icon || "▫"}</span>;
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
  musicOn: true, musicVol: 0.4, sfxVol: 0.7, customMusic: null,
  themeAccent: "#3fc9ff", themeBg: "#05080f",
  dayThresholds: { gold: 400, red: 800 },
  catThresholds: [0, 150, 400, 800, 1500, 3000],
  categories: [],
  tasks: [],
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
  const challenges = (data.challenges || []).map((c) => { const k = periodKey(c.period); if (c.periodKey !== k) { changed = true; if (c.repeat === false) { return { ...c, periodKey: k }; } return { ...c, current: 0, done: false, periodKey: k }; } return c; });
  return changed ? { ...data, challenges } : data;
}

const ACH_RARITIES = [
  { id:'comun',label:'COMÚN',color:'#7fa8c7' },
  { id:'inusual',label:'INUSUAL',color:'#5cf08a' },
  { id:'raro',label:'RARO',color:'#3fc9ff' },
  { id:'epico',label:'ÉPICO',color:'#b06bff' },
  { id:'legendario',label:'LEGENDARIO',color:'#ffcf4d' },
  { id:'mitico',label:'MÍTICO',color:'#ff7ad9' },
  { id:'absurdo',label:'ABSURDO',color:'#ff5d6c' },
];
const ACHIEVEMENTS_DEF = [
  // RACHA
  {id:'r1',sec:'racha',icon:'🔥',name:'PRIMER PASO',rarity:'comun',desc:'Completa tu primera misión del día.',check:d=>d.habits.some(h=>(h.done||[]).length>0)},
  {id:'r2',sec:'racha',icon:'📅',name:'3 DÍAS',rarity:'comun',desc:'Mantén una racha de 3 días.',check:(d,s)=>s>=3},
  {id:'r3',sec:'racha',icon:'🌊',name:'SEMANA PERFECTA',rarity:'raro',desc:'7 días consecutivos de racha.',check:(d,s)=>s>=7},
  {id:'r4',sec:'racha',icon:'🌑',name:'MES DE HIERRO',rarity:'epico',desc:'30 días seguidos de racha.',check:(d,s)=>s>=30,prog:(d,s)=>[Math.min(s,30),30]},
  {id:'r5',sec:'racha',icon:'⚡',name:'100 DÍAS',rarity:'legendario',desc:'100 días de racha sin interrupción.',check:(d,s)=>s>=100,prog:(d,s)=>[Math.min(s,100),100]},
  {id:'r6',sec:'racha',icon:'🌌',name:'MEDIO AÑO',rarity:'mitico',desc:'180 días de racha.',check:(d,s)=>s>=180,prog:(d,s)=>[Math.min(s,180),180]},
  {id:'r7',sec:'racha',icon:'♾️',name:'AÑO COMPLETO',rarity:'absurdo',desc:'365 días de racha. Un año entero.',check:(d,s)=>s>=365,prog:(d,s)=>[Math.min(s,365),365]},
  {id:'r8',sec:'racha',icon:'💎',name:'DIAMANTE',rarity:'legendario',desc:'Completa TODAS las misiones del día durante 7 días seguidos.',check:d=>false},
  // EXP Y NIVEL
  {id:'n1',sec:'nivel',icon:'🌱',name:'DESPERTAR',rarity:'comun',desc:'Alcanza el nivel 5.',check:(d,s,info)=>info.level>=5},
  {id:'n2',sec:'nivel',icon:'⚔️',name:'CAZADOR',rarity:'comun',desc:'Alcanza el nivel 10.',check:(d,s,info)=>info.level>=10},
  {id:'n3',sec:'nivel',icon:'🔮',name:'ÉLITE',rarity:'raro',desc:'Alcanza el nivel 20.',check:(d,s,info)=>info.level>=20,prog:(d,s,info)=>[Math.min(info.level,20),20]},
  {id:'n4',sec:'nivel',icon:'🌀',name:'TRASCENDENCIA',rarity:'epico',desc:'Alcanza el nivel 30.',check:(d,s,info)=>info.level>=30,prog:(d,s,info)=>[Math.min(info.level,30),30]},
  {id:'n5',sec:'nivel',icon:'👁️',name:'MONARCA',rarity:'legendario',desc:'Alcanza el nivel máximo.',check:(d,s,info)=>info.level>=50,prog:(d,s,info)=>[Math.min(info.level,50),50]},
  {id:'n6',sec:'nivel',icon:'💫',name:'1.000 EXP',rarity:'comun',desc:'Acumula 1.000 EXP en total.',check:(d,s,info,tot)=>tot>=1000,prog:(d,s,info,tot)=>[Math.min(tot,1000),1000]},
  {id:'n7',sec:'nivel',icon:'⭐',name:'10.000 EXP',rarity:'raro',desc:'Acumula 10.000 EXP en total.',check:(d,s,info,tot)=>tot>=10000,prog:(d,s,info,tot)=>[Math.min(tot,10000),10000]},
  {id:'n8',sec:'nivel',icon:'🌟',name:'50.000 EXP',rarity:'epico',desc:'Acumula 50.000 EXP en total.',check:(d,s,info,tot)=>tot>=50000,prog:(d,s,info,tot)=>[Math.min(tot,50000),50000]},
  {id:'n9',sec:'nivel',icon:'🎇',name:'100.000 EXP',rarity:'legendario',desc:'Acumula 100.000 EXP en total.',check:(d,s,info,tot)=>tot>=100000,prog:(d,s,info,tot)=>[Math.min(tot,100000),100000]},
  {id:'n10',sec:'nivel',icon:'🚀',name:'DÍA DORADO',rarity:'inusual',desc:'Consigue el umbral dorado de EXP en un día.',check:d=>false},
  // RETOS
  {id:'c1',sec:'retos',icon:'🎯',name:'PRIMER RETO',rarity:'comun',desc:'Completa tu primer reto.',check:d=>(d.challenges||[]).some(c=>c.done)},
  {id:'c2',sec:'retos',icon:'📦',name:'5 RETOS',rarity:'comun',desc:'Completa 5 retos en total.',check:d=>(d.challenges||[]).filter(c=>c.done).length>=5,prog:d=>[Math.min((d.challenges||[]).filter(c=>c.done).length,5),5]},
  {id:'c3',sec:'retos',icon:'🧩',name:'VETERANO',rarity:'raro',desc:'Completa 10 retos en total.',check:d=>(d.challenges||[]).filter(c=>c.done).length>=10,prog:d=>[Math.min((d.challenges||[]).filter(c=>c.done).length,10),10]},
  {id:'c4',sec:'retos',icon:'🏅',name:'25 RETOS',rarity:'raro',desc:'Completa 25 retos en total.',check:d=>(d.challenges||[]).filter(c=>c.done).length>=25,prog:d=>[Math.min((d.challenges||[]).filter(c=>c.done).length,25),25]},
  {id:'c5',sec:'retos',icon:'🥇',name:'50 RETOS',rarity:'epico',desc:'Completa 50 retos en total.',check:d=>(d.challenges||[]).filter(c=>c.done).length>=50,prog:d=>[Math.min((d.challenges||[]).filter(c=>c.done).length,50),50]},
  {id:'c6',sec:'retos',icon:'💯',name:'100 RETOS',rarity:'legendario',desc:'Completa 100 retos en total.',check:d=>(d.challenges||[]).filter(c=>c.done).length>=100,prog:d=>[Math.min((d.challenges||[]).filter(c=>c.done).length,100),100]},
  {id:'c7',sec:'retos',icon:'⚡',name:'VELOCISTA',rarity:'inusual',desc:'Completa un reto semanal en los primeros 2 días.',check:d=>false},
  // TAREAS
  {id:'t1',sec:'tareas',icon:'✍️',name:'PRIMER APUNTE',rarity:'comun',desc:'Crea tu primera tarea en la libreta.',check:d=>(d.tasks||[]).length>0},
  {id:'t2',sec:'tareas',icon:'✅',name:'TAREA RESUELTA',rarity:'comun',desc:'Completa tu primera tarea.',check:d=>(d.tasks||[]).some(t=>t.done)},
  {id:'t3',sec:'tareas',icon:'📋',name:'LISTA LIMPIA',rarity:'raro',desc:'Completa todas las tareas del día (mín. 3).',check:d=>{const ts=(d.tasks||[]);return ts.length>=3&&ts.every(t=>t.done);}},
  {id:'t4',sec:'tareas',icon:'📚',name:'10 TAREAS',rarity:'comun',desc:'Completa 10 tareas en total.',check:d=>(d.tasks||[]).filter(t=>t.done).length>=10,prog:d=>[Math.min((d.tasks||[]).filter(t=>t.done).length,10),10]},
  {id:'t5',sec:'tareas',icon:'📖',name:'50 TAREAS',rarity:'raro',desc:'Completa 50 tareas en total.',check:d=>(d.tasks||[]).filter(t=>t.done).length>=50,prog:d=>[Math.min((d.tasks||[]).filter(t=>t.done).length,50),50]},
  {id:'t6',sec:'tareas',icon:'🗄️',name:'100 TAREAS',rarity:'epico',desc:'Completa 100 tareas en total.',check:d=>(d.tasks||[]).filter(t=>t.done).length>=100,prog:d=>[Math.min((d.tasks||[]).filter(t=>t.done).length,100),100]},
  {id:'t7',sec:'tareas',icon:'🗓️',name:'PLANIFICADOR',rarity:'inusual',desc:'Asigna una tarea a 7 días distintos del calendario.',check:d=>{const ds=new Set((d.tasks||[]).filter(t=>t.date).map(t=>t.date));return ds.size>=7;},prog:d=>{const ds=new Set((d.tasks||[]).filter(t=>t.date).map(t=>t.date));return[Math.min(ds.size,7),7];}},
  // CATEGORÍAS
  {id:'k1',sec:'cats',icon:'🏷️',name:'MI PRIMER ÁREA',rarity:'comun',desc:'Crea tu primera categoría.',check:d=>(d.categories||[]).length>0},
  {id:'k2',sec:'cats',icon:'🗂️',name:'MULTITAREA',rarity:'comun',desc:'Crea 3 categorías distintas.',check:d=>(d.categories||[]).length>=3,prog:d=>[Math.min((d.categories||[]).length,3),3]},
  {id:'k3',sec:'cats',icon:'📊',name:'ESPECIALISTA',rarity:'raro',desc:'Sube una categoría al rango B.',check:d=>false},
  {id:'k4',sec:'cats',icon:'👑',name:'MAESTRO',rarity:'epico',desc:'Lleva una categoría al rango SS.',check:d=>false},
  {id:'k5',sec:'cats',icon:'🌟',name:'SIN LÍMITES',rarity:'legendario',desc:'Alcanza el rango SSS en cualquier categoría.',check:d=>false},
  {id:'k6',sec:'cats',icon:'🔱',name:'OMNIDOMINANTE',rarity:'mitico',desc:'Todas tus categorías al rango S o superior.',check:d=>false},
  // PERSONAJE
  {id:'f1',sec:'nivel',icon:'🧒',name:'NIÑO INTERIOR',rarity:'comun',desc:'Empieza la aventura en tu primera forma.',check:d=>true},
  {id:'f2',sec:'nivel',icon:'🎨',name:'ARTISTA',rarity:'inusual',desc:'Sube una imagen propia a una forma.',check:d=>(d.stages||[]).some(s=>s.img)},
  {id:'f3',sec:'nivel',icon:'🌈',name:'CROMÁTICO',rarity:'inusual',desc:'Personaliza aura y pelo de todas tus formas.',check:d=>(d.stages||[]).length>=2&&(d.stages||[]).every(s=>s.aura)},
  {id:'f4',sec:'nivel',icon:'🔄',name:'MÚLTIPLE',rarity:'raro',desc:'Crea 3 formas personalizadas.',check:d=>(d.stages||[]).length>=3,prog:d=>[Math.min((d.stages||[]).length,3),3]},
  // USO
  {id:'u1',sec:'uso',icon:'🎮',name:'BIENVENIDO',rarity:'comun',desc:'Abre El Sistema por primera vez.',check:d=>true},
  {id:'u2',sec:'uso',icon:'🔧',name:'PERSONALIZADO',rarity:'comun',desc:'Cambia el nombre del cazador.',check:d=>d.hunter!=='CAZADOR'},
  {id:'u3',sec:'uso',icon:'🎵',name:'AMBIENTADO',rarity:'comun',desc:'Sube tu propia banda sonora.',check:d=>false},
  {id:'u4',sec:'uso',icon:'🎨',name:'DISEÑADOR',rarity:'inusual',desc:'Cambia el tema de color de la app.',check:d=>d.themeAccent&&d.themeAccent!=='#3fc9ff'},
  {id:'u5',sec:'uso',icon:'📱',name:'INSTALADO',rarity:'comun',desc:'Instala la app en tu pantalla de inicio.',check:d=>false},
  // SECRETOS
  {id:'s1',sec:'secreto',icon:'❓',name:'???',rarity:'mitico',desc:'Logro oculto. Sigue mejorando.',check:d=>false,hidden:true},
  {id:'s2',sec:'secreto',icon:'❓',name:'???',rarity:'legendario',desc:'Condición secreta. ¿Qué habrá que hacer?',check:d=>false,hidden:true},
  {id:'s3',sec:'secreto',icon:'❓',name:'FANTASMA',rarity:'mitico',desc:'Completa una misión a las 23:59.',check:d=>false},
  {id:'s4',sec:'secreto',icon:'❓',name:'???',rarity:'absurdo',desc:'Un logro que casi nadie consigue.',check:d=>false,hidden:true},
];
const ACH_SECTIONS = { racha:'⚡ RACHA Y CONSTANCIA', nivel:'✦ EXP, NIVEL Y FORMAS', retos:'◆ RETOS COMPLETADOS', tareas:'✎ LIBRETA Y TAREAS', cats:'◈ MAESTRÍA DE CATEGORÍAS', uso:'🎮 USO DE LA APP', secreto:'★ LOGROS SECRETOS' };

function computeAchievements(data, streak, info, total) {
  return ACHIEVEMENTS_DEF.map(a => {
    let unlocked = false;
    try { unlocked = a.check(data, streak, info, total); } catch(e){}
    let prog = null;
    try { if (a.prog) prog = a.prog(data, streak, info, total); } catch(e){}
    return { ...a, unlocked, prog };
  });
}

function StreakPopup({ streak, tasks, stage, onClose }) {
  const canvasRef = useRef(null);
  const boardRef = useRef(null);
  const tokenRef = useRef(null);
  const [displayNum, setDisplayNum] = useState(0);
  const [msgText, setMsgText] = useState('');
  const [showClose, setShowClose] = useState(false);
  const [progW, setProgW] = useState(0);
  const [boardBuilt, setBoardBuilt] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const upcoming = (tasks||[]).filter(t=>t.date&&t.date>=today&&!t.done).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const auraCol = stage?.aura || '#3fc9ff';
  const COLS = 7;

  // Construye las casillas del tablero
  function buildBoardCells(streak) {
    const DAYS = 30; // siempre muestra 30 casillas (un mes)
    const rows = Math.ceil(DAYS / COLS);
    const total = COLS * rows;
    const path = [];
    for (let r=0;r<rows;r++) for (let c=0;c<COLS;c++) path.push(r*COLS+(r%2===0?c:COLS-1-c));
    return { path, total, rows };
  }

  function getCellCenter(pi, path, boardEl) {
    const gi = path[pi];
    const cells = [...boardEl.children];
    const cell = cells[gi];
    if (!cell) return null;
    const br = boardEl.getBoundingClientRect();
    const cr = cell.getBoundingClientRect();
    return { x: cr.left-br.left+cr.width/2, y: cr.top-br.top+cr.height/2 };
  }

  useEffect(() => {
    // Retrato
    if (canvasRef.current) drawPortraitCanvas(canvasRef.current, auraCol);
    // Sonido de apertura
    try { sfx.open(); } catch(e){}
    // Barra de progreso
    const ms=[1,3,7,14,21,30,60,100,180,365];
    const nxt=ms.find(m=>m>streak)||365; const prv=ms.filter(m=>m<=streak).pop()||1;
    setTimeout(()=>setProgW(Math.min(100,Math.round((streak-prv)/(nxt-prv)*100))),400);
    setBoardBuilt(true);
  }, []);

  // Anima el token después de que el board se haya renderizado
  useEffect(() => {
    if (!boardBuilt || !boardRef.current || !tokenRef.current) return;
    const boardEl = boardRef.current;
    const token = tokenRef.current;
    const wrap = boardEl.parentElement;
    const { path } = buildBoardCells(streak);
    const STEPS = Math.min(streak, path.length);
    const SPEED = Math.max(55, 220 - streak*3);
    let step = 0;

    const pos0 = getCellCenter(0, path, boardEl);
    if (pos0) { token.style.left=pos0.x+'px'; token.style.top=pos0.y+'px'; token.style.display='block'; }

    const trails = [];
    function next() {
      if (step >= STEPS) {
        // Llegó — cuenta el número y arranca typewriter
        try { sfx.jingle(); } catch(e){}
        let cur=0;
        const iv=setInterval(()=>{ cur=Math.min(cur+1,streak); setDisplayNum(cur); if(cur>=streak) clearInterval(iv); }, Math.max(16,900/streak));
        const msg=getStreakMsg(streak);
        let i=0; const txt=msg.text.replace(/\n/g,' · ');
        const tw=setInterval(()=>{ setMsgText(txt.slice(0,i+1)); i++; if(i>=txt.length){ clearInterval(tw); setTimeout(()=>{ setShowClose(true); try{sfx.blip();}catch(e){} },200); }},36);
        return;
      }
      const pos = getCellCenter(step, path, boardEl);
      if (pos) {
        token.style.transition=`left ${SPEED*.8}ms cubic-bezier(.34,1.4,.64,1),top ${SPEED*.8}ms cubic-bezier(.34,1.4,.64,1)`;
        token.style.left=pos.x+'px'; token.style.top=pos.y+'px';
        if (step > 0) {
          const tr = document.createElement('div');
          tr.style.cssText=`position:absolute;width:4px;height:4px;background:#ffcf4d;transform:translate(-50%,-50%);pointer-events:none;z-index:9;left:${pos.x}px;top:${pos.y}px;clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);animation:trailFade .4s ease-out forwards`;
          wrap.appendChild(tr); trails.push(tr);
          setTimeout(()=>tr.remove(),400);
        }
        try { if(step%3===0) sfx.tick(); } catch(e){}
      }
      step++; setTimeout(next, SPEED);
    }
    setTimeout(next, 300);
    return () => { trails.forEach(t=>{ try{t.remove();}catch(e){} }); };
  }, [boardBuilt]);

  const { path, total, rows } = buildBoardCells(streak);
  const getDiff=(d)=>{ if(d===0) return {t:'HOY',c:'#ffcf4d'}; if(d===1) return {t:'MAÑANA',c:'#3fc9ff'}; if(d<=3) return {t:`+${d}d`,c:'#3fc9ff'}; if(d<=7) return {t:`+${d}d`,c:'#7fa8c7'}; return {t:`+${d}d`,c:'#3a5060'}; };

  // Renderiza las casillas en orden de grid (no de path)
  const cellEls = new Array(total).fill(null);
  path.forEach((gi, pi) => {
    const day = pi+1;
    let bg='#0a1828', border='#1a3050', content=<span style={{fontSize:5,color:'#1a3a5a'}}>{day}</span>;
    if (day < streak) {
      bg='rgba(63,201,255,0.1)'; border='rgba(63,201,255,0.4)';
      content=<><span style={{fontSize:5,color:'#3fc9ff'}}>{day}</span><span style={{fontSize:8,color:day%7===0?'#ffcf4d':'#3fc9ff',display:'block',lineHeight:1}}>{day%7===0?'★':'✓'}</span></>;
    } else if (day === streak) {
      bg='rgba(255,207,77,0.18)'; border='#ffcf4d';
      content=<><span style={{fontSize:5,color:'#ffcf4d'}}>{day}</span><span style={{fontSize:8,color:'#ffcf4d',display:'block',lineHeight:1}}>◈</span></>;
    } else {
      bg='#060e18'; border='#0d1e30';
      content=<span style={{fontSize:5,color:'#1a3050'}}>{day}</span>;
    }
    cellEls[gi] = (
      <div key={gi} style={{ aspectRatio:'1', background:bg, border:`1px solid ${border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', clipPath:'polygon(2px 0%,calc(100% - 2px) 0%,100% 2px,100% calc(100% - 2px),calc(100% - 2px) 100%,2px 100%,0% calc(100% - 2px),0% 2px)', animation:day===streak?'todayGlow 1.2s ease-in-out infinite':undefined }}>
        {content}
      </div>
    );
  });
  for (let i=0;i<total;i++) { if(!cellEls[i]) cellEls[i]=<div key={i} style={{aspectRatio:'1',background:'#060e18',border:'1px solid #0d1e30'}}/>; }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)',overflowY:'auto'}}>
      <div style={{background:'#08101e',border:'3px solid #6fd0ff',outline:'2px solid #1a4060',outlineOffset:'-5px',boxShadow:'0 0 0 1px #000,0 0 30px rgba(63,201,255,0.15)',borderRadius:2,width:'min(96vw,360px)',fontFamily:"'Press Start 2P',monospace",overflow:'hidden',margin:'auto'}}>
        {/* Cabecera */}
        <div style={{background:'linear-gradient(180deg,#0d2240,#091828)',borderBottom:'2px solid #6fd0ff',padding:'8px 14px 7px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:7,color:'#3fc9ff',textShadow:'0 0 8px #3fc9ff',letterSpacing:2}}>◈ INFORME DEL CAZADOR</span>
          <span style={{fontSize:6,color:'#ffcf4d',border:'1px solid #ffcf4d',padding:'2px 6px'}}>DÍA {streak}</span>
        </div>
        <div style={{padding:'12px 14px 14px'}}>
          {/* Retrato + racha */}
          <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:12}}>
            <div style={{flexShrink:0,width:64,height:64,border:'2px solid #6fd0ff',background:'#06101e',position:'relative',overflow:'hidden'}}>
              <canvas ref={canvasRef} width={64} height={64} style={{display:'block',imageRendering:'pixelated'}}/>
              <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.12) 3px,rgba(0,0,0,0.12) 4px)',pointerEvents:'none'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:6,color:'#7fa8c7',letterSpacing:2,marginBottom:5}}>RACHA ACTUAL</div>
              <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                <span style={{fontSize:38,color:'#ffcf4d',textShadow:'2px 2px 0 #8b5c00',lineHeight:1}}>{displayNum}</span>
                <span style={{fontSize:6,color:'#7fa8c7'}}>DÍAS</span>
              </div>
              <div style={{fontSize:5,color:'#7fa8c7',letterSpacing:1,margin:'7px 0 4px'}}>SIGUIENTE HITO</div>
              <div style={{height:8,background:'#0a1a2e',border:'1px solid #1a4060',overflow:'hidden'}}>
                <div style={{height:'100%',width:progW+'%',background:'linear-gradient(90deg,#3fc9ff,#b06bff)',transition:'width 1.2s ease'}}/>
              </div>
            </div>
          </div>

          {/* Tablero serpenteante */}
          <div style={{fontSize:5.5,color:'#3fc9ff',letterSpacing:2,marginBottom:6,textAlign:'center'}}>◆ CAMINO DEL CAZADOR</div>
          <div style={{position:'relative',marginBottom:12}}>
            <div ref={boardRef} style={{display:'grid',gridTemplateColumns:`repeat(${COLS},1fr)`,gap:3}}>
              {cellEls}
            </div>
            <div ref={tokenRef} style={{position:'absolute',display:'none',zIndex:10,pointerEvents:'none',transform:'translate(-50%,-50%)'}}>
              <div style={{width:16,height:16,background:'#ffcf4d',border:'2px solid #fff',clipPath:'polygon(50% 0%,100% 50%,50% 100%,0% 50%)',boxShadow:'0 0 8px #ffcf4d',animation:'tokenSpin .6s linear infinite'}}/>
            </div>
          </div>

          {/* Diálogo typewriter */}
          <div style={{background:'#060e18',border:'2px solid #6fd0ff',outline:'1px solid #1a4060',outlineOffset:'-3px',padding:'9px 12px',marginBottom:10,minHeight:44,position:'relative'}}>
            <div style={{fontSize:6,color:'#3fc9ff',letterSpacing:1,marginBottom:5}}>{getStreakMsg(streak).name}</div>
            <div style={{fontSize:6.5,color:'#dff1ff',lineHeight:2.2,letterSpacing:.5}}>{msgText}</div>
            {showClose && <span style={{position:'absolute',bottom:6,right:10,fontSize:7,color:'#ffcf4d',animation:'blink .6s step-end infinite'}}>▼</span>}
          </div>

          {/* Próximas tareas */}
          {upcoming.length>0&&(<>
            <div style={{fontSize:5.5,color:'#ffcf4d',letterSpacing:2,marginBottom:7,display:'flex',alignItems:'center',gap:6}}>
              <span style={{flex:1,height:1,background:'rgba(255,207,77,0.2)',display:'block'}}/>PRÓXIMAS MISIONES<span style={{flex:1,height:1,background:'rgba(255,207,77,0.2)',display:'block'}}/>
            </div>
            {upcoming.map(t=>{
              const diff=Math.round((new Date(t.date+'T12:00:00')-new Date(today+'T12:00:00'))/86400000);
              const {t:wt,c:wc}=getDiff(diff);
              return (<div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',border:'1px solid #1a3050',background:'#060e18',marginBottom:3}}>
                <div style={{width:6,height:6,background:wc,clipPath:'polygon(50% 0%,100% 50%,50% 100%,0% 50%)',flexShrink:0}}/>
                <span style={{flex:1,fontSize:5.5,color:'#dff1ff',letterSpacing:.5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.name}</span>
                <span style={{fontSize:5,color:wc,flexShrink:0}}>{wt}</span>
              </div>);
            })}
          </>)}
          {upcoming.length===0&&<div style={{fontSize:5.5,color:'#7fa8c7',textAlign:'center',padding:'6px 0',letterSpacing:1}}>SIN EVENTOS PRÓXIMOS</div>}

          {/* Botón */}
          <button onClick={onClose} style={{width:'100%',background:'linear-gradient(180deg,#0d2240,#091828)',border:'2px solid #6fd0ff',color:'#3fc9ff',fontFamily:"'Press Start 2P',monospace",fontSize:7,letterSpacing:2,padding:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:10,opacity:showClose?1:0,transition:'opacity .3s'}}>
            COMENZAR EL DÍA <span style={{color:'#ffcf4d',animation:'arrowBounce .5s ease-in-out infinite alternate'}}>►</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streakPopup, setStreakPopup] = useState(false);
  const [tab, setTab] = useState("objectives");
  const [chPeriod, setChPeriod] = useState("week");
  const [objPeriod, setObjPeriod] = useState("day");
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => Math.max(2026, new Date().getFullYear()));
  const [yearPicker, setYearPicker] = useState(false);
  const [floats, setFloats] = useState([]);
  const [popup, setPopup] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formsEdit, setFormsEdit] = useState(false);
  const [adding, setAdding] = useState(null);
  const [draft, setDraft] = useState({ name: "", diff: "D", target: "", unit: "" });
  const [editingName, setEditingName] = useState(false);
  const [taskDraft, setTaskDraft] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [taskEditMode, setTaskEditMode] = useState(false);
  const [pickedTask, setPickedTask] = useState(null);
  const [catDraft, setCatDraft] = useState({ name: "", color: CAT_RANKS[0].color, icon: CAT_ICONS[0], customIcon: null, dotColor: CAT_COLORS[0] });
  const [addingCat, setAddingCat] = useState(false);
  const [catEditMode, setCatEditMode] = useState(false);
  const [editingThresh, setEditingThresh] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const editCatFileInput = useRef(null);
  const editCatPending = useRef(null);
  const [draftCat, setDraftCat] = useState(null);
  const [calFilter, setCalFilter] = useState("all");
  const [achFilter, setAchFilter] = useState("all");
  const [achModal, setAchModal] = useState(null);
  const catFileInput = useRef(null);
  const prevDayColor = useRef({});
  const prevLevel = useRef(null);
  const prevStage = useRef(null);
  const suppress = useRef(false);
  const fileInput = useRef(null);
  const pendingImg = useRef(null);
  const musicRef = useRef(null);
  const musicFileInput = useRef(null);
  const startedMusic = useRef(false);
  const KEY = "el-sistema-save-v3";
  const MUSIC_KEY = "el-sistema-music-v1";
  const [customMusic, setCustomMusic] = useState(null);
  const [musicStatus, setMusicStatus] = useState("");

  useEffect(() => {
    (async () => {
      try { const saved = localStorage.getItem(KEY); setData(normalize(saved ? { ...DEFAULT_DATA, ...JSON.parse(saved) } : DEFAULT_DATA)); }
      catch { setData(normalize(DEFAULT_DATA)); }
      try { const m = localStorage.getItem(MUSIC_KEY); if (m) setCustomMusic(m); } catch (e) {}
      setLoading(false);
      // Mostrar popup de racha una vez al día
      const todayKey = 'el-sistema-popup-' + new Date().toISOString().slice(0,10);
      if (!localStorage.getItem(todayKey)) {
        localStorage.setItem(todayKey,'1');
        setTimeout(()=>setStreakPopup(true), 900);
      }
    })();
  }, []);
  useEffect(() => { if (loading || !data) return; try { const { customMusic: _cm, ...rest } = data; localStorage.setItem(KEY, JSON.stringify(rest)); } catch (e) {} }, [data, loading]);
  // Escucha actualizaciones del SW y recarga para coger la nueva versión
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e) => { if (e.data?.type === 'SW_UPDATED') window.location.reload(); };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);
  // sincroniza el multiplicador global de efectos
  useEffect(() => { if (data) setSfxVol(data.soundOn !== false ? (data.sfxVol ?? 0.7) : 0); }, [data]);
  // gestión de la música de fondo
  const musicSrc = customMusic || "bgm.mp3";
  const musicCfg = useRef({ on: true, vol: 0.4 });
  useEffect(() => { if (data) musicCfg.current = { on: data.musicOn !== false, vol: data.musicVol ?? 0.4 }; }, [data && data.musicOn, data && data.musicVol]);
  // aplica volumen / play / pause cuando cambian los ajustes
  useEffect(() => {
    const el = musicRef.current; if (!el || !data) return;
    el.volume = Math.max(0, Math.min(1, data.musicVol ?? 0.4));
    if (data.musicOn !== false && startedMusic.current) { el.play().catch(() => {}); } else if (data.musicOn === false) { el.pause(); }
  }, [data && data.musicOn, data && data.musicVol, customMusic]);
  // arranca la música tras la primera interacción (requisito de los navegadores) — se registra UNA sola vez
  useEffect(() => {
    const start = () => {
      const el = musicRef.current;
      if (el && musicCfg.current.on) {
        el.volume = musicCfg.current.vol;
        el.play().then(() => { startedMusic.current = true; }).catch(() => {});
      }
      startedMusic.current = true;
      ["pointerdown", "touchstart", "click", "keydown"].forEach((ev) => window.removeEventListener(ev, start));
    };
    ["pointerdown", "touchstart", "click", "keydown"].forEach((ev) => window.addEventListener(ev, start, { once: false }));
    return () => ["pointerdown", "touchstart", "click", "keydown"].forEach((ev) => window.removeEventListener(ev, start));
  }, []);
  const onMusicFile = async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; const reader = new FileReader(); reader.onload = () => { const url = reader.result; try { localStorage.setItem(MUSIC_KEY, url); setCustomMusic(url); startedMusic.current = true; setTimeout(() => { const el = musicRef.current; if (el) { el.load(); el.play().catch(() => {}); } }, 100); } catch (err) { alert("El archivo es demasiado grande para guardarse. Prueba uno más corto o ligero."); } }; reader.readAsDataURL(f); };
  const clearCustomMusic = () => { try { localStorage.removeItem(MUSIC_KEY); } catch (e) {} setCustomMusic(null); setTimeout(() => { const el = musicRef.current; if (el) { el.load(); if (data.musicOn !== false) el.play().catch(() => {}); } }, 100); };

  // aplica el tema de color antes de renderizar (recolorea el objeto C global)
  if (data) applyTheme(data.themeAccent, data.themeBg); else applyTheme(C_DEFAULT.cyan, C_DEFAULT.bg);
  const base = data ? (data.expBase ?? 80) : 80;
  const step = data ? (data.expStep ?? 40) : 40;
  const stages = data ? effStages(data) : STAGES;
  const total = data ? totalExpOf(data) : 0;
  const info = levelInfoOf(total, base, step);
  const rank = rankFor(info.level);
  const stageIdx = stageIndexFor(info.level, stages);
  const stage = stages[stageIdx];
  const sound = data ? data.soundOn !== false : true;
  const music = data ? data.musicOn !== false : true;
  const musicVol = data ? (data.musicVol ?? 0.4) : 0.4;
  const sfxVol = data ? (data.sfxVol ?? 0.7) : 0.7;

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
  // ---- FORMAS: añadir / eliminar / reordenar ----
  const addStage = () => { suppress.current = true; setData((d) => { const st = ensureStages(d); const last = st[st.length - 1]; const nextMin = (last ? last.min : 1) + 5; st.push({ name: "NUEVA FORMA", min: nextMin, hair: "#e6f0f7", hairShade: "#9fc4dd", aura: "#cfe9ff", particles: 10, lightning: true, img: null }); return { ...d, stages: st }; }); };
  const deleteStage = (i) => { suppress.current = true; setData((d) => { let st = ensureStages(d); if (st.length <= 1) return d; st.splice(i, 1); return { ...d, stages: st }; }); };
  const moveStage = (i, dir) => { suppress.current = true; setData((d) => { const st = ensureStages(d); const j = i + dir; if (j < 0 || j >= st.length) return d; const a = st[i], b = st[j]; const am = a.min, bm = b.min; a.min = bm; b.min = am; st[i] = b; st[j] = a; return { ...d, stages: st }; }); };
  const editStageColor = (i, key, val) => editStage(i, { [key]: val });

  if (loading || !data) return (<div style={{ ...bdyFont, background: C.bg, color: C.cyan, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><style>{CSS}</style><div style={{ ...pxFont, fontSize: 12, animation: "flicker 1s infinite" }}>CARGANDO EL SISTEMA...</div></div>);

  const today = todayStr();
  const doneToday = data.habits.filter((h) => (h.done || []).includes(today)).length;
  const allDone = data.habits.length > 0 && doneToday === data.habits.length;
  const streak = currentStreak(data.habits);

  const habitDone = (h) => h.repeat === false ? (h.done || []).length > 0 : (h.done || []).includes(today);
  const toggleHabit = (id) => {
    const h = data.habits.find((x) => x.id === id);
    const willComplete = !(h.done || []).includes(today);
    const th = data.dayThresholds || { gold: 400, red: 800 };
    const before = expOnDay(data.habits, today);
    const after = willComplete ? before + h.exp : before - h.exp;
    setData((d) => ({ ...d, habits: d.habits.map((x) => x.id !== id ? x : (x.done || []).includes(today) ? { ...x, done: x.done.filter((q) => q !== today) } : { ...x, done: [...(x.done || []), today] }) }));
    if (willComplete) {
      pushFloat(`+${h.exp} EXP`, C.gold);
      if (before < th.red && after >= th.red) { if (sound) sfx.redDay(); pushFloat("🔥 DÍA LEGENDARIO 🔥", C.red); }
      else if (before < th.gold && after >= th.gold) { if (sound) sfx.goldDay(); pushFloat("✦ DÍA DORADO ✦", C.gold); }
      else if (sound) sfx.blip();
    }
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
    else if (sound) sfx.step();
  };
  const deleteHabit = (id) => { if (sound) sfx.del(); setData((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id) })); };
  const editHabit = (id, patch) => setData((d) => ({ ...d, habits: d.habits.map((h) => h.id === id ? { ...h, ...patch } : h) }));
  const editChallenge = (id, patch) => setData((d) => ({ ...d, challenges: d.challenges.map((c) => c.id === id ? { ...c, ...patch } : c) }));
  const editTask = (id, patch) => setData((d) => ({ ...d, tasks: (d.tasks || []).map((t) => t.id === id ? { ...t, ...patch } : t) }));
  const editCategory = (id, patch) => setData((d) => ({ ...d, categories: (d.categories || []).map((c) => c.id === id ? { ...c, ...patch } : c) }));
  const deleteChallenge = (id) => { if (sound) sfx.del(); setData((d) => ({ ...d, challenges: d.challenges.filter((c) => c.id !== id) })); };
  const addQuest = () => { if (!draft.name.trim()) return; setData((d) => ({ ...d, habits: [...d.habits, { id: "h" + Date.now(), name: draft.name.trim(), diff: draft.diff, exp: DIFF[draft.diff].exp, done: [], category: draftCat, repeat: draft.repeat !== false }] })); setDraft({ name: "", diff: "D", target: "", unit: "" }); setDraftCat(null); setAdding(null); if (sound) sfx.add(); };
  const addChallenge = () => { if (!draft.name.trim() || !draft.target) return; const per = objPeriod !== "day" ? objPeriod : chPeriod; setData((d) => ({ ...d, challenges: [...d.challenges, { id: "c" + Date.now(), name: draft.name.trim(), period: per, current: 0, target: Math.max(1, parseInt(draft.target) || 1), unit: draft.unit.trim() || "ud", exp: PERIODS[per].exp, periodKey: periodKey(per), done: false, category: draftCat, repeat: draft.repeat !== false }] })); setDraft({ name: "", diff: "D", target: "", unit: "" }); setDraftCat(null); setAdding(null); if (sound) sfx.add(); };
  // ---- TAREAS (sin EXP, libreta) ----
  const addTask = (date = null) => { if (!taskDraft.trim()) return; setData((d) => ({ ...d, tasks: [...(d.tasks || []), { id: "t" + Date.now(), name: taskDraft.trim(), done: false, date, category: draftCat }] })); setTaskDraft(""); setDraftCat(null); setAddingTask(false); if (sound) sfx.add(); };
  const toggleTask = (id) => { let nowDone = false; setData((d) => ({ ...d, tasks: (d.tasks || []).map((t) => { if (t.id !== id) return t; nowDone = !t.done; return { ...t, done: !t.done, completedDate: !t.done ? todayStr() : null }; }) })); if (sound) { if (nowDone) sfx.taskDone(); else sfx.undo(); } };
  const deleteTask = (id) => { if (sound) sfx.del(); setData((d) => ({ ...d, tasks: (d.tasks || []).filter((t) => t.id !== id) })); };
  const setTaskDate = (id, date) => setData((d) => ({ ...d, tasks: (d.tasks || []).map((t) => t.id === id ? { ...t, date } : t) }));
  const pickTaskForCalendar = (task) => { setPickedTask(task); setTab("calendar"); if (sound) sfx.tick(); };
  const dropTaskOnDay = (date) => { if (!pickedTask) return; setTaskDate(pickedTask.id, date); setPickedTask(null); if (sound) sfx.blip(); pushFloat("📅 TAREA ASIGNADA", C.cyan); };
  // ---- CATEGORÍAS ----
  const addCategory = () => { if (!catDraft.name.trim()) return; setData((d) => ({ ...d, categories: [...(d.categories || []), { id: "cat" + Date.now(), name: catDraft.name.trim(), icon: catDraft.customIcon ? null : catDraft.icon, customIcon: catDraft.customIcon || null, dotColor: catDraft.dotColor || CAT_COLORS[0], thresholds: null }] })); setCatDraft({ name: "", color: CAT_RANKS[0].color, icon: CAT_ICONS[0], customIcon: null, dotColor: CAT_COLORS[0] }); setAddingCat(false); if (sound) sfx.add(); };
  const deleteCategory = (id) => { if (sound) sfx.del(); return setData((d) => ({ ...d, categories: (d.categories || []).filter((c) => c.id !== id), habits: d.habits.map((h) => h.category === id ? { ...h, category: null } : h), challenges: d.challenges.map((c) => c.category === id ? { ...c, category: null } : c), tasks: (d.tasks || []).map((t) => t.category === id ? { ...t, category: null } : t) })); };
  const pickCatIcon = () => { catFileInput.current && catFileInput.current.click(); };
  const onCatFile = async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; try { const url = await fileToDataURL(f, 96); setCatDraft((c) => ({ ...c, customIcon: url })); } catch (err) {} };
  const onEditCatFile = async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; const id = editCatPending.current; editCatPending.current = null; if (!f || !id) return; try { const url = await fileToDataURL(f, 96); editCategory(id, { customIcon: url, icon: null }); } catch (err) {} };
  const setCatThreshold = (catId, rankIdx, val) => { setData((d) => { const gTh = d.catThresholds || CAT_DEFAULT_THRESHOLDS; return { ...d, categories: (d.categories || []).map((c) => { if (c.id !== catId) return c; const base = (c.thresholds && c.thresholds.length === 6) ? [...c.thresholds] : [...gTh]; base[rankIdx] = Math.max(rankIdx === 0 ? 0 : base[rankIdx - 1] + 1, parseInt(val) || 0); return { ...c, thresholds: base }; }) }; }); };
  const resetCatThreshold = (catId) => setData((d) => ({ ...d, categories: (d.categories || []).map((c) => c.id === catId ? { ...c, thresholds: null } : c) }));
  const setGlobalCatThreshold = (rankIdx, val) => setData((d) => { const base = (d.catThresholds && d.catThresholds.length === 6) ? [...d.catThresholds] : [...CAT_DEFAULT_THRESHOLDS]; base[rankIdx] = Math.max(rankIdx === 0 ? 0 : base[rankIdx - 1] + 1, parseInt(val) || 0); return { ...d, catThresholds: base }; });
  const setThreshold = (key, val) => { suppress.current = true; setData((d) => ({ ...d, dayThresholds: { ...(d.dayThresholds || { gold: 400, red: 800 }), [key]: Math.max(0, parseInt(val) || 0) } })); };

  const lbl = { ...pxFont, fontSize: 9, letterSpacing: 1, color: C.textDim };
  const secTitle = { ...pxFont, fontSize: 11, color: C.cyan, textShadow: `0 0 8px ${C.glow}`, letterSpacing: 1 };
  const btnPx = { ...pxFont, fontSize: 9, padding: "10px 12px", background: "rgba(63,201,255,.08)", border: `1px solid ${C.cyan}66`, color: C.cyan, cursor: "pointer", letterSpacing: 1 };
  const inp = { ...bdyFont, fontSize: 20, width: "100%", padding: "8px 10px", background: "rgba(0,0,0,.5)", border: `1px solid ${C.cyan}55`, color: C.text, outline: "none" };

  const periodChallenges = data.challenges.filter((c) => c.period === chPeriod);
  const _cy = new Date().getFullYear(); const periodLabelNow = chPeriod === "week" ? `Semana ${isoWeek(new Date())[1]} · ${_cy}` : chPeriod === "month" ? `${MONTHS_ES[new Date().getMonth()]} ${_cy}` : `Año ${_cy}`;
  const cats = data.categories || [];
  const catById = (id) => cats.find((c) => c.id === id) || null;
  const CategoryPicker = () => cats.length === 0 ? (
    <div style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginTop: 10 }}>Crea categorías en ◈ ESTADO para poder asignarlas.</div>
  ) : (
    <div style={{ marginTop: 10 }}>
      <div style={{ ...lbl, marginBottom: 6 }}>CATEGORÍA</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => setDraftCat(null)} style={{ ...pxFont, fontSize: 8, padding: "7px 9px", cursor: "pointer", background: draftCat === null ? `${C.textDim}33` : "rgba(0,0,0,.4)", border: `1px solid ${C.textDim}66`, color: C.textDim }}>NINGUNA</button>
        {cats.map((c) => (<button key={c.id} onClick={() => setDraftCat(c.id)} style={{ display: "flex", alignItems: "center", gap: 5, ...pxFont, fontSize: 8, padding: "7px 9px", cursor: "pointer", background: draftCat === c.id ? `${C.cyan}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}${draftCat === c.id ? "" : "55"}`, color: C.text, boxShadow: draftCat === c.id ? `0 0 8px ${C.cyan}66` : "none" }}><CatIcon cat={c} size={16} />{c.name}</button>))}
      </div>
    </div>
  );
  // Chips de categoría que actúan sobre un valor/callback (para editar items existentes)
  const CatChips = ({ value, onPick }) => cats.length === 0 ? null : (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      <button onClick={() => onPick(null)} style={{ ...pxFont, fontSize: 8, padding: "6px 8px", cursor: "pointer", background: value == null ? `${C.textDim}33` : "rgba(0,0,0,.4)", border: `1px solid ${C.textDim}66`, color: C.textDim }}>NINGUNA</button>
      {cats.map((c) => (<button key={c.id} onClick={() => onPick(c.id)} style={{ display: "flex", alignItems: "center", gap: 5, ...pxFont, fontSize: 8, padding: "6px 8px", cursor: "pointer", background: value === c.id ? `${C.cyan}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}${value === c.id ? "" : "55"}`, color: C.text }}><CatIcon cat={c} size={14} />{c.name}</button>))}
    </div>
  );

  return (
    <div style={{ ...bdyFont, background: C.bg, minHeight: "100vh", color: C.text, position: "relative", overflow: "hidden", "--glow": C.glow, "--glowin": C.glow.replace("0.55", "0.14") }}>
      {streakPopup && data && <StreakPopup streak={Math.max(1, streak)} tasks={data.tasks || []} stage={stage} onClose={() => setStreakPopup(false)} />}
      <style>{CSS}</style>
      <input ref={fileInput} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      <input ref={catFileInput} type="file" accept="image/*" onChange={onCatFile} style={{ display: "none" }} />
      <input ref={editCatFileInput} type="file" accept="image/*" onChange={onEditCatFile} style={{ display: "none" }} />
      <input ref={musicFileInput} type="file" accept="audio/*" onChange={onMusicFile} style={{ display: "none" }} />
      <audio ref={musicRef} src={musicSrc} loop preload="auto" playsInline />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(63,201,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(63,201,255,.05) 1px,transparent 1px)", backgroundSize: "46px 46px", animation: "grid 9s linear infinite", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 50% 0%,rgba(63,201,255,.1),transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0,rgba(0,0,0,.16) 1px,transparent 2px,transparent 4px)", pointerEvents: "none", zIndex: 50 }} />

      <div style={{ position: "fixed", top: 110, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 60, pointerEvents: "none" }}>
        {floats.map((f) => <div key={f.id} style={{ ...pxFont, fontSize: 10, color: f.color, textShadow: `0 0 10px ${f.color}`, animation: "floatUp 1.1s ease-out forwards", textAlign: "center" }}>{f.text}</div>)}
      </div>

      <div style={{ position: "relative", zIndex: 10, maxWidth: 540, margin: "0 auto", padding: "0 14px 96px" }}>
        {/* STATUS STRIP */}
        {tab !== "objectives" && (
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
        )}

        {/* MISIONES */}
        {tab === "objectives" && (
          <div style={{ marginTop: 8, animation: "appear .4s both" }}>
            <Panel pulse accent={stage.aura} style={{ padding: "14px 16px 16px", marginBottom: 14, textAlign: "center", position: "relative" }}>
              <button onClick={() => setData((d) => ({ ...d, soundOn: !sound }))} style={{ position: "absolute", top: 10, right: 10, zIndex: 5, background: "transparent", border: `1px solid ${C.cyan}44`, color: sound ? C.cyan : C.textDim, fontSize: 14, width: 30, height: 30, cursor: "pointer" }}>{sound ? "🔊" : "🔇"}</button>
              <Avatar stage={stage} size={140} />
              <div style={{ ...pxFont, fontSize: 12, color: stage.aura, textShadow: `0 0 12px ${stage.aura}`, marginTop: 6 }}>{stage.name}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, alignItems: "baseline", marginTop: 6 }}>
                <span style={{ ...pxFont, fontSize: 10, color: C.text }}>NIVEL {info.level}</span>
                <span style={{ ...bdyFont, fontSize: 17, color: streak > 0 ? C.gold : C.textDim }}>🔥 {streak}</span>
              </div>
              <div style={{ marginTop: 10 }}><ExpBar progress={info.progress} color={stage.aura} height={14} /></div>
              <div style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginTop: 4 }}>{info.currentExp} / {info.neededExp} EXP</div>
            </Panel>
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              {[["day", "DIARIO", C.green], ["week", "SEMANAL", C.cyan], ["month", "MENSUAL", C.purple], ["year", "ANUAL", C.gold]].map(([k, label, col]) => (<button key={k} onClick={() => { setObjPeriod(k); setAdding(null); if (sound) sfx.nav(); }} style={{ ...pxFont, fontSize: 7.5, padding: "9px 3px", flex: 1, cursor: "pointer", background: objPeriod === k ? `${col}22` : "rgba(0,0,0,.4)", border: `1px solid ${col}${objPeriod === k ? "" : "55"}`, color: col, boxShadow: objPeriod === k ? `0 0 8px ${col}66` : "none" }}>{label}</button>))}
            </div>
            {objPeriod === "day" && (<>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span style={secTitle}>⚔ MISIONES DIARIAS</span><span style={{ ...bdyFont, fontSize: 16, color: C.textDim }}>{doneToday}/{data.habits.length}</span></div>
            {allDone && <div style={{ textAlign: "center", marginBottom: 12, ...pxFont, fontSize: 9, color: C.green, textShadow: `0 0 10px ${C.green}`, animation: "flicker 1.5s infinite" }}>✦ DÍA COMPLETADO ✦</div>}
            {(() => {
              // Agrupa hábitos por categoría
              const groups = [];
              const withCat = data.habits.filter(h => h.category && catById(h.category));
              const withoutCat = data.habits.filter(h => !h.category || !catById(h.category));
              const catsSeen = [];
              withCat.forEach(h => { if (!catsSeen.includes(h.category)) catsSeen.push(h.category); });
              catsSeen.forEach(cid => {
                const cat = catById(cid);
                const col = cat.dotColor || C.cyan;
                groups.push({ cat, col, habits: withCat.filter(h => h.category === cid) });
              });
              if (withoutCat.length) groups.push({ cat: null, col: C.cyanDim, habits: withoutCat });
              return groups.map(({ cat, col, habits: gh }, gi) => (
                <div key={cat ? cat.id : 'none'} style={{ marginBottom: 14 }}>
                  {cat && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${col}44` }}>
                      <CatIcon cat={cat} size={14} />
                      <span style={{ ...pxFont, fontSize: 7, color: col, letterSpacing: 1 }}>{cat.name}</span>
                      <span style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginLeft: "auto" }}>{gh.filter(h => habitDone(h)).length}/{gh.length}</span>
                    </div>
                  )}
                  {gh.map((h, i) => {
                    const done = habitDone(h); const dcol = DIFF[h.diff]?.color || C.cyan; const isEd = editingItem === "h" + h.id;
                    return (<div key={h.id} style={{ background: cat ? `${col}0d` : "transparent", border: `1px solid ${done ? C.green : col}33`, borderRadius: 4, padding: 10, marginBottom: 8, animation: `appear .4s ${(gi * 3 + i) * 0.04}s both` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button onClick={() => toggleHabit(h.id)} style={{ width: 32, height: 32, flexShrink: 0, cursor: "pointer", background: done ? `${C.green}22` : "rgba(0,0,0,.4)", border: `2px solid ${done ? C.green : col}`, color: done ? C.green : "transparent", boxShadow: done ? `0 0 10px ${C.green}` : "none", ...pxFont, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...bdyFont, fontSize: 20, lineHeight: 1.1, color: done ? C.textDim : C.text, textDecoration: done ? "line-through" : "none" }}>{h.name}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
                            <span style={{ ...pxFont, fontSize: 7, color: dcol, border: `1px solid ${dcol}66`, padding: "2px 4px" }}>{DIFF[h.diff]?.label}</span>
                            <span style={{ ...bdyFont, fontSize: 15, color: C.gold }}>+{h.exp} EXP</span>
                            {h.repeat === false && <span style={{ ...pxFont, fontSize: 6.5, color: C.textDim, border: `1px solid ${C.textDim}66`, padding: "2px 4px" }}>1 VEZ</span>}
                          </div>
                        </div>
                        {editMode && <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <button onClick={() => setEditingItem(isEd ? null : "h" + h.id)} style={{ ...pxFont, fontSize: 11, background: isEd ? `${C.gold}22` : "transparent", border: `1px solid ${C.gold}66`, color: C.gold, cursor: "pointer", padding: 5 }}>✎</button>
                          <button onClick={() => deleteHabit(h.id)} style={{ ...pxFont, fontSize: 11, background: "transparent", border: "none", color: C.red, cursor: "pointer", padding: 5 }}>✕</button>
                        </div>}
                      </div>
                      {editMode && isEd && (<div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                        <div style={{ ...lbl, marginBottom: 6 }}>NOMBRE</div>
                        <input style={inp} value={h.name} onChange={(e) => editHabit(h.id, { name: e.target.value })} />
                        <div style={{ ...lbl, margin: "10px 0 6px" }}>DIFICULTAD</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{Object.entries(DIFF).map(([k, v]) => (<button key={k} onClick={() => editHabit(h.id, { diff: k, exp: v.exp })} style={{ ...pxFont, fontSize: 8, padding: "7px 9px", cursor: "pointer", flex: "1 1 0", minWidth: 64, background: h.diff === k ? `${v.color}22` : "rgba(0,0,0,.4)", border: `1px solid ${v.color}${h.diff === k ? "" : "55"}`, color: v.color }}>{v.label}<br /><span style={{ opacity: 0.8 }}>+{v.exp}</span></button>))}</div>
                        <div style={{ ...lbl, margin: "10px 0 6px" }}>REPETICIÓN</div>
                        <div style={{ display: "flex", gap: 6 }}><button onClick={() => editHabit(h.id, { repeat: true })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", flex: 1, cursor: "pointer", background: h.repeat !== false ? `${C.green}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.green}${h.repeat !== false ? "" : "55"}`, color: C.green }}>CADA DÍA</button><button onClick={() => editHabit(h.id, { repeat: false })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", flex: 1, cursor: "pointer", background: h.repeat === false ? `${C.gold}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.gold}${h.repeat === false ? "" : "55"}`, color: C.gold }}>UNA VEZ</button></div>
                        <div style={{ ...lbl, margin: "10px 0 2px" }}>CATEGORÍA</div>
                        <CatChips value={h.category} onPick={(id) => editHabit(h.id, { category: id })} />
                        <button onClick={() => setEditingItem(null)} style={{ ...btnPx, width: "100%", marginTop: 12, background: `${C.cyan}22` }}>LISTO</button>
                      </div>)}
                    </div>);
                  })}
                </div>
              ));
            })()}
            {adding === "quest" ? (<Panel style={{ padding: 14, marginTop: 4 }}><div style={{ ...lbl, marginBottom: 6 }}>NUEVA MISIÓN DIARIA</div><input style={inp} placeholder="Nombre del hábito..." value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>{Object.entries(DIFF).map(([k, v]) => (<button key={k} onClick={() => setDraft({ ...draft, diff: k })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", cursor: "pointer", flex: "1 1 0", minWidth: 70, background: draft.diff === k ? `${v.color}22` : "rgba(0,0,0,.4)", border: `1px solid ${v.color}${draft.diff === k ? "" : "55"}`, color: v.color, boxShadow: draft.diff === k ? `0 0 8px ${v.color}66` : "none" }}>{v.label}<br /><span style={{ opacity: 0.8 }}>+{v.exp}</span></button>))}</div><div style={{ ...lbl, margin: "10px 0 6px" }}>REPETICIÓN</div><div style={{ display: "flex", gap: 6 }}><button onClick={() => setDraft({ ...draft, repeat: true })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", flex: 1, cursor: "pointer", background: draft.repeat !== false ? `${C.green}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.green}${draft.repeat !== false ? "" : "55"}`, color: C.green }}>CADA DÍA</button><button onClick={() => setDraft({ ...draft, repeat: false })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", flex: 1, cursor: "pointer", background: draft.repeat === false ? `${C.gold}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.gold}${draft.repeat === false ? "" : "55"}`, color: C.gold }}>UNA VEZ</button></div><CategoryPicker /><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={addQuest} style={{ ...btnPx, flex: 1, background: `${C.cyan}22` }}>AÑADIR</button><button onClick={() => { setAdding(null); setDraft({ name: "", diff: "D", target: "", unit: "" }); setDraftCat(null); }} style={{ ...btnPx, color: C.textDim, borderColor: `${C.textDim}66` }}>CANCELAR</button></div></Panel>) : (<button onClick={() => { setAdding("quest"); if (sound) sfx.open(); }} style={{ ...btnPx, width: "100%", marginTop: 4, background: "rgba(63,201,255,.05)" }}>＋ NUEVA MISIÓN</button>)}
            <button onClick={() => { setEditMode((e) => !e); setEditingItem(null); }} style={{ ...btnPx, width: "100%", marginTop: 8, fontSize: 8, color: editMode ? C.gold : C.textDim, borderColor: editMode ? C.gold : `${C.textDim}55`, background: "transparent" }}>{editMode ? "✓ TERMINAR EDICIÓN" : "✎ EDITAR"}</button>
            </>)}
            {objPeriod !== "day" && (<>
            <div style={{ ...bdyFont, fontSize: 16, color: C.textDim, textAlign: "center", marginBottom: 12 }}>{objPeriod === "week" ? `Semana ${isoWeek(new Date())[1]} · ${new Date().getFullYear()}` : objPeriod === "month" ? `${MONTHS_ES[new Date().getMonth()]} ${new Date().getFullYear()}` : `Año ${new Date().getFullYear()}`}</div>
            {data.challenges.filter((c) => c.period === objPeriod).length === 0 && <div style={{ ...bdyFont, fontSize: 17, color: C.textDim, textAlign: "center", padding: "20px 0" }}>Sin retos {PERIODS[objPeriod].label.toLowerCase()} todavía.</div>}
            {data.challenges.filter((c) => c.period === objPeriod).map((c, i) => { const prog = c.target ? c.current / c.target : 0; const col = c.done ? C.gold : PERIODS[c.period].color; const isEd = editingItem === "c" + c.id; return (<Panel key={c.id} accent={col} style={{ padding: 14, marginBottom: 10, animation: `appear .4s ${i * 0.04}s both` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}><div style={{ ...bdyFont, fontSize: 21, color: C.text, lineHeight: 1.1 }}>{c.name}</div>{editMode && <div style={{ display: "flex", gap: 4 }}><button onClick={() => setEditingItem(isEd ? null : "c" + c.id)} style={{ ...pxFont, fontSize: 11, background: isEd ? `${C.gold}22` : "transparent", border: `1px solid ${C.gold}66`, color: C.gold, cursor: "pointer", padding: 4 }}>✎</button><button onClick={() => deleteChallenge(c.id)} style={{ ...pxFont, fontSize: 12, background: "transparent", border: "none", color: C.red, cursor: "pointer" }}>✕</button></div>}</div><div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}><span style={{ ...pxFont, fontSize: 7, color: col, border: `1px solid ${col}66`, padding: "2px 4px" }}>{PERIODS[c.period].label}</span><span style={{ ...bdyFont, fontSize: 14, color: C.gold }}>+{c.exp} EXP</span>{c.period === "week" && c.repeat !== false && <span style={{ ...pxFont, fontSize: 6.5, color: C.cyan, border: `1px solid ${C.cyan}66`, padding: "2px 4px" }}>↻ REPITE</span>}{c.done && <span style={{ ...pxFont, fontSize: 7, color: C.gold, textShadow: `0 0 6px ${C.gold}` }}>✦ LOGRADO</span>}{c.category && catById(c.category) && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, ...bdyFont, fontSize: 14, color: C.textDim }}><CatIcon cat={catById(c.category)} size={13} />{catById(c.category).name}</span>}</div><div style={{ margin: "10px 0 8px" }}><ExpBar progress={prog} color={col} height={14} /></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ ...bdyFont, fontSize: 18, color: col }}>{c.current} / {c.target} {c.unit}</span><div style={{ display: "flex", gap: 6 }}><button onClick={() => stepChallenge(c.id, -1)} style={{ ...pxFont, fontSize: 12, width: 36, height: 32, cursor: "pointer", background: "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}66`, color: C.cyan }}>−</button><button onClick={() => stepChallenge(c.id, 1)} style={{ ...pxFont, fontSize: 12, width: 36, height: 32, cursor: "pointer", background: `${C.cyan}22`, border: `1px solid ${C.cyan}`, color: C.cyan }}>＋</button></div></div>
              {editMode && isEd && (<div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                <div style={{ ...lbl, marginBottom: 6 }}>NOMBRE</div>
                <input style={inp} value={c.name} onChange={(e) => editChallenge(c.id, { name: e.target.value })} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}><div style={{ ...lbl, marginBottom: 4 }}>META</div><input style={inp} inputMode="numeric" value={c.target} onChange={(e) => editChallenge(c.id, { target: Math.max(1, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 1) })} /></div>
                  <div style={{ flex: 1 }}><div style={{ ...lbl, marginBottom: 4 }}>UNIDAD</div><input style={inp} value={c.unit} onChange={(e) => editChallenge(c.id, { unit: e.target.value })} /></div>
                </div>
                {c.period === "week" && (<><div style={{ ...lbl, margin: "10px 0 6px" }}>REPETICIÓN</div><div style={{ display: "flex", gap: 6 }}><button onClick={() => editChallenge(c.id, { repeat: true })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", flex: 1, cursor: "pointer", background: c.repeat !== false ? `${C.cyan}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}${c.repeat !== false ? "" : "55"}`, color: C.cyan }}>CADA SEMANA</button><button onClick={() => editChallenge(c.id, { repeat: false })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", flex: 1, cursor: "pointer", background: c.repeat === false ? `${C.gold}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.gold}${c.repeat === false ? "" : "55"}`, color: C.gold }}>UNA VEZ</button></div></>)}
                <div style={{ ...lbl, margin: "10px 0 2px" }}>CATEGORÍA</div>
                <CatChips value={c.category} onPick={(id) => editChallenge(c.id, { category: id })} />
                <button onClick={() => setEditingItem(null)} style={{ ...btnPx, width: "100%", marginTop: 12, background: `${C.cyan}22` }}>LISTO</button>
              </div>)}
            </Panel>); })}
            {adding === "challenge" ? (<Panel accent={PERIODS[objPeriod].color} style={{ padding: 14, marginTop: 4 }}><div style={{ ...lbl, marginBottom: 6 }}>NUEVO RETO {PERIODS[objPeriod].label}</div><input style={inp} placeholder="Nombre del reto..." value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><div style={{ display: "flex", gap: 8, marginTop: 10 }}><input style={{ ...inp, flex: 1 }} placeholder="Meta (nº)" inputMode="numeric" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value.replace(/[^0-9]/g, "") })} /><input style={{ ...inp, flex: 1 }} placeholder="Unidad" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></div>{objPeriod === "week" && (<><div style={{ ...lbl, margin: "10px 0 6px" }}>REPETICIÓN</div><div style={{ display: "flex", gap: 6 }}><button onClick={() => setDraft({ ...draft, repeat: true })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", flex: 1, cursor: "pointer", background: draft.repeat !== false ? `${C.cyan}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}${draft.repeat !== false ? "" : "55"}`, color: C.cyan }}>CADA SEMANA</button><button onClick={() => setDraft({ ...draft, repeat: false })} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", flex: 1, cursor: "pointer", background: draft.repeat === false ? `${C.gold}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.gold}${draft.repeat === false ? "" : "55"}`, color: C.gold }}>UNA VEZ</button></div></>)}<div style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginTop: 8 }}>Recompensa: +{PERIODS[objPeriod].exp} EXP</div><CategoryPicker /><div style={{ display: "flex", gap: 8, marginTop: 10 }}><button onClick={addChallenge} style={{ ...btnPx, flex: 1, color: PERIODS[objPeriod].color, borderColor: PERIODS[objPeriod].color, background: `${PERIODS[objPeriod].color}22` }}>AÑADIR</button><button onClick={() => { setAdding(null); setDraft({ name: "", diff: "D", target: "", unit: "" }); setDraftCat(null); }} style={{ ...btnPx, color: C.textDim, borderColor: `${C.textDim}66` }}>CANCELAR</button></div></Panel>) : (<button onClick={() => { setAdding("challenge"); if (sound) sfx.open(); }} style={{ ...btnPx, width: "100%", marginTop: 4, color: PERIODS[objPeriod].color, borderColor: `${PERIODS[objPeriod].color}66`, background: `${PERIODS[objPeriod].color}11` }}>＋ NUEVO RETO {PERIODS[objPeriod].label}</button>)}
            <button onClick={() => { setEditMode((e) => !e); setEditingItem(null); }} style={{ ...btnPx, width: "100%", marginTop: 8, fontSize: 8, color: editMode ? C.gold : C.textDim, borderColor: editMode ? C.gold : `${C.textDim}55`, background: "transparent" }}>{editMode ? "✓ TERMINAR EDICIÓN" : "✎ EDITAR"}</button>
            </>)}
          </div>
        )}


        {/* CALENDARIO */}
        {tab === "calendar" && (() => {
          const first = new Date(calYear, calMonth, 1); const startDow = (first.getDay() + 6) % 7; const ndays = new Date(calYear, calMonth + 1, 0).getDate();
          const cells = []; for (let i = 0; i < startDow; i++) cells.push(null); for (let d = 1; d <= ndays; d++) cells.push(d); while (cells.length % 7) cells.push(null);
          const th = data.dayThresholds || { gold: 400, red: 800 };
          let activeDays = 0; for (let d = 1; d <= ndays; d++) { const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; if (expOnDay(data.habits, ds) > 0) activeDays++; }
          const DAYCOL = { cyan: { bg: "63,201,255", glow: C.glow }, gold: { bg: "255,207,77", glow: C.gold }, red: { bg: "255,93,108", glow: C.red } };
          return (<div style={{ marginTop: 8, animation: "appear .4s both" }}>
            <div style={{ marginBottom: 12 }}><span style={secTitle}>▦ CALENDARIO {calYear}</span></div>
            {(() => {
              const todayStr = new Date().toISOString().slice(0,10);
              const upcoming = (data.tasks || []).filter(t => t.date && t.date >= todayStr && !t.done).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
              if (!upcoming.length) return null;
              return (<Panel style={{ padding: 12, marginBottom: 12 }}>
                <div style={{ ...pxFont, fontSize: 7, color: C.gold, letterSpacing: 1, marginBottom: 10 }}>◆ PRÓXIMAS MISIONES</div>
                {upcoming.map(t => {
                  const diff = Math.round((new Date(t.date+'T12:00:00') - new Date(todayStr+'T12:00:00'))/86400000);
                  const col = diff===0 ? C.gold : diff<=3 ? C.cyan : C.textDim;
                  const label = diff===0?'HOY':diff===1?'MAÑANA':`+${diff}d`;
                  const cat = t.category ? catById(t.category) : null;
                  return (<div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${C.line}` }}>
                    <div style={{ width:5,height:5,background:cat?.dotColor||col,borderRadius:'50%',flexShrink:0 }} />
                    <span style={{ ...bdyFont, fontSize:16, color:C.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</span>
                    <span style={{ ...pxFont, fontSize:6, color:col, flexShrink:0 }}>{label}</span>
                  </div>);
                })}
              </Panel>);
            })()}
            {pickedTask && (<Panel pulse accent={C.gold} style={{ padding: 12, marginBottom: 12 }}>
              <div style={{ ...pxFont, fontSize: 8, color: C.gold, marginBottom: 6 }}>🗓 ASIGNANDO TAREA</div>
              <div style={{ ...bdyFont, fontSize: 19, color: C.text, marginBottom: 4 }}>"{pickedTask.name}"</div>
              <div style={{ ...bdyFont, fontSize: 15, color: C.textDim, marginBottom: 10 }}>Toca el día donde quieres colocarla.</div>
              <button onClick={() => setPickedTask(null)} style={{ ...btnPx, width: "100%", fontSize: 8, color: C.textDim, borderColor: `${C.textDim}66`, background: "transparent" }}>CANCELAR</button>
            </Panel>)}
            <Panel style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><button onClick={() => { if (sound) sfx.nav(); if (calMonth === 0) { if (calYear > 2026) { setCalYear((y) => y - 1); setCalMonth(11); } } else setCalMonth((m) => m - 1); }} style={{ ...pxFont, fontSize: 12, width: 36, height: 32, cursor: "pointer", background: "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}66`, color: (calMonth === 0 && calYear === 2026) ? C.textDim : C.cyan }}>‹</button><button onClick={() => { setYearPicker((v) => !v); if (sound) sfx.open(); }} style={{ textAlign: "center", background: "transparent", border: "none", cursor: "pointer" }}><div style={{ ...pxFont, fontSize: 11, color: C.cyan, textShadow: `0 0 8px ${C.glow}` }}>{MONTHS_ES[calMonth].toUpperCase()}</div><div style={{ ...pxFont, fontSize: 8, color: yearPicker ? C.gold : C.textDim, marginTop: 3 }}>{calYear} ▾</div></button><button onClick={() => { if (sound) sfx.nav(); if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); } else setCalMonth((m) => m + 1); }} style={{ ...pxFont, fontSize: 12, width: 36, height: 32, cursor: "pointer", background: "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}66`, color: C.cyan }}>›</button></div>
              {yearPicker && (<div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>{Array.from({ length: 12 }).map((_, k) => { const y = 2026 + k; const active = y === calYear; return (<button key={y} onClick={() => { setCalYear(y); setYearPicker(false); if (sound) sfx.nav(); }} style={{ ...pxFont, fontSize: 9, padding: "9px 0", cursor: "pointer", background: active ? `${C.cyan}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}${active ? "" : "44"}`, color: active ? C.cyan : C.textDim, boxShadow: active ? `0 0 8px ${C.cyan}66` : "none" }}>{y}</button>); })}</div>)}
              {cats.length > 0 && (<div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => setCalFilter("all")} style={{ ...pxFont, fontSize: 7, padding: "6px 8px", cursor: "pointer", background: calFilter === "all" ? `${C.cyan}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}${calFilter === "all" ? "" : "44"}`, color: C.cyan }}>TODO</button>
                {cats.map((c) => (<button key={c.id} onClick={() => setCalFilter(c.id)} style={{ display: "flex", alignItems: "center", gap: 4, ...pxFont, fontSize: 7, padding: "6px 8px", cursor: "pointer", background: calFilter === c.id ? `${C.cyan}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}${calFilter === c.id ? "" : "44"}`, color: C.text }}><CatIcon cat={c} size={12} />{c.name}</button>))}
              </div>)}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {WD.map((w, i) => <div key={i} style={{ ...pxFont, fontSize: 7, color: C.textDim, textAlign: "center", paddingBottom: 4 }}>{w}</div>)}
                {cells.map((d, i) => { if (!d) return <div key={i} />; const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; const exp = expOnDay(data.habits, ds); const isToday = ds === today; const colKey = dayColorFor(exp, th); const lit = colKey !== null; const intensity = colKey === "cyan" ? Math.min(1, exp / Math.max(1, th.gold)) : 1; const dc = lit ? DAYCOL[colKey] : null; const fTasks = tasksOnDay(data.tasks, ds).filter((t) => calFilter === "all" || t.category === calFilter); const dayAch = (data.achievements || []).filter((a) => a.date === ds); const hasCrown = dayAch.some((a) => a.kind === "week" || a.kind === "month" || a.kind === "year"); const hasComet = !hasCrown && dayAch.some((a) => a.kind === "transform");
                  // construir lista de puntos: un punto por categoría presente (color), neutro si sin categoría
                  const seen = []; fTasks.forEach((t) => { const key = t.category || "_none"; if (!seen.find((s) => s.key === key)) { const cc = t.category ? catById(t.category) : null; seen.push({ key, color: cc ? (cc.dotColor || C.cyan) : "#8aa0b5", anyDone: false, anyPend: false }); } const slot = seen.find((s) => s.key === key); if (t.done) slot.anyDone = true; else slot.anyPend = true; });
                  const maxDots = 3; const shown = seen.slice(0, maxDots); const overflow = seen.length - maxDots;
                  return (<div key={i} onClick={() => pickedTask ? dropTaskOnDay(ds) : setPopup({ type: "day", date: ds })} style={{ position: "relative", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", ...bdyFont, fontSize: 16, borderRadius: 3, color: lit ? "#06121f" : C.textDim, fontWeight: lit ? "bold" : "normal", background: lit ? `rgba(${dc.bg},${0.35 + intensity * 0.65})` : "rgba(255,255,255,0.03)", boxShadow: pickedTask ? `0 0 8px ${C.gold}` : (lit ? `0 0 ${5 + intensity * 9}px ${dc.glow}` : "none"), border: pickedTask ? `2px solid ${C.gold}aa` : (isToday ? `2px solid ${C.gold}` : "1px solid rgba(63,201,255,0.08)") }}>{d}
                    {seen.length > 0 && <span style={{ position: "absolute", bottom: 1.5, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 2, alignItems: "center" }}>
                      {shown.map((s, k) => <span key={k} style={{ width: 5, height: 5, borderRadius: "50%", background: s.anyDone ? s.color : "transparent", border: `1.5px solid ${s.color}`, boxShadow: `0 0 3px ${s.color}` }} />)}
                      {overflow > 0 && <span style={{ ...pxFont, fontSize: 5, color: lit ? "#06121f" : C.textDim }}>+{overflow}</span>}
                    </span>}
                    {hasCrown && <span style={{ position: "absolute", top: -7, right: -3, fontSize: 11, filter: `drop-shadow(0 0 3px ${C.gold})` }}>👑</span>}{hasComet && <span style={{ position: "absolute", top: -5, right: -1, fontSize: 9 }}>☄</span>}</div>); })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}><span style={{ ...pxFont, fontSize: 8, color: C.textDim }}>DÍAS ACTIVOS</span><span style={{ ...bdyFont, fontSize: 18, color: C.cyan }}>{activeDays} / {ndays}</span></div>
            </Panel>
            <Panel style={{ padding: 12, marginTop: 12 }}>
              <div style={{ ...pxFont, fontSize: 8, color: C.textDim, marginBottom: 10 }}>LEYENDA</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 16, height: 16, borderRadius: 3, background: "rgba(63,201,255,.7)", flexShrink: 0 }} /><span style={{ ...bdyFont, fontSize: 15, color: C.textDim }}>Día con EXP (azul)</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 16, height: 16, borderRadius: 3, background: "rgba(255,207,77,.9)", flexShrink: 0 }} /><span style={{ ...bdyFont, fontSize: 15, color: C.textDim }}>{th.gold}+ EXP · día dorado</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 16, height: 16, borderRadius: 3, background: "rgba(255,93,108,.9)", flexShrink: 0 }} /><span style={{ ...bdyFont, fontSize: 15, color: C.textDim }}>{th.red}+ EXP · día legendario</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-flex", gap: 3, width: 16, justifyContent: "center", flexShrink: 0 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 3px ${C.cyan}` }} /></span><span style={{ ...bdyFont, fontSize: 15, color: C.textDim }}>Punto lleno = tarea hecha (color = categoría)</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-flex", gap: 3, width: 16, justifyContent: "center", flexShrink: 0 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "transparent", border: `1.5px solid ${C.cyan}` }} /></span><span style={{ ...bdyFont, fontSize: 15, color: C.textDim }}>Punto hueco = tarea pendiente</span></div>
              </div>
            </Panel>
          </div>);
        })()}

        {/* TAREAS */}
        {tab === "tasks" && (() => {
          const tasks = data.tasks || [];
          const pending = tasks.filter((t) => !t.done);
          const done = tasks.filter((t) => t.done);
          return (<div style={{ marginTop: 8, animation: "appear .4s both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={secTitle}>✎ LIBRETA</span>
              <span style={{ ...bdyFont, fontSize: 16, color: C.textDim }}>{done.length}/{tasks.length}</span>
            </div>
            <div style={{ ...bdyFont, fontSize: 15, color: C.textDim, marginBottom: 12, lineHeight: 1.3 }}>Tareas sueltas sin EXP. Asígnalas a un día o déjalas libres.</div>
            {addingTask ? (
              <Panel style={{ padding: 14, marginBottom: 10 }}>
                <div style={{ ...lbl, marginBottom: 6 }}>NUEVA TAREA</div>
                <input autoFocus style={inp} placeholder="Escribe la tarea..." value={taskDraft} onChange={(e) => setTaskDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask(null)} />
                <CategoryPicker />
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => addTask(null)} style={{ ...btnPx, flex: 1, background: `${C.cyan}22` }}>AÑADIR</button>
                  <button onClick={() => { setAddingTask(false); setTaskDraft(""); setDraftCat(null); }} style={{ ...btnPx, color: C.textDim, borderColor: `${C.textDim}66` }}>CANCELAR</button>
                </div>
              </Panel>
            ) : (<button onClick={() => { setAddingTask(true); if (sound) sfx.open(); }} style={{ ...btnPx, width: "100%", marginBottom: 12, background: "rgba(63,201,255,.05)" }}>＋ NUEVA TAREA</button>)}
            {pending.length === 0 && done.length === 0 && <div style={{ ...bdyFont, fontSize: 17, color: C.textDim, textAlign: "center", padding: "20px 0" }}>Sin tareas todavía. Añade la primera.</div>}
            {pending.map((t, i) => { const isEd = editingItem === "t" + t.id; return (<Panel key={t.id} accent={pickedTask?.id === t.id ? C.gold : C.cyanDim} style={{ padding: 12, marginBottom: 8, animation: `appear .4s ${i * 0.03}s both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => toggleTask(t.id)} style={{ width: 30, height: 30, flexShrink: 0, cursor: "pointer", background: "rgba(0,0,0,.4)", border: `2px solid ${C.cyan}`, color: "transparent", ...pxFont, fontSize: 12 }}>✓</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...bdyFont, fontSize: 20, lineHeight: 1.1, color: C.text }}>{t.name}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                    {t.date ? <span style={{ ...bdyFont, fontSize: 13, color: C.cyan }}>📅 {(() => { const [, m, dd] = t.date.split("-"); return `${parseInt(dd)} ${MONTHS_ES[parseInt(m) - 1]}`; })()}</span> : <span style={{ ...bdyFont, fontSize: 13, color: C.textDim }}>Sin día asignado</span>}
                    {t.category && catById(t.category) && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, ...bdyFont, fontSize: 13, color: C.textDim }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: catById(t.category).dotColor || C.cyan, boxShadow: `0 0 3px ${catById(t.category).dotColor || C.cyan}` }} />{catById(t.category).name}</span>}
                  </div>
                </div>
                <button onClick={() => pickTaskForCalendar(t)} title="Asignar a un día del calendario" style={{ ...pxFont, fontSize: 12, background: "rgba(63,201,255,.1)", border: `1px solid ${C.cyan}66`, color: C.cyan, cursor: "pointer", padding: "6px 7px" }}>🗓</button>
                {t.date && <a href={gcalLink(t)} target="_blank" rel="noopener noreferrer" title="Añadir a Google Calendar" style={{ ...pxFont, fontSize: 13, textDecoration: "none", cursor: "pointer", color: C.gold, padding: "4px 6px" }}>📤</a>}
                {taskEditMode && <button onClick={() => setEditingItem(isEd ? null : "t" + t.id)} style={{ ...pxFont, fontSize: 11, background: isEd ? `${C.gold}22` : "transparent", border: `1px solid ${C.gold}66`, color: C.gold, cursor: "pointer", padding: 5 }}>✎</button>}
                {taskEditMode && <button onClick={() => deleteTask(t.id)} style={{ ...pxFont, fontSize: 11, background: "transparent", border: "none", color: C.red, cursor: "pointer", padding: 6 }}>✕</button>}
              </div>
              {taskEditMode && isEd && (<div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                <div style={{ ...lbl, marginBottom: 6 }}>NOMBRE</div>
                <input style={inp} value={t.name} onChange={(e) => editTask(t.id, { name: e.target.value })} />
                <div style={{ ...lbl, margin: "10px 0 2px" }}>CATEGORÍA</div>
                <CatChips value={t.category} onPick={(id) => editTask(t.id, { category: id })} />
                {t.date && <button onClick={() => editTask(t.id, { date: null })} style={{ ...btnPx, width: "100%", marginTop: 10, fontSize: 8, color: C.textDim, borderColor: `${C.textDim}66`, background: "transparent" }}>↩ QUITAR DÍA ASIGNADO</button>}
                <button onClick={() => setEditingItem(null)} style={{ ...btnPx, width: "100%", marginTop: 8, background: `${C.cyan}22` }}>LISTO</button>
              </div>)}
            </Panel>); })}
            {done.length > 0 && <div style={{ ...pxFont, fontSize: 8, color: C.green, margin: "16px 0 10px" }}>COMPLETADAS</div>}
            {done.map((t, i) => (<Panel key={t.id} accent={C.green} style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => toggleTask(t.id)} style={{ width: 30, height: 30, flexShrink: 0, cursor: "pointer", background: `${C.green}22`, border: `2px solid ${C.green}`, color: C.green, boxShadow: `0 0 10px ${C.green}`, ...pxFont, fontSize: 12 }}>✓</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...bdyFont, fontSize: 20, lineHeight: 1.1, color: C.textDim, textDecoration: "line-through" }}>{t.name}</div>
                  {t.completedDate && <div style={{ ...bdyFont, fontSize: 13, color: C.green, marginTop: 2 }}>✓ {(() => { const [, m, dd] = t.completedDate.split("-"); return `${parseInt(dd)} ${MONTHS_ES[parseInt(m) - 1]}`; })()}</div>}
                </div>
                {taskEditMode && <button onClick={() => deleteTask(t.id)} style={{ ...pxFont, fontSize: 11, background: "transparent", border: "none", color: C.red, cursor: "pointer", padding: 6 }}>✕</button>}
              </div>
            </Panel>))}
            {tasks.length > 0 && <button onClick={() => { setTaskEditMode((e) => !e); setEditingItem(null); }} style={{ ...btnPx, width: "100%", marginTop: 8, fontSize: 8, color: taskEditMode ? C.gold : C.textDim, borderColor: taskEditMode ? C.gold : `${C.textDim}55`, background: "transparent" }}>{taskEditMode ? "✓ TERMINAR EDICIÓN" : "✎ EDITAR"}</button>}
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

            {formsEdit && (() => { const th = data.dayThresholds || { gold: 400, red: 800 }; return (
              <Panel accent={C.gold} style={{ padding: 14, marginBottom: 14 }}>
                <div style={{ ...lbl, marginBottom: 8, color: C.gold }}>UMBRALES DEL DÍA (CALENDARIO)</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}><div style={{ ...bdyFont, fontSize: 14, color: C.gold }}>EXP día dorado</div><input style={inp} inputMode="numeric" value={th.gold} onChange={(e) => setThreshold("gold", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                  <div style={{ flex: 1 }}><div style={{ ...bdyFont, fontSize: 14, color: C.red }}>EXP día legendario</div><input style={inp} inputMode="numeric" value={th.red} onChange={(e) => setThreshold("red", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                </div>
                <div style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginTop: 8, lineHeight: 1.3 }}>En el calendario, un día se vuelve dorado al llegar a {th.gold} EXP y rojo/legendario al llegar a {th.red} EXP. Suena un logro al alcanzarlos.</div>
              </Panel>
            ); })()}

            {formsEdit && (() => { const gth = data.catThresholds || CAT_DEFAULT_THRESHOLDS; return (
              <Panel accent={C.gold} style={{ padding: 14, marginBottom: 14 }}>
                <div style={{ ...lbl, marginBottom: 8, color: C.gold }}>RANGOS DE CATEGORÍA (GLOBAL)</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {CAT_RANKS.map((rk, ri2) => (<div key={ri2} style={{ flex: "1 1 28%", minWidth: 70 }}><div style={{ ...pxFont, fontSize: 8, color: rk.color, marginBottom: 3 }}>{rk.name}</div><input inputMode="numeric" value={gth[ri2]} disabled={ri2 === 0} onChange={(e) => setGlobalCatThreshold(ri2, e.target.value.replace(/[^0-9]/g, ""))} style={{ ...inp, fontSize: 15, padding: "5px 6px", opacity: ri2 === 0 ? 0.5 : 1 }} /></div>))}
                </div>
                <div style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginTop: 8, lineHeight: 1.3 }}>EXP acumulada para alcanzar cada rango. Se aplica a toda categoría nueva; cada una puede tener sus propios valores desde ESTADO.</div>
              </Panel>
            ); })()}

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
                          <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ ...bdyFont, fontSize: 15, color: C.textDim }}>Nv.</span>
                            <input value={s.min} disabled={i === 0} inputMode="numeric" onChange={(e) => editStageMin(i, e.target.value.replace(/[^0-9]/g, ""))} style={{ ...inp, fontSize: 16, padding: "5px 8px", width: 56, opacity: i === 0 ? 0.5 : 1 }} />
                            <button onClick={() => moveStage(i, -1)} disabled={i === 0} style={{ ...pxFont, fontSize: 11, padding: "6px 8px", cursor: i === 0 ? "default" : "pointer", background: "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}66`, color: i === 0 ? C.textDim : C.cyan, opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                            <button onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1} style={{ ...pxFont, fontSize: 11, padding: "6px 8px", cursor: i === stages.length - 1 ? "default" : "pointer", background: "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}66`, color: i === stages.length - 1 ? C.textDim : C.cyan, opacity: i === stages.length - 1 ? 0.4 : 1 }}>↓</button>
                            {stages.length > 1 && <button onClick={() => { if (confirm(`¿Eliminar la forma "${s.name}"?`)) deleteStage(i); }} style={{ ...pxFont, fontSize: 11, padding: "6px 8px", cursor: "pointer", background: "transparent", border: `1px solid ${C.red}66`, color: C.red }}>✕</button>}
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <button onClick={() => pickImage(i)} style={{ ...pxFont, fontSize: 7, padding: "7px 8px", cursor: "pointer", background: "rgba(63,201,255,.1)", border: `1px solid ${C.cyan}66`, color: C.cyan }}>📷 IMAGEN</button>
                            {s.img && <button onClick={() => editStage(i, { img: null })} style={{ ...pxFont, fontSize: 7, padding: "7px 8px", cursor: "pointer", background: "transparent", border: `1px solid ${C.red}66`, color: C.red }}>QUITAR IMG</button>}
                            {s.img && <button onClick={() => editStage(i, { lightning: !s.lightning })} style={{ ...pxFont, fontSize: 7, padding: "6px 7px", cursor: "pointer", background: s.lightning ? `${C.gold}22` : "rgba(0,0,0,.4)", border: `1px solid ${s.lightning ? C.gold : C.cyan}55`, color: s.lightning ? C.gold : C.textDim }}>⚡ RAYOS</button>}
                            {s.img && <label style={{ display: "flex", alignItems: "center", gap: 4, ...bdyFont, fontSize: 14, color: C.textDim }}>Aura<input type="color" value={s.aura || "#cfe9ff"} onChange={(e) => editStageColor(i, "aura", e.target.value)} style={{ width: 28, height: 24, border: "none", background: "transparent", cursor: "pointer" }} /></label>}
                            {!s.img && (<><label style={{ display: "flex", alignItems: "center", gap: 4, ...bdyFont, fontSize: 14, color: C.textDim }}>Aura<input type="color" value={s.aura || "#cfe9ff"} onChange={(e) => editStageColor(i, "aura", e.target.value)} style={{ width: 28, height: 24, border: "none", background: "transparent", cursor: "pointer" }} /></label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, ...bdyFont, fontSize: 14, color: C.textDim }}>Pelo<input type="color" value={s.hair || "#2a2a2e"} onChange={(e) => editStageColor(i, "hair", e.target.value)} style={{ width: 28, height: 24, border: "none", background: "transparent", cursor: "pointer" }} /></label>
                            <button onClick={() => editStage(i, { lightning: !s.lightning })} style={{ ...pxFont, fontSize: 7, padding: "6px 7px", cursor: "pointer", background: s.lightning ? `${C.gold}22` : "rgba(0,0,0,.4)", border: `1px solid ${s.lightning ? C.gold : C.cyan}55`, color: s.lightning ? C.gold : C.textDim }}>⚡ RAYOS</button></>)}
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
            {formsEdit && <button onClick={addStage} style={{ ...btnPx, width: "100%", marginTop: 4, background: "rgba(63,201,255,.05)" }}>＋ NUEVA FORMA</button>}
            {formsEdit && <div style={{ ...bdyFont, fontSize: 15, color: C.textDim, textAlign: "center", marginTop: 8, lineHeight: 1.3 }}>Sube tu imagen o usa el guerrero con tus colores.<br />Reordena con ↑↓ (ajusta el nivel solo). Mínimo 1 forma.</div>}
          </div>
        )}

        {/* ESTADO */}
        {tab === "status" && (
          <div style={{ marginTop: 8, animation: "appear .4s both", display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 12, order: 0 }}><span style={secTitle}>◈ ESTADO DEL CAZADOR</span></div>
            <Panel pulse accent={stage.aura} style={{ padding: "14px 16px 16px", marginBottom: 14, textAlign: "center", order: 1 }}>
              <Avatar stage={stage} size={130} />
              <div style={{ ...pxFont, fontSize: 11, color: stage.aura, textShadow: `0 0 12px ${stage.aura}`, marginTop: 6 }}>{stage.name}</div>
              {editingName ? (<input autoFocus value={data.hunter} onChange={(e) => setData((d) => ({ ...d, hunter: e.target.value.toUpperCase().slice(0, 16) }))} onBlur={() => setEditingName(false)} onKeyDown={(e) => e.key === "Enter" && setEditingName(false)} style={{ ...inp, fontSize: 20, textAlign: "center", marginTop: 8 }} />) : (<div onClick={() => setEditingName(true)} style={{ ...bdyFont, fontSize: 24, color: C.text, cursor: "pointer", marginTop: 6 }}>{data.hunter} <span style={{ fontSize: 14, opacity: 0.5 }}>✎</span></div>)}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 8 }}>
                <RankBadge rank={rank} size={44} />
                <div style={{ textAlign: "left" }}><div style={{ ...pxFont, fontSize: 10, color: C.cyan }}>NIVEL {info.level}</div><div style={{ ...pxFont, fontSize: 8, color: rank.color, marginTop: 3 }}>{rank.label}</div></div>
              </div>
              <div style={{ marginTop: 10 }}><ExpBar progress={info.progress} color={stage.aura} height={12} /></div>
            </Panel>

            <Panel style={{ padding: 16, order: 3, marginBottom: 14 }}>
              {[["EXP TOTAL", total, C.gold], ["EXP AL SIGUIENTE NIVEL", info.neededExp - info.currentExp, C.cyan], ["RACHA ACTUAL", `${streak} días`, streak > 0 ? C.gold : C.textDim], ["MEJOR RACHA", `${longestStreak(data.habits)} días`, C.purple], ["MISIONES COMPLETADAS", data.habits.reduce((s, h) => s + (h.done || []).length, 0), C.green], ["RETOS LOGRADOS", data.challenges.filter((c) => c.done).length, C.gold]].map(([k, v, col], i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < 5 ? `1px solid ${C.line}` : "none" }}><span style={{ ...pxFont, fontSize: 8, color: C.textDim, letterSpacing: 1, maxWidth: "62%" }}>{k}</span><span style={{ ...bdyFont, fontSize: 20, color: col, textShadow: `0 0 8px ${col}66` }}>{v}</span></div>))}
            </Panel>

            {/* TEMA */}
            <div style={{ order: 4 }}>
            <div style={{ margin: "22px 0 12px" }}><span style={secTitle}>◑ TEMA DE COLOR</span></div>
            <Panel style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{THEMES.map((t) => { const active = (data.themeAccent || "#3fc9ff").toLowerCase() === t.accent.toLowerCase(); return (<button key={t.id} onClick={() => { setData((d) => ({ ...d, themeAccent: t.accent, themeBg: t.bg })); if (sound) sfx.nav(); }} style={{ ...pxFont, fontSize: 7, padding: "10px 6px", cursor: "pointer", flex: "1 1 26%", minWidth: 64, background: active ? `${t.accent}22` : "rgba(0,0,0,.4)", border: `2px solid ${t.accent}${active ? "" : "55"}`, color: t.accent, boxShadow: active ? `0 0 10px ${t.accent}88` : "none" }}><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: t.accent, boxShadow: `0 0 6px ${t.accent}`, marginBottom: 4 }} /><br />{t.name}</button>); })}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <span style={{ ...pxFont, fontSize: 8, color: C.textDim, flex: 1 }}>COLOR PERSONALIZADO</span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><span style={{ ...bdyFont, fontSize: 14, color: C.text }}>Acento</span><input type="color" value={data.themeAccent || "#3fc9ff"} onChange={(e) => setData((d) => ({ ...d, themeAccent: e.target.value }))} style={{ width: 34, height: 28, border: "none", background: "transparent", cursor: "pointer" }} /></label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><span style={{ ...bdyFont, fontSize: 14, color: C.text }}>Fondo</span><input type="color" value={data.themeBg || "#05080f"} onChange={(e) => setData((d) => ({ ...d, themeBg: e.target.value }))} style={{ width: 34, height: 28, border: "none", background: "transparent", cursor: "pointer" }} /></label>
              </div>
            </Panel>
            </div>

            {/* SONIDO */}
            <div style={{ order: 5 }}>
            <div style={{ margin: "22px 0 12px" }}><span style={secTitle}>♪ SONIDO</span></div>
            <Panel style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ ...pxFont, fontSize: 9, color: C.text }}>MÚSICA</span>
                <button onClick={() => { const next = !(data.musicOn !== false); setData((d) => ({ ...d, musicOn: next })); const el = musicRef.current; if (el) { if (next) { startedMusic.current = true; el.volume = data.musicVol ?? 0.4; setMusicStatus("Intentando reproducir…"); el.play().then(() => setMusicStatus("▶ Sonando")).catch((err) => setMusicStatus("⚠ Bloqueado: " + (err && err.name ? err.name : "error"))); } else { el.pause(); setMusicStatus("⏸ Pausada"); } } }} style={{ background: "transparent", border: `1px solid ${C.cyan}44`, color: music ? C.cyan : C.textDim, fontSize: 14, width: 36, height: 30, cursor: "pointer" }}>{music ? "🎵" : "🔇"}</button>
              </div>
              <input type="range" min="0" max="100" value={Math.round(musicVol * 100)} onChange={(e) => setData((d) => ({ ...d, musicVol: parseInt(e.target.value) / 100 }))} style={{ width: "100%", accentColor: C.cyan }} />
              {musicStatus && <div style={{ ...bdyFont, fontSize: 13, color: musicStatus.startsWith("▶") ? C.green : musicStatus.startsWith("⚠") ? C.red : C.textDim, marginTop: 4 }}>{musicStatus}</div>}
              <div style={{ display: "flex", gap: 8, margintop: 4, marginTop: 10 }}>
                <button onClick={() => musicFileInput.current && musicFileInput.current.click()} style={{ ...btnPx, flex: 1, fontSize: 8, background: "rgba(63,201,255,.08)" }}>♪ MI BANDA SONORA</button>
                {customMusic && <button onClick={clearCustomMusic} style={{ ...btnPx, fontSize: 8, color: C.textDim, borderColor: `${C.textDim}66`, background: "transparent" }}>VOLVER A LA DE SERIE</button>}
              </div>
              {customMusic && <div style={{ ...bdyFont, fontSize: 13, color: C.green, marginTop: 6 }}>♪ Usando tu música personalizada</div>}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 6px", paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <span style={{ ...pxFont, fontSize: 9, color: C.text }}>EFECTOS</span>
                <button onClick={() => setData((d) => ({ ...d, soundOn: !(d.soundOn !== false) }))} style={{ background: "transparent", border: `1px solid ${C.cyan}44`, color: sound ? C.cyan : C.textDim, fontSize: 14, width: 36, height: 30, cursor: "pointer" }}>{sound ? "🔊" : "🔇"}</button>
              </div>
              <input type="range" min="0" max="100" value={Math.round(sfxVol * 100)} onChange={(e) => { const v = parseInt(e.target.value) / 100; setData((d) => ({ ...d, sfxVol: v })); setSfxVol(v); if (sound) sfx.nav(); }} style={{ width: "100%", accentColor: C.cyan }} />
            </Panel>
            </div>

            {/* CATEGORÍAS */}
            <div style={{ order: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 0 12px" }}>
              <span style={secTitle}>◆ CATEGORÍAS</span>
              {cats.length > 0 && <button onClick={() => { setCatEditMode((e) => !e); setEditingItem(null); setEditingThresh(null); }} style={{ ...pxFont, fontSize: 8, padding: "8px 10px", cursor: "pointer", background: catEditMode ? `${C.gold}22` : "transparent", border: `1px solid ${catEditMode ? C.gold : C.cyan}66`, color: catEditMode ? C.gold : C.cyan }}>{catEditMode ? "✓ LISTO" : "✎ EDITAR"}</button>}
            </div>

            {cats.length === 0 && !addingCat && <div style={{ ...bdyFont, fontSize: 16, color: C.textDim, textAlign: "center", padding: "10px 0 16px", lineHeight: 1.3 }}>Crea áreas de tu vida (Salud, Finanzas...) y asígnalas a tus misiones, retos y tareas. Cada una sube de rango hasta SSS.</div>}

            {cats.map((c, i) => { const exp = catExpOf(data, c.id); const eth = effThresholds(c, data.catThresholds); const ri = catRankInfo(exp, eth); const isCustom = c.thresholds && c.thresholds.length === 6; const isEditingThis = editingThresh === c.id; return (
              <Panel key={c.id} accent={ri.rank.color} style={{ padding: 12, marginBottom: 8, animation: `appear .4s ${i * 0.04}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${ri.rank.color}`, borderRadius: 6, background: `${ri.rank.color}18`, boxShadow: `0 0 10px ${ri.rank.color}55` }}><CatIcon cat={c} size={22} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ ...bdyFont, fontSize: 20, color: C.text }}>{c.name}</span>
                      <span style={{ ...pxFont, fontSize: 11, color: ri.rank.color, textShadow: `0 0 8px ${ri.rank.color}` }}>{ri.rank.name}{ri.isMax && " ★"}</span>
                    </div>
                    <div style={{ marginTop: 6 }}><ExpBar progress={ri.progress} color={ri.rank.color} height={12} /></div>
                    <div style={{ ...bdyFont, fontSize: 14, color: C.textDim, marginTop: 3 }}>{ri.isMax ? `¡RANGO MÁXIMO! · ${exp} EXP` : `${exp} EXP · faltan ${ri.nextExp} para ${CAT_RANKS[ri.idx + 1].name}`}</div>
                  </div>
                  {catEditMode && <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><button onClick={() => setEditingItem(editingItem === "cat" + c.id ? null : "cat" + c.id)} title="Editar nombre, icono y color" style={{ ...pxFont, fontSize: 10, background: editingItem === "cat" + c.id ? `${C.cyan}22` : "transparent", border: `1px solid ${C.cyan}66`, color: C.cyan, cursor: "pointer", padding: 5 }}>✎</button><button onClick={() => setEditingThresh(isEditingThis ? null : c.id)} title="Ajustar EXP de rangos" style={{ ...pxFont, fontSize: 10, background: isEditingThis ? `${C.gold}22` : "transparent", border: `1px solid ${C.gold}66`, color: C.gold, cursor: "pointer", padding: 5 }}>⚙</button><button onClick={() => deleteCategory(c.id)} style={{ ...pxFont, fontSize: 11, background: "transparent", border: "none", color: C.red, cursor: "pointer", padding: 5 }}>✕</button></div>}
                </div>
                {catEditMode && editingItem === "cat" + c.id && (<div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                  <div style={{ ...lbl, marginBottom: 6 }}>NOMBRE</div>
                  <input style={inp} value={c.name} onChange={(e) => editCategory(c.id, { name: e.target.value })} />
                  <div style={{ ...lbl, margin: "10px 0 6px" }}>ICONO</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {CAT_ICONS.map((ic) => (<button key={ic} onClick={() => editCategory(c.id, { icon: ic, customIcon: null })} style={{ width: 34, height: 34, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: (!c.customIcon && c.icon === ic) ? `${C.cyan}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}${(!c.customIcon && c.icon === ic) ? "" : "44"}`, borderRadius: 5 }}>{ic}</button>))}
                    <button onClick={() => { editCatPending.current = c.id; editCatFileInput.current && editCatFileInput.current.click(); }} style={{ width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: c.customIcon ? `${C.gold}22` : "rgba(0,0,0,.4)", border: `1px solid ${c.customIcon ? C.gold : C.cyan}66`, borderRadius: 5 }}>{c.customIcon ? <img src={c.customIcon} alt="c" style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 3 }} /> : <span style={{ fontSize: 13, color: C.cyan }}>📷</span>}</button>
                  </div>
                  <div style={{ ...lbl, margin: "10px 0 6px" }}>COLOR DEL PUNTO</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {CAT_COLORS.map((col) => (<button key={col} onClick={() => editCategory(c.id, { dotColor: col })} style={{ width: 28, height: 28, cursor: "pointer", borderRadius: "50%", background: col, border: (c.dotColor || CAT_COLORS[0]) === col ? `3px solid #fff` : `1px solid ${col}`, boxShadow: (c.dotColor || CAT_COLORS[0]) === col ? `0 0 8px ${col}` : "none" }} />))}
                  </div>
                  <button onClick={() => setEditingItem(null)} style={{ ...btnPx, width: "100%", marginTop: 12, background: `${C.cyan}22` }}>LISTO</button>
                </div>)}
                {catEditMode && isEditingThis && (<div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                  <div style={{ ...lbl, marginBottom: 8, color: C.gold }}>EXP NECESARIA POR RANGO {isCustom ? "(PROPIA)" : "(SIGUE EL GLOBAL)"}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {CAT_RANKS.map((rk, ri2) => (<div key={ri2} style={{ flex: "1 1 28%", minWidth: 70 }}><div style={{ ...pxFont, fontSize: 8, color: rk.color, marginBottom: 3 }}>{rk.name}</div><input inputMode="numeric" value={eth[ri2]} disabled={ri2 === 0} onChange={(e) => setCatThreshold(c.id, ri2, e.target.value.replace(/[^0-9]/g, ""))} style={{ ...inp, fontSize: 15, padding: "5px 6px", opacity: ri2 === 0 ? 0.5 : 1 }} /></div>))}
                  </div>
                  {isCustom && <button onClick={() => resetCatThreshold(c.id)} style={{ ...btnPx, width: "100%", marginTop: 10, fontSize: 8, color: C.textDim, borderColor: `${C.textDim}66`, background: "transparent" }}>↩ VOLVER AL GLOBAL</button>}
                </div>)}
              </Panel>
            ); })}

            {addingCat ? (
              <Panel accent={C.cyan} style={{ padding: 14, marginBottom: 8 }}>
                <div style={{ ...lbl, marginBottom: 6 }}>NUEVA CATEGORÍA</div>
                <input style={inp} placeholder="Nombre (ej. Salud)" value={catDraft.name} onChange={(e) => setCatDraft({ ...catDraft, name: e.target.value })} />
                <div style={{ ...lbl, margin: "12px 0 6px" }}>ICONO</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {CAT_ICONS.map((ic) => (<button key={ic} onClick={() => setCatDraft({ ...catDraft, icon: ic, customIcon: null })} style={{ width: 38, height: 38, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: (!catDraft.customIcon && catDraft.icon === ic) ? `${C.cyan}22` : "rgba(0,0,0,.4)", border: `1px solid ${C.cyan}${(!catDraft.customIcon && catDraft.icon === ic) ? "" : "44"}`, borderRadius: 5 }}>{ic}</button>))}
                  <button onClick={pickCatIcon} style={{ width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: catDraft.customIcon ? `${C.gold}22` : "rgba(0,0,0,.4)", border: `1px solid ${catDraft.customIcon ? C.gold : C.cyan}66`, borderRadius: 5 }}>{catDraft.customIcon ? <img src={catDraft.customIcon} alt="custom" style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 3 }} /> : <span style={{ fontSize: 14, color: C.cyan }}>📷</span>}</button>
                </div>
                <div style={{ ...lbl, margin: "12px 0 6px" }}>COLOR DEL PUNTO (CALENDARIO)</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {CAT_COLORS.map((col) => (<button key={col} onClick={() => setCatDraft({ ...catDraft, dotColor: col })} style={{ width: 32, height: 32, cursor: "pointer", borderRadius: "50%", background: col, border: catDraft.dotColor === col ? `3px solid #fff` : `1px solid ${col}`, boxShadow: catDraft.dotColor === col ? `0 0 8px ${col}` : "none" }} />))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={addCategory} style={{ ...btnPx, flex: 1, background: `${C.cyan}22` }}>CREAR</button>
                  <button onClick={() => { setAddingCat(false); setCatDraft({ name: "", color: CAT_RANKS[0].color, icon: CAT_ICONS[0], customIcon: null, dotColor: CAT_COLORS[0] }); }} style={{ ...btnPx, color: C.textDim, borderColor: `${C.textDim}66` }}>CANCELAR</button>
                </div>
              </Panel>
            ) : (<button onClick={() => { setAddingCat(true); if (sound) sfx.open(); }} style={{ ...btnPx, width: "100%", marginBottom: 8, background: "rgba(63,201,255,.05)" }}>＋ NUEVA CATEGORÍA</button>)}
            </div>

            <div style={{ order: 6 }}>
            <button onClick={() => setStreakPopup(true)} style={{ ...btnPx, width: "100%", marginTop: 14, fontSize: 8, color: C.cyan, borderColor: `${C.cyan}55`, background: `${C.cyan}0d` }}>◈ VER INFORME DEL DÍA</button>
            <button onClick={() => { if (confirm("¿Reiniciar TODO el progreso? No se puede deshacer.")) { setData(normalize({ ...DEFAULT_DATA })); prevLevel.current = 1; prevStage.current = 0; } }} style={{ ...btnPx, width: "100%", marginTop: 8, fontSize: 8, color: C.red, borderColor: `${C.red}55`, background: `${C.red}0d` }}>⚠ REINICIAR PROGRESO</button>
            <div style={{ ...bdyFont, fontSize: 15, color: C.textDim, textAlign: "center", marginTop: 16, lineHeight: 1.3 }}>Tu progreso se guarda solo. Personaliza tus<br />formas en la pestaña ☄ FORMAS.</div>
            </div>
          </div>
        )}
      </div>

      {/* NAV */}
        {tab === "logros" && (() => {
          const achs = computeAchievements(data, streak, info, total);
          const unlocked = achs.filter(a=>a.unlocked).length;
          const pct = Math.round(unlocked/achs.length*100);
          const sections = Object.keys(ACH_SECTIONS);
          return (<div style={{ marginTop: 8, animation: "appear .4s both" }}>
            <div style={{ marginBottom: 10 }}><span style={secTitle}>★ LOGROS</span></div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              {[['all','TODOS',C.cyan],[unlocked+'','LOGRADOS',C.green],[achs.length+'','TOTAL',C.textDim],[pct+'%','COMPLETADO',C.gold]].map(([v,l,c],i)=>(<div key={i} style={{ flex:1, background:'rgba(0,0,0,.4)', border:`1px solid ${C.line}`, borderRadius:4, padding:'8px 4px', textAlign:'center' }}><div style={{ ...pxFont, fontSize:10, color:c, marginBottom:3 }}>{v}</div><div style={{ ...bdyFont, fontSize:13, color:C.textDim }}>{l}</div></div>))}
            </div>
            <div style={{ height:6, background:'rgba(0,0,0,.4)', border:`1px solid ${C.line}`, borderRadius:3, marginBottom:14, overflow:'hidden' }}>
              <div style={{ height:'100%', width:pct+'%', background:`linear-gradient(90deg,${C.cyan},${C.purple})`, borderRadius:3 }} />
            </div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:14 }}>
              {['all','unlocked',...sections].map(f=>(<button key={f} onClick={()=>setAchFilter(f)} style={{ ...pxFont, fontSize:6, padding:"6px 7px", cursor:"pointer", background:achFilter===f?`${C.cyan}18`:"rgba(0,0,0,.4)", border:`1px solid ${C.cyan}${achFilter===f?"":"44"}`, color:achFilter===f?C.cyan:C.textDim }}>{f==='all'?'TODO':f==='unlocked'?'LOGRADOS':(ACH_SECTIONS[f]||f).split(' ').slice(1,3).join(' ')}</button>))}
            </div>
            {sections.map(sec=>{
              let items = achs.filter(a=>a.sec===sec);
              if (achFilter==='unlocked') items=items.filter(a=>a.unlocked);
              else if (achFilter!=='all'&&achFilter!==sec) return null;
              if (!items.length) return null;
              return (<div key={sec}>
                <div style={{ ...pxFont, fontSize:6.5, color:C.textDim, letterSpacing:2, margin:"18px 0 10px", paddingBottom:6, borderBottom:`1px solid ${C.line}` }}>{ACH_SECTIONS[sec]}</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                  {items.map(a=>{
                    const rar = ACH_RARITIES.find(r=>r.id===a.rarity)||ACH_RARITIES[0];
                    const isHidden = a.hidden && !a.unlocked;
                    const pv = a.prog ? Math.min(100,Math.round(a.prog[0]/a.prog[1]*100)) : null;
                    return (<div key={a.id} onClick={()=>setAchModal(a)} style={{ background:'rgba(0,0,0,.5)', border:`1px solid ${a.unlocked?rar.color:C.line}`, borderRadius:5, padding:"11px 10px", position:"relative", cursor:"pointer", opacity:a.unlocked?1:0.45, filter:a.unlocked?'none':'grayscale(0.5)', overflow:"hidden" }}>
                      <div style={{ position:"absolute", top:6, right:6, ...pxFont, fontSize:4.5, color:rar.color, border:`1px solid ${rar.color}`, padding:"2px 3px" }}>{rar.label}</div>
                      <div style={{ fontSize:24, marginBottom:6 }}>{isHidden?'❓':a.icon}</div>
                      <div style={{ ...pxFont, fontSize:5.5, color:a.unlocked?rar.color:C.textDim, lineHeight:1.7, marginBottom:5 }}>{isHidden?'???':a.name}</div>
                      <div style={{ ...bdyFont, fontSize:12, color:C.textDim, lineHeight:1.3 }}>{isHidden?'Logro oculto':a.desc}</div>
                      {pv!==null&&(<><div style={{ marginTop:6, height:4, background:'rgba(0,0,0,.4)', borderRadius:2, overflow:'hidden' }}><div style={{ height:'100%', width:pv+'%', background:rar.color, borderRadius:2 }} /></div><div style={{ ...bdyFont, fontSize:11, color:C.textDim, marginTop:3 }}>{a.prog[0]} / {a.prog[1]}</div></>)}
                    </div>);
                  })}
                </div>
              </div>);
            })}
            {achModal && (() => {
              const a = achModal;
              const rar = ACH_RARITIES.find(r=>r.id===a.rarity)||ACH_RARITIES[0];
              const isHidden = a.hidden && !a.unlocked;
              return (<div onClick={()=>setAchModal(null)} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.88)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)' }}>
                <div onClick={e=>e.stopPropagation()} style={{ background:'#08101e',border:`2px solid ${rar.color}`,borderRadius:8,padding:22,maxWidth:320,width:'100%',textAlign:'center',boxShadow:`0 0 40px ${rar.color}33` }}>
                  <div style={{ fontSize:52,marginBottom:12 }}>{isHidden?'❓':a.icon}</div>
                  <div style={{ ...pxFont, fontSize:7, color:rar.color, border:`1px solid ${rar.color}`, display:'inline-block', padding:'3px 8px', marginBottom:12 }}>{rar.label}</div>
                  <div style={{ ...pxFont, fontSize:9, color:rar.color, textShadow:`0 0 10px ${rar.color}`, lineHeight:1.8, marginBottom:12 }}>{isHidden?'??? OCULTO ???':a.name}</div>
                  <div style={{ ...bdyFont, fontSize:17, color:C.text, lineHeight:1.5, marginBottom:12 }}>{isHidden?'Sigue mejorando para desvelarlo.':a.desc}</div>
                  <div style={{ ...pxFont, fontSize:7, color:a.unlocked?C.green:C.textDim, marginBottom:16 }}>{a.unlocked?'✦ LOGRADO':'🔒 BLOQUEADO'}</div>
                  {a.prog&&(<><div style={{ height:7, background:'rgba(0,0,0,.5)', borderRadius:3, overflow:'hidden', marginBottom:6 }}><div style={{ height:'100%', width:Math.min(100,Math.round(a.prog[0]/a.prog[1]*100))+'%', background:rar.color, borderRadius:3 }} /></div><div style={{ ...bdyFont, fontSize:13, color:C.textDim, marginBottom:14 }}>{a.prog[0]} / {a.prog[1]}</div></>)}
                  <button onClick={()=>setAchModal(null)} style={{ ...btnPx, width:'100%', color:rar.color, borderColor:rar.color, background:`${rar.color}11` }}>CERRAR</button>
                </div>
              </div>);
            })()}
          </div>);
        })()}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "rgba(5,8,15,.92)", borderTop: `1px solid ${C.line}`, backdropFilter: "blur(6px)", display: "flex", maxWidth: 540, margin: "0 auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[["objectives", "⚔", "OBJETIVOS"], ["tasks", "✎", "LIBRETA"], ["calendar", "▦", "CALEND."], ["forms", "☄", "FORMAS"], ["status", "◈", "ESTADO"], ["logros", "★", "LOGROS"]].map(([id, icon, txt]) => { const active = tab === id; return (<button key={id} onClick={() => { setTab(id); setAdding(null); if (sound) sfx.tab(); }} style={{ flex: 1, padding: "11px 0 13px", background: active ? "rgba(63,201,255,.1)" : "transparent", border: "none", borderTop: active ? `2px solid ${C.cyan}` : "2px solid transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>{/*nav*/}<span style={{ fontSize: 15, color: active ? C.cyan : C.textDim, textShadow: active ? `0 0 10px ${C.glow}` : "none" }}>{icon}</span><span style={{ ...pxFont, fontSize: 6, color: active ? C.cyan : C.textDim, letterSpacing: 0.5 }}>{txt}</span></button>); })}
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
            const dayTasks = tasksOnDay(data.tasks, popup.date);
            const dayExp = expOnDay(data.habits, popup.date);
            const isFuture = popup.date > today;
            return (
              <div onClick={(e) => e.stopPropagation()} style={{ animation: "lvlBurst .5s both", position: "relative", padding: "22px 20px", border: `2px solid ${C.cyan}`, background: "radial-gradient(circle at 50% 0%,rgba(63,201,255,.14),rgba(5,8,15,.97))", boxShadow: `0 0 36px ${C.glow},inset 0 0 26px rgba(63,201,255,.16)`, maxWidth: 360, width: "100%", maxHeight: "82vh", overflowY: "auto" }}>
                <Corners color={C.cyan} />
                <div style={{ ...pxFont, fontSize: 8, color: C.textDim, letterSpacing: 2, textAlign: "center" }}>◈ REGISTRO DEL DÍA ◈</div>
                <div style={{ ...pxFont, fontSize: 13, color: C.cyan, textShadow: `0 0 10px ${C.glow}`, textAlign: "center", margin: "10px 0 6px" }}>{dd} {MONTHS_ES[mm - 1].toUpperCase()}</div>
                {dayExp > 0 && <div style={{ ...bdyFont, fontSize: 16, color: C.gold, textAlign: "center", marginBottom: 14 }}>{dayExp} EXP ese día</div>}
                {ach.length > 0 && (<div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ ...pxFont, fontSize: 8, color: C.gold, marginBottom: 10 }}>LOGROS</div>
                  {ach.map((a, j) => (<div key={j} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><span style={{ fontSize: 18, filter: a.kind === "transform" ? "none" : `drop-shadow(0 0 4px ${C.gold})` }}>{a.kind === "transform" ? "☄" : "👑"}</span><div><div style={{ ...bdyFont, fontSize: 19, color: a.kind === "transform" ? C.cyan : C.gold, lineHeight: 1 }}>{a.name}</div><div style={{ ...pxFont, fontSize: 6.5, color: C.textDim, marginTop: 3 }}>{a.kind === "transform" ? "TRANSFORMACIÓN" : `RETO ${PERIODS[a.kind].label}`}</div></div></div>))}
                </div>)}
                <div style={{ ...pxFont, fontSize: 8, color: C.green, marginBottom: 10 }}>MISIONES ({done.length})</div>
                {done.length === 0 ? (<div style={{ ...bdyFont, fontSize: 18, color: C.textDim }}>{isFuture ? "Día por venir." : "Sin misiones completadas ese día."}</div>) : done.map((h, j) => (<div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ color: C.green, ...pxFont, fontSize: 9 }}>✓</span><span style={{ ...bdyFont, fontSize: 19, color: C.text, flex: 1, minWidth: 0 }}>{h.name}</span><span style={{ ...bdyFont, fontSize: 15, color: C.gold }}>+{h.exp}</span></div>))}
                <div style={{ ...pxFont, fontSize: 8, color: C.cyan, margin: "16px 0 10px", display: "flex", justifyContent: "space-between" }}><span>TAREAS ({dayTasks.length})</span></div>
                {dayTasks.length === 0 && <div style={{ ...bdyFont, fontSize: 16, color: C.textDim, marginBottom: 8 }}>Sin tareas asignadas a este día.</div>}
                {dayTasks.map((t) => (<div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <button onClick={() => toggleTask(t.id)} style={{ width: 24, height: 24, flexShrink: 0, cursor: "pointer", background: t.done ? `${C.green}22` : "rgba(0,0,0,.4)", border: `2px solid ${t.done ? C.green : C.cyan}`, color: t.done ? C.green : "transparent", boxShadow: t.done ? `0 0 8px ${C.green}` : "none", ...pxFont, fontSize: 10 }}>✓</button>
                  <span style={{ ...bdyFont, fontSize: 18, color: t.done ? C.textDim : C.text, flex: 1, minWidth: 0, textDecoration: t.done ? "line-through" : "none" }}>{t.name}</span>
                  <a href={gcalLink(t)} target="_blank" rel="noopener noreferrer" title="Añadir a Google Calendar" style={{ ...pxFont, fontSize: 11, textDecoration: "none", cursor: "pointer", color: C.gold, padding: "2px 4px" }}>📤</a>
                  <button onClick={() => setTaskDate(t.id, null)} title="Quitar del día" style={{ ...pxFont, fontSize: 10, background: "transparent", border: "none", color: C.textDim, cursor: "pointer", padding: "2px 4px" }}>↩</button>
                  <button onClick={() => deleteTask(t.id)} style={{ ...pxFont, fontSize: 10, background: "transparent", border: "none", color: C.red, cursor: "pointer" }}>✕</button>
                </div>))}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input style={{ ...inp, flex: 1, fontSize: 17, padding: "6px 8px" }} placeholder="Nueva tarea este día..." value={taskDraft} onChange={(e) => setTaskDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && taskDraft.trim()) { addTask(popup.date); } }} />
                  <button onClick={() => taskDraft.trim() && addTask(popup.date)} style={{ ...pxFont, fontSize: 10, padding: "0 14px", cursor: "pointer", background: `${C.cyan}22`, border: `1px solid ${C.cyan}`, color: C.cyan }}>＋</button>
                </div>
                <button onClick={() => { setPopup(null); setTaskDraft(""); }} style={{ ...btnPx, marginTop: 18, width: "100%", background: `${C.cyan}22` }}>CERRAR</button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
