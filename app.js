const REPO = 'LK513/ai-pm-roadmap';
const REPO_URL = `https://github.com/${REPO}`;
const ISSUES_URL = `${REPO_URL}/issues`;
const NEW_ISSUE_URL = `${REPO_URL}/issues/new`;
const TASKS_KEY = 'ai-pm-tasks';
const WEEK_KEY = 'ai-pm-tasks-week';

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

/* ── Date Utils ── */
function daysLeft(dateStr) {
  return Math.max(0, Math.round((new Date(dateStr) - new Date()) / 86400000));
}

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
    // Node
    const cls = p.status === '完成' ? 'tl-node--done'
              : p.status === '进行中' ? 'tl-node--active' : '';
    const node = document.createElement('div');
    node.className = `tl-node ${cls}`;
    node.innerHTML = `
      <div class="tl-dot"></div>
      <span class="tl-quarter">${p.quarter}</span>
      <span class="tl-theme">${p.theme}</span>
    `;
    el.appendChild(node);

    // Bar between nodes (not after last)
    if (i < progress.phases.length - 1) {
      const bar = document.createElement('div');
      const next = progress.phases[i + 1];
      const barCls = p.status === '完成' && next.status === '完成' ? 'tl-bar--done'
                   : p.status === '完成' && next.status === '进行中' ? 'tl-bar--active'
                   : '';
      bar.className = `tl-bar ${barCls}`;
      el.appendChild(bar);
    }
  });

  // Countdown
  const active = progress.phases.find(p => p.status === '进行中');
  const cd = document.getElementById('countdown-area');
  if (active) {
    const left = daysLeft(active.endDate);
    cd.innerHTML = `距 <strong>${active.quarter} ${active.theme}</strong> 结束还剩 <span class="countdown__days">${left}</span> 天`;
  }
}

/* ── Quick Actions ── */
function renderActions() {
  [
    { id: 'btn-reflect', tpl: 'reflection.md' },
    { id: 'btn-idea', tpl: 'idea.md' },
    { id: 'btn-resource', tpl: 'resource.md' },
    { id: 'btn-blocker', tpl: 'blocker.md' }
  ].forEach(t => {
    const el = document.getElementById(t.id);
    if (el) el.href = `${NEW_ISSUE_URL}?template=${t.tpl}`;
  });
}

