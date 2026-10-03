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
const ICONS = {
  all: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h3l2-6 4 13 3-9 2 4h6"/></svg>',
  software: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
  dataset: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
  platform: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></svg>',
  glossary: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5A2.5 2.5 0 0 1 4 19.5"/><path d="M9 7h7M9 11h5"/></svg>',
};
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

const typeIcon = (type) => `<span class="type-icon" aria-hidden="true">${ICONS[type]}</span>`;

function card(it) {
  if (it.type === "glossary") {
    const tech = `<div><span class="def-label">${it.acronym ? "Stands for" : "Technical"}</span><p class="hl">${inlineMd(it.technical || "")}</p></div>`;
    const pl = `<div><span class="def-label">${it.acronym ? "What it is" : "Plain language"}</span><p class="hl">${inlineMd(it.plainDef || "")}</p></div>`;
    const defs = state.mode === "technical" ? tech : state.mode === "plain" ? pl : tech + pl;
    return `<article class="card term t-glossary"><div class="card-top">${typeIcon("glossary")}<h3><span class="hl">${escapeHtml(it.name)}</span></h3></div>
      <div class="meta"><span class="badge">${it.acronym ? "Acronym" : "Term"}</span><span class="badge section">${escapeHtml(it.group)}</span></div>
      <div class="defs ${state.mode === "both" ? "both" : ""}">${defs}</div></article>`;
  }
  const badges = [];
  if (it.type === "software") {
    badges.push(`<span class="badge section">${escapeHtml(it.section)}</span>`);
    if (it.lang) badges.push(`<span class="badge">${escapeHtml(it.lang)}</span>`);
    badges.push(licBadge(it.license, it.licFam));
    if (it.inactive) badges.push(`<span class="badge none">Inactive or limited</span>`);
  } else if (it.type === "dataset") {
    badges.push(`<span class="badge section">${escapeHtml(it.group)}</span>`);
    if (it.kind) badges.push(`<span class="badge">${escapeHtml(it.kind)}</span>`);
    const acc = { Open: "open", Registration: "reg", Credentialed: "cred" }[it.accFam] || "";
    if (it.access) badges.push(`<span class="badge ${acc}" title="Access">Access: ${inlineMd(it.access)}</span>`);
  } else {
    badges.push(`<span class="badge">${escapeHtml(plain(it.kind || "Platform"))}</span>`);
    badges.push(licBadge(it.license, it.licFam));
  }
  const note = it.note ? `<p class="note">${noteIcon}<span class="hl">${inlineMd(it.note)}</span></p>` : "";
  return `<article class="card t-${it.type}"><div class="card-top">${typeIcon(it.type)}<h3>${titleHtml(it)}</h3></div>
    <div class="meta">${badges.join("")}</div><p class="desc hl">${inlineMd(it.desc || "")}</p>${note}</article>`;
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
  b.dataset.key = label; // stable identity for focus restoration (text includes a changing count)
  b.setAttribute("aria-pressed", String(pressed));
  b.innerHTML = `${escapeHtml(label)}${count != null ? ` <span class="n">${count}</span>` : ""}`;
  b.addEventListener("click", onClick);
  return b;
}

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
    b.innerHTML = `${ICONS[t.id]}<span>${t.label}</span><span class="n">${counts[t.id]}</span>`;
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
    for (const [id, label] of [["both", "Both"], ["technical", "Technical"], ["plain", "Plain"]]) {
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
    lab.innerHTML = `<input type="checkbox" ${state.inactive ? "checked" : ""}><span>Include inactive and limited projects<small>Archived, stale, or unlicensed; kept in a separate file.</small></span>`;
    lab.querySelector("input").addEventListener("change", (e) => { state.inactive = e.target.checked; update(); });
    parts.push(lab);
  }
  // Preserve focus across re-render (e.g. while toggling chips inside the drawer).
  const active = document.activeElement;
  const key = active && $("#filters").contains(active) ? (active.id || active.dataset.key || active.textContent) : null;
  $("#filters").replaceChildren(...parts.filter(Boolean));
  if (key) {
    const again = document.getElementById(key)
      || [...$("#filters").querySelectorAll("button, input")].find((b) => b.dataset.key === key || b.textContent === key);
    again?.focus();
  }
}

function renderEmpty(container) {
  const div = document.createElement("div");
  div.className = "empty";
  const otherTab = state.type !== "all";
  div.innerHTML = `<h3>No matches${state.q ? ` for “${escapeHtml(state.q)}”` : ""}</h3>
    <p>Try fewer or different words, ${otherTab ? "search all types, " : ""}or remove filters. Every word you type must appear in an entry.</p>`;
  const row = document.createElement("div");
  row.className = "chip-row";
  if (otherTab) row.append(chip("Search all types", false, () => setType("all", false)));
  if (activeFilterCount()) row.append(chip("Clear filters", false, clearFilters));
  for (const s of SUGGESTIONS.slice(0, 5)) row.append(chip(s, false, () => setQuery(s)));
  div.append(row);
  container.replaceChildren(div);
}

