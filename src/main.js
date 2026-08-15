import { 
  createIcons, 
  Layers, 
  CheckSquare, 
  PlayCircle, 
  History, 
  Clock, 
  Settings, 
  Moon, 
  Sun, 
  RefreshCw, 
  X, 
  Download, 
  Upload, 
  Info, 
  CheckCircle2, 
  Check, 
  ListPlus, 
  Timer, 
  Calendar, 
  FileSpreadsheet, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Filter, 
  Plus, 
  Search, 
  Inbox, 
  PenTool, 
  SunMoon, 
  Database, 
  AlertTriangle, 
  Loader2,
  RotateCcw,
  Gauge,
  List,
  FileText,
  Calculator,
  UploadCloud,
  Lock
} from 'lucide';
import { 
  db, 
  piezasService, 
  trabajosService, 
  intervalosService, 
  configService, 
  backupService, 
  checkDatabaseHealth,
  seedDemoPiezas
} from './db.js';
import { renderCatalogoView, setupCatalogoListeners, refrescarListaPiezas } from './views/catalogo.js';
import { renderSeleccionView, setupSeleccionListeners, refrescarGridSeleccion } from './views/seleccion.js';
import { renderControlView, setupControlListeners, refrescarControlTrabajos, detenerTimerLoop } from './views/control.js';
import { renderHistorialView, setupHistorialListeners, refrescarHistorial } from './views/historial.js';
import { renderHorasExtrasView, setupHorasExtrasListeners, refrescarHorasExtras } from './views/horasExtras.js';
import { renderModalConfig, setupModalConfigListeners, updateThemeSegmentedUI } from './components/modalConfig.js';

// ============================================================================
// Estado Global de la Aplicación
// ============================================================================
let activeView = 'catalogo';

// Registro selectivo de iconos para alto rendimiento y bundle reducido
const appIcons = {
  Layers,
  CheckSquare,
  PlayCircle,
  History,
  Clock,
  Settings,
  Moon,
  Sun,
  RefreshCw,
  X,
  Download,
  Upload,
  Info,
  CheckCircle2,
  Check,
  ListPlus,
  Timer,
  Calendar,
  FileSpreadsheet,
  Play,
  Pause,
  Trash2,
  Edit,
  Filter,
  Plus,
  Search,
  Inbox,
  PenTool,
  SunMoon,
  Database,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Gauge,
  List,
  FileText,
  Calculator,
  UploadCloud,
  Lock
};

