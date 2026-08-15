import { configService, backupService } from '../db.js';

/**
 * Renderiza el modal de Configuración y Respaldos
 */
export function renderModalConfig() {
  return `
    <div id="settings-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div class="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
        
        <!-- Botón de Cierre Superior (X) -->
        <button id="btn-close-settings" class="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        
        <!-- Encabezado Modal -->
        <div class="flex items-center space-x-3.5 mb-6">
          <div class="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
            <i data-lucide="settings" class="w-6 h-6"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white tracking-tight">Configuración del Sistema</h3>
            <p class="text-xs text-slate-400">Preferencias de entorno y copias de seguridad de datos</p>
          </div>
        </div>

        <div class="space-y-4">
          
          <!-- Bloque: Tema Visual Claro / Oscuro -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="text-sm font-bold text-slate-200 flex items-center gap-2">
                <i data-lucide="sun-moon" class="w-4 h-4 text-amber-400"></i>
                <span>Tema Visual</span>
              </div>
              <p class="text-xs text-slate-400">Alterna en tiempo real entre Modo Oscuro y Modo Claro.</p>
            </div>
            
            <button id="modal-theme-toggle-btn" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all flex items-center space-x-2 shadow-sm">
              <i data-lucide="moon" class="w-4 h-4 text-cyan-400 dark:block hidden"></i>
              <i data-lucide="sun" class="w-4 h-4 text-amber-400 dark:hidden block"></i>
              <span id="theme-status-text">Cambiar Modo</span>
            </button>
          </div>

          <!-- Bloque: Copias de Seguridad (JSON) -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div class="space-y-1">
              <div class="text-sm font-bold text-slate-200 flex items-center gap-2">
                <i data-lucide="database" class="w-4 h-4 text-blue-400"></i>
                <span>Respaldo y Restauración de Base de Datos</span>
              </div>
              <p class="text-xs text-slate-400">
                Exporta el catálogo maestro, configuración e historial de trabajos concluidos con sus intervalos. Excluye trabajos en proceso y deja la cola limpia al restaurar.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <!-- Exportar -->
              <button 
                id="btn-export-backup" 
                class="py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer"
              >
                <i data-lucide="download" class="w-4 h-4"></i>
                <span>Exportar Backup (.JSON)</span>
              </button>

              <!-- Importar -->
              <label 
                class="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-sm"
              >
                <i data-lucide="upload" class="w-4 h-4 text-emerald-400"></i>
                <span>Importar Backup (.JSON)</span>
                <input id="input-import-backup" type="file" accept=".json,application/json" class="hidden" />
              </label>
            </div>
            
            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start space-x-2">
              <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400"></i>
              <span>Al importar un backup, se restaura el catálogo y el historial terminado, dejando la línea de producción (Pantalla 3) limpia.</span>
            </div>
          </div>

          <!-- Bloque: Información del Sistema -->
          <div class="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 space-y-1 font-mono">
            <div class="flex justify-between">
              <span>Aplicación:</span>
              <span class="text-slate-200">GeorgisWork CNC v1.0</span>
            </div>
            <div class="flex justify-between">
              <span>Motor Local:</span>
              <span class="text-slate-200">IndexedDB (Dexie.js)</span>
            </div>
            <div class="flex justify-between">
              <span>Modo Offline:</span>
              <span class="text-emerald-400 font-semibold">100% Autónomo</span>
            </div>
          </div>

        </div>

        <!-- Botón Inferior de Cierre -->
        <div class="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button id="btn-close-settings-footer" class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  `;
}

/**
 * Configura los eventos del modal de configuración
 */
export function setupModalConfigListeners({ onToast, onThemeChange, onRefreshData, onRefreshIcons }) {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const closeFooterBtn = document.getElementById('btn-close-settings-footer');
  const modalThemeBtn = document.getElementById('modal-theme-toggle-btn');
  const exportBtn = document.getElementById('btn-export-backup');
  const importInput = document.getElementById('input-import-backup');

  const openModal = () => {
    if (!modal) return;
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

  // Alternar tema desde el modal
  if (modalThemeBtn) {
    modalThemeBtn.addEventListener('click', async () => {
      if (onThemeChange) {
        await onThemeChange();
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
