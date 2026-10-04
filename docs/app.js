// Awesome EEG Software — client-side search over the live README.
// The README is the single source of truth; this page only parses, filters, and decorates it.
"use strict";

const REPO = "Core-Creates/awesome-eeg-software";
const RAW = `https://raw.githubusercontent.com/${REPO}/main/`;
const BLOB = `https://github.com/${REPO}/blob/main/`;
// Local preview (repo root served over HTTP) reads the working copy via "../"; on GitHub Pages "../" would
// resolve to the owner's user site, so there we read raw.githubusercontent.com only. Each source must also
// start with the expected heading, so an unrelated README can never be parsed by mistake.
const ON_PAGES = location.hostname.endsWith("github.io");
const SOURCES = {
  main: { expect: "# Awesome EEG Software", urls: [...(ON_PAGES ? [] : ["../README.md"]), RAW + "README.md"] },
  inactive: { expect: "# Inactive and Limited Projects", urls: [...(ON_PAGES ? [] : ["../inactive-and-limited.md"]), RAW + "inactive-and-limited.md"] },
};

const SKIP_SECTIONS = new Set(["Contents", "Choosing a stack", "Licensing notes", "Contributing", "Footnotes"]);
const TYPES = [
  { id: "all", label: "All" },
  { id: "software", label: "Software" },
  { id: "dataset", label: "Datasets" },
  { id: "platform", label: "Standards" },
  { id: "glossary", label: "Glossary" },
];
const SUGGESTIONS = ["ICA", "sleep staging", "ECoG", "source localization", "real-time", "deep learning", "BIDS", "OpenBCI", "MEG", "fNIRS"];
const LANGS = ["Python", "MATLAB", "C/C++", "Julia", "R", "Java/Processing", "TypeScript"];
const LICENSE_FAMILIES = ["Permissive", "Copyleft", "No license"];
const ACCESS = ["Open", "Registration", "Credentialed"];
const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  q: "", type: "all", section: "", lang: new Set(), lic: new Set(), access: new Set(),
  group: "", mode: "both", inactive: false,
};
let ITEMS = [];
let lastVerified = "";

// ---------- Markdown helpers ----------
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function safeUrl(u) {
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w./-]+\.md(#[\w-]*)?$/.test(u)) return BLOB + u; // relative repo file
  return null; // drop anything else (javascript:, in-page anchors, etc.)
}

function inlineMd(md) {
  let s = escapeHtml(md);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    const u = safeUrl(url.replace(/&amp;/g, "&"));
    return u ? `<a href="${escapeHtml(u)}" rel="noopener">${text}</a>` : text;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return s;
}

