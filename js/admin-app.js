import {
  getAdminPipelines, getAdminFases, getAdminCampos,
  createAdminPipeline, createAdminFase, createAdminCampo, 
  nukeAndResetDB, updateAdminFaseRole,
  deleteAdminPipeline, deleteAdminFase, deleteAdminCampo, reorderAdminCampos,
  getAdminWorkers, saveAdminWorker
} from './api.js';
import { showToast } from './components/toast.js';

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

let state = {
  activeView: 'constructor',
  clients: [],
  pipelines: [],
  fases: [],
  campos: [],
  activePipId: null,
  currentCliFoto: null,
  currentUsrFoto: null
};

async function init() {
  window.adminDeletePipeline = async (id, e) => {
    e.stopPropagation(); e.preventDefault();
    console.log("BORRANDO PIPELINE ID:", id);
    if (confirm('¿ELIMINAR ESTE PIPELINE PERMANENTEMENTE?')) {
      await deleteAdminPipeline(id);
      await loadData();
      renderView();
    }
  };
  window.adminDeleteFase = async (id, e) => {
    e.stopPropagation(); e.preventDefault();
    console.log("BORRANDO FASE ID:", id);
    if (confirm('¿BORRAR ESTA FASE Y TODAS SUS PREGUNTAS?')) {
      await deleteAdminFase(id);
      await loadData();
      renderView();
    }
  };
  window.adminDeleteCampo = async (id, e) => {
    e.stopPropagation(); e.preventDefault();
    console.log("BORRANDO CAMPO ID:", id);
    if (confirm('¿ELIMINAR ESTA PREGUNTA?')) {
      await deleteAdminCampo(id);
      await loadData();
      renderView();
    }
  };

  await loadData();
  cacheElements();
  bindGlobalEvents();

  if (UI.hambBtn && UI.sidebar) {
    UI.hambBtn.addEventListener('click', () => {
      UI.sidebar.classList.toggle('admin-sidebar-collapsed');
      
      // Update scroll left button position
      const sl = document.getElementById('ctrl-scroll-left');
      if (sl) {
        sl.classList.toggle('sidebar-collapsed');
      }
      
      // Trigger resize for scroll arrows
      window.dispatchEvent(new Event('resize'));
    });
  }

  if (UI.btnToggleAuto) {
    UI.btnToggleAuto.addEventListener('click', () => {
      UI.subAuto.classList.toggle('hidden');
      UI.btnToggleAuto.classList.toggle('open');
    });
  }

  await renderView();

  // Test Notification
  window.addNotification('Sistema Iniciado', 'Bienvenido a Renew OS.', 'success');
}

const UI = {};
function cacheElements() {
  UI.canvas = document.getElementById('main-canvas');
  UI.sidebar = document.getElementById('admin-sidebar');
  UI.hambBtn = document.getElementById('admin-hamburger-btn');
  UI.viewTitle = document.getElementById('view-title');
  UI.viewDesc = document.getElementById('view-desc');
  UI.btnReset = document.getElementById('btn-reset-db');
  UI.btnAddGlobal = document.getElementById('btn-global-action');
  
  // Modals & Inputs
  UI.modPip = document.getElementById('modal-nuclear-pip');
  UI.inpPipNom = document.getElementById('inp-pip-nombre');
  UI.inpPipCol = document.getElementById('inp-pip-color');
  UI.inpPipHex = document.getElementById('inp-pip-hex');
  UI.btnSavePip = document.getElementById('btn-save-pipeline');

  UI.modCam = document.getElementById('modal-nuclear-cam');
  UI.lblFaseDest = document.getElementById('lbl-fase-destino');
  UI.inpCamFaseId = document.getElementById('inp-cam-fase-id');
  UI.inpCamEtq = document.getElementById('inp-cam-etiqueta');
  UI.inpCamTipo = document.getElementById('inp-cam-tipo');
  UI.wrpCamOpc = document.getElementById('wrap-opciones');
  UI.inpCamOpc = document.getElementById('inp-cam-opciones');
  UI.btnSaveCam = document.getElementById('btn-save-campo');

  UI.modFas = document.getElementById('modal-nuclear-fas');
  UI.inpFasNom = document.getElementById('inp-fas-nombre');
  UI.btnSaveFas = document.getElementById('btn-save-fase');

  UI.modCli = document.getElementById('modal-nuclear-cli');
  UI.inpCliNom = document.getElementById('inp-cli-nombre');
  UI.inpCliEmail = document.getElementById('inp-cli-email');
  UI.inpCliTel = document.getElementById('inp-cli-tel');
  UI.btnSaveCli = document.getElementById('btn-save-cliente');
  UI.dropCliFoto = document.getElementById('drop-cli-foto');
  UI.inpCliFoto = document.getElementById('inp-cli-foto');
  UI.previewCliFoto = document.getElementById('cli-foto-preview');
  UI.placeholderCliFoto = document.getElementById('cli-foto-placeholder');

  UI.modUsr = document.getElementById('modal-nuclear-usr');
  UI.inpUsrId = document.getElementById('inp-usr-id');
  UI.inpUsrNom = document.getElementById('inp-usr-nombre');
  UI.inpUsrApe = document.getElementById('inp-usr-apellido');
  UI.inpUsrEmail = document.getElementById('inp-usr-email');
  UI.dropUsrFoto = document.getElementById('drop-usr-foto');
  UI.inpUsrFotoFile = document.getElementById('inp-usr-foto-file');
  UI.previewUsrFoto = document.getElementById('preview-usr-foto');
  UI.placeholderUsrFoto = document.getElementById('usr-foto-placeholder');
  UI.inpUsrTel = document.getElementById('inp-usr-tel');
  UI.inpUsrDob = document.getElementById('inp-usr-dob');
  UI.inpUsrPass = document.getElementById('inp-usr-pass');
  UI.inpUsrRol = document.getElementById('inp-usr-rol');
  UI.inpUsrDept = document.getElementById('inp-usr-dept');
  UI.btnSaveUsr = document.getElementById('btn-save-usuario');

  UI.modUsrDetail = document.getElementById('modal-worker-detail');
  UI.btnEditFromDetail = document.getElementById('btn-edit-worker-from-detail');

  UI.modReset = document.getElementById('modal-reset');
  UI.modSuccess = document.getElementById('modal-success');
  UI.msgSuccess = document.getElementById('success-modal-msg');
  UI.btnToggleAuto = document.getElementById('btn-toggle-auto');
  UI.subAuto = document.getElementById('sub-auto');

  // Header Buttons
  UI.btnNotifications = document.getElementById('btn-notifications');
  UI.btnChat = document.getElementById('btn-header-chat');
  UI.btnHeaderSettings = document.getElementById('btn-header-settings');
  UI.settingsDropdown = document.getElementById('settings-dropdown');
  UI.btnMenuEditProfile = document.getElementById('btn-menu-edit-profile');

  // Notifications Panel Elements
  UI.notPanel = document.getElementById('notifications-panel');
  UI.notOverlay = document.getElementById('notifications-overlay');
  UI.notList = document.getElementById('notifications-list');
  UI.notBadge = document.getElementById('notifications-badge');
  UI.btnCloseNot = document.getElementById('btn-close-notifications');

  document.querySelectorAll('.btn-cancel').forEach(btn => 
    btn.addEventListener('click', closeModals)
  );
}

