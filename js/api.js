/* ============================================================
   RENEW SOLAR – api.js (DYNAMIC DATA-DRIVEN ARCHITECTURE)
   ============================================================ */

const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── LOCAL STORAGE DB SEEDING ────────────────────────────────
function initDB() {
  if (!localStorage.getItem('rs_admin_db')) {
    const defaultData = {
      Admin_Pipelines: [
        { id: 'pip_solar', nombre: 'Renew Solar', icono: 'sun', color: '#0d9488' },
        { id: 'pip_water', nombre: 'Renew Water', icono: 'droplet', color: '#0284c7' }
      ],
      Admin_Fases: [
        // RENEW SOLAR PHASES (14)
        { id: 'fs1', pipeline_id: 'pip_solar', orden: 1, nombre: '1. Contrato / Foto Pack', rol_encargado: 'Vendedor' },
        { id: 'fs2', pipeline_id: 'pip_solar', orden: 2, nombre: '2. NTP / NOC', rol_encargado: 'Procesador' },
        { id: 'fs3', pipeline_id: 'pip_solar', orden: 3, nombre: '3. Site Survey', rol_encargado: 'Técnico' },
        { id: 'fs4', pipeline_id: 'pip_solar', orden: 4, nombre: '4. Llamada de Bienvenida', rol_encargado: 'Procesador' },
        { id: 'fs5', pipeline_id: 'pip_solar', orden: 5, nombre: '5. Diseños y Planos', rol_encargado: 'Diseñador' },
        { id: 'fs6', pipeline_id: 'pip_solar', orden: 6, nombre: '6. Permiso Utility', rol_encargado: 'Procesador' },
        { id: 'fs7', pipeline_id: 'pip_solar', orden: 7, nombre: '7. Permiso Condado', rol_encargado: 'Procesador' },
        { id: 'fs8', pipeline_id: 'pip_solar', orden: 8, nombre: '8. Permiso HOA', rol_encargado: 'Procesador' },
        { id: 'fs9', pipeline_id: 'pip_solar', orden: 9, nombre: '9. Instalación', rol_encargado: 'Técnico' },
        { id: 'fs10', pipeline_id: 'pip_solar', orden: 10, nombre: '10. Pago Comisión 80%', rol_encargado: 'Finanzas' },
        { id: 'fs11', pipeline_id: 'pip_solar', orden: 11, nombre: '11. Umbrella', rol_encargado: 'Procesador' },
        { id: 'fs12', pipeline_id: 'pip_solar', orden: 12, nombre: '12. Interconnect Agreement', rol_encargado: 'Procesador' },
        { id: 'fs13', pipeline_id: 'pip_solar', orden: 13, nombre: '13. PTO', rol_encargado: 'Procesador' },
        { id: 'fs14', pipeline_id: 'pip_solar', orden: 14, nombre: '14. Pago Comisión Total', rol_encargado: 'Finanzas' },
        
        // RENEW WATER PHASES
        { id: 'fw1', pipeline_id: 'pip_water', orden: 1, nombre: 'Fase 1: Análisis y Contrato', rol_encargado: 'Vendedor' }
      ],
      Admin_Campos_Formulario: [
        // RENEW SOLAR - FASE 1
        { id: 'cs1', fase_id: 'fs1', etiqueta: 'Financiera', tipo: 'Desplegable', opciones: 'LightReach,SkyLight,Goodleap,Dividend,Cash' },
        { id: 'cs2', fase_id: 'fs1', etiqueta: 'Foto ID del Cliente', tipo: 'Archivo', opciones: '' },
        { id: 'cs3', fase_id: 'fs1', etiqueta: 'Foto Bill Eléctrico', tipo: 'Archivo', opciones: '' },
        { id: 'cs4', fase_id: 'fs1', etiqueta: 'Screenshot Financiamiento', tipo: 'Archivo', opciones: '' },
        { id: 'cs5', fase_id: 'fs1', etiqueta: 'Screenshot Proyecto / Diseño', tipo: 'Archivo', opciones: '' },
        { id: 'cs6', fase_id: 'fs1', etiqueta: 'Screenshot Costo y Adders', tipo: 'Archivo', opciones: '' },
        { id: 'cs7', fase_id: 'fs1', etiqueta: 'Contrato Renew Firmado', tipo: 'Archivo', opciones: '' },
        
        // RENEW SOLAR - FASE 2
        { id: 'cs8', fase_id: 'fs2', etiqueta: 'Documento NTP', tipo: 'Archivo', opciones: '' },
        { id: 'cs9', fase_id: 'fs2', etiqueta: 'Documento Notariado (NOC)', tipo: 'Archivo', opciones: '' },
        
        // RENEW SOLAR - FASE 3
        { id: 'cs10', fase_id: 'fs3', etiqueta: 'Fotos de la Casa', tipo: 'Archivo', opciones: '' },
        { id: 'cs11', fase_id: 'fs3', etiqueta: 'Fotos del Techo', tipo: 'Archivo', opciones: '' },
        { id: 'cs12', fase_id: 'fs3', etiqueta: 'Fotos del Medidor', tipo: 'Archivo', opciones: '' },
        { id: 'cs13', fase_id: 'fs3', etiqueta: 'Fotos del MPU / Panel Eléctrico', tipo: 'Archivo', opciones: '' },

        // RENEW SOLAR - FASE 5
        { id: 'cs14', fase_id: 'fs5', etiqueta: 'Subir Planos Aprobados', tipo: 'Archivo', opciones: '' },

        // RENEW SOLAR - FASE 6
        { id: 'cs15', fase_id: 'fs6', etiqueta: 'Subir Permisos Utility/Condado', tipo: 'Archivo', opciones: '' },

        // RENEW SOLAR - FASE 8
        { id: 'cs16', fase_id: 'fs8', etiqueta: 'Nombre (HOA)', tipo: 'Texto', opciones: '' },
        { id: 'cs17', fase_id: 'fs8', etiqueta: 'Teléfono (HOA)', tipo: 'Texto', opciones: '' },
        { id: 'cs18', fase_id: 'fs8', etiqueta: 'Email (HOA)', tipo: 'Texto', opciones: '' },
        { id: 'cs19', fase_id: 'fs8', etiqueta: 'Carta Aprobación HOA', tipo: 'Archivo', opciones: '' },

        // RENEW SOLAR - FASE 9
        { id: 'cs20', fase_id: 'fs9', etiqueta: 'Fotos de Instalación', tipo: 'Archivo', opciones: '' },

        // RENEW SOLAR - FASE 11
        { id: 'cs21', fase_id: 'fs11', etiqueta: 'Documento Umbrella', tipo: 'Archivo', opciones: '' },
        { id: 'cs22', fase_id: 'fs11', etiqueta: 'Póliza de Seguro', tipo: 'Archivo', opciones: '' },
        
        // RENEW WATER - FASE 1
        { id: 'cw1', fase_id: 'fw1', etiqueta: 'Dureza del Agua (PPM)', tipo: 'Número', opciones: '' },
        { id: 'cw2', fase_id: 'fw1', etiqueta: 'Sistema Elegido', tipo: 'Desplegable', opciones: 'Ósmosis,Filtro Carbón,Descalcificador' },
        { id: 'cw3', fase_id: 'fw1', etiqueta: 'Fotos de la tubería', tipo: 'Archivo', opciones: '' },
      ],
      Clientes_Maestro: [
        { 
          id: 'cli_1', 
          nombre: 'Michael Chen', 
          email: 'michael@email.com', 
          telefono: '+1 305-555-0398', 
          direccion: '789 Brickell Ave, Miami', 
          zip: '33131',
          state_id: 'FL-837482',
          dob: '1985-06-15',
          empresa: 'Sunny Co.',
          estado: 'Lead',
          foto: null
        },
      ],
      Proyectos_Dinamicos: [
        { id: 'proy_1', cliente_id: 'cli_1', pipeline_id: 'pip_solar', fase_id: 'fs1', responsable_id: 'u3', fecha: '2026-03-20' },
      ],
      Respuestas_Dinamicas: [
        { id: 'resp_1', proyecto_id: 'proy_1', campo_id: 'cs1', valor: '180' },
        { id: 'resp_2', proyecto_id: 'proy_1', campo_id: 'cs2', valor: 'FPL' }
      ],
      Counters: { cli: 10, proy: 10, resp: 10, pip: 10, fase: 20, campo: 50 }
    };
    localStorage.setItem('rs_admin_db', JSON.stringify(defaultData));
    localStorage.setItem('rs_db_initialized', 'true');
  }
}
initDB();

