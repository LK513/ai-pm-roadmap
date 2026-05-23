const REPO = 'LK513/ai-pm-roadmap';
const REPO_URL = `https://github.com/${REPO}`;
const ISSUES_URL = `${REPO_URL}/issues`;
const NEW_ISSUE_URL = `${REPO_URL}/issues/new`;
const TASKS_KEY = 'ai-pm-tasks';
const WEEK_KEY = 'ai-pm-tasks-week';
const FRONTIER_CACHE_KEY = 'ai-pm-frontier-cache';

// Clear frontier content cache on refresh
localStorage.removeItem(FRONTIER_CACHE_KEY);

const STATUS_OPTIONS = [
  { value: '全部完成', color: 'green' },
  { value: '部分完成', color: 'amber' },
  { value: '放弃', color: 'red' },
  { value: '延期', color: 'purple' }
];

const MODAL_TYPES = {
  reflection: {
    title: '记录反思', icon: '💭', label: 'reflection',
    fields: [
      { key: 'think', label: '想清楚了什么', placeholder: '一两句话', type: 'input' },
      { key: 'diff', label: '和之前认知有什么不同', placeholder: '对比', type: 'textarea' },
      { key: 'impact', label: '对 AI PM 转型的影响', placeholder: '可留空', type: 'input' }
    ]
  },
  idea: {
    title: '记录灵感', icon: '💡', label: 'idea',
    fields: [
      { key: 'scene', label: '场景', placeholder: '催收/风控/客服/营销/后台?', type: 'input' },
      { key: 'idea', label: 'Idea', placeholder: '一句话说清楚', type: 'input' },
      { key: 'why', label: '关联消金业务', placeholder: '为什么值得用AI?', type: 'textarea' },
      { key: 'risk', label: '风险/疑问', placeholder: '可留空', type: 'input' }
    ]
  },
  resource: {
    title: '收藏资源', icon: '📚', label: 'resource',
    fields: [
      { key: 'url', label: '资源链接', placeholder: 'https://...', type: 'input' },
      { key: 'type', label: '类型', placeholder: '文章/课程/工具/竞品/论文', type: 'input' },
      { key: 'why', label: '为什么值得看', placeholder: '一句话理由', type: 'input' },
      { key: 'when', label: '计划什么时候看', placeholder: '本周/本月/备查', type: 'input' }
    ]
  },
  blocker: {
    title: '记录卡壳', icon: '🚧', label: 'blocker',
    fields: [
      { key: 'where', label: '卡在哪了', placeholder: '具体到不能再具体', type: 'textarea' },
      { key: 'tried', label: '已尝试了什么', placeholder: '列2-3个方法', type: 'textarea' },
      { key: 'need', label: '需要什么帮助', placeholder: '找资料/找人聊/Claude帮想', type: 'input' },
      { key: 'urgency', label: '紧急程度', placeholder: '低/中/高', type: 'input' }
    ]
  }
};

