// =============================================
//  CRECER — Planificador de Desarrollo Personal
//  app.js — Lógica principal
// =============================================

// ---- CONFIGURACIÓN ----
const HOURS = [];
for (let h = 5; h <= 22; h++) {
  HOURS.push(`${String(h).padStart(2, '0')}:00`);
}

const STATUSES = [
  { key: 'none',     label: '—',           cls: 'sb-none',     pill: 'active-none' },
  { key: 'done',     label: '✅ Completado', cls: 'sb-done',     pill: 'active-done' },
  { key: 'progress', label: '⏳ En progreso', cls: 'sb-progress', pill: 'active-progress' },
  { key: 'skip',     label: '❌ Omitido',    cls: 'sb-skip',     pill: 'active-skip' },
  { key: 'reprog',   label: '🔄 Reprogramado', cls: 'sb-reprog', pill: 'active-reprog' },
];

const EMOJIS = ['⭐','📚','💪','🧘','🚿','📅','🎯','📝','🏃','💤','🎨','🍎','💊','🧠','🌿','🏋️','☀️','🚴','🧩','✍️'];
let emojiIdx = 0;

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEK_DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ---- ESTADO ----
let scheduleData = {};
let habitsData = { habits: [], log: {} };
let currentDate = todayStr();
let currentWeekStart = getWeekStart(new Date());
let modalHour = null;
let modalCurrentStatus = 'none';
let sidebarCollapsed = false;

// ---- UTILIDADES ----
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function dateStr(d) {
  return d.toISOString().split('T')[0];
}

function parseDate(s) {
  return new Date(s + 'T12:00:00');
}

function getWeekStart(d) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  return dateStr(dt);
}

function getWeekDates(weekStartStr) {
  const start = parseDate(weekStartStr);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(dateStr(d));
  }
  return dates;
}

function formatDate(dateStr) {
  const d = parseDate(dateStr);
  return `${WEEK_DAYS_FULL[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShort(dateStr) {
  const d = parseDate(dateStr);
  return `${WEEK_DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function getHourNum(h) {
  return parseInt(h.split(':')[0]);
}

function energyEmoji(val) {
  const e = ['', '😴', '😐', '⚡', '⚡⚡', '⚡⚡⚡'];
  return e[parseInt(val)] || '⚡';
}

// ---- ALMACENAMIENTO ----
function save() {
  try {
    localStorage.setItem('crecer_schedule', JSON.stringify(scheduleData));
    localStorage.setItem('crecer_habits', JSON.stringify(habitsData));
    showSaveIndicator();
  } catch (e) { console.warn('Error guardando:', e); }
}

function load() {
  try {
    const s = localStorage.getItem('crecer_schedule');
    if (s) scheduleData = JSON.parse(s);
  } catch (e) { scheduleData = {}; }
  try {
    const h = localStorage.getItem('crecer_habits');
    if (h) habitsData = JSON.parse(h);
    if (!habitsData.habits) habitsData.habits = [];
    if (!habitsData.log) habitsData.log = {};
  } catch (e) { habitsData = { habits: [], log: {} }; }
}

function showSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ---- SIDEBAR ----
function initSidebar() {
  const btn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  btn.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
  });
}

// ---- TABS ----
function initTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
      updatePageTitle(tab);
      if (tab === 'habitos') renderHabitsTab();
      if (tab === 'resumen') renderResumen();
      if (tab === 'historial') renderHistorial();
    });
  });
}

function updatePageTitle(tab) {
  const titles = {
    horario: ['Mi Horario', 'Planifica tu día hora a hora'],
    habitos: ['Mis Hábitos', 'Construye disciplina día a día'],
    resumen: ['Resumen', 'Tu progreso de esta semana'],
    historial: ['Historial', 'Registro completo de actividades'],
  };
  document.getElementById('pageTitle').textContent = titles[tab][0];
  document.getElementById('breadcrumb').textContent = titles[tab][1];
}

// ---- RELOJ ----
function initClock() {
  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('currentTime').textContent = `${hh}:${mm}:${ss}`;
  }
  tick();
  setInterval(tick, 1000);
}