function bindGlobalEvents() {
  // Sidebar Navigation

  // Sidebar Navigation
  document.querySelectorAll('#admin-nav a').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      document.querySelectorAll('#admin-nav a').forEach(l => {
        l.classList.remove('bg-tealAccent/10', 'text-tealAccent', 'border-tealAccent/20');
        l.classList.add('text-gray-500', 'dark:text-gray-400');
        // Fallback for hover state fixes (removing black boxes)
        l.classList.remove('hover:bg-tealAccent/10', 'hover:text-tealAccent', 'dark:hover:text-tealAccent');
      });
      const t = e.currentTarget;
      t.classList.remove('text-gray-500', 'dark:text-gray-400');
      t.classList.add('bg-tealAccent/10', 'text-tealAccent', 'border-tealAccent/20');
      
      state.activeView = t.dataset.view;
      await renderView();
    });
  });

  // ── Global Edit Delegate (Most Robust) ──
  document.addEventListener('click', async (e) => {
    // 1. Edit Button
    const btnEditUsr = e.target.closest('.btn-edit-usuario');
    if (btnEditUsr) {
      const id = btnEditUsr.dataset.id;
      triggerUserEdit(id);
      return;
    }

    // 2. Worker Name Link (Show Detail)
    const nameLink = e.target.closest('.worker-name-link');
    if (nameLink) {
      const id = nameLink.dataset.id;
      await showWorkerDetail(id);
      return;
    }
  });

  async function triggerUserEdit(id, fallbackData = null) {
      console.log("Triggering Edit for User ID:", id);
      let usr;
      
      if (fallbackData) {
          usr = fallbackData;
      } else {
          const workers = await getAdminWorkers();
          usr = workers.find(u => u.id === id);
      }
      
      if (usr) {
        document.getElementById('modal-usr-title').textContent = "Editar Trabajador";
        UI.inpUsrId.value = usr.id;
        UI.inpUsrNom.value = usr.nombre || '';
        UI.inpUsrApe.value = usr.apellido || '';
        UI.inpUsrEmail.value = usr.email || '';
        UI.inpUsrTel.value = usr.telefono || '';
        UI.inpUsrDob.value = usr.dob || '';
        UI.inpUsrPass.value = usr.password || usr.pass || 'renew123';
        UI.inpUsrRol.value = usr.rol || 'Vendedor';
        if(UI.inpUsrDept) UI.inpUsrDept.value = usr.department || '';
        
        state.currentUsrFoto = usr.foto;
        if (usr.foto) {
          UI.previewUsrFoto.style.backgroundImage = `url(${usr.foto})`;
          UI.previewUsrFoto.classList.remove('hidden');
          UI.placeholderUsrFoto.classList.add('hidden');
        } else {
          UI.previewUsrFoto.classList.add('hidden');
          UI.placeholderUsrFoto.classList.remove('hidden');
        }
        
        showModal(UI.modUsr);
      }
  }

  if (UI.btnEditFromDetail) {
    UI.btnEditFromDetail.addEventListener('click', () => {
        const id = UI.btnEditFromDetail.dataset.id;
        console.log("Editing from Detail Gear. ID:", id);
        closeModals();
        setTimeout(() => {
            // Trigger the same logic as the edit button in the list
            const mockEvent = { target: { closest: () => ({ dataset: { id: id } }) } };
            // Since we can't easily trigger the delegate from here, we'll manually call it
            triggerUserEdit(id);
        }, 100);
    });
  }

  // Header Button Listeners
  if (UI.btnNotifications) {
    UI.btnNotifications.addEventListener('click', () => {
      // Show Panel
      UI.notPanel.classList.remove('translate-x-full');
      // Show Overlay with fade
      UI.notOverlay.classList.remove('hidden');
      setTimeout(() => UI.notOverlay.classList.add('opacity-100'), 10);
      // Hide badge
      UI.notBadge.classList.add('hidden');
    });
  }

  const closeNotifications = () => {
    UI.notPanel.classList.add('translate-x-full');
    UI.notOverlay.classList.remove('opacity-100');
    setTimeout(() => UI.notOverlay.classList.add('hidden'), 300);
  };

  if (UI.btnCloseNot) UI.btnCloseNot.addEventListener('click', closeNotifications);
  if (UI.notOverlay) UI.notOverlay.addEventListener('click', closeNotifications);

  // Global Function for adding notifications
  window.addNotification = (title, message, type = 'info') => {
    if (!UI.notList) return;

    const accentColor = {
      success: 'text-tealAccent',
      warning: 'text-orangeAccent',
      error: 'text-red-500',
      info: 'text-blue-400'
    }[type] || 'text-tealAccent';

    const bgOpacity = {
        success: 'bg-tealAccent/5',
        warning: 'bg-orangeAccent/5',
        error: 'bg-red-500/5',
        info: 'bg-blue-400/5'
    }[type] || 'bg-white/5';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const html = `
      <div class="p-4 rounded-2xl ${bgOpacity} border border-white/5 group hover:border-${type === 'info' ? 'blue-400' : 'tealAccent'}/20 transition-all animate-fadeIn">
        <div class="flex justify-between items-start mb-1">
          <h4 class="${accentColor} font-black text-[10px] uppercase tracking-widest">${title}</h4>
          <span class="text-[9px] text-gray-500 font-bold">${time}</span>
        </div>
        <p class="text-xs text-gray-400 font-medium leading-relaxed">${message}</p>
      </div>
    `;

    UI.notList.insertAdjacentHTML('afterbegin', html);
    
    // Show badge if panel is closed
    if (UI.notPanel.classList.contains('translate-x-full')) {
      UI.notBadge.classList.remove('hidden');
    }
  };

  if (UI.btnChat) {
    UI.btnChat.addEventListener('click', () => {
      showToast("Iniciando cifrado de canal seguro...", "default");
      setTimeout(() => showToast("Conectando con el equipo de soporte RENEW...", "info"), 600);
    });
  }

  if (UI.btnHeaderSettings) {
    UI.btnHeaderSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      UI.settingsDropdown.classList.toggle('hidden');
    });
  }

  if (UI.btnMenuEditProfile) {
    UI.btnMenuEditProfile.addEventListener('click', () => {
      UI.settingsDropdown.classList.add('hidden');
      triggerUserEdit('admin_julian', {
        id: 'admin_julian',
        nombre: 'Julian',
        apellido: 'Vercetti',
        email: 'julian@renewsolar.com',
        rol: 'Admin',
        department: 'Dirección General',
        telefono: '+1 (305) 555-9988'
      });
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
      if (UI.settingsDropdown && !UI.settingsDropdown.classList.contains('hidden')) {
          if (!UI.settingsDropdown.contains(e.target) && !UI.btnHeaderSettings.contains(e.target)) {
              UI.settingsDropdown.classList.add('hidden');
          }
      }
  });




  // ── Save/Edit Usuario Event ──
  if (UI.btnSaveUsr) {
    UI.btnSaveUsr.addEventListener('click', async () => {
      const id = UI.inpUsrId.value;
      const initials = (UI.inpUsrNom.value[0] + (UI.inpUsrApe.value[0] || 'X')).toUpperCase();
      
      const newUsr = {
        id: id || 'u' + Date.now(),
        nombre: UI.inpUsrNom.value.trim(),
        apellido: UI.inpUsrApe.value.trim(),
        email: UI.inpUsrEmail.value.trim(),
        foto: state.currentUsrFoto,
        telefono: UI.inpUsrTel.value.trim(),
        dob: UI.inpUsrDob.value,
        initials: initials,
        rol: UI.inpUsrRol.value,
        department: UI.inpUsrDept ? UI.inpUsrDept.value.trim() : '',
        password: UI.inpUsrPass.value.trim()
      };

      if (!newUsr.nombre || !newUsr.apellido || !newUsr.email) return alert('Datos obligatorios incompletos');

      await saveAdminWorker(newUsr);
      closeModals();
      await renderView();
    });
  }

  // ── User Photo Upload ──
  if (UI.dropUsrFoto) {
    UI.dropUsrFoto.addEventListener('click', () => UI.inpUsrFotoFile.click());
    UI.dropUsrFoto.addEventListener('dragover', (e) => {
        e.preventDefault();
        UI.dropUsrFoto.classList.add('border-tealAccent', 'bg-tealAccent/5');
    });
    UI.dropUsrFoto.addEventListener('dragleave', () => {
        UI.dropUsrFoto.classList.remove('border-tealAccent', 'bg-tealAccent/5');
    });
    UI.dropUsrFoto.addEventListener('drop', async (e) => {
        e.preventDefault();
        UI.dropUsrFoto.classList.remove('border-tealAccent', 'bg-tealAccent/5');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            state.currentUsrFoto = await readFileAsBase64(file);
            UI.previewUsrFoto.style.backgroundImage = `url(${state.currentUsrFoto})`;
            UI.previewUsrFoto.classList.remove('hidden');
            UI.placeholderUsrFoto.classList.add('hidden');
        }
    });
  }
  if (UI.inpUsrFotoFile) {
    UI.inpUsrFotoFile.addEventListener('change', async () => {
      if (UI.inpUsrFotoFile.files.length) {
        state.currentUsrFoto = await readFileAsBase64(UI.inpUsrFotoFile.files[0]);
        UI.previewUsrFoto.style.backgroundImage = `url(${state.currentUsrFoto})`;
        UI.previewUsrFoto.classList.remove('hidden');
        UI.placeholderUsrFoto.classList.add('hidden');
      }
    });
  }

  if (UI.btnReset) {
    UI.btnReset.addEventListener('click', () => {
      UI.modReset.style.display = 'flex';
    });
  }

  if (UI.btnConfirmReset) {
    UI.btnConfirmReset.addEventListener('click', async () => {
      UI.btnConfirmReset.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Reiniciando...';
      await nukeAndResetDB();
      window.location.reload();
    });
  }

  // CRM Photo logic
  if (UI.dropCliFoto) {
    UI.dropCliFoto.addEventListener('click', () => UI.inpCliFoto.click());
    UI.dropCliFoto.addEventListener('dragover', (e) => {
        e.preventDefault();
        UI.dropCliFoto.classList.add('border-tealAccent', 'bg-tealAccent/5');
    });
    UI.dropCliFoto.addEventListener('dragleave', () => {
        UI.dropCliFoto.classList.remove('border-tealAccent', 'bg-tealAccent/5');
    });
    UI.dropCliFoto.addEventListener('drop', async (e) => {
        e.preventDefault();
        UI.dropCliFoto.classList.remove('border-tealAccent', 'bg-tealAccent/5');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            state.currentCliFoto = await readFileAsBase64(file);
            UI.previewCliFoto.style.backgroundImage = `url(${state.currentCliFoto})`;
            UI.previewCliFoto.classList.remove('hidden');
            UI.placeholderCliFoto.classList.add('hidden');
        }
    });
  }
  if (UI.inpCliFoto) {
    UI.inpCliFoto.addEventListener('change', async () => {
      if (UI.inpCliFoto.files.length) {
        state.currentCliFoto = await readFileAsBase64(UI.inpCliFoto.files[0]);
        UI.previewCliFoto.style.backgroundImage = `url(${state.currentCliFoto})`;
        UI.previewCliFoto.classList.remove('hidden');
        UI.placeholderCliFoto.classList.add('hidden');
      }
    });
  }

  // Header "Global" Action Button (Contextual)
  if (UI.btnAddGlobal) {
    UI.btnAddGlobal.addEventListener('click', async () => {
      console.log("Global button clicked. View:", state.activeView);
      const curView = state.activeView;
      if (curView === 'constructor') {
        UI.inpPipNom.value = '';
        showModal(UI.modPip);
      } 
      else if (curView === 'crm' || curView === 'crm_maestro') {
        UI.inpCliNom.value = '';
        UI.inpCliEmail.value = '';
        UI.inpCliTel.value = '';
        showModal(UI.modCli);
      } 
      else if (curView === 'usuarios' || curView === 'equipo') {
        document.getElementById('modal-usr-title').textContent = "Añadir Trabajador";
        UI.inpUsrId.value = '';
        UI.inpUsrNom.value = '';
        UI.inpUsrApe.value = '';
        UI.inpUsrEmail.value = '';
        UI.inpUsrTel.value = '';
        UI.inpUsrDob.value = '';
        UI.inpUsrPass.value = 'renew123';
        UI.inpUsrRol.value = 'Vendedor';
        
        state.currentUsrFoto = null;
        if(UI.previewUsrFoto) UI.previewUsrFoto.classList.add('hidden');
        if(UI.placeholderUsrFoto) UI.placeholderUsrFoto.classList.remove('hidden');

        console.log("Opening Add Worker Modal with Nuclear ID...");
        showModal(UI.modUsr);
      }
    });
  }

  // Kanban Drag & Drop Listeners
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.kanban-card');
    if (card) {
      e.dataTransfer.setData('text/plain', card.dataset.proyectoid);
      setTimeout(() => card.style.opacity = '0.4', 0);
    }
  });

  document.addEventListener('dragend', (e) => {
    const card = e.target.closest('.kanban-card');
    if (card) card.style.opacity = '1';
  });

  document.addEventListener('dragover', (e) => {
    if (e.target.closest('.kanban-drop-zone')) {
      e.preventDefault();
    }
  });

  document.addEventListener('drop', async (e) => {
    const zone = e.target.closest('.kanban-drop-zone');
    if (zone) {
      e.preventDefault();
      const projectId = e.dataTransfer.getData('text/plain');
      const newFaseId = zone.dataset.faseid;
      
      const db = JSON.parse(localStorage.getItem('rs_admin_db'));
      const p = db.Proyectos_Dinamicos.find(x => x.id === projectId);
      if (p && p.fase_id !== newFaseId) {
        p.fase_id = newFaseId;
        localStorage.setItem('rs_admin_db', JSON.stringify(db));
        await renderView();
      }
    }
  });

  // Save Cliente (CRM) Event
  if (UI.btnSaveCli) {
    UI.btnSaveCli.addEventListener('click', async () => {
      const state_id = document.getElementById('inp-cli-state').value.trim();
      const firstNom = document.getElementById('inp-cli-nombre').value.trim();
      const apellido = document.getElementById('inp-cli-apellido').value.trim();
      const dob = document.getElementById('inp-cli-dob').value;
      const telefono = document.getElementById('inp-cli-tel').value.trim();
      const email = document.getElementById('inp-cli-email').value.trim();
      const direccion = document.getElementById('inp-cli-direccion').value.trim();
      const empresa = document.getElementById('inp-cli-empresa').value.trim();
      const estado = document.getElementById('inp-cli-estado').value;

      if (!firstNom || !apellido) return alert('El Nombre y Apellido son obligatorios');

      const fullNombre = `${firstNom} ${apellido}`.trim();

      const db = JSON.parse(localStorage.getItem('rs_admin_db'));
      db.Counters.cli = (db.Counters.cli || 0) + 1;
      const newId = 'cli_' + db.Counters.cli;
      db.Clientes_Maestro.push({
        id: newId, 
        nombre: fullNombre, 
        email: email || 'Sin Email', 
        telefono: telefono || 'Sin Teléfono',
        direccion: direccion || "Pendiente", 
        zip: "Pendiente",
        state_id, dob, empresa, estado,
        foto: state.currentCliFoto
      });
      localStorage.setItem('rs_admin_db', JSON.stringify(db));
      
      closeModals();
      await renderView();
    });
  }


  // Save Fase Event
  if (UI.btnSaveFas) {
    UI.btnSaveFas.addEventListener('click', async () => {
      const nom = UI.inpFasNom.value.trim();
      if (!nom) return alert('Define un nombre para la fase');
      
      const pFasesCount = state.fases.filter(f => f.pipeline_id === state.activePipId).length;
      await createAdminFase(state.activePipId, nom, pFasesCount + 1);
      closeModals();
      await loadData();
      renderConstructor();
    });
  }

  if (UI.inpPipCol) {
    UI.inpPipCol.addEventListener('input', e => UI.inpPipHex.value = e.target.value);
  }

  if (UI.btnSavePip) {
    UI.btnSavePip.addEventListener('click', async () => {
      if(!UI.inpPipNom.value.trim()) return;
      const newPip = await createAdminPipeline(UI.inpPipNom.value.trim(), UI.inpPipCol.value);
      await createAdminFase(newPip.id, 'Fase 1: Recolección', 1);
      closeModals();
      await loadData();
      state.activePipId = newPip.id;
      await renderView();
    });
  }

  if (UI.inpCamTipo) {
    UI.inpCamTipo.addEventListener('change', e => {
      if(e.target.value === 'Desplegable') {
        UI.wrpCamOpc.classList.remove('hidden');
      } else {
        UI.wrpCamOpc.classList.add('hidden');
        UI.inpCamOpc.value = '';
      }
    });
  }

  if (UI.btnSaveCam) {
    UI.btnSaveCam.addEventListener('click', async () => {
      const fn = UI.inpCamFaseId.value;
      const etq = UI.inpCamEtq.value.trim();
      const tipo = UI.inpCamTipo.value;
      const opc = UI.inpCamOpc.value.trim();
      if(!etq) return alert("Define la etiqueta");
      if(tipo === 'Desplegable' && !opc) return alert("Define las opciones separadas por coma");
      await createAdminCampo(fn, etq, tipo, opc);
      closeModals();
      await loadData();
      await renderView();
    });
  }

  // ── Unified Delegation for Generic View Actions ──
  document.body.addEventListener('click', async (e) => {
    // ── GENERAL ACTIONS (Only if inside canvas and not a delete) ──
    const target = e.target;
    
    // 0. Global Modal Actions (Cancel / Success Close)
    if (target.closest('.btn-close-success') || target.closest('.btn-cancel')) {
      closeModals();
      return;
    }

    if (target.closest('.btn-delete-pipeline') || target.closest('.btn-delete-fase') || target.closest('.btn-delete-campo')) return;
    if (!UI.canvas.contains(target)) return;

    // 1. Pipeline Tab Switch
    const tab = e.target.closest('.pip-tab');
    if (tab) {
      state.activePipId = tab.dataset.id;
      await renderView();
      return;
    }

    // 2. Add Field
    const btnCampo = e.target.closest('.btn-add-campo');
    if (btnCampo) {
      const activePipDetails = state.pipelines.find(p => p.id === state.activePipId);
      UI.inpCamFaseId.value = btnCampo.dataset.faseid;
      UI.lblFaseDest.textContent = btnCampo.dataset.fasenom;
      UI.lblFaseDest.style.color = activePipDetails ? activePipDetails.color : '#fff';
      UI.inpCamEtq.value = ''; UI.inpCamOpc.value = '';
      UI.wrpCamOpc.classList.add('hidden');
      UI.inpCamTipo.value = 'Texto';
      showModal(UI.modCam);
      return;
    }

    // 3. Add Fase
    const btnFaseAction = e.target.closest('#btn-add-fase');
    if (btnFaseAction) {
      UI.inpFasNom.value = '';
      showModal(UI.modFas);
      return;
    }

    // ── Marketing / WA ──
    const btnAddPaso = e.target.closest('#btn-add-paso');
    if (btnAddPaso) {
      const container = document.getElementById('mk-secuencia-container');
      if (container) {
        const nextIdx = container.querySelectorAll('.mk-card').length + 1;
        container.insertAdjacentHTML('beforeend', crearPasoMarketingHTML(nextIdx));
      }
      return;
    }

    const btnDelPaso = e.target.closest('.btn-eliminar-paso');
    if (btnDelPaso) {
      e.target.closest('.mk-card').remove();
      document.querySelectorAll('.mk-card').forEach((card, i) => {
         const idxBadge = card.querySelector('.mk-step-idx');
         if(idxBadge) idxBadge.textContent = i + 1;
      });
      return;
    }

    const btnSend = e.target.closest('#btn-enviar-campana');
    if (btnSend) {
      const cards = document.querySelectorAll('.mk-card');
      const secuencia = [];
      cards.forEach(card => {
        secuencia.push({
          asunto: card.querySelector('.mk-asunto').value,
          programacion: card.querySelector('.mk-fecha-envio').value,
          cuerpo: card.querySelector('.mk-cuerpo').value
        });
      });
      
      const payload = {
        audiencia: document.getElementById('mk-audiencia').value,
        secuencia: secuencia,
        timestamp: new Date().toISOString()
      };

      console.log('--- Email Engine Payload ---', payload);
      
      // Visual feedback
      const originalHtml = btnSend.innerHTML;
      btnSend.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Activating...';
      btnSend.disabled = true;

      fetch('https://n8n.milian-app.online/webhook/email-renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        btnSend.innerHTML = '<i class="fa-solid fa-check"></i> Activated!';
        btnSend.classList.remove('bg-tealAccent');
        btnSend.classList.add('bg-green-500');
        showSuccessModal('¡Ya está activado! Los protocolos de Email Engine se han sincronizado con éxito.');
      })
      .catch(err => {
        console.error('Email Engine Error:', err);
        btnSend.innerHTML = originalHtml;
        btnSend.disabled = false;
        showToast('Error al conectar con el servidor de Email: ' + err.message, 'error');
      });
      return;
    }


    const btnAddWaPaso = e.target.closest('#btn-add-wa-paso');
    if (btnAddWaPaso) {
      const container = document.getElementById('wa-secuencia-container');
      if (container) {
        const nextIdx = container.querySelectorAll('.wa-card').length + 1;
        container.insertAdjacentHTML('beforeend', crearPasoWhatsAppHTML(nextIdx));
      }
      return;
    }

    const btnDelWaPaso = e.target.closest('.btn-eliminar-wa-paso');
    if (btnDelWaPaso) {
      e.target.closest('.wa-card').remove();
      document.querySelectorAll('.wa-card').forEach((card, i) => {
         const idxBadge = card.querySelector('.wa-step-idx');
         if(idxBadge) idxBadge.textContent = i + 1;
      });
      return;
    }

    const btnWaSend = e.target.closest('#btn-enviar-wa-campana');
    if (btnWaSend) {
      showSuccessModal('¡Protocolo WhatsApp Activado! Las señales se están transmitiendo a la red.');
      return;
    }

    const chkAll = e.target.closest('.chk-select-all');
    if (chkAll) {
      const isWA = chkAll.id === 'wa-all';
      const siblings = document.querySelectorAll(isWA ? '.wa-chk-audiencia' : '.chk-audiencia');
      siblings.forEach(s => s.checked = chkAll.checked);
      return;
    }
  });

  // ── Audience Search Filtering ──
  UI.canvas.addEventListener('input', (e) => {
    if (e.target.classList.contains('chk-search-input')) {
      const q = e.target.value.toLowerCase();
      const parent = e.target.closest('#mk-seleccion-especifica') || e.target.closest('#wa-seleccion-especifica');
      if (!parent) return;
      
      const cards = parent.querySelectorAll('.recipient-grid label');
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(q)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }
  });

  UI.canvas.addEventListener('change', async (e) => {
    if (e.target.id === 'mk-audiencia' || e.target.id === 'wa-audiencia') {
      const isWA = e.target.id === 'wa-audiencia';
      const val = e.target.value;
      const subContainer = document.getElementById(isWA ? 'wa-seleccion-especifica' : 'mk-seleccion-especifica');
      if (!subContainer) return;
      
      if (val === 'clientes_especificos' || val === 'trabajadores_especificos') {
        const db = JSON.parse(localStorage.getItem('rs_admin_db')) || { Clientes_Maestro: [], Usuarios: [] };
        let items = [];
        
        if (val === 'clientes_especificos') {
          items = db.Clientes_Maestro || [];
        } else {
          items = await getAdminWorkers();
        }

        const chkClass = isWA ? 'wa-chk-audiencia' : 'chk-audiencia';
        const accentColor = isWA ? 'text-green-500' : 'text-tealAccent';
        const ringColor = isWA ? 'focus:ring-green-500' : 'focus:ring-tealAccent';
        const toggleAllId = isWA ? 'wa-all' : 'mk-all';
        
        subContainer.innerHTML = `
          <div class="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
            <div class="flex items-center gap-3 flex-1 w-full">
              <div class="relative flex-1">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input type="text" placeholder="Buscar por nombre o email..." class="chk-search-input w-full bg-gray-100 dark:bg-gray-900/50 border border-transparent focus:border-tealAccent rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none transition-all">
              </div>
            </div>
            <div class="flex items-center gap-6">
               <label class="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                 <span class="text-[10px] uppercase font-black text-gray-400 group-hover:text-tealAccent transition-colors">Seleccionar Todos</span>
                 <input type="checkbox" id="${toggleAllId}" class="chk-select-all w-4 h-4 rounded ${accentColor} ${ringColor}">
               </label>
            </div>
          </div>
          <div class="recipient-grid grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            ${items.map(item => `
              <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-tealAccent transition-all group">
                <input type="checkbox" value="${item.email}" class="${chkClass} w-4 h-4 rounded ${accentColor} ${ringColor}">
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-gray-800 dark:text-white">${item.nombre} ${item.apellido || ''}</span>
                  <span class="text-[10px] text-gray-400 font-medium">${item.email}</span>
                </div>
              </label>
            `).join('')}
          </div>
        `;
        subContainer.classList.remove('hidden');
      } else {
        subContainer.classList.add('hidden');
        subContainer.innerHTML = '';
      }
      return;
    }

    if (e.target.classList.contains('sel-fase-rol')) {
      const faseId = e.target.dataset.faseid;
      const nuevoRol = e.target.value;
      await updateAdminFaseRole(faseId, nuevoRol);
      const stFaseObj = state.fases.find(f => f.id === faseId);
      if (stFaseObj) stFaseObj.rol_encargado = nuevoRol;
    }
  });
}