// ============================================================================
// Funciones de Utilidad e Iconografía
// ============================================================================
export function refreshIcons() {
  createIcons({ icons: appIcons });
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-500' :
                  type === 'error' ? 'bg-rose-600 dark:bg-rose-600 text-white border-rose-500' :
                  'bg-zinc-900 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 border-zinc-700';

  toast.className = `${bgClass} px-4 py-3 rounded-xl shadow-xl border text-xs font-medium flex items-center space-x-2 pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  // Animación de entrada
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Auto eliminar
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================================
// Gestión del Tema Claro / Oscuro con Persistencia
// ============================================================================
export async function setAppTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  localStorage.setItem('georgiswork_theme', theme);
  await configService.set('theme', theme);
  showToast(`Modo ${theme === 'dark' ? 'Oscuro' : 'Claro'} activado`, 'info');
  updateThemeSegmentedUI();
  refreshIcons();
}

async function initTheme() {
  let savedTheme = localStorage.getItem('georgiswork_theme');
  if (!savedTheme) {
    savedTheme = await configService.get('theme', null);
  }
  
  // Por defecto oscuro
  if (!savedTheme) {
    savedTheme = 'dark';
  }

  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  localStorage.setItem('georgiswork_theme', savedTheme);
}

// ============================================================================
// Vistas del Sistema (Estructura de Navegación Modular)
// ============================================================================
const views = {
  catalogo: renderCatalogoView,
  seleccion: renderSeleccionView,
  control: renderControlView,
  historial: renderHistorialView,
  'horas-extras': renderHorasExtrasView
};

// ============================================================================
// Verificación de Base de Datos en Tiempo Real
// ============================================================================
export async function updateDBStatus() {
  const detailsEl = document.getElementById('db-status-details');
  const pillEl = document.getElementById('db-status-pill');

  const health = await checkDatabaseHealth();
  if (health.success) {
    if (pillEl) {
      pillEl.className = 'text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono border border-emerald-500/30';
      pillEl.textContent = 'Conectada';
    }
    if (detailsEl) {
      detailsEl.textContent = `IndexedDB: ${health.name} (v${health.version}) | Piezas: ${health.counts.piezas}, Trabajos: ${health.counts.trabajos}, Intervalos: ${health.counts.intervalosTiempo}, Config: ${health.counts.configuracion}`;
    }
  } else {
    if (pillEl) {
      pillEl.className = 'text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono border border-rose-500/30';
      pillEl.textContent = 'Error';
    }
    if (detailsEl) {
      detailsEl.textContent = `Error: ${health.error}`;
    }
  }
}

// ============================================================================
// Renderizado y Navegación
// ============================================================================
export async function navigateTo(viewKey) {
  if (!views[viewKey]) return;

  // Limpiar temporizadores anteriores si salimos de la vista de control
  if (activeView === 'control' && viewKey !== 'control') {
    detenerTimerLoop();
  }

  activeView = viewKey;

  // Actualizar botones de navegación desktop
  document.querySelectorAll('#desktop-nav .nav-tab').forEach(btn => {
    if (btn.getAttribute('data-nav') === viewKey) {
      btn.className = 'nav-tab active bg-slate-800 text-cyan-400 font-semibold shadow-md shadow-cyan-950/30 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-sm flex items-center space-x-2 transition-all cursor-pointer';
    } else {
      btn.className = 'nav-tab text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg px-3 py-1.5 transition-all text-sm font-medium flex items-center space-x-2 cursor-pointer';
    }
  });

  // Actualizar botones de navegación móvil
  document.querySelectorAll('#mobile-nav .nav-tab-mobile').forEach(btn => {
    if (btn.getAttribute('data-nav') === viewKey) {
      btn.className = 'nav-tab-mobile active px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-cyan-400 shadow-md border border-cyan-500/30 flex items-center space-x-1.5';
    } else {
      btn.className = 'nav-tab-mobile px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center space-x-1.5';
    }
  });

  // Renderizar contenido
  const container = document.getElementById('view-container');
  if (container) {
    container.innerHTML = views[viewKey]();
    
    // Configurar listeners según la vista activa
    if (viewKey === 'catalogo') {
      setupCatalogoListeners({
        onToast: showToast,
        onRefreshIcons: refreshIcons,
        onDataChange: updateDBStatus
      });
      await refrescarListaPiezas(refreshIcons);
    } else if (viewKey === 'seleccion') {
      setupSeleccionListeners({
        onToast: showToast,
        onRefreshIcons: refreshIcons,
        onNavigateToControl: () => navigateTo('control'),
        onDataChange: updateDBStatus
      });
      await refrescarGridSeleccion(refreshIcons);
    } else if (viewKey === 'control') {
      setupControlListeners({
        onToast: showToast,
        onRefreshIcons: refreshIcons,
        onDataChange: updateDBStatus,
        onNavigateToHistorial: () => navigateTo('historial')
      });
      await refrescarControlTrabajos(refreshIcons);
    } else if (viewKey === 'historial') {
      setupHistorialListeners({
        onToast: showToast,
        onRefreshIcons: refreshIcons,
        onDataChange: updateDBStatus
      });
      await refrescarHistorial(refreshIcons);
    } else if (viewKey === 'horas-extras') {
      setupHorasExtrasListeners({
        onToast: showToast,
        onRefreshIcons: refreshIcons
      });
      await refrescarHorasExtras(refreshIcons);
    }

    refreshIcons();
  }
}

// ============================================================================
// Configuración de Eventos Globales
// ============================================================================
function setupGlobalEventListeners() {
  // Navegación Desktop
  document.querySelectorAll('#desktop-nav .nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      navigateTo(target);
    });
  });

  // Navegación Móvil
  document.querySelectorAll('#mobile-nav .nav-tab-mobile').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      navigateTo(target);
    });
  });

  // Botón Test DB en el banner
  const testDbBtn = document.getElementById('btn-test-db');
  if (testDbBtn) {
    testDbBtn.addEventListener('click', async () => {
      try {
        const testCode = 'TEST-' + Math.floor(Math.random() * 1000);
        const testId = await piezasService.agregar({
          codigo1: testCode,
          codigo2: 'PLANO-TEST',
          descripcion: 'Pieza de prueba rápida de IndexedDB',
          material: 'Aluminio 6061'
        });
        
        await updateDBStatus();
        if (activeView === 'catalogo') {
          await refrescarListaPiezas(refreshIcons);
        } else if (activeView === 'seleccion') {
          await refrescarGridSeleccion(refreshIcons);
        } else if (activeView === 'historial') {
          await refrescarHistorial(refreshIcons);
        } else if (activeView === 'horas-extras') {
          await refrescarHorasExtras(refreshIcons);
        }
        showToast(`Pieza de prueba #${testId} agregada`, 'success');
      } catch (err) {
        showToast('Error en prueba de DB: ' + err.message, 'error');
      }
    });
  }

  // Inyectar el Modal de Configuración y configurar sus listeners
  const modalContainer = document.getElementById('modal-container-root');
  if (modalContainer) {
    modalContainer.innerHTML = renderModalConfig();
    setupModalConfigListeners({
      onToast: showToast,
      onSetTheme: setAppTheme,
      onRefreshData: async () => {
        await updateDBStatus();
        if (activeView === 'catalogo') {
          await refrescarListaPiezas(refreshIcons);
        } else if (activeView === 'seleccion') {
          await refrescarGridSeleccion(refreshIcons);
        } else if (activeView === 'control') {
          await refrescarControlTrabajos(refreshIcons);
        } else if (activeView === 'historial') {
          await refrescarHistorial(refreshIcons);
        } else if (activeView === 'horas-extras') {
          await refrescarHorasExtras(refreshIcons);
        }
      },
      onRefreshIcons: refreshIcons
    });
  }
}

// ============================================================================
// Registro de Service Worker para PWA 100% Offline
// ============================================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator && !window.location.host.includes('localhost:5173')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('✔ Service Worker PWA registrado con éxito:', reg.scope);
        })
        .catch((err) => {
          console.log('Nota: Service Worker no registrado (modo dev):', err);
        });
    });
  }

  // Notificación de estado de conexión
  window.addEventListener('online', () => {
    showToast('Conexión reestablecida', 'success');
  });
  window.addEventListener('offline', () => {
    showToast('Modo sin conexión (100% operativo con IndexedDB)', 'info');
  });
}

// ============================================================================
// Inicialización Principal de la Aplicación
// ============================================================================
async function initApp() {
  await initTheme();
  await seedDemoPiezas(); // Insertar piezas demo si la DB está vacía
  setupGlobalEventListeners();
  registerServiceWorker();
  await navigateTo('catalogo');
  await updateDBStatus();
  updateThemeSegmentedUI();
  refreshIcons();
  console.log('🚀 GeorgisWork CNC (Módulo 6: PWA & Offline) completamente activo.');
}

window.addEventListener('DOMContentLoaded', initApp);