/* ── Data ── */
async function loadData() {
  try {
    const res = await fetch('data.json?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
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
function nowStr() { return new Date().toISOString().slice(0, 16).replace('T', ' '); }

/* ── Hero ── */
function renderHero(data) {
  document.getElementById('north-star-quote').textContent = data.northStar.title;
  document.getElementById('north-star-milestone').textContent = data.northStar.milestone;
}

/* ── Timeline ── */
function renderTimeline(progress) {
  const el = document.getElementById('timeline');
  el.innerHTML = '';
  progress.phases.forEach((p, i) => {
    const cls = p.status === '完成' ? 'tl-node--done' : p.status === '进行中' ? 'tl-node--active' : '';
    const node = document.createElement('div');
    node.className = `tl-node ${cls}`;
    node.innerHTML = `<div class="tl-dot"></div><span class="tl-quarter">${p.quarter}</span><span class="tl-theme">${p.theme}</span>`;
    el.appendChild(node);
    if (i < progress.phases.length - 1) {
      const next = progress.phases[i + 1];
      const bar = document.createElement('div');
      bar.className = `tl-bar ${p.status === '完成' && next.status === '完成' ? 'tl-bar--done' : p.status === '完成' && next.status === '进行中' ? 'tl-bar--active' : ''}`;
      el.appendChild(bar);
    }
  });
  const active = progress.phases.find(p => p.status === '进行中');
  const cd = document.getElementById('countdown-area');
  if (active) {
    cd.innerHTML = `距 <strong>${active.quarter} ${active.theme}</strong> 结束还剩 <span class="countdown__days">${daysLeft(active.endDate)}</span> 天`;
  }
}

/* ── Generic Modal ── */
let _modalSubmitHandler = null;

function openModal(title, fieldsHTML, submitLabel, onSubmit) {
  document.getElementById('modal-title').textContent = title;
  const body = document.getElementById('modal-body');
  body.innerHTML = fieldsHTML;
  const submitBtn = document.getElementById('modal-submit');
  submitBtn.textContent = submitLabel;
  // Remove old handler
  if (_modalSubmitHandler) submitBtn.removeEventListener('click', _modalSubmitHandler);
  _modalSubmitHandler = onSubmit;
  submitBtn.addEventListener('click', _modalSubmitHandler);
  document.getElementById('modal-overlay').classList.add('open');
  const first = body.querySelector('input, textarea, select');
  if (first) setTimeout(() => first.focus(), 200);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target.id === 'modal-overlay') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Feedback action buttons
  document.querySelectorAll('.action[data-type]').forEach(btn => {
    btn.addEventListener('click', () => openFeedbackModal(btn.dataset.type));
  });
}

function openFeedbackModal(type) {
  const cfg = MODAL_TYPES[type];
  if (!cfg) return;

  let html = '';
  cfg.fields.forEach(f => {
    html += `<div class="modal__field"><label class="modal__label" for="mf-${f.key}">${f.label}</label>`;
    if (f.type === 'textarea') {
      html += `<textarea class="modal__textarea" id="mf-${f.key}" rows="3" placeholder="${f.placeholder}"></textarea>`;
    } else {
      html += `<input class="modal__input" id="mf-${f.key}" type="text" placeholder="${f.placeholder}">`;
    }
    html += '</div>';
  });

  openModal(`${cfg.icon} ${cfg.title}`, html, '复制到剪贴板', () => {
    let body = '';
    cfg.fields.forEach(f => {
      const el = document.getElementById(`mf-${f.key}`);
      body += `**${f.label}:**\n${el ? el.value.trim() || '(未填)' : '(未填)'}\n\n`;
    });
    const title = `[${cfg.icon}${cfg.title}] `;
    navigator.clipboard?.writeText(`标题: ${title}\n\n${body}`).then(
      () => { toast('已复制'); window.open(`${NEW_ISSUE_URL}?template=${cfg.label}.md&title=${encodeURIComponent(title)}`, '_blank'); },
      () => toast('复制失败')
    );
    closeModal();
  });
}

/* ── Task Storage ── */
function loadTasks(defaults, weekOf) {
  if (localStorage.getItem(WEEK_KEY) !== weekOf) {
    localStorage.setItem(WEEK_KEY, weekOf);
    // Archive completed tasks before clearing
    const old = _parseTasks();
    const done = old.filter(t => t.completedAt);
    if (done.length) {
      const archive = JSON.parse(localStorage.getItem('ai-pm-task-archive') || '[]');
      archive.push(...done);
      localStorage.setItem('ai-pm-task-archive', JSON.stringify(archive));
    }
    localStorage.removeItem(TASKS_KEY);
  }
  const saved = _parseTasks();
  if (saved.length) return saved;
  return defaults.map(t => ({ id: t.id, text: t.task, done: t.done, status: null, completedAt: null, notes: '' }));
}

function _parseTasks() {
  try { const s = JSON.parse(localStorage.getItem(TASKS_KEY)); return Array.isArray(s) ? s : []; } catch { return []; }
}

function saveTasks(tasks) { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }

/* ── Render Tasks ── */
function renderTasks(defaults, weekOf) {
  document.getElementById('week-of').textContent = weekOf;
  const tasks = loadTasks(defaults, weekOf);
  const active = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

  drawActiveTasks(active, tasks, defaults, weekOf);
  drawCompletedTasks(done);
  drawAddBtn(tasks, defaults, weekOf);
}

function drawActiveTasks(active, allTasks, defaults, weekOf) {
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';
  if (!active.length) {
    list.innerHTML = '<li class="task-empty">本周任务全部完成！</li>';
    return;
  }
  active.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task';

    const check = document.createElement('span');
    check.className = 'task__check';
    check.addEventListener('click', () => openCompleteModal(task, allTasks, defaults, weekOf));

    const text = document.createElement('span');
    text.className = 'task__text';
    text.textContent = task.text;
    text.addEventListener('dblclick', () => {
      text.contentEditable = 'true'; text.focus();
      const r = document.createRange(); r.selectNodeContents(text);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
    });
    text.addEventListener('blur', () => {
      text.contentEditable = 'false';
      const v = text.textContent.trim();
      if (v && v !== task.text) { task.text = v; saveTasks(allTasks); }
      else if (!v) text.textContent = task.text;
    });
    text.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); text.blur(); }
      if (e.key === 'Escape') { text.textContent = task.text; text.blur(); }
    });

    const del = document.createElement('button');
    del.className = 'task__delete'; del.textContent = '×'; del.title = '删除';
    del.addEventListener('click', () => {
      allTasks.splice(allTasks.indexOf(task), 1);
      saveTasks(allTasks); renderTasks(defaults, weekOf);
    });

    li.append(check, text, del);
    list.appendChild(li);
  });
}

