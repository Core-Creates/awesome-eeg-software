// Awesome EEG Software — client-side search over the live README.
// The README is the single source of truth; this page only parses and filters it.
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
  { id: "platform", label: "Standards & platforms" },
  { id: "glossary", label: "Glossary" },
];
const SUGGESTIONS = ["ICA", "sleep staging", "ECoG", "source localization", "real-time", "deep learning", "BIDS", "OpenBCI", "MEG", "fNIRS"];
const LANGS = ["Python", "MATLAB", "C/C++", "Julia", "R", "Java/Processing", "TypeScript"];
const LICENSE_FAMILIES = ["Permissive", "Copyleft", "No license"];
const ACCESS = ["Open", "Registration", "Credentialed"];

const state = {
  q: "", type: "all", section: "", lang: new Set(), lic: new Set(), access: new Set(),
  group: "", mode: "both", inactive: false,
};
let ITEMS = [];

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
    if ((m = line.match(/\*\*Last verified:\*\*\s*(\S+)/))) { document.getElementById("verified").textContent = `Last verified ${m[1]}.`; continue; }
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
    .sort((a, b) => (toks.length ? b.s - a.s : 0) || a.it.order - b.it.order || 0);
  return { list: list.map((r) => r.it), counts, toks };
}

// ---------- Rendering ----------
const $ = (sel) => document.querySelector(sel);
const extIcon = () => $("#icon-external").innerHTML;
const noteIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>';

function licBadge(lic, fam) {
  if (!lic || lic === "—") return "";
  const cls = { Permissive: "perm", Copyleft: "copy", "No license": "none" }[fam] || "";
  const label = fam ? `${fam}: ` : "";
  return `<span class="badge ${cls}" title="License">${escapeHtml(label)}${inlineMd(lic)}</span>`;
}

function titleHtml(it) {
  const name = escapeHtml(it.name);
  return it.url ? `<a href="${escapeHtml(it.url)}" rel="noopener" class="hl">${name}</a>${extIcon()}` : `<span class="hl">${name}</span>`;
}

function card(it) {
  if (it.type === "glossary") {
    const tech = `<div><span class="def-label">${it.acronym ? "Stands for" : "Technical"}</span><p class="hl">${inlineMd(it.technical || "")}</p></div>`;
    const pl = `<div><span class="def-label">${it.acronym ? "What it is" : "Plain language"}</span><p class="hl">${inlineMd(it.plainDef || "")}</p></div>`;
    const defs = state.mode === "technical" ? tech : state.mode === "plain" ? pl : tech + pl;
    return `<article class="card term"><h3><span class="hl">${escapeHtml(it.name)}</span></h3>
      <div class="meta"><span class="badge kind">${it.acronym ? "Acronym" : "Term"}</span><span class="badge section">${escapeHtml(it.group)}</span></div>
      <div class="defs ${state.mode === "both" ? "both" : ""}">${defs}</div></article>`;
  }
  const badges = [];
  if (it.type === "software") {
    badges.push(`<span class="badge section">${escapeHtml(it.section)}</span>`);
    if (it.lang) badges.push(`<span class="badge">${escapeHtml(it.lang)}</span>`);
    badges.push(licBadge(it.license, it.licFam));
    if (it.inactive) badges.push(`<span class="badge none">Inactive or limited</span>`);
  } else if (it.type === "dataset") {
    badges.push(`<span class="badge kind">Dataset</span><span class="badge section">${escapeHtml(it.group)}</span>`);
    if (it.kind) badges.push(`<span class="badge">${escapeHtml(it.kind)}</span>`);
    const acc = { Open: "open", Registration: "reg", Credentialed: "cred" }[it.accFam] || "";
    if (it.access) badges.push(`<span class="badge ${acc}" title="Access">Access: ${inlineMd(it.access)}</span>`);
  } else {
    badges.push(`<span class="badge kind">${escapeHtml(plain(it.kind || "Platform"))}</span>`);
    badges.push(licBadge(it.license, it.licFam));
  }
  const note = it.note ? `<p class="note">${noteIcon}<span class="hl">${inlineMd(it.note)}</span></p>` : "";
  return `<article class="card"><h3>${titleHtml(it)}</h3><div class="meta">${badges.join("")}</div>
    <p class="desc hl">${inlineMd(it.desc || "")}</p>${note}</article>`;
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

function chip(label, pressed, onClick, count) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.setAttribute("aria-pressed", String(pressed));
  b.innerHTML = `${escapeHtml(label)}${count != null ? ` <span class="n">${count}</span>` : ""}`;
  b.addEventListener("click", onClick);
  return b;
}

function renderTabs(counts) {
  const tabs = $("#tabs");
  tabs.replaceChildren(...TYPES.map((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.className = "tab";
    b.id = `tab-${t.id}`;
    b.setAttribute("aria-selected", String(state.type === t.id));
    b.setAttribute("aria-controls", "results");
    b.tabIndex = state.type === t.id ? 0 : -1;
    b.innerHTML = `${t.label}<span class="n">${counts[t.id]}</span>`;
    b.addEventListener("click", () => { setType(t.id); });
    return b;
  }));
}

function setType(id) {
  state.type = id;
  state.section = ""; state.group = ""; state.lang.clear(); state.lic.clear(); state.access.clear();
  update();
  $(`#tab-${id}`)?.focus();
}

