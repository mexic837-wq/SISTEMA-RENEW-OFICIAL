/* ============================================================
   RENEW SOLAR – screens/projectDetail.js
   Screen 4: Vista Dinámica "Camaleón" del Proyecto
   ============================================================ */
import { getDealById, advanceDealPhase, formatDate } from '../api.js';
import { showToast } from '../components/toast.js';
import { navigate, getCurrentUser } from '../app.js';

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function renderDetail(dealId) {
  const screen = document.getElementById('screen-detail');

  screen.innerHTML = `
    <div class="screen-header slide-in-left">
      <button class="back-btn" id="pd-back-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
      <h2>Cargando...</h2>
    </div>
    <div style="padding:24px 16px">
      <div class="skeleton" style="height:100px;border-radius:16px;margin-bottom:16px"></div>
      <div class="skeleton" style="height:150px;border-radius:16px"></div>
    </div>
  `;

  document.getElementById('pd-back-btn').addEventListener('click', () => navigate('dashboard'));

  try {
    const deal = await getDealById(dealId);
    // Fetch deep config
    const db = JSON.parse(localStorage.getItem('rs_admin_db'));
    const pipeline = db.Admin_Pipelines.find(p => p.id === deal.pipeline_id);
    const fases = db.Admin_Fases.filter(f => f.pipeline_id === pipeline.id).sort((a,b) => a.orden - b.orden);
    const curFidx = fases.findIndex(f => f.id === deal.fase_id);
    const nextFase = fases[curFidx]; // The current phase we are viewing is mathematically the NEXT phase if no answers exist, but for simplicity we treat it as the "Active Edit Phase"
    const isCompleted = curFidx === -1 || curFidx === fases.length;

    buildDetailView(screen, deal, pipeline, fases, curFidx, db);
  } catch (err) {
    showToast(err.message, 'error');
    screen.querySelector('h2').textContent = 'Error';
  }
}

