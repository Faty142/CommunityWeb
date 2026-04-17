/* ═══════════════════════════════════════════
   GESTOR COMUNITARIO — Ministro
═══════════════════════════════════════════ */

import { supabase, supabaseAdmin, currentUser, currentPerfil, switchView, openModal, closeModal, showToast, formatDate } from './app.js'

// ══════════════════════════════════════════
// SETUP MINISTRO
// ══════════════════════════════════════════
export function setupMinistro() {
  const nav = document.getElementById('sidebar-nav')
  const container = document.getElementById('views-container')

  // Nav items
  const navItems = [
    { label: 'Panel General', icon: '🏠', view: 'view-dashboard', title: 'Panel General' },
    { label: 'Catequistas', icon: '👥', view: 'view-catequistas', title: 'Gestión de Catequistas' },
    { label: 'Avisos Públicos', icon: '📢', view: 'view-avisos', title: 'Avisos Públicos' },
  ]

  nav.innerHTML = navItems.map(item => `
    <button class="nav-item" data-view="${item.view}"
      onclick="switchViewMinistro('${item.view}', '${item.title}')">
      <span>${item.icon}</span> ${item.label}
    </button>
  `).join('')

  // Vistas HTML
  container.innerHTML = `
    <!-- Dashboard -->
    <div class="view active" id="view-dashboard">
      <div class="page-header">
        <div>
          <h2>Panel General</h2>
          <p>Resumen del estado de la comunidad</p>
        </div>
      </div>
      <div class="stats-grid" id="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-number" id="stat-catequistas">--</div>
          <div class="stat-label">Catequistas activos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-number" id="stat-grupos">--</div>
          <div class="stat-label">Grupos creados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎓</div>
          <div class="stat-number" id="stat-alumnos">--</div>
          <div class="stat-label">Alumnos registrados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📢</div>
          <div class="stat-number" id="stat-avisos">--</div>
          <div class="stat-label">Avisos publicados</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>Avisos recientes</h3>
          <button class="btn-primary" onclick="switchViewMinistro('view-avisos', 'Avisos Públicos')">
            Ver todos
          </button>
        </div>
        <div id="avisos-recientes"></div>
      </div>
    </div>

    <!-- Catequistas -->
    <div class="view" id="view-catequistas">
      <div class="page-header">
        <div>
          <h2>Catequistas</h2>
          <p>Gestiona el personal de catequesis</p>
        </div>
        <button class="btn-primary" onclick="abrirModalNuevoCatequista()">
          + Nuevo catequista
        </button>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tabla-catequistas">
              <tr><td colspan="5" style="text-align:center;padding:24px;color:#999">
                Cargando...
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Avisos -->
    <div class="view" id="view-avisos">
      <div class="page-header">
        <div>
          <h2>Avisos Públicos</h2>
          <p>Publica y gestiona los avisos de la comunidad</p>
        </div>
        <button class="btn-primary" onclick="abrirModalNuevoAviso()">
          + Nuevo aviso
        </button>
      </div>
      <div id="avisos-lista"></div>
    </div>
  `

  // Activar primer nav item
  document.querySelector('.nav-item').classList.add('active')

  // Cargar datos
  cargarEstadisticas()
  cargarCatequistas()
  cargarAvisosMinistro()
}

// ── Switch view ministro ──
function switchViewMinistro(viewId, title) {
  switchView(viewId, title)
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'))
  document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active')
}

window.switchViewMinistro = switchViewMinistro