function drawCompletedTasks(done) {
  const section = document.getElementById('completed-section');
  const list = document.getElementById('completed-list');
  const count = document.getElementById('completed-count');

  if (!done.length) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  count.textContent = `${done.length} 项`;
  list.innerHTML = '';

  done.forEach(task => {
    const item = document.createElement('div');
    item.className = 'completed-item';

    const statusOpt = STATUS_OPTIONS.find(s => s.value === task.status);
    const statusClass = statusOpt ? statusOpt.color : 'green';

    const header = document.createElement('div');
    header.className = 'completed-item__header';
    header.innerHTML = `
      <span class="completed-item__check">✓</span>
      <span class="completed-item__text">${esc(task.text)}</span>
      <span class="completed-item__status completed-item__status--${statusClass}">${esc(task.status || '全部完成')}</span>
      <span class="completed-item__date">${task.completedAt || ''}</span>
      <span class="completed-item__toggle">▸</span>
    `;

    const detail = document.createElement('div');
    detail.className = 'completed-item__detail hidden';
    detail.innerHTML = task.notes
      ? `<div class="completed-item__notes">${esc(task.notes)}</div>`
      : '<div class="completed-item__notes completed-item__notes--empty">无备注</div>';

    header.addEventListener('click', () => {
      detail.classList.toggle('hidden');
      header.querySelector('.completed-item__toggle').textContent = detail.classList.contains('hidden') ? '▸' : '▾';
    });

    item.append(header, detail);
    list.appendChild(item);
  });
}

function openCompleteModal(task, allTasks, defaults, weekOf) {
  let html = `
    <div class="modal__field">
      <label class="modal__label">完成情况</label>
      <select class="modal__select" id="mc-status">
        ${STATUS_OPTIONS.map(s => `<option value="${s.value}">${s.value}</option>`).join('')}
      </select>
    </div>
    <div class="modal__field">
      <label class="modal__label">备注（支持粘贴链接）</label>
      <textarea class="modal__textarea" id="mc-notes" rows="4" placeholder="完成心得、关键发现、参考链接..."></textarea>
    </div>`;

  openModal('标记完成', html, '确认完成', () => {
    task.done = true;
    task.status = document.getElementById('mc-status').value;
    task.notes = document.getElementById('mc-notes').value.trim();
    task.completedAt = nowStr();
    saveTasks(allTasks);
    renderTasks(defaults, weekOf);
    closeModal();
  });
}

