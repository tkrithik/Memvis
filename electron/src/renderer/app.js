/* memvis · app.js  © 2025 Krithik Tamilvanan */

// ── DOM ───────────────────────────────────────────────────────────────────────
const editor      = document.getElementById('editor');
const gutter      = document.getElementById('gutter');
const btnOpen     = document.getElementById('btn-open');
const btnRun      = document.getElementById('btn-run');
const btnAI       = document.getElementById('btn-ai');
const fileNameEl  = document.getElementById('file-name');
const statusBadge = document.getElementById('status-badge');
const splash      = document.getElementById('splash');
const analysing   = document.getElementById('analysing');
const errorView   = document.getElementById('error-view');
const errorMsg    = document.getElementById('error-msg');
const resultsEl   = document.getElementById('results');
const addrTip     = document.getElementById('addr-tip');
const stripTip    = document.getElementById('strip-tip');

// ── Loading screen ─────────────────────────────────────────────────────────────
const loadScreen = document.getElementById('loading-screen');
setTimeout(() => {
  loadScreen.classList.add('fade-out');
  setTimeout(() => loadScreen.remove(), 520);
}, 1700);

// ── Menu shortcuts ─────────────────────────────────────────────────────────────
window.api.onMenuOpen(() => btnOpen.click());
window.api.onMenuRun(()  => btnRun.click());
window.api.onMenuAI(()   => openAIModal());

// ── Editor ────────────────────────────────────────────────────────────────────
syncGutter();
function syncGutter() {
  const n = editor.value.split('\n').length;
  if (gutter.children.length === n) return;
  gutter.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const d = document.createElement('div');
    d.textContent = i;
    gutter.appendChild(d);
  }
}
editor.addEventListener('input', syncGutter);
editor.addEventListener('scroll', () => { gutter.scrollTop = editor.scrollTop; });
editor.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const s = editor.selectionStart;
  editor.value = editor.value.slice(0, s) + '    ' + editor.value.slice(editor.selectionEnd);
  editor.selectionStart = editor.selectionEnd = s + 4;
  syncGutter();
});

// ── Status ────────────────────────────────────────────────────────────────────
function setStatus(state, label) {
  statusBadge.className = `status ${state}`;
  statusBadge.textContent = label;
}

// ── Open file ─────────────────────────────────────────────────────────────────
btnOpen.addEventListener('click', async () => {
  const r = await window.api.openFile();
  if (!r) return;
  setEditorContent(r.source, r.path.split('/').pop());
  setStatus('idle', 'ready');
});

function setEditorContent(src, name) {
  editor.value = src;
  if (name) fileNameEl.textContent = name;
  editor.classList.add('fade-in');
  editor.addEventListener('animationend', () => editor.classList.remove('fade-in'), { once: true });
  syncGutter();
}

// ── Run ───────────────────────────────────────────────────────────────────────
btnRun.addEventListener('click', run);
async function run() {
  const src = editor.value.trim();
  if (!src) return;
  setStatus('running', 'analysing…');
  btnRun.disabled = true;
  btnRun.classList.add('running');
  btnRun.querySelector('.run-icon').innerHTML = `<circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="18" stroke-dashoffset="6"/>`;
  show('analysing');

  const data = await window.api.analyse(src);

  btnRun.disabled = false;
  btnRun.classList.remove('running');
  btnRun.querySelector('.run-icon').innerHTML = `<polygon points="3,1 11,6 3,11"/>`;

  if (data.error) { errorMsg.textContent = data.error; show('error'); setStatus('error', 'error'); return; }
  setStatus('ok', `${data.symbols.length} symbols`);
  render(data);
  show('results');
}

// ── Show/hide ─────────────────────────────────────────────────────────────────
function show(state) {
  splash.classList.toggle('hidden',    state !== 'splash');
  analysing.classList.toggle('hidden', state !== 'analysing');
  errorView.classList.toggle('hidden', state !== 'error');
  resultsEl.classList.toggle('hidden', state !== 'results');
}