// ══════════════════════════════════════════
// ESTADÍSTICAS
// ══════════════════════════════════════════
async function cargarEstadisticas() {
  try {
    const [catequistas, grupos, alumnos, avisos] = await Promise.all([
      supabase.from('perfiles').select('id', { count: 'exact' })
        .eq('rol', 'catequista').eq('estado', true),
      supabase.from('grupos').select('id', { count: 'exact' }).eq('estado', true),
      supabase.from('alumnos').select('id', { count: 'exact' }).eq('estado', true),
      supabase.from('avisos_publicos').select('id', { count: 'exact' }).eq('estado', true),
    ])

    document.getElementById('stat-catequistas').textContent = catequistas.count ?? 0
    document.getElementById('stat-grupos').textContent = grupos.count ?? 0
    document.getElementById('stat-alumnos').textContent = alumnos.count ?? 0
    document.getElementById('stat-avisos').textContent = avisos.count ?? 0

    // Avisos recientes
    const { data: avisosData } = await supabase
      .from('avisos_publicos')
      .select('*')
      .eq('estado', true)
      .order('fecha_publicacion', { ascending: false })
      .limit(3)

    const el = document.getElementById('avisos-recientes')
    if (!avisosData || avisosData.length === 0) {
      el.innerHTML = `<p style="color:#999;text-align:center;padding:16px">No hay avisos publicados</p>`
      return
    }

    el.innerHTML = avisosData.map(a => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;
        border-bottom:1px solid var(--gris-borde)">
        <div style="width:40px;height:40px;background:var(--malva-fondo);
          border-radius:10px;display:flex;align-items:center;
          justify-content:center;font-size:18px;flex-shrink:0">📢</div>
        <div style="flex:1">
          <strong style="color:var(--malva-oscuro)">${a.titulo}</strong>
          <p style="font-size:13px;color:#999;margin-top:2px">${formatDate(a.fecha_publicacion)}</p>
        </div>
        <span class="badge badge-success">Activo</span>
      </div>
    `).join('')

  } catch (err) {
    console.error('Error cargando estadísticas:', err)
  }
}

// ══════════════════════════════════════════
// CATEQUISTAS
// ══════════════════════════════════════════
async function cargarCatequistas() {
  const tbody = document.getElementById('tabla-catequistas')
  if (!tbody) return

  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('rol', 'catequista')
      .order('fecha_registro', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:#999">
        No hay catequistas registrados
      </td></tr>`
      return
    }

    tbody.innerHTML = data.map(c => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar" style="width:34px;height:34px;font-size:12px">
              ${c.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <strong>${c.nombre_completo}</strong>
          </div>
        </td>
        <td><code style="background:var(--malva-fondo);padding:3px 8px;
          border-radius:6px;font-size:13px;color:var(--malva-medio)">
          ${c.correo_personal || '—'}
        </code></td>
        <td>${c.correo_personal || '—'}</td>
        <td>
          <span class="badge ${c.estado ? 'badge-success' : 'badge-danger'}">
            ${c.estado ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-icon" title="Editar"
              onclick="abrirModalEditarCatequista('${c.id}', '${c.nombre_completo}', '${c.correo_personal || ''}', ${c.estado})">
              ✏️
            </button>
            <button class="btn-icon" title="${c.estado ? 'Desactivar' : 'Activar'}"
              onclick="toggleEstadoCatequista('${c.id}', ${c.estado})">
              ${c.estado ? '🔴' : '🟢'}
            </button>
          </div>
        </td>
      </tr>
    `).join('')

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:red">
      Error al cargar catequistas
    </td></tr>`
  }
}

// ── Modal nuevo catequista ──
function abrirModalNuevoCatequista() {
  openModal(`
    <div class="modal" id="modal-nuevo-catequista">
      <h3>➕ Nuevo Catequista</h3>
      <p>El sistema generará las credenciales automáticamente.</p>
      <div class="form-group">
        <label>Nombre completo *</label>
        <input type="text" id="nuevo-nombre" placeholder="Ej: María González López" />
      </div>
      <div id="credenciales-generadas" style="display:none">
        <div class="credentials-box">
          <p><strong>Credenciales generadas — entrega estas al catequista:</strong></p>
          <div class="credential-item">
            <label>Correo</label>
            <code id="cred-email">—</code>
          </div>
          <div class="credential-item">
            <label>Contraseña temporal</label>
            <code id="cred-pass">—</code>
          </div>
        </div>
        <p style="font-size:12px;color:#999;margin-top:8px">
          ⚠️ Guarda estas credenciales, no podrás verlas de nuevo.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="registrarCatequista()" id="btn-registrar">
          Registrar
        </button>
      </div>
    </div>
  `)
}

async function registrarCatequista() {
  const nombre = document.getElementById('nuevo-nombre').value.trim()
  if (!nombre) {
    showToast('Ingresa el nombre completo', 'error')
    return
  }

  const btn = document.getElementById('btn-registrar')
  btn.textContent = 'Registrando...'
  btn.disabled = true

  try {
    // Obtener siguiente número de catequista
    const { count } = await supabase
      .from('perfiles')
      .select('id', { count: 'exact' })
      .eq('rol', 'catequista')

    const num = String((count || 0) + 1).padStart(3, '0')
    const emailGenerado = `catequista${num}@sanmateo.com`
    const passGenerada = generarPassword()

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin
      ? await crearUsuarioAdmin(emailGenerado, passGenerada)
      : await supabase.auth.signUp({ email: emailGenerado, password: passGenerada })

    if (authError) throw authError

    const userId = authData.user?.id
    if (!userId) throw new Error('No se pudo crear el usuario')

    // Crear perfil
    const { error: perfilError } = await supabase.from('perfiles').insert({
      user_id: userId,
      nombre_completo: nombre,
      rol: 'catequista',
      estado: true,
      password_temporal: true,
      terminos_aceptados: false
    })

    if (perfilError) throw perfilError

    // Mostrar credenciales
    document.getElementById('cred-email').textContent = emailGenerado
    document.getElementById('cred-pass').textContent = passGenerada
    document.getElementById('credenciales-generadas').style.display = 'block'
    btn.textContent = '✓ Registrado'
    document.getElementById('nuevo-nombre').disabled = true

    showToast('Catequista registrado correctamente')
    cargarCatequistas()
    cargarEstadisticas()

  } catch (err) {
    showToast('Error al registrar: ' + err.message, 'error')
    btn.textContent = 'Registrar'
    btn.disabled = false
  }
}

async function crearUsuarioAdmin(email, password) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (error) throw error
    return { data: { user: data.user }, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

function generarPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789#@!'
  let pass = ''
  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)]
  }
  return pass
}