// =====================
//  HORARIO
// =====================
function initSchedule() {
  document.getElementById('dateInput').value = currentDate;
  updateDateLabel();
  renderSchedule();

  document.getElementById('prevDay').addEventListener('click', () => changeDay(-1));
  document.getElementById('nextDay').addEventListener('click', () => changeDay(1));
  document.getElementById('todayBtn').addEventListener('click', () => {
    currentDate = todayStr();
    document.getElementById('dateInput').value = currentDate;
    updateDateLabel();
    renderSchedule();
  });
  document.getElementById('dateInput').addEventListener('change', (e) => {
    currentDate = e.target.value;
    updateDateLabel();
    renderSchedule();
  });
}

function changeDay(delta) {
  const d = parseDate(currentDate);
  d.setDate(d.getDate() + delta);
  currentDate = dateStr(d);
  document.getElementById('dateInput').value = currentDate;
  updateDateLabel();
  renderSchedule();
}

function updateDateLabel() {
  const d = parseDate(currentDate);
  const today = todayStr();
  let label = `${WEEK_DAYS_FULL[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
  if (currentDate === today) label += ' — Hoy';
  document.getElementById('dateLabel').textContent = label;
}

function renderSchedule() {
  const grid = document.getElementById('scheduleGrid');
  grid.innerHTML = '';
  const dayData = scheduleData[currentDate] || {};
  const nowH = new Date().getHours();
  const today = todayStr();

  let planned = 0, done = 0;

  HOURS.forEach(hour => {
    const hNum = getHourNum(hour);
    const data = dayData[hour] || { activity: '', status: 'none', notes: '', energy: 3 };
    const isCurrent = (currentDate === today && hNum === nowH);
    const hasActivity = (data.activity || '').trim() !== '';
    if (hasActivity) planned++;
    if (data.status === 'done') done++;

    const st = STATUSES.find(s => s.key === data.status) || STATUSES[0];
    const isPM = hNum >= 12;
    const displayH = hNum > 12 ? hNum - 12 : (hNum === 0 ? 12 : hNum);
    const ampm = isPM ? 'PM' : 'AM';

    const block = document.createElement('div');
    block.className = `hour-block${hasActivity ? ' has-activity' : ''}${isCurrent ? ' current-hour' : ''}${data.status !== 'none' ? ' status-' + data.status : ''}`;
    block.dataset.hour = hour;

    block.innerHTML = `
      <div class="hour-label">
        <span class="hour-time">${String(displayH).padStart(2,'0')}:00</span>
        <span class="hour-ampm">${ampm}</span>
        ${isCurrent ? '<span class="hour-dot"></span>' : ''}
      </div>
      <div class="hour-content">
        ${hasActivity
          ? `<div class="hour-activity">${escapeHTML(data.activity)}</div>
             ${data.notes ? `<div class="hour-notes">${escapeHTML(data.notes)}</div>` : ''}
             ${data.energy > 1 ? `<div class="hour-energy">${energyEmoji(data.energy)}</div>` : ''}`
          : `<div class="hour-empty">Toca para agregar actividad…</div>`
        }
      </div>
      <div class="hour-status">
        ${hasActivity && data.status !== 'none'
          ? `<span class="status-badge ${st.cls}">${st.label}</span>`
          : `<span class="sb-none">${hasActivity ? 'Sin estado' : ''}</span>`
        }
      </div>
    `;

    block.addEventListener('click', () => openModal(hour, dayData[hour] || {}));
    grid.appendChild(block);
  });

  // Stats
  document.getElementById('statPlanned').textContent = planned;
  document.getElementById('statDone').textContent = done;
  const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
  document.getElementById('ringPct').textContent = pct + '%';
  const circ = 94.2;
  document.getElementById('ringArc').setAttribute('stroke-dasharray', `${(pct / 100) * circ} ${circ}`);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =====================
//  MODAL
// =====================
function initModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modalSave').addEventListener('click', saveModal);
  document.getElementById('modalEnergy').addEventListener('input', (e) => {
    document.getElementById('energyLabel').textContent = energyEmoji(e.target.value);
  });

  // Status pills
  const pillsContainer = document.getElementById('statusPills');
  STATUSES.forEach(st => {
    const pill = document.createElement('button');
    pill.className = 'status-pill';
    pill.dataset.key = st.key;
    pill.textContent = st.label;
    pill.addEventListener('click', () => {
      modalCurrentStatus = st.key;
      document.querySelectorAll('.status-pill').forEach(p => {
        p.className = 'status-pill';
        if (p.dataset.key === st.key) p.classList.add(st.pill);
      });
    });
    pillsContainer.appendChild(pill);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.ctrlKey) saveModal();
  });
}

function openModal(hour, data) {
  modalHour = hour;
  modalCurrentStatus = data.status || 'none';

  const hNum = getHourNum(hour);
  const isPM = hNum >= 12;
  const displayH = hNum > 12 ? hNum - 12 : (hNum === 0 ? 12 : hNum);
  document.getElementById('modalHour').textContent = `${String(displayH).padStart(2,'0')}:00 ${isPM ? 'PM' : 'AM'}`;
  document.getElementById('modalDate').textContent = formatDate(currentDate);
  document.getElementById('modalActivity').value = data.activity || '';
  document.getElementById('modalNotes').value = data.notes || '';
  document.getElementById('modalEnergy').value = data.energy || 3;
  document.getElementById('energyLabel').textContent = energyEmoji(data.energy || 3);

  // Reset pills
  document.querySelectorAll('.status-pill').forEach(p => {
    p.className = 'status-pill';
    if (p.dataset.key === modalCurrentStatus) {
      const st = STATUSES.find(s => s.key === modalCurrentStatus);
      if (st) p.classList.add(st.pill);
    }
  });

  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('modalActivity').focus(), 150);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  modalHour = null;
}

function saveModal() {
  if (!modalHour) return;
  const activity = document.getElementById('modalActivity').value.trim();
  const notes = document.getElementById('modalNotes').value.trim();
  const energy = parseInt(document.getElementById('modalEnergy').value);

  if (!scheduleData[currentDate]) scheduleData[currentDate] = {};

  if (!activity) {
    delete scheduleData[currentDate][modalHour];
  } else {
    scheduleData[currentDate][modalHour] = {
      activity,
      status: modalCurrentStatus,
      notes,
      energy,
    };
  }

  save();
  closeModal();
  renderSchedule();
}

// =====================
//  HÁBITOS
// =====================
function initHabits() {
  document.getElementById('addHabitBtn').addEventListener('click', addHabit);
  document.getElementById('habitNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addHabit();
  });
  document.getElementById('emojiBtn').addEventListener('click', () => {
    emojiIdx = (emojiIdx + 1) % EMOJIS.length;
    document.getElementById('emojiBtn').textContent = EMOJIS[emojiIdx];
  });
  document.getElementById('prevWeek').addEventListener('click', () => {
    const d = parseDate(currentWeekStart);
    d.setDate(d.getDate() - 7);
    currentWeekStart = dateStr(d);
    renderHabitsTab();
  });
  document.getElementById('nextWeek').addEventListener('click', () => {
    const d = parseDate(currentWeekStart);
    d.setDate(d.getDate() + 7);
    currentWeekStart = dateStr(d);
    renderHabitsTab();
  });
  document.getElementById('thisWeekBtn').addEventListener('click', () => {
    currentWeekStart = getWeekStart(new Date());
    renderHabitsTab();
  });
}

function addHabit() {
  const name = document.getElementById('habitNameInput').value.trim();
  if (!name) return;
  const emoji = EMOJIS[emojiIdx];
  const color = document.getElementById('habitColorSelect').value;
  habitsData.habits.push({ id: Date.now(), name, emoji, color });
  document.getElementById('habitNameInput').value = '';
  save();
  renderHabitsTab();
}

function deleteHabit(id) {
  if (!confirm('¿Eliminar este hábito? Se perderá todo su historial.')) return;
  habitsData.habits = habitsData.habits.filter(h => h.id !== id);
  // Clean log
  Object.keys(habitsData.log).forEach(d => {
    delete habitsData.log[d][id];
  });
  save();
  renderHabitsTab();
}

function toggleHabit(habitId, dateStr) {
  if (!habitsData.log[dateStr]) habitsData.log[dateStr] = {};
  habitsData.log[dateStr][habitId] = !habitsData.log[dateStr][habitId];
  save();
  renderHabitsTab();
}

function calcStreak(hid) {
  let streak = 0;
  const today = todayStr();
  let d = new Date(today + 'T12:00:00');
  while (true) {
    const ds = dateStr(d);
    if (habitsData.log[ds]?.[hid]) { streak++; d.setDate(d.getDate() - 1); }
    else break;
    if (streak > 3650) break;
  }
  return streak;
}

function renderHabitsTab() {
  const dates = getWeekDates(currentWeekStart);

  // Week range label
  const startD = parseDate(dates[0]);
  const endD = parseDate(dates[6]);
  document.getElementById('weekRange').textContent =
    `${startD.getDate()} ${MONTHS_ES[startD.getMonth()]} — ${endD.getDate()} ${MONTHS_ES[endD.getMonth()]} ${endD.getFullYear()}`;

  // Head
  const head = document.getElementById('habitsHead');
  head.innerHTML = `<tr>
    <th>Hábito</th>
    ${dates.map(d => {
      const dt = parseDate(d);
      const isToday = d === todayStr();
      return `<th style="${isToday ? 'color:var(--accent2);' : ''}">${WEEK_DAYS[dt.getDay()]}<br><span style="font-size:9px;font-family:var(--mono)">${dt.getDate()}</span></th>`;
    }).join('')}
    <th>Semana</th>
    <th>Racha</th>
  </tr>`;

  // Body
  const body = document.getElementById('habitsBody');
  if (habitsData.habits.length === 0) {
    body.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text3);font-style:italic;">Agrega tu primer hábito arriba ↑</td></tr>`;
    return;
  }

  body.innerHTML = habitsData.habits.map(h => {
    const weekDone = dates.filter(d => habitsData.log[d]?.[h.id]).length;
    const weekPct = Math.round((weekDone / 7) * 100);
    const streak = calcStreak(h.id);

    const checks = dates.map(d => {
      const done = habitsData.log[d]?.[h.id];
      const isFuture = d > todayStr();
      return `<td>
        <div class="day-check${done ? ' done-' + h.color : ''}"
          onclick="toggleHabit(${h.id}, '${d}')"
          title="${done ? 'Completado' : (isFuture ? 'Día futuro' : 'Sin completar')}">
          ${done ? '<i class="ti ti-check" style="font-size:14px"></i>' : ''}
        </div>
      </td>`;
    }).join('');

    return `<tr>
      <td>
        <div class="habit-row-name">
          <span class="habit-emoji">${h.emoji}</span>
          <span class="habit-title">${escapeHTML(h.name)}</span>
          <button class="habit-delete" onclick="deleteHabit(${h.id})" title="Eliminar">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </td>
      ${checks}
      <td><span class="habit-week-pct">${weekPct}%</span></td>
      <td><span class="habit-streak">🔥 ${streak}</span></td>
    </tr>`;
  }).join('');
}

