const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── CONFIGURACIÓN SUPABASE ───────────────
const SUPABASE_URL = 'https://api-renew.0f2zfh.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MTI4ODAwMDAsImV4cCI6MjAyODQxNjAwMH0.LgwaO10yxM6SN8mDx5uxYyUhx_0jjA3CkfcVMY-AOB0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  global: {
    fetch: (url, options) => {
      let fixedUrl = url;
      if (url.includes('/storage/v1/')) {
        // Redirigir al dominio dedicado de archivos (files-renew) y limpiar la ruta
        fixedUrl = url.replace('api-renew.0f2zfh.easypanel.host', 'files-renew.0f2zfh.easypanel.host')
                      .replace('/storage/v1/', '/');
      } else {
        // Redirigir a la base de datos (api-renew) y limpiar la ruta rest
        fixedUrl = url.replace('/rest/v1/', '/');
      }
      return fetch(fixedUrl, options);
    }
  }
});

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// Static files are served above via express.static(__dirname)
// Explicit routes ensure SPAs load correctly for any non-API route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ── 1. DATABASE ENDPOINTS (100% SUPABASE) ──

// GET: Reconstruye el objeto DB completo desde Supabase
app.get('/api/db', async (req, res) => {
    try {
        console.log('[SUPABASE] Fetching full database snapshot...');
        
        const tables = [
            'admin_pipelines', 'admin_fases', 'admin_campos_formulario',
            'clientes_maestro', 'proyectos_dinamicos', 'respuestas_dinamicas',
            'usuarios', 'academia_content', 'inventario_global', 'historial_inventario',
            'anuncios_corporativos'
        ];

        const results = await Promise.all(
            tables.map(table => 
                supabase.from(table).select('*').then(res => {
                    if (res.error) {
                        console.warn(`⚠️ Warning: Table '${table}' might be missing or inaccessible:`, res.error.message);
                        return { data: [] };
                    }
                    return res;
                }).catch(err => {
                    console.warn(`❌ Error fetching table '${table}':`, err.message);
                    return { data: [] };
                })
            )
        );

        // Helper: compute max numeric suffix from IDs like 'cli_17'
        const maxId = (data, prefix) => {
            if (!data || data.length === 0) return 0;
            const nums = data.map(r => parseInt((r.id || '').replace(prefix, '')) || 0);
            return Math.max(0, ...nums);
        };

        // Mapeo selectivo para reconstruir la estructura rs_admin_db
        const db = {
            Admin_Pipelines:         results[0].data || [],
            Admin_Fases:             results[1].data || [],
            Admin_Campos_Formulario: results[2].data || [],
            Clientes_Maestro:        (results[3].data || []).map(c => ({
                ...c,
                // Normalize: Supabase stores as foto_id, frontend expects id_photo
                id_photo: c.id_photo || c.foto_id || null,
            })),
            Proyectos_Dinamicos:     results[4].data || [],
            Respuestas_Dinamicas:    results[5].data || [],
            Usuarios:                results[6].data || [],
            academiaContent:         results[7].data || [],
            inventarioGlobal:        (results[8].data || []).map(i => ({
                id: i.id,
                nombreItem: i.nombre_item || i.Nombre_item || i.nombreItem,
                ecosistema: i.ecosistema,
                locacion: i.locacion || i.Locacion,
                category: i.category,
                storage: i.storage,
                stockActual: i.stock_actual ?? i.stockActual ?? 0
            })),
            historialInventario:     results[9].data || [],
            anuncios_corporativos:   (results[10].data || []).map(a => ({
                ...a,
                audiencia: a.audiencia || 'todos'
            })),
            // Compute counters dynamically from real data — avoids collision bugs
            Counters: {
                cli:   maxId(results[3].data,  'cli_'),
                proy:  maxId(results[4].data,  'proy_'),
                resp:  maxId(results[5].data,  'resp_'),
                pip:   maxId(results[0].data,  'pip_'),
                fase:  maxId(results[1].data,  'fase_'),
                campo: maxId(results[2].data,  'campo_'),
            }
        };

        res.json(db);
    } catch (error) {
        console.error('[SUPABASE ERROR] getDB:', error.message);
        res.status(500).json({ error: 'Fallo al recuperar datos de Supabase', details: error.message });
    }
});

