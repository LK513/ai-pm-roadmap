const REPO = 'LK513/ai-pm-roadmap';
const REPO_URL = `https://github.com/${REPO}`;
const ISSUES_URL = `${REPO_URL}/issues`;
const NEW_ISSUE_URL = `${REPO_URL}/issues/new`;
const TASKS_KEY = 'ai-pm-tasks';
const WEEK_KEY = 'ai-pm-tasks-week';
const FRONTIER_CACHE_KEY = 'ai-pm-frontier-cache';

localStorage.removeItem(FRONTIER_CACHE_KEY);

const STATUS_OPTIONS = [
  { value: '全部完成', color: 'green' },
  { value: '部分完成', color: 'amber' },
  { value: '放弃', color: 'red' },
  { value: '延期', color: 'purple' }
];

const MODAL_TYPES = {
  reflection: {
    title: '记录反思', label: 'reflection',
    fields: [
      { key: 'think', label: '想清楚了什么', ph: '一两句话', type: 'input' },
      { key: 'diff', label: '和之前认知有什么不同', ph: '对比', type: 'textarea' },
      { key: 'impact', label: '对 AI PM 转型的影响', ph: '可留空', type: 'input' }
    ]
  },
  idea: {
    title: '记录灵感', label: 'idea',
    fields: [
      { key: 'scene', label: '场景', ph: '催收/风控/客服/营销/后台?', type: 'input' },
      { key: 'idea', label: 'Idea', ph: '一句话说清楚', type: 'input' },
      { key: 'why', label: '关联消金业务', ph: '为什么值得用AI?', type: 'textarea' },
      { key: 'risk', label: '风险/疑问', ph: '可留空', type: 'input' }
    ]
  },
  resource: {
    title: '收藏资源', label: 'resource',
    fields: [
      { key: 'url', label: '资源链接', ph: 'https://...', type: 'input' },
      { key: 'type', label: '类型', ph: '文章/课程/工具/竞品/论文', type: 'input' },
      { key: 'why', label: '为什么值得看', ph: '一句话理由', type: 'input' },
      { key: 'when', label: '计划什么时候看', ph: '本周/本月/备查', type: 'input' }
    ]
  },
  blocker: {
    title: '记录卡壳', label: 'blocker',
    fields: [
      { key: 'where', label: '卡在哪了', ph: '具体到不能再具体', type: 'textarea' },
      { key: 'tried', label: '已尝试了什么', ph: '列2-3个方法', type: 'textarea' },
      { key: 'need', label: '需要什么帮助', ph: '找资料/找人聊/Claude帮想', type: 'input' },
      { key: 'urgency', label: '紧急程度', ph: '低/中/高', type: 'input' }
    ]
  }
};

/* ── Data ── */
async function loadData() {
  try {
    const r = await fetch('data.json?t=' + Date.now());
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    document.getElementById('error-banner').classList.remove('hidden');
    document.getElementById('error-message').textContent = e.message;
    return null;
  }
}

/* ── Date ── */
function daysLeft(d) { return Math.max(0, Math.round((new Date(d) - new Date()) / 86400000)); }
function daysAgo(s) {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(s); d.setHours(0,0,0,0);
  return Math.floor((t - d) / 86400000);
}
function nowStr() { return new Date().toISOString().slice(0,16).replace('T',' '); }

/* ── Hero ── */
function renderHero(d) {
  document.getElementById('north-star-quote').textContent = d.northStar.title;
  document.getElementById('north-star-milestone').textContent = d.northStar.milestone;
}

/* ── Timeline (in stats bar) ── */
function renderTimeline(progress) {
  const el = document.getElementById('timeline');
  el.innerHTML = '';
  progress.phases.forEach((p, i) => {
    const cls = p.status === '完成' ? 'tl-node--done' : p.status === '进行中' ? 'tl-node--active' : '';
    const n = document.createElement('div');
    n.className = `tl-node ${cls}`;
    n.innerHTML = `<div class="tl-dot"></div><span class="tl-q">${p.quarter}</span>`;
    el.appendChild(n);
    if (i < progress.phases.length - 1) {
      const next = progress.phases[i+1];
      const b = document.createElement('div');
      b.className = `tl-bar ${p.status === '完成' && next.status === '完成' ? 'tl-bar--done' : p.status === '完成' && next.status === '进行中' ? 'tl-bar--active' : ''}`;
      el.appendChild(b);
    }
  });
  const active = progress.phases.find(p => p.status === '进行中');
  const cd = document.getElementById('countdown-area');
  if (active) {
    cd.innerHTML = `<strong>${active.quarter} ${active.theme}</strong> 还剩 <em>${daysLeft(active.endDate)}</em> 天`;
  }
}