// ── Modal editar catequista ──
function abrirModalEditarCatequista(id, nombre, correo, estado) {
  openModal(`
    <div class="modal" id="modal-editar-catequista">
      <h3>✏️ Editar Catequista</h3>
      <p>Modifica los datos del catequista.</p>
      <div class="form-group">
        <label>Nombre completo</label>
        <input type="text" id="edit-nombre" value="${nombre}" />
      </div>
      <div class="form-group">
        <label>Correo personal</label>
        <input type="email" id="edit-correo" value="${correo}" />
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select id="edit-estado">
          <option value="true" ${estado ? 'selected' : ''}>Activo</option>
          <option value="false" ${!estado ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarEdicionCatequista('${id}')">
          Guardar cambios
        </button>
      </div>
    </div>
  `)
}

async function guardarEdicionCatequista(id) {
  const nombre = document.getElementById('edit-nombre').value.trim()
  const correo = document.getElementById('edit-correo').value.trim()
  const estado = document.getElementById('edit-estado').value === 'true'

  try {
    const { error } = await supabase.from('perfiles')
      .update({ nombre_completo: nombre, correo_personal: correo, estado })
      .eq('id', id)

    if (error) throw error

    // Si se desactiva, desactivar grupos y alumnos
    if (!estado) {
      const { data: grupos } = await supabase
        .from('grupos').select('id').eq('catequista_id', id)

      if (grupos && grupos.length > 0) {
        const grupoIds = grupos.map(g => g.id)
        await supabase.from('grupos').update({ estado: false })
          .in('id', grupoIds)
        await supabase.from('alumnos').update({ estado: false })
          .in('grupo_id', grupoIds)
      }
    }

    closeModal()
    showToast('Catequista actualizado correctamente')
    cargarCatequistas()
    cargarEstadisticas()
  } catch (err) {
    showToast('Error al actualizar: ' + err.message, 'error')
  }
}

async function toggleEstadoCatequista(id, estadoActual) {
  const nuevoEstado = !estadoActual
  const accion = nuevoEstado ? 'activar' : 'desactivar'

  openModal(`
    <div class="modal" id="modal-confirmar">
      <h3>⚠️ Confirmar acción</h3>
      <p>¿Estás seguro de que deseas <strong>${accion}</strong> a este catequista?
        ${!nuevoEstado ? '<br><br>Al desactivarlo, todos sus grupos y alumnos quedarán desactivados.' : ''}
      </p>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-${nuevoEstado ? 'primary' : 'danger'}"
          onclick="confirmarToggleCatequista('${id}', ${nuevoEstado})">
          Sí, ${accion}
        </button>
      </div>
    </div>
  `)
}

