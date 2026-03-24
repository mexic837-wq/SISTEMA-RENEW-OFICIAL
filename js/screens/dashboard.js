/* ============================================================
   RENEW SOLAR – screens/dashboard.js
   ============================================================ */
import { getDealsByUser, STAGE_CONFIG, formatDate } from '../api.js';
import { showToast } from '../components/toast.js';
import { navigate, getCurrentUser, logout } from '../app.js';

export async function renderDashboard() {
  const user = getCurrentUser();
  const screen = document.getElementById('screen-dashboard');
  const activeUnit = localStorage.getItem('active_unit') || 'Renew Solar';

  // ── Skeleton while loading ───────────────────────────────
  screen.innerHTML = `
    <div class="dash-header">
      <div class="dash-header-top">
        <div class="dash-greeting">
          <div class="greeting-time">${getGreeting()}</div>
          <h1>Hola, ${user.nombre} ${user.apellido} 👋</h1>
        </div>
        <button class="avatar-btn" id="avatar-btn" aria-label="Perfil">${user.initials}</button>
      </div>
      <div class="dash-stats" id="dash-stats">
        <div class="stat-chip"><div class="stat-num skeleton" style="width:30px;height:24px;border-radius:4px"></div><div class="stat-label">Total</div></div>
        <div class="stat-chip"><div class="stat-num skeleton" style="width:30px;height:24px;border-radius:4px"></div><div class="stat-label">En Proceso</div></div>
        <div class="stat-chip"><div class="stat-num skeleton" style="width:30px;height:24px;border-radius:4px"></div><div class="stat-label">Completados</div></div>
      </div>
    </div>

    <div class="section-header">
      <h2>Mis Proyectos <span style="color:var(--primary); font-size:0.85rem">(${activeUnit.replace('Renew ', '')})</span></h2>
      <span id="deals-count">Cargando...</span>
    </div>

    <div class="deals-list" id="deals-list">
      ${[1,2,3].map(() => `<div class="skeleton-card skeleton"></div>`).join('')}
    </div>

    <button class="fab" id="fab-new" aria-label="Nuevo proyecto">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  `;

  // Avatar menu
  document.getElementById('avatar-btn').addEventListener('click', showProfileModal);
  document.getElementById('fab-new').addEventListener('click', () => navigate('new-client'));

  // ── Load Deals ───────────────────────────────────────────
  try {
    const deals = await getDealsByUser(user.id, activeUnit);
    renderDeals(deals, user, screen);
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('deals-list').innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Error al cargar proyectos</h3>
        <p>${err.message}</p>
      </div>`;
  }
}

function renderDeals(deals, user, screen) {
  const statsEl = document.getElementById('dash-stats');
  const listEl  = document.getElementById('deals-list');
  const countEl = document.getElementById('deals-count');

  // Stats
  const enProceso  = deals.filter(d => d.etapa !== 'Completado').length;
  const completado = deals.filter(d => d.etapa === 'Completado').length;

  statsEl.innerHTML = `
    <div class="stat-chip">
      <div class="stat-num">${deals.length}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-chip">
      <div class="stat-num">${enProceso}</div>
      <div class="stat-label">En Proceso</div>
    </div>
    <div class="stat-chip">
      <div class="stat-num">${completado}</div>
      <div class="stat-label">Completados</div>
    </div>
  `;

  countEl.textContent = `${deals.length} proyecto${deals.length !== 1 ? 's' : ''}`;

  if (!deals.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <h3>Sin proyectos aún</h3>
        <p>Toca el botón <strong>+</strong> para registrar tu primer cliente.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = deals.map(deal => {
    const cfg = STAGE_CONFIG[deal.etapa] || { label: deal.etapa, badge: 'badge-gray' };
    const accentMap = {
      'badge-blue': '#3b82f6', 'badge-purple': '#8b5cf6',
      'badge-green': '#059669', 'badge-teal': '#0d9488',
      'badge-orange': '#f59e0b', 'badge-gray': '#94a3b8',
      'badge-yellow': '#d97706', 'badge-red': '#ef4444',
    };
    const accent = accentMap[cfg.badge] || 'var(--primary)';
    
    // Calculate progress percentage
    const percentage = deal.total_fases > 0 
      ? Math.round((deal.fase_orden / deal.total_fases) * 100) 
      : 0;

    return `
      <div class="deal-card" style="--card-accent:${accent}" data-id="${deal.id}">
        <div class="deal-card-top">
          <div class="deal-client-name">${deal.nombre_cliente}</div>
          <span class="badge ${cfg.badge}">${cfg.label}</span>
        </div>
        
        <div class="deal-progress-wrap">
          <div class="deal-progress-info">
            <span>Progreso</span>
            <span class="deal-progress-percentage">${percentage}%</span>
          </div>
          <div class="deal-progress-bg">
            <div class="deal-progress-bar" style="width:${percentage}%; background:${accent}"></div>
          </div>
        </div>

        <div class="deal-card-bottom">
          <div class="deal-date">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${formatDate(deal.fecha)}
          </div>
          <svg class="deal-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </div>`;
  }).join('');

  // Click handlers
  listEl.querySelectorAll('.deal-card').forEach(card => {
    card.addEventListener('click', () => navigate('detail', card.dataset.id));
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días ☀️';
  if (h < 18) return 'Buenas tardes 🌤️';
  return 'Buenas noches 🌙';
}

function showProfileModal() {
  const user = getCurrentUser();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.position = 'absolute'; // Fill the #app relative container
  overlay.style.inset = '0';
  overlay.style.zIndex = '1000';
  
  // Format authorized units visually
  const allUnits = [
    { name: 'Renew Solar', color: 'var(--primary)', icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>` },
    { name: 'Renew Water', color: '#0284c7', icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>` },
    { name: 'Renew Home',  color: '#6366f1', icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` }
  ];

  const unitsHtml = allUnits.map(u => {
    const hasUnit = user.unidades && user.unidades.includes(u.name);
    return `
      <div 
        ${hasUnit ? `class="unit-switch-btn" data-unit="${u.name}" style="cursor:pointer;"` : ''}
        style="display:flex; flex-direction:column; align-items:center; transition:var(--transition); ${hasUnit ? '' : 'opacity:0.3; filter:grayscale(1)'}">
        <div style="width:48px; height:48px; border-radius:12px; background:${hasUnit ? u.color + '15' : 'var(--border)'}; color:${hasUnit ? u.color : 'var(--text-muted)'}; display:flex; align-items:center; justify-content:center; margin-bottom:6px">
          ${u.icon}
        </div>
        <span style="font-size:0.7rem; font-weight:700; color:${hasUnit ? 'var(--text-primary)' : 'var(--text-muted)'}">${u.name.replace('Renew ', '')}</span>
      </div>
    `;
  }).join('');

  const fullName = `${user.nombre} ${user.apellido}`;
  const rol = user.rol || 'Vendedor';
  const roleColor = rol.toLowerCase() === 'admin' ? 'badge-red' : 'badge-green';

  overlay.innerHTML = `
    <div class="modal-sheet" style="padding: 32px 24px 40px; text-align:center; width:100%; border-radius: 24px 24px 0 0; position:absolute; bottom:0; left:0;">

      <div class="modal-handle"></div>
      
      <!-- Center Profile Image -->
      <div class="avatar-btn" style="width:88px; height:88px; font-size:2.2rem; cursor:default; margin: 0 auto 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.1)">
        ${user.initials}
      </div>
      
      <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); margin-bottom:6px">${fullName}</h2>
      <span class="badge ${roleColor}" style="padding:4px 14px; font-size:0.75rem">${rol}</span>
      
      <div class="divider" style="margin:24px 0"></div>
      
      <!-- Info Fields -->
      <div style="text-align:left; display:flex; flex-direction:column; gap:12px; margin-bottom:24px">
        <div class="field-group" style="margin-bottom:0">
          <label style="color:var(--text-muted); font-size:0.75rem; margin-bottom:6px">Email Corporativo</label>
          <div class="input-wrap no-icon">
            <input type="email" value="${user.email}" readonly style="background:var(--surface-alt); color:var(--text-primary); border-color:transparent; font-weight:500" />
          </div>
        </div>
        <div class="field-group" style="margin-bottom:0">
          <label style="color:var(--text-muted); font-size:0.75rem; margin-bottom:6px">Teléfono Laboral</label>
          <div class="input-wrap no-icon">
            <input type="tel" value="${user.telefono || 'No registrado'}" readonly style="background:var(--surface-alt); color:var(--text-primary); border-color:transparent; font-weight:500" />
          </div>
        </div>
      </div>
      
      <!-- Acceso a Ecosistemas -->
      <div style="text-align:left; margin-bottom:32px">
        <label style="font-size:.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:16px">Ecosistemas Autorizados</label>
        <div style="display:flex; justify-content:space-around">
          ${unitsHtml}
        </div>
      </div>
      
      </div>
      

      <!-- Quick Stats -->
      <div style="text-align:left; margin-top:24px;">
        <label style="font-size:.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:12px">Estadísticas Rápidas del Mes</label>
        <div style="display:flex; gap:12px">
          <div style="flex:1; background:var(--surface-alt); padding:16px; border-radius:12px; border:1px solid var(--border)">
            <p style="font-size:0.7rem; color:var(--text-secondary); margin-bottom:4px">Tasa de Cierre</p>
            <p style="font-size:1.2rem; font-weight:800; color:var(--text-primary); margin:0">24%</p>
            <span style="font-size:0.6rem; color:var(--primary); font-weight:600">↑ 2% respecto al mes pasado</span>
          </div>
          <div style="flex:1; background:var(--surface-alt); padding:16px; border-radius:12px; border:1px solid var(--border)">
            <p style="font-size:0.7rem; color:var(--text-secondary); margin-bottom:4px">Comisiones Est.</p>
            <p style="font-size:1.2rem; font-weight:800; color:var(--info); margin:0">$4,500</p>
            <span style="font-size:0.6rem; color:var(--text-muted); font-weight:600">Proyectadas</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const app = document.getElementById('app');
  if (app) app.appendChild(overlay);
  else document.body.appendChild(overlay);
  
  // Close modal on outside click
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Switch Unit Handlers
  overlay.querySelectorAll('.unit-switch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const unit = e.currentTarget.dataset.unit;
      localStorage.setItem('active_unit', unit);
      overlay.remove();
      navigate('dashboard'); // Re-render seamlessly
    });
  });
}