/* ── Modal ── */
let _modalSubmit = null;

function openModal(title, html, btnLabel, onSubmit) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  const btn = document.getElementById('modal-submit');
  btn.textContent = btnLabel;
  if (_modalSubmit) btn.removeEventListener('click', _modalSubmit);
  _modalSubmit = onSubmit;
  btn.addEventListener('click', _modalSubmit);
  document.getElementById('modal-overlay').classList.add('open');
  const first = document.getElementById('modal-body').querySelector('input,textarea,select');
  if (first) setTimeout(() => first.focus(), 200);
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

function initModal() {
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-cancel').onclick = closeModal;
  document.getElementById('modal-overlay').onclick = e => { if (e.target.id === 'modal-overlay') closeModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Side widget buttons
  document.querySelectorAll('.sw-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => openFeedbackModal(btn.dataset.type));
  });
}

function openFeedbackModal(type) {
  const cfg = MODAL_TYPES[type];
  if (!cfg) return;
  let html = '';
  cfg.fields.forEach(f => {
    html += `<div class="modal__field"><label class="modal__label" for="mf-${f.key}">${f.label}</label>`;
    html += f.type === 'textarea'
      ? `<textarea class="modal__textarea" id="mf-${f.key}" rows="3" placeholder="${f.ph}"></textarea>`
      : `<input class="modal__input" id="mf-${f.key}" type="text" placeholder="${f.ph}">`;
    html += '</div>';
  });
  openModal(cfg.title, html, '复制并提交', () => {
    let body = '';
    cfg.fields.forEach(f => {
      const el = document.getElementById(`mf-${f.key}`);
      body += `**${f.label}:**\n${el?.value.trim() || '(未填)'}\n\n`;
    });
    const title = `[${cfg.title}] `;
    navigator.clipboard?.writeText(`标题: ${title}\n\n${body}`).then(
      () => { toast('已复制'); window.open(`${NEW_ISSUE_URL}?template=${cfg.label}.md&title=${encodeURIComponent(title)}`, '_blank'); },
      () => toast('复制失败')
    );
    closeModal();
  });
}

/* ── Tasks ── */
function loadTasks(defs, weekOf) {
  if (localStorage.getItem(WEEK_KEY) !== weekOf) {
    localStorage.setItem(WEEK_KEY, weekOf);
    const old = _parse();
    const done = old.filter(t => t.completedAt);
    if (done.length) {
      const arch = JSON.parse(localStorage.getItem('ai-pm-archive') || '[]');
      arch.push(...done);
      localStorage.setItem('ai-pm-archive', JSON.stringify(arch));
    }
    localStorage.removeItem(TASKS_KEY);
  }
  const saved = _parse();
  return saved.length ? saved : defs.map(t => ({ id: t.id, text: t.task, done: t.done, status: null, completedAt: null, notes: '' }));
}

function _parse() { try { const s = JSON.parse(localStorage.getItem(TASKS_KEY)); return Array.isArray(s) ? s : []; } catch { return []; } }
function save(t) { localStorage.setItem(TASKS_KEY, JSON.stringify(t)); }

function renderTasks(defs, weekOf) {
  document.getElementById('week-of').textContent = weekOf;
  const tasks = loadTasks(defs, weekOf);
  const active = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done).sort((a,b) => (b.completedAt||'').localeCompare(a.completedAt||''));
  drawActive(active, tasks, defs, weekOf);
  drawDone(done);
  drawAdd(tasks, defs, weekOf);
}

function drawActive(active, all, defs, weekOf) {
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';
  if (!active.length) { list.innerHTML = '<li class="task-empty">本周任务全部完成</li>'; return; }
  active.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task';

    const ck = document.createElement('span');
    ck.className = 'task__check';
    ck.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    ck.onclick = () => openCompleteModal(t, all, defs, weekOf);

    const txt = document.createElement('span');
    txt.className = 'task__text';
    txt.textContent = t.text;
    txt.addEventListener('dblclick', () => {
      txt.contentEditable = 'true'; txt.focus();
      const r = document.createRange(); r.selectNodeContents(txt);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
    });
    txt.addEventListener('blur', () => {
      txt.contentEditable = 'false';
      const v = txt.textContent.trim();
      if (v && v !== t.text) { t.text = v; save(all); }
      else if (!v) txt.textContent = t.text;
    });
    txt.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); txt.blur(); }
      if (e.key === 'Escape') { txt.textContent = t.text; txt.blur(); }
    });

    const del = document.createElement('button');
    del.className = 'task__del';
    del.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    del.onclick = () => { all.splice(all.indexOf(t), 1); save(all); renderTasks(defs, weekOf); };

    li.append(ck, txt, del);
    list.appendChild(li);
  });
}