function showSuccessModal(msg) {
  if (UI.msgSuccess) UI.msgSuccess.textContent = msg;
  showModal(UI.modSuccess);
}

function showModal(m) {
  if (!m) return;
  m.classList.remove('hidden', 'modal-hidden', 'nuclear-hidden');
  m.classList.add('nuclear-visible');
  m.style.cssText = "display: flex !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; z-index: 9999 !important;";
}

function closeModals() {
  const modals = [UI.modPip, UI.modCam, UI.modFas, UI.modCli, UI.modUsr, UI.modReset, UI.modUsrDetail, UI.modSuccess];
  modals.forEach(m => {
    if (m) {
      m.classList.remove('nuclear-visible');
      m.classList.add('nuclear-hidden');
      m.style.cssText = "display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;";
    }
  });
  
  // Clean photo states
  state.currentCliFoto = null;
  state.currentUsrFoto = null;
  if(UI.previewCliFoto) UI.previewCliFoto.classList.add('hidden');
  if(UI.placeholderCliFoto) UI.placeholderCliFoto.classList.remove('hidden');
  if(UI.previewUsrFoto) UI.previewUsrFoto.classList.add('hidden');
  if(UI.placeholderUsrFoto) UI.placeholderUsrFoto.classList.remove('hidden');
}

