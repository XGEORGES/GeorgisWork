import { piezasService } from '../db.js';

let piezasCache = [];
let filtroTexto = '';
let filtroMaterial = 'todos';
let piezaEnEdicionId = null;

// Lista de materiales estándar comunes en mecanizado CNC
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
  'Inox 306',
  'Inox 316',
  'Otro'
];

/**
 * Renderiza la vista completa del Catálogo (Pantalla 1 - Estilo Syntrix / Industrial Dark Telemetry)
 */
export function renderCatalogoView() {
  return `
    <div class="space-y-6">
      
      <!-- Encabezado de la Pantalla 1 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2.5">
            <i data-lucide="layers" class="w-7 h-7 text-cyan-400"></i>
            <span>Catálogo de Piezas Maestras</span>
          </h1>
          <p class="text-sm text-slate-400 mt-1">Registra, administra y edita las piezas a procesar en las máquinas CNC.</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button id="btn-toggle-form" class="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium px-4 py-2 rounded-xl active:scale-95 transition-all flex items-center space-x-2 cursor-pointer shadow-sm">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span id="btn-toggle-form-text">Nueva Pieza</span>
          </button>
        </div>
      </div>

      <!-- Formulario de Registro / Edición de Pieza -->
      <div id="form-pieza-container" class="hidden transition-all duration-300">
        <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-6 relative">
          <div class="flex items-center justify-between pb-4 mb-5 border-b border-slate-800/80">
            <div class="flex items-center space-x-2.5">
              <div class="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <i data-lucide="pen-tool" class="w-4 h-4"></i>
              </div>
              <h2 id="form-title" class="text-base font-bold text-white">Registrar Nueva Pieza</h2>
            </div>
            <button id="btn-cancel-form" type="button" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="form-pieza" class="space-y-4">
            <input type="hidden" id="pieza-id" value="" />
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Código 1 -->
              <div>
                <label for="codigo1" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Código 1 (Principal / Parte) <span class="text-rose-400">*</span>
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 font-mono text-xs">#</span>
                  <input 
                    type="text" 
                    id="codigo1" 
                    required 
                    placeholder="Ej. PZ-1001" 
                    class="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 text-sm font-mono placeholder-slate-500 shadow-inner transition-colors"
                  />
                </div>
              </div>

              <!-- Código 2 -->
              <div>
                <label for="codigo2" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Código 2 (Plano / Secundario)
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 font-mono text-xs">DWG</span>
                  <input 
                    type="text" 
                    id="codigo2" 
                    placeholder="Ej. DWG-A-042" 
                    class="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 text-sm font-mono placeholder-slate-500 shadow-inner transition-colors"
                  />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Material -->
              <div>
                <label for="material-select" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Material <span class="text-rose-400">*</span>
                </label>
                <div class="space-y-2">
                  <select 
                    id="material-select" 
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 text-sm shadow-inner transition-colors"
                  >
                    ${MATERIALES_CNC.map(m => `<option value="${m}">${m}</option>`).join('')}
                  </select>
                  <input 
                    type="text" 
                    id="material-custom" 
                    placeholder="Especificar otro material..." 
                    class="hidden w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 text-sm placeholder-slate-500 shadow-inner transition-colors"
                  />
                </div>
              </div>

              <!-- Descripción -->
              <div>
                <label for="descripcion" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descripción de la Pieza <span class="text-rose-400">*</span>
                </label>
                <input 
                  type="text" 
                  id="descripcion" 
                  required 
                  placeholder="Ej. Brida de acople con chavetero 30mm" 
                  class="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 text-sm placeholder-slate-500 shadow-inner transition-colors"
                />
              </div>
            </div>

            <!-- Botones Formulario -->
            <div class="flex items-center justify-end space-x-2.5 pt-3">
              <button 
                type="button" 
                id="btn-cancel-form-bottom" 
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                id="btn-save-pieza" 
                class="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <i data-lucide="check" class="w-4 h-4"></i>
                <span id="btn-save-text">Guardar Pieza</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-colors">
        
        <!-- Input de Búsqueda rápida -->
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <i data-lucide="search" class="w-4 h-4"></i>
          </span>
          <input 
            type="text" 
            id="filtro-busqueda" 
            placeholder="Buscar por código, descripción o plano..." 
            value="${filtroTexto}"
            class="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 text-sm placeholder-slate-500 shadow-inner transition-colors"
          />
          ${filtroTexto ? `
            <button id="btn-clear-search" class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>

        <!-- Filtro por Material -->
        <div class="flex items-center space-x-2">
          <label for="filtro-material" class="text-xs font-semibold text-slate-400 whitespace-nowrap flex items-center space-x-1">
            <i data-lucide="filter" class="w-3.5 h-3.5 text-cyan-400"></i>
            <span>Material:</span>
          </label>
          <select 
            id="filtro-material" 
            class="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 shadow-inner transition-colors"
          >
            <option value="todos" ${filtroMaterial === 'todos' ? 'selected' : ''}>Todos los materiales</option>
            ${MATERIALES_CNC.map(m => `<option value="${m}" ${filtroMaterial === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>

        <!-- Total Badge -->
        <div class="flex items-center justify-end px-3.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 font-mono">
          Total: <span id="contador-piezas" class="ml-1 text-cyan-400 font-bold">0</span>
        </div>
      </div>

      <!-- Tabla de Piezas Maestras (Syntrix Glassmorphism) -->
      <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800/80">
              <tr>
                <th scope="col" class="py-3.5 px-4 font-mono">Código 1</th>
                <th scope="col" class="py-3.5 px-4 font-mono">Código 2</th>
                <th scope="col" class="py-3.5 px-4">Descripción</th>
                <th scope="col" class="py-3.5 px-4">Material</th>
                <th scope="col" class="py-3.5 px-4">Fecha Registro</th>
                <th scope="col" class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="lista-piezas-body" class="divide-y divide-slate-800/40">
              <!-- Renderizado dinámico -->
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-500">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-cyan-400"></i>
                    <span>Cargando catálogo de piezas...</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

/**
 * Filtra y renderiza los renglones de la tabla de piezas
 */
export async function refrescarListaPiezas(onDataChangeCallback) {
  try {
    piezasCache = await piezasService.obtenerTodas();
    
    // Aplicar filtros
    const query = filtroTexto.toLowerCase().trim();
    const filtradas = piezasCache.filter(p => {
      const coincideTexto = !query || 
        (p.codigo1 && p.codigo1.toLowerCase().includes(query)) ||
        (p.codigo2 && p.codigo2.toLowerCase().includes(query)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
        (p.material && p.material.toLowerCase().includes(query));
      
      const coincideMaterial = filtroMaterial === 'todos' || p.material === filtroMaterial;

      return coincideTexto && coincideMaterial;
    });

    const tbody = document.getElementById('lista-piezas-body');
    const contador = document.getElementById('contador-piezas');
    
    if (contador) {
      contador.textContent = `${filtradas.length} de ${piezasCache.length}`;
    }

    if (!tbody) return;

    if (filtradas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-12 text-center text-slate-500">
            <div class="flex flex-col items-center justify-center space-y-2.5">
              <div class="w-10 h-10 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                <i data-lucide="inbox" class="w-5 h-5"></i>
              </div>
              <p class="text-xs font-medium text-slate-300">No se encontraron piezas registradas</p>
              <p class="text-[11px] text-slate-500">
                ${piezasCache.length === 0 ? 'Haz clic en "Nueva Pieza" para registrar la primera.' : 'Prueba cambiando los criterios de búsqueda o filtro.'}
              </p>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = filtradas.map(pieza => {
        const fecha = pieza.fechaCreacion 
          ? new Date(pieza.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '-';

        return `
          <tr class="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors group">
            <td class="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
              <span class="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">
                ${pieza.codigo1 || '-'}
              </span>
            </td>
            <td class="py-3 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">
              ${pieza.codigo2 ? `<span class="px-2.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono">${pieza.codigo2}</span>` : '<span class="text-slate-600">-</span>'}
            </td>
            <td class="py-3 px-4 font-medium text-slate-200">
              ${pieza.descripcion || '-'}
            </td>
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="bg-slate-800/70 border border-slate-700/50 text-cyan-300 font-mono text-xs px-3 py-1 rounded-full shadow-inner inline-flex items-center">
                ${pieza.material || 'N/A'}
              </span>
            </td>
            <td class="py-3 px-4 text-xs text-slate-400 font-mono whitespace-nowrap">
              ${fecha}
            </td>
            <td class="py-3 px-4 text-right whitespace-nowrap">
              <div class="flex items-center justify-end space-x-1">
                <button 
                  data-action="edit" 
                  data-id="${pieza.id}" 
                  title="Editar pieza" 
                  class="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                >
                  <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                </button>
                <button 
                  data-action="delete" 
                  data-id="${pieza.id}" 
                  title="Eliminar pieza" 
                  class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (onDataChangeCallback) {
      onDataChangeCallback();
    }
  } catch (error) {
    console.error('Error al refrescar piezas:', error);
  }
}

/**
 * Configura los event listeners específicos de la Pantalla 1 (Catálogo)
 */
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

  const filtroBusquedaInput = document.getElementById('filtro-busqueda');
  const filtroMaterialSelect = document.getElementById('filtro-material');
  const btnClearSearch = document.getElementById('btn-clear-search');

  // Función para abrir/cerrar el formulario
  const abrirFormulario = (pieza = null) => {
    if (pieza) {
      piezaEnEdicionId = pieza.id;
      if (formTitle) formTitle.textContent = `Editar Pieza: ${pieza.codigo1}`;
      if (btnSaveText) btnSaveText.textContent = 'Actualizar Pieza';
      if (idInput) idInput.value = pieza.id;
      if (codigo1Input) codigo1Input.value = pieza.codigo1 || '';
      if (codigo2Input) codigo2Input.value = pieza.codigo2 || '';
      if (descripcionInput) descripcionInput.value = pieza.descripcion || '';
      
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

  // Manejo del selector de material 'Otro'
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

  // Guardar / Actualizar Pieza
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const codigo1 = codigo1Input.value.trim();
      const codigo2 = codigo2Input.value.trim();
      const descripcion = descripcionInput.value.trim();
      let material = materialSelect.value;
      if (material === 'Otro') {
        material = materialCustom.value.trim() || 'Otro';
      }

      if (!codigo1 || !descripcion || !material) {
        onToast?.('Por favor completa todos los campos requeridos (*)', 'error');
        return;
      }

      try {
        if (piezaEnEdicionId) {
          // Actualización
          await piezasService.actualizar(piezaEnEdicionId, {
            codigo1,
            codigo2,
            descripcion,
            material
          });
          onToast?.(`Pieza ${codigo1} actualizada exitosamente`, 'success');
        } else {
          // Registro nuevo
          await piezasService.agregar({
            codigo1,
            codigo2,
            descripcion,
            material,
            fechaCreacion: new Date().toISOString()
          });
          onToast?.(`Pieza ${codigo1} registrada en el catálogo`, 'success');
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

  // Búsqueda en tiempo real
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

  // Filtro por material
  if (filtroMaterialSelect) {
    filtroMaterialSelect.addEventListener('change', (e) => {
      filtroMaterial = e.target.value;
      refrescarListaPiezas(onRefreshIcons);
    });
  }

  // Delegación de eventos para botones de Editar y Borrar en la tabla
  const tbody = document.getElementById('lista-piezas-body');
  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('button[data-action="edit"]');
      const deleteBtn = e.target.closest('button[data-action="delete"]');

      if (editBtn) {
        const id = Number(editBtn.getAttribute('data-id'));
        const pieza = await piezasService.obtenerPorId(id);
        if (pieza) {
          abrirFormulario(pieza);
        }
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