function drawDone(done) {
  const sec = document.getElementById('completed-section');
  const list = document.getElementById('completed-list');
  const cnt = document.getElementById('completed-count');
  if (!done.length) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  cnt.textContent = done.length;
  list.innerHTML = '';
  done.forEach(t => {
    const sc = STATUS_OPTIONS.find(s => s.value === t.status);
    const item = document.createElement('div');
    item.className = 'done-item';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;cursor:pointer;';
    head.innerHTML = `
      <span class="done-item__check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>
      <span class="done-item__text">${esc(t.text)}</span>
      <span class="done-item__status done-item__status--${sc?.color || 'green'}">${esc(t.status || '全部完成')}</span>
      <span class="done-item__date">${t.completedAt || ''}</span>
      <span class="done-item__chevron">▸</span>`;

    const detail = document.createElement('div');
    detail.className = 'done-item__detail hidden';
    detail.innerHTML = t.notes
      ? `<div class="done-item__notes">${esc(t.notes)}</div>`
      : '<div class="done-item__notes done-item__notes--empty">无备注</div>';

    head.onclick = () => {
      detail.classList.toggle('hidden');
      head.querySelector('.done-item__chevron').textContent = detail.classList.contains('hidden') ? '▸' : '▾';
    };

    item.append(head, detail);
    list.appendChild(item);
  });
}

function openCompleteModal(t, all, defs, weekOf) {
  let html = `<div class="modal__field"><label class="modal__label">完成情况</label><select class="modal__select" id="mc-status">${STATUS_OPTIONS.map(s => `<option value="${s.value}">${s.value}</option>`).join('')}</select></div>`;
  html += `<div class="modal__field"><label class="modal__label">备注（支持粘贴链接）</label><textarea class="modal__textarea" id="mc-notes" rows="3" placeholder="完成心得、关键发现..."></textarea></div>`;
  openModal('标记完成', html, '确认完成', () => {
    t.done = true;
    t.status = document.getElementById('mc-status').value;
    t.notes = document.getElementById('mc-notes').value.trim();
    t.completedAt = nowStr();
    save(all);
    renderTasks(defs, weekOf);
    closeModal();
  });
}

function drawAdd(tasks, defs, weekOf) {
  const area = document.getElementById('task-add-area');
  area.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'task-add__btn';
  btn.textContent = '+ 添加任务';
  btn.onclick = () => {
    area.innerHTML = '';
    const inp = document.createElement('input');
    inp.className = 'task-add__input';
    inp.placeholder = '输入任务，回车确认';
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && inp.value.trim()) {
        tasks.push({ id: Date.now(), text: inp.value.trim(), done: false, status: null, completedAt: null, notes: '' });
        save(tasks); renderTasks(defs, weekOf);
      }
      if (e.key === 'Escape') drawAdd(tasks, defs, weekOf);
    });
    inp.addEventListener('blur', () => setTimeout(() => drawAdd(tasks, defs, weekOf), 100));
    area.appendChild(inp); inp.focus();
  };
  area.appendChild(btn);
}

/* ── Frontier ── */
function renderFrontier(frontier) {
  const ago = daysAgo(frontier.lastFrontierUpdate);
  const badge = document.getElementById('frontier-badge');
  if (ago <= 0) { badge.textContent = '今日'; badge.className = 'panel__badge panel__badge--green'; }
  else if (ago === 1) { badge.textContent = '昨天'; badge.className = 'panel__badge'; }
  else { badge.textContent = `${ago}天前`; badge.className = 'panel__badge panel__badge--stale'; }

  const el = document.getElementById('frontier-list');
  el.innerHTML = '';
  frontier.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'frontier-item';
    div.innerHTML = `
      <div class="frontier-item__row">
        <span class="frontier-item__title">${esc(item.title)}</span>
        <span class="frontier-item__arrow">→</span>
      </div>
      <div class="frontier-item__meta">
        <span class="frontier-item__tag">${esc(item.source)}</span>
        <span>${item.date}</span>
      </div>
      <div class="frontier-item__rel">${esc(item.relevance)}</div>`;
    div.onclick = () => openFrontierModal(item);
    el.appendChild(div);
  });

  const bar = document.getElementById('frontier-action');
  if (ago >= 1) {
    bar.innerHTML = `<span>${ago} 天没更新</span><button class="btn-sm" id="btn-copy-prompt">复制更新提示词</button>`;
    document.getElementById('btn-copy-prompt').onclick = () => {
      navigator.clipboard?.writeText('请用 WebSearch 获取今日 AI 行业前沿动态（10 条，聚焦消金/金融/PM 视角），每条包含 title/source/date/relevance/url/content（content 是文章核心摘要 200-300字）。写入 D:\\AI-PM\\data.json 的 frontier.items，更新 lastFrontierUpdate，然后 git commit + push。')
        .then(() => toast('已复制'), () => toast('复制失败'));
    };
  } else {
    bar.innerHTML = '<span class="frontier-ok">今日已更新 ✓</span>';
  }
}

