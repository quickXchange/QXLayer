// Server-rendered Production Private Access page. Pure string output; no network, no external assets.
const esc = (s) => String(s ?? "").replace(/[&<>"'`]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" })[c]);
// Logos must be data:image URIs; anything else is dropped.
const img = (s) => (typeof s === "string" && /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(s) ? s : "");
const font = (s) => (typeof s === "string" && /^data:font\/woff2;base64,[A-Za-z0-9+/=]+$/.test(s) ? s : "");

// Static trusted script. Uses ONLY the existing public QXLayer theme key ("plw:theme:" + empty platform slug).
export const ACCESS_PAGE_SCRIPT = `(function(){var K="plw:theme:",d=document.documentElement,b=document.getElementById("theme-toggle"),m=window.matchMedia("(prefers-color-scheme: dark)");function rd(){try{var v=localStorage.getItem(K);return v==="light"||v==="dark"?v:null}catch(e){return null}}function ap(t){d.setAttribute("data-qx-theme",t);if(b){b.setAttribute("aria-pressed",t==="dark"?"true":"false");b.setAttribute("aria-label",t==="dark"?"Switch to light theme":"Switch to dark theme")}}function cur(){return rd()||(m.matches?"dark":"light")}ap(cur());if(b)b.addEventListener("click",function(){var n=d.getAttribute("data-qx-theme")==="dark"?"light":"dark";ap(n);try{localStorage.setItem(K,n)}catch(e){}});var f=function(){if(!rd())ap(cur())};if(m.addEventListener)m.addEventListener("change",f)})();`;

