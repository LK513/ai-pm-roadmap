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

/* ── Renderers ── */

function renderHero(data) {
  document.getElementById('user-name').textContent = data.meta.userName;
  document.getElementById('north-star-quote').textContent = data.northStar.title;
  document.getElementById('north-star-milestone').textContent = data.northStar.milestone;
  document.getElementById('current-quarter').textContent = data.progress.currentQuarter;
  document.getElementById('current-theme').textContent = data.progress.currentTheme;
  document.getElementById('milestone-text').textContent = data.northStar.milestone;
  const days = daysBetween(todayStr(), data.meta.yearEnd);
  document.getElementById('days-remaining').textContent = days > 0 ? days : 0;
}

function renderPhases(progress) {
  const el = document.getElementById('phases-list');
  el.innerHTML = '';
  progress.phases.forEach(p => {
    const cls = p.status === '完成' ? 'phase--done' : p.status === '进行中' ? 'phase--active' : 'phase--pending';
    const row = document.createElement('div');
    row.className = `phase ${cls}`;
    row.innerHTML = `
      <span class="phase__quarter">${p.quarter}</span>
      <div class="phase__info">
        <div class="phase__theme">${p.theme}</div>
        <div class="phase__status"><span class="phase__status-dot"></span>${p.status}</div>
      </div>
      <div class="phase__bar">
        <div class="phase__progress-track"><div class="phase__progress-fill" style="width:${p.progress}%"></div></div>
        <span class="phase__pct">${p.progress}%</span>
      </div>
    `;
    el.appendChild(row);
  });
}

function renderTasks(thisWeek) {
  document.getElementById('week-of').textContent = thisWeek.weekOf;
  const el = document.getElementById('tasks-list');
  el.innerHTML = '';
  thisWeek.tasks.forEach(t => {
    const row = document.createElement('li');
    row.className = `task ${t.done ? 'task--done' : ''}`;
    row.innerHTML = `
      <span class="task__check" aria-label="${t.done ? '已完成' : '未完成'}">${t.done ? '✓' : ''}</span>
      <span class="task__text">${escapeHtml(t.task)}</span>
    `;
    el.appendChild(row);
  });
}

function renderFrontier(frontier) {
  const ago = daysAgo(frontier.lastFrontierUpdate);

  // Badge
  const badge = document.getElementById('frontier-badge');
  if (ago <= 0) {
    badge.textContent = '今日更新';
    badge.className = 'card-badge card-badge--green';
  } else if (ago === 1) {
    badge.textContent = '昨天更新';
    badge.className = 'card-badge';
  } else {
    badge.textContent = `${ago}天前`;
    badge.className = 'card-badge card-badge--stale';
  }

  // Items
  const el = document.getElementById('frontier-list');
  el.innerHTML = '';
  frontier.items.forEach(item => {
    const row = document.createElement('a');
    row.className = 'frontier-item';
    row.href = item.url || '#';
    row.target = '_blank';
    row.rel = 'noopener';
    row.innerHTML = `
      <div class="frontier-item__head">
        <span class="frontier-item__title">${escapeHtml(item.title)}</span>
        <span class="frontier-item__arrow">→</span>
      </div>
      <div class="frontier-item__meta">
        <span class="frontier-item__tag">${escapeHtml(item.source)}</span>
        <span>${item.date}</span>
      </div>
      <div class="frontier-item__relevance">${escapeHtml(item.relevance)}</div>
    `;
    el.appendChild(row);
  });

  // Update bar
  const bar = document.getElementById('frontier-action');
  if (ago >= 1) {
    bar.innerHTML = `<span>${ago} 天没更新了</span><button class="btn-copy" id="btn-copy-prompt">复制更新提示词</button>`;
    document.getElementById('btn-copy-prompt').addEventListener('click', copyUpdatePrompt);
  } else {
    bar.innerHTML = '<span class="frontier-updated">今日已更新 ✓</span>';
  }
}

function copyUpdatePrompt() {
  const prompt = '请用 WebSearch 获取今日 AI 行业前沿动态(10 条,聚焦消金/金融/PM 视角,每条附原文链接),写入 D:\\AI-PM\\data.json 的 frontier.items 字段,更新 lastFrontierUpdate,然后 git commit + push。';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(prompt).then(
      () => showToast('已复制,粘贴给 Claude'),
      () => showToast('复制失败,手动复制')
    );
  } else {
    showToast('请手动复制提示词');
  }
}

function renderReflections(reflections) {
  const el = document.getElementById('reflections-list');
  el.innerHTML = '';
  if (!reflections || reflections.length === 0) {
    el.innerHTML = '<div class="reflection-empty">还没有反思记录,点上面「💭 反思」按钮开始</div>';
    return;
  }
  reflections.slice(0, 5).forEach(r => {
    const row = document.createElement('div');
    row.className = 'reflection';
    row.innerHTML = `
      <div class="reflection__head">
        <span class="reflection__date">${r.date}</span>
        <span class="reflection__tag">${escapeHtml(r.tag)}</span>
      </div>
      <div class="reflection__content">${escapeHtml(r.content)}</div>
    `;
    el.appendChild(row);
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

/* ── Utils ── */

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

/* ── Main ── */

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
