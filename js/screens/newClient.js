/* ============================================================
   RENEW SOLAR – screens/newClient.js 
   (DYNAMIC DATA-DRIVEN RENDERER)
   ============================================================ */
import { navigate, getCurrentUser } from '../app.js';
import { showToast } from '../components/toast.js';
import { 
  getPipelineByName, 
  getFasesByPipeline, 
  getCamposByFase, 
  createDynamicDeal,
  getClientesMaestro
} from '../api.js';

let selectedClientId = null;

export async function renderNewClient() {
  const screen = document.getElementById('screen-new-client');
  const activeUnit = localStorage.getItem('active_unit') || 'Renew Solar';

  // SKELETON LOADER
  screen.innerHTML = `
    <div class="screen-header slide-in-right">
      <button class="back-btn" id="nc-back-btn" aria-label="Volver">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h2>Cargando Formulario...</h2>
    </div>
    <div class="form-body padding-bottom">
      <div class="skeleton" style="height:200px;border-radius:16px;margin-bottom:24px"></div>
    </div>
  `;
  document.getElementById('nc-back-btn').addEventListener('click', () => navigate('dashboard'));

  try {
    // 1. Fetch Configuration for current Ecosystem
    const pipeline = await getPipelineByName(activeUnit);
    const fases = await getFasesByPipeline(pipeline.id);
    const faseActual = fases[0];
    
    if (!faseActual) throw new Error("Este ecosistema no tiene fases configuradas aún.");
    
    // 2. Fetch specific fields for this Fase
    const campos = await getCamposByFase(faseActual.id);

    // 3. Build UI
    buildDynamicForm(screen, pipeline, faseActual, campos);

  } catch (err) {
    showToast(err.message, 'error');
    screen.querySelector('h2').textContent = "Error";
  }
}