const CSS = `
:root{color-scheme:light;--bg:#f4f3fb;--fg:#1f1a45;--mut:#5d5a7e;--card:rgba(255,255,255,.82);--line:rgba(79,70,160,.16);--in:#fff;--inb:#8f8bb8;--ring:#5b3df5;--err:#a42a2a;--errbg:rgba(190,50,50,.08);--g1:rgba(124,92,255,.22);--g2:rgba(79,125,255,.2);--g3:rgba(103,212,255,.22);--sh:0 30px 80px -30px rgba(70,50,170,.35),0 2px 0 rgba(255,255,255,.8) inset}
:root[data-qx-theme=dark]{color-scheme:dark;--bg:#0c0b1c;--fg:#eef0fb;--mut:#a8abd0;--card:rgba(24,22,48,.78);--line:rgba(160,150,255,.2);--in:#12112a;--inb:#7f84b8;--ring:#8fd8ff;--err:#ffb4b4;--errbg:rgba(255,100,100,.1);--g1:rgba(124,92,255,.32);--g2:rgba(79,125,255,.24);--g3:rgba(103,212,255,.16);--sh:0 40px 90px -30px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.07) inset}
*{box-sizing:border-box}
html,body{margin:0}
body{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--fg);font-family:'Bricolage Grotesque',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;position:relative;overflow-x:hidden}
.bg{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.bg i{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}
.bg i:nth-child(1){width:560px;height:560px;left:-140px;top:-160px;background:var(--g1);animation:drift 18s ease-in-out infinite alternate}
.bg i:nth-child(2){width:520px;height:520px;right:-150px;top:20%;background:var(--g2);animation:drift 22s ease-in-out infinite alternate-reverse}
.bg i:nth-child(3){width:460px;height:460px;left:25%;bottom:-220px;background:var(--g3);animation:drift 20s ease-in-out infinite alternate}
.bg b{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse at center,#000 0,transparent 70%);mask-image:radial-gradient(ellipse at center,#000 0,transparent 70%)}
@keyframes drift{to{transform:translate3d(60px,40px,0) scale(1.1)}}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.toggle{position:fixed;top:16px;right:16px;z-index:3;width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;display:grid;place-items:center;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.toggle svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.toggle .sun{display:none}:root[data-qx-theme=dark] .toggle .sun{display:block}:root[data-qx-theme=dark] .toggle .moon{display:none}
main{position:relative;z-index:2;width:100%;max-width:440px;padding:40px 36px 30px;border:1px solid var(--line);border-radius:24px;background:var(--card);box-shadow:var(--sh);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);text-align:center;animation:rise .6s cubic-bezier(.2,.7,.2,1) both}
main::before{content:"";position:absolute;left:12%;right:12%;top:-1px;height:2px;border-radius:2px;background:linear-gradient(90deg,#7c5cff,#4f7dff,#67d4ff);pointer-events:none}
.logo{display:block;margin:-18px auto -6px;height:112px;width:auto;max-width:78%;object-fit:contain}
.logo.d{display:none}:root[data-qx-theme=dark] .logo.l{display:none}:root[data-qx-theme=dark] .logo.d{display:block}
.eyebrow{display:inline-flex;align-items:center;gap:8px;margin:6px 0 14px;padding:5px 12px;border-radius:999px;border:1px solid var(--line);font:500 11px/1 'Spline Sans Mono',ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
.eyebrow::before{content:"";width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#7c5cff,#67d4ff)}
h1{margin:0 0 10px;font-size:34px;line-height:1.1;font-weight:600;letter-spacing:-.025em}
.lead{margin:0 0 28px;font-size:15px;line-height:1.6;color:var(--mut)}
form{text-align:left;margin:0}
label{display:block;margin:0 0 8px;font-size:13px;font-weight:600}
input[type=password]{display:block;width:100%;min-height:50px;padding:13px 15px;font:inherit;font-size:16px;color:var(--fg);background:var(--in);border:1px solid var(--inb);border-radius:12px;outline:none;pointer-events:auto;position:relative;z-index:1;-webkit-user-select:text;user-select:text}
input[type=password]:focus{border-color:var(--ring);box-shadow:0 0 0 3px color-mix(in srgb,var(--ring) 35%,transparent);outline:2px solid var(--ring);outline-offset:2px}
.msg{margin:14px 0 0;padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb,var(--err) 40%,transparent);background:var(--errbg);color:var(--err);font-size:14px;line-height:1.45}
button.go{display:block;width:100%;min-height:50px;margin-top:18px;border:0;border-radius:12px;font:600 16px 'Bricolage Grotesque',system-ui,sans-serif;color:#fff;cursor:pointer;background:linear-gradient(135deg,#7c5cff 0%,#4f7dff 55%,#3fb4f0 100%);box-shadow:0 12px 28px -12px rgba(91,61,245,.7);transition:transform .15s,filter .15s}
button.go:hover{filter:brightness(1.07);transform:translateY(-1px)}button.go:active{transform:none}
button.go:focus-visible,.toggle:focus-visible{outline:3px solid var(--ring);outline-offset:3px}
.foot{margin:24px 0 0;font:400 11px/1.4 'Spline Sans Mono',ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
@media(max-width:480px){body{padding:16px}main{padding:32px 22px 24px;border-radius:20px}h1{font-size:30px}.logo{height:96px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

export function renderAccessPage({ logoLight, logoDark, fontSans, fontMono, endpoint, csrf, returnTo, message } = {}) {
  const l = img(logoLight), d = img(logoDark);
  const fontCss = [
    ["Bricolage Grotesque", font(fontSans), "400 700"],
    ["Spline Sans Mono", font(fontMono), "400 500"],
  ].filter(([, src]) => src).map(([family, src, weight]) => `@font-face{font-family:'${family}';src:url('${src}') format('woff2');font-weight:${weight};font-display:swap}`).join("");
  const brand = (cls, src) => (src ? `<img class="logo ${cls}" src="${esc(src)}" alt="${cls === "l" ? "QXLayer" : ""}"${cls === "d" ? ' aria-hidden="true"' : ""}>` : "");
  const fallback = !l && !d ? `<p class="logo" style="height:auto;font-weight:700;font-size:28px;margin:8px 0">QXLayer</p>` : "";
  return `<!doctype html><html lang="en" data-qx-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="color-scheme" content="light dark"><title>Private Access | QXLayer</title><style>${fontCss}${CSS}</style></head><body>
<div class="bg" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
<button type="button" class="toggle" id="theme-toggle" aria-label="Switch to dark theme" aria-pressed="false"><svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>
<main>${brand("l", l || d)}${brand("d", d || l)}${fallback}
<span class="eyebrow">Pre-launch</span>
<h1>Private Access</h1>
<p class="lead">QXLayer is preparing for launch. Enter your access code to continue.</p>
<form method="POST" action="${esc(endpoint)}"><input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="returnTo" value="${esc(returnTo)}">
<label for="access-code">Access Code</label>
<input id="access-code" name="accessCode" type="password" maxlength="512" required autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" autofocus>
${message ? `<p class="msg" role="alert">${esc(message)}</p>` : ""}
<button class="go" type="submit">Enter</button></form>
<p class="foot">Temporary pre-launch access</p></main>
<script>${ACCESS_PAGE_SCRIPT}</script></body></html>`;
}