function drawAddBtn(tasks, defaults, weekOf) {
  const area = document.getElementById('task-add-area');
  area.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'task-add__btn'; btn.innerHTML = '+ 添加任务';
  btn.addEventListener('click', () => {
    area.innerHTML = '';
    const input = document.createElement('input');
    input.className = 'task-add__input'; input.placeholder = '输入任务，回车确认';
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) {
        tasks.push({ id: Date.now(), text: input.value.trim(), done: false, status: null, completedAt: null, notes: '' });
        saveTasks(tasks); renderTasks(defaults, weekOf);
      }
      if (e.key === 'Escape') drawAddBtn(tasks, defaults, weekOf);
    });
    input.addEventListener('blur', () => setTimeout(() => drawAddBtn(tasks, defaults, weekOf), 100));
    area.appendChild(input); input.focus();
  });
  area.appendChild(btn);
}

/* ── Frontier ── */
function renderFrontier(frontier) {
  const ago = daysAgo(frontier.lastFrontierUpdate);
  const badge = document.getElementById('frontier-badge');
  if (ago <= 0) { badge.textContent = '今日更新'; badge.className = 'card__tag card__tag--green'; }
  else if (ago === 1) { badge.textContent = '昨天'; badge.className = 'card__tag'; }
  else { badge.textContent = `${ago}天前`; badge.className = 'card__tag card__tag--stale'; }

  const el = document.getElementById('frontier-list');
  el.innerHTML = '';
  frontier.items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'frontier-item';
    card.innerHTML = `
      <div class="frontier-item__head">
        <span class="frontier-item__title">${esc(item.title)}</span>
        <span class="frontier-item__arrow">→</span>
      </div>
      <div class="frontier-item__meta">
        <span class="frontier-item__tag">${esc(item.source)}</span>
        <span>${item.date}</span>
      </div>
      <div class="frontier-item__relevance">${esc(item.relevance)}</div>`;

    card.addEventListener('click', () => openFrontierModal(item));
    el.appendChild(card);
  });

  const bar = document.getElementById('frontier-action');
  if (ago >= 1) {
    bar.innerHTML = `<span>${ago} 天没更新</span><button class="btn-copy" id="btn-copy-prompt">复制更新提示词</button>`;
    document.getElementById('btn-copy-prompt').addEventListener('click', () => {
      navigator.clipboard?.writeText(
        '请用 WebSearch 获取今日 AI 行业前沿动态（10 条，聚焦消金/金融/PM 视角），每条包含 title/source/date/relevance/url/content（content 字段是文章核心内容摘要，200-300字）。写入 D:\\AI-PM\\data.json 的 frontier.items，更新 lastFrontierUpdate，然后 git commit + push。'
      ).then(() => toast('已复制'), () => toast('复制失败'));
    });
  } else {
    bar.innerHTML = '<span class="frontier-ok">今日已更新 ✓</span>';
  }
}

function openFrontierModal(item) {
  const content = item.content
    ? `<div class="frontier-modal__content">${esc(item.content)}</div>`
    : '<div class="frontier-modal__content frontier-modal__content--empty">暂无详情。点击「复制更新提示词」让 Claude 爬取内容。</div>';

  const link = item.url
    ? `<a class="frontier-modal__link" href="${esc(item.url)}" target="_blank" rel="noopener">查看原文 →</a>`
    : '';

  const html = `
    <div class="frontier-modal__meta">
      <span class="frontier-item__tag">${esc(item.source)}</span>
      <span>${item.date}</span>
    </div>
    <div class="frontier-modal__relevance">${esc(item.relevance)}</div>
    ${content}
    ${link}`;

  openModal(esc(item.title), html, '关闭', closeModal);
}