// ══ RESIZE HANDLE ═════════════════════════════════════════════════════════════
const paneLeft     = document.getElementById('pane-left');
const resizeHandle = document.getElementById('resize-handle');
let isResizing = false;
let startX = 0;
let startW = 0;

resizeHandle.addEventListener('mousedown', e => {
  isResizing = true;
  startX = e.clientX;
  startW = paneLeft.offsetWidth;
  resizeHandle.classList.add('dragging');
  paneLeft.classList.add('resizing');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', e => {
  if (!isResizing) return;
  const delta = e.clientX - startX;
  const newW  = Math.max(220, Math.min(700, startW + delta));
  paneLeft.style.width = newW + 'px';
});

document.addEventListener('mouseup', () => {
  if (!isResizing) return;
  isResizing = false;
  resizeHandle.classList.remove('dragging');
  paneLeft.classList.remove('resizing');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// ══ AI MODAL ══════════════════════════════════════════════════════════════════
const aiBackdrop = document.getElementById('ai-backdrop');
const aiModal    = document.getElementById('ai-modal');
const aiPrompt   = document.getElementById('ai-prompt');
const aiKey      = document.getElementById('ai-key');
const aiError    = document.getElementById('ai-error');
const aiSubmit   = document.getElementById('ai-submit');
const aiClose    = document.getElementById('ai-close');
const aiCancel   = document.getElementById('ai-cancel');
const keyToggle  = document.getElementById('key-toggle');

// Persist key in memory across opens
let savedKey = '';

btnAI.addEventListener('click', openAIModal);
aiClose.addEventListener('click',  closeAIModal);
aiCancel.addEventListener('click', closeAIModal);
aiBackdrop.addEventListener('click', e => { if (e.target === aiBackdrop) closeAIModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAIModal(); });

keyToggle.addEventListener('click', () => {
  aiKey.type = aiKey.type === 'password' ? 'text' : 'password';
});

function openAIModal() {
  aiError.classList.add('hidden');
  if (savedKey) aiKey.value = savedKey;
  aiBackdrop.classList.remove('hidden');
  setTimeout(() => aiPrompt.focus(), 80);
}
function closeAIModal() {
  aiBackdrop.classList.add('hidden');
  aiModal.classList.remove('generating');
}

aiSubmit.addEventListener('click', generateAI);
aiPrompt.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generateAI();
});