// =====================
//  RESUMEN
// =====================
function renderResumen() {
  const today = todayStr();
  const weekStart = getWeekStart(new Date());
  const weekDates = getWeekDates(weekStart);

  // Estadísticas semana
  let totalPlanned = 0, totalDone = 0;
  weekDates.forEach(d => {
    const day = scheduleData[d] || {};
    Object.values(day).forEach(entry => {
      if ((entry.activity || '').trim()) {
        totalPlanned++;
        if (entry.status === 'done') totalDone++;
      }
    });
  });
  const pct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;

  // Big ring
  const circ = 314;
  document.getElementById('bigRingArc').setAttribute('stroke-dasharray', `${(pct / 100) * circ} ${circ}`);
  document.getElementById('weekPct').textContent = pct + '%';

  // Racha global (días con al menos 1 actividad completada)
  let globalStreak = 0;
  let d = new Date(today + 'T12:00:00');
  for (let i = 0; i < 365; i++) {
    const ds = dateStr(d);
    const day = scheduleData[ds] || {};
    const hasDone = Object.values(day).some(e => e.status === 'done');
    if (hasDone) globalStreak++;
    else break;
    d.setDate(d.getDate() - 1);
  }

  // Habit stats this week
  const totalHabitSlots = habitsData.habits.length * 7;
  const doneHabits = habitsData.habits.reduce((sum, h) =>
    sum + weekDates.filter(d => habitsData.log[d]?.[h.id]).length, 0);
  const habitPct = totalHabitSlots > 0 ? Math.round((doneHabits / totalHabitSlots) * 100) : 0;

  document.getElementById('sb-total').innerHTML = `<div class="s-icon">📋</div><div class="s-label">Actividades planificadas</div><div class="s-value">${totalPlanned}</div><div class="s-sub">esta semana</div>`;
  document.getElementById('sb-done').innerHTML = `<div class="s-icon">✅</div><div class="s-label">Completadas</div><div class="s-value">${totalDone}</div><div class="s-sub">esta semana</div>`;
  document.getElementById('sb-habits').innerHTML = `<div class="s-icon">🎯</div><div class="s-label">Hábitos cumplidos</div><div class="s-value">${habitPct}%</div><div class="s-sub">${doneHabits}/${totalHabitSlots} checks</div>`;
  document.getElementById('sb-streak').innerHTML = `<div class="s-icon">🔥</div><div class="s-label">Racha actual</div><div class="s-value">${globalStreak}</div><div class="s-sub">días consecutivos</div>`;

  // Heatmap — últimos 14 días
  const heatmap = document.getElementById('heatmap');
  heatmap.innerHTML = '';
  for (let i = 13; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const ds = dateStr(dt);
    const day = scheduleData[ds] || {};
    const entries = Object.values(day).filter(e => (e.activity || '').trim());
    const doneCount = entries.filter(e => e.status === 'done').length;
    const totalCount = entries.length;
    const ratio = totalCount > 0 ? doneCount / totalCount : 0;
    let level = 0;
    if (totalCount > 0) {
      if (ratio >= 0.8) level = 3;
      else if (ratio >= 0.5) level = 2;
      else level = 1;
    }
    const div = document.createElement('div');
    div.className = 'hm-day';
    div.innerHTML = `
      <div class="hm-cell level-${level}" title="${formatShort(ds)}: ${doneCount}/${totalCount} completadas">
        ${totalCount > 0 ? Math.round(ratio * 100) + '%' : '—'}
      </div>
      <div class="hm-label">${WEEK_DAYS[dt.getDay()]}</div>
    `;
    heatmap.appendChild(div);
  }

  // Hábitos resumen
  const hs = document.getElementById('habitsSummary');
  if (habitsData.habits.length === 0) {
    hs.innerHTML = `<div style="color:var(--text3);font-size:13px;font-style:italic;padding:20px 0;">No hay hábitos registrados todavía.</div>`;
    return;
  }
  hs.innerHTML = habitsData.habits.map(h => {
    const done = weekDates.filter(d => habitsData.log[d]?.[h.id]).length;
    const p = Math.round((done / 7) * 100);
    const streak = calcStreak(h.id);
    return `<div class="hs-row">
      <div class="hs-name"><span>${h.emoji}</span><span>${escapeHTML(h.name)}</span></div>
      <div>
        <div class="hs-bar-wrap"><div class="hs-bar" style="width:${p}%"></div></div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px;">${done}/7 días</div>
      </div>
      <div class="hs-pct">${p}% <span style="font-size:11px;color:var(--amber)">🔥${streak}</span></div>
    </div>`;
  }).join('');
}