/* ── Monthly Evaluation ── */
function initEvalButton() {
  document.getElementById('btn-eval')?.addEventListener('click', () => {
    const archive = JSON.parse(localStorage.getItem('ai-pm-task-archive') || '[]');
    const current = _parseTasks().filter(t => t.done);
    const allDone = [...archive, ...current];

    const now = new Date();
    const thisMonth = allDone.filter(t => t.completedAt && t.completedAt.startsWith(nowStr().slice(0, 7)));

    const summary = thisMonth.map(t => `- [${t.status || '完成'}] ${t.text}${t.notes ? ' | 备注: ' + t.notes : ''}`).join('\n');
    const prompt = `我是AI-PM转型中的产品经理，请根据以下本月完成的任务进行客观评价：\n\n${summary || '（本月暂无已完成任务）'}\n\n请从以下维度评价：\n1. 完成率（完成/放弃/延期的比例）\n2. 任务质量（任务是否具体、有产出物）\n3. 节奏把控（是否符合Q2场景识别阶段目标）\n4. 改进建议（下个月应该注意什么）\n\n评价要客观、直接，不要客气。`;

    navigator.clipboard?.writeText(prompt).then(
      () => toast('已复制评价提示词，粘贴给 Claude'),
      () => toast('复制失败')
    );
  });
}

/* ── Fetch Buttons ── */
function initFetchButtons(data) {
  const q = data.progress.currentQuarter;
  const theme = data.progress.currentTheme;
  const pct = data.progress.phases.find(p => p.quarter === q)?.progress || 0;

  document.getElementById('btn-fetch-tasks')?.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `我是AI-PM转型中的产品经理，当前处于 ${q} ${theme} 阶段（完成${pct}%）。\n\n请帮我布置本周（${today} 起）的 4-5 个具体可执行任务。\n要求：\n1. 任务要具体到可以直接打钩\n2. 围绕当前阶段目标\n3. 难度适中，一周能完成\n\n写入 D:\\AI-PM\\data.json 的 thisWeek.tasks（格式：{id, task, done}）和 thisWeek.weekOf（设为 ${today}），然后 git commit + push。`;
    navigator.clipboard?.writeText(prompt).then(() => toast('已复制，粘贴给 Claude'), () => toast('复制失败'));
  });

  document.getElementById('btn-fetch-frontier')?.addEventListener('click', () => {
    const prompt = `请用 WebSearch 获取今日 AI 行业前沿动态（10 条，聚焦消金/金融/PM 视角），每条包含：\n- title: 标题\n- source: 来源\n- date: 日期（YYYY-MM-DD）\n- relevance: 对消金PM的一句话价值\n- url: 原文链接\n- content: 文章核心内容摘要（200-300字，提取关键信息，不要废话）\n\n写入 D:\\AI-PM\\data.json 的 frontier.items，更新 lastFrontierUpdate 为今日，然后 git commit + push。`;
    navigator.clipboard?.writeText(prompt).then(() => toast('已复制，粘贴给 Claude'), () => toast('复制失败'));
  });
}

/* ── Reflections ── */
function renderReflections(refs) {
  const el = document.getElementById('reflections-list');
  el.innerHTML = '';
  if (!refs?.length) { el.innerHTML = '<div class="reflection-empty">还没有反思，点上面「💭 反思」开始</div>'; return; }
  refs.slice(0, 5).forEach(r => {
    const div = document.createElement('div');
    div.className = 'reflection';
    div.innerHTML = `<div class="reflection__head"><span class="reflection__date">${r.date}</span><span class="reflection__tag">${esc(r.tag)}</span></div><div class="reflection__content">${esc(r.content)}</div>`;
    el.appendChild(div);
  });
}

function renderFooter(data) {
  document.getElementById('last-update').textContent = data.meta.lastUpdate;
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
(async function main() {
  const data = await loadData();
  if (!data) return;
  try {
    renderHero(data);
    renderTimeline(data.progress);
    initModal();
    initFetchButtons(data);
    initEvalButton();
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