const plain = (md) => md.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*`]/g, "").trim();

function splitRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim());
}

function parseLink(cell) {
  const m = cell.match(/^\[([^\]]+)\]\(([^)]+)\)/);
  return m ? { name: m[1], url: safeUrl(m[2]) } : { name: plain(cell), url: null };
}

// A trailing single-asterisk italic (not **bold**) is the entry's caveat note.
function splitNote(desc) {
  const m = desc.match(/(^|[^*])\*([^*]+)\*\s*$/);
  if (!m) return { desc, note: "" };
  return { desc: desc.slice(0, m.index + m[1].length).trim(), note: m[2].trim() };
}

// ---------- Facet classification ----------
function langFacets(lang) {
  const l = lang || "";
  const out = new Set();
  if (/python/i.test(l)) out.add("Python");
  if (/matlab/i.test(l)) out.add("MATLAB");
  if (/c\+\+|(^|[\s(/])c($|[\s)/,])/i.test(l)) out.add("C/C++");
  if (/julia/i.test(l)) out.add("Julia");
  if (/(^|[\s(,/])r($|[\s),/])/i.test(l)) out.add("R");
  if (/java|processing/i.test(l)) out.add("Java/Processing");
  if (/typescript|javascript/i.test(l)) out.add("TypeScript");
  return [...out];
}

function licenseFamily(lic) {
  const l = lic || "";
  if (/no license/i.test(l)) return "No license";
  if (/gpl/i.test(l)) return "Copyleft";
  if (/bsd|mit|apache|cecill|cc0/i.test(l)) return "Permissive";
  return "";
}

function accessFamily(a) {
  const m = (a || "").match(/^(Open|Registration|Credentialed)/i);
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : "";
}

const DEFAULT_LANG = { "EEGLAB plugins and MATLAB pipelines": "MATLAB", "MNE-Python ecosystem": "Python" };

// ---------- Parsing ----------
function parse(md, origin) {
  const items = [];
  let h2 = "", h3 = "", header = null;
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^## (.+)/))) { h2 = m[1].trim(); h3 = ""; header = null; continue; }
    if ((m = line.match(/^### (.+)/))) { h3 = m[1].trim(); header = null; continue; }
    if ((m = line.match(/\*\*Last verified:\*\*\s*(\S+)/))) { lastVerified = m[1]; continue; }
    if (!line.startsWith("|")) { header = null; continue; }
    const cells = splitRow(line);
    if (!header) { header = cells; continue; }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (origin === "main" && SKIP_SECTIONS.has(h2)) continue;
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i] || ""]));
    const item = makeItem(h2, h3, header, row, origin);
    if (item) items.push(item);
  }
  return items;
}

function makeItem(h2, h3, header, row, origin) {
  if (h2 === "Appendix: Glossary") {
    if (header[0] === "Term") {
      return { type: "glossary", name: plain(row.Term), technical: row["Technical definition"], plainDef: row["Plain language"], group: h3 };
    }
    if (header[0] === "Acronym") {
      return { type: "glossary", acronym: true, name: row.Acronym, technical: row["Stands for"], plainDef: row["What it is"], group: h3 || "Acronym quick reference" };
    }
    return null;
  }
  if (h2 === "Data standards and platforms") {
    const { name, url } = parseLink(row.Resource || "");
    return { type: "platform", name, url, kind: row.Type, license: row.License, licFam: licenseFamily(row.License), desc: row.Description, section: h2 };
  }
  if (h2.startsWith("Datasets")) {
    const { name, url } = parseLink(row.Dataset || "");
    const { desc, note } = splitNote(row.Description || "");
    return { type: "dataset", name, url, kind: row.Focus || row.Type || "", access: row.Access, accFam: accessFamily(row.Access), desc, note, group: h3 };
  }
  // Software (main README sections, or the separate inactive file)
  const first = row.Project || header.map((h) => row[h])[0];
  const { name, url } = parseLink(first || "");
  if (!name) return null;
  const section = origin === "inactive" ? row["Original section"] : h2;
  const lang = row.Language || DEFAULT_LANG[section] || "";
  const split = splitNote(row.Description || "");
  return {
    type: "software", name, url, section, lang, langs: langFacets(lang),
    license: row.License, licFam: licenseFamily(row.License), desc: split.desc,
    note: origin === "inactive" ? row["Why it is here"] : split.note,
    inactive: origin === "inactive",
  };
}

// ---------- Search ----------
// Tokens match at the start of a word ("ica" finds "ICA" and "mne-icalabel", not "clinical").
const tokens = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (t, flags = "") => new RegExp(`(^|[^\\p{L}\\p{N}])(${escRe(t)})`, `u${flags}`);

function haystack(it) {
  return [it.name, it.desc, it.note, it.section, it.group, it.lang, it.license, it.kind, it.access, it.technical, it.plainDef]
    .filter(Boolean).map(plain).join(" ").toLowerCase();
}

function score(it, toks) {
  if (!toks.length) return 1;
  const name = it.name.toLowerCase();
  const hay = it._hay || (it._hay = haystack(it));
  let s = 0;
  for (const t of toks) {
    const re = wordRe(t);
    if (!re.test(hay)) return 0;
    if (name === t) s += 10;
    else if (name.startsWith(t)) s += 6;
    else if (re.test(name)) s += 4;
    else if (re.test((it.section || it.group || "").toLowerCase())) s += 2;
    else s += 1;
  }
  return s;
}

function passesFacets(it) {
  if (it.type === "software" && it.inactive && !state.inactive) return false;
  if (state.type === "all" || state.type !== it.type) return true; // facets apply only within their own tab
  if (it.type === "software") {
    if (state.section && it.section !== state.section) return false;
    if (state.lang.size && !it.langs.some((l) => state.lang.has(l))) return false;
    if (state.lic.size && !state.lic.has(it.licFam)) return false;
  }
  if (it.type === "dataset") {
    if (state.group && it.group !== state.group) return false;
    if (state.access.size && !state.access.has(it.accFam)) return false;
  }
  if (it.type === "glossary" && state.group && it.group !== state.group) return false;
  if (it.type === "platform" && state.lic.size && !state.lic.has(it.licFam)) return false;
  return true;
}

function results() {
  const toks = tokens(state.q);
  const base = ITEMS.map((it) => ({ it, s: score(it, toks) })).filter((r) => r.s > 0);
  const counts = Object.fromEntries(TYPES.map((t) => [t.id, 0]));
  for (const r of base) {
    if (r.it.type === "software" && r.it.inactive && !state.inactive) continue;
    counts.all++; counts[r.it.type]++;
  }
  const list = base
    .filter((r) => state.type === "all" || r.it.type === state.type)
    .filter((r) => passesFacets(r.it))
    .sort((a, b) => (toks.length ? b.s - a.s : 0) || a.it.order - b.it.order);
  return { list: list.map((r) => r.it), counts, toks };
}

// ---------- Rendering: results as montage channels ----------
const $ = (sel) => document.querySelector(sel);
const PREFIX = { software: "SW", dataset: "DS", platform: "ST", glossary: "GL" };

// Deterministic PRNG + string hash, so every entry always gets the same mini-trace.
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// An EEG-like signal on u ∈ [0, 1): band components with whole-number cycles (so it tiles seamlessly)
// plus a few sharp transients. Returns roughly [-1, 1], with spikes reaching ~2.
function makeSignal(seed) {
  const r = mulberry32(seed);
  const comps = [
    { k: 2 + Math.floor(r() * 3), a: 0.5 },                 // delta
    { k: 5 + Math.floor(r() * 4), a: 0.35 },                // theta
    { k: 11 + Math.floor(r() * 6), a: 0.35 + r() * 0.35 },  // alpha
    { k: 26 + Math.floor(r() * 14), a: 0.13 },              // beta
    { k: 61 + Math.floor(r() * 30), a: 0.05 },              // EMG-ish jitter
  ].map((c) => ({ ...c, p: r() * Math.PI * 2 }));
  const spikes = Array.from({ length: 1 + Math.floor(r() * 3) }, () => ({ u: r(), a: (r() > 0.35 ? 1 : -1) * (1.2 + r() * 0.9), s: 0.003 + r() * 0.004 }));
  const norm = comps.reduce((s, c) => s + c.a, 0);
  return (u) => {
    let v = 0;
    for (const c of comps) v += c.a * Math.sin(2 * Math.PI * c.k * u + c.p);
    v /= norm;
    for (const sp of spikes) { let d = Math.abs(u - sp.u); d = Math.min(d, 1 - d); v += sp.a * Math.exp(-(d * d) / (2 * sp.s * sp.s)); }
    return v;
  };
}

function sparkline(seedStr) {
  const f = makeSignal(hash(seedStr));
  let d = "";
  for (let x = 0; x <= 120; x += 2) d += `${x ? "L" : "M"}${x} ${(14 - f(x / 120) * 7).toFixed(1)}`;
  return `<svg class="ch-trace" viewBox="0 0 120 28" aria-hidden="true"><path d="${d}"/></svg>`;
}

function metaRow(label, valueHtml) { return valueHtml ? `<dt>${label}</dt><dd>${valueHtml}</dd>` : ""; }
function licHtml(lic, fam) {
  if (!lic || lic === "—") return "";
  const cls = { Copyleft: "copyleft", "No license": "none" }[fam] || "";
  return `${inlineMd(lic)}${fam ? ` <span class="fam ${cls}">· ${escapeHtml(fam)}</span>` : ""}`;
}

function row(it) {
  const gutter = `<div class="ch-gutter"><span class="ch-code">${it.code}</span>${sparkline(it.type + it.name)}</div>`;
  if (it.type === "glossary") {
    const tech = `<div><span class="def-label">${it.acronym ? "Stands for" : "Technical"}</span><p class="hl">${inlineMd(it.technical || "")}</p></div>`;
    const pl = `<div><span class="def-label">${it.acronym ? "What it is" : "Plain language"}</span><p class="hl">${inlineMd(it.plainDef || "")}</p></div>`;
    const defs = state.mode === "technical" ? tech : state.mode === "plain" ? pl : tech + pl;
    return `<li class="ch t-glossary">${gutter}<div class="ch-body"><h3><span class="hl">${escapeHtml(it.name)}</span></h3>
      <div class="defs ${state.mode === "both" ? "both" : ""}">${defs}</div></div>
      <dl class="ch-meta">${metaRow("Kind", it.acronym ? "Acronym" : "Term")}${metaRow("Topic", escapeHtml(it.group))}</dl></li>`;
  }
  const title = it.url
    ? `<a href="${escapeHtml(it.url)}" rel="noopener" class="hl">${escapeHtml(it.name)}</a><span class="arrow" aria-hidden="true">↗</span>`
    : `<span class="hl">${escapeHtml(it.name)}</span>`;
  let meta = "";
  if (it.type === "software") {
    meta = metaRow("Lang", escapeHtml(it.lang)) + metaRow("Lic", licHtml(it.license, it.licFam)) + metaRow("Sect", escapeHtml(it.section))
      + (it.inactive ? metaRow("Status", '<span class="fam none">Inactive / limited</span>') : "");
  } else if (it.type === "dataset") {
    meta = metaRow("Type", escapeHtml(it.kind)) + metaRow("Access", inlineMd(it.access || "")) + metaRow("Group", escapeHtml(it.group));
  } else {
    meta = metaRow("Type", escapeHtml(plain(it.kind || ""))) + metaRow("Lic", licHtml(it.license, it.licFam));
  }
  const note = it.note ? `<p class="note"><b>Note</b><span class="hl">${inlineMd(it.note)}</span></p>` : "";
  return `<li class="ch t-${it.type}">${gutter}<div class="ch-body"><h3>${title}</h3><p class="desc hl">${inlineMd(it.desc || "")}</p>${note}</div>
    <dl class="ch-meta">${meta}</dl></li>`;
}

function highlight(root, toks) {
  const words = toks.filter((t) => t.length >= 2).map(escRe);
  if (!words.length) return;
  // Same word-start rule as search: group 1 is the preceding boundary char, group 2 the match.
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${words.join("|")})`, "giu");
  for (const el of root.querySelectorAll(".hl")) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (!re.test(node.nodeValue)) continue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      node.nodeValue.replace(re, (match, pre, word, idx) => {
        frag.append(node.nodeValue.slice(last, idx + pre.length));
        const mark = document.createElement("mark");
        mark.textContent = word;
        frag.append(mark);
        last = idx + match.length;
      });
      frag.append(node.nodeValue.slice(last));
      node.replaceWith(frag);
    }
  }
}

