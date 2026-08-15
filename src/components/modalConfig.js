import { configService, backupService, piezasService } from '../db.js';

/**
 * Renderiza el modal de Configuración, Respaldos y Diagnóstico DB (Estilo Syntrix / Industrial Telemetry)
 */
export function renderModalConfig() {
  return `
    <div id="settings-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div class="bg-white/95 dark:bg-[#111827]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 text-slate-900 dark:text-slate-100 w-full max-w-xl rounded-2xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto transition-colors">
        
        <!-- Botón de Cierre Superior (X) -->
        <button id="btn-close-settings" class="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        
        <!-- Encabezado Modal -->
        <div class="flex items-center space-x-3.5 mb-6">
          <div class="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-md shadow-cyan-500/10">
            <i data-lucide="settings" class="w-6 h-6"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Configuración del Sistema</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Preferencias de entorno, copias de seguridad y diagnóstico de base de datos</p>
          </div>
        </div>

        <div class="space-y-4">
          
          <!-- Bloque 1: Apariencia / Selector de Tema Segmented Switch -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 space-y-3 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <i data-lucide="sun-moon" class="w-4 h-4 text-cyan-600 dark:text-cyan-400"></i>
                  <span>Apariencia / Tema</span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Personaliza la visualización de la interfaz según las condiciones de iluminación.</p>
              </div>
            </div>

            <!-- Segmented Switch Moderno -->
            <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-950/80 border border-slate-300/70 dark:border-slate-800">
              <button 
                id="theme-opt-dark" 
                type="button"
                data-theme-choice="dark"
                class="theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <i data-lucide="moon" class="w-4 h-4 text-cyan-400"></i>
                <span>Oscuro (Industrial)</span>
              </button>
              <button 
                id="theme-opt-light" 
                type="button"
                data-theme-choice="light"
                class="theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <i data-lucide="sun" class="w-4 h-4 text-amber-500"></i>
                <span>Claro (Alto Contraste)</span>
              </button>
            </div>
          </div>

          <!-- Bloque 2: Copias de Seguridad (JSON) -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 space-y-3.5 shadow-sm">
            <div class="space-y-1">
              <div class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <i data-lucide="database" class="w-4 h-4 text-cyan-600 dark:text-cyan-400"></i>
                <span>Respaldo y Restauración de Datos</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Exporta el catálogo maestro, configuración e historial de trabajos concluidos con sus intervalos en formato .JSON.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <!-- Exportar -->
              <button 
                id="btn-export-backup" 
                class="py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                <span>Exportar Backup (.JSON)</span>
              </button>

              <!-- Importar -->
              <label 
                class="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-200/70 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-sm active:scale-95"
              >
                <i data-lucide="download" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                <span>Importar Backup (.JSON)</span>
                <input id="input-import-backup" type="file" accept=".json,application/json" class="hidden" />
              </label>
            </div>
            
            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start space-x-2">
              <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500 dark:text-amber-400"></i>
              <span>Al importar un backup, se restaura el catálogo y el historial terminado dejando la cola de mecanizado en vivo limpia.</span>
            </div>
          </div>

          <!-- Bloque 3: Herramientas del Sistema / Diagnóstico DB -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 space-y-3.5 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <i data-lucide="gauge" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                <span>Herramientas del Sistema / Diagnóstico DB</span>
              </div>
              <span id="db-status-pill" class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono border border-emerald-500/30">Conectada</span>
            </div>

            <!-- Detalles del esquema y contadores -->
            <div class="p-3 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-slate-500 dark:text-slate-400">Motor de Datos:</span>
                <span class="text-slate-800 dark:text-slate-200 font-semibold">IndexedDB (Dexie.js v1)</span>
              </div>
              <p id="db-status-details" class="text-[11px] text-slate-600 dark:text-slate-400 font-mono break-all leading-relaxed">
                Verificando tablas de la base de datos local...
              </p>
            </div>

            <!-- Botón Test DB -->
            <div class="flex items-center justify-between pt-1">
              <span class="text-xs text-slate-500 dark:text-slate-400">¿Deseas probar la escritura y persistencia local?</span>
              <button 
                id="btn-test-db" 
                type="button"
                class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
              >
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                <span>Probar Test DB</span>
              </button>
            </div>
          </div>

          <!-- Bloque 4: Información de la Aplicación -->
          <div class="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-1.5 font-mono">
            <div class="flex justify-between">
              <span>Aplicación:</span>
              <span class="text-slate-800 dark:text-slate-200 font-semibold">GeorgisWork CNC v1.0</span>
            </div>
            <div class="flex justify-between">
              <span>Modo Offline PWA:</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">100% Autónomo</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Soporte:</span>
              <a href="mailto:j.huamayalli@gmail.com" class="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline transition-colors">j.huamayalli@gmail.com</a>
            </div>
          </div>

        </div>

        <!-- Botón Inferior de Cierre -->
        <div class="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button id="btn-close-settings-footer" class="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition-all active:scale-95 shadow-sm cursor-pointer">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  `;
}

