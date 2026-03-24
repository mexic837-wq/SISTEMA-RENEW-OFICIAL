/* ============================================================
   RENEW SOLAR – app.js
   SPA Router + Auth State
   ============================================================ */
import { renderLogin }    from './screens/login.js';
import { renderHub }       from './screens/hub.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderNewClient }  from './screens/newClient.js';
import { renderDetail }     from './screens/projectDetail.js';

// ── Auth State ──────────────────────────────────────────────
export function getCurrentUser() {
  const raw = localStorage.getItem('rs_user');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem('rs_user');
  navigate('login');
  import('./components/toast.js').then(m => m.showToast('Sesión cerrada correctamente.', 'info'));
}

// ── Router ──────────────────────────────────────────────────
const SCREENS = ['login', 'hub', 'dashboard', 'new-client', 'detail'];

export function navigate(screen, param = null) {
  // Auth guard
  if (screen !== 'login' && !getCurrentUser()) {
    navigate('login');
    return;
  }

  // Hide all screens
  SCREENS.forEach(id => {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.remove('active');
  });

  // Show target screen
  const target = document.getElementById(`screen-${screen}`);
  if (!target) return;
  target.classList.add('active');

  // Render screen content
  switch (screen) {
    case 'login':       renderLogin();              break;
    case 'hub':         renderHub();                break;
    case 'dashboard':   renderDashboard();          break;
    case 'new-client':  renderNewClient();          break;
    case 'detail':      renderDetail(param);        break;
  }

  // Update hash (for browser history / deep linking)
  const hash = param ? `#${screen}/${param}` : `#${screen}`;
  if (window.location.hash !== hash) {
    window.history.pushState({ screen, param }, '', hash);
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Toggle Bottom Nav
  const bNav = document.getElementById('bottom-nav');
  if (bNav) {
    if (['dashboard', 'new-client', 'detail'].includes(screen)) {
      bNav.style.display = 'flex';
      document.body.style.paddingBottom = '75px'; // clear space
    } else {
      bNav.style.display = 'none';
      document.body.style.paddingBottom = '0px';
    }
  }
}

// ── Hash-based navigation (back button support) ─────────────
function handleHashChange() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) {
    const user = getCurrentUser();
    navigate(user ? 'dashboard' : 'login');
    return;
  }

  const parts = hash.split('/');
  const screen = parts[0];
  const param  = parts[1] || null;

  if (SCREENS.includes(screen)) {
    // Auth guard
    if (screen !== 'login' && !getCurrentUser()) {
      navigate('login');
      return;
    }
    // Render without pushing to history again
    SCREENS.forEach(id => {
      const el = document.getElementById(`screen-${id}`);
      if (el) el.classList.remove('active');
    });
    const target = document.getElementById(`screen-${screen}`);
    if (target) target.classList.add('active');

    switch (screen) {
      case 'login':      renderLogin();           break;
      case 'hub':        renderHub();             break;
      case 'dashboard':  renderDashboard();       break;
      case 'new-client': renderNewClient();       break;
      case 'detail':     renderDetail(param);     break;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Toggle Bottom Nav
    const bNav = document.getElementById('bottom-nav');
    if (bNav) {
      if (['dashboard', 'new-client', 'detail'].includes(screen)) {
        bNav.style.display = 'flex';
        document.body.style.paddingBottom = '75px';
      } else {
        bNav.style.display = 'none';
        document.body.style.paddingBottom = '0px';
      }
    }
  }
}

window.addEventListener('popstate', handleHashChange);
window.addEventListener('hashchange', handleHashChange);

// ── Bootstrap ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  const hash = window.location.hash.replace('#', '');

  // We removed the forced Admin redirect from here to allow switching views.
  // It is now only handled during the actual Login process.


  if (hash && SCREENS.includes(hash.split('/')[0])) {
    handleHashChange();
  } else {
    // Check if user needs hub selection
    if (user && user.unidades && user.unidades.length > 1 && !localStorage.getItem('active_unit')) {
      navigate('hub');
    } else {
      navigate(user ? 'dashboard' : 'login');
    }
  }

  // Set up Mobile Drawer listeners
  const btnOpenDrawer = document.getElementById('btn-open-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('mobile-drawer');
  const btnLogout = document.getElementById('drawer-logout-btn');
  const dynamicItems = document.getElementById('drawer-dynamic-items');

  if (btnOpenDrawer && drawer && overlay) {
    btnOpenDrawer.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Clear and Re-populate dynamic items based on current role
      const user = getCurrentUser();
      if (dynamicItems && user) {
        dynamicItems.innerHTML = '';
        const adminRoles = ['Admin', 'Administrador', 'Desarrollador', 'CEO'];
        if (adminRoles.includes(user.rol)) {
          const adminBtn = document.createElement('button');
          adminBtn.className = 'btn btn-ghost';
          adminBtn.style.cssText = 'justify-content:flex-start; font-weight:600; color:var(--text-primary); padding:14px; background:var(--surface-alt); border-radius:12px; transition: 0.3s;';
          adminBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:12px; color:var(--warning)"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
            Entrar a Renew OS (Admin)
          `;
          adminBtn.addEventListener('click', () => { window.location.href = 'admin.html'; });
          dynamicItems.appendChild(adminBtn);
        }
      }

      drawer.classList.remove('drawer-hidden');
      drawer.classList.add('drawer-open');
      overlay.classList.remove('drawer-overlay-hidden');
      overlay.classList.add('drawer-overlay-open');
    });

    const closeDrawer = () => {
      drawer.classList.remove('drawer-open');
      drawer.classList.add('drawer-hidden');
      overlay.classList.remove('drawer-overlay-open');
      overlay.classList.add('drawer-overlay-hidden');
    };

    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
    
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        closeDrawer();
        logout();
      });
    }
  }
});