async function generateAI() {
  const prompt = aiPrompt.value.trim();
  const key    = aiKey.value.trim();

  if (!prompt) { showAIError('Please describe what the program should do.'); return; }
  if (!key)    { showAIError('Please enter your Anthropic API key.'); return; }

  savedKey = key;
  aiError.classList.add('hidden');
  aiModal.classList.add('generating');
  aiSubmit.disabled = true;
  aiSubmit.querySelector('.run-icon').innerHTML = `<circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="18" stroke-dashoffset="6"/>`;
  aiSubmit.classList.add('running');

  const result = await window.api.aiGenerate(prompt, key);

  aiSubmit.disabled = false;
  aiSubmit.querySelector('.run-icon').innerHTML = `<polygon points="3,1 11,6 3,11"/>`;
  aiSubmit.classList.remove('running');
  aiModal.classList.remove('generating');

  if (result.error) { showAIError(result.error); return; }

  // Strip any accidental markdown fences
  let code = result.code.trim();
  code = code.replace(/^```[c]?\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  closeAIModal();
  setEditorContent(code, 'ai-generated.c');
  setStatus('idle', 'AI generated');
  aiPrompt.value = '';
}

function showAIError(msg) {
  aiError.textContent = msg;
  aiError.classList.remove('hidden');
  aiError.style.animation = 'none';
  requestAnimationFrame(() => { aiError.style.animation = ''; });
}

// ══ RENDER ════════════════════════════════════════════════════════════════════
let allSymbols  = [];
let allSegments = [];
let activeTab   = 'all';

const SEG_COLORS = {
  text:   '#3b82f6', data:  '#10b981', bss:   '#8b5cf6',
  rodata: '#f59e0b', weak:  '#06b6d4', other: '#374151',
};

function render(data) {
  allSymbols  = data.symbols  || [];
  allSegments = data.segments || [];
  updateCounts();
  renderStrip();
  renderTable(activeTab);
  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.seg;
      renderTable(activeTab);
    };
  });
}

function updateCounts() {
  const c = { all: allSymbols.length, text: 0, data: 0, bss: 0, rodata: 0 };
  for (const s of allSymbols) if (c[s.segment] !== undefined) c[s.segment]++;
  for (const [k, v] of Object.entries(c)) {
    const el = document.getElementById(`cnt-${k}`);
    if (el) el.textContent = v;
  }
}

// ── Address strip ─────────────────────────────────────────────────────────────
function renderStrip() {
  const strip  = document.getElementById('addr-strip');
  const legend = document.getElementById('strip-legend');

  let bars = [];
  if (allSegments.length) {
    for (const seg of allSegments) {
      const key = seg.name.replace('.', '');
      bars.push({ label: seg.name, size: seg.size, color: SEG_COLORS[key] || SEG_COLORS.other, addr: seg.start, byteSize: seg.size });
    }
    const maxSz = Math.max(...bars.map(b => b.size));
    bars.push({ label: 'heap ↑',  size: maxSz * .6,  color: '#10b981', addr: '', byteSize: null, isHeap: true });
    bars.push({ label: '···',     size: maxSz * 1.8,  color: '#1a1d26', addr: '', byteSize: null });
    bars.push({ label: '↓ stack', size: maxSz * .45,  color: '#ef4444', addr: '', byteSize: null, isStack: true });
  } else {
    const counts = {};
    for (const s of allSymbols) counts[s.segment] = (counts[s.segment] || 0) + 1;
    for (const [seg, count] of Object.entries(counts))
      bars.push({ label: seg, size: count, color: SEG_COLORS[seg] || SEG_COLORS.other, addr: '', byteSize: null });
  }

  const total = bars.reduce((s, b) => s + b.size, 0);
  strip.innerHTML = bars.map((b, i) => `
    <div class="seg-bar" data-bar-idx="${i}"
         style="flex:${(b.size/total*100).toFixed(2)};background:${b.color}">
      <span class="seg-bar-name">${esc(b.label)}</span>
      ${b.addr && b.addr !== '?' ? `<span class="seg-bar-range">${b.addr.replace(/^0x0+/,'0x')}</span>` : ''}
    </div>`).join('');

  strip.querySelectorAll('.seg-bar').forEach((el, i) => {
    const b = bars[i];
    el.addEventListener('mouseenter', ev => showStripTip(ev, b));
    el.addEventListener('mousemove',  ev => moveStripTip(ev));
    el.addEventListener('mouseleave', hideStripTip);
  });

  legend.innerHTML = [
    { label: '.text   — functions & code',       color: '#3b82f6' },
    { label: '.data   — initialized globals',    color: '#10b981' },
    { label: '.bss    — zero-init globals',      color: '#8b5cf6' },
    { label: '.rodata — string literals',        color: '#f59e0b' },
    { label: 'heap    — malloc() allocations ↑', color: '#10b981' },
    { label: 'stack   — call frames ↓',          color: '#ef4444' },
  ].map(l => `<div class="legend-entry">
    <div class="legend-dot" style="background:${l.color}"></div>
    <span>${esc(l.label)}</span>
  </div>`).join('');
}

// ── Table ─────────────────────────────────────────────────────────────────────
function renderTable(tab) {
  const wrap = document.getElementById('table-wrap');
  if (tab === 'maps') { wrap.innerHTML = segsTable(allSegments); return; }

  const syms = tab === 'all' ? allSymbols : allSymbols.filter(s => s.segment === tab);
  if (!syms.length) {
    wrap.innerHTML = `<div style="padding:40px;text-align:center;color:var(--tx3);font-family:var(--sans);font-size:12.5px">No symbols in this segment.</div>`;
    return;
  }

  const rows = syms.map((s, i) => {
    const nc = s.segment === 'text' ? 'sym-fn' : s.segment === 'weak' ? 'sym-weak' : 'sym-var';
    return `<tr style="animation:rowIn .2s ease ${(Math.min(i,40)*14).toFixed(0)}ms both">
      <td class="cell-addr" data-addr="${esc(s.addr)}" data-name="${esc(s.name)}" data-seg="${esc(s.segment)}" data-type="${esc(s.type)}">${esc(s.addr)}</td>
      <td>${segBadge(s.segment)}</td>
      <td class="${nc}">${esc(s.name)}</td>
      <td style="color:var(--tx3);font-size:11px">${typeLabel(s.segment, s.type)}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `<table class="sym-table">
    <thead><tr><th>Address</th><th>Segment</th><th>Name</th><th>Kind</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  wrap.querySelectorAll('.cell-addr').forEach(cell => {
    cell.addEventListener('mouseenter', ev => showAddrTip(ev, cell));
    cell.addEventListener('mousemove',  ev => moveAddrTip(ev));
    cell.addEventListener('mouseleave', hideAddrTip);
  });
}

function segsTable(segs) {
  if (!segs.length) return `<div style="padding:40px;text-align:center;color:var(--tx3);font-family:var(--sans)">No segment data.</div>`;
  const rows = segs.map((s, i) => {
    const color = SEG_COLORS[s.name.replace('.', '')] || '#6b7280';
    return `<tr style="animation:rowIn .2s ease ${i*40}ms both">
      <td><span class="seg-badge" style="background:${color}22;color:${color}">${esc(s.name)}</span></td>
      <td class="cell-addr">${esc(s.start)}</td>
      <td style="color:var(--green)">${fmtBytes(s.size)}</td>
      <td style="color:var(--tx3);font-size:11px">${segDesc(s.name)}</td>
    </tr>`;
  }).join('');
  return `<table class="sym-table">
    <thead><tr><th>Segment</th><th>Start Address</th><th>Size</th><th>Contents</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ══ TOOLTIPS ══════════════════════════════════════════════════════════════════
function showAddrTip(ev, cell) {
  const { addr, name, seg, type } = cell.dataset;
  const segColor = SEG_COLORS[seg] || '#6b7280';
  const ki = inferKindInfo(name, seg, type);
  addrTip.innerHTML = `
    <div class="tip-addr">${esc(addr)}</div>
    <div class="tip-row"><span class="tip-label">name</span><span class="tip-val">${esc(name)}</span></div>
    <div class="tip-row"><span class="tip-label">kind</span><span class="tip-val ${ki.cls}">${esc(ki.kind)}</span></div>
    ${ki.size ? `<div class="tip-row"><span class="tip-label">size</span><span class="tip-val">${esc(ki.size)}</span></div>` : ''}
    ${ki.hint ? `<div class="tip-row"><span class="tip-label">holds</span><span class="tip-val ${ki.cls}">${esc(ki.hint)}</span></div>` : ''}
    <div class="tip-seg">
      <div class="tip-seg-dot" style="background:${segColor}"></div>
      <span class="tip-seg-name">${esc(segDescription(seg))}</span>
    </div>`;
  positionTip(addrTip, ev);
  addrTip.classList.add('visible');
}
function moveAddrTip(ev) { positionTip(addrTip, ev); }
function hideAddrTip()   { addrTip.classList.remove('visible'); }

function showStripTip(ev, bar) {
  let rows = '';
  if (bar.byteSize != null) rows += tipRow('size', fmtBytes(bar.byteSize));
  if (bar.addr && bar.addr !== '?') rows += tipRow('start', bar.addr.replace(/^0x0+/,'0x'));
  if (bar.isHeap)  { rows += tipRow('grows', 'upward ↑'); rows += tipRow('used by', 'malloc() / calloc()'); }
  if (bar.isStack) { rows += tipRow('grows', 'downward ↓'); rows += tipRow('used by', 'local vars, call frames'); }
  const key = bar.label.replace(/[↑↓ ·]/g,'').replace('.','').trim();
  const sc = allSymbols.filter(s => s.segment === key).length;
  if (sc > 0) rows += tipRow('symbols', String(sc));
  if (!rows) rows = tipRow('note', 'unmapped virtual space');
  stripTip.innerHTML = `<div class="strip-tip-name">${esc(bar.label)}</div>${rows}`;
  positionTip(stripTip, ev);
  stripTip.classList.add('visible');
}
function moveStripTip(ev) { positionTip(stripTip, ev); }
function hideStripTip()   { stripTip.classList.remove('visible'); }

function tipRow(label, val) {
  return `<div class="strip-tip-row"><span class="strip-tip-label">${esc(label)}</span><span class="strip-tip-val">${esc(val)}</span></div>`;
}

function positionTip(tip, ev) {
  const pad = 12, tw = tip.offsetWidth || 220, th = tip.offsetHeight || 120;
  let x = ev.clientX + 14, y = ev.clientY - th / 2;
  if (x + tw > window.innerWidth  - pad) x = ev.clientX - tw - 14;
  if (y < pad)                           y = pad;
  if (y + th > window.innerHeight - pad) y = window.innerHeight - th - pad;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

// ══ INFERENCE ═════════════════════════════════════════════════════════════════
function inferKindInfo(name, seg, typeChar) {
  if (seg === 'text') return { kind: 'function', cls: 'tip-fn', hint: 'executable machine code', size: null };
  const n = name.toLowerCase();
  if (n.includes('msg')||n.includes('str')||n.includes('buf')||n.includes('name')||n.includes('text'))
    return { kind: 'char[]', cls: 'tip-char', hint: 'string / character array', size: null };
  if (n.includes('pi')||n.includes('float')||n.includes('ratio')||n.includes('rate'))
    return { kind: 'float', cls: 'tip-float', hint: 'floating-point number', size: '4–8 bytes' };
  if (n.includes('ptr')||n.includes('p_')||n.endsWith('_p'))
    return { kind: 'pointer', cls: 'tip-int', hint: 'memory address', size: '8 bytes (64-bit)' };
  if (seg === 'bss')    return { kind: 'int (zero-init)', cls: 'tip-bss',   hint: 'starts as 0', size: null };
  if (seg === 'data')   return { kind: 'int',             cls: 'tip-int',   hint: 'initialized global', size: '4 bytes (typical int)' };
  if (seg === 'rodata') return { kind: 'const',           cls: 'tip-char',  hint: 'read-only, cannot be modified', size: null };
  return { kind: seg || 'symbol', cls: '', hint: null, size: null };
}

function segDescription(seg) {
  return { text:'.text — executable code', data:'.data — initialized globals', bss:'.bss — zero-init globals', rodata:'.rodata — read-only constants', weak:'weak symbol' }[seg] || seg;
}

// ══ HELPERS ═══════════════════════════════════════════════════════════════════
function segBadge(seg) {
  const cls = { text:'badge-text', data:'badge-data', bss:'badge-bss', rodata:'badge-rodata', weak:'badge-weak' }[seg] || 'badge-other';
  return `<span class="seg-badge ${cls}">${seg}</span>`;
}
function typeLabel(seg, t) {
  return { T:'global fn', t:'local fn', D:'init var', d:'local static', B:'zero-init', b:'local zero', R:'read-only', r:'local ro', W:'weak' }[t] || t || '—';
}
function segDesc(name) {
  return { '.text':'compiled functions','.data':'initialized globals','.bss':'zero-initialized globals','.rodata':'string literals & constants' }[name] || 'program section';
}
function fmtBytes(n) {
  if (!n) return '?';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1048576).toFixed(2)} MB`;
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