function buildDetailView(screen, deal, pipeline, fases, curFidx, db) {
  const isCompleted = curFidx === -1;
  const currentFaseObj = isCompleted ? fases[fases.length - 1] : fases[curFidx];

  screen.innerHTML = `
    <div class="screen-header slide-in-left" style="background:${pipeline.color}; border:none">
      <button class="back-btn" id="pd-back-btn2" style="color:#fff; background:rgba(255,255,255,0.2)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h2 style="color:#fff">${deal.nombre_cliente}</h2>
      <span class="badge" style="margin-left:auto; background:#fff; color:${pipeline.color}; font-weight:800">${isCompleted ? 'Completado' : currentFaseObj.nombre}</span>
    </div>

    <!-- Dynamic Progress Bar -->
    <div class="progress-section" style="margin-top:0; border-radius:0 0 24px 24px; box-shadow:0 8px 16px rgba(0,0,0,0.1)">
      <div class="progress-steps" style="padding-top:16px; overflow-x:auto; display:flex; flex-wrap:nowrap; -webkit-overflow-scrolling:touch; padding-bottom:20px; gap:8px">
        ${fases.map((f, i) => `
          <div class="progress-step ${isCompleted || i < curFidx ? 'done' : i === curFidx ? 'active' : ''}" style="min-width: 90px; flex: 0 0 auto;">
            <div class="step-circle" style="${isCompleted || i < curFidx ? `background:${pipeline.color}; border-color:${pipeline.color}` : (i === curFidx ? `border-color:${pipeline.color}; color:${pipeline.color}` : '')}">
              ${isCompleted || i < curFidx
                ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
                : (i + 1)}
            </div>
            <div class="step-label" style="white-space:normal; line-height:1.2">${f.nombre}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <!-- Main Content Wrapper -->
    <div style="padding: 16px; padding-bottom: 40px;">
      <!-- Core Info Card -->
    <div class="info-card slide-in-bottom" style="margin-top:24px; padding:20px; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05)">
      <h3 style="font-size:0.85rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:16px; font-weight:700; letter-spacing:0.5px">Datos de Contacto Central</h3>
      <div style="display:flex; flex-direction:column; gap:16px; background:var(--surface-alt); padding:20px; border-radius:12px; border:1px solid var(--border)">
        <div style="display:flex; flex-direction:column; gap:4px">
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600">Email</span>
          <span style="font-size:0.95rem; font-weight:600; color:var(--text-primary); word-break:break-all">${deal.email || 'N/A'}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px">
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600">Teléfono</span>
          <span style="font-size:0.95rem; font-weight:700; color:${pipeline.color}; word-break:break-all">${deal.telefono}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px">
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600">Dirección</span>
          <span style="font-size:0.95rem; font-weight:500; color:var(--text-primary); word-break:break-all; line-height:1.4">${deal.direccion}</span>
        </div>
      </div>
    </div>

    <!-- Active Form Phase Renderer (Camaleón) -->
    <div id="dynamic-action-section"></div>

    <!-- Comentarios (Native Internal Chat) -->
    <div class="info-card slide-in-bottom" style="margin-bottom:120px; margin-top:24px; padding:20px; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05)">
      <h3 style="font-size:0.85rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:16px; font-weight:700; letter-spacing:0.5px">Discusión Interna</h3>
      <div style="background:var(--surface-alt); border-radius:12px; padding:16px; font-size:0.85rem; color:var(--text-muted); font-style:italic; border:1px solid var(--border)">
        No hay comentarios aún.
      </div>
      <div style="display:flex; gap:8px; margin-top:16px">
        <div class="input-wrap no-icon" style="flex:1; margin-bottom:0px;">
          <input type="text" placeholder="@menciona a alguien..." style="height:48px;" />
        </div>
        <button class="btn btn-primary" style="background:${pipeline.color}; padding:0 20px; height:48px; border-radius:12px">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      </div>
    </div>
  `;

  document.getElementById('pd-back-btn2').addEventListener('click', () => navigate('dashboard'));

  // Render Action
  renderDynamicAction(deal, pipeline, fases, curFidx, db);
}

function renderDynamicAction(deal, pipeline, fases, curFidx, db) {
  const container = document.getElementById('dynamic-action-section');
  if (curFidx === -1) {
    container.innerHTML = `
      <div class="form-card slide-in-bottom" style="background:${pipeline.color}10; border:1px solid ${pipeline.color}30">
        <div class="flex items-center gap-4">
          <div class="bg-[${pipeline.color}] text-white w-12 h-12 flex items-center justify-center rounded-full shadow-lg">
            <i class="fa-solid fa-check text-xl"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold" style="color:${pipeline.color}">¡Proyecto Finalizado!</h3>
            <p class="text-sm text-gray-600">Todas las fases han sido procesadas.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const actFase = fases[curFidx];
  const campos = db.Admin_Campos_Formulario.filter(c => c.fase_id === actFase.id);

  if (!campos.length) {
    container.innerHTML = `
      <div class="form-card slide-in-bottom">
        <div class="flex items-center gap-4 mb-4">
          <div class="bg-gray-100 text-gray-500 w-12 h-12 flex items-center justify-center rounded-full"><i class="fa-solid fa-hourglass-half text-xl"></i></div>
          <div>
            <h3 class="text-lg font-bold text-gray-800">Fase en espera</h3>
            <p class="text-sm text-gray-600">No hay acciones requeridas. Avanzar fase.</p>
          </div>
        </div>
        <button class="w-full bg-[${pipeline.color}] text-white font-bold py-3 rounded-xl shadow-lg hover:opacity-90 transition-opacity" id="btn-advance-empty">Avanzar a la Siguiente Fase</button>
      </div>`;
      
    document.getElementById('btn-advance-empty').addEventListener('click', async () => submitPhase(deal.id, {}, pipeline.nombre));
    return;
  }

  const inputsHtml = campos.map(c => {
    let html = '';
    if(c.tipo === 'Desplegable') {
       const opts = c.opciones.split(',').map(o => `<option value="${o.trim()}">${o.trim()}</option>`).join('');
       html = `<div class="input-wrap select-wrap no-icon"><select id="df_${c.id}"><option disabled selected>Elegir...</option>${opts}</select></div>`;
    } else if (c.tipo === 'Archivo') {
       let textLabel = c.etiqueta.toLowerCase().includes('subir') ? c.etiqueta : `Subir ${c.etiqueta}`;
       html = `
        <div class="upload-area" id="ubox_${c.id}" style="margin-bottom:16px;">
          <input type="file" id="df_${c.id}" />
          <div class="upload-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg></div>
          <p id="ulbl_${c.id}" style="font-size:0.75rem; font-weight:600">${textLabel}</p>
        </div>
       `;
    } else {
       html = `<div class="input-wrap no-icon"><input type="${c.tipo==='Número'?'number':'text'}" id="df_${c.id}" class="w-full" placeholder="${c.etiqueta}..."></div>`;
    }
    return c.tipo === 'Archivo' ? html : `<div class="field-group"><label>${c.etiqueta}</label>${html}</div>`;
  }).join('');

  container.innerHTML = `
    <div class="form-card slide-in-bottom border-l-4" style="border-left-color:${pipeline.color}; padding-top:24px; padding-bottom:24px; border-radius:16px;">
      <h3 class="text-lg font-bold text-gray-800 mb-2">Acción: Llenar ${actFase.nombre}</h3>
      <p class="text-xs text-gray-500 mb-6">Completa esta información para avanzar a la siguiente etapa.</p>
      
      ${inputsHtml}

      <button id="btn-dyn-submit" class="btn btn-primary slide-in-right" style="width:100%; height:56px; font-size:1.05rem; box-shadow:0 8px 24px ${pipeline.color}40; background:${pipeline.color}; margin-top:20px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:8px"><polyline points="20 6 9 17 4 12"/></svg>
        Finalizar Fase y Enviar
      </button>
    </div>
  `;

  const fileAnswers = {};

  document.getElementById('btn-dyn-submit').addEventListener('click', () => {
    const resp = {};
    for (const c of campos) {
      const el = document.getElementById(`df_${c.id}`);
      if (c.tipo === 'Archivo') {
        resp[c.id] = fileAnswers[c.id] || "No subido";
      } else {
        resp[c.id] = el.value.trim() || "No provisto";
      }
    }
    document.getElementById('btn-dyn-submit').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Espere...';
    submitPhase(deal.id, resp, actFase.nombre);
  });

  // Attach UI listeners strictly to dynamically generated file fields
  setTimeout(() => {
    campos.filter(c => c.tipo === 'Archivo').forEach(c => {
      const input = document.getElementById(`df_${c.id}`);
      const area = document.getElementById(`ubox_${c.id}`);
      const label = document.getElementById(`ulbl_${c.id}`);
      if(input) {
        input.addEventListener('change', async () => {
          if (input.files.length) {
            fileAnswers[c.id] = await readFileAsBase64(input.files[0]);
            area.classList.add('has-file');
            area.style.borderColor = pipeline.color;
            area.style.background = pipeline.color + '15';
            label.textContent = "¡Carga Lista! ✓";
            label.style.color = pipeline.color;
          }
        });
      }
    });
  }, 100);
}

async function submitPhase(dealId, resp, faseNombre) {
  try {
    const res = await advanceDealPhase(dealId, resp);
    showToast(`¡${faseNombre} completada! Datos enviados.`, 'success');
    setTimeout(() => {
      if (res.isCompletado) navigate('dashboard');
      else renderDetail(dealId); // Recursively render next phase
    }, 1000);
  } catch(e) {
    showToast(e.message, 'error');
  }
}