/**
 * Actualiza visualmente el switch segmentado según el tema actual
 */
export function updateThemeSegmentedUI() {
  const isDark = document.documentElement.classList.contains('dark');
  const optDark = document.getElementById('theme-opt-dark');
  const optLight = document.getElementById('theme-opt-light');

  if (!optDark || !optLight) return;

  const activeDarkClass = 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700 font-bold';
  const activeLightClass = 'bg-white text-cyan-700 shadow-sm border border-slate-300 font-bold';
  const inactiveClass = 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent font-medium';

  if (isDark) {
    optDark.className = `theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs transition-all duration-200 active:scale-95 ${activeDarkClass}`;
    optLight.className = `theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs transition-all duration-200 active:scale-95 ${inactiveClass}`;
  } else {
    optLight.className = `theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs transition-all duration-200 active:scale-95 ${activeLightClass}`;
    optDark.className = `theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs transition-all duration-200 active:scale-95 ${inactiveClass}`;
  }
}

/**
 * Configura los eventos del modal de configuración y diagnóstico DB
 */
export function setupModalConfigListeners({ onToast, onSetTheme, onRefreshData, onRefreshIcons }) {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const closeFooterBtn = document.getElementById('btn-close-settings-footer');
  const optDark = document.getElementById('theme-opt-dark');
  const optLight = document.getElementById('theme-opt-light');
  const exportBtn = document.getElementById('btn-export-backup');
  const importInput = document.getElementById('input-import-backup');
  const testDbBtn = document.getElementById('btn-test-db');

  const openModal = () => {
    if (!modal) return;
    updateThemeSegmentedUI();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (onRefreshIcons) onRefreshIcons();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Segmented Switch para Selección de Tema
  if (optDark) {
    optDark.addEventListener('click', async () => {
      if (onSetTheme) {
        await onSetTheme('dark');
        updateThemeSegmentedUI();
      }
    });
  }

  if (optLight) {
    optLight.addEventListener('click', async () => {
      if (onSetTheme) {
        await onSetTheme('light');
        updateThemeSegmentedUI();
      }
    });
  }

  // Probar Test DB dentro de la sección de diagnóstico
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
        
        if (onRefreshData) await onRefreshData();
        onToast?.(`Prueba DB exitosa: Pieza #${testId} agregada`, 'success');
      } catch (err) {
        onToast?.('Error en prueba de DB: ' + err.message, 'error');
      }
    });
  }

  // Exportar Backup JSON
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        const json = await backupService.exportarJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const fecha = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `GeorgisWork_Backup_${fecha}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onToast?.('Copia de seguridad descargada exitosamente (.json)', 'success');
      } catch (err) {
        console.error(err);
        onToast?.('Error al generar la copia de seguridad: ' + err.message, 'error');
      }
    });
  }

  // Importar Backup JSON
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          await backupService.importarJSON(event.target.result);
          onToast?.('Base de datos restaurada correctamente', 'success');
          if (onRefreshData) await onRefreshData();
          closeModal();
        } catch (err) {
          console.error(err);
          onToast?.('Error al importar copia de seguridad: ' + err.message, 'error');
        } finally {
          importInput.value = '';
        }
      };
      reader.readAsText(file);
    });
  }
}
