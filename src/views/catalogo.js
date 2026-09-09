import { piezasService } from '../db.js';

let piezasCache = [];
let filtroTexto = '';
let filtroMaterial = 'todos';
let piezaEnEdicionId = null;

export const MATERIALES_CNC = [
  'Aluminio 6061',
  'Aluminio 7075',
  'Acero 1018',
  'Acero 1020',
  'Acero 1045',
  'Acero A36',
  'VCL',
  'VCN',
  'Bronce SAE 64',
  'Nylon',
  'Teflón',
  'Policarbonato',
  'Inox 304',
  'Inox 316',
  'Otro'
];

export function renderCatalogoView() {
  return `
    <div class="space-y-6 pb-20">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <i data-lucide="layers" class="w-7 h-7 text-cyan-600 dark:text-cyan-400"></i>
            <span class="tracking-tight">Catálogo de Piezas Maestras</span>
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Registra, administra y edita las piezas maestras procesadas en las máquinas CNC.</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button id="btn-toggle-form" class="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer text-xs">
            <i data-lucide="plus" class="w-4 h-4 stroke-[3]"></i>
            <span id="btn-toggle-form-text">Nueva Pieza</span>
          </button>
        </div>
      </div>

      <!-- Formulario de Registro / Edición -->
      <div id="form-pieza-container" class="hidden transition-all duration-300">
        <div class="glass-panel p-6 relative overflow-hidden">
          <div class="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800/80">
            <div class="flex items-center space-x-2.5">
              <div class="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                <i data-lucide="pen-tool" class="w-4 h-4"></i>
              </div>
              <h2 id="form-title" class="text-base font-bold text-slate-900 dark:text-white tracking-tight">Registrar Nueva Pieza</h2>
            </div>
            <button id="btn-cancel-form" type="button" class="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="form-pieza" class="space-y-4">
            <input type="hidden" id="pieza-id" value="" />
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="codigo1" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Código 1 (Principal / Parte)
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 font-mono text-xs">#</span>
                  <input 
                    type="text" 
                    id="codigo1" 
                    placeholder="Ej. PZ-1001 (Opcional)" 
                    class="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-white text-sm font-mono placeholder-slate-400 dark:placeholder-slate-500 shadow-inner transition-colors"
                  />
                </div>
              </div>

              <div>
                <label for="codigo2" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Código 2 (Plano / Secundario)
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 font-mono text-xs">DWG</span>
                  <input 
                    type="text" 
                    id="codigo2" 
                    placeholder="Ej. DWG-A-042" 
                    class="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-white text-sm font-mono placeholder-slate-400 dark:placeholder-slate-500 shadow-inner transition-colors"
                  />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="material-select" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Material <span class="text-rose-500">*</span>
                </label>
                <div class="space-y-2">
                  <select 
                    id="material-select" 
                    class="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 text-slate-900 dark:text-slate-100 text-sm shadow-inner transition-colors"
                  >
                    ${MATERIALES_CNC.map(m => `<option value="${m}">${m}</option>`).join('')}
                  </select>
                  <input 
                    type="text" 
                    id="material-custom" 
                    placeholder="Especificar otro material..." 
                    class="hidden w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 text-slate-900 dark:text-white text-sm placeholder-slate-400 shadow-inner transition-colors"
                  />
                </div>
              </div>

              <div>
                <label for="descripcion" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Descripción de la Pieza <span class="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  id="descripcion" 
                  required 
                  placeholder="Ej. Brida de acople con chavetero 30mm" 
                  class="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 shadow-inner transition-colors"
                />
              </div>
            </div>

            <!-- Dimensiones de Tocho / Material Bruto (Soporte Multi-Tocho) -->
            <div class="border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-2">
              <div class="flex items-center justify-between mb-2">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  DIMENSIONES DE TOCHO / MATERIAL BRUTO (MM) — OPCIONAL
                </label>
                <button 
                  type="button" 
                  id="btn-agregar-tocho-fila" 
                  class="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center space-x-1 transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="Agregar otra fila para un tocho adicional"
                >
                  <i data-lucide="plus" class="w-3.5 h-3.5 stroke-[3]"></i>
                  <span>Agregar Tocho</span>
                </button>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-2">Si la pieza está compuesta por múltiples tochos o secciones que luego se unen, añade cada uno con "+ Agregar Tocho".</p>
              
              <div id="tochos-filas-container" class="space-y-3">
                <!-- Se inyectan dinámicamente las filas de tochos -->
              </div>
            </div>

            <div class="flex items-center justify-end space-x-2.5 pt-3">
              <button 
                type="button" 
                id="btn-cancel-form-bottom" 
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                id="btn-save-pieza" 
                class="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <i data-lucide="check" class="w-4 h-4 stroke-[3]"></i>
                <span id="btn-save-text">Guardar Pieza</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="glass-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <i data-lucide="search" class="w-4 h-4"></i>
          </span>
          <input 
            type="text" 
            id="filtro-busqueda" 
            placeholder="Buscar por código, descripción o plano..." 
            value="${filtroTexto}"
            class="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-500 shadow-inner transition-colors"
          />
          ${filtroTexto ? `
            <button id="btn-clear-search" class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>

        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2">
            <label for="filtro-material" class="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center space-x-1">
              <i data-lucide="filter" class="w-3.5 h-3.5 text-cyan-500"></i>
              <span>Material:</span>
            </label>
            <select 
              id="filtro-material" 
              class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 text-xs text-slate-800 dark:text-slate-200 shadow-inner transition-colors"
            >
              <option value="todos" ${filtroMaterial === 'todos' ? 'selected' : ''}>Todos los materiales</option>
              ${MATERIALES_CNC.map(m => `<option value="${m}" ${filtroMaterial === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>

          <div class="flex items-center justify-end px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono">
            Total: <span id="contador-piezas" class="ml-1.5 text-cyan-600 dark:text-cyan-400 font-bold">0</span>
          </div>
        </div>
      </div>

      <!-- Lista Modular de Piezas Maestras -->
      <div class="space-y-3">
        <div class="hidden lg:flex items-center px-6 py-2.5 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-cyan-400/90 bg-slate-200/80 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800/90 rounded-xl shadow-inner">
          <div class="w-40">Código Principal</div>
          <div class="w-36">Código Plano</div>
          <div class="flex-1">Descripción de la Pieza</div>
          <div class="w-44">Material</div>
          <div class="w-32">Fecha Registro</div>
          <div class="w-24 text-right">Acciones</div>
        </div>

        <div id="lista-piezas-container" class="space-y-2.5">
          <div class="py-12 text-center text-slate-500 glass-card p-6">
            <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-cyan-500 mx-auto mb-2"></i>
            <span class="text-xs font-mono">Cargando catálogo de piezas...</span>
          </div>
        </div>
      </div>

    </div>
  `;
}

export async function refrescarListaPiezas(onDataChangeCallback) {
  try {
    piezasCache = await piezasService.obtenerTodas();

    const query = filtroTexto.toLowerCase().trim();
    const filtradas = piezasCache.filter(p => {
      const coincideTexto = !query ||
        (p.codigo1 && p.codigo1.toLowerCase().includes(query)) ||
        (p.codigo2 && p.codigo2.toLowerCase().includes(query)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
        (p.material && p.material.toLowerCase().includes(query)) ||
        (p.largo && String(p.largo).toLowerCase().includes(query)) ||
        (p.ancho && String(p.ancho).toLowerCase().includes(query)) ||
        (p.espesor && String(p.espesor).toLowerCase().includes(query)) ||
        (p.di && String(p.di).toLowerCase().includes(query)) ||
        (p.de && String(p.de).toLowerCase().includes(query));

      const coincideMaterial = filtroMaterial === 'todos' || p.material === filtroMaterial;
      return coincideTexto && coincideMaterial;
    });

    const container = document.getElementById('lista-piezas-container');
    const contador = document.getElementById('contador-piezas');

    if (contador) contador.textContent = `${filtradas.length} de ${piezasCache.length}`;
    if (!container) return;

    if (filtradas.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center glass-card p-6">
          <div class="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 dark:text-slate-400 mx-auto mb-3 border border-slate-300 dark:border-slate-700">
            <i data-lucide="inbox" class="w-6 h-6"></i>
          </div>
          <p class="text-sm font-semibold text-slate-800 dark:text-white">No se encontraron piezas registradas</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Haz clic en "+ Nueva Pieza" para registrar la primera.</p>
        </div>
      `;
    } else {
      container.innerHTML = filtradas.map(pieza => {
        const fecha = pieza.fechaCreacion
          ? new Date(pieza.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '-';

        return `
          <div class="glass-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 hover:border-cyan-500/60 hover:shadow-lg transition-all duration-200 group">
            
            <!-- Columna 1: Código 1 -->
            <div class="w-full lg:w-40 flex items-center space-x-2.5">
              <span class="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>
              <span class="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-mono font-bold text-xs shadow-sm">
                ${pieza.codigo1 || 'S/C'}
              </span>
            </div>

            <!-- Columna 2: Código 2 -->
            <div class="w-full lg:w-36">
              ${pieza.codigo2 ? `<span class="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 font-mono text-xs font-semibold">${pieza.codigo2}</span>` : '<span class="text-slate-400 dark:text-slate-600 font-mono text-xs">—</span>'}
            </div>

            <!-- Columna 3: Descripción -->
            <div class="flex-1 pr-2">
              <span class="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">${pieza.descripcion || '-'}</span>
              ${(() => {
                // Obtener tochos ya sea del array tochos o de los campos individuales heredados
                let listaTochos = Array.isArray(pieza.tochos) && pieza.tochos.length > 0 ? pieza.tochos : [];
                if (listaTochos.length === 0 && (pieza.largo || pieza.ancho || pieza.espesor || pieza.di || pieza.de)) {
                  listaTochos = [{
                    largo: pieza.largo || '',
                    ancho: pieza.ancho || '',
                    espesor: pieza.espesor || '',
                    di: pieza.di || '',
                    de: pieza.de || ''
                  }];
                }

                // Filtrar tochos que tengan al menos una medida registrada
                const tochosValidos = listaTochos.filter(t => t.largo || t.ancho || t.espesor || t.di || t.de);
                if (tochosValidos.length === 0) return '';

                return `
                  <div class="mt-1.5 flex flex-col gap-1">
                    ${tochosValidos.map((t, idx) => {
                      const tienePrism = Boolean(t.largo || t.ancho || t.espesor);
                      const tieneDiam = Boolean(t.de || t.di);
                      const pastillas = [];

                      if (tienePrism) {
                        pastillas.push(`
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-medium">
                            <span>📏 Tocho${tochosValidos.length > 1 ? ` #${idx + 1}` : ''}:</span>
                            <span>${t.largo || '-'} × ${t.ancho || '-'} × ${t.espesor || '-'} mm</span>
                          </span>
                        `);
                      }
                      if (tieneDiam) {
                        pastillas.push(`
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-medium">
                            <span>⭕ Ø Ext: ${t.de || '-'} mm • Ø Int: ${t.di || '-'} mm</span>
                          </span>
                        `);
                      }

                      return `
                        <div class="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                          ${pastillas.join('<span class="text-slate-400 dark:text-slate-600 font-bold select-none">•</span>')}
                        </div>
                      `;
                    }).join('')}
                  </div>
                `;
              })()}
            </div>

            <!-- Columna 4: Material -->
            <div class="w-full lg:w-44">
              <span class="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-mono text-xs shadow-inner font-medium">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mr-2"></span>
                ${pieza.material || 'N/A'}
              </span>
            </div>

            <!-- Columna 5: Fecha -->
            <div class="w-full lg:w-32 text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
              ${fecha}
            </div>

            <!-- Columna 6: Acciones -->
            <div class="w-full lg:w-24 flex items-center justify-end space-x-1.5">
              <button 
                data-action="edit" 
                data-id="${pieza.id}" 
                title="Editar pieza" 
                class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-cyan-500/20 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 border border-slate-300 dark:border-slate-700/60 hover:border-cyan-500/40 transition-all cursor-pointer"
              >
                <i data-lucide="edit" class="w-4 h-4"></i>
              </button>
              <button 
                data-action="delete" 
                data-id="${pieza.id}" 
                title="Eliminar pieza" 
                class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700/60 hover:border-rose-500/40 transition-all cursor-pointer"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>

          </div>
        `;
      }).join('');
    }

    if (onDataChangeCallback) onDataChangeCallback();
  } catch (error) {
    console.error('Error al refrescar piezas:', error);
  }
}

export function setupCatalogoListeners({ onToast, onRefreshIcons, onDataChange }) {
  const formContainer = document.getElementById('form-pieza-container');
  const btnToggleForm = document.getElementById('btn-toggle-form');
  const btnCancelForm = document.getElementById('btn-cancel-form');
  const btnCancelFormBottom = document.getElementById('btn-cancel-form-bottom');
  const form = document.getElementById('form-pieza');
  const formTitle = document.getElementById('form-title');
  const btnSaveText = document.getElementById('btn-save-text');

  const idInput = document.getElementById('pieza-id');
  const codigo1Input = document.getElementById('codigo1');
  const codigo2Input = document.getElementById('codigo2');
  const materialSelect = document.getElementById('material-select');
  const materialCustom = document.getElementById('material-custom');
  const descripcionInput = document.getElementById('descripcion');
  const tochosContainer = document.getElementById('tochos-filas-container');
  const btnAgregarTochoFila = document.getElementById('btn-agregar-tocho-fila');

  const filtroBusquedaInput = document.getElementById('filtro-busqueda');
  const filtroMaterialSelect = document.getElementById('filtro-material');
  const btnClearSearch = document.getElementById('btn-clear-search');

  // Función para crear el HTML de una fila de tocho
  const crearFilaTochoHtml = (tocho = {}, index = 0, total = 1) => {
    return `
      <div class="tocho-fila p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 transition-all space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            <span>Tocho #${index + 1}</span>
          </span>
          ${total > 1 ? `
            <button 
              type="button" 
              class="btn-eliminar-tocho-fila p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Eliminar este tocho"
            >
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Largo (mm)</label>
            <input 
              type="text" 
              data-campo="largo"
              value="${tocho.largo || ''}"
              placeholder="Ej. 230" 
              class="w-full bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 font-mono text-xs text-slate-900 dark:text-white rounded-xl py-1.5 px-2.5 placeholder-slate-400 shadow-inner transition-colors"
            />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Ancho (mm)</label>
            <input 
              type="text" 
              data-campo="ancho"
              value="${tocho.ancho || ''}"
              placeholder="Ej. 80" 
              class="w-full bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 font-mono text-xs text-slate-900 dark:text-white rounded-xl py-1.5 px-2.5 placeholder-slate-400 shadow-inner transition-colors"
            />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Espesor (mm)</label>
            <input 
              type="text" 
              data-campo="espesor"
              value="${tocho.espesor || ''}"
              placeholder="Ej. 38 o 1-1/2&quot;" 
              class="w-full bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 font-mono text-xs text-slate-900 dark:text-white rounded-xl py-1.5 px-2.5 placeholder-slate-400 shadow-inner transition-colors"
            />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">D.I. (mm)</label>
            <input 
              type="text" 
              data-campo="di"
              value="${tocho.di || ''}"
              placeholder="Ø Interior" 
              class="w-full bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 font-mono text-xs text-slate-900 dark:text-white rounded-xl py-1.5 px-2.5 placeholder-slate-400 shadow-inner transition-colors"
            />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">D.E. (mm)</label>
            <input 
              type="text" 
              data-campo="de"
              value="${tocho.de || ''}"
              placeholder="Ø Exterior" 
              class="w-full bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 font-mono text-xs text-slate-900 dark:text-white rounded-xl py-1.5 px-2.5 placeholder-slate-400 shadow-inner transition-colors"
            />
          </div>
        </div>
      </div>
    `;
  };

  // Re-renderizar filas de tocho preservando valores si es necesario
  const renderizarFilasTochos = (tochos = [{}]) => {
    if (!tochosContainer) return;
    const lista = tochos.length > 0 ? tochos : [{}];
    tochosContainer.innerHTML = lista.map((t, idx) => crearFilaTochoHtml(t, idx, lista.length)).join('');
    if (onRefreshIcons) onRefreshIcons();
  };

  // Extraer valores de tochos actuales de los inputs
  const obtenerValoresTochosDeInputs = () => {
    if (!tochosContainer) return [];
    const filas = tochosContainer.querySelectorAll('.tocho-fila');
    const tochos = [];
    filas.forEach(fila => {
      const largo = (fila.querySelector('input[data-campo="largo"]')?.value || '').trim();
      const ancho = (fila.querySelector('input[data-campo="ancho"]')?.value || '').trim();
      const espesor = (fila.querySelector('input[data-campo="espesor"]')?.value || '').trim();
      const di = (fila.querySelector('input[data-campo="di"]')?.value || '').trim();
      const de = (fila.querySelector('input[data-campo="de"]')?.value || '').trim();

      // Solo guardamos si tiene al menos un campo lleno
      if (largo || ancho || espesor || di || de) {
        tochos.push({ largo, ancho, espesor, di, de });
      }
    });
    return tochos;
  };

  if (btnAgregarTochoFila) {
    btnAgregarTochoFila.addEventListener('click', () => {
      // Capturar los valores actuales antes de añadir nueva fila
      const filas = tochosContainer ? tochosContainer.querySelectorAll('.tocho-fila') : [];
      const actuales = [];
      filas.forEach(fila => {
        actuales.push({
          largo: fila.querySelector('input[data-campo="largo"]')?.value || '',
          ancho: fila.querySelector('input[data-campo="ancho"]')?.value || '',
          espesor: fila.querySelector('input[data-campo="espesor"]')?.value || '',
          di: fila.querySelector('input[data-campo="di"]')?.value || '',
          de: fila.querySelector('input[data-campo="de"]')?.value || ''
        });
      });
      actuales.push({}); // Nueva fila vacía
      renderizarFilasTochos(actuales);
    });
  }

  if (tochosContainer) {
    tochosContainer.addEventListener('click', (e) => {
      const btnEliminar = e.target.closest('.btn-eliminar-tocho-fila');
      if (btnEliminar) {
        const filaActual = btnEliminar.closest('.tocho-fila');
        const todasFilas = Array.from(tochosContainer.querySelectorAll('.tocho-fila'));
        const indexAEliminar = todasFilas.indexOf(filaActual);
        
        const actuales = [];
        todasFilas.forEach((f, idx) => {
          if (idx !== indexAEliminar) {
            actuales.push({
              largo: f.querySelector('input[data-campo="largo"]')?.value || '',
              ancho: f.querySelector('input[data-campo="ancho"]')?.value || '',
              espesor: f.querySelector('input[data-campo="espesor"]')?.value || '',
              di: f.querySelector('input[data-campo="di"]')?.value || '',
              de: f.querySelector('input[data-campo="de"]')?.value || ''
            });
          }
        });

        renderizarFilasTochos(actuales.length > 0 ? actuales : [{}]);
      }
    });
  }

  const abrirFormulario = (pieza = null) => {
    if (pieza) {
      piezaEnEdicionId = pieza.id;
      if (formTitle) formTitle.textContent = `Editar Pieza: ${pieza.codigo1 || pieza.descripcion}`;
      if (btnSaveText) btnSaveText.textContent = 'Actualizar Pieza';
      if (idInput) idInput.value = pieza.id;
      if (codigo1Input) codigo1Input.value = pieza.codigo1 || '';
      if (codigo2Input) codigo2Input.value = pieza.codigo2 || '';
      if (descripcionInput) descripcionInput.value = pieza.descripcion || '';

      // Cargar tochos
      let tochosACargar = Array.isArray(pieza.tochos) && pieza.tochos.length > 0 ? pieza.tochos : [];
      if (tochosACargar.length === 0 && (pieza.largo || pieza.ancho || pieza.espesor || pieza.di || pieza.de)) {
        tochosACargar = [{
          largo: pieza.largo || '',
          ancho: pieza.ancho || '',
          espesor: pieza.espesor || '',
          di: pieza.di || '',
          de: pieza.de || ''
        }];
      }
      renderizarFilasTochos(tochosACargar.length > 0 ? tochosACargar : [{}]);

      if (MATERIALES_CNC.includes(pieza.material)) {
        if (materialSelect) materialSelect.value = pieza.material;
        if (materialCustom) {
          materialCustom.value = '';
          materialCustom.classList.add('hidden');
        }
      } else {
        if (materialSelect) materialSelect.value = 'Otro';
        if (materialCustom) {
          materialCustom.value = pieza.material || '';
          materialCustom.classList.remove('hidden');
        }
      }
    } else {
      piezaEnEdicionId = null;
      if (formTitle) formTitle.textContent = 'Registrar Nueva Pieza';
      if (btnSaveText) btnSaveText.textContent = 'Guardar Pieza';
      if (form) form.reset();
      if (idInput) idInput.value = '';
      renderizarFilasTochos([{}]);
      if (materialCustom) {
        materialCustom.value = '';
        materialCustom.classList.add('hidden');
      }
    }

    if (formContainer) {
      formContainer.classList.remove('hidden');
      formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (codigo1Input) codigo1Input.focus();
    if (onRefreshIcons) onRefreshIcons();
  };

  const cerrarFormulario = () => {
    piezaEnEdicionId = null;
    if (form) form.reset();
    if (idInput) idInput.value = '';
    renderizarFilasTochos([{}]);
    if (formContainer) formContainer.classList.add('hidden');
    if (materialCustom) materialCustom.classList.add('hidden');
  };

  if (btnToggleForm) {
    btnToggleForm.addEventListener('click', () => {
      if (formContainer.classList.contains('hidden')) {
        abrirFormulario();
      } else {
        cerrarFormulario();
      }
    });
  }

  if (btnCancelForm) btnCancelForm.addEventListener('click', cerrarFormulario);
  if (btnCancelFormBottom) btnCancelFormBottom.addEventListener('click', cerrarFormulario);

  if (materialSelect) {
    materialSelect.addEventListener('change', (e) => {
      if (e.target.value === 'Otro') {
        materialCustom.classList.remove('hidden');
        materialCustom.focus();
      } else {
        materialCustom.classList.add('hidden');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const codigo1 = codigo1Input.value.trim();
      const codigo2 = codigo2Input.value.trim();
      const descripcion = descripcionInput.value.trim();
      const tochos = obtenerValoresTochosDeInputs();
      const primerTocho = tochos[0] || {};
      const largo = primerTocho.largo || '';
      const ancho = primerTocho.ancho || '';
      const espesor = primerTocho.espesor || '';
      const di = primerTocho.di || '';
      const de = primerTocho.de || '';

      let material = materialSelect.value;
      if (material === 'Otro') {
        material = materialCustom.value.trim() || 'Otro';
      }

      if (!descripcion || !material) {
        onToast?.('Por favor completa los campos requeridos (*) Descripción y Material', 'error');
        return;
      }

      try {
        const payload = {
          codigo1,
          codigo2,
          descripcion,
          material,
          tochos,
          largo,
          ancho,
          espesor,
          di,
          de
        };

        const identificador = codigo1 || descripcion;
        if (piezaEnEdicionId) {
          await piezasService.actualizar(piezaEnEdicionId, payload);
          onToast?.(`Pieza "${identificador}" actualizada`, 'success');
        } else {
          await piezasService.agregar({ ...payload, fechaCreacion: new Date().toISOString() });
          onToast?.(`Pieza "${identificador}" registrada`, 'success');
        }

        cerrarFormulario();
        await refrescarListaPiezas(onRefreshIcons);
        if (onDataChange) onDataChange();
      } catch (err) {
        console.error(err);
        onToast?.('Error al guardar pieza: ' + err.message, 'error');
      }
    });
  }

  if (filtroBusquedaInput) {
    filtroBusquedaInput.addEventListener('input', (e) => {
      filtroTexto = e.target.value;
      refrescarListaPiezas(onRefreshIcons);
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      filtroTexto = '';
      filtroBusquedaInput.value = '';
      refrescarListaPiezas(onRefreshIcons);
    });
  }

  if (filtroMaterialSelect) {
    filtroMaterialSelect.addEventListener('change', (e) => {
      filtroMaterial = e.target.value;
      refrescarListaPiezas(onRefreshIcons);
    });
  }

  const container = document.getElementById('lista-piezas-container');
  if (container) {
    container.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('button[data-action="edit"]');
      const deleteBtn = e.target.closest('button[data-action="delete"]');

      if (editBtn) {
        const id = Number(editBtn.getAttribute('data-id'));
        const pieza = await piezasService.obtenerPorId(id);
        if (pieza) abrirFormulario(pieza);
      } else if (deleteBtn) {
        const id = Number(deleteBtn.getAttribute('data-id'));
        const pieza = await piezasService.obtenerPorId(id);
        if (pieza) {
          const confirmar = confirm(`¿Estás seguro de eliminar la pieza "${pieza.codigo1} - ${pieza.descripcion}"?`);
          if (confirmar) {
            await piezasService.eliminar(id);
            onToast?.(`Pieza ${pieza.codigo1} eliminada`, 'info');
            await refrescarListaPiezas(onRefreshIcons);
            if (onDataChange) onDataChange();
          }
        }
      }
    });
  }
}