function button(cls, label, pressed, onClick, count) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.dataset.key = label; // stable identity for focus restoration (text includes a changing count)
  if (pressed != null) b.setAttribute("aria-pressed", String(pressed));
  b.innerHTML = `<span>${escapeHtml(label)}</span>${count != null ? `<span class="n">${count}</span>` : ""}`;
  b.addEventListener("click", onClick);
  return b;
}
const eventBtn = (label, onClick) => button("event", label, null, onClick);

function renderTabs(counts) {
  $("#tabs").replaceChildren(...TYPES.map((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.className = `tab t-${t.id}`;
    b.id = `tab-${t.id}`;
    b.setAttribute("aria-selected", String(state.type === t.id));
    b.setAttribute("aria-controls", "results");
    b.tabIndex = state.type === t.id ? 0 : -1;
    b.innerHTML = `${t.label}<sup>${counts[t.id]}</sup>`;
    b.addEventListener("click", () => setType(t.id));
    return b;
  }));
}

function setType(id, focusTab = true) {
  state.type = id;
  state.section = ""; state.group = ""; state.lang.clear(); state.lic.clear(); state.access.clear();
  update(true);
  if (focusTab) $(`#tab-${id}`)?.focus();
}

function facetGroup(legend, values, set, countFn) {
  const fs = document.createElement("fieldset");
  fs.className = "facet";
  fs.innerHTML = `<legend>${escapeHtml(legend)}</legend>`;
  const list = document.createElement("div");
  list.className = "opts";
  for (const v of values) {
    const n = countFn(v);
    if (!n && !set.has(v)) continue;
    list.append(button("opt", v, set.has(v), () => { set.has(v) ? set.delete(v) : set.add(v); update(); }, n));
  }
  fs.append(list);
  return list.childElementCount ? fs : null;
}