function getDB() { return JSON.parse(localStorage.getItem('rs_admin_db')); }
function saveDB(db) { localStorage.setItem('rs_admin_db', JSON.stringify(db)); }
function genId(type, db) { db.Counters[type]++; return type + '_' + db.Counters[type]; }

// ─── SUPER ADMIN API (SETTINGS) ─────────────────────────────
export async function getAdminPipelines() { return getDB().Admin_Pipelines; }
export async function createAdminPipeline(nombre, color) {
  const db = getDB();
  const id = genId('pip', db);
  const p = { id, nombre, icono: 'circle', color: color || '#8b5cf6' };
  db.Admin_Pipelines.push(p);
  saveDB(db); return p;
}

export async function deleteAdminPipeline(pipelineId) {
  const db = getDB();
  db.Admin_Pipelines = db.Admin_Pipelines.filter(p => p.id !== pipelineId);
  const fasesToDelete = db.Admin_Fases.filter(f => f.pipeline_id === pipelineId).map(f => f.id);
  db.Admin_Fases = db.Admin_Fases.filter(f => f.pipeline_id !== pipelineId);
  db.Admin_Campos_Formulario = db.Admin_Campos_Formulario.filter(c => !fasesToDelete.includes(c.fase_id));
  saveDB(db);
}

