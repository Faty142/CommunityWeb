/* ═══════════════════════════════════════════
   GESTOR COMUNITARIO — App Logic
═══════════════════════════════════════════ */

import { supabase, supabaseAdmin } from './supabase-config.js'
import { setupMinistro } from './ministro.js'
import { setupCatequista } from './catequista.js'

// ── Estado global ──
let currentUser = null
let currentRole = null
let currentPerfil = null
let sidebarOpen = false

// ── Navegación entre páginas ──
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active')
    p.style.display = 'none'
  })
  const page = document.getElementById(id)
  page.style.display = ''
  requestAnimationFrame(() => page.classList.add('active'))
}

// ── Toggle sidebar ──
function toggleSidebar() {
  sidebarOpen = !sidebarOpen
  document.getElementById('sidebar').classList.toggle('open', sidebarOpen)
}

// ── Toggle password ──
function togglePassword() {
  const input = document.getElementById('login-password')
  input.type = input.type === 'password' ? 'text' : 'password'
}

// ── Toast ──
function showToast(msg, tipo = 'default') {
  const toast = document.getElementById('toast')
  toast.textContent = msg
  toast.className = 'toast show'
  if (tipo === 'error') toast.style.background = '#C62828'
  else toast.style.background = ''
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000)
}

// ── Modal ──
function openModal(html) {
  const backdrop = document.getElementById('modal-backdrop')
  const container = document.getElementById('modal-container')
  backdrop.classList.add('active')
  container.innerHTML = html
  requestAnimationFrame(() => {
    container.querySelector('.modal')?.classList.add('active')
  })
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('active')
  const modal = document.getElementById('modal-container').querySelector('.modal')
  if (modal) {
    modal.classList.remove('active')
    setTimeout(() => {
      document.getElementById('modal-container').innerHTML = ''
    }, 200)
  }
}

// ── Cambiar vista ──
function switchView(viewId, title) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  const view = document.getElementById(viewId)
  if (view) view.classList.add('active')
  const titleEl = document.getElementById('topbar-title')
  if (titleEl && title) titleEl.textContent = title
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'))
  const navItem = document.querySelector(`[data-view="${viewId}"]`)
  if (navItem) navItem.classList.add('active')
}

// ══════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════
async function doLogin() {
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  const errorEl = document.getElementById('login-error')
  const btnLogin = document.getElementById('btn-login')

  errorEl.style.display = 'none'

  if (!email || !password) {
    errorEl.textContent = 'Por favor ingresa tu correo y contraseña.'
    errorEl.style.display = 'block'
    return
  }

  btnLogin.textContent = 'Iniciando sesión...'
  btnLogin.disabled = true

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    currentUser = data.user

    // Obtener perfil
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single()

    if (perfilError || !perfil) {
      throw new Error('No se encontró el perfil. Contacta al administrador.')
    }

    currentPerfil = perfil
    currentRole = perfil.rol

    // Verificar si está desactivado
    if (!perfil.estado) {
      await supabase.auth.signOut()
      throw new Error('Tu cuenta ha sido desactivada. Contacta al ministro.')
    }

    // Verificar primer login catequista
    if (currentRole === 'catequista' && perfil.password_temporal) {
      showPage('page-onboarding')
      return
    }

    setupApp()
    showPage('page-app')
    showToast(`¡Bienvenido/a, ${perfil.nombre_completo}!`)

  } catch (err) {
    errorEl.textContent = err.message || 'Correo o contraseña incorrectos.'
    errorEl.style.display = 'block'
  } finally {
    btnLogin.textContent = 'Iniciar sesión'
    btnLogin.disabled = false
  }
}

// ── Logout ──
async function doLogout() {
  await supabase.auth.signOut()
  currentUser = null
  currentRole = null
  currentPerfil = null
  document.getElementById('views-container').innerHTML = ''
  showPage('page-login')
  showToast('Sesión cerrada')
}

// ══════════════════════════════════════════
// SETUP APP
// ══════════════════════════════════════════
function setupApp() {
  const initials = currentPerfil.nombre_completo
    .split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  document.getElementById('sidebar-name').textContent = currentPerfil.nombre_completo
  document.getElementById('sidebar-role').textContent =
    currentRole === 'ministro' ? 'Coordinador Cultural' : 'Catequista'
  document.getElementById('sidebar-avatar').textContent = initials
  document.getElementById('topbar-avatar').textContent = initials

  if (currentRole === 'ministro') {
    setupMinistro()
  } else if (currentRole === 'catequista') {
    setupCatequista()
  }
}

// ══════════════════════════════════════════
// ONBOARDING CATEQUISTA
// ══════════════════════════════════════════
function showOnboardPane(num) {
  document.querySelectorAll('.onboard-pane').forEach(p => p.classList.remove('active'))
  document.getElementById(`onboard-pane-${num}`).classList.add('active')
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done')
    if (i + 1 < num) s.classList.add('done')
    else if (i + 1 === num) s.classList.add('active')
  })
}

async function onboardStep1() {
  const newPass = document.getElementById('new-password').value
  const confirmPass = document.getElementById('confirm-password').value

  if (!newPass || newPass.length < 8) {
    showToast('La contraseña debe tener al menos 8 caracteres', 'error')
    return
  }
  if (newPass !== confirmPass) {
    showToast('Las contraseñas no coinciden', 'error')
    return
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) throw error
    showOnboardPane(2)
  } catch (err) {
    showToast('Error al cambiar contraseña: ' + err.message, 'error')
  }
}

