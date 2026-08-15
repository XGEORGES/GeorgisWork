import { configService, backupService } from '../db.js';

/**
 * Renderiza el modal de Configuración y Respaldos (Estilo Linear / shadcn)
 */
export function renderModalConfig() {
  return `
    <div id="settings-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 w-full max-w-xl rounded-2xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto transition-colors">
        
        <!-- Botón de Cierre Superior (X) -->
        <button id="btn-close-settings" class="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        
        <!-- Encabezado Modal -->
        <div class="flex items-center space-x-3.5 mb-6">
          <div class="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
            <i data-lucide="settings" class="w-6 h-6 text-blue-600 dark:text-blue-400"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Configuración del Sistema</h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Preferencias de entorno, apariencia y copias de seguridad</p>
          </div>
        </div>

        <div class="space-y-4">
          
          <!-- Bloque: Apariencia / Selector de Tema Segmented Switch -->
          <div class="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <div class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <i data-lucide="sun-moon" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>
                  <span>Apariencia / Tema</span>
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">Personaliza la visualización de la interfaz para tu entorno de trabajo.</p>
              </div>
            </div>

            <!-- Segmented Switch Moderno -->
            <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-300/60 dark:border-zinc-800">
              <button 
                id="theme-opt-dark" 
                type="button"
                data-theme-choice="dark"
                class="theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
              >
                <i data-lucide="moon" class="w-4 h-4 text-blue-400"></i>
                <span>Oscuro</span>
              </button>
              <button 
                id="theme-opt-light" 
                type="button"
                data-theme-choice="light"
                class="theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
              >
                <i data-lucide="sun" class="w-4 h-4 text-amber-500"></i>
                <span>Claro</span>
              </button>
            </div>
          </div>

          <!-- Bloque: Copias de Seguridad (JSON) -->
          <div class="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div class="space-y-1">
              <div class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <i data-lucide="database" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>
                <span>Respaldo y Restauración de Base de Datos</span>
              </div>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                Exporta el catálogo maestro, configuración e historial de trabajos concluidos con sus intervalos. Excluye trabajos en proceso y deja la cola limpia al restaurar.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <!-- Exportar -->
              <button 
                id="btn-export-backup" 
                class="py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                <span>Exportar Backup (.JSON)</span>
              </button>

              <!-- Importar -->
              <label 
                class="py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-200/70 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-700 flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-sm active:scale-95"
              >
                <i data-lucide="download" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                <span>Importar Backup (.JSON)</span>
                <input id="input-import-backup" type="file" accept=".json,application/json" class="hidden" />
              </label>
            </div>
            
            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start space-x-2">
              <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500 dark:text-amber-400"></i>
              <span>Al importar un backup, se restaura el catálogo y el historial terminado, dejando la línea de producción (Pantalla 3) limpia.</span>
            </div>
          </div>

          <!-- Bloque: Información del Sistema -->
          <div class="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 font-mono">
            <div class="flex justify-between">
              <span>Aplicación:</span>
              <span class="text-zinc-900 dark:text-zinc-200 font-semibold">GeorgisWork CNC v1.0</span>
            </div>
            <div class="flex justify-between">
              <span>Motor Local:</span>
              <span class="text-zinc-900 dark:text-zinc-200 font-semibold">IndexedDB (Dexie.js)</span>
            </div>
            <div class="flex justify-between">
              <span>Modo Offline:</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">100% Autónomo</span>
            </div>
          </div>

        </div>

        <!-- Botón Inferior de Cierre -->
        <div class="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button id="btn-close-settings-footer" class="px-5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 transition-all active:scale-95 shadow-sm">
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

  const activeClass = 'bg-white text-zinc-900 shadow-sm border border-zinc-200/80 dark:bg-zinc-800 dark:text-white dark:border-zinc-700/60 font-bold';
  const inactiveClass = 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent font-medium';

  if (isDark) {
    optDark.className = `theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs transition-all duration-200 active:scale-95 ${activeClass}`;
    optLight.className = `theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs transition-all duration-200 active:scale-95 ${inactiveClass}`;
  } else {
    optLight.className = `theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs transition-all duration-200 active:scale-95 ${activeClass}`;
    optDark.className = `theme-segment-btn flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs transition-all duration-200 active:scale-95 ${inactiveClass}`;
  }
}

/**
 * Configura los eventos del modal de configuración
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
