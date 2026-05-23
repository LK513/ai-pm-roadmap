const REPO = 'LK513/ai-pm-roadmap';
const REPO_URL = `https://github.com/${REPO}`;
const ISSUES_URL = `${REPO_URL}/issues`;
const NEW_ISSUE_URL = `${REPO_URL}/issues/new`;
const TASKS_KEY = 'ai-pm-tasks';
const WEEK_KEY = 'ai-pm-tasks-week';

/* ── Data Loading ── */

async function loadData() {
  try {
    const res = await fetch('data.json?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    showError(e.message);
    return null;
  }
}

function showError(msg) {
  document.getElementById('error-banner').classList.remove('hidden');
  document.getElementById('error-message').textContent = msg;
}

/* ── Date Utils ── */

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function daysAgo(s) {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(s); d.setHours(0,0,0,0);
  return Math.floor((t - d) / 86400000);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ── Task State (localStorage) ── */

function loadTasks(defaultTasks, weekOf) {
  const savedWeek = localStorage.getItem(WEEK_KEY);
  // If week changed, reset to defaults
  if (savedWeek !== weekOf) {
    localStorage.setItem(WEEK_KEY, weekOf);
    localStorage.removeItem(TASKS_KEY);
  }
  try {
    const saved = JSON.parse(localStorage.getItem(TASKS_KEY));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch {}
  // Return defaults from data.json
  return defaultTasks.map(t => ({ id: t.id, text: t.task, done: t.done }));
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function nextTaskId(tasks) {
  return tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
}

/* ── Renderers ── */

function renderSidebar(data) {
  document.getElementById('north-star-quote').textContent = data.northStar.title;
  document.getElementById('north-star-milestone').textContent = data.northStar.milestone;
  document.getElementById('current-quarter').textContent = data.progress.currentQuarter;
  document.getElementById('current-theme').textContent = data.progress.currentTheme;
  const days = daysBetween(todayStr(), data.meta.yearEnd);
  document.getElementById('days-remaining').textContent = days > 0 ? days : 0;

  const el = document.getElementById('phases-list');
  el.innerHTML = '';
  data.progress.phases.forEach(p => {
    const cls = p.status === '完成' ? 'sidebar__phase--done'
              : p.status === '进行中' ? 'sidebar__phase--active' : '';
    const row = document.createElement('div');
    row.className = `sidebar__phase ${cls}`;
    row.innerHTML = `
      <span class="sidebar__phase-q">${p.quarter}</span>
      <span class="sidebar__phase-name">${p.theme}</span>
      <span class="sidebar__phase-pct">${p.progress}%</span>
    `;
    el.appendChild(row);
  });
}

function renderFeedbackButtons() {
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

/* ── Tasks (CRUD) ── */

function renderTasks(defaultTasks, weekOf) {
  document.getElementById('week-of').textContent = weekOf;
  const tasks = loadTasks(defaultTasks, weekOf);
  _renderTaskList(tasks, defaultTasks, weekOf);
  _renderAddButton(tasks, defaultTasks, weekOf);
}

function _renderTaskList(tasks, defaultTasks, weekOf) {
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task ${task.done ? 'task--done' : ''}`;

    // Checkbox
    const check = document.createElement('span');
    check.className = 'task__check';
    check.textContent = task.done ? '✓' : '';
    check.addEventListener('click', () => {
      task.done = !task.done;
      saveTasks(tasks);
      _renderTaskList(tasks, defaultTasks, weekOf);
    });

    // Editable text
    const text = document.createElement('span');
    text.className = 'task__text';
    text.textContent = task.text;
    text.contentEditable = 'false';

    text.addEventListener('dblclick', () => {
      if (task.done) return;
      text.contentEditable = 'true';
      text.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(text);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    text.addEventListener('blur', () => {
      text.contentEditable = 'false';
      const newText = text.textContent.trim();
      if (newText && newText !== task.text) {
        task.text = newText;
        saveTasks(tasks);
      } else if (!newText) {
        text.textContent = task.text; // revert if empty
      }
    });

    text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); text.blur(); }
      if (e.key === 'Escape') { text.textContent = task.text; text.blur(); }
    });

    // Delete
    const del = document.createElement('button');
    del.className = 'task__delete';
    del.textContent = '×';
    del.title = '删除';
    del.addEventListener('click', () => {
      const idx = tasks.indexOf(task);
      if (idx > -1) {
        tasks.splice(idx, 1);
        saveTasks(tasks);
        _renderTaskList(tasks, defaultTasks, weekOf);
      }
    });

    li.append(check, text, del);
    list.appendChild(li);
  });
}

function _renderAddButton(tasks, defaultTasks, weekOf) {
  const area = document.getElementById('task-add-area');
  area.innerHTML = '';

  // Check if input is already open
  if (area.querySelector('.task-add__input')) return;

  const btn = document.createElement('button');
  btn.className = 'task-add__btn';
  btn.innerHTML = '+ 添加任务';

  btn.addEventListener('click', () => {
    area.innerHTML = '';
    const input = document.createElement('input');
    input.className = 'task-add__input';
    input.type = 'text';
    input.placeholder = '输入新任务，回车确认';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = input.value.trim();
        if (text) {
          tasks.push({ id: nextTaskId(tasks), text, done: false });
          saveTasks(tasks);
          _renderTaskList(tasks, defaultTasks, weekOf);
        }
        _renderAddButton(tasks, defaultTasks, weekOf);
      }
      if (e.key === 'Escape') {
        _renderAddButton(tasks, defaultTasks, weekOf);
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => _renderAddButton(tasks, defaultTasks, weekOf), 100);
    });

    area.appendChild(input);
    input.focus();
  });

  area.appendChild(btn);
}

/* ── Frontier ── */

function renderFrontier(frontier) {
  const ago = daysAgo(frontier.lastFrontierUpdate);

  const badge = document.getElementById('frontier-badge');
  if (ago <= 0) {
    badge.textContent = '今日更新';
    badge.className = 'card__badge card__badge--green';
  } else if (ago === 1) {
    badge.textContent = '昨天';
    badge.className = 'card__badge';
  } else {
    badge.textContent = `${ago}天前`;
    badge.className = 'card__badge card__badge--stale';
  }

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
    bar.innerHTML = `<span>${ago} 天没更新了</span><button class="btn-copy" id="btn-copy-prompt">复制更新提示词</button>`;
    document.getElementById('btn-copy-prompt').addEventListener('click', copyPrompt);
  } else {
    bar.innerHTML = '<span class="frontier-ok">今日已更新 ✓</span>';
  }
}

function copyPrompt() {
  const p = '请用 WebSearch 获取今日 AI 行业前沿动态(10 条,聚焦消金/金融/PM 视角,每条附原文链接),写入 D:\\AI-PM\\data.json 的 frontier.items,更新 lastFrontierUpdate,然后 git commit + push。';
  navigator.clipboard?.writeText(p).then(
    () => toast('已复制,粘贴给 Claude'),
    () => toast('复制失败')
  );
}

/* ── Reflections ── */

function renderReflections(reflections) {
  const el = document.getElementById('reflections-list');
  el.innerHTML = '';
  if (!reflections?.length) {
    el.innerHTML = '<div class="reflection-empty">还没有反思，点侧边栏「💭 反思」开始</div>';
    return;
  }
  reflections.slice(0, 5).forEach(r => {
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
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Main ── */

(async function main() {
  const data = await loadData();
  if (!data) return;
  try {
    renderSidebar(data);
    renderFeedbackButtons();
    renderTasks(data.thisWeek.tasks, data.thisWeek.weekOf);
    renderFrontier(data.frontier);
    renderReflections(data.reflections);
    renderFooter(data);
  } catch (e) {
    showError('渲染失败: ' + e.message);
    console.error(e);
  }
})();