function facetGroup(legend, values, set, countFn) {
  const fs = document.createElement("fieldset");
  fs.className = "facet";
  fs.innerHTML = `<legend>${escapeHtml(legend)}</legend>`;
  const row = document.createElement("div");
  row.className = "chip-row";
  for (const v of values) {
    const n = countFn(v);
    if (!n && !set.has(v)) continue;
    row.append(chip(v, set.has(v), () => { set.has(v) ? set.delete(v) : set.add(v); update(); }, n));
  }
  fs.append(row);
  return row.childElementCount ? fs : null;
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
  const f = $("#filters");
  const parts = [];
  const toks = tokens(state.q);
  const pool = ITEMS.filter((it) => it.type === state.type && score(it, toks) > 0 && !(it.inactive && !state.inactive));
  const uniq = (key) => [...new Set(ITEMS.filter((it) => it.type === state.type && it[key]).map((it) => it[key]))];

  if (state.type === "software") {
    parts.push(selectGroup("Section", "f-section", uniq("section"), state.section, (v) => { state.section = v; update(); }));
    parts.push(facetGroup("Language", LANGS, state.lang, (v) => pool.filter((it) => it.langs.includes(v)).length));
    parts.push(facetGroup("License", LICENSE_FAMILIES, state.lic, (v) => pool.filter((it) => it.licFam === v).length));
  } else if (state.type === "dataset") {
    parts.push(selectGroup("Modality group", "f-group", uniq("group"), state.group, (v) => { state.group = v; update(); }));
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
    for (const [id, label] of [["both", "Both"], ["technical", "Technical"], ["plain", "Plain language"]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
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
    lab.innerHTML = `<input type="checkbox" ${state.inactive ? "checked" : ""}><span>Include inactive and limited projects <span class="count">(archived, stale, or unlicensed; kept in a separate file)</span></span>`;
    lab.querySelector("input").addEventListener("change", (e) => { state.inactive = e.target.checked; update(); });
    parts.push(lab);
  }
  f.replaceChildren(...parts.filter(Boolean));
}

function renderEmpty(container) {
  const div = document.createElement("div");
  div.className = "empty";
  const otherTab = state.type !== "all";
  div.innerHTML = `<h3>No matches${state.q ? ` for “${escapeHtml(state.q)}”` : ""}</h3>
    <p>Try fewer or different words, ${otherTab ? "search all types, " : ""}or remove filters. Every word you type must appear in an entry.</p>`;
  const row = document.createElement("div");
  row.className = "chip-row";
  if (otherTab) row.append(chip("Search all types", false, () => setType("all")));
  if (hasFilters()) row.append(chip("Clear filters", false, clearFilters));
  for (const s of SUGGESTIONS.slice(0, 5)) row.append(chip(s, false, () => setQuery(s)));
  div.append(row);
  container.replaceChildren(div);
}

const hasFilters = () => !!(state.section || state.group || state.lang.size || state.lic.size || state.access.size);
function clearFilters() { state.section = ""; state.group = ""; state.lang.clear(); state.lic.clear(); state.access.clear(); update(); }
function setQuery(q) { state.q = q; $("#q").value = q; update(); }

function update() {
  const { list, counts, toks } = results();
  renderTabs(counts);
  renderFilters();
  const box = $("#results");
  box.classList.toggle("single", state.type === "glossary");
  if (!list.length) renderEmpty(box);
  else {
    box.innerHTML = list.map(card).join("");
    highlight(box, toks);
  }
  const label = TYPES.find((t) => t.id === state.type).label.toLowerCase();
  $("#count").textContent = `${list.length} ${list.length === 1 ? "result" : "results"}${state.type === "all" ? "" : ` in ${label}`}${state.q ? ` for “${state.q}”` : ""}`;
  $("#clear-all").hidden = !(state.q || hasFilters());
  writeUrl();
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

// ---------- Theme ----------
function initTheme() {
  const btn = $("#theme-toggle");
  const order = ["system", "light", "dark"];
  let mode = "system";
  try { mode = localStorage.getItem("theme") || "system"; } catch (_) {}
  const apply = () => {
    if (mode === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
    btn.dataset.mode = mode;
    const next = order[(order.indexOf(mode) + 1) % order.length];
    btn.setAttribute("aria-label", `Theme: ${mode}. Switch to ${next}`);
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
    t = setTimeout(() => { state.q = e.target.value.trim(); update(); }, 120);
  });
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Escape") setQuery(""); });
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); $("#q").focus(); }
  });
  $("#tabs").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const i = TYPES.findIndex((t) => t.id === state.type);
    const n = e.key === "Home" ? 0 : e.key === "End" ? TYPES.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + TYPES.length) % TYPES.length;
    e.preventDefault();
    setType(TYPES[n].id);
  });
  $("#clear-all").addEventListener("click", () => { state.q = ""; $("#q").value = ""; clearFilters(); $("#q").focus(); });
  $("#suggestions").replaceChildren(...SUGGESTIONS.map((s) => chip(s, false, () => setQuery(s))));
}

async function boot() {
  initTheme();
  readUrl();
  wireInputs();
  try {
    const [main, inactive] = await Promise.all([fetchFirst(SOURCES.main), fetchFirst(SOURCES.inactive).catch(() => "")]);
    ITEMS = [...parse(main, "main"), ...parse(inactive, "inactive")];
    if (!ITEMS.length) throw new Error("No entries were found in the README");
    ITEMS.forEach((it, i) => { it.order = i; }); // document order across both files
    update();
  } catch (err) {
    $("#count").textContent = "The list could not be loaded.";
    $("#results").innerHTML = `<div class="empty error"><h3>Couldn't load the list</h3>
      <p>${escapeHtml(err.message)}. You can read it directly in the
      <a href="https://github.com/${REPO}#readme" rel="noopener">README on GitHub</a>.</p></div>`;
  }
}

boot();
