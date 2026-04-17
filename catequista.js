/* ═══════════════════════════════════════════
   GESTOR COMUNITARIO — Catequista
═══════════════════════════════════════════ */

import { supabase, currentUser, currentPerfil, switchView, openModal, closeModal, showToast, formatDate } from './app.js'

// ── Estado local ──
let grupoActual = null
let alumnosActuales = []
let fechaAsistenciaActual = null

// ══════════════════════════════════════════
// SETUP CATEQUISTA
// ══════════════════════════════════════════
export function setupCatequista() {
  const nav = document.getElementById('sidebar-nav')
  const container = document.getElementById('views-container')

  const navItems = [
    { label: 'Mi Panel', icon: '🏠', view: 'view-dashboard-cat', title: 'Mi Panel' },
    { label: 'Mis Grupos', icon: '📚', view: 'view-grupos', title: 'Mis Grupos' },
  ]

  nav.innerHTML = navItems.map(item => `
    <button class="nav-item" data-view="${item.view}"
      onclick="switchViewCatequista('${item.view}', '${item.title}')">
      <span>${item.icon}</span> ${item.label}
    </button>
  `).join('')

  container.innerHTML = `
    <!-- Dashboard catequista -->
    <div class="view active" id="view-dashboard-cat">
      <div class="page-header">
        <div>
          <h2>Mi Panel</h2>
          <p>Bienvenido/a, ${currentPerfil.nombre_completo}</p>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-number" id="cat-stat-grupos">--</div>
          <div class="stat-label">Mis grupos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎓</div>
          <div class="stat-number" id="cat-stat-alumnos">--</div>
          <div class="stat-label">Total alumnos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-number" id="cat-stat-asistencias">--</div>
          <div class="stat-label">Clases registradas</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>Mis grupos recientes</h3>
          <button class="btn-primary"
            onclick="switchViewCatequista('view-grupos', 'Mis Grupos')">
            Ver todos
          </button>
        </div>
        <div id="grupos-recientes"></div>
      </div>
    </div>

    <!-- Mis grupos -->
    <div class="view" id="view-grupos">
      <div class="page-header">
        <div>
          <h2>Mis Grupos</h2>
          <p>Gestiona tus grupos de catequesis</p>
        </div>
        <button class="btn-primary" onclick="abrirModalNuevoGrupo()">
          + Nuevo grupo
        </button>
      </div>
      <div id="grupos-lista"></div>
    </div>

    <!-- Detalle grupo -->
    <div class="view" id="view-grupo-detalle">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn-secondary" onclick="switchViewCatequista('view-grupos','Mis Grupos')">
            ← Volver
          </button>
          <div>
            <h2 id="grupo-detalle-nombre">Grupo</h2>
            <p id="grupo-detalle-info"></p>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-secondary" onclick="abrirModalGenerarPDF()">
            📄 Exportar PDF
          </button>
          <button class="btn-primary" onclick="abrirModalTomarAsistencia()">
            📋 Tomar asistencia
          </button>
        </div>
      </div>

      <div class="tabs">
        <button class="tab active" onclick="switchTab(this, 'tab-alumnos')">
          👥 Alumnos
        </button>
        <button class="tab" onclick="switchTab(this, 'tab-asistencias')">
          📋 Asistencias
        </button>
        <button class="tab" onclick="switchTab(this, 'tab-temas')">
          📖 Agenda de temas
        </button>
        <button class="tab" onclick="switchTab(this, 'tab-estadisticas')">
          📊 Estadísticas
        </button>
      </div>

      <!-- Tab alumnos -->
      <div class="tab-pane active" id="tab-alumnos">
        <div class="card">
          <div class="card-header">
            <h3>Lista de alumnos</h3>
            <button class="btn-primary" onclick="abrirModalNuevoAlumno()">
              + Agregar alumno
            </button>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Edad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="tabla-alumnos"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab asistencias -->
      <div class="tab-pane" id="tab-asistencias">
        <div class="card">
          <div class="card-header">
            <h3>Historial de asistencias</h3>
          </div>
          <div id="historial-asistencias"></div>
        </div>
      </div>

      <!-- Tab temas -->
      <div class="tab-pane" id="tab-temas">
        <div class="card">
          <div class="card-header">
            <h3>Agenda de temas</h3>
            <button class="btn-primary" onclick="abrirModalNuevoTema()">
              + Registrar tema
            </button>
          </div>
          <div id="lista-temas"></div>
        </div>
      </div>

      <!-- Tab estadísticas -->
      <div class="tab-pane" id="tab-estadisticas">
        <div class="card">
          <div class="card-header">
            <h3>Estadísticas de asistencia</h3>
          </div>
          <div id="estadisticas-asistencia"></div>
        </div>
      </div>
    </div>
  `

  document.querySelector('.nav-item').classList.add('active')
  cargarDashboardCatequista()
  cargarGrupos()
}