async function onboardStep2() {
  const email = document.getElementById('onboard-email').value.trim()
  if (!email || !email.includes('@')) {
    showToast('Ingresa un correo válido', 'error')
    return
  }

  try {
    await supabase.from('perfiles')
      .update({ correo_personal: email })
      .eq('user_id', currentUser.id)
    showOnboardPane(3)
  } catch (err) {
    showToast('Error al guardar correo', 'error')
  }
}

async function onboardFinish() {
  const checked = document.getElementById('terms-check').checked
  if (!checked) {
    showToast('Debes aceptar los términos para continuar', 'error')
    return
  }

  try {
    await supabase.from('perfiles')
      .update({
        password_temporal: false,
        terminos_aceptados: true
      })
      .eq('user_id', currentUser.id)

    currentPerfil.password_temporal = false
    currentPerfil.terminos_aceptados = true

    setupApp()
    showPage('page-app')
    showToast(`¡Bienvenido/a, ${currentPerfil.nombre_completo}!`)
  } catch (err) {
    showToast('Error al finalizar configuración', 'error')
  }
}

// ══════════════════════════════════════════
// AVISOS PÚBLICOS (página pública)
// ══════════════════════════════════════════
let filtroActual = 'todos'

async function cargarAvisosPublicos(filtro = 'todos') {
  filtroActual = filtro
  const grid = document.getElementById('avisos-grid')
  const countEl = document.getElementById('avisos-count')

  grid.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Cargando avisos...</p>
    </div>`

  try {
    const { data: avisos, error } = await supabase
      .from('avisos_publicos')
      .select('*')
      .eq('estado', true)
      .order('fecha_publicacion', { ascending: false })

    if (error) throw error

    const hoyDate = new Date()
    const unaSemana = new Date(hoyDate - 7 * 24 * 60 * 60 * 1000)
    const unMes = new Date(hoyDate - 30 * 24 * 60 * 60 * 1000)

    // Filtrar expirados
    let avisosFiltrados = avisos.filter(a => {
      if (!a.fecha_expiracion) return true
      return new Date(a.fecha_expiracion) > hoyDate
    })

    // Aplicar filtro de tiempo
    if (filtro === 'semana') {
      avisosFiltrados = avisosFiltrados.filter(a =>
        new Date(a.fecha_publicacion) >= unaSemana
      )
    } else if (filtro === 'mes') {
      avisosFiltrados = avisosFiltrados.filter(a =>
        new Date(a.fecha_publicacion) >= unMes &&
        new Date(a.fecha_publicacion) < unaSemana
      )
    } else if (filtro === 'anteriores') {
      avisosFiltrados = avisosFiltrados.filter(a =>
        new Date(a.fecha_publicacion) < unMes
      )
    }

    countEl.textContent = `${avisosFiltrados.length} aviso${avisosFiltrados.length !== 1 ? 's' : ''}`

    if (avisosFiltrados.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📢</div>
          <p>No hay avisos en este período.</p>
        </div>`
      return
    }

    grid.innerHTML = avisosFiltrados.map((aviso, i) => `
      <div class="aviso-card" style="animation-delay: ${i * 0.08}s">
        ${aviso.imagen_url
          ? `<img class="aviso-card-img" src="${aviso.imagen_url}" alt="${aviso.titulo}" />`
          : `<div class="aviso-card-img-placeholder">📢</div>`
        }
        <div class="aviso-card-body">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <span class="aviso-tag">Aviso</span>
            ${aviso.fecha_expiracion
              ? `<span style="background:var(--amarillo-fondo);color:var(--amarillo);
                  padding:3px 10px;border-radius:50px;font-size:11px;font-weight:700">
                  ⏰ Expira: ${formatDate(aviso.fecha_expiracion)}
                </span>`
              : ''
            }
          </div>
          <h4>${aviso.titulo}</h4>
          <p>${aviso.contenido}</p>
        </div>
        <div class="aviso-card-footer">
          <span class="aviso-date">📅 ${formatDate(aviso.fecha_publicacion)}</span>
        </div>
      </div>
    `).join('')

  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Error al cargar los avisos. Intenta más tarde.</p>
      </div>`
  }
}

function cambiarFiltroAviso(btn, filtro) {
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  cargarAvisosPublicos(filtro)
}

window.cambiarFiltroAviso = cambiarFiltroAviso

// ── Formato de fecha ──
function formatDate(dateStr) {
  if (!dateStr) return 'Sin fecha'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

// ══════════════════════════════════════════
// EXPONER FUNCIONES GLOBALES
// ══════════════════════════════════════════
window.showPage = showPage
window.toggleSidebar = toggleSidebar
window.togglePassword = togglePassword
window.doLogin = doLogin
window.doLogout = doLogout
window.closeModal = closeModal
window.showOnboardPane = showOnboardPane
window.onboardStep1 = onboardStep1
window.onboardStep2 = onboardStep2
window.onboardFinish = onboardFinish

// ── Init ──
showPage('page-public')
cargarAvisosPublicos()

// Cerrar sidebar al hacer click fuera
document.addEventListener('click', e => {
  if (sidebarOpen &&
    !e.target.closest('.sidebar') &&
    !e.target.closest('.btn-menu')) {
    toggleSidebar()
  }
})

// Enter en login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('page-login').classList.contains('active')) {
    doLogin()
  }
})

// Exportar para uso en otros archivos
export { supabase, supabaseAdmin, currentUser, currentRole, currentPerfil, showPage, switchView, openModal, closeModal, showToast, formatDate }