export async function getAdminFases() { return getDB().Admin_Fases; }
export async function createAdminFase(pipeline_id, nombre, orden, rol_encargado = 'Vendedor') {
  const db = getDB();
  const id = genId('fase', db);
  const f = { id, pipeline_id, orden: Number(orden) || 1, nombre, rol_encargado };
  db.Admin_Fases.push(f);
  saveDB(db); return f;
}

export async function updateAdminFaseRole(faseId, nuevoRol) {
  const db = getDB();
  const fase = db.Admin_Fases.find(f => f.id === faseId);
  if (fase) {
    fase.rol_encargado = nuevoRol;
    saveDB(db);
  }
}

export async function deleteAdminFase(faseId) {
  const db = getDB();
  db.Admin_Fases = db.Admin_Fases.filter(f => f.id !== faseId);
  db.Admin_Campos_Formulario = db.Admin_Campos_Formulario.filter(c => c.fase_id !== faseId);
  saveDB(db);
}

export async function getAdminCampos() { return getDB().Admin_Campos_Formulario; }
export async function createAdminCampo(fase_id, etiqueta, tipo, opciones) {
  const db = getDB();
  const id = genId('campo', db);
  const c = { id, fase_id, etiqueta, tipo, opciones };
  db.Admin_Campos_Formulario.push(c);
  saveDB(db); return c;
}

export async function deleteAdminCampo(campoId) {
  const db = getDB();
  db.Admin_Campos_Formulario = db.Admin_Campos_Formulario.filter(c => c.id !== campoId);
  saveDB(db);
}

export async function reorderAdminCampos(faseId, newOrderIds) {
  const db = getDB();
  // Filter out fields for this phase
  const otherCampos = db.Admin_Campos_Formulario.filter(c => c.fase_id !== faseId);
  // Reconstruct this phase fields in order
  const phaseCampos = newOrderIds.map(id => db.Admin_Campos_Formulario.find(c => c.id === id)).filter(Boolean);
  
  db.Admin_Campos_Formulario = [...otherCampos, ...phaseCampos];
  saveDB(db);
}

export async function nukeAndResetDB() {
  localStorage.removeItem('rs_admin_db');
  localStorage.removeItem('rs_db_initialized');
  initDB();
}

// ─── TEAM / WORKERS API ─────────────────────────────────────
export async function getAdminWorkers() {
  const db = getDB();
  const dynamicUsers = db.Usuarios || [];
  
  // Merge: dynamicUsers override MOCK_USERS by ID
  const items = [...MOCK_USERS];
  dynamicUsers.forEach(du => {
    const idx = items.findIndex(item => item.id === du.id);
    if (idx > -1) items[idx] = du;
    else items.push(du);
  });
  
  return items;
}

