"use strict";

/* ============================================================
   TEXT + SETTINGS — all fixed copy for the card lives here.
   (Recipient name, messages and photos come from the URL hash.)
   ============================================================ */
const TEXT = {
  landing: { title: "Pls accept the gift", hint: "It's a really good one, promise", yes: "Yes", no: "No" },
  no: { title: "Why did you click no!", sub: "My bunny is very sad now. Fix it?", retry: "Try again" },
  picker: { title: "Pick a gift", sub: "Three little surprises",
    items: [["Birthday wish", "A card just for you"], ["Memory lane", "Our favourite moments"], ["Sweet note", "Something from the heart"]] },
  wish: n => `Happy Birthday, ${n}!`,
  lane: { title: "Memory lane", sub: "Tap the photos" },
  last: { title: "One more thing...", floaters: ["💖", "✨", "🌸", "💗", "🎈"], back: "Back to gifts" },
  defaultMsg: "Wishing you a day as bright as your smile and a year full of tiny happy surprises.",
  defaultNote: "Thank you for being you. I'm so glad you exist.",
  back: "Back", own: "Make your own card",
  memoryEmoji: ["🌸", "🍦", "🎈", "🌅"]
};
const LIMITS = { n: 40, f: 40, m: 500, c: 400 }, MAX_W = 600, QUALITY = 0.7;
const CHARACTERS = { landing: "bunny", no: "bunny", gifts: ["bunny", "bear", "cat"] };

/* ---------------- helpers ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Everything decoded from a URL is untrusted: clamp text, accept only pure base64 for images. */
function clean(c) {
  c = c && typeof c === "object" ? c : {};
  const t = (v, n) => String(v ?? "").slice(0, n);
  const img = v => (typeof v === "string" && v.length < 600000 && /^[A-Za-z0-9+/]+=*$/.test(v) ? v : "");
  const g = Array.isArray(c.g) ? c.g : [];
  return { n: t(c.n, LIMITS.n), f: t(c.f, LIMITS.f), m: t(c.m, LIMITS.m), c: t(c.c, LIMITS.c),
           p: img(c.p), g: [0, 1, 2, 3].map(i => img(g[i])) };
}

