// Kira Command Center — Main App
const API = '';
let currentPage = localStorage.getItem('kira-page') || 'brief';
let taskView = 'kanban';
let taskFilters = { company: 'all', priority: 'all', status: 'all' };
let graphData = null;
let graphSimulation = null;

// --- API ---
async function api(path) {
  const r = await fetch(API + path);
  return r.json();
}
async function apiPost(path, data) {
  const r = await fetch(API + path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
  return r.json();
}
async function apiPut(path, data) {
  const r = await fetch(API + path, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
  return r.json();
}

// --- Navigation ---
function navigate(page) {
  currentPage = page;
  localStorage.setItem('kira-page', page);
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  renderPage();
}

// Keyboard shortcuts
let lastKey = null;
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (lastKey === 'g') {
    if (e.key === 'b') navigate('brief');
    else if (e.key === 't') navigate('tasks');
    else if (e.key === 'g') navigate('goals');
    else if (e.key === 'k') navigate('knowledge');
    else if (e.key === 'd') navigate('vdr');
    else if (e.key === 'c') navigate('chat');
    lastKey = null;
    return;
  }
  lastKey = e.key;
  setTimeout(() => lastKey = null, 500);
});

// Sidebar toggle
document.getElementById('sidebarToggle').onclick = () => {
  const sb = document.getElementById('sidebar');
  sb.classList.toggle('collapsed');
  document.getElementById('sidebarToggle').textContent = sb.classList.contains('collapsed') ? '›' : '‹';
};

// --- Render ---
function renderPage() {
  const c = document.getElementById('page-container');
  c.innerHTML = '<div class="page" style="min-height:200px"><div class="skeleton" style="width:60%;height:32px;margin-bottom:16px"></div><div class="skeleton" style="width:100%;height:200px"></div></div>';
  
  switch(currentPage) {
    case 'brief': renderBrief(); break;
    case 'tasks': renderTasks(); break;
    case 'goals': renderGoals(); break;
    case 'knowledge': renderKnowledge(); break;
    case 'vdr': renderVDR(); break;
    case 'chat': renderChat(); break;
  }
}