export async function saveAdminWorker(worker) {
  const db = getDB();
  if (!db.Usuarios) db.Usuarios = [];
  
  const idx = db.Usuarios.findIndex(u => u.id === worker.id);
  if (idx > -1) {
    db.Usuarios[idx] = worker;
  } else {
    if (!worker.id) worker.id = 'u' + Date.now();
    db.Usuarios.push(worker);
  }
  
  saveDB(db);
  return worker;
}

// ─── AUTHENTICATION ─────────────────────────────────────────
export const MOCK_USERS = [
  { id: 'u1', nombre: 'Carlos', apellido: 'Rodríguez', email: 'carlos@renewsolar.com', password: '1234', initials: 'CR', unidades: ['Renew Solar', 'Renew Water', 'Renew Home'], rol: 'Vendedor', telefono: '+1 (305) 555-1234' },
  { id: 'u3', nombre: 'Demo',   apellido: 'Vendedor',  email: 'demo@renew.com',        password: 'demo', initials: 'DV', unidades: ['Renew Solar', 'Renew Water', 'Renew Home'], rol: 'Admin', telefono: '+1 (555) 123-4567' },
  { id: 'u4', nombre: 'Proceso',apellido: 'User',      email: 'procesador@renew.com',  password: '1234', initials: 'PU', unidades: ['Renew Solar'], rol: 'Procesador', telefono: '+1 111-2222' },
  { id: 'u5', nombre: 'Tecnico',apellido: 'User',      email: 'tecnico@renew.com',     password: '1234', initials: 'TU', unidades: ['Renew Solar'], rol: 'Técnico', telefono: '+1 333-4444' },
];

export async function loginUser(email, password) {
  await delay(600);
  const db = getDB();
  const dynamicUsers = db && db.Usuarios ? db.Usuarios : [];
  
  // Priority: Check dynamic users first, then fall back to mock users
  const allUsers = [...dynamicUsers, ...MOCK_USERS];
  
  // Deduplicate by email to avoid finding old mock versions
  const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.email, u])).values());
  
  const u = uniqueUsers.find(user => user.email === email && (user.password === password || user.pass === password));
  if (!u) throw new Error('Credenciales inválidas');
  return u;
}

// ─── MOBILE SALES APP API ───────────────────────────────────
export async function getPipelineByName(name) {
  const pipes = await getAdminPipelines();
  return pipes.find(p => p.nombre === name) || pipes[0];
}

export async function getFasesByPipeline(pipelineId) {
  return (await getAdminFases()).filter(f => f.pipeline_id === pipelineId).sort((a,b) => a.orden - b.orden);
}

export async function getCamposByFase(faseId) {
  return (await getAdminCampos()).filter(c => c.fase_id === faseId);
}

export async function getDealsByUser(userId, pipelineName) {
  await delay(600);
  const db = getDB();
  const pipeline = db.Admin_Pipelines.find(p => p.nombre === pipelineName);
  if (!pipeline) return [];
  
  const pipelineFases = db.Admin_Fases.filter(f => f.pipeline_id === pipeline.id).sort((a,b) => a.orden - b.orden);
  const totalFases = pipelineFases.length;

  const dynamicUsers = db.Usuarios ? db.Usuarios : [];
  const allUsers = [...MOCK_USERS, ...dynamicUsers];
  const u = allUsers.find(user => user.id === userId);
  
  const myProyectos = db.Proyectos_Dinamicos.filter(p => {
    if (p.pipeline_id !== pipeline.id) return false;
    if (u && u.rol === 'Admin') return true; // Admins view all
    
    const fase = db.Admin_Fases.find(f => f.id === p.fase_id);
    if (fase && fase.rol_encargado === u.rol) {
      return true;
    }
    
    return false;
  });

  return myProyectos.map(p => {
    const cli = db.Clientes_Maestro.find(c => c.id === p.cliente_id) || {};
    const fase = db.Admin_Fases.find(f => f.id === p.fase_id) || {};
    const faseOrden = fase.orden || 0;
    
    return {
      id: p.id,
      nombre_cliente: cli.nombre,
      telefono: cli.telefono,
      direccion: cli.direccion,
      etapa: fase.nombre || 'Desconocida',
      fase_id: p.fase_id,
      fase_orden: faseOrden,
      total_fases: totalFases,
      fecha: p.fecha
    };
  }).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
}