// =====================
//  HISTORIAL
// =====================
function initHistorial() {
  const now = new Date();
  document.getElementById('monthPicker').value =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  document.getElementById('monthPicker').addEventListener('change', renderHistorial);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
}

function renderHistorial() {
  const val = document.getElementById('monthPicker').value;
  if (!val) return;
  const [year, month] = val.split('-').map(Number);

  const list = document.getElementById('historialList');
  list.innerHTML = '';

  const daysInMonth = new Date(year, month, 0).getDate();
  let hasData = false;

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayData = scheduleData[ds];
    if (!dayData) continue;

    const entries = Object.entries(dayData)
      .filter(([, v]) => (v.activity || '').trim())
      .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) continue;
    hasData = true;

    const done = entries.filter(([, v]) => v.status === 'done').length;
    const pct = Math.round((done / entries.length) * 100);
    const dt = parseDate(ds);

    const habitsLog = habitsData.log[ds] || {};
    const habitsCount = habitsData.habits.filter(h => habitsLog[h.id]).length;

    const div = document.createElement('div');
    div.className = 'hist-day';

    const statusColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--coral)';

    div.innerHTML = `
      <div class="hist-day-header" onclick="toggleHistDay(this)">
        <div class="hist-date">${WEEK_DAYS[dt.getDay()]} ${dt.getDate()}/${month}/${year}</div>
        <div><div class="hist-bar-wrap"><div class="hist-bar" style="width:${pct}%;background:${statusColor}"></div></div></div>
        <div class="hist-pct" style="color:${statusColor}">${pct}%</div>
        <div class="hist-acts">${entries.length} actividades</div>
        <div class="hist-habits">${habitsCount}/${habitsData.habits.length} hábitos</div>
      </div>
      <div class="hist-entries">
        ${entries.map(([hour, v]) => {
          const st = STATUSES.find(s => s.key === v.status) || STATUSES[0];
          const hNum = getHourNum(hour);
          const isPM = hNum >= 12;
          const dH = hNum > 12 ? hNum - 12 : (hNum === 0 ? 12 : hNum);
          return `<div class="hist-entry">
            <span class="hist-entry-time">${String(dH).padStart(2,'0')}:00 ${isPM?'PM':'AM'}</span>
            <span class="hist-entry-act">${escapeHTML(v.activity)}${v.notes ? ` — <span style="color:var(--text2);font-size:11px">${escapeHTML(v.notes)}</span>` : ''}</span>
            <span class="hist-entry-status"><span class="status-badge ${st.cls}">${st.label}</span></span>
          </div>`;
        }).join('')}
      </div>
    `;

    list.appendChild(div);
  }

  if (!hasData) {
    list.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text3);font-size:14px;font-style:italic;">No hay datos registrados para este mes.</div>`;
  }
}