function switchViewCatequista(viewId, title) {
  switchView(viewId, title)
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'))
  document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active')
}

function switchTab(btn, paneId) {
  btn.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  btn.classList.add('active')
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'))
  document.getElementById(paneId)?.classList.add('active')
}

window.switchViewCatequista = switchViewCatequista
window.switchTab = switchTab

// ══════════════════════════════════════════
// DASHBOARD CATEQUISTA
// ══════════════════════════════════════════
async function cargarDashboardCatequista() {
  try {
    const { data: grupos } = await supabase
      .from('grupos').select('id')
      .eq('catequista_id', currentPerfil.id).eq('estado', true)

    const grupoIds = grupos?.map(g => g.id) || []

    const { count: totalAlumnos } = await supabase
      .from('alumnos').select('id', { count: 'exact' })
      .in('grupo_id', grupoIds).eq('estado', true)

    const { data: fechasClase } = await supabase
      .from('asistencias')
      .select('fecha_clase, grupo_id')
      .in('grupo_id', grupoIds)

    const totalAsistencias = new Set(
      fechasClase?.map(f => `${f.grupo_id}-${f.fecha_clase}`) || []
    ).size

    document.getElementById('cat-stat-grupos').textContent = grupos?.length || 0
    document.getElementById('cat-stat-alumnos').textContent = totalAlumnos || 0
    document.getElementById('cat-stat-asistencias').textContent = totalAsistencias || 0

    // Grupos recientes
    const { data: gruposRecientes } = await supabase
      .from('grupos').select('*')
      .eq('catequista_id', currentPerfil.id)
      .eq('estado', true)
      .order('fecha_creacion', { ascending: false })
      .limit(3)

    const el = document.getElementById('grupos-recientes')
    if (!gruposRecientes || gruposRecientes.length === 0) {
      el.innerHTML = `<p style="color:#999;text-align:center;padding:16px">
        No tienes grupos creados aún
      </p>`
      return
    }

    el.innerHTML = gruposRecientes.map(g => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;
        border-bottom:1px solid var(--gris-borde);cursor:pointer"
        onclick="abrirGrupo(${g.id}, '${g.nombre}')">
        <div style="width:40px;height:40px;background:var(--malva-fondo);
          border-radius:10px;display:flex;align-items:center;
          justify-content:center;font-size:18px">📚</div>
        <div style="flex:1">
          <strong style="color:var(--malva-oscuro)">${g.nombre}</strong>
          <p style="font-size:13px;color:#999;margin-top:2px">
            Creado: ${formatDate(g.fecha_creacion)}
          </p>
        </div>
        <span style="color:var(--malva-claro)">→</span>
      </div>
    `).join('')

  } catch (err) {
    console.error('Error dashboard:', err)
  }
}

// ══════════════════════════════════════════
// GRUPOS
// ══════════════════════════════════════════
async function cargarGrupos() {
  const lista = document.getElementById('grupos-lista')
  if (!lista) return

  try {
    const { data, error } = await supabase
      .from('grupos').select('*')
      .eq('catequista_id', currentPerfil.id)
      .eq('estado', true)
      .order('fecha_creacion', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <p>No tienes grupos creados aún.</p>
          <button class="btn-primary" style="margin-top:16px"
            onclick="abrirModalNuevoGrupo()">
            + Crear primer grupo
          </button>
        </div>`
      return
    }

    lista.innerHTML = data.map(g => `
      <div class="card" style="margin-bottom:16px;cursor:pointer"
        onclick="abrirGrupo(${g.id}, '${g.nombre}')">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:52px;height:52px;background:var(--malva-fondo);
            border-radius:14px;display:flex;align-items:center;
            justify-content:center;font-size:24px;flex-shrink:0">📚</div>
          <div style="flex:1">
            <h4 style="color:var(--malva-oscuro);font-size:17px">${g.nombre}</h4>
            ${g.descripcion
              ? `<p style="font-size:13px;color:#999;margin-top:2px">${g.descripcion}</p>`
              : ''}
            <p style="font-size:12px;color:#bbb;margin-top:4px">
              Creado: ${formatDate(g.fecha_creacion)}
            </p>
          </div>
          <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
            <span class="badge ${g.estado ? 'badge-success' : 'badge-danger'}">
              ${g.estado ? 'Activo' : 'Inactivo'}
            </span>
            <button class="btn-icon" onclick="abrirModalEditarGrupo(${g.id},'${g.nombre}')">
              ✏️
            </button>
            <button class="btn-icon" onclick="confirmarEliminarGrupo(${g.id})">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `).join('')

  } catch (err) {
    lista.innerHTML = `<p style="color:red">Error al cargar grupos</p>`
  }
}