// --- Morning Brief ---
async function renderBrief() {
  const data = await api('/api/brief');
  const c = document.getElementById('page-container');
  
  const episodeHtml = (data.episodes || []).slice(0, 15).map(ep => {
    const time = new Date(ep.timestamp).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
    const summary = ep.summary || (typeof ep.type === 'string' ? ep.type : '');
    return `<div class="episode-item"><div class="episode-dot"></div><span class="episode-time">${time}</span><span class="episode-text">${escHtml(summary)}</span></div>`;
  }).join('') || '<div style="color:var(--text-muted);padding:12px">No recent episodes</div>';

  const taskHtml = (data.dueTasks || []).map(t =>
    `<div class="kanban-card priority-${t.priority}"><div class="kanban-card-title">${escHtml(t.title)}</div><div class="kanban-card-meta"><span class="company-tag tag-${t.company}">${t.company}</span><span class="kanban-card-due">Due: ${t.due}</span></div></div>`
  ).join('') || '<div style="color:var(--text-muted);padding:12px">No tasks due today 🎉</div>';

  const h = data.health || {};
  const sys = h.system || {};
  const memPct = sys.memTotalMB ? Math.round((sys.memUsedMB / sys.memTotalMB) * 100) : 0;

  c.innerHTML = `<div class="page">
    <div class="page-header">
      <h1>${data.greeting}</h1>
      <div class="subtitle">${new Date().toLocaleDateString('en-GB', {weekday:'long',year:'numeric',month:'long',day:'numeric'})} • Kira Command Center</div>
    </div>

    <div class="grid grid-4" style="margin-bottom:24px">
      <div class="card" style="text-align:center">
        ${healthRing(h.gateway ? 100 : 0, h.gateway ? 'var(--on-track)' : 'var(--at-risk)')}
        <div style="margin-top:8px;font-size:13px;font-weight:600">Gateway</div>
        <span class="badge ${h.gateway?'badge-ok':'badge-error'}">${h.gateway?'Online':'Offline'}</span>
      </div>
      <div class="card" style="text-align:center">
        ${healthRing(h.memory ? 100 : 0, h.memory ? 'var(--on-track)' : 'var(--at-risk)')}
        <div style="margin-top:8px;font-size:13px;font-weight:600">Memory DB</div>
        <span class="badge ${h.memory?'badge-ok':'badge-error'}">${h.memory?'Connected':'Down'}</span>
      </div>
      <div class="card" style="text-align:center">
        ${healthRing(Math.min(100, h.cronJobs * 20), 'var(--accent)')}
        <div style="margin-top:8px;font-size:13px;font-weight:600">Cron Jobs</div>
        <span class="badge badge-ok">${h.cronJobs} active</span>
      </div>
      <div class="card" style="text-align:center">
        ${healthRing(memPct, memPct > 85 ? 'var(--at-risk)' : memPct > 60 ? 'var(--behind)' : 'var(--on-track)')}
        <div style="margin-top:8px;font-size:13px;font-weight:600">Memory</div>
        <span class="badge badge-ok">${sys.memUsedMB||0}/${sys.memTotalMB||0} MB</span>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:24px">
      <div class="card">
        <div class="card-header"><span class="card-title">📝 Activity Log (24h)</span></div>
        <div style="max-height:320px;overflow-y:auto">${episodeHtml}</div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">⚡ Tasks Due Today</span></div>
        <div style="max-height:320px;overflow-y:auto">${taskHtml}</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:24px">
      <div class="card">
        <div class="card-header"><span class="card-title">🎯 Goals Snapshot</span></div>
        ${(data.goals||[]).map(g => {
          const pct = g.unit === '%' ? g.current : Math.round(g.current / g.target * 100);
          return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>${g.title}</span><span style="color:var(--${g.status === 'on-track' ? 'on-track' : g.status === 'behind' ? 'behind' : 'at-risk'})">${pct}%</span></div><div class="progress-bar"><div class="progress-fill progress-${g.status}" style="width:${pct}%"></div></div></div>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">⚡ Quick Actions</span></div>
        <div class="quick-actions">
          <button class="quick-action" onclick="navigate('tasks')">📋 View Tasks</button>
          <button class="quick-action" onclick="navigate('goals')">🎯 Check Goals</button>
          <button class="quick-action" onclick="navigate('knowledge')">🧠 Knowledge Graph</button>
          <button class="quick-action" onclick="window.open('http://localhost:18789','_blank')">🔗 Gateway</button>
        </div>
        <div style="margin-top:16px">
          <div class="card-title" style="margin-bottom:8px">📊 Task Summary</div>
          <div style="display:flex;gap:16px;font-size:14px">
            <span><strong>${data.allTasks?.total||0}</strong> total</span>
            <span style="color:var(--accent)"><strong>${data.allTasks?.inProgress||0}</strong> in progress</span>
            <span style="color:var(--on-track)"><strong>${data.allTasks?.done||0}</strong> done</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function healthRing(pct, color) {
  const r = 34, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return `<div class="health-ring" style="margin:0 auto"><svg width="80" height="80"><circle class="bg" cx="40" cy="40" r="${r}"/><circle class="progress" cx="40" cy="40" r="${r}" stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/></svg><div class="label">${pct}%</div></div>`;
}

// --- Tasks ---
async function renderTasks() {
  const tasks = await api('/api/tasks');
  const c = document.getElementById('page-container');
  
  const companies = ['all', 'IAM', 'OttoGen', 'ZenithCred', 'Chimera', 'CuttingEdge', 'SentinAgro', 'Abura', 'Personal'];
  const priorities = ['all', '0', '1', '2', '3'];
  const statuses = ['all', 'todo', 'in-progress', 'done'];

  const filtered = tasks.filter(t => {
    if (taskFilters.company !== 'all' && t.company !== taskFilters.company) return false;
    if (taskFilters.priority !== 'all' && t.priority !== parseInt(taskFilters.priority)) return false;
    if (taskFilters.status !== 'all' && t.status !== taskFilters.status) return false;
    return true;
  });

  const filterHtml = (type, options, labels) => options.map(o => 
    `<button class="filter-btn ${taskFilters[type]===o?'active':''}" onclick="setTaskFilter('${type}','${o}')">${labels?labels[o]||(o==='all'?'All':o):o==='all'?'All':o}</button>`
  ).join('');

  const priorityLabels = {'all':'All','0':'🔴 P0','1':'🟠 P1','2':'🟡 P2','3':'🟢 P3'};

  c.innerHTML = `<div class="page">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between">
      <div><h1>Tasks</h1><div class="subtitle">${tasks.length} tasks across ${new Set(tasks.map(t=>t.company)).size} companies</div></div>
      <div class="view-toggle">
        <button class="${taskView==='kanban'?'active':''}" onclick="setTaskView('kanban')">⊞ Kanban</button>
        <button class="${taskView==='table'?'active':''}" onclick="setTaskView('table')">☰ Table</button>
      </div>
    </div>
    <div class="filters">
      <span style="font-size:12px;color:var(--text-muted);padding:6px 0">Company:</span>
      ${filterHtml('company', companies)}
    </div>
    <div class="filters">
      <span style="font-size:12px;color:var(--text-muted);padding:6px 0">Priority:</span>
      ${filterHtml('priority', priorities, priorityLabels)}
      <span style="font-size:12px;color:var(--text-muted);padding:6px 0;margin-left:8px">Status:</span>
      ${filterHtml('status', statuses)}
    </div>
    <div id="task-content">${taskView === 'kanban' ? renderKanban(filtered) : renderTable(filtered)}</div>
  </div>`;
}

function renderKanban(tasks) {
  const cols = [
    { key: 'todo', label: 'To Do', color: 'var(--text-muted)' },
    { key: 'in-progress', label: 'In Progress', color: 'var(--accent)' },
    { key: 'done', label: 'Done', color: 'var(--on-track)' }
  ];
  return `<div class="kanban">${cols.map(col => {
    const colTasks = tasks.filter(t => t.status === col.key);
    return `<div class="kanban-column">
      <div class="kanban-column-header"><span style="color:${col.color}">${col.label}</span><span class="count">${colTasks.length}</span></div>
      <div class="kanban-cards">${colTasks.map(t => `
        <div class="kanban-card priority-${t.priority}" onclick="toggleTaskDetail('${t.id}')">
          <div class="kanban-card-header-row">
            <div class="kanban-card-title">${escHtml(t.title)}</div>
            <button class="status-badge status-${t.status}" onclick="event.stopPropagation();cycleTaskStatus('${t.id}')" title="Click to change status">${t.status}</button>
          </div>
          <div class="kanban-card-meta">
            <span class="priority-dot priority-dot-${t.priority}"></span>
            <span class="company-tag tag-${t.company}">${t.company}</span>
            ${t.due ? `<span class="kanban-card-due">${t.due}</span>` : ''}
          </div>
          <div class="task-detail" id="detail-${t.id}" style="display:none">
            ${t.description ? `<div class="task-detail-field"><strong>Description:</strong> ${escHtml(t.description)}</div>` : ''}
            ${t.due ? `<div class="task-detail-field"><strong>Due:</strong> ${t.due}</div>` : ''}
            ${t.notes ? `<div class="task-detail-field"><strong>Notes:</strong> ${escHtml(t.notes)}</div>` : ''}
            ${!t.description && !t.notes ? '<div class="task-detail-field" style="color:var(--text-muted)">No additional details</div>' : ''}
          </div>
        </div>`).join('')}</div>
    </div>`;
  }).join('')}</div>`;
}

function renderTable(tasks) {
  return `<table class="table-view">
    <thead><tr><th>Priority</th><th>Task</th><th>Company</th><th>Status</th><th>Due</th></tr></thead>
    <tbody>${tasks.map(t => `<tr onclick="toggleTaskDetail('${t.id}')" style="cursor:pointer">
      <td><span class="priority-dot priority-dot-${t.priority}"></span> P${t.priority}</td>
      <td>${escHtml(t.title)}</td>
      <td><span class="company-tag tag-${t.company}">${t.company}</span></td>
      <td><button class="status-badge status-${t.status}" onclick="event.stopPropagation();cycleTaskStatus('${t.id}')">${t.status}</button></td>
      <td style="color:var(--text-muted)">${t.due||'-'}</td>
    </tr>
    <tr class="task-detail-row" id="detail-${t.id}" style="display:none"><td colspan="5" style="padding:12px 16px;background:var(--bg-tertiary)">
      ${t.description ? `<div><strong>Description:</strong> ${escHtml(t.description)}</div>` : ''}
      ${t.notes ? `<div><strong>Notes:</strong> ${escHtml(t.notes)}</div>` : ''}
      ${!t.description && !t.notes ? '<div style="color:var(--text-muted)">No additional details</div>' : ''}
    </td></tr>`).join('')}</tbody>
  </table>`;
}

window.setTaskFilter = (type, val) => { taskFilters[type] = val; renderTasks(); };
window.setTaskView = (view) => { taskView = view; renderTasks(); };
window.cycleTaskStatus = async (id) => {
  const tasks = await api('/api/tasks');
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const next = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' };
  await apiPut('/api/tasks', { id, status: next[t.status] || 'todo' });
  renderTasks();
};

// --- Goals ---
async function renderGoals() {
  const goals = await api('/api/goals');
  const c = document.getElementById('page-container');

  // Group by level
  const levels = ['🌟 Vision', '📅 6-Month Goal', '🗓️ 3-Month Objective', '📋 1-Month Target', '🏃 Weekly Sprint'];
  const grouped = {};
  levels.forEach(l => grouped[l] = []);
  goals.forEach(g => {
    const l = g.level || '?';
    if (!grouped[l]) grouped[l] = [];
    grouped[l].push(g);
  });

  const statusIcon = s => s === 'Achieved' ? '✅' : s === 'In Progress' ? '🔄' : s === 'Abandoned' ? '❌' : '⬜';
  const statusColor = s => s === 'on-track' ? 'var(--on-track)' : s === 'behind' ? 'var(--behind)' : 'var(--at-risk)';

  const achieved = goals.filter(g => g.notionStatus === 'Achieved').length;
  const inProgress = goals.filter(g => g.notionStatus === 'In Progress').length;
  const notStarted = goals.filter(g => g.notionStatus === 'Not Started').length;

  c.innerHTML = `<div class="page">
    <div class="page-header"><h1>Goals</h1><div class="subtitle">${goals.length} goals — ${achieved} achieved, ${inProgress} in progress, ${notStarted} not started</div></div>
    <div class="grid grid-3" style="margin-bottom:24px">
      <div class="card" style="text-align:center"><div class="card-label">Achieved</div><div class="card-value" style="color:var(--on-track)">${achieved}</div></div>
      <div class="card" style="text-align:center"><div class="card-label">In Progress</div><div class="card-value" style="color:var(--accent)">${inProgress}</div></div>
      <div class="card" style="text-align:center"><div class="card-label">Not Started</div><div class="card-value" style="color:var(--text-muted)">${notStarted}</div></div>
    </div>
    ${levels.filter(l => grouped[l]?.length > 0).map(level => `
      <div style="margin-bottom:24px">
        <h2 style="font-size:1.1rem;margin-bottom:12px;color:var(--text-secondary)">${level} <span style="color:var(--text-muted);font-size:.85rem">(${grouped[level].length})</span></h2>
        <div class="grid grid-2" style="gap:12px">
          ${grouped[level].map(g => {
            const pct = g.current || 0;
            const sc = statusColor(g.status);
            const due = g.due ? new Date(g.due).toLocaleDateString('en-GB', {day:'numeric',month:'short'}) : '';
            const overdue = g.due && new Date(g.due) < new Date() && g.notionStatus !== 'Achieved';
            return `<div class="card" style="padding:16px;${overdue ? 'border-color:var(--at-risk)' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="flex:1">
                  <div style="font-weight:600;margin-bottom:4px">${statusIcon(g.notionStatus)} ${escHtml(g.name)}</div>
                  <div style="display:flex;gap:8px;align-items:center;font-size:.8rem;color:var(--text-muted)">
                    ${g.owner !== '?' ? `<span class="badge badge-${g.owner==='Kira'?'ok':'warn'}" style="font-size:.7rem">${g.owner}</span>` : ''}
                    ${due ? `<span style="${overdue ? 'color:var(--at-risk)' : ''}">${overdue ? '⚠️ ' : ''}${due}</span>` : ''}
                  </div>
                  ${g.keyResults ? `<div style="font-size:.8rem;color:var(--text-muted);margin-top:6px">${escHtml(g.keyResults).substring(0,120)}</div>` : ''}
                </div>
                <div style="font-size:1.2rem;font-weight:700;color:${sc};min-width:45px;text-align:right">${pct}%</div>
              </div>
              <div style="margin-top:10px">
                <div class="progress-bar" style="height:6px"><div class="progress-fill progress-${g.status}" style="width:${Math.min(100,pct)}%"></div></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `).join('')}
  </div>`;
}

// --- Knowledge Graph ---
async function renderKnowledge() {
  const c = document.getElementById('page-container');
  c.innerHTML = `<div class="page">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between">
      <div><h1>Knowledge Graph</h1><div class="subtitle" id="graph-stats">Loading...</div></div>
      <input class="search-input" id="graph-search" placeholder="Search entities..." oninput="debounceGraphSearch()">
    </div>
    <div class="filters" id="type-filters"></div>
    <div class="graph-container">
      <svg class="graph-svg" id="graph-svg"></svg>
      <div class="graph-legend" id="graph-legend"></div>
      <div class="graph-sidebar" id="graph-detail">
        <button onclick="document.getElementById('graph-detail').classList.remove('open')" style="float:right;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px">✕</button>
        <div id="entity-detail"></div>
      </div>
    </div>
  </div>`;
  
  await loadGraph();
}

const typeColors = {
  tool: '#0055ff', concept: '#af52de', project: '#ff9500', company: '#34c759',
  file: '#8886d6', person: '#ff3b30', session: '#5ac8fa', model: '#ffd60a',
  system: '#00c7be', process: '#ff6482', area: '#ac8e68', service: '#30d158',
  agent: '#ff375f', component: '#64d2ff', default: '#666680'
};

let graphSearchTimer;
function debounceGraphSearch() {
  clearTimeout(graphSearchTimer);
  graphSearchTimer = setTimeout(() => loadGraph(), 300);
}
window.debounceGraphSearch = debounceGraphSearch;

let selectedType = null;
window.filterGraphType = (type) => {
  selectedType = selectedType === type ? null : type;
  loadGraph();
};

async function loadGraph() {
  const search = document.getElementById('graph-search')?.value || '';
  let url = '/api/knowledge/graph?limit=250';
  if (search) url += '&q=' + encodeURIComponent(search);
  if (selectedType) url += '&type=' + encodeURIComponent(selectedType);
  
  const data = await api(url);
  graphData = data;

  // Stats
  const statsEl = document.getElementById('graph-stats');
  if (statsEl) statsEl.textContent = `${data.nodes.length} entities • ${data.links.length} relations • ${data.facts} facts`;

  // Type filters
  const filtersEl = document.getElementById('type-filters');
  if (filtersEl && data.typeCounts) {
    filtersEl.innerHTML = Object.entries(data.typeCounts).sort((a,b)=>b[1]-a[1]).map(([type, count]) =>
      `<button class="filter-btn ${selectedType===type?'active':''}" onclick="filterGraphType('${type}')" style="border-color:${typeColors[type]||typeColors.default}">
        <span class="legend-dot" style="background:${typeColors[type]||typeColors.default};display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px"></span>
        ${type} (${count})
      </button>`
    ).join('');
  }

  // Legend
  const legendEl = document.getElementById('graph-legend');
  if (legendEl) {
    const types = [...new Set(data.nodes.map(n => n.type))].slice(0, 8);
    legendEl.innerHTML = types.map(t =>
      `<div class="legend-item"><div class="legend-dot" style="background:${typeColors[t]||typeColors.default}"></div>${t}</div>`
    ).join('');
  }

  drawGraph(data);
}

function drawGraph(data) {
  const svg = d3.select('#graph-svg');
  svg.selectAll('*').remove();
  
  const rect = svg.node().getBoundingClientRect();
  const width = rect.width, height = rect.height;

  const g = svg.append('g');
  
  // Zoom
  svg.call(d3.zoom().scaleExtent([0.2, 5]).on('zoom', e => g.attr('transform', e.transform)));

  // Simulation
  if (graphSimulation) graphSimulation.stop();
  graphSimulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.links).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(width/2, height/2))
    .force('collision', d3.forceCollide().radius(20));

  const link = g.append('g').selectAll('line').data(data.links).join('line')
    .attr('stroke', 'var(--border)').attr('stroke-width', 1).attr('stroke-opacity', 0.5);

  const node = g.append('g').selectAll('g').data(data.nodes).join('g')
    .call(d3.drag().on('start', dragStart).on('drag', dragging).on('end', dragEnd));

  node.append('circle')
    .attr('r', d => Math.max(5, Math.min(12, 5 + (d.name?.length || 0) / 3)))
    .attr('fill', d => typeColors[d.type] || typeColors.default)
    .attr('stroke', 'rgba(255,255,255,0.1)').attr('stroke-width', 1)
    .style('cursor', 'pointer');

  node.append('text')
    .text(d => d.name?.length > 18 ? d.name.slice(0,16)+'…' : d.name)
    .attr('dx', 14).attr('dy', 4)
    .attr('fill', 'var(--text-secondary)').attr('font-size', '10px')
    .style('pointer-events', 'none');

  node.on('click', async (e, d) => {
    const detail = await api('/api/knowledge/entity?id=' + encodeURIComponent(d.id));
    showEntityDetail(detail);
  });

  graphSimulation.on('tick', () => {
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  function dragStart(e,d) { if(!e.active) graphSimulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; }
  function dragging(e,d) { d.fx=e.x; d.fy=e.y; }
  function dragEnd(e,d) { if(!e.active) graphSimulation.alphaTarget(0); d.fx=null; d.fy=null; }
}

function showEntityDetail(data) {
  const sidebar = document.getElementById('graph-detail');
  const detail = document.getElementById('entity-detail');
  if (!data.entity) { detail.innerHTML = '<p>Not found</p>'; sidebar.classList.add('open'); return; }
  
  const e = data.entity;
  detail.innerHTML = `
    <div style="margin-top:24px">
      <span class="company-tag" style="background:${typeColors[e.type]||typeColors.default}30;color:${typeColors[e.type]||typeColors.default}">${e.type}</span>
      <h2 style="margin:8px 0;font-size:20px">${escHtml(e.name)}</h2>
      ${e.description ? `<p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">${escHtml(e.description)}</p>` : ''}
      
      <div class="card-title" style="margin:16px 0 8px">Facts (${data.facts.length})</div>
      ${data.facts.slice(0,30).map(f => `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <span style="color:var(--accent)">${escHtml(f.predicate)}</span>: ${escHtml(f.object)}
        ${f.confidence < 1 ? `<span style="color:var(--text-muted)"> (${Math.round(f.confidence*100)}%)</span>` : ''}
      </div>`).join('')}

      ${data.relationsOut.length ? `<div class="card-title" style="margin:16px 0 8px">Relations Out (${data.relationsOut.length})</div>
      ${data.relationsOut.slice(0,20).map(r => `<div style="padding:4px 0;font-size:12px">→ <span style="color:var(--accent)">${escHtml(r.type)}</span> → ${escHtml(r.target_name||r.target_id)}</div>`).join('')}` : ''}

      ${data.relationsIn.length ? `<div class="card-title" style="margin:16px 0 8px">Relations In (${data.relationsIn.length})</div>
      ${data.relationsIn.slice(0,20).map(r => `<div style="padding:4px 0;font-size:12px">← ${escHtml(r.source_name||r.source_id)} <span style="color:var(--accent)">${escHtml(r.type)}</span></div>`).join('')}` : ''}

      <div style="margin-top:16px;font-size:11px;color:var(--text-muted)">
        Created: ${e.created_at || '?'}<br>Updated: ${e.updated_at || '?'}
      </div>
    </div>`;
  sidebar.classList.add('open');
}

// --- Task Detail Toggle ---
window.toggleTaskDetail = (id) => {
  const el = document.getElementById('detail-' + id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? '' : 'none';
};

// --- VDR (Documents) ---
let vdrCurrentDir = '';

async function renderVDR() {
  const c = document.getElementById('page-container');
  c.innerHTML = `<div class="page">
    <div class="page-header"><h1>📂 Documents</h1><div class="subtitle">Virtual Data Room — ~/kira/vdr/</div></div>
    <div id="vdr-breadcrumb" class="vdr-breadcrumb"></div>
    <div class="grid grid-2" style="gap:20px">
      <div class="card" id="vdr-list" style="min-height:400px"></div>
      <div class="card" id="vdr-preview" style="min-height:400px;display:none"></div>
    </div>
  </div>`;
  await loadVDRDir('');
}

async function loadVDRDir(dir) {
  vdrCurrentDir = dir;
  const data = await api('/api/vdr?dir=' + encodeURIComponent(dir));
  const breadcrumb = document.getElementById('vdr-breadcrumb');
  const list = document.getElementById('vdr-list');
  const preview = document.getElementById('vdr-preview');
  if (preview) preview.style.display = 'none';

  // Breadcrumb
  const parts = dir ? dir.split('/').filter(Boolean) : [];
  let bc = '<a href="#" onclick="loadVDRDir(\'\');return false" class="vdr-crumb">🏠 vdr</a>';
  let accumulated = '';
  parts.forEach(p => { accumulated += (accumulated ? '/' : '') + p; const a = accumulated; bc += ` <span class="vdr-sep">›</span> <a href="#" onclick="loadVDRDir('${a}');return false" class="vdr-crumb">${p}</a>`; });
  if (breadcrumb) breadcrumb.innerHTML = bc;

  if (data.error) { list.innerHTML = `<div style="color:var(--at-risk);padding:16px">${data.error}</div>`; return; }

  const items = data.items || [];
  if (dir) items.unshift({ name: '..', isDir: true, size: 0, modified: '' });

  list.innerHTML = `<div class="card-header"><span class="card-title">Files</span><span style="color:var(--text-muted);font-size:12px">${(data.items||[]).length} items</span></div>
    <div class="vdr-file-list">${items.map(item => {
      const icon = item.name === '..' ? '⬆️' : item.isDir ? '📁' : '📄';
      const size = item.isDir ? '' : formatFileSize(item.size);
      const modified = item.modified ? new Date(item.modified).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : '';
      const clickPath = item.name === '..' ? dir.split('/').slice(0, -1).join('/') : (dir ? dir + '/' : '') + item.name;
      const onclick = item.isDir ? `loadVDRDir('${clickPath}')` : `loadVDRFile('${clickPath}')`;
      return `<div class="vdr-file-item" onclick="${onclick}">
        <span class="vdr-file-icon">${icon}</span>
        <span class="vdr-file-name">${escHtml(item.name)}</span>
        <span class="vdr-file-size">${size}</span>
        <span class="vdr-file-date">${modified}</span>
      </div>`;
    }).join('')}</div>`;
}

async function loadVDRFile(filePath) {
  const data = await api('/api/vdr/file?path=' + encodeURIComponent(filePath));
  const preview = document.getElementById('vdr-preview');
  if (!preview) return;
  preview.style.display = '';

  const fileName = filePath.split('/').pop();
  const isMd = fileName.endsWith('.md');
  let rendered;
  if (isMd && typeof marked !== 'undefined') {
    rendered = `<div class="vdr-markdown">${marked.parse(data.content || '')}</div>`;
  } else {
    rendered = `<pre class="vdr-plaintext">${escHtml(data.content || '')}</pre>`;
  }

  preview.innerHTML = `<div class="card-header"><span class="card-title">${escHtml(fileName)}</span><button onclick="document.getElementById('vdr-preview').style.display='none'" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px">✕</button></div>
    <div style="max-height:calc(100vh - 300px);overflow-y:auto">${rendered}</div>`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

window.loadVDRDir = loadVDRDir;
window.loadVDRFile = loadVDRFile;

// --- Utility ---
function escHtml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Fallback markdown parser when marked.js isn't available
function simpleMd(s) {
  if (!s) return '';
  let h = escHtml(s);
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/```[\s\S]*?```/g, m => '<pre>' + m.slice(3, -3) + '</pre>');
  h = h.replace(/^- (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>');
  h = h.replace(/\n/g, '<br>');
  return h;
}

// --- Chat ---
let chatPollTimer = null;
let chatLastCount = 0;
let chatRawMode = false;

async function renderChat() {
  const c = document.getElementById('page-container');
  c.innerHTML = `<div class="page chat-page">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between">
      <div><h1>💬 Chat</h1><div class="subtitle">Telegram ↔ Dashboard</div></div>
      <div style="display:flex;align-items:center;gap:12px">
        <label class="chat-raw-toggle"><input type="checkbox" id="chatRawToggle" onchange="chatRawMode=this.checked;renderChatMessages()" ${chatRawMode?'checked':''}> Raw</label>
        <span class="badge badge-ok" id="chatSyncBadge">Synced</span>
      </div>
    </div>
    <div class="card chat-container">
      <div id="chatMessages" class="chat-messages"></div>
      <div class="chat-typing" id="chatTyping" style="display:none"><span class="typing-dots"><span></span><span></span><span></span></span> Kira is typing...</div>
      <div class="chat-input-bar">
        <textarea id="chatInput" rows="1" placeholder="Message... (Ctrl+Enter to send)"></textarea>
        <button onclick="sendChatMessage()" title="Send" class="chat-send-btn">➤</button>
      </div>
    </div>
  </div>`;
  
  await renderChatMessages();
  startChatPoll();
  
  // Auto-resize textarea
  const input = document.getElementById('chatInput');
  input.addEventListener('input', () => { input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,120)+'px'; });
  input.addEventListener('keydown', e => { if (e.key==='Enter' && e.ctrlKey) { e.preventDefault(); sendChatMessage(); } });
}

async function renderChatMessages() {
  const msgs = await api('/api/chat?limit=200');
  chatLastCount = msgs.length;
  const el = document.getElementById('chatMessages');
  if (!el) return;
  const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  el.innerHTML = '';
  let lastDate = '', lastFrom = '';
  
  msgs.forEach(m => {
    const from = m.from || 'kira';
    const isOut = from === 'otto';
    
    // Date separator
    if (m.ts) {
      const d = new Date(m.ts).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      if (d !== lastDate) { lastDate = d; el.innerHTML += `<div class="chat-date-sep"><span>${d}</span></div>`; }
    }
    
    const showAvatar = from !== lastFrom;
    const spacer = (showAvatar && lastFrom) ? '<div style="height:14px"></div>' : '';
    el.innerHTML += spacer;
    lastFrom = from;
    
    let rendered;
    if (chatRawMode) {
      rendered = `<pre style="margin:0;white-space:pre-wrap;font-size:.8rem;color:var(--text-secondary)">${escHtml(m.content)}</pre>`;
    } else if (m.type === 'html' || m.type === 'svg') {
      rendered = m.content;
    } else if (typeof marked !== 'undefined' && marked.parse) {
      // Parse all text/markdown through marked for rich rendering
      try {
        rendered = marked.parse(m.content || '', { breaks: true, gfm: true });
      } catch(e) {
        rendered = simpleMd(m.content);
      }
    } else {
      rendered = simpleMd(m.content);
    }
    
    const time = m.ts ? new Date(m.ts).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '';
    const badge = (m.type && m.type !== 'text') ? `<span class="chat-msg-type">${m.type}</span>` : '';
    
    const avatarHtml = showAvatar
      ? `<div class="chat-avatar ${isOut?'chat-avatar-otto':'chat-avatar-kira'}">${isOut?'O':'K'}</div>`
      : `<div style="width:32px;flex-shrink:0"></div>`;
    const senderHtml = showAvatar ? `<div class="chat-msg-sender">${escHtml(from)}</div>` : '';
    
    // Seamless layout: avatar | sender+time header, content below
    const headerHtml = showAvatar
      ? `<div class="chat-msg-header">${senderHtml}<span class="chat-msg-meta"><span class="chat-msg-time">${time}</span>${badge}</span></div>`
      : '';
    el.innerHTML += `<div class="chat-msg-row ${isOut?'out':'in'}">${avatarHtml}<div class="chat-msg-bubble">${headerHtml}<div class="chat-msg-content">${rendered}</div></div></div>`;
  });
  
  if (wasAtBottom || chatLastCount <= msgs.length) el.scrollTop = el.scrollHeight;
}

function startChatPoll() {
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = setInterval(async () => {
    if (currentPage !== 'chat') { clearInterval(chatPollTimer); chatPollTimer = null; return; }
    try {
      const msgs = await api('/api/chat');
      if (msgs.length !== chatLastCount) { chatLastCount = msgs.length; await renderChatMessages(); }
    } catch {}
  }, 1000);
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const content = input.value.trim();
  if (!content) return;
  input.value = ''; input.style.height = 'auto';
  
  try {
    // Send to Telegram via chat-sync-daemon
    await fetch('http://' + location.hostname + ':3848/send', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ content })
    });
  } catch {
    // Fallback: post directly to chat API
    await apiPost('/api/chat', { from: 'otto', type: 'text', content });
  }
  await renderChatMessages();
}

// Init — restore last page
navigate(currentPage);

// Uptime ticker
setInterval(async () => {
  try {
    const data = await api('/api/overview');
    const el = document.getElementById('uptime');
    if (el && data.uptime) {
      const h = Math.floor(data.uptime/3600), m = Math.floor((data.uptime%3600)/60);
      el.textContent = `${h}h ${m}m up`;
    }
  } catch {}
}, 30000);