async function confirmarToggleCatequista(id, nuevoEstado) {
  try {
    await supabase.from('perfiles').update({ estado: nuevoEstado }).eq('id', id)

    if (!nuevoEstado) {
      const { data: grupos } = await supabase
        .from('grupos').select('id').eq('catequista_id', id)
      if (grupos && grupos.length > 0) {
        const grupoIds = grupos.map(g => g.id)
        await supabase.from('grupos').update({ estado: false }).in('id', grupoIds)
        await supabase.from('alumnos').update({ estado: false }).in('grupo_id', grupoIds)
      }
    }

    closeModal()
    showToast(`Catequista ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`)
    cargarCatequistas()
    cargarEstadisticas()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

// ══════════════════════════════════════════
// AVISOS — MINISTRO
// ══════════════════════════════════════════
async function cargarAvisosMinistro() {
  const lista = document.getElementById('avisos-lista')
  if (!lista) return

  try {
    const { data, error } = await supabase
      .from('avisos_publicos')
      .select('*')
      .order('fecha_publicacion', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📢</div>
          <p>No hay avisos publicados aún.</p>
        </div>`
      return
    }

    lista.innerHTML = data.map(a => `
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;gap:16px">
          ${a.imagen_url
            ? `<img src="${a.imagen_url}" style="width:100px;height:80px;
                object-fit:cover;border-radius:10px;flex-shrink:0" />`
            : `<div style="width:100px;height:80px;background:var(--malva-fondo);
                border-radius:10px;display:flex;align-items:center;
                justify-content:center;font-size:28px;flex-shrink:0">📢</div>`
          }
          <div style="flex:1">
            <div style="display:flex;align-items:flex-start;
              justify-content:space-between;gap:12px">
              <div>
                <h4 style="color:var(--malva-oscuro);margin-bottom:4px">${a.titulo}</h4>
                <p style="font-size:13px;color:#999">
                  📅 ${formatDate(a.fecha_publicacion)}
                </p>
                <p style="font-size:14px;color:var(--gris-texto);
                  margin-top:8px;line-height:1.5">${a.contenido}</p>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0">
                <button class="btn-icon" title="Editar"
                  onclick="abrirModalEditarAviso(${a.id}, \`${a.titulo}\`, \`${a.contenido}\`)">
                  ✏️
                </button>
                <button class="btn-icon" title="Eliminar"
                  onclick="confirmarEliminarAviso(${a.id})">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('')

  } catch (err) {
    lista.innerHTML = `<p style="color:red">Error al cargar avisos</p>`
  }
}

function abrirModalNuevoAviso() {
  openModal(`
    <div class="modal" id="modal-nuevo-aviso">
      <h3>📢 Nuevo Aviso</h3>
      <p>El aviso será visible para toda la comunidad.</p>
      <div class="form-group">
        <label>Título *</label>
        <input type="text" id="aviso-titulo" placeholder="Ej: Misa de domingo" />
      </div>
      <div class="form-group">
        <label>Contenido *</label>
        <textarea id="aviso-contenido" placeholder="Describe el aviso..."></textarea>
      </div>
      <div class="form-group">
        <label>Imagen (opcional)</label>
        <div id="imagen-preview" style="display:none;margin-bottom:10px">
          <img id="preview-img" style="width:100%;height:160px;
            object-fit:cover;border-radius:10px" />
          <button onclick="quitarImagen()"
            style="margin-top:6px;background:none;border:none;
            color:var(--rojo);cursor:pointer;font-size:13px">
            ✕ Quitar imagen
          </button>
        </div>
        <div id="imagen-upload" style="border:2px dashed var(--malva-borde);
          border-radius:10px;padding:24px;text-align:center;cursor:pointer;
          background:var(--malva-fondo)"
          onclick="document.getElementById('aviso-imagen-file').click()">
          <div style="font-size:32px;margin-bottom:8px">🖼️</div>
          <p style="font-size:14px;color:var(--malva-medio);font-weight:600">
            Haz clic para seleccionar una imagen
          </p>
          <p style="font-size:12px;color:#999;margin-top:4px">
            PNG, JPG o WEBP — Máximo 5MB
          </p>
        </div>
        <input type="file" id="aviso-imagen-file" accept="image/*"
          style="display:none" onchange="previsualizarImagen(this)" />
      </div>
      <div class="form-group">
        <label>Fecha de expiración (opcional)</label>
        <p style="font-size:12px;color:#999;margin-bottom:6px">
          El aviso se ocultará automáticamente en esta fecha
        </p>
        <input type="date" id="aviso-expiracion"
          min="${new Date().toISOString().split('T')[0]}" />
        <button onclick="document.getElementById('aviso-expiracion').value=''"
          style="background:none;border:none;color:#999;
          font-size:12px;cursor:pointer;margin-top:4px">
          ✕ Sin fecha de expiración
        </button>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="publicarAviso()" id="btn-publicar">
          Publicar
        </button>
      </div>
    </div>
  `)
}

function previsualizarImagen(input) {
  const file = input.files[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    showToast('La imagen no debe superar 5MB', 'error')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    document.getElementById('preview-img').src = e.target.result
    document.getElementById('imagen-preview').style.display = 'block'
    document.getElementById('imagen-upload').style.display = 'none'
  }
  reader.readAsDataURL(file)
}

function quitarImagen() {
  document.getElementById('aviso-imagen-file').value = ''
  document.getElementById('imagen-preview').style.display = 'none'
  document.getElementById('imagen-upload').style.display = 'block'
}

async function subirImagenAviso(file) {
  const extension = file.name.split('.').pop()
  const nombreArchivo = `aviso_${Date.now()}.${extension}`

  const { error } = await supabaseAdmin.storage
    .from('avisos-web')
    .upload(nombreArchivo, file, { upsert: true })

  if (error) throw error

  const { data } = supabaseAdmin.storage
    .from('avisos-web')
    .getPublicUrl(nombreArchivo)

  return data.publicUrl
}

async function publicarAviso() {
  const titulo = document.getElementById('aviso-titulo').value.trim()
  const contenido = document.getElementById('aviso-contenido').value.trim()
  const fileInput = document.getElementById('aviso-imagen-file')
  const file = fileInput?.files[0]
  const expiracion = document.getElementById('aviso-expiracion').value

  if (!titulo || !contenido) {
    showToast('El título y contenido son obligatorios', 'error')
    return
  }

  const btn = document.getElementById('btn-publicar')
  btn.textContent = file ? 'Subiendo imagen...' : 'Publicando...'
  btn.disabled = true

  try {
    let imagenUrl = null
    if (file) {
      imagenUrl = await subirImagenAviso(file)
    }

    const { error } = await supabase.from('avisos_publicos').insert({
      titulo,
      contenido,
      imagen_url: imagenUrl,
      publicado_por: currentUser.id,
      estado: true,
      fecha_expiracion: expiracion ? `${expiracion}T23:59:59` : null
    })

    if (error) throw error

    closeModal()
    showToast('Aviso publicado correctamente')
    cargarAvisosMinistro()
    cargarEstadisticas()
  } catch (err) {
    showToast('Error al publicar: ' + err.message, 'error')
    btn.textContent = 'Publicar'
    btn.disabled = false
  }
}

function abrirModalEditarAviso(id, titulo, contenido) {
  openModal(`
    <div class="modal" id="modal-editar-aviso">
      <h3>✏️ Editar Aviso</h3>
      <div class="form-group">
        <label>Título</label>
        <input type="text" id="edit-aviso-titulo" value="${titulo}" />
      </div>
      <div class="form-group">
        <label>Contenido</label>
        <textarea id="edit-aviso-contenido">${contenido}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarEdicionAviso(${id})">
          Guardar
        </button>
      </div>
    </div>
  `)
}

async function guardarEdicionAviso(id) {
  const titulo = document.getElementById('edit-aviso-titulo').value.trim()
  const contenido = document.getElementById('edit-aviso-contenido').value.trim()

  try {
    await supabase.from('avisos_publicos')
      .update({ titulo, contenido })
      .eq('id', id)

    closeModal()
    showToast('Aviso actualizado')
    cargarAvisosMinistro()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

function confirmarEliminarAviso(id) {
  openModal(`
    <div class="modal" id="modal-eliminar-aviso">
      <h3>🗑️ Eliminar aviso</h3>
      <p>¿Estás seguro de que deseas eliminar este aviso? Esta acción no se puede deshacer.</p>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-danger" onclick="eliminarAviso(${id})">
          Sí, eliminar
        </button>
      </div>
    </div>
  `)
}

async function eliminarAviso(id) {
  try {
    await supabase.from('avisos_publicos').delete().eq('id', id)
    closeModal()
    showToast('Aviso eliminado')
    cargarAvisosMinistro()
    cargarEstadisticas()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

// ── Exponer funciones globales ──
window.abrirModalNuevoCatequista = abrirModalNuevoCatequista
window.registrarCatequista = registrarCatequista
window.abrirModalEditarCatequista = abrirModalEditarCatequista
window.guardarEdicionCatequista = guardarEdicionCatequista
window.toggleEstadoCatequista = toggleEstadoCatequista
window.confirmarToggleCatequista = confirmarToggleCatequista
window.abrirModalNuevoAviso = abrirModalNuevoAviso
window.publicarAviso = publicarAviso
window.abrirModalEditarAviso = abrirModalEditarAviso
window.guardarEdicionAviso = guardarEdicionAviso
window.confirmarEliminarAviso = confirmarEliminarAviso
window.eliminarAviso = eliminarAviso
window.previsualizarImagen = previsualizarImagen
window.quitarImagen = quitarImagen