async function loadData() {
  state.pipelines = await getAdminPipelines();
  state.fases = await getAdminFases();
  state.campos = await getAdminCampos();
  if(!state.activePipId && state.pipelines.length > 0) {
    state.activePipId = state.pipelines[0].id;
  }
}

function setGlobalButton(show, html, className = "btn-premium flex items-center gap-3 px-6 py-3 shadow-lg") {
  const btn = document.getElementById('btn-global-action');
  if (!btn) return;
  if (!show) {
    btn.classList.add('hidden');
    btn.style.setProperty('display', 'none', 'important');
  } else {
    btn.innerHTML = html;
    btn.className = className;
    btn.classList.remove('hidden');
    btn.style.setProperty('display', 'flex', 'important');
  }
}

async function renderView() {
  const dbStr = localStorage.getItem('rs_admin_db');
  const db = dbStr ? JSON.parse(dbStr) : null;
  if (!db) return window.location.reload(); // Safety net

  // Hide arrows by default
  const sl = document.getElementById('ctrl-scroll-left');
  const sr = document.getElementById('ctrl-scroll-right');
  if(sl) sl.style.display = 'none';
  if(sr) sr.style.display = 'none';

  if (state.activeView === 'constructor') {
    UI.viewTitle.textContent = "Workflow Constructor";
    UI.viewDesc.textContent = "Engineer the phases and dynamic fields for the RENEW Ecosystem.";
    setGlobalButton(true, '<i class="fa-solid fa-plus"></i> New Pipeline');
    renderConstructor();
  } 
  else if (state.activeView === 'crm' || state.activeView === 'crm_maestro') {
    UI.viewTitle.textContent = "CRM Maestro";
    UI.viewDesc.textContent = "Centralized customer database for all active pipelines.";
    setGlobalButton(true, '<i class="fa-solid fa-user-plus"></i> Add Prospect');
    renderTable(
      ["ID", "Identity", "Source State", "Client Name", "Contact", "Email", "Address", "Unit", "Status"],
      db.Clientes_Maestro.map(c => [
        `<span class="text-[10px] text-gray-400 dark:text-gray-600 font-black">#${c.id.split('-')[0]}</span>`,
        c.foto ? `<img src="${c.foto}" class="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-white/5">` : `<div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center"><i class="fa-solid fa-user text-gray-400 dark:text-gray-700 text-xs"></i></div>`,
        `<span class="font-black text-tealAccent text-[10px] uppercase tracking-widest">${c.state_id || 'Global'}</span>`,
        `<span class="font-black text-gray-900 dark:text-white tracking-tight">${c.nombre}</span>`, 
        `<span class="text-gray-500 dark:text-gray-400 font-medium tracking-tighter">${c.telefono}</span>`, 
        `<span class="text-gray-400 dark:text-gray-500 text-xs">${c.email}</span>`, 
        `<span class="text-gray-400 dark:text-gray-500 text-xs truncate max-w-[150px] inline-block">${c.direccion}</span>`, 
        `<span class="text-tealAccent/60 text-[10px] font-black uppercase">${c.empresa || 'Renew'}</span>`, 
        `<span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-gray-100 dark:bg-white/5 text-tealAccent border border-gray-200 dark:border-white/5">${c.estado || 'Prospect'}</span>`
      ])
    );
  }
  else if (state.activeView === 'usuarios' || state.activeView === 'equipo') {
    UI.viewTitle.textContent = "Human Resources & Team";
    UI.viewDesc.textContent = "Manage system access and roles for the RENEW mobile team.";
    setGlobalButton(true, '<i class="fa-solid fa-user-tie"></i> Add Collaborator');
    
    const items = await getAdminWorkers();

    const headers = ["", "", "Collaborator", "Division", "Auth Email", "Mobile Phone", "Activity", "Interface", "Control"];
    const rowsHtml = items.map(u => {
        const safeNombre = u.nombre || 'Worker';
        const safeApellido = u.apellido || '';
        const initial = u.initials || (safeNombre[0] || '?');
        const dept = u.department || 'Renew Group';
        const rol = u.rol || 'Vendedor';
        const fotoHtml = u.foto ? `<img src="${u.foto}" class="w-10 h-10 rounded-xl object-cover border border-white/5">` : `<div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-gray-600 text-xs">${initial}</div>`;
        
        return `
            <tr class="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                <td class="px-8 py-5 w-4 text-center">
                    <input type="checkbox" class="w-4 h-4 rounded border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-tealAccent focus:ring-tealAccent">
                </td>
                <td class="px-2 py-5 w-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fa-solid fa-gear text-gray-300 dark:text-gray-700 cursor-pointer hover:text-tealAccent"></i>
                </td>
                <td class="px-8 py-5 whitespace-nowrap">
                    <div class="flex items-center gap-4">
                        ${fotoHtml}
                        <div class="flex flex-col">
                            <a href="#" class="worker-name-link font-black text-gray-900 dark:text-white hover:text-tealAccent transition-colors text-sm tracking-tight" data-id="${u.id}">${safeNombre} ${safeApellido}</a>
                            <span class="text-[9px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-widest">${rol}</span>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-5 whitespace-nowrap">
                    <span class="px-3 py-1 bg-gray-100 dark:bg-white/5 text-tealAccent text-[9px] font-black uppercase tracking-widest rounded-lg border border-gray-200 dark:border-white/5">
                        ${dept}
                    </span>
                </td>
                <td class="px-8 py-5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-medium">${u.email || '-'}</td>
                <td class="px-8 py-5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-medium">${u.telefono || '-'}</td>
                <td class="px-8 py-5 whitespace-nowrap text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-tighter">Live Monitor</td>
                <td class="px-8 py-5 whitespace-nowrap text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase">RENEW OS</td>
                <td class="px-8 py-5 whitespace-nowrap text-right">
                    <button class="btn-edit-usuario p-2 bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 hover:text-tealAccent rounded-xl transition-all" data-id="${u.id}">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    UI.canvas.innerHTML = `
        <div class="bg-white dark:bg-darkCard border border-gray-100 dark:border-white/5 rounded-3xl shadow-premium overflow-hidden mt-8 overflow-x-auto hide-scrollbar">
            <table class="w-full">
                <thead class="bg-gray-50 dark:bg-white/[0.01] border-b border-gray-100 dark:border-white/5">
                    <tr>
                        ${headers.map(h => `<th class="px-8 py-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
  }
  else if (state.activeView === 'kanban') {
    UI.viewTitle.textContent = "Kanban Pulse";
    UI.viewDesc.textContent = "Real-time visualization of all deals across the RENEW spectrum.";
    setGlobalButton(false);
    
    const activePip = state.pipelines.find(p => p.id === state.activePipId) || state.pipelines[0];
    if (!activePip) return UI.canvas.innerHTML = '<div class="py-20 text-center text-gray-600 font-black uppercase tracking-[0.3em]">System Offline: No Pipelines Installed</div>';
    state.activePipId = activePip.id;

    const tabsHtml = state.pipelines.map(p => `
      <button class="pip-tab px-10 py-5 rounded-t-3xl font-black text-[10px] uppercase tracking-[0.2em] border-t-2 transition-all ${p.id === state.activePipId ? 'bg-white dark:bg-darkCard border-tealAccent text-tealAccent' : 'bg-transparent border-transparent text-gray-400 dark:text-gray-700 hover:text-tealAccent'}" data-id="${p.id}">
        ${p.nombre}
      </button>
    `).join('');

    const pFases = state.fases.filter(f => f.pipeline_id === state.activePipId).sort((a,b) => a.orden - b.orden);
    const pDeals = (db.Proyectos_Dinamicos || []).filter(p => p.pipeline_id === state.activePipId);

    const columnsHtml = pFases.map(f => {
      const dealsInFase = pDeals.filter(d => d.fase_id === f.id);
      const cardsHtml = dealsInFase.map(d => {
        const cli = db.Clientes_Maestro.find(c => c.id === d.cliente_id) || { nombre: 'Prospect Unknown' };
        const resp = (db.Usuarios || []).find(u => u.id === d.responsable_id) || { nombre: 'System Admin', initials: 'SA' };
        
        return `
          <div class="kanban-card bg-white dark:bg-darkCard border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-premium hover:shadow-teal-glow hover:border-tealAccent/30 transition-all cursor-grab active:cursor-grabbing mb-4 group" draggable="true" data-proyectoid="${d.id}">
            <div class="flex justify-between items-start mb-4">
              <span class="text-[9px] font-black text-gray-400 dark:text-gray-700 uppercase tracking-widest">TRANSACTION #${d.id.split('_')[1] || 'MOD'}</span>
              <div class="flex gap-2">
                <div class="w-2 h-2 rounded-full bg-tealAccent animate-pulse"></div>
              </div>
            </div>
            
            <h4 class="text-gray-900 dark:text-white font-black text-lg mb-1 tracking-tighter limit-text-1 group-hover:text-tealAccent transition-colors">${cli.nombre}</h4>
            <div class="flex items-center gap-2 mb-6">
               <i class="fa-solid fa-clock text-[10px] text-gray-300 dark:text-gray-700"></i>
               <span class="text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-tighter">${d.created_at || 'Recently synced'}</span>
            </div>

            <div class="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-tealAccent border border-gray-200 dark:border-white/10">
                  ${resp.initials || 'UA'}
                </div>
                <div class="flex flex-col">
                   <span class="text-[9px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-tighter">Assigned Head</span>
                   <span class="text-xs text-gray-600 dark:text-gray-400 font-bold tracking-tight">${resp.nombre}</span>
                </div>
              </div>
              <div class="flex gap-3">
                <i class="fas fa-ellipsis-v text-gray-300 dark:text-gray-700 group-hover:text-tealAccent transition-colors text-xs"></i>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="kanban-col flex flex-col min-w-[340px] h-full" data-faseid="${f.id}">
          <div class="px-6 py-4 mb-6 bg-white dark:bg-white/[0.01] rounded-2xl border border-gray-100 dark:border-white/5 flex justify-between items-center shadow-sm dark:shadow-lg">
            <h3 class="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">${f.nombre}</h3>
            <span class="bg-tealAccent/5 text-tealAccent text-[10px] px-3 py-1 rounded-full font-black border border-tealAccent/10">${dealsInFase.length}</span>
          </div>
          <div class="kanban-drop-zone flex-1 overflow-y-auto pb-12 hide-scrollbar min-h-[500px]" data-faseid="${f.id}">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join('');

    UI.canvas.innerHTML = `
      <div class="flex gap-4 border-b border-gray-100 dark:border-white/5 mb-10 overflow-x-auto hide-scrollbar">
        ${tabsHtml}
      </div>
      <div class="scroll-container-kanban flex flex-nowrap gap-6 overflow-x-auto h-[calc(100vh-280px)] items-start pb-12 hide-scrollbar scroll-smooth" id="kanban-wrapper" style="width: 100%; max-width: 100%;">
        ${columnsHtml}
      </div>
    `;

    // Arrows Logic for Kanban
    setTimeout(() => {
      const wrap = document.getElementById('kanban-wrapper');
      const l = document.getElementById('ctrl-scroll-left');
      const r = document.getElementById('ctrl-scroll-right');
      if (!wrap || !l || !r) return;
      l.style.display = 'flex'; r.style.display = 'flex';
      let move;
      l.onmouseenter = () => { move = setInterval(() => { wrap.scrollLeft -= 15; updateArrows(); }, 16); };
      r.onmouseenter = () => { move = setInterval(() => { wrap.scrollLeft += 15; updateArrows(); }, 16); };
      [l, r].forEach(btn => btn.onmouseleave = () => clearInterval(move));
      function updateArrows() {
        const atStart = wrap.scrollLeft <= 20;
        const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 20;
        l.style.opacity = atStart ? '0' : '0.7'; l.style.pointerEvents = atStart ? 'none' : 'auto';
        r.style.opacity = atEnd ? '0' : '0.7'; r.style.pointerEvents = atEnd ? 'none' : 'auto';
      }
      wrap.onscroll = updateArrows;
      updateArrows();
    }, 100);
  }
  else if (state.activeView === 'marketing') {
    UI.viewTitle.textContent = "Intelligence: Email Engine";
    UI.viewDesc.textContent = "Deploy automated email sequences synchronized with CRM signals.";
    setGlobalButton(false);
    
    UI.canvas.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-10 animate-fadeIn">
        <div class="flex items-center justify-between bg-white dark:bg-darkCard p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-premium">
          <div class="flex items-center gap-6">
            <div class="w-16 h-16 rounded-2xl bg-tealAccent/5 flex items-center justify-center text-tealAccent border border-tealAccent/10">
              <i class="fa-solid fa-microchip text-3xl"></i>
            </div>
            <div>
              <p class="aqua-label">Target Engine Segment</p>
              <select id="mk-audiencia" class="bg-transparent border-none text-2xl font-black text-gray-900 dark:text-white p-0 focus:ring-0 cursor-pointer hover:text-tealAccent transition-colors">
                <option value="Todos" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Global Network</option>
                <option value="Solar" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Renew Solar Leads</option>
                <option value="Water" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Renew Water Leads</option>
                <option value="clientes_especificos" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Manual Selection</option>
                <option value="todos_trabajadores" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Internal Team</option>
                <option value="trabajadores_especificos" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Collaborator Selection</option>
              </select>
            </div>
          </div>
          <div class="text-right">
             <div class="px-4 py-2 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 text-[10px] font-black rounded-xl border border-gray-100 dark:border-white/10 uppercase tracking-[0.2em]">Engine Status: Standby</div>
          </div>
        </div>

        <div id="mk-seleccion-especifica" class="hidden mt-[-2.5rem] p-8 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-3xl shadow-inner max-h-80 overflow-y-auto animate-slideDown hide-scrollbar"></div>

        <div id="mk-secuencia-container" class="space-y-4">
          ${crearPasoMarketingHTML(1)}
        </div>

        <div class="flex gap-6 pt-10">
           <button id="btn-add-paso" class="flex-1 py-6 bg-gray-50 dark:bg-white/5 hover:bg-tealAccent/10 text-gray-400 dark:text-gray-600 hover:text-tealAccent rounded-3xl transition-all font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 border border-gray-100 dark:border-white/5">
             <i class="fa-solid fa-plus-circle text-xl"></i> Add Sequence Step
           </button>
           <button id="btn-enviar-campana" class="px-12 py-6 bg-tealAccent text-black rounded-3xl transition-all font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 shadow-teal-glow hover:scale-[1.02] active:scale-95">
             <i class="fa-solid fa-bolt-lightning text-xl"></i> Ignite Engine
           </button>
        </div>
      </div>
    `;
  }
  else if (state.activeView === 'whatsapp') {
    UI.viewTitle.textContent = "Intelligence: WA Reactor";
    UI.viewDesc.textContent = "Autonomous WhatsApp automation protocols for direct device infiltration.";
    setGlobalButton(false);
    
    UI.canvas.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-10 animate-fadeIn">
        <div class="flex items-center justify-between bg-white dark:bg-darkCard p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-premium">
          <div class="flex items-center gap-6">
            <div class="w-16 h-16 rounded-2xl bg-green-500/5 flex items-center justify-center text-green-400 border border-green-500/10">
              <i class="fa-brands fa-whatsapp text-4xl"></i>
            </div>
            <div>
              <p class="aqua-label mb-1">WA Protocol Segment</p>
              <select id="wa-audiencia" class="bg-transparent border-none text-2xl font-black text-gray-900 dark:text-white p-0 focus:ring-0 cursor-pointer hover:text-green-400 transition-colors">
                <option value="Todos" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Global Network</option>
                <option value="Solar" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Renew Solar Leads</option>
                <option value="Water" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Renew Water Leads</option>
                <option value="clientes_especificos" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Manual Selection</option>
                <option value="todos_trabajadores" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Internal Team</option>
                <option value="trabajadores_especificos" class="bg-white dark:bg-darkCard text-gray-900 dark:text-white">Collaborator Selection</option>
              </select>
            </div>
          </div>
          <div class="text-right">
             <div class="px-4 py-2 bg-gray-50 dark:bg-white/5 text-green-500/60 text-[10px] font-black rounded-xl border border-gray-200 dark:border-white/10 uppercase tracking-[0.2em]">Reactor Active</div>
          </div>
        </div>

        <div id="wa-seleccion-especifica" class="hidden mt-[-2.5rem] p-8 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-3xl shadow-inner max-h-80 overflow-y-auto animate-slideDown hide-scrollbar"></div>

        <div id="wa-secuencia-container" class="space-y-4">
          ${crearPasoWhatsAppHTML(1)}
        </div>

        <div class="flex gap-6 pt-10">
           <button id="btn-add-wa-paso" class="flex-1 py-6 bg-gray-50 dark:bg-white/5 hover:bg-green-500/10 text-gray-400 dark:text-gray-600 hover:text-green-500 rounded-3xl transition-all font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 border border-gray-100 dark:border-white/5">
             <i class="fa-solid fa-plus-circle text-xl"></i> Append Automation
           </button>
           <button id="btn-enviar-wa-campana" class="px-12 py-6 bg-green-500 text-black rounded-3xl transition-all font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 shadow-lg shadow-green-500/30 hover:scale-[1.02] active:scale-95">
             <i class="fa-solid fa-satellite-dish text-xl"></i> Broadcast Signal
           </button>
        </div>
      </div>
    `;
  }
}

function crearPasoWhatsAppHTML(index) {
  return `
    <div class="wa-card bg-white dark:bg-darkCard border border-gray-100 dark:border-white/5 p-8 rounded-3xl shadow-premium relative overflow-hidden group mb-6">
      <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-green-600 opacity-50"></div>
      
      <div class="flex justify-between items-start mb-6">
        <div class="flex items-center gap-4">
          <div class="wa-step-idx w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-green-400 font-black text-sm">
            ${index}
          </div>
          <h3 class="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter">WhatsApp Automation</h3>
        </div>
        <button class="btn-eliminar-wa-paso text-red-500/50 hover:text-red-500 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>

      <div class="mt-6">
        <p class="aqua-label">WhatsApp Message Content</p>
        <textarea class="wa-cuerpo w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-green-500 outline-none font-medium h-32 resize-none transition-all" placeholder="Hello {{name}}, your request has been..."></textarea>
      </div>
    </div>
  `;
}

function crearPasoMarketingHTML(index) {
  const isFirst = index === 1;
  return `
    <div class="mk-card bg-white dark:bg-darkCard border border-gray-100 dark:border-white/5 p-8 rounded-3xl shadow-premium relative overflow-hidden group mb-6">
      <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-tealAccent to-blue-500 opacity-50"></div>
      
      <div class="flex justify-between items-start mb-6">
        <div class="flex items-center gap-4">
          <div class="mk-step-idx w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-tealAccent font-black text-sm">
            ${index}
          </div>
          <h3 class="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter">Email Sequence Step</h3>
        </div>
        ${!isFirst ? `
          <button class="btn-eliminar-paso text-red-500/50 hover:text-red-500 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : ''}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-2">
        <p class="aqua-label">Subject Line</p>
          <input type="text" class="mk-asunto w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-tealAccent outline-none font-medium transition-all" placeholder="Enter high-impact subject...">
        </div>
        <div>
          <p class="aqua-label">Send Schedule</p>
          <input type="datetime-local" class="mk-fecha-envio w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-tealAccent outline-none font-bold transition-all">
        </div>
      </div>

      <div class="mt-6">
        <p class="aqua-label">Message Body</p>
        <textarea class="mk-cuerpo w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-tealAccent outline-none font-medium h-32 resize-none transition-all" placeholder="Hello {{name}}, we're thrilled to..."></textarea>
      </div>
    </div>
  `;
}

function renderTable(headers, rows) {
  const headHtml = headers.map(h => `<th class="px-8 py-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-white/5">${h}</th>`).join('');
  const bodyHtml = rows.map(r => `
    <tr class="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
      ${r.map((col, i) => `<td class="px-8 py-5 whitespace-nowrap text-sm ${i===3?'text-gray-900 dark:text-white font-bold':'text-gray-500 dark:text-gray-400 font-medium'}">${col}</td>`).join('')}
    </tr>
  `).join('');

  UI.canvas.innerHTML = `
    <div class="bg-white dark:bg-darkCard border border-gray-100 dark:border-white/5 rounded-3xl shadow-premium overflow-hidden mt-6 overflow-x-auto hide-scrollbar">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-white/[0.01]">${headHtml}</thead>
        <tbody class="divide-y divide-gray-100 dark:divide-white/5">${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

function renderConstructor() {
  if (state.pipelines.length === 0) {
    UI.canvas.innerHTML = `<h2 class="text-gray-500 text-center py-20">No pipelines found. Create one above to start.</h2>`;
    return;
  }
  const tabsHtml = state.pipelines.map(p => `
    <button class="pip-tab group relative px-8 py-5 rounded-t-2xl font-black text-xs uppercase tracking-widest border-t-2 transition-all ${p.id === state.activePipId ? 'bg-white dark:bg-darkCard border-tealAccent text-tealAccent' : 'bg-transparent border-transparent text-gray-400 dark:text-gray-600 hover:text-tealAccent'}" data-id="${p.id}">
      ${p.nombre}
      <i class="fa-solid fa-trash-can ml-3 text-[10px] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all cursor-pointer btn-delete-pipeline" 
         onclick="adminDeletePipeline('${p.id}', event)" 
         title="Delete Pipeline" style="pointer-events: auto !important;"></i>
    </button>
  `).join('');

  const pFases = state.fases.filter(f => f.pipeline_id === state.activePipId).sort((a,b) => a.orden - b.orden);
  const activePipDetails = state.pipelines.find(p => p.id === state.activePipId);

  const fasesHtml = pFases.map(f => {
    const cCampos = state.campos.filter(c => c.fase_id === f.id);
    const camposHtml = cCampos.map(c => `
      <div class="campo-card flex items-center justify-between bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-4 rounded-xl mb-3 hover:border-tealAccent/40 transition-all group shadow-sm" 
           draggable="true" data-id="${c.id}" data-faseid="${f.id}">
        <div class="flex items-center gap-4">
          <i class="fa-solid fa-grip-vertical text-gray-400 dark:text-gray-700 group-hover:text-tealAccent transition-colors cursor-move"></i>
          <div>
            <p class="text-gray-900 dark:text-white text-sm font-bold tracking-tight">${c.etiqueta}</p>
            <p class="text-[9px] uppercase font-black text-gray-400 dark:text-gray-600 mt-1">Input Type: <span class="text-tealAccent/70">${c.tipo}</span></p>
          </div>
        </div>
        <button class="btn-delete-campo text-gray-400 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 cursor-pointer" 
                onclick="adminDeleteCampo('${c.id}', event)" style="pointer-events: auto !important;">
          <i class="fa-solid fa-trash-can text-[10px]" style="pointer-events: none;"></i>
        </button>
      </div>
    `).join('');

    return `
      <div class="bg-white dark:bg-darkCard rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-premium overflow-hidden min-w-[360px] max-w-[360px] shrink-0 transform transition-all hover:shadow-teal-glow flex flex-col">
        <!-- Phase Header -->
        <div class="p-8 pb-4 flex flex-col justify-center relative group">
          <div class="flex justify-between items-start w-full">
            <div class="flex flex-col gap-1">
              <span class="aqua-label">STATION ${f.orden}</span>
              <h3 class="font-black text-gray-900 dark:text-white text-2xl leading-none tracking-tighter">
                ${f.nombre}
              </h3>
            </div>
            <div class="flex gap-2 relative z-20">
              <button class="btn-delete-fase text-gray-300 dark:text-gray-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2 cursor-pointer" 
                      onclick="adminDeleteFase('${f.id}', event)" 
                      title="Delete Station" style="pointer-events: auto !important;">
                <i class="fa-solid fa-trash-can text-sm" style="pointer-events: none;"></i>
              </button>
            </div>
          </div>
          
          <div class="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                <i class="fa-solid fa-puzzle-piece text-[10px] text-tealAccent"></i>
              </div>
              <select class="sel-fase-rol bg-transparent border-none text-[10px] font-black text-gray-400 dark:text-gray-500 p-0 focus:ring-0 cursor-pointer hover:text-tealAccent transition-colors uppercase tracking-[0.1em]" data-faseid="${f.id}">
                <option value="Vendedor" ${f.rol_encargado === 'Vendedor' ? 'selected' : ''}>Vendedor</option>
                <option value="Procesador" ${f.rol_encargado === 'Procesador' ? 'selected' : ''}>Procesador</option>
                <option value="Técnico" ${f.rol_encargado === 'Técnico' ? 'selected' : ''}>Técnico</option>
                <option value="Diseñador" ${f.rol_encargado === 'Diseñador' ? 'selected' : ''}>Diseñador</option>
                <option value="Finanzas" ${f.rol_encargado === 'Finanzas' ? 'selected' : ''}>Finanzas</option>
                <option value="Admin" ${f.rol_encargado === 'Admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
            <p class="aqua-label mb-0">Nodes: ${cCampos.length}</p>
          </div>
        </div>

        <div class="px-8 py-4 flex-1">
          <div class="space-y-1 min-h-[140px]">
            ${camposHtml || '<div class="text-center py-12 text-gray-400 dark:text-gray-700 text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl opacity-50">Empty Station</div>'}
          </div>
        </div>

        <div class="p-8 pt-2">
          <button class="btn-add-campo w-full py-4 bg-gray-50 dark:bg-white/5 hover:bg-tealAccent text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-black rounded-2xl flex justify-center items-center gap-3 transition-all font-black text-[10px] uppercase tracking-[0.2em] border border-gray-100 dark:border-white/5" data-faseid="${f.id}" data-fasenom="${f.nombre}">
            <i class="fa-solid fa-plus-circle text-sm"></i> Connect Field
          </button>
        </div>
      </div>
    `;
  }).join('');

  UI.canvas.style.overflowX = 'hidden'; 

  UI.canvas.innerHTML = `
    <div class="flex gap-4 border-b border-gray-100 dark:border-white/5 mb-10 overflow-x-auto hide-scrollbar">
      ${tabsHtml}
    </div>
    
    <div class="scroll-container-fases flex flex-nowrap gap-8 pb-24 items-start scroll-smooth overflow-x-auto hide-scrollbar" id="phases-wrapper" style="width: 100%; max-width: 100%;">
      ${fasesHtml}
      <div class="shrink-0 p-8 flex items-center justify-center">
        <button id="btn-add-fase" class="border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-tealAccent/40 text-gray-300 dark:text-gray-700 hover:text-tealAccent rounded-[2.5rem] min-w-[320px] h-[200px] flex items-center justify-center gap-4 transition-all shrink-0 font-black text-lg uppercase tracking-widest group bg-white dark:bg-white/[0.01]">
          <i class="fa-solid fa-plus group-hover:scale-125 transition-transform text-2xl"></i> New Stage
        </button>
      </div>
    </div>
  `;

  // Control fixed root arrows
  setTimeout(() => {
    const wrap = document.getElementById('phases-wrapper');
    const l = document.getElementById('ctrl-scroll-left');
    const r = document.getElementById('ctrl-scroll-right');
    if (!wrap || !l || !r) return;

    l.style.display = 'flex';
    r.style.display = 'flex';

    let move;
    l.onmouseenter = () => { move = setInterval(() => { wrap.scrollLeft -= 15; updateArrows(); }, 16); };
    r.onmouseenter = () => { move = setInterval(() => { wrap.scrollLeft += 15; updateArrows(); }, 16); };
    [l, r].forEach(btn => btn.onmouseleave = () => clearInterval(move));

    function updateArrows() {
      if(!wrap || !l || !r) return;
      const atStart = wrap.scrollLeft <= 20;
      const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 20;
      
      l.style.opacity = atStart ? '0' : '0.7';
      l.style.pointerEvents = atStart ? 'none' : 'auto';
      r.style.opacity = atEnd ? '0' : '0.7';
      r.style.pointerEvents = atEnd ? 'none' : 'auto';
    }
    wrap.onscroll = updateArrows;
    window.onresize = updateArrows;
    updateArrows();
  }, 300);

  initDragAndDrop();
}

function initDragAndDrop() {
  let draggedId = null;
  let draggedFaseId = null;

  document.querySelectorAll('.campo-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedId = card.dataset.id;
      draggedFaseId = card.dataset.faseid;
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('opacity-50', 'scale-95');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('opacity-50', 'scale-95');
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      const currentFaseId = card.dataset.faseid;
      if (currentFaseId === draggedFaseId) {
        card.classList.add('border-tealAccent');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('border-tealAccent');
    });

    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      card.classList.remove('border-tealAccent');
      
      const targetId = card.dataset.id;
      const targetFaseId = card.dataset.faseid;

      if (draggedId && targetId !== draggedId && draggedFaseId === targetFaseId) {
        // Reorder in same fase
        const phaseCampos = state.campos.filter(c => c.fase_id === targetFaseId);
        const draggedIdx = phaseCampos.findIndex(c => c.id === draggedId);
        const targetIdx = phaseCampos.findIndex(c => c.id === targetId);
        
        const newOrder = [...phaseCampos];
        const [moved] = newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, moved);

        await reorderAdminCampos(targetFaseId, newOrder.map(c => c.id));
        await loadData();
        renderView();
      }
    });
  });
}

async function showWorkerDetail(id) {
    const workers = await getAdminWorkers();
    const usr = workers.find(u => u.id === id);
    if (!usr) return;

    const initials = usr.initials || (usr.nombre ? usr.nombre[0] : '?');

    // Fill Modal
    document.getElementById('det-usr-nombre').textContent = usr.nombre || '-';
    document.getElementById('det-usr-apellido').textContent = usr.apellido || '-';
    document.getElementById('det-usr-email').textContent = usr.email || '-';
    document.getElementById('det-usr-rol').textContent = usr.rol || '-';
    document.getElementById('det-usr-dept').textContent = usr.department || 'Grupo Renew';
    document.getElementById('det-usr-tel').textContent = usr.telefono || '-';

    const avatarBox = document.getElementById('det-usr-avatar');
    if (usr.foto) {
        avatarBox.style.backgroundImage = `url(${usr.foto})`;
        avatarBox.innerHTML = '';
    } else {
        avatarBox.style.backgroundImage = 'none';
        avatarBox.innerHTML = `<span class="text-6xl text-gray-200 font-black">${initials}</span>`;
    }

    if(UI.btnEditFromDetail) UI.btnEditFromDetail.dataset.id = id;

    showModal(UI.modUsrDetail);
}

init();