function openFrontierModal(item) {
  const content = item.content
    ? `<div class="fm-content">${esc(item.content)}</div>`
    : '<div class="fm-content fm-content--empty">暂无详情内容。点击「复制更新提示词」让 Claude 爬取。</div>';
  const link = item.url ? `<a class="fm-link" href="${esc(item.url)}" target="_blank" rel="noopener">查看原文 →</a>` : '';
  const html = `<div class="fm-meta"><span class="frontier-item__tag">${esc(item.source)}</span><span>${item.date}</span></div><div class="fm-relevance">${esc(item.relevance)}</div>${content}${link}`;
  openModal(esc(item.title), html, '关闭', closeModal);
}

/* ── Eval ── */
function initEval() {
  document.getElementById('btn-eval')?.onclick = () => {
    const arch = JSON.parse(localStorage.getItem('ai-pm-archive') || '[]');
    const cur = _parse().filter(t => t.done);
    const all = [...arch, ...cur];
    const month = all.filter(t => t.completedAt?.startsWith(nowStr().slice(0,7)));
    const summary = month.map(t => `- [${t.status||'完成'}] ${t.text}${t.notes ? ' | ' + t.notes : ''}`).join('\n');
    const prompt = `请根据以下本月完成的任务进行客观评价：\n\n${summary || '（本月暂无已完成任务）'}\n\n从以下维度评价：\n1. 完成率\n2. 任务质量\n3. 节奏把控\n4. 改进建议\n\n评价要客观直接。`;
    navigator.clipboard?.writeText(prompt).then(() => toast('已复制评价提示词'), () => toast('复制失败'));
  };
}

/* ── Fetch ── */
function initFetch(data) {
  const q = data.progress.currentQuarter;
  const theme = data.progress.currentTheme;
  const pct = data.progress.phases.find(p => p.quarter === q)?.progress || 0;

  document.getElementById('btn-fetch-tasks')?.onclick = () => {
    const today = new Date().toISOString().split('T')[0];
    navigator.clipboard?.writeText(`我是AI-PM转型中的产品经理，当前处于 ${q} ${theme}（${pct}%）。\n\n请布置本周（${today} 起）4-5个具体可执行任务，围绕当前阶段目标。\n\n写入 D:\\AI-PM\\data.json 的 thisWeek.tasks（{id, task, done}）和 thisWeek.weekOf（${today}），然后 git commit + push。`)
      .then(() => toast('已复制'), () => toast('复制失败'));
  };

  document.getElementById('btn-fetch-frontier')?.onclick = () => {
    navigator.clipboard?.writeText('请用 WebSearch 获取今日 AI 行业前沿动态（10 条，聚焦消金/金融/PM 视角），每条含 title/source/date/relevance/url/content（摘要200-300字）。写入 D:\\AI-PM\\data.json 的 frontier.items，更新 lastFrontierUpdate，然后 git commit + push。')
      .then(() => toast('已复制'), () => toast('复制失败'));
  };
}

/* ── Reflections ── */
function renderReflections(refs) {
  const el = document.getElementById('reflections-list');
  el.innerHTML = '';
  if (!refs?.length) { el.innerHTML = '<div class="reflection-empty">还没有反思</div>'; return; }
  refs.slice(0, 5).forEach(r => {
    const d = document.createElement('div');
    d.className = 'reflection';
    d.innerHTML = `<div class="reflection__head"><span class="reflection__date">${r.date}</span><span class="reflection__tag">${esc(r.tag)}</span></div><div class="reflection__content">${esc(r.content)}</div>`;
    el.appendChild(d);
  });
}

function renderFooter(d) {
  document.getElementById('last-update').textContent = d.meta.lastUpdate;
  document.getElementById('repo-link').href = REPO_URL;
  document.getElementById('issues-link').href = ISSUES_URL;
}

/* ── Utils ── */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
}
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Main ── */
(async () => {
  const data = await loadData();
  if (!data) return;
  try {
    renderHero(data);
    renderTimeline(data.progress);
    initModal();
    initFetch(data);
    initEval();
    renderTasks(data.thisWeek.tasks, data.thisWeek.weekOf);
    renderFrontier(data.frontier);
    renderReflections(data.reflections);
    renderFooter(data);
  } catch (e) {
    document.getElementById('error-banner').classList.remove('hidden');
    document.getElementById('error-message').textContent = '渲染失败: ' + e.message;
    console.error(e);
  }
})();