function toggleHistDay(header) {
  const entries = header.nextElementSibling;
  entries.classList.toggle('open');
}

function exportCSV() {
  const val = document.getElementById('monthPicker').value;
  if (!val) return;
  const [year, month] = val.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const rows = [['Fecha', 'Día', 'Hora', 'Actividad', 'Estado', 'Notas', 'Energía']];

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayData = scheduleData[ds] || {};
    const dt = parseDate(ds);
    Object.entries(dayData).sort(([a],[b])=>a.localeCompare(b)).forEach(([hour, v]) => {
      if (!(v.activity||'').trim()) return;
      const st = STATUSES.find(s => s.key === v.status)?.label || '—';
      rows.push([ds, WEEK_DAYS_FULL[dt.getDay()], hour, v.activity, st, v.notes || '', v.energy || '']);
    });
  }

  // Hábitos
  rows.push([]);
  rows.push(['--- HÁBITOS ---']);
  rows.push(['Hábito', ...Array.from({length:daysInMonth},(_,i)=>`${i+1}`)]);
  habitsData.habits.forEach(h => {
    const checks = Array.from({length:daysInMonth}, (_, i) => {
      const d = i + 1;
      const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      return habitsData.log[ds]?.[h.id] ? '✅' : '❌';
    });
    rows.push([`${h.emoji} ${h.name}`, ...checks]);
  });

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crecer_${year}_${String(month).padStart(2,'0')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// =====================
//  AUTOSAVE PERIÓDICO
// =====================
setInterval(() => save(), 60000);

// =====================
//  INIT
// =====================
document.addEventListener('DOMContentLoaded', () => {
  load();
  initSidebar();
  initTabs();
  initClock();
  initSchedule();
  initModal();
  initHabits();
  initHistorial();
  renderHabitsTab();

  // Storage info
  try {
    const bytes = new Blob([localStorage.getItem('crecer_schedule')||'', localStorage.getItem('crecer_habits')||'']).size;
    const kb = (bytes / 1024).toFixed(1);
    document.querySelector('.storage-info span').textContent = `${kb} KB guardados`;
  } catch(e) {}
});