const REPO = 'LK513/ai-pm-roadmap';
const REPO_URL = `https://github.com/${REPO}`;
const ISSUES_URL = `${REPO_URL}/issues`;
const NEW_ISSUE_URL = `${REPO_URL}/issues/new`;

async function loadData() {
  try {
    const res = await fetch('data.json?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (e) {
    showError(e.message);
    return null;
  }
}

function showError(msg) {
  const banner = document.getElementById('error-banner');
  banner.classList.remove('hidden');
  document.getElementById('error-message').textContent = msg;
}

function daysBetween(fromStr, toStr) {
  const d1 = new Date(fromStr);
  const d2 = new Date(toStr);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function daysAgo(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function renderHero(data) {
  document.getElementById('user-name').textContent = data.meta.userName;
  document.getElementById('north-star-quote').textContent = data.northStar.title;
  document.getElementById('current-quarter').textContent = data.progress.currentQuarter;
  document.getElementById('current-theme').textContent = data.progress.currentTheme;
  document.getElementById('milestone-text').textContent = data.northStar.milestone;
  const days = daysBetween(todayStr(), data.meta.yearEnd);
  document.getElementById('days-remaining').textContent = days > 0 ? days : 0;
}

function renderPhases(progress) {
  const list = document.getElementById('phases-list');
  list.innerHTML = '';
  progress.phases.forEach(p => {
    const row = document.createElement('div');
    const cls = p.status === '完成' ? 'completed' : p.status === '进行中' ? 'active' : '';
    row.className = `phase-row ${cls}`;
    row.innerHTML = `
      <span class="phase-quarter">${p.quarter}</span>
      <div class="phase-info">
        <div class="phase-theme">${p.theme}</div>
        <div class="phase-status">${p.status}</div>
      </div>
      <div class="phase-progress">
        <div class="progress-bar"><div class="progress-fill" style="width: ${p.progress}%"></div></div>
        <span>${p.progress}%</span>
      </div>
    `;
    list.appendChild(row);
  });
}

function renderTasks(thisWeek) {
  document.getElementById('week-of').textContent = `· ${thisWeek.weekOf} 起`;
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';
  thisWeek.tasks.forEach(t => {
    const row = document.createElement('li');
    row.className = `task-row ${t.done ? 'done' : ''}`;
    row.innerHTML = `
      <span class="task-checkbox" aria-label="${t.done ? '已完成' : '未完成'}">${t.done ? '✓' : ''}</span>
      <span class="task-text">${t.task}</span>
    `;
    list.appendChild(row);
  });
}

function renderFrontier(frontier) {
  const ago = daysAgo(frontier.lastFrontierUpdate);
  let label;
  if (ago <= 0) label = '今天更新';
  else if (ago === 1) label = '昨天更新';
  else label = `${ago} 天前更新`;
  document.getElementById('frontier-update').textContent = `· ${label}`;

  const list = document.getElementById('frontier-list');
  list.innerHTML = '';
  frontier.items.forEach(item => {
    const row = document.createElement('li');
    row.className = 'frontier-row';
    row.innerHTML = `
      <div class="frontier-title">${escapeHtml(item.title)}</div>
      <div class="frontier-meta">${escapeHtml(item.source)} · ${item.date}</div>
      <div class="frontier-relevance">💡 ${escapeHtml(item.relevance)}</div>
    `;
    list.appendChild(row);
  });

  const actionEl = document.getElementById('frontier-action');
  if (ago >= 1) {
    actionEl.innerHTML = `${ago} 天没更新了 <button class="btn-update-frontier" id="btn-copy-prompt">复制更新提示词</button>`;
    document.getElementById('btn-copy-prompt').addEventListener('click', copyUpdatePrompt);
  } else {
    actionEl.textContent = '今日已更新 ✓';
  }
}

function copyUpdatePrompt() {
  const prompt = '请用 WebSearch 获取今日 AI 行业前沿动态(3 条,聚焦消金/金融/PM 视角),写入 D:\\AI-PM\\data.json 的 frontier.items 字段,更新 lastFrontierUpdate,然后 git commit + push。';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(prompt).then(
      () => showToast('提示词已复制,粘贴给 Claude'),
      () => showToast('复制失败,手动复制: ' + prompt)
    );
  } else {
    showToast('请手动复制: ' + prompt);
  }
}

function renderReflections(reflections) {
  const list = document.getElementById('reflections-list');
  list.innerHTML = '';
  if (!reflections || reflections.length === 0) {
    list.innerHTML = '<li class="reflection-row"><div class="reflection-content" style="color: var(--slate-600); font-style: italic;">还没有反思,通过下面"💭 反思"按钮记录第一条吧</div></li>';
    return;
  }
  reflections.slice(0, 3).forEach(r => {
    const row = document.createElement('li');
    row.className = 'reflection-row';
    row.innerHTML = `
      <div class="reflection-meta">
        <span>${r.date}</span>
        <span class="reflection-tag">${escapeHtml(r.tag)}</span>
      </div>
      <div class="reflection-content">${escapeHtml(r.content)}</div>
    `;
    list.appendChild(row);
  });
}

function renderFeedbackButtons() {
  const types = [
    {id: 'btn-reflect', template: 'reflection.md'},
    {id: 'btn-idea', template: 'idea.md'},
    {id: 'btn-resource', template: 'resource.md'},
    {id: 'btn-blocker', template: 'blocker.md'}
  ];
  types.forEach(t => {
    const el = document.getElementById(t.id);
    if (el) el.href = `${NEW_ISSUE_URL}?template=${t.template}`;
  });
}

function renderFooter(data) {
  document.getElementById('last-update').textContent = data.meta.lastUpdate;
  document.getElementById('repo-link').href = REPO_URL;
  document.getElementById('issues-link').href = ISSUES_URL;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

(async function main() {
  const data = await loadData();
  if (!data) return;
  try {
    renderHero(data);
    renderPhases(data.progress);
    renderTasks(data.thisWeek);
    renderFrontier(data.frontier);
    renderReflections(data.reflections);
    renderFeedbackButtons();
    renderFooter(data);
  } catch (e) {
    showError('渲染失败: ' + e.message);
    console.error(e);
  }
})();