/* ---------------- URL-safe Base64 (+ deflate when supported) ---------------- */
const b64u = {
  enc(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  dec(str) {
    const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
};
async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
/* "z" prefix = deflated, "r" prefix = raw (fallback for older browsers) */
async function pack(cfg) {
  const raw = new TextEncoder().encode(JSON.stringify(cfg));
  if ("CompressionStream" in window) {
    try { return "z" + b64u.enc(await pipe(raw, new CompressionStream("deflate-raw"))); } catch (e) { /* fall through */ }
  }
  return "r" + b64u.enc(raw);
}
async function unpack(s) {
  const bytes = b64u.dec(s.slice(1));
  const raw = s[0] === "z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}

/* ---------------- image compression: max 600px wide, JPEG 0.7 ---------------- */
async function compress(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch (e) {
    bmp = await new Promise((ok, no) => {
      const i = new Image(), u = URL.createObjectURL(file);
      i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = no; i.src = u;
    });
  }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, s = Math.min(1, MAX_W / w);
  const cv = document.createElement("canvas");
  cv.width = Math.round(w * s); cv.height = Math.round(h * s);
  const x = cv.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, cv.width, cv.height);
  x.drawImage(bmp, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", QUALITY).split(",")[1];
}

/* ---------------- mascot ---------------- */
const FILLS = { bunny: "#FFFFFF", bear: "#FFD9B8", cat: "#E8DEFF" };
function mascot(kind = "bunny", mood = "happy", gift = false, small = false) {
  const ink = "#4B3A5E", pink = "#FFB3C6", st = `stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"`, f = FILLS[kind];
  const ears = {
    bunny: `<ellipse cx="38" cy="24" rx="10" ry="23" fill="${f}" ${st}/><ellipse cx="82" cy="24" rx="10" ry="23" fill="${f}" ${st}/><ellipse cx="38" cy="27" rx="4.5" ry="14" fill="${pink}"/><ellipse cx="82" cy="27" rx="4.5" ry="14" fill="${pink}"/>`,
    bear: `<circle cx="30" cy="40" r="14" fill="${f}" ${st}/><circle cx="90" cy="40" r="14" fill="${f}" ${st}/><circle cx="30" cy="40" r="6.5" fill="${pink}"/><circle cx="90" cy="40" r="6.5" fill="${pink}"/>`,
    cat: `<path d="M24 58 L28 18 L58 40Z" fill="${f}" ${st}/><path d="M96 58 L92 18 L62 40Z" fill="${f}" ${st}/><path d="M32 46 L34 29 L47 40Z" fill="${pink}"/><path d="M88 46 L86 29 L73 40Z" fill="${pink}"/>`
  }[kind];
  const sad = mood === "sad";
  const eyes = sad
    ? `<path d="M39 67q7-6 14 0M67 67q7-6 14 0" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M83 72q4 7 0 10q-4-3 0-10z" fill="#A5D8FF"/>`
    : `<circle cx="46" cy="66" r="4.5" fill="${ink}"/><circle cx="74" cy="66" r="4.5" fill="${ink}"/><circle cx="47.6" cy="64.4" r="1.5" fill="#fff"/><circle cx="75.6" cy="64.4" r="1.5" fill="#fff"/>`;
  const mouth = `<path d="${sad ? "M53 85q7-7 14 0" : "M53 77q7 9 14 0"}" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  const box = gift
    ? `<rect x="36" y="100" width="48" height="32" rx="7" fill="#FFE08A" ${st}/><rect x="57" y="100" width="6" height="32" fill="#FF8FA8"/><path d="M60 100 q-14-14-18-4 q4 8 18 4 q14 4 18-4 q-4-10-18 4z" fill="#FF8FA8" ${st}/><ellipse cx="32" cy="108" rx="7" ry="9" fill="${f}" ${st}/><ellipse cx="88" cy="108" rx="7" ry="9" fill="${f}" ${st}/>`
    : "";
  return `<svg class="mascot${small ? " sm" : ""}" viewBox="0 0 120 136" role="img" aria-label="${kind} character" xmlns="http://www.w3.org/2000/svg">
    ${ears}<ellipse cx="60" cy="116" rx="27" ry="17" fill="${f}" ${st}/><ellipse cx="60" cy="70" rx="41" ry="36" fill="${f}" ${st}/>
    <ellipse cx="36" cy="78" rx="7" ry="4.5" fill="${pink}" opacity=".85"/><ellipse cx="84" cy="78" rx="7" ry="4.5" fill="${pink}" opacity=".85"/>
    ${eyes}<ellipse cx="60" cy="73" rx="3.2" ry="2.2" fill="#FF8FA8"/>${mouth}${box}</svg>`;
}

/* ---------------- routing ---------------- */
let cur = "builder", preview = false, cfg = null;
const files = [null, null, null, null, null];

function show(id) {
  document.querySelectorAll(".screen.active").forEach(s => s.classList.remove("active"));
  const next = document.getElementById(id);
  next.classList.add("active");
  next.scrollTop = 0;
  cur = id;
  $("#edit").hidden = !(preview && id !== "builder");
  const h = next.querySelector("h1,h2");
  if (h) setTimeout(() => h.focus({ preventScroll: true }), 60);
}

async function route() {
  const h = location.hash;
  if (h.startsWith("#data=")) {
    try {
      cfg = clean(await unpack(h.slice(6)));
      preview = false;
      renderCard(cfg);
      show("landing");
    } catch (e) {
      show("builder");
      $("#err").textContent = "That link looks incomplete or damaged. Ask the sender to share it again.";
    }
  } else show("builder");
}

/* ---------------- card viewer ---------------- */
function photoBox(b64, emoji) {
  return `<div class="ph"><span aria-hidden="true">${emoji}</span>${b64 ? `<img alt="" src="data:image/jpeg;base64,${b64}">` : ""}</div>`;
}

function renderCard(c) {
  const T = TEXT, name = c.n || "you", msg = c.m || T.defaultMsg, note = c.c || T.defaultNote;
  const back = `<button class="btn alt back" data-go="picker">‹ ${T.back}</button>`;
  const floaters = Array.from({ length: 10 }, (_, i) =>
    `<span style="left:${(i * 11 + 4) % 96}%;animation-delay:${(i * 0.7).toFixed(1)}s;animation-duration:${5 + (i % 4)}s">${T.last.floaters[i % T.last.floaters.length]}</span>`).join("");

  $("#card").innerHTML = `
  <section class="screen" id="landing"><div class="col">
    ${mascot(CHARACTERS.landing, "happy", true)}
    <h1 tabindex="-1">${esc(T.landing.title)}</h1><p class="sub">${esc(T.landing.hint)}</p>
    <div class="row"><button class="btn" data-go="picker" data-confetti>${esc(T.landing.yes)}</button>
    <button class="btn alt" data-go="no">${esc(T.landing.no)}</button></div>
  </div></section>

  <section class="screen" id="no"><div class="col">
    ${mascot(CHARACTERS.no, "sad")}
    <h1 tabindex="-1">${esc(T.no.title)}</h1><p class="sub">${esc(T.no.sub)}</p>
    <button class="btn" data-go="landing">${esc(T.no.retry)}</button>
  </div></section>

  <section class="screen" id="picker"><div class="col">
    <h2 tabindex="-1">${esc(T.picker.title)}</h2><p class="sub">${esc(T.picker.sub)}</p>
    <div class="gifts">${T.picker.items.map((it, i) => `
      <button class="gift" data-go="gift${i + 1}">${mascot(CHARACTERS.gifts[i], "happy", false, true)}
      <span><b>${esc(it[0])}</b><small>${esc(it[1])}</small></span></button>`).join("")}</div>
    ${preview ? "" : `<a class="tiny" href="#" data-act="own">${esc(T.own)}</a>`}
  </div></section>

  <section class="screen" id="gift1"><div class="col">
    ${back}
    <h2 tabindex="-1">${esc(T.wish(name))}</h2>
    <div class="frame"><span class="tape" aria-hidden="true"></span>
      <div class="win">${photoBox(c.p, "🎂")}</div>
      <p class="hand">${esc(msg)}</p></div>
    ${c.f ? `<p class="sig">With love, ${esc(c.f)}</p>` : ""}
  </div></section>

  <section class="screen" id="gift2"><div class="col wide">
    ${back}
    <h2 tabindex="-1">${esc(T.lane.title)}</h2><p class="sub">${esc(T.lane.sub)}</p>
    <div class="grid">${c.g.map((p, i) => `<button class="pol" aria-label="Memory photo ${i + 1}"><div class="img">${photoBox(p, T.memoryEmoji[i])}</div></button>`).join("")}</div>
  </div></section>

  <section class="screen" id="gift3"><div class="floaters" aria-hidden="true">${floaters}</div>
    <div class="col" style="position:relative">
    <h2 tabindex="-1">${esc(T.last.title)}</h2>
    ${mascot(CHARACTERS.gifts[2], "happy")}
    <div class="msg"><p class="hand">${esc(note)}</p></div>
    <button class="heart" data-go="picker" aria-label="${esc(T.last.back)}">❤️</button>
  </div></section>`;
}

function confetti() {
  const bits = ["💖", "✨", "🎀", "🌸", "🎉", "🎈"];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement("span"), a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 160;
    s.className = "bit"; s.textContent = bits[i % bits.length];
    s.style.setProperty("--x", Math.cos(a) * d + "px");
    s.style.setProperty("--y", Math.sin(a) * d - 40 + "px");
    s.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1300);
  }
}

/* ---------------- builder ---------------- */
function buildSlots() {
  const mk = i => `<label class="slot"><input type="file" accept="image/*" data-i="${i}" aria-label="${i ? "Memory photo " + i : "Main photo"}"><span>＋<br>${i ? "Memory " + i : "Main photo"}</span></label>`;
  $("#mainSlot").innerHTML = mk(0);
  $("#memSlots").innerHTML = [1, 2, 3, 4].map(mk).join("");
  $("#hero").innerHTML = mascot("bunny", "happy", true);
}

document.addEventListener("change", e => {
  const inp = e.target.closest("input[type=file]");
  if (!inp || !inp.files[0]) return;
  files[+inp.dataset.i] = inp.files[0];
  const slot = inp.parentElement;
  let im = slot.querySelector("img");
  if (!im) { im = new Image(); im.alt = ""; slot.append(im); }
  if (im.src.startsWith("blob:")) URL.revokeObjectURL(im.src);
  im.src = URL.createObjectURL(inp.files[0]);
  slot.classList.add("has");
});

$("#form").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("#err"), btn = $("#make");
  err.textContent = "";
  const n = $("#name").value.trim();
  if (!n) { err.textContent = "Please add their name."; $("#name").focus(); return; }
  btn.disabled = true; btn.textContent = "Making magic...";
  try {
    const imgs = await Promise.all(files.map(f => (f ? compress(f) : "")));
    cfg = clean({ n, f: $("#from").value.trim(), m: $("#msg").value.trim(), c: $("#note").value.trim(), p: imgs[0], g: imgs.slice(1) });
    const packed = await pack(cfg);
    const link = location.href.split("#")[0] + "#data=" + packed;
    history.replaceState(null, "", "#data=" + packed);   /* hash is set without switching modes */
    $("#link").value = link;
    $("#size").textContent = `Link size: about ${Math.round(link.length / 1024)} KB. Photos make links long, so open it once to check before sending.` +
      (link.length > 1500000 ? " This is very large: try fewer or smaller photos." : "");
    const r = $("#result");
    r.hidden = false;
    r.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (x) {
    err.textContent = "Something went wrong while preparing your photos. Try different images.";
  } finally { btn.disabled = false; btn.textContent = "Create my card"; }
});

$("#copy").addEventListener("click", async e => {
  const i = $("#link"), b = e.currentTarget;
  try { await navigator.clipboard.writeText(i.value); }
  catch (x) { i.select(); document.execCommand("copy"); }
  b.textContent = "Copied!";
  setTimeout(() => (b.textContent = "Copy link"), 1800);
});

$("#preview").addEventListener("click", () => { preview = true; renderCard(cfg); show("landing"); });
$("#edit").addEventListener("click", () => { preview = false; show("builder"); });

/* ---------------- card interactions ---------------- */
const app = $("#app");
app.addEventListener("click", e => {
  const pol = e.target.closest(".pol");
  if (pol) { pol.classList.remove("bounce"); void pol.offsetWidth; pol.classList.add("bounce"); }
  if (e.target.closest("[data-act=own]")) {
    e.preventDefault();
    history.replaceState(null, "", location.href.split("#")[0]);
    route();
    return;
  }
  const t = e.target.closest("[data-go]");
  if (!t) return;
  if (t.hasAttribute("data-confetti")) confetti();
  show(t.dataset.go);
});
app.addEventListener("pointerover", e => {
  const pol = e.target.closest(".pol");
  if (pol && e.pointerType === "mouse" && !pol.classList.contains("bounce")) pol.classList.add("bounce");
});
app.addEventListener("animationend", e => e.target.classList.remove("bounce"));

/* ---------------- start ---------------- */
buildSlots();
window.addEventListener("hashchange", route);
route();