// POST: Sincronización masiva (Upsert) a Supabase
app.post('/api/db', async (req, res) => {
    try {
        const db = req.body;
        console.log('[SUPABASE] Syncing local changes to cloud...');

        // Ejecutar upserts en paralelo para cada tabla
        const syncTasks = [];
        const tableIndices = [];

        if (db.Usuarios?.length) {
            const usrs = db.Usuarios.filter(u => u && u.id).map(u => ({
                id:         u.id,
                nombre:     u.nombre     || null,
                apellido:   u.apellido   || null,
                email:      u.email      || null,
                password:   u.password   || null,
                rol:        u.rol        || null,
                department: u.department || null,
                dob:        u.dob        || null,
                unidades:   Array.isArray(u.unidades) ? u.unidades : []
            }));
            syncTasks.push(supabase.from('usuarios').upsert(usrs, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('usuarios');
        }
        if (db.Clientes_Maestro?.length) {
            const cli = db.Clientes_Maestro.filter(c => c && c.id).map(item => ({
                id: item.id, 
                nombre: item.nombre || null, 
                email: item.email || null, 
                telefono: item.telefono || null,
                direccion: item.direccion || null, 
                zip: item.zip || null, 
                state_id: item.state_id || null, 
                dob: item.dob || null,
                empresa: item.empresa || null, 
                estado: item.estado || null, 
                foto: item.foto || null, 
                licencia: item.licencia || null,
                notas: item.notas || null, 
                fecha: item.fecha || null, 
                foto_id: item.id_photo || item.foto_id || null, 
                archivos_adjuntos: item.archivos_adjuntos || null
            }));
            syncTasks.push(supabase.from('clientes_maestro').upsert(cli, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('clientes_maestro');
        }
        if (db.Proyectos_Dinamicos?.length) {
            const proy = db.Proyectos_Dinamicos.filter(i => i && i.id);
            syncTasks.push(supabase.from('proyectos_dinamicos').upsert(proy, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('proyectos_dinamicos');
        }
        if (db.Respuestas_Dinamicas?.length) {
            const resp = db.Respuestas_Dinamicas.filter(i => i && i.id);
            syncTasks.push(supabase.from('respuestas_dinamicas').upsert(resp, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('respuestas_dinamicas');
        }
        if (db.Admin_Pipelines?.length) {
            const pip = db.Admin_Pipelines.filter(i => i && i.id);
            syncTasks.push(supabase.from('admin_pipelines').upsert(pip, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('admin_pipelines');
        }
        if (db.Admin_Fases?.length) {
            const fase = db.Admin_Fases.filter(i => i && i.id);
            syncTasks.push(supabase.from('admin_fases').upsert(fase, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('admin_fases');
        }
        if (db.Admin_Campos_Formulario?.length) {
            const camp = db.Admin_Campos_Formulario.filter(i => i && i.id);
            syncTasks.push(supabase.from('admin_campos_formulario').upsert(camp, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('admin_campos_formulario');
        }
        if (db.academiaContent?.length) {
            const aca = db.academiaContent.filter(i => i && i.id);
            syncTasks.push(supabase.from('academia_content').upsert(aca, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('academia_content');
        }
        if (db.inventarioGlobal?.length) {
            const items = db.inventarioGlobal.filter(i => i && i.id).map(i => ({
                id: i.id,
                nombre_item: i.nombreItem || i.nombre_item || i.Nombre_item || null,
                ecosistema: i.ecosistema || null,
                locacion:   i.locacion || i.Locacion || null,
                category:   i.category || null,
                storage:    i.storage || null,
                stock_actual: i.stockActual ?? i.stock_actual ?? 0
            }));
            syncTasks.push(supabase.from('inventario_global').upsert(items, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('inventario_global');
        }
        if (db.historialInventario?.length) {
            const hist = db.historialInventario.filter(i => i && i.id);
            syncTasks.push(supabase.from('historial_inventario').upsert(hist, { onConflict: 'id' }).then(res => res, e => ({ error: e }))); 
            tableIndices.push('historial_inventario');
        }
        if (db.anuncios_corporativos?.length) {
            const anu = db.anuncios_corporativos.filter(i => i && i.id).map(a => ({
                id: a.id,
                titulo: a.titulo || null,
                mensaje: a.mensaje || null,
                audiencia: a.audiencia || 'todos',
                fecha: a.fecha || new Date().toISOString(),
                estado_lecturas: a.estado_lecturas || []
            }));
            syncTasks.push(supabase.from('anuncios_corporativos').upsert(anu, { onConflict: 'id' }).then(res => res, e => ({ error: e })));
            tableIndices.push('anuncios_corporativos');
        }

        // 2. Ejecutar y evaluar
        if (syncTasks.length === 0) return res.json({ success: true });

        const results = await Promise.all(syncTasks);
        console.log(`[SYNC] Completed ${results.length} tasks.`);
        
        const errors = [];
        results.forEach((res, idx) => {
            if (res && res.error) {
                errors.push({ table: tableIndices[idx], error: res.error });
            }
        });

        if (errors.length > 0) {
            console.error('[SUPABASE ERROR] sync masivo:', errors);
            const msg = errors.map(e => `[${e.table}]: ${e.error.message || e.error.details || 'Error desconocido'}`).join(' | ');
            return res.status(500).json({ success: false, message: msg, error: msg, details: errors });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[CRITICAL ERROR] api/db post:', error);
        res.status(500).json({ 
            success: false,
            message: `Fallo crítico al sincronizar con Supabase: ${error?.message || 'Error interno'}`,
            error: error?.message || 'Error interno', 
            details: error?.stack || ''
        });
    }
});

// DELETE: Deletions from Supabase
app.delete('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    console.log(`[SUPABASE] Deleting from ${table} where id=${id}`);
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error(`[SUPABASE ERROR] Delete ${table}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ── 2. STORAGE MANAGEMENT (PRESERVED) ──

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    try {
        // Convert buffer to base64 data URL for direct storage
        const base64 = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
        res.json({ success: true, url: dataUrl });
    } catch (e) {
        console.error('Error procesando archivo:', e);
        res.status(500).json({ error: 'Fallo procesando archivo' });
    }
});

app.post('/api/upload-academia', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'miniatura', maxCount: 1 }]), async (req, res) => {
    try {
        let videoUrl = null;
        let miniaturaUrl = null;

        const subirASupabase = async (file, folder) => {
            const ext = path.extname(file.originalname);
            const name = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
            const { error } = await supabase.storage
                .from('archivos_renew')
                .upload(name, file.buffer, { contentType: file.mimetype });
            if (error) throw error;
            const { data } = supabase.storage.from('archivos_renew').getPublicUrl(name);
            // Forzar el uso del dominio de archivos dedicado para visualización pública
            return data.publicUrl.replace('api-renew.0f2zfh.easypanel.host/storage/v1', 'files-renew.0f2zfh.easypanel.host');
        };

        if (req.files['video']) videoUrl = await subirASupabase(req.files['video'][0], 'academia');
        if (req.files['miniatura']) miniaturaUrl = await subirASupabase(req.files['miniatura'][0], 'academia');
        
        res.json({ success: true, videoUrl, miniaturaUrl });
    } catch (e) {
        console.error('Error subiendo contenido de academia:', e);
        
        // Debug buckets
        try {
           const { data: bks } = await supabase.storage.listBuckets();
           console.log('Buckets disponibles en Supabase:', bks?.map(b => b.name));
        } catch(errB) { console.error('No se pudo listar buckets:', errB.message); }

        res.status(500).json({ 
            success: false, 
            message: e.message || 'Error en comunicación con Supabase Storage',
            error: JSON.stringify(e) 
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 RENEW CLOUD SERVER RUNNING`);
    console.log(`📡 Admin Panel : http://localhost:${port}/admin.html`);
    console.log(`📱 Mobile App  : http://localhost:${port}/index.html`);
    console.log(`🔐 Database    : SUPABASE (Live Connection)\n`);
});