const activeFilterCount = () => (state.section ? 1 : 0) + (state.group ? 1 : 0) + state.lang.size + state.lic.size + state.access.size;
function clearFilters() { state.section = ""; state.group = ""; state.lang.clear(); state.lic.clear(); state.access.clear(); update(); }
function setQuery(q) { state.q = q; $("#q").value = q; update(true); }

function update(animate = false) {
  const { list, counts, toks } = results();
  renderTabs(counts);
  renderFilters();
  const box = $("#results");
  box.classList.toggle("single", state.type === "glossary");
  if (!list.length) renderEmpty(box);
  else {
    box.innerHTML = list.map(card).join("");
    highlight(box, toks);
    if (animate && !REDUCED_MOTION) {
      [...box.children].slice(0, 18).forEach((el, i) => { el.style.setProperty("--i", i); el.classList.add("enter"); });
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
  setTimeout(() => panel.querySelector("button, select, input")?.focus(), 50);
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

// ---------- EEG visuals (decorative) ----------
// Deterministic PRNG so the traces look the same on every visit.
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// One channel: a sum of band-limited sines with whole-number cycles over `w`, so two copies tile seamlessly.
function channelPath(w, y0, amp, seed, step = 3) {
  const r = mulberry32(seed);
  const comps = [
    { k: 2 + Math.floor(r() * 3), a: 0.55 },             // delta
    { k: 6 + Math.floor(r() * 4), a: 0.35 },             // theta
    { k: 14 + Math.floor(r() * 8), a: 0.45 + r() * 0.3 }, // alpha (dominant in some channels)
    { k: 34 + Math.floor(r() * 16), a: 0.14 },           // beta
    { k: 70 + Math.floor(r() * 30), a: 0.06 },           // fast jitter
  ].map((c) => ({ ...c, p: r() * Math.PI * 2 }));
  const spikes = Array.from({ length: 1 + Math.floor(r() * 2) }, () => ({ x: r() * w, a: (r() > 0.5 ? 1 : -1) * (1.3 + r()), s: 6 + r() * 6 }));
  const norm = comps.reduce((s, c) => s + c.a, 0);
  let d = "";
  for (let x = 0; x <= w * 2; x += step) {
    const u = (x % w) / w;
    let v = comps.reduce((s, c) => s + c.a * Math.sin(2 * Math.PI * c.k * u + c.p), 0) / norm;
    for (const sp of spikes) { const dx = (x % w) - sp.x; v += sp.a * Math.exp(-(dx * dx) / (2 * sp.s * sp.s)); }
    d += `${x ? "L" : "M"}${x} ${(y0 - v * amp).toFixed(1)}`;
  }
  return d;
}

const CHANNELS = ["Fp1", "Fp2", "F7", "F3", "Fz", "F4", "F8", "T7", "C3", "Cz", "C4", "T8", "P3", "Pz", "P4", "O1", "O2"];

function drawTraces(svg, { w, h, rows, amp, opacity, labels, durMin, durMax, seed }) {
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.style.setProperty("--w", `${w}px`);
  const gap = h / (rows + 1);
  const grad = `eeg-grad-${seed}`;
  let out = `<defs><linearGradient id="${grad}" x1="0" x2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset=".5" stop-color="#38bdf8"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>`;
  for (let i = 0; i < rows; i++) {
    const y = gap * (i + 1);
    const dur = durMin + ((i * 7919) % 100) / 100 * (durMax - durMin);
    if (labels) out += `<line class="baseline" x1="0" x2="${w}" y1="${y}" y2="${y}"/><text class="label" x="14" y="${y - amp * 0.9}">${CHANNELS[i % CHANNELS.length]}</text>`;
    out += `<g class="trace" style="--dur:${dur.toFixed(1)}s"><path d="${channelPath(w, y, amp, seed * 97 + i)}" stroke="url(#${grad})" stroke-opacity="${opacity}"/></g>`;
  }
  svg.innerHTML = out;
}

function renderHeroEeg() {
  const svg = $("#eeg");
  const box = svg.getBoundingClientRect();
  const w = Math.max(1400, Math.ceil(box.width));
  const rows = box.height < 520 ? 7 : 10;
  drawTraces(svg, { w, h: Math.ceil(box.height), rows, amp: Math.min(22, box.height / (rows + 1) / 2.2), opacity: 0.75, labels: true, durMin: 26, durMax: 46, seed: 7 });
}

function renderPageEeg() {
  let host = $(".page-eeg");
  if (!host) {
    host = document.createElement("div");
    host.className = "page-eeg";
    host.setAttribute("aria-hidden", "true");
    host.innerHTML = '<svg preserveAspectRatio="none"></svg>';
    document.body.prepend(host);
  }
  const w = Math.max(1400, innerWidth);
  drawTraces(host.querySelector("svg"), { w, h: innerHeight, rows: 6, amp: Math.min(34, innerHeight / 18), opacity: 1, labels: false, durMin: 90, durMax: 150, seed: 31 });
}

// 10–20 montage scalp map with electrodes pulsing in a travelling wave (desktop only via CSS).
function renderScalp() {
  const S = 360, C = S / 2, R = 140;
  const pos = {
    Fp1: [-0.22, -0.8], Fp2: [0.22, -0.8], F7: [-0.62, -0.5], F3: [-0.32, -0.42], Fz: [0, -0.4], F4: [0.32, -0.42], F8: [0.62, -0.5],
    T7: [-0.8, 0], C3: [-0.4, 0], Cz: [0, 0], C4: [0.4, 0], T8: [0.8, 0],
    P7: [-0.62, 0.5], P3: [-0.32, 0.42], Pz: [0, 0.4], P4: [0.32, 0.42], P8: [0.62, 0.5], O1: [-0.22, 0.8], O2: [0.22, 0.8],
  };
  let els = "";
  for (const [name, [x, y]] of Object.entries(pos)) {
    const cx = C + x * R, cy = C + y * R, d = ((y + 1) * 1.1 + Math.abs(x) * 0.5).toFixed(2);
    els += `<g class="el" style="--d:${d}s"><circle class="halo" cx="${cx}" cy="${cy}" r="11"/><circle cx="${cx}" cy="${cy}" r="13"/><text x="${cx}" y="${cy}">${name}</text></g>`;
  }
  const svg = `<svg class="scalp" viewBox="0 0 ${S} ${S}" aria-hidden="true">
    <circle class="grid-line" cx="${C}" cy="${C}" r="${R * 0.8}"/><line class="grid-line" x1="${C}" y1="${C - R}" x2="${C}" y2="${C + R}"/><line class="grid-line" x1="${C - R}" y1="${C}" x2="${C + R}" y2="${C}"/>
    <path class="head" d="M${C - 14} ${C - R + 2} L${C} ${C - R - 18} L${C + 14} ${C - R + 2}"/>
    <path class="head" d="M${C - R - 2} ${C - 18} q-14 18 0 36 M${C + R + 2} ${C - 18} q14 18 0 36"/>
    <circle class="head" cx="${C}" cy="${C}" r="${R}"/>${els}</svg>`;
  $(".hero-inner").insertAdjacentHTML("beforeend", svg);
}

function renderEeg() { renderHeroEeg(); renderPageEeg(); }

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
  $("#suggestions").replaceChildren(...SUGGESTIONS.map((s) => chip(s, false, () => {
    setQuery(s);
    $("#toolbar").scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth" });
  })));
  $("#filters-open").addEventListener("click", openFilters);
  $("#filters-close").addEventListener("click", () => closeFilters());
  $("#filters-apply").addEventListener("click", () => { closeFilters(false); $("#results").focus(); });
  $("#scrim").addEventListener("click", () => closeFilters());
  DESKTOP.addEventListener("change", (e) => { if (e.matches) closeFilters(false); });

  const toTop = $("#to-top");
  new IntersectionObserver(([e]) => { toTop.hidden = e.isIntersecting; }).observe($(".hero"));
  toTop.addEventListener("click", () => { scrollTo({ top: 0, behavior: REDUCED_MOTION ? "auto" : "smooth" }); $("#q").focus({ preventScroll: true }); });

  let lastW = innerWidth;
  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (Math.abs(innerWidth - lastW) > 80) { lastW = innerWidth; renderEeg(); } }, 200);
  });
}

async function boot() {
  initTheme();
  readUrl();
  wireInputs();
  renderScalp();
  renderEeg();
  try {
    const [main, inactive] = await Promise.all([fetchFirst(SOURCES.main), fetchFirst(SOURCES.inactive).catch(() => "")]);
    ITEMS = [...parse(main, "main"), ...parse(inactive, "inactive")];
    if (!ITEMS.length) throw new Error("No entries were found in the README");
    ITEMS.forEach((it, i) => { it.order = i; }); // document order across both files
    if (lastVerified) {
      $("#verified").textContent = `Last verified ${lastVerified}.`;
      $("#eyebrow-date").textContent = lastVerified;
    }
    animateStats();
    update(true);
  } catch (err) {
    $("#count").textContent = "The list could not be loaded.";
    $("#results").innerHTML = `<div class="empty error"><h3>Couldn't load the list</h3>
      <p>${escapeHtml(err.message)}. You can read it directly in the
      <a href="https://github.com/${REPO}#readme" rel="noopener">README on GitHub</a>.</p></div>`;
  }
}

boot();