/* ── Tasks CRUD ── */
function loadTasks(defaults, weekOf) {
  if (localStorage.getItem(WEEK_KEY) !== weekOf) {
    localStorage.setItem(WEEK_KEY, weekOf);
    localStorage.removeItem(TASKS_KEY);
  }
  try {
    const s = JSON.parse(localStorage.getItem(TASKS_KEY));
    if (Array.isArray(s) && s.length > 0) return s;
  } catch {}
  return defaults.map(t => ({ id: t.id, text: t.task, done: t.done }));
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function renderTasks(defaults, weekOf) {
  document.getElementById('week-of').textContent = weekOf;
  const tasks = loadTasks(defaults, weekOf);
  drawTaskList(tasks, defaults, weekOf);
  drawAddBtn(tasks, defaults, weekOf);
}

function drawTaskList(tasks, defaults, weekOf) {
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task ${task.done ? 'task--done' : ''}`;

    const check = document.createElement('span');
    check.className = 'task__check';
    check.textContent = task.done ? '✓' : '';
    check.addEventListener('click', () => {
      task.done = !task.done;
      saveTasks(tasks);
      drawTaskList(tasks, defaults, weekOf);
    });

    const text = document.createElement('span');
    text.className = 'task__text';
    text.textContent = task.text;
    text.contentEditable = 'false';

    text.addEventListener('dblclick', () => {
      if (task.done) return;
      text.contentEditable = 'true';
      text.focus();
      const range = document.createRange();
      range.selectNodeContents(text);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    });

    text.addEventListener('blur', () => {
      text.contentEditable = 'false';
      const v = text.textContent.trim();
      if (v && v !== task.text) { task.text = v; saveTasks(tasks); }
      else if (!v) { text.textContent = task.text; }
    });

    text.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); text.blur(); }
      if (e.key === 'Escape') { text.textContent = task.text; text.blur(); }
    });

    const del = document.createElement('button');
    del.className = 'task__delete';
    del.textContent = '×';
    del.title = '删除';
    del.addEventListener('click', () => {
      tasks.splice(tasks.indexOf(task), 1);
      saveTasks(tasks);
      drawTaskList(tasks, defaults, weekOf);
    });

    li.append(check, text, del);
    list.appendChild(li);
  });
}

function drawAddBtn(tasks, defaults, weekOf) {
  const area = document.getElementById('task-add-area');
  area.innerHTML = '';

  const btn = document.createElement('button');
  btn.className = 'task-add__btn';
  btn.innerHTML = '+ 添加任务';

  btn.addEventListener('click', () => {
    area.innerHTML = '';
    const input = document.createElement('input');
    input.className = 'task-add__input';
    input.placeholder = '输入任务，回车确认';
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) {
        tasks.push({ id: Date.now(), text: input.value.trim(), done: false });
        saveTasks(tasks);
        drawTaskList(tasks, defaults, weekOf);
        drawAddBtn(tasks, defaults, weekOf);
      }
      if (e.key === 'Escape') drawAddBtn(tasks, defaults, weekOf);
    });
    input.addEventListener('blur', () => setTimeout(() => drawAddBtn(tasks, defaults, weekOf), 100));
    area.appendChild(input);
    input.focus();
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
    a.className = 'frontier-item';
    a.href = item.url || '#';
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `
      <div class="frontier-item__head">
        <span class="frontier-item__title">${esc(item.title)}</span>
        <span class="frontier-item__arrow">→</span>
      </div>
      <div class="frontier-item__meta">
        <span class="frontier-item__tag">${esc(item.source)}</span>
        <span>${item.date}</span>
      </div>
      <div class="frontier-item__relevance">${esc(item.relevance)}</div>
    `;
    el.appendChild(a);
  });

  const bar = document.getElementById('frontier-action');
  if (ago >= 1) {
    bar.innerHTML = `<span>${ago} 天没更新</span><button class="btn-copy" id="btn-copy-prompt">复制更新提示词</button>`;
    document.getElementById('btn-copy-prompt').addEventListener('click', () => {
      const p = '请用 WebSearch 获取今日 AI 行业前沿动态(10 条,聚焦消金/金融/PM 视角,每条附原文链接),写入 D:\\AI-PM\\data.json 的 frontier.items,更新 lastFrontierUpdate,然后 git commit + push。';
      navigator.clipboard?.writeText(p).then(() => toast('已复制'), () => toast('复制失败'));
    });
  } else {
    bar.innerHTML = '<span class="frontier-ok">今日已更新 ✓</span>';
  }
}

/* ── Reflections ── */
function renderReflections(refs) {
  const el = document.getElementById('reflections-list');
  el.innerHTML = '';
  if (!refs?.length) {
    el.innerHTML = '<div class="reflection-empty">还没有反思，点上面「💭 反思」开始</div>';
    return;
  }
  refs.slice(0, 5).forEach(r => {
    const div = document.createElement('div');
    div.className = 'reflection';
    div.innerHTML = `
      <div class="reflection__head">
        <span class="reflection__date">${r.date}</span>
        <span class="reflection__tag">${esc(r.tag)}</span>
      </div>
      <div class="reflection__content">${esc(r.content)}</div>
    `;
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
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
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
    renderActions();
    renderTasks(data.thisWeek.tasks, data.thisWeek.weekOf);
    renderFrontier(data.frontier);
    renderReflections(data.reflections);
    renderFooter(data);
  } catch (e) {
    document.getElementById('error-banner').classList.remove('hidden');
    document.getElementById('error-message').textContent = '渲染失败: ' + e.message;
  }
})();