function buildDynamicForm(screen, pipeline, faseActual, campos) {
  // Generate Dynamic HTML Blocks based on config
  const camposHtml = campos.map((c, index) => {
    let inputHtml = "";
    const delay = 0.05 * index;
    
    if (c.tipo === 'Desplegable') {
      const opts = c.opciones.split(',').map(o => `<option value="${o.trim()}">${o.trim()}</option>`).join('');
      inputHtml = `<select id="dyn_${c.id}"><option value="" disabled selected>Selecciona...</option>${opts}</select>`;
    } else if (c.tipo === 'Archivo') {
      inputHtml = `<input type="file" id="dyn_${c.id}" />`;
    } else if (c.tipo === 'Número') {
      inputHtml = `<input type="number" id="dyn_${c.id}" placeholder="0" />`;
    } else {
      inputHtml = `<input type="text" id="dyn_${c.id}" placeholder="Texto..." />`;
    }

    // Wrap the dynamic input
    if (c.tipo === 'Archivo') {
      return `
        <div class="upload-area slide-in-bottom" id="upload-box-${c.id}" style="animation-delay:${delay}s; margin-bottom:16px;">
          ${inputHtml}
          <div class="upload-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg></div>
          <p id="label-${c.id}" style="font-size:0.75rem">${c.etiqueta}</p>
        </div>
      `;
    }

    return `
      <div class="field-group slide-in-bottom" style="animation-delay:${delay}s">
        <label>${c.etiqueta}</label>
        <div class="input-wrap ${c.tipo === 'Desplegable' ? 'select-wrap' : ''} no-icon">
          ${inputHtml}
        </div>
      </div>
    `;
  }).join('');

  screen.innerHTML = `
    <div class="screen-header slide-in-right">
      <button class="back-btn" id="nc-back-btn" aria-label="Volver">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h2 style="font-size:1.1rem">${pipeline.nombre}</h2>
    </div>

    <div class="form-body" style="padding-bottom:100px">
      
      <!-- FIXED CORE: CLIENTE MAESTRO (CON BUSCADOR RELACIONAL) -->
      <div class="form-card slide-in-right">
        <div class="form-card-header" style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${pipeline.color}" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <h3 style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">Datos del Cliente</h3>
        </div>

        <div id="mode-search" style="display:block">
          <div class="field-group">
            <div class="input-wrap no-icon">
              <input type="search" id="nc-search" placeholder="Buscar por nombre o teléfono..." autocomplete="off" />
            </div>
          </div>
          <div id="search-results" style="max-height:220px; overflow-y:auto; border-radius:8px; margin-bottom:16px; background:var(--surface);"></div>
          
          <div id="selected-client-preview" style="display:none; padding:16px; border:1px solid ${pipeline.color}; background:${pipeline.color}08; border-radius:12px; margin-bottom:16px;">
             <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
               <p style="font-size:0.7rem; color:${pipeline.color}; font-weight:800; text-transform:uppercase; letter-spacing:0.5px">Cliente Seleccionado ✓</p>
               <button id="btn-clear-client" style="background:var(--surface-alt); border:none; color:var(--text-muted); width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1rem">&times;</button>
             </div>
             <div style="display:flex; gap:12px; align-items:center;">
               <div id="sc-foto-preview" style="width:50px; height:50px; border-radius:10px; background:var(--surface-alt); background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; overflow:hidden; border:1px solid var(--border)">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
               </div>
               <div style="flex:1">
                 <p id="sc-nombre" style="font-weight:700; color:var(--text-primary); margin:0; font-size:1rem"></p>
                 <p id="sc-tel" style="font-size:0.85rem; color:var(--text-secondary); margin:0"></p>
               </div>
             </div>
             <div id="sc-details-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:14px; padding-top:12px; border-top:1px dashed var(--border);">
               <div><p style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:2px">State ID</p><p id="sc-state" style="font-size:0.8rem; font-weight:600; color:var(--text-primary); margin:0">-</p></div>
               <div><p style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:2px">DOB</p><p id="sc-dob" style="font-size:0.8rem; font-weight:600; color:var(--text-primary); margin:0">-</p></div>
               <div style="grid-column: span 2"><p style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:2px">Empresa/Estado</p><p id="sc-empresa-est" style="font-size:0.8rem; font-weight:600; color:var(--text-primary); margin:0">-</p></div>
               <div style="grid-column: span 2"><p style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:2px">Dirección</p><p id="sc-dir" style="font-size:0.8rem; font-weight:500; color:var(--text-primary); margin:0">-</p></div>
             </div>
          </div>
        </div>
      </div>

      <!-- DYNAMIC CARD: GENERADA POR ADMIN -->
      <div class="form-card slide-in-right" style="animation-delay:0.1s; margin-bottom:16px">
        <div class="form-card-header" style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--border)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${pipeline.color}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          <h3 style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">${faseActual.nombre} (Dinámico)</h3>
        </div>

        ${camposHtml || '<p style="color:var(--text-muted);font-size:0.8rem">No se configuraron campos para esta fase.</p>'}
      </div>

      <button class="btn btn-primary slide-in-right" id="btn-submit" style="width:100%; height:56px; font-size:1.05rem; box-shadow:0 8px 24px ${pipeline.color}40; background:${pipeline.color}; animation-delay:0.2s">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Guardar Pipeline y Enviar
      </button>

    </div>

    <!-- MODAL CUSTOM MOBILE: NUEVO CLIENTE (BITRIX) -->
    <div id="modal-add-client-mobile" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(8px); z-index:999; justify-content:center; align-items:flex-end">
      <div style="background:var(--surface); width:100%; border-radius:28px 28px 0 0; padding:0; max-height:92vh; overflow-y:auto; box-shadow:0 -10px 40px rgba(0,0,0,0.2); animation: sheetUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;">
        <div style="position:sticky; top:0; background:var(--surface); padding:20px 24px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; z-index:2; border-radius:28px 28px 0 0;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin:0">Nuevo Cliente</h3>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:2px">Completa los campos de Bitrix24</p>
          </div>
          <button id="btn-close-modal-nc" style="background:var(--surface-alt); border:none; color:var(--text-secondary); width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; cursor:pointer">&times;</button>
        </div>

        <div style="padding:24px 20px 120px 20px;">
          <div class="field-group"><label style="color:var(--text-secondary)">State ID</label><div class="input-wrap no-icon"><input type="text" id="nc-state" placeholder="ID del Estado..." style="background:var(--bg)" /></div></div>
          
          <div style="display:flex; gap:16px">
             <div class="field-group" style="flex:1"><label style="color:var(--text-secondary)">Nombre *</label><div class="input-wrap no-icon"><input type="text" id="nc-nombre" placeholder="First Name" style="background:var(--bg)" /></div></div>
             <div class="field-group" style="flex:1"><label style="color:var(--text-secondary)">Apellido *</label><div class="input-wrap no-icon"><input type="text" id="nc-apellido" placeholder="Last Name" style="background:var(--bg)" /></div></div>
          </div>
          
          <div class="field-group">
            <label style="color:var(--text-secondary)">Foto / ID Image</label>
            <div class="upload-area" id="nc-foto-box" style="margin-bottom:16px; border-style:dashed; border-width:2px; padding:20px; text-align:center; min-height:100px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--bg)">
              <input type="file" id="nc-foto" accept="image/*" style="opacity:0; position:absolute; width:1px; height:1px;" />
              <div id="nc-foto-preview-modal" style="display:none; width:100%; height:120px; border-radius:12px; object-fit:cover; margin-bottom:10px; background-size:cover; background-position:center;"></div>
              <div class="upload-icon" id="nc-foto-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg></div>
              <p id="label-foto-nc" style="font-size:0.85rem; font-weight:700; color:${pipeline.color}; margin-top:8px;">Subir Foto del Cliente</p>
              <p style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">Capture ID o Photo Face</p>
            </div>
          </div>
          
          <div class="field-group"><label style="color:var(--text-secondary)">Date of birth</label><div class="input-wrap no-icon"><input type="date" id="nc-dob" style="color:var(--text-primary); background:var(--bg); border:1.5px solid var(--border); width:100%; padding:14px; border-radius:10px" /></div></div>
          
          <div style="display:flex; gap:16px">
            <div class="field-group" style="flex:1"><label style="color:var(--text-secondary)">Teléfono *</label><div class="input-wrap no-icon"><input type="tel" id="nc-telefono" placeholder="+1 555-5555" style="background:var(--bg)" /></div></div>
            <div class="field-group" style="flex:1"><label style="color:var(--text-secondary)">E-mail</label><div class="input-wrap no-icon"><input type="email" id="nc-email" placeholder="correo@email.com" style="background:var(--bg)" /></div></div>
          </div>
          
          <div class="field-group"><label style="color:var(--text-secondary)">Address</label><div class="input-wrap no-icon"><input type="text" id="nc-direccion" placeholder="Dirección completa" style="background:var(--bg)" /></div></div>
          <div class="field-group"><label style="color:var(--text-secondary)">Empresa</label><div class="input-wrap no-icon"><input type="text" id="nc-empresa" placeholder="Empresa asociada..." style="background:var(--bg)" /></div></div>
          
          <div class="field-group">
            <label style="color:var(--text-secondary)">Estado del Cliente</label>
            <div class="input-wrap select-wrap no-icon">
              <select id="nc-estado" style="background:var(--bg)">
                <option value="Not selected">Not selected</option>
                <option value="Lead" selected>Lead</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Completado">Completado</option>
              </select>
            </div>
          </div>

          <button class="btn btn-primary" id="btn-save-nc-modal" style="width:100%; height:56px; font-size:1.1rem; border-radius:14px; margin-top:20px; background:${pipeline.color}; box-shadow:0 8px 20px ${pipeline.color}40">Guardar Cliente</button>
        </div>
      </div>
    </div>
  `;

  // Attach Listeners
  document.getElementById('nc-back-btn').addEventListener('click', () => navigate('dashboard'));
  document.getElementById('btn-submit').addEventListener('click', () => handleSubmit(pipeline.nombre, campos));

  // Buscador Relacional Logic
  const modeSearch = document.getElementById('mode-search');
  const searchInput = document.getElementById('nc-search');
  const searchResults = document.getElementById('search-results');
  const previewBox = document.getElementById('selected-client-preview');
  
  // Modal Variables
  const modalNC = document.getElementById('modal-add-client-mobile');
  const btnCloseModal = document.getElementById('btn-close-modal-nc');
  const btnSaveModal = document.getElementById('btn-save-nc-modal');

  selectedClientId = null; // Reset on load

  document.getElementById('btn-clear-client').addEventListener('click', () => {
    selectedClientId = null;
    previewBox.style.display = 'none';
    searchInput.value = '';
    searchResults.style.display = 'block';
  });

  searchInput.addEventListener('input', async (e) => {
    const term = e.target.value.toLowerCase().trim();
    // Always append the "add new" button logic at the end
    const addNewBtnHTML = `
      <div id="btn-open-modal-from-search" style="padding:14px; background:var(--surface-alt); cursor:pointer; color:${pipeline.color}; font-weight:700; text-align:center; transition:background 0.2s; display:flex; justify-content:center; align-items:center; gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Agregar Nuevo Cliente
      </div>
    `;

    if(term.length < 2) { 
      searchResults.style.display = 'block';
      searchResults.innerHTML = addNewBtnHTML;
      attachAddNewListener();
      return; 
    }
    
    const dbClientes = await getClientesMaestro();
    const hits = dbClientes.filter(c => c.nombre.toLowerCase().includes(term) || c.telefono.includes(term));
    
    if(hits.length === 0) {
      searchResults.innerHTML = `
        <div style="padding:20px; text-align:center;">
          <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:12px">No se encontraron clientes para "${term}".</p>
          ${addNewBtnHTML}
        </div>
      `;
      attachAddNewListener();
      return;
    }

    searchResults.innerHTML = hits.map(h => `
      <div class="search-hit" data-id="${h.id}" style="padding:14px; border-bottom:1px solid var(--border); background:var(--surface); cursor:pointer">
        <div style="display:flex; gap:12px; align-items:center;">
          <div style="width:40px; height:40px; border-radius:8px; background:var(--surface-alt); background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; overflow:hidden">
            ${h.foto ? `<img src="${h.foto}" style="width:100%; height:100%; object-fit:cover;" />` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
          </div>
          <div>
            <p style="font-weight:700; color:var(--text-primary); font-size:0.95rem; margin:0">${h.nombre}</p>
            <p style="color:var(--text-secondary); font-size:0.8rem; margin:0">${h.telefono}</p>
          </div>
        </div>
      </div>
    `).join('') + addNewBtnHTML;
    
    attachAddNewListener();
  });

  function attachAddNewListener() {
    const btnNew = document.getElementById('btn-open-modal-from-search');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        // Reset modal fields
        modalNC.querySelectorAll('input').forEach(i => i.value = '');
        modalNC.querySelector('select').value = 'Lead';
        modalNC.style.display = 'flex';
      });
    }
  }

  // Ensure modal opens if they focus empty search bar naturally
  searchInput.addEventListener('focus', () => {
    if (!searchInput.value.trim() && searchResults.innerHTML === '') {
       searchInput.dispatchEvent(new Event('input'));
    }
  });

  searchResults.addEventListener('click', async (e) => {
    const hit = e.target.closest('.search-hit');
    if(hit) {
      const dbClientes = await getClientesMaestro();
      const client = dbClientes.find(c => c.id === hit.dataset.id);
      if (client) {
        selectedClientId = client.id;
        document.getElementById('sc-nombre').textContent = client.nombre;
        document.getElementById('sc-tel').textContent = client.telefono;
        document.getElementById('sc-state').textContent = client.state_id || '-';
        document.getElementById('sc-dob').textContent = client.dob || '-';
        document.getElementById('sc-empresa-est').textContent = `${client.empresa || '-'} | ${client.estado || 'Lead'}`;
        document.getElementById('sc-dir').textContent = client.direccion || '-';
        
        const previewFoto = document.getElementById('sc-foto-preview');
        if (client.foto) {
          previewFoto.style.backgroundImage = `url(${client.foto})`;
          previewFoto.innerHTML = '';
        } else {
          previewFoto.style.backgroundImage = 'none';
          previewFoto.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        }

        previewBox.style.display = 'block';
        searchResults.style.display = 'none';
        searchInput.value = '';
      }
    }
  });

  // Photo Input UI Logic for the Modal
  const inputModalFoto = document.getElementById('nc-foto');
  const areaModalFoto = document.getElementById('nc-foto-box');
  const labelModalFoto = document.getElementById('label-foto-nc');
  const previewModalFoto = document.getElementById('nc-foto-preview-modal');
  const iconModalFoto = document.getElementById('nc-foto-icon');

  let base64Photo = null;

  if (areaModalFoto) {
    areaModalFoto.addEventListener('click', () => inputModalFoto.click());
  }

  if (inputModalFoto) {
    inputModalFoto.addEventListener('change', async () => {
      if (inputModalFoto.files.length) {
        const file = inputModalFoto.files[0];
        base64Photo = await readFileAsBase64(file);
        
        areaModalFoto.style.borderColor = pipeline.color;
        areaModalFoto.style.background = pipeline.color + '05';
        
        previewModalFoto.style.backgroundImage = `url(${base64Photo})`;
        previewModalFoto.style.display = 'block';
        iconModalFoto.style.display = 'none';
        
        labelModalFoto.textContent = "¡Foto Cargada!";
        labelModalFoto.style.color = pipeline.color;
      }
    });
  }

  // Modal Save Logic
  btnCloseModal.addEventListener('click', () => modalNC.style.display = 'none');
  btnSaveModal.addEventListener('click', () => {
    const state_id = document.getElementById('nc-state').value.trim();
    const firstNom = document.getElementById('nc-nombre').value.trim();
    const apellido = document.getElementById('nc-apellido').value.trim();
    const dob = document.getElementById('nc-dob').value;
    const tel = document.getElementById('nc-telefono').value.trim();
    const email = document.getElementById('nc-email').value.trim();
    const dir = document.getElementById('nc-direccion').value.trim();
    const empresa = document.getElementById('nc-empresa').value.trim();
    const estado = document.getElementById('nc-estado').value;

    if (!firstNom || !apellido || tel.length < 5) {
      showToast("Nombre, Apellido y Teléfono son obligatorios.", "error"); return;
    }
    
    const fullNombre = `${firstNom} ${apellido}`.trim();

    const sysDb = JSON.parse(localStorage.getItem('rs_admin_db'));
    sysDb.Counters.cli = (sysDb.Counters.cli || 0) + 1;
    const newId = 'cli_' + sysDb.Counters.cli;
    const newClient = {
      id: newId, 
      nombre: fullNombre, 
      email: email || 'Sin Email', 
      telefono: tel, 
      direccion: dir || "Pendiente", 
      zip: "Pendiente",
      state_id, dob, empresa, estado,
      foto: base64Photo
    };
    sysDb.Clientes_Maestro.push(newClient);
    localStorage.setItem('rs_admin_db', JSON.stringify(sysDb));

    // Update UI and select it
    selectedClientId = newId;
    document.getElementById('sc-nombre').textContent = fullNombre;
    document.getElementById('sc-tel').textContent = newClient.telefono;
    document.getElementById('sc-state').textContent = state_id || '-';
    document.getElementById('sc-dob').textContent = dob || '-';
    document.getElementById('sc-empresa-est').textContent = `${empresa || '-'} | ${estado}`;
    document.getElementById('sc-dir').textContent = dir || '-';
    
    const previewFoto = document.getElementById('sc-foto-preview');
    if (base64Photo) {
      previewFoto.style.backgroundImage = `url(${base64Photo})`;
      previewFoto.innerHTML = '';
    } else {
      previewFoto.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }

    modalNC.style.display = 'none';
    previewBox.style.display = 'block';
    searchResults.style.display = 'none';
    searchInput.value = '';
    base64Photo = null; // Clean up
    
    showToast(`Cliente ${fullNombre} creado correctamente`, 'success');
  });

  // Dynamic file handling (read as base64)
  const fileAnswers = {};
  campos.filter(c => c.tipo === 'Archivo').forEach(c => {
    const input = document.getElementById(`dyn_${c.id}`);
    const area = document.getElementById(`upload-box-${c.id}`);
    const label = document.getElementById(`label-${c.id}`);
    
    if (area) {
      area.addEventListener('click', () => input.click());
    }

    if (input) {
      input.addEventListener('change', async () => {
        if (input.files.length) {
          const file = input.files[0];
          fileAnswers[c.id] = await readFileAsBase64(file);
          
          area.classList.add('has-file');
          area.style.borderColor = pipeline.color;
          area.style.background = pipeline.color + '10';
          label.textContent = "Documento Listo ✓";
          label.style.color = pipeline.color;
          label.style.fontWeight = '700';
        }
      });
    }
  });

  window.handleSubmit = async (pipelineName, camposConfig) => {
    if (!selectedClientId) {
      showToast("Por favor, selecciona un cliente.", "error"); return;
    }
    
    const btn = document.getElementById('btn-submit');
    btn.classList.add('loading'); btn.innerHTML = '';

    const respuestas = {};
    for(const c of camposConfig) {
      const el = document.getElementById(`dyn_${c.id}`);
      if(c.tipo === 'Archivo') {
         respuestas[c.id] = fileAnswers[c.id] || "No proporcionado";
      } else {
         respuestas[c.id] = el.value.trim() || "-";
      }
    }

    try {
      const user = getCurrentUser();
      await createDynamicDeal({
        cliente_id: selectedClientId,
        respuestas: respuestas,
        pipelineName: pipelineName,
        responsable_id: user.id
      });

      showToast(`Pipeline ${pipelineName} creado exitosamente`, 'success');
      setTimeout(() => navigate('dashboard'), 800);
    } catch(err) {
      showToast(err.message, 'error');
      btn.classList.remove('loading');
      btn.innerHTML = `Guardar Pipeline y Enviar`;
    }
  };
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