export async function getClientesMaestro() {
  return getDB().Clientes_Maestro;
}

export async function createDynamicDeal({ cliente, cliente_id, respuestas, pipelineName, responsable_id }) {
  await delay(1200);
  const db = getDB();
  const pipeline = db.Admin_Pipelines.find(p => p.nombre === pipelineName);
  const fases = db.Admin_Fases.filter(f => f.pipeline_id === pipeline.id).sort((a,b) => a.orden - b.orden);
  const firstFaseId = fases[0] ? fases[0].id : null;

  // 1. Maestro
  let finalClienteId = cliente_id;
  if (!finalClienteId && cliente) {
    const newCliente = { id: genId('cli', db), ...cliente };
    db.Clientes_Maestro.push(newCliente);
    finalClienteId = newCliente.id;
  } else if (!finalClienteId && !cliente) {
    throw new Error("Se requiere cliente o cliente_id");
  }

  // 2. Operativo Project
  const newProyId = genId('proy', db);
  const newProyecto = {
    id: newProyId,
    cliente_id: finalClienteId,
    pipeline_id: pipeline.id,
    fase_id: firstFaseId,
    responsable_id: responsable_id,
    fecha: new Date().toISOString().split('T')[0]
  };
  db.Proyectos_Dinamicos.push(newProyecto);

  // 3. Dynamic Answers
  Object.keys(respuestas).forEach(campoId => {
    db.Respuestas_Dinamicas.push({
      id: genId('resp', db),
      proyecto_id: newProyId,
      campo_id: campoId,
      valor: respuestas[campoId]
    });
  });

  saveDB(db);
  console.log(`[n8n Webhook] Nueva captura de ${pipelineName}:`, { cliente: newCliente, proyecto: newProyecto, respuestas });
  return newProyecto;
}

export async function getDealById(dealId) {
  await delay(300);
  const db = getDB();
  const p = db.Proyectos_Dinamicos.find(d => d.id === dealId);
  if(!p) throw new Error("Not found");
  const cli = db.Clientes_Maestro.find(c => c.id === p.cliente_id) || {};
  const fase = db.Admin_Fases.find(f => f.id === p.fase_id) || {};
  return { 
    id: p.id, 
    nombre_cliente: cli.nombre, 
    telefono: cli.telefono, 
    direccion: cli.direccion, 
    email: cli.email, 
    zip: cli.zip, 
    etapa: fase.nombre, 
    fase_id: p.fase_id, 
    pipeline_id: p.pipeline_id,
    fecha: p.fecha 
  };
}

export async function advanceDealPhase(dealId, respuestas) {
  await delay(800);
  const db = JSON.parse(localStorage.getItem('rs_admin_db'));
  const p = db.Proyectos_Dinamicos.find(d => d.id === dealId);
  if(!p) throw new Error("Proyecto no encontrado");

  // Save specific responses for this phase
  Object.keys(respuestas).forEach(campoId => {
    // Check if response already exists, if so update, else push
    const exist = db.Respuestas_Dinamicas.find(r => r.proyecto_id === dealId && r.campo_id === campoId);
    if(exist) {
       exist.valor = respuestas[campoId];
    } else {
       db.Counters.resp++;
       db.Respuestas_Dinamicas.push({
         id: 'resp_' + db.Counters.resp,
         proyecto_id: dealId,
         campo_id: campoId,
         valor: respuestas[campoId]
       });
    }
  });

  // Calculate Next Phase
  const fases = db.Admin_Fases.filter(f => f.pipeline_id === p.pipeline_id).sort((a,b) => a.orden - b.orden);
  const curFidx = fases.findIndex(f => f.id === p.fase_id);
  let isCompletado = false;
  
  if (curFidx !== -1 && curFidx < fases.length - 1) {
    p.fase_id = fases[curFidx + 1].id;
  } else {
    isCompletado = true;
  }

  localStorage.setItem('rs_admin_db', JSON.stringify(db));
  
  console.log(`[n8n Webhook] Avance de Fase en Proyecto ${dealId}:`, { proyecto: p, respuestas, completado: isCompletado });
  return { nextFase: isCompletado ? null : p.fase_id, isCompletado };
}

// Formatters
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export const STAGE_CONFIG = {}; // To prevent errors if legacy code reads it