function selectGroup(label, id, values, current, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "facet";
  wrap.innerHTML = `<label class="facet-label" for="${id}">${escapeHtml(label)}</label>`;
  const sel = document.createElement("select");
  sel.id = id;
  sel.className = "select";
  sel.append(new Option("All", ""));
  for (const v of values) sel.append(new Option(v, v, false, v === current));
  sel.addEventListener("change", () => onChange(sel.value));
  wrap.append(sel);
  return wrap;
}

function renderFilters() {
  const parts = [];
  const toks = tokens(state.q);
  const pool = ITEMS.filter((it) => it.type === state.type && score(it, toks) > 0 && !(it.inactive && !state.inactive));
  const uniq = (key) => [...new Set(ITEMS.filter((it) => it.type === state.type && it[key]).map((it) => it[key]))];

  if (state.type === "software") {
    parts.push(selectGroup("Section", "f-section", uniq("section"), state.section, (v) => { state.section = v; update(); }));
    parts.push(facetGroup("Language", LANGS, state.lang, (v) => pool.filter((it) => it.langs.includes(v)).length));
    parts.push(facetGroup("License", LICENSE_FAMILIES, state.lic, (v) => pool.filter((it) => it.licFam === v).length));
  } else if (state.type === "dataset") {
    parts.push(selectGroup("Modality", "f-group", uniq("group"), state.group, (v) => { state.group = v; update(); }));
    parts.push(facetGroup("Access", ACCESS, state.access, (v) => pool.filter((it) => it.accFam === v).length));
  } else if (state.type === "platform") {
    parts.push(facetGroup("License", LICENSE_FAMILIES, state.lic, (v) => pool.filter((it) => it.licFam === v).length));
  } else if (state.type === "glossary") {
    parts.push(selectGroup("Topic", "f-group", uniq("group"), state.group, (v) => { state.group = v; update(); }));
  }
  if (state.type === "glossary" || state.type === "all") {
    const wrap = document.createElement("div");
    wrap.className = "facet";
    wrap.innerHTML = `<span class="facet-label" id="mode-label">Glossary definitions</span>`;
    const seg = document.createElement("div");
    seg.className = "segmented";
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-labelledby", "mode-label");
    for (const [id, label] of [["both", "Both"], ["technical", "Technical"], ["plain", "Plain"]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.dataset.key = `mode-${id}`;
      b.setAttribute("aria-pressed", String(state.mode === id));
      b.addEventListener("click", () => { state.mode = id; update(); });
      seg.append(b);
    }
    wrap.append(seg);
    parts.push(wrap);
  }
  if (state.type === "software" || state.type === "all") {
    const lab = document.createElement("label");
    lab.className = "toggle";
    lab.innerHTML = `<input type="checkbox" id="f-inactive" ${state.inactive ? "checked" : ""}><span>Include inactive and limited projects<small>Archived, stale, or unlicensed; kept in a separate file.</small></span>`;
    lab.querySelector("input").addEventListener("change", (e) => { state.inactive = e.target.checked; update(); });
    parts.push(lab);
  }
  // Preserve focus across re-render (e.g. while toggling options inside the drawer).
  const active = document.activeElement;
  const key = active && $("#filters").contains(active) ? (active.id || active.dataset.key) : null;
  $("#filters").replaceChildren(...parts.filter(Boolean));
  if (key) (document.getElementById(key) || $("#filters").querySelector(`[data-key="${CSS.escape(key)}"]`))?.focus();
}

function renderEmpty(container) {
  const li = document.createElement("li");
  li.className = "empty";
  const otherTab = state.type !== "all";
  li.innerHTML = `<h3>No signal${state.q ? ` for <span class="q">“${escapeHtml(state.q)}”</span>` : ""}</h3>
    <p>Try fewer or different words, ${otherTab ? "search the full montage, " : ""}or remove filters. Every word must match the start of a word in an entry.</p>`;
  const r = document.createElement("div");
  r.className = "event-row";
  if (otherTab) r.append(eventBtn("Search all types", () => setType("all", false)));
  if (activeFilterCount()) r.append(eventBtn("Clear filters", clearFilters));
  for (const s of SUGGESTIONS.slice(0, 5)) r.append(eventBtn(s, () => setQuery(s)));
  li.append(r);
  container.replaceChildren(li);
}

function renderLoading() {
  const flat = '<svg class="ch-trace" viewBox="0 0 120 28" aria-hidden="true"><path d="M0 14H120"/></svg>';
  $("#results").innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<li class="ch loading" aria-hidden="true"><div class="ch-gutter"><span class="ch-code">--·${String(i + 1).padStart(3, "0")}</span>${flat}</div><div class="ch-body"><div class="bar-line"></div><div class="bar-line" style="max-width:45%"></div></div></li>`).join("");
}

const activeFilterCount = () => (state.section ? 1 : 0) + (state.group ? 1 : 0) + state.lang.size + state.lic.size + state.access.size;
function clearFilters() { state.section = ""; state.group = ""; state.lang.clear(); state.lic.clear(); state.access.clear(); update(); }
function setQuery(q) { state.q = q; $("#q").value = q; update(true); }

let lastAnnotated = "";
function update(animate = false) {
  const { list, counts, toks } = results();
  renderTabs(counts);
  renderFilters();
  const box = $("#results");
  if (!list.length) renderEmpty(box);
  else {
    box.innerHTML = list.map(row).join("");
    highlight(box, toks);
    if (animate && !REDUCED_MOTION) {
      [...box.children].slice(0, 14).forEach((el, i) => { el.style.setProperty("--i", i); el.classList.add("enter"); });
    }
  }
  const label = TYPES.find((t) => t.id === state.type).label.toLowerCase();
  const n = list.length;
  $("#count").textContent = `${n} ${n === 1 ? "result" : "results"}${state.type === "all" ? "" : ` in ${label}`}${state.q ? ` for “${state.q}”` : ""}`;
  $("#clear-all").hidden = !(state.q || activeFilterCount());
  const fc = activeFilterCount();
  $("#filters-n").hidden = !fc;
  $("#filters-n").textContent = fc;
  $("#filters-apply").textContent = `Show ${n} ${n === 1 ? "result" : "results"}`;
  if (state.q && state.q !== lastAnnotated) { lastAnnotated = state.q; Recorder.annotate(state.q); }
  writeUrl();
}

// ---------- Filters drawer (small screens) ----------
const DESKTOP = matchMedia("(min-width: 1024px)");
function openFilters() {
  const panel = $("#filters-panel");
  document.body.classList.add("filters-open", "no-scroll");
  $("#scrim").hidden = false;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  $("#filters-open").setAttribute("aria-expanded", "true");
  setTimeout(() => panel.querySelector("button, select, input")?.focus(), 60);
}
function closeFilters(returnFocus = true) {
  if (!document.body.classList.contains("filters-open")) return;
  const panel = $("#filters-panel");
  document.body.classList.remove("filters-open", "no-scroll");
  $("#scrim").hidden = true;
  panel.removeAttribute("role");
  panel.removeAttribute("aria-modal");
  $("#filters-open").setAttribute("aria-expanded", "false");
  if (returnFocus) $("#filters-open").focus();
}
function trapFocus(e) {
  if (e.key !== "Tab" || !document.body.classList.contains("filters-open")) return;
  const f = [...$("#filters-panel").querySelectorAll("button, select, input")].filter((el) => !el.disabled && el.offsetParent);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
}

// ---------- Chart recorder (decorative hero) ----------
// Paper scrolls left under fixed pens; traces exist only where the pens have written. Searches drop
// annotation markers at the pen that travel with the paper. A spiking channel flashes its electrode in Fig. 1.
const Recorder = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const LABELS = ["Fp1", "Fp2", "F3", "F4", "C3", "C4", "P3", "P4", "O1", "O2", "T7", "T8"];
  const SPEED = 46;             // px per second of "paper"
  const GUTTER = 58, RULER = 26;
  let svg, chans = [], ticksG, tracesG, annotG, offset = 0, last = 0, raf = 0, visible = true, W = 0, penX = 0, plotX = GUTTER;
  let firstTick = 0, lastTick = -1, plotWidth = 0;
  const notes = []; // { x (paper position), text } — survive rebuilds

  // Keep 1 s ruler ticks only for the visible stretch of paper; label every 5 s with elapsed time.
  function syncTicks() {
    const from = Math.max(0, Math.floor(offset / SPEED) - 1);
    const to = Math.ceil((offset + plotWidth) / SPEED) + 1;
    while (firstTick < from && ticksG.firstChild) { ticksG.firstChild.remove(); firstTick++; }
    if (firstTick < from) firstTick = from;
    if (lastTick < firstTick - 1) lastTick = firstTick - 1;
    for (let i = lastTick + 1; i <= to; i++) {
      const g = el("g", {}, ticksG), x = i * SPEED, major = i % 5 === 0;
      el("line", { class: `tick${major ? " major" : ""}`, x1: x, x2: x, y1: major ? RULER - 12 : RULER - 6, y2: RULER }, g);
      if (major) el("text", { class: "tick-label", x: x + 4, y: 12 }, g).textContent = `${i} s`;
      lastTick = i;
    }
  }
  const el = (name, attrs, parent) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.append(n); return n; };

  function build() {
    svg = document.getElementById("eeg");
    const { width: w, height: h } = svg.getBoundingClientRect();
    if (!w || !h) return;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.replaceChildren();
    const plotW = w - GUTTER;
    penX = plotW - (w < 700 ? 30 : 118);
    W = Math.ceil(Math.max(plotW, 900) / (SPEED * 5)) * SPEED * 5; // strip width, a whole number of 5 s blocks
    const n = Math.max(6, Math.min(12, Math.round((h - RULER) / 56)));
    const gap = (h - RULER - 10) / n;
    const amp = gap * 0.34;

    const defs = el("defs", {}, svg);
    const cw = el("clipPath", { id: "rec-written" }, defs); el("rect", { x: plotX, y: RULER, width: penX, height: h }, cw);
    const cp = el("clipPath", { id: "rec-plot" }, defs); el("rect", { x: plotX, y: 0, width: plotW, height: h }, cp);

    el("rect", { class: "ruler", x: 0, y: 0, width: w, height: RULER }, svg);
    const plot = el("g", { "clip-path": "url(#rec-plot)" }, svg);
    ticksG = el("g", {}, plot); // 1 s ticks, created lazily from elapsed paper time (labels never wrap)
    firstTick = 0; lastTick = -1;
    plotWidth = plotW;
    el("line", { class: "gutter-rule", x1: 0, x2: w, y1: RULER, y2: RULER }, svg);

    const written = el("g", { "clip-path": "url(#rec-written)" }, svg);
    tracesG = el("g", {}, written);
    annotG = el("g", {}, plot);

    chans = [];
    for (let i = 0; i < n; i++) {
      const y0 = RULER + gap * (i + 0.6);
      const f = makeSignal(1009 + i * 7919);
      let d = "";
      for (let x = 0; x <= W * 2; x += 3) d += `${x ? "L" : "M"}${x} ${(y0 - f((x % W) / W) * amp).toFixed(1)}`;
      el("path", { class: "trace", d }, tracesG);
      chans.push({ f, y0, amp, label: LABELS[i % LABELS.length], arm: null, pen: null, hotUntil: 0 });
    }

    // gutter with channel labels (drawn over the plot edge)
    el("rect", { class: "gutter", x: 0, y: RULER, width: GUTTER, height: h }, svg);
    el("line", { class: "gutter-rule", x1: GUTTER, x2: GUTTER, y1: 0, y2: h }, svg);
    for (const c of chans) { const t = el("text", { class: "chan", x: GUTTER - 10, y: c.y0 }, svg); t.textContent = c.label; }

    // pens + arms
    for (const c of chans) {
      c.arm = el("line", { class: "pen-arm", x1: plotX + penX, x2: w, y1: c.y0, y2: c.y0 }, svg);
      c.pen = el("circle", { class: "pen", cx: plotX + penX, cy: c.y0, r: 3 }, svg);
    }

    // scale bar: 50 µV / 1 s, as printed on clinical EEG pages
    const sx = w - 18 - SPEED, sy = h - 14;
    el("path", { class: "scale-bar", d: `M${sx} ${sy - amp} V${sy} H${sx + SPEED}` }, svg);
    const s1 = el("text", { class: "scale", x: sx - 6, y: sy - amp / 2, "text-anchor": "end", "dominant-baseline": "central" }, svg); s1.textContent = "50 µV";
    const s2 = el("text", { class: "scale", x: sx + SPEED / 2, y: sy - 6, "text-anchor": "middle" }, svg); s2.textContent = "1 s";
    notes.forEach(drawNote);
    draw();
  }

  function draw() {
    const o = offset % W;
    tracesG.setAttribute("transform", `translate(${plotX - o} 0)`);
    ticksG.setAttribute("transform", `translate(${plotX - offset} 0)`);
    syncTicks();
    annotG.setAttribute("transform", `translate(${plotX - offset} 0)`);
    const now = performance.now();
    for (const c of chans) {
      const v = c.f(((penX + o) % W) / W);
      const y = c.y0 - v * c.amp;
      c.pen.setAttribute("cy", y);
      c.arm.setAttribute("y1", y);
      if (v > 1 && now > c.hotUntil) { c.hotUntil = now + 260; flash(c.label); }
    }
    // drop annotations that have scrolled off the paper
    for (const a of [...annotG.children]) if (Number(a.dataset.x) - offset < -260) a.remove();
    while (notes.length && notes[0].x - offset < -260) notes.shift();
  }

  function flash(label) {
    const e = document.querySelector(`.scalp .el[data-ch="${label}"]`);
    if (!e) return;
    e.classList.add("hot");
    setTimeout(() => e.classList.remove("hot"), 220);
  }

  function frame(t) {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    offset += SPEED * dt;
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!REDUCED_MOTION && visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  function drawNote({ x, text }) {
    const h = svg.viewBox.baseVal.height;
    const g = el("g", { class: "annot" }, annotG);
    g.dataset.x = x;
    el("line", { x1: x, x2: x, y1: RULER, y2: h }, g);
    const label = `▼ ${text.length > 22 ? text.slice(0, 21) + "…" : text}`;
    const tw = label.length * 6.9 + 12;
    el("rect", { x: x - tw, y: RULER + 4, width: tw, height: 18 }, g);
    el("text", { x: x - tw + 6, y: RULER + 13 }, g).textContent = label;
  }

  function annotate(text) {
    if (REDUCED_MOTION) notes.length = 0; // static paper: keep only the latest marker
    notes.push({ x: penX + offset, text });
    while (notes.length > 8) notes.shift();
    if (!annotG) return;
    annotG.replaceChildren();
    notes.forEach(drawNote);
  }

  function init() {
    build();
    // Rebuild whenever the chart's own box changes (viewport resize, font-load reflow, orientation).
    let size = "", rt;
    new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      const key = `${Math.round(width / 40)}x${Math.round(height / 40)}`;
      if (key === size) return;
      size = key;
      clearTimeout(rt);
      rt = setTimeout(build, 120);
    }).observe(document.querySelector(".chart"));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(document.querySelector(".recording"));
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    start();
  }
  return { init, build, annotate };
})();

// 10–20 montage figure. Electrodes carry data-ch so the recorder can flash them.
function renderScalp() {
  const S = 220, C = S / 2, R = 88;
  const pos = {
    Fp1: [-0.22, -0.8], Fp2: [0.22, -0.8], F7: [-0.62, -0.5], F3: [-0.32, -0.42], Fz: [0, -0.4], F4: [0.32, -0.42], F8: [0.62, -0.5],
    T7: [-0.8, 0], C3: [-0.4, 0], Cz: [0, 0], C4: [0.4, 0], T8: [0.8, 0],
    P7: [-0.62, 0.5], P3: [-0.32, 0.42], Pz: [0, 0.4], P4: [0.32, 0.42], P8: [0.62, 0.5], O1: [-0.22, 0.8], O2: [0.22, 0.8],
  };
  let els = "";
  for (const [name, [x, y]] of Object.entries(pos)) {
    const cx = (C + x * R).toFixed(1), cy = (C + y * R).toFixed(1);
    els += `<g class="el" data-ch="${name}"><circle cx="${cx}" cy="${cy}" r="9.5"/><text x="${cx}" y="${cy}">${name}</text></g>`;
  }
  $("#scalp").innerHTML = `<svg class="scalp" viewBox="0 0 ${S} ${S}">
    <circle class="guide" cx="${C}" cy="${C}" r="${R * 0.8}"/><line class="guide" x1="${C}" y1="${C - R}" x2="${C}" y2="${C + R}"/><line class="guide" x1="${C - R}" y1="${C}" x2="${C + R}" y2="${C}"/>
    <path class="head" d="M${C - 10} ${C - R + 1.5} L${C} ${C - R - 12} L${C + 10} ${C - R + 1.5}"/>
    <path class="head" d="M${C - R - 1} ${C - 13} q-10 13 0 26 M${C + R + 1} ${C - 13} q10 13 0 26"/>
    <circle class="head" cx="${C}" cy="${C}" r="${R}"/>${els}</svg>`;
}

// ---------- Hero stats ----------
function animateStats() {
  const n = { software: 0, dataset: 0, glossary: 0, platform: 0 };
  for (const it of ITEMS) if (!it.inactive) n[it.type]++;
  for (const el of document.querySelectorAll("[data-stat]")) {
    const target = n[el.dataset.stat] || 0;
    if (REDUCED_MOTION) { el.textContent = target; continue; }
    const t0 = performance.now(), dur = 1100;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

// ---------- URL state (deep linking) ----------
function writeUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.type !== "all") p.set("type", state.type);
  if (state.section) p.set("section", state.section);
  if (state.group) p.set("group", state.group);
  if (state.lang.size) p.set("lang", [...state.lang].join(","));
  if (state.lic.size) p.set("license", [...state.lic].join(","));
  if (state.access.size) p.set("access", [...state.access].join(","));
  if (state.mode !== "both") p.set("defs", state.mode);
  if (state.inactive) p.set("inactive", "1");
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  state.type = TYPES.some((t) => t.id === p.get("type")) ? p.get("type") : "all";
  state.section = p.get("section") || "";
  state.group = p.get("group") || "";
  const list = (k) => new Set((p.get(k) || "").split(",").filter(Boolean));
  state.lang = list("lang"); state.lic = list("license"); state.access = list("access");
  state.mode = ["technical", "plain"].includes(p.get("defs")) ? p.get("defs") : "both";
  state.inactive = p.get("inactive") === "1";
  $("#q").value = state.q;
}

// ---------- Theme: Auto / Paper / Phosphor ----------
function initTheme() {
  const btn = $("#theme-toggle");
  const order = ["system", "light", "dark"];
  const NAMES = { system: "Auto", light: "Paper", dark: "Phosphor" };
  let mode = "system";
  try { mode = localStorage.getItem("theme") || "system"; } catch (_) {}
  const apply = () => {
    if (mode === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
    $("#theme-name").textContent = NAMES[mode];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    btn.setAttribute("aria-label", `Theme: ${NAMES[mode]}. Switch to ${NAMES[next]}`);
    try { mode === "system" ? localStorage.removeItem("theme") : localStorage.setItem("theme", mode); } catch (_) {}
  };
  btn.addEventListener("click", () => { mode = order[(order.indexOf(mode) + 1) % order.length]; apply(); });
  apply();
}

// ---------- Boot ----------
async function fetchFirst({ expect, urls }) {
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: "no-cache" });
      if (!r.ok) continue;
      const text = await r.text();
      if (text.trimStart().startsWith(expect)) return text;
    } catch (_) { /* try the next source */ }
  }
  throw new Error(`Could not load ${urls[urls.length - 1]}`);
}

function wireInputs() {
  let t;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = e.target.value.trim(); update(); }, 160);
  });
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Escape") setQuery(""); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("filters-open")) { closeFilters(); return; }
    trapFocus(e);
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); $("#q").focus(); }
  });
  $("#tabs").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const i = TYPES.findIndex((x) => x.id === state.type);
    const n = e.key === "Home" ? 0 : e.key === "End" ? TYPES.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + TYPES.length) % TYPES.length;
    e.preventDefault();
    setType(TYPES[n].id);
  });
  $("#clear-all").addEventListener("click", () => { state.q = ""; $("#q").value = ""; clearFilters(); $("#q").focus(); });
  $("#suggestions").replaceChildren(...SUGGESTIONS.map((s) => eventBtn(s, () => setQuery(s))));
  $("#filters-open").addEventListener("click", openFilters);
  $("#filters-close").addEventListener("click", () => closeFilters());
  $("#filters-apply").addEventListener("click", () => { closeFilters(false); $("#results").focus(); });
  $("#scrim").addEventListener("click", () => closeFilters());
  DESKTOP.addEventListener("change", (e) => { if (e.matches) closeFilters(false); });

  const toTop = $("#to-top");
  new IntersectionObserver(([e]) => { toTop.hidden = e.isIntersecting; }).observe($(".recording"));
  toTop.addEventListener("click", () => { scrollTo({ top: 0, behavior: REDUCED_MOTION ? "auto" : "smooth" }); $("#q").focus({ preventScroll: true }); });

}

async function boot() {
  initTheme();
  readUrl();
  wireInputs();
  renderScalp();
  renderLoading();
  Recorder.init();
  try {
    const [main, inactive] = await Promise.all([fetchFirst(SOURCES.main), fetchFirst(SOURCES.inactive).catch(() => "")]);
    ITEMS = [...parse(main, "main"), ...parse(inactive, "inactive")];
    if (!ITEMS.length) throw new Error("No entries were found in the README");
    const seq = {};
    ITEMS.forEach((it, i) => {
      it.order = i; // document order across both files
      seq[it.type] = (seq[it.type] || 0) + 1;
      it.code = `${PREFIX[it.type]}·${String(seq[it.type]).padStart(3, "0")}`;
    });
    if (lastVerified) {
      $("#verified").textContent = `Last verified ${lastVerified}.`;
      $("#rec-date").textContent = `${lastVerified} · verified`;
      $("#readout-date").textContent = lastVerified;
    }
    animateStats();
    update(true);
  } catch (err) {
    $("#count").textContent = "The list could not be loaded.";
    $("#results").innerHTML = `<li class="empty error"><h3>Signal lost</h3>
      <p>${escapeHtml(err.message)}. You can read the list directly in the
      <a href="https://github.com/${REPO}#readme" rel="noopener">README on GitHub</a>.</p></li>`;
  }
}

boot();