function abrirModalNuevoGrupo() {
  openModal(`
    <div class="modal" id="modal-nuevo-grupo">
      <h3>📚 Nuevo Grupo</h3>
      <div class="form-group">
        <label>Nombre del grupo *</label>
        <input type="text" id="grupo-nombre"
          placeholder="Ej: Primera Comunión A, Confirmación 2026" />
      </div>
      <div class="form-group">
        <label>Descripción (opcional)</label>
        <textarea id="grupo-descripcion"
          placeholder="Descripción del grupo..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="crearGrupo()">Crear grupo</button>
      </div>
    </div>
  `)
}

async function crearGrupo() {
  const nombre = document.getElementById('grupo-nombre').value.trim()
  const descripcion = document.getElementById('grupo-descripcion').value.trim()

  if (!nombre) {
    showToast('El nombre del grupo es obligatorio', 'error')
    return
  }

  try {
    const { error } = await supabase.from('grupos').insert({
      nombre,
      descripcion: descripcion || null,
      catequista_id: currentPerfil.id,
      estado: true
    })

    if (error) throw error
    closeModal()
    showToast('Grupo creado correctamente')
    cargarGrupos()
    cargarDashboardCatequista()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

function abrirModalEditarGrupo(id, nombre) {
  openModal(`
    <div class="modal">
      <h3>✏️ Editar Grupo</h3>
      <div class="form-group">
        <label>Nombre del grupo</label>
        <input type="text" id="edit-grupo-nombre" value="${nombre}" />
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarEdicionGrupo(${id})">
          Guardar
        </button>
      </div>
    </div>
  `)
}

async function guardarEdicionGrupo(id) {
  const nombre = document.getElementById('edit-grupo-nombre').value.trim()
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return }

  try {
    await supabase.from('grupos').update({ nombre }).eq('id', id)
    closeModal()
    showToast('Grupo actualizado')
    cargarGrupos()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

function confirmarEliminarGrupo(id) {
  openModal(`
    <div class="modal">
      <h3>🗑️ Eliminar grupo</h3>
      <p>¿Estás seguro? Todos los alumnos del grupo quedarán desactivados.</p>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-danger" onclick="eliminarGrupo(${id})">
          Sí, eliminar
        </button>
      </div>
    </div>
  `)
}

async function eliminarGrupo(id) {
  try {
    await supabase.from('grupos').update({ estado: false }).eq('id', id)
    await supabase.from('alumnos').update({ estado: false }).eq('grupo_id', id)
    closeModal()
    showToast('Grupo eliminado')
    cargarGrupos()
    cargarDashboardCatequista()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

async function abrirGrupo(id, nombre) {
  grupoActual = id
  document.getElementById('grupo-detalle-nombre').textContent = nombre

  switchViewCatequista('view-grupo-detalle', nombre)

  // Reset tabs
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', i === 0)
  })
  document.querySelectorAll('.tab-pane').forEach((p, i) => {
    p.classList.toggle('active', i === 0)
  })

  await cargarAlumnos()
  await cargarHistorialAsistencias()
  await cargarTemas()
  await cargarEstadisticasAsistencia()
}

window.abrirGrupo = abrirGrupo

// ══════════════════════════════════════════
// ALUMNOS
// ══════════════════════════════════════════
async function cargarAlumnos() {
  const tbody = document.getElementById('tabla-alumnos')
  if (!tbody) return

  try {
    const { data, error } = await supabase
      .from('alumnos').select('*')
      .eq('grupo_id', grupoActual)
      .eq('estado', true)
      .order('nombre_completo')

    if (error) throw error
    alumnosActuales = data || []

    if (alumnosActuales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"
        style="text-align:center;padding:24px;color:#999">
        No hay alumnos en este grupo
      </td></tr>`
      return
    }

    tbody.innerHTML = alumnosActuales.map((a, i) => `
      <tr>
        <td style="color:#999">${i + 1}</td>
        <td><strong>${a.nombre_completo}</strong></td>
        <td>${a.edad ? a.edad + ' años' : '—'}</td>
        <td><span class="badge badge-success">Activo</span></td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn-icon"
              onclick="abrirModalEditarAlumno(${a.id},'${a.nombre_completo}',${a.edad || 'null'})">
              ✏️
            </button>
            <button class="btn-icon" onclick="confirmarEliminarAlumno(${a.id})">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('')

  } catch (err) {
    console.error('Error alumnos:', err)
  }
}

function abrirModalNuevoAlumno() {
  openModal(`
    <div class="modal">
      <h3>🎓 Agregar Alumno</h3>
      <div class="form-group">
        <label>Nombre completo *</label>
        <input type="text" id="alumno-nombre" placeholder="Nombre del alumno" />
      </div>
      <div class="form-group">
        <label>Edad (opcional)</label>
        <input type="number" id="alumno-edad" placeholder="Ej: 10" min="1" max="99" />
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="agregarAlumno()">Agregar</button>
      </div>
    </div>
  `)
}

async function agregarAlumno() {
  const nombre = document.getElementById('alumno-nombre').value.trim()
  const edad = document.getElementById('alumno-edad').value

  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return }

  try {
    await supabase.from('alumnos').insert({
      nombre_completo: nombre,
      edad: edad ? parseInt(edad) : null,
      grupo_id: grupoActual,
      estado: true
    })
    closeModal()
    showToast('Alumno agregado')
    await cargarAlumnos()
    cargarDashboardCatequista()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

function abrirModalEditarAlumno(id, nombre, edad) {
  openModal(`
    <div class="modal">
      <h3>✏️ Editar Alumno</h3>
      <div class="form-group">
        <label>Nombre completo</label>
        <input type="text" id="edit-alumno-nombre" value="${nombre}" />
      </div>
      <div class="form-group">
        <label>Edad</label>
        <input type="number" id="edit-alumno-edad"
          value="${edad || ''}" min="1" max="99" />
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarEdicionAlumno(${id})">
          Guardar
        </button>
      </div>
    </div>
  `)
}

async function guardarEdicionAlumno(id) {
  const nombre = document.getElementById('edit-alumno-nombre').value.trim()
  const edad = document.getElementById('edit-alumno-edad').value
  try {
    await supabase.from('alumnos').update({
      nombre_completo: nombre,
      edad: edad ? parseInt(edad) : null
    }).eq('id', id)
    closeModal()
    showToast('Alumno actualizado')
    cargarAlumnos()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

function confirmarEliminarAlumno(id) {
  openModal(`
    <div class="modal">
      <h3>🗑️ Eliminar alumno</h3>
      <p>¿Estás seguro de que deseas eliminar este alumno?</p>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-danger" onclick="eliminarAlumno(${id})">
          Sí, eliminar
        </button>
      </div>
    </div>
  `)
}

async function eliminarAlumno(id) {
  try {
    await supabase.from('alumnos').update({ estado: false }).eq('id', id)
    closeModal()
    showToast('Alumno eliminado')
    cargarAlumnos()
    cargarDashboardCatequista()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

// ══════════════════════════════════════════
// ASISTENCIAS
// ══════════════════════════════════════════
function abrirModalTomarAsistencia() {
  if (alumnosActuales.length === 0) {
    showToast('Primero agrega alumnos al grupo', 'error')
    return
  }

  const hoy = new Date().toISOString().split('T')[0]

  openModal(`
    <div class="modal" style="max-width:560px">
      <h3>📋 Tomar Asistencia</h3>
      <div class="form-group">
        <label>Fecha de clase *</label>
        <input type="date" id="asistencia-fecha" value="${hoy}" />
      </div>
      <div style="margin:16px 0">
        <p style="font-size:13px;font-weight:700;color:var(--malva-oscuro);
          margin-bottom:12px">Alumnos (${alumnosActuales.length})</p>
        <div id="lista-asistencia-alumnos">
          ${alumnosActuales.map(a => `
            <div style="display:flex;align-items:center;justify-content:space-between;
              padding:10px 0;border-bottom:1px solid var(--gris-borde)">
              <span style="font-size:14px;font-weight:500">${a.nombre_completo}</span>
              <div style="display:flex;gap:6px">
                <button class="chip chip-asistio selected" id="chip-${a.id}-asistio"
                  onclick="seleccionarEstado(${a.id}, 'Asistio')">
                  ✓ Asistió
                </button>
                <button class="chip chip-tarde" id="chip-${a.id}-tarde"
                  onclick="seleccionarEstado(${a.id}, 'Llego_tarde')">
                  ⏰ Tarde
                </button>
                <button class="chip chip-falto" id="chip-${a.id}-falto"
                  onclick="seleccionarEstado(${a.id}, 'Falto')">
                  ✗ Faltó
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarAsistencia()">
          Guardar asistencia
        </button>
      </div>
    </div>
  `)

  // Estado inicial: todos asistieron
  alumnosActuales.forEach(a => {
    a._estadoAsistencia = 'Asistio'
  })
}

function seleccionarEstado(alumnoId, estado) {
  const alumno = alumnosActuales.find(a => a.id === alumnoId)
  if (alumno) alumno._estadoAsistencia = estado

  // UI feedback
  const tipos = ['asistio', 'tarde', 'falto']
  const mapEstado = { 'Asistio': 'asistio', 'Llego_tarde': 'tarde', 'Falto': 'falto' }

  tipos.forEach(tipo => {
    const chip = document.getElementById(`chip-${alumnoId}-${tipo}`)
    if (chip) chip.classList.remove('selected')
  })

  const selected = document.getElementById(`chip-${alumnoId}-${mapEstado[estado]}`)
  if (selected) selected.classList.add('selected')
}

async function guardarAsistencia() {
  const fecha = document.getElementById('asistencia-fecha').value
  if (!fecha) { showToast('Selecciona una fecha', 'error'); return }

  try {
    const registros = alumnosActuales.map(a => ({
      alumno_id: a.id,
      grupo_id: grupoActual,
      fecha_clase: fecha,
      estado_asistencia: a._estadoAsistencia || 'Asistio',
      registrado_por: currentUser.id
    }))

    const { error } = await supabase.from('asistencias')
      .upsert(registros, { onConflict: 'alumno_id,fecha_clase' })

    if (error) throw error

    closeModal()
    showToast('Asistencia guardada correctamente')
    await cargarHistorialAsistencias()
    await cargarEstadisticasAsistencia()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

async function cargarHistorialAsistencias() {
  const el = document.getElementById('historial-asistencias')
  if (!el) return

  try {
    const { data: fechasData } = await supabase
      .from('asistencias')
      .select('fecha_clase')
      .eq('grupo_id', grupoActual)
      .order('fecha_clase', { ascending: false })

    const fechasUnicas = [...new Set(fechasData?.map(f => f.fecha_clase) || [])]

    if (fechasUnicas.length === 0) {
      el.innerHTML = `<p style="color:#999;text-align:center;padding:24px">
        No hay asistencias registradas aún
      </p>`
      return
    }

    // Obtener todos los alumnos del grupo
    const { data: alumnos } = await supabase
      .from('alumnos')
      .select('id, nombre_completo')
      .eq('grupo_id', grupoActual)
      .eq('estado', true)
      .order('nombre_completo')

    // Obtener todas las asistencias del grupo
    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('*')
      .eq('grupo_id', grupoActual)

    let html = ''
    for (const fecha of fechasUnicas) {
      const asistenciasFecha = asistencias?.filter(a => a.fecha_clase === fecha) || []

      html += `
        <div style="margin-bottom:24px">
          <h4 style="color:var(--malva-oscuro);margin-bottom:10px">
            📅 ${formatDate(fecha)}
          </h4>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Estado</th>
                  <th>Cambiar</th>
                </tr>
              </thead>
              <tbody>
                ${alumnos?.map(alumno => {
                  const asistencia = asistenciasFecha.find(
                    a => a.alumno_id === alumno.id
                  )
                  return `
                    <tr>
                      <td>${alumno.nombre_completo}</td>
                      <td>
                        ${asistencia ? `
                          <span class="badge ${
                            asistencia.estado_asistencia === 'Asistio' ? 'badge-success' :
                            asistencia.estado_asistencia === 'Llego_tarde' ? 'badge-warning' :
                            'badge-danger'
                          }">
                            ${asistencia.estado_asistencia === 'Asistio' ? '✓ Asistió' :
                              asistencia.estado_asistencia === 'Llego_tarde' ? '⏰ Llegó tarde' :
                              '✗ Faltó'}
                          </span>
                        ` : '<span style="color:#bbb">Sin registro</span>'}
                      </td>
                      <td>
                        ${asistencia ? `
                          <select onchange="editarAsistencia(${asistencia.id}, this.value)"
                            style="padding:4px 8px;border:1px solid var(--malva-borde);
                            border-radius:6px;font-size:13px">
                            <option value="Asistio"
                              ${asistencia.estado_asistencia === 'Asistio' ? 'selected' : ''}>
                              Asistió
                            </option>
                            <option value="Llego_tarde"
                              ${asistencia.estado_asistencia === 'Llego_tarde' ? 'selected' : ''}>
                              Llegó tarde
                            </option>
                            <option value="Falto"
                              ${asistencia.estado_asistencia === 'Falto' ? 'selected' : ''}>
                              Faltó
                            </option>
                          </select>
                        ` : '—'}
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
    }

    el.innerHTML = html

  } catch (err) {
    console.error('Error historial:', err)
    el.innerHTML = `<p style="color:red">Error al cargar historial</p>`
  }
}

async function editarAsistencia(id, nuevoEstado) {
  try {
    await supabase.from('asistencias')
      .update({ estado_asistencia: nuevoEstado }).eq('id', id)
    showToast('Asistencia actualizada')
    await cargarEstadisticasAsistencia()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

// ══════════════════════════════════════════
// ESTADÍSTICAS DE ASISTENCIA
// ══════════════════════════════════════════
async function cargarEstadisticasAsistencia() {
  const el = document.getElementById('estadisticas-asistencia')
  if (!el || alumnosActuales.length === 0) return

  try {
    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('alumno_id, estado_asistencia')
      .eq('grupo_id', grupoActual)

    const { data: fechas } = await supabase
      .from('asistencias')
      .select('fecha_clase')
      .eq('grupo_id', grupoActual)

    const totalClases = new Set(fechas?.map(f => f.fecha_clase) || []).size

    if (totalClases === 0) {
      el.innerHTML = `<p style="color:#999;text-align:center;padding:24px">
        No hay clases registradas aún
      </p>`
      return
    }

    el.innerHTML = `
      <p style="font-size:13px;color:#999;margin-bottom:20px">
        Total de clases: <strong>${totalClases}</strong>
      </p>
      ${alumnosActuales.map(alumno => {
        const asistenciasAlumno = asistencias?.filter(
          a => a.alumno_id === alumno.id && a.estado_asistencia === 'Asistio'
        ).length || 0
        const porcentaje = Math.round((asistenciasAlumno / totalClases) * 100)

        return `
          <div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;
              align-items:center;margin-bottom:6px">
              <span style="font-size:14px;font-weight:500">${alumno.nombre_completo}</span>
              <span style="font-size:14px;font-weight:700;color:${
                porcentaje >= 80 ? 'var(--verde)' :
                porcentaje >= 60 ? 'var(--amarillo)' : 'var(--rojo)'
              }">${porcentaje}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${porcentaje}%;background:${
                porcentaje >= 80 ? 'var(--verde)' :
                porcentaje >= 60 ? 'var(--amarillo)' : 'var(--rojo)'
              }"></div>
            </div>
            <p style="font-size:12px;color:#999;margin-top:4px">
              ${asistenciasAlumno} de ${totalClases} clases
            </p>
          </div>
        `
      }).join('')}
    `
  } catch (err) {
    console.error('Error estadísticas:', err)
  }
}

// ══════════════════════════════════════════
// AGENDA DE TEMAS
// ══════════════════════════════════════════
async function cargarTemas() {
  const el = document.getElementById('lista-temas')
  if (!el) return

  try {
    const { data, error } = await supabase
      .from('temas_por_clase')
      .select('*')
      .eq('grupo_id', grupoActual)
      .order('fecha_clase', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      el.innerHTML = `<p style="color:#999;text-align:center;padding:24px">
        No hay temas registrados aún
      </p>`
      return
    }

    el.innerHTML = data.map(t => `
      <div style="padding:16px 0;border-bottom:1px solid var(--gris-borde)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="flex:1">
            <p style="font-size:13px;color:#999;margin-bottom:6px">
              📅 ${formatDate(t.fecha_clase)}
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
              ${(t.temas || []).map(tema => `
                <span class="badge badge-info">${tema}</span>
              `).join('')}
            </div>
            ${t.notas_adicionales
              ? `<p style="font-size:13px;color:var(--gris-texto)">${t.notas_adicionales}</p>`
              : ''}
          </div>
          <button class="btn-icon"
            onclick="abrirModalEditarTema(${t.id}, '${t.fecha_clase}', '${(t.temas || []).join('|')}', '${(t.notas_adicionales || '').replace(/'/g, '&apos;')}')">
            ✏️
          </button>
        </div>
      </div>
    `).join('')

  } catch (err) {
    console.error('Error temas:', err)
  }
}

function abrirModalNuevoTema() {
  const hoy = new Date().toISOString().split('T')[0]
  openModal(`
    <div class="modal">
      <h3>📖 Registrar Temas</h3>
      <div class="form-group">
        <label>Fecha de clase *</label>
        <input type="date" id="tema-fecha" value="${hoy}" />
      </div>
      <div class="form-group">
        <label>Temas vistos (uno por línea) *</label>
        <textarea id="tema-temas" rows="4"
          placeholder="El bautismo&#10;Los mandamientos&#10;La Eucaristía"></textarea>
      </div>
      <div class="form-group">
        <label>Notas adicionales (opcional)</label>
        <textarea id="tema-notas" rows="2"
          placeholder="Observaciones de la clase..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarTema()">Guardar</button>
      </div>
    </div>
  `)
}

async function guardarTema() {
  const fecha = document.getElementById('tema-fecha').value
  const temasTexto = document.getElementById('tema-temas').value.trim()
  const notas = document.getElementById('tema-notas').value.trim()

  if (!fecha || !temasTexto) {
    showToast('La fecha y los temas son obligatorios', 'error')
    return
  }

  const temas = temasTexto.split('\n').map(t => t.trim()).filter(t => t)

  try {
    const { error } = await supabase.from('temas_por_clase').upsert({
      grupo_id: grupoActual,
      fecha_clase: fecha,
      temas,
      notas_adicionales: notas || null,
      registrado_por: currentUser.id
    }, { onConflict: 'grupo_id,fecha_clase' })

    if (error) throw error
    closeModal()
    showToast('Temas registrados correctamente')
    cargarTemas()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

function abrirModalEditarTema(id, fecha, temasStr, notas) {
  const temasArray = temasStr ? temasStr.split('|') : []
  openModal(`
    <div class="modal">
      <h3>✏️ Editar Temas</h3>
      <div class="form-group">
        <label>Fecha</label>
        <input type="date" id="edit-tema-fecha" value="${fecha}" />
      </div>
      <div class="form-group">
        <label>Temas (uno por línea)</label>
        <textarea id="edit-tema-temas" rows="4">${temasArray.join('\n')}</textarea>
      </div>
      <div class="form-group">
        <label>Notas adicionales</label>
        <textarea id="edit-tema-notas" rows="2">${notas || ''}</textarea>
      </div>
      <div class="modal-footer" style="justify-content:space-between">
        <button class="btn-danger" onclick="eliminarTema(${id})">
          🗑️ Eliminar
        </button>
        <div style="display:flex;gap:8px">
          <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
          <button class="btn-primary" onclick="actualizarTema(${id})">
            Guardar
          </button>
        </div>
      </div>
    </div>
  `)
}

async function actualizarTema(id) {
  const fecha = document.getElementById('edit-tema-fecha').value
  const temasTexto = document.getElementById('edit-tema-temas').value.trim()
  const notas = document.getElementById('edit-tema-notas').value.trim()
  const temas = temasTexto.split('\n').map(t => t.trim()).filter(t => t)

  try {
    await supabase.from('temas_por_clase').update({
      fecha_clase: fecha, temas, notas_adicionales: notas || null
    }).eq('id', id)
    closeModal()
    showToast('Temas actualizados')
    cargarTemas()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

async function eliminarTema(id) {
  try {
    await supabase.from('temas_por_clase').delete().eq('id', id)
    closeModal()
    showToast('Tema eliminado')
    cargarTemas()
  } catch (err) {
    showToast('Error: ' + err.message, 'error')
  }
}

// ══════════════════════════════════════════
// GENERAR PDF
// ══════════════════════════════════════════
function abrirModalGenerarPDF() {
  openModal(`
    <div class="modal">
      <h3>📄 Generar Reporte PDF</h3>
      <p>Se generará un PDF con todas las asistencias del grupo hasta la fecha.</p>
      <div style="background:var(--malva-fondo);padding:16px;border-radius:12px;
        margin:16px 0;font-size:14px;color:var(--malva-oscuro)">
        <strong>El PDF incluirá:</strong>
        <ul style="margin-top:8px;padding-left:20px;line-height:2">
          <li>Nombre del grupo</li>
          <li>Lista completa de alumnos</li>
          <li>Estado por fecha (Asistió / Llegó tarde / Faltó)</li>
          <li>Porcentaje de asistencia por alumno</li>
        </ul>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="generarPDF()">
          📄 Generar y descargar
        </button>
      </div>
    </div>
  `)
}

async function generarPDF() {
  showToast('Generando PDF...')
  closeModal()

  try {
    const grupoNombre = document.getElementById('grupo-detalle-nombre').textContent

    const { data: fechasData } = await supabase
      .from('asistencias').select('fecha_clase')
      .eq('grupo_id', grupoActual)
      .order('fecha_clase')

    const fechas = [...new Set(fechasData?.map(f => f.fecha_clase) || [])]

    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('alumno_id, fecha_clase, estado_asistencia')
      .eq('grupo_id', grupoActual)

    // Calcular porcentajes
    const porcentajes = {}
    alumnosActuales.forEach(alumno => {
      const asistio = asistencias?.filter(
        a => a.alumno_id === alumno.id && a.estado_asistencia === 'Asistio'
      ).length || 0
      porcentajes[alumno.id] = fechas.length > 0
        ? Math.round((asistio / fechas.length) * 100) : 0
    })

    // Generar HTML del PDF
    const html = `
      <!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#333;font-size:13px}
        h1{color:#72243E;font-size:20px;margin-bottom:4px}
        h2{color:#993556;font-size:15px;margin-bottom:16px;font-weight:normal}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th{background:#FCE8F2;color:#72243E;padding:8px;text-align:left;
          font-size:11px;text-transform:uppercase}
        td{padding:8px;border-bottom:1px solid #eee;font-size:12px}
        .asistio{color:#2E7D32;font-weight:bold}
        .tarde{color:#F57F17;font-weight:bold}
        .falto{color:#C62828;font-weight:bold}
        .pct{font-weight:bold;text-align:center}
        .footer{margin-top:24px;font-size:11px;color:#999;text-align:center}
      </style></head><body>
      <h1>📋 Reporte de Asistencias</h1>
      <h2>Grupo: ${grupoNombre}</h2>
      <p>Generado: ${new Date().toLocaleDateString('es-MX', {
        day:'numeric',month:'long',year:'numeric'
      })}</p>
      <p>Total de clases: <strong>${fechas.length}</strong> |
         Total de alumnos: <strong>${alumnosActuales.length}</strong></p>
      <table>
        <thead>
          <tr>
            <th>Alumno</th>
            ${fechas.map(f => `<th>${new Date(f+'T12:00:00')
              .toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</th>`).join('')}
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${alumnosActuales.map(alumno => `
            <tr>
              <td>${alumno.nombre_completo}</td>
              ${fechas.map(fecha => {
                const a = asistencias?.find(
                  x => x.alumno_id === alumno.id && x.fecha_clase === fecha
                )
                if (!a) return `<td style="color:#bbb">—</td>`
                if (a.estado_asistencia === 'Asistio')
                  return `<td class="asistio">✓</td>`
                if (a.estado_asistencia === 'Llego_tarde')
                  return `<td class="tarde">⏰</td>`
                return `<td class="falto">✗</td>`
              }).join('')}
              <td class="pct" style="color:${
                porcentajes[alumno.id] >= 80 ? '#2E7D32' :
                porcentajes[alumno.id] >= 60 ? '#F57F17' : '#C62828'
              }">${porcentajes[alumno.id]}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        Parroquia San Mateo Acaxochitlán · Gestor Comunitario
      </div>
      </body></html>
    `

    const ventana = window.open('', '_blank')
    ventana.document.write(html)
    ventana.document.close()
    setTimeout(() => ventana.print(), 500)
    showToast('PDF generado correctamente')

  } catch (err) {
    showToast('Error al generar PDF: ' + err.message, 'error')
  }
}

// ── Exponer funciones globales ──
window.abrirModalNuevoGrupo = abrirModalNuevoGrupo
window.crearGrupo = crearGrupo
window.abrirModalEditarGrupo = abrirModalEditarGrupo
window.guardarEdicionGrupo = guardarEdicionGrupo
window.confirmarEliminarGrupo = confirmarEliminarGrupo
window.eliminarGrupo = eliminarGrupo
window.abrirModalNuevoAlumno = abrirModalNuevoAlumno
window.agregarAlumno = agregarAlumno
window.abrirModalEditarAlumno = abrirModalEditarAlumno
window.guardarEdicionAlumno = guardarEdicionAlumno
window.confirmarEliminarAlumno = confirmarEliminarAlumno
window.eliminarAlumno = eliminarAlumno
window.abrirModalTomarAsistencia = abrirModalTomarAsistencia
window.seleccionarEstado = seleccionarEstado
window.guardarAsistencia = guardarAsistencia
window.editarAsistencia = editarAsistencia
window.abrirModalNuevoTema = abrirModalNuevoTema
window.guardarTema = guardarTema
window.abrirModalEditarTema = abrirModalEditarTema
window.actualizarTema = actualizarTema
window.abrirModalGenerarPDF = abrirModalGenerarPDF
window.generarPDF = generarPDF
window.abrirModalTomarAsistencia = abrirModalTomarAsistencia
window.eliminarTema = eliminarTema