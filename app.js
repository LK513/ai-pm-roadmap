const REPO = 'LK513/ai-pm-roadmap';
const REPO_URL = `https://github.com/${REPO}`;
const ISSUES_URL = `${REPO_URL}/issues`;
const NEW_ISSUE_URL = `${REPO_URL}/issues/new`;
const TASKS_KEY = 'ai-pm-tasks';
const WEEK_KEY = 'ai-pm-tasks-week';

/* ── Modal Config ── */
const MODAL_TYPES = {
  reflection: {
    title: '💭 记录反思',
    label: 'reflection',
    fields: [
      { key: 'think', label: '今天/这周想清楚了什么', placeholder: '一两句话说清楚', type: 'input' },
      { key: 'diff', label: '和之前认知有什么不同', placeholder: '对比', type: 'textarea' },
      { key: 'impact', label: '对 AI PM 转型的影响', placeholder: '可留空', type: 'input' }
    ]
  },
  idea: {
    title: '💡 记录灵感',
    label: 'idea',
    fields: [
      { key: 'scene', label: '场景', placeholder: '催收/风控/客服/营销/后台?', type: 'input' },
      { key: 'idea', label: 'Idea', placeholder: '一句话说清楚要做什么', type: 'input' },
      { key: 'why', label: '关联消金业务', placeholder: '为什么值得用AI?', type: 'textarea' },
      { key: 'risk', label: '风险/疑问', placeholder: '可留空', type: 'input' }
    ]
  },
  resource: {
    title: '📚 收藏资源',
    label: 'resource',
    fields: [
      { key: 'url', label: '资源链接', placeholder: 'https://...', type: 'input' },
      { key: 'type', label: '类型', placeholder: '文章/课程/工具/竞品/论文', type: 'input' },
      { key: 'why', label: '为什么值得看', placeholder: '一句话理由', type: 'input' },
      { key: 'when', label: '计划什么时候看', placeholder: '本周/本月/备查', type: 'input' }
    ]
  },
  blocker: {
    title: '🚧 记录卡壳',
    label: 'blocker',
    fields: [
      { key: 'where', label: '卡在哪了', placeholder: '具体到不能再具体', type: 'textarea' },
      { key: 'tried', label: '已经尝试了什么', placeholder: '列2-3个方法', type: 'textarea' },
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

/* ── Modal ── */
function initModal() {
  const overlay = document.getElementById('modal-overlay');
  const close = document.getElementById('modal-close');
  const cancel = document.getElementById('modal-cancel');
  const submit = document.getElementById('modal-submit');

  const closeModal = () => overlay.classList.remove('open');
  close.addEventListener('click', closeModal);
  cancel.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Action buttons
  document.querySelectorAll('.action[data-type]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.type));
  });

  submit.addEventListener('click', () => {
    const type = submit.dataset.type;
    const cfg = MODAL_TYPES[type];
    if (!cfg) return;

    // Collect values
    const values = {};
    cfg.fields.forEach(f => {
      const el = document.getElementById(`modal-field-${f.key}`);
      values[f.key] = el ? el.value.trim() : '';
    });

    // Build issue body
    let body = '';
    cfg.fields.forEach(f => {
      body += `**${f.label}:**\n\n${values[f.key] || '(未填)'}\n\n`;
    });

    // Copy to clipboard
    const issueTitle = `[${cfg.title.replace(/[^一-龥a-zA-Z]/g, '')}] `;
    const fullText = `标题: ${issueTitle}\n\n${body}`;
    navigator.clipboard?.writeText(fullText).then(
      () => {
        toast('已复制到剪贴板');
        // Also open GitHub issue page in background
        const issueUrl = `${NEW_ISSUE_URL}?template=${cfg.label}.md&title=${encodeURIComponent(issueTitle)}`;
        window.open(issueUrl, '_blank');
      },
      () => toast('复制失败，请手动填写')
    );
    closeModal();
  });
}

function openModal(type) {
  const cfg = MODAL_TYPES[type];
  if (!cfg) return;

  document.getElementById('modal-title').textContent = cfg.title;
  document.getElementById('modal-submit').dataset.type = type;

  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  cfg.fields.forEach(f => {
    const field = document.createElement('div');
    field.className = 'modal__field';

    const label = document.createElement('label');
    label.className = 'modal__label';
    label.textContent = f.label;
    label.htmlFor = `modal-field-${f.key}`;

    let input;
    if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'modal__textarea';
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.className = 'modal__input';
      input.type = 'text';
    }
    input.id = `modal-field-${f.key}`;
    input.placeholder = f.placeholder;

    field.append(label, input);
    body.appendChild(field);
  });

  document.getElementById('modal-overlay').classList.add('open');
  // Focus first input
  const first = body.querySelector('input, textarea');
  if (first) setTimeout(() => first.focus(), 200);
}

/* ── Tasks ── */
function loadTasks(defaults, weekOf) {
  if (localStorage.getItem(WEEK_KEY) !== weekOf) {
    localStorage.setItem(WEEK_KEY, weekOf);
    localStorage.removeItem(TASKS_KEY);
  }
  try { const s = JSON.parse(localStorage.getItem(TASKS_KEY)); if (Array.isArray(s) && s.length > 0) return s; } catch {}
  return defaults.map(t => ({ id: t.id, text: t.task, done: t.done }));
}

function saveTasks(tasks) { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }

function renderTasks(defaults, weekOf) {
  document.getElementById('week-of').textContent = weekOf;
  const tasks = loadTasks(defaults, weekOf);
  drawTasks(tasks, defaults, weekOf);
  drawAddBtn(tasks, defaults, weekOf);
}

function drawTasks(tasks, defaults, weekOf) {
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task ${task.done ? 'task--done' : ''}`;

    const check = document.createElement('span');
    check.className = 'task__check';
    check.textContent = task.done ? '✓' : '';
    check.addEventListener('click', () => { task.done = !task.done; saveTasks(tasks); drawTasks(tasks, defaults, weekOf); });

    const text = document.createElement('span');
    text.className = 'task__text';
    text.textContent = task.text;
    text.addEventListener('dblclick', () => {
      if (task.done) return;
      text.contentEditable = 'true'; text.focus();
      const r = document.createRange(); r.selectNodeContents(text);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
    });
    text.addEventListener('blur', () => {
      text.contentEditable = 'false';
      const v = text.textContent.trim();
      if (v && v !== task.text) { task.text = v; saveTasks(tasks); }
      else if (!v) text.textContent = task.text;
    });
    text.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); text.blur(); }
      if (e.key === 'Escape') { text.textContent = task.text; text.blur(); }
    });

    const del = document.createElement('button');
    del.className = 'task__delete'; del.textContent = '×'; del.title = '删除';
    del.addEventListener('click', () => { tasks.splice(tasks.indexOf(task), 1); saveTasks(tasks); drawTasks(tasks, defaults, weekOf); });

    li.append(check, text, del);
    list.appendChild(li);
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
        tasks.push({ id: Date.now(), text: input.value.trim(), done: false });
        saveTasks(tasks); drawTasks(tasks, defaults, weekOf); drawAddBtn(tasks, defaults, weekOf);
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
    const a = document.createElement('a');
    a.className = 'frontier-item'; a.href = item.url || '#'; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `
      <div class="frontier-item__head"><span class="frontier-item__title">${esc(item.title)}</span><span class="frontier-item__arrow">→</span></div>
      <div class="frontier-item__meta"><span class="frontier-item__tag">${esc(item.source)}</span><span>${item.date}</span></div>
      <div class="frontier-item__relevance">${esc(item.relevance)}</div>`;
    el.appendChild(a);
  });

  const bar = document.getElementById('frontier-action');
  if (ago >= 1) {
    bar.innerHTML = `<span>${ago} 天没更新</span><button class="btn-copy" id="btn-copy-prompt">复制更新提示词</button>`;
    document.getElementById('btn-copy-prompt').addEventListener('click', () => {
      navigator.clipboard?.writeText('请用 WebSearch 获取今日 AI 行业前沿动态(10 条,聚焦消金/金融/PM 视角,每条附原文链接),写入 D:\\AI-PM\\data.json 的 frontier.items,更新 lastFrontierUpdate,然后 git commit + push。')
        .then(() => toast('已复制'), () => toast('复制失败'));
    });
  } else {
    bar.innerHTML = '<span class="frontier-ok">今日已更新 ✓</span>';
  }
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
    renderTasks(data.thisWeek.tasks, data.thisWeek.weekOf);
    renderFrontier(data.frontier);
    renderReflections(data.reflections);
    renderFooter(data);
  } catch (e) {
    document.getElementById('error-banner').classList.remove('hidden');
    document.getElementById('error-message').textContent = '渲染失败: ' + e.message;
  }
})();
