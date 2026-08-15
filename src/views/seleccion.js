import { piezasService, trabajosService } from '../db.js';

// Estado local de la vista de selección
let seleccionPiezas = {}; // { [piezaId]: { pieza, cantidad } }
let piezasDisponibles = [];
let filtroBusqueda = '';

/**
 * Renderiza la interfaz de la Pantalla 2 (Selección de Piezas - Vista Tabla Estilo Syntrix / Dark Telemetry)
 */
export function renderSeleccionView() {
  const numSeleccionadas = Object.keys(seleccionPiezas).length;

  return `
    <div class="space-y-6 pb-24">
      
      <!-- Encabezado de la Pantalla 2 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2.5">
            <i data-lucide="check-square" class="w-7 h-7 text-cyan-400"></i>
            <span>Selección de Piezas para Fabricar</span>
          </h1>
          <p class="text-sm text-slate-400 mt-1">Elige las piezas y define las cantidades a enviar a la línea de mecanizado CNC.</p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <button 
            id="btn-limpiar-seleccion" 
            class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors active:scale-95 cursor-pointer"
          >
            Limpiar Selección
          </button>

          <!-- Botón Principal Destacado en Barra Superior con Gradiente Luminoso -->
          <button 
            id="btn-enviar-top" 
            class="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer text-xs"
          >
            <i data-lucide="play" class="w-4 h-4 fill-slate-950"></i>
            <span>Enviar Seleccionadas a Control en Vivo</span>
            <span id="badge-contador-top" class="px-2 py-0.5 rounded-full bg-slate-950/30 text-slate-950 font-mono text-[11px] font-extrabold border border-slate-950/20">
              ${numSeleccionadas}
            </span>
          </button>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda Reactiva -->
      <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-3.5 flex items-center justify-between gap-4 transition-colors">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <i data-lucide="search" class="w-4 h-4"></i>
          </span>
          <input 
            type="text" 
            id="filtro-seleccion" 
            placeholder="Buscar por código, descripción o material..." 
            value="${filtroBusqueda}"
            class="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 text-sm placeholder-slate-500 shadow-inner transition-colors"
          />
          ${filtroBusqueda ? `
            <button id="btn-clear-search-sel" class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>
        
        <div class="flex items-center justify-end px-3.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 font-mono">
          Marcadas: <span id="contador-seleccionadas" class="ml-1 text-cyan-400 font-bold">${numSeleccionadas}</span>
        </div>
      </div>

      <!-- Tabla Completa de Selección de Piezas (Syntrix Glassmorphism) -->
      <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800/80">
              <tr>
                <th scope="col" class="py-3.5 px-4 text-center w-14">
                  <span class="sr-only">Selección</span>
                  <i data-lucide="check-square" class="w-4 h-4 mx-auto text-slate-400"></i>
                </th>
                <th scope="col" class="py-3.5 px-4 font-mono">Código 1</th>
                <th scope="col" class="py-3.5 px-4 font-mono">Código 2</th>
                <th scope="col" class="py-3.5 px-4">Descripción</th>
                <th scope="col" class="py-3.5 px-4">Material</th>
                <th scope="col" class="py-3.5 px-4 text-right pr-6">Cantidad a Fabricar</th>
              </tr>
            </thead>
            <tbody id="lista-seleccion-body" class="divide-y divide-slate-800/40">
              <!-- Renderizado dinámico -->
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-500">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-cyan-400"></i>
                    <span>Cargando catálogo para selección...</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Barra Flotante Inferior de Envío a Producción (Sincronizada) -->
      <div id="barra-flotante-envio" class="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30 transition-all duration-300 transform translate-y-24 opacity-0">
        <div class="bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-4 shadow-2xl shadow-black/80 flex items-center justify-between gap-4">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <i data-lucide="layers" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-sm font-bold text-white">
                <span id="resumen-total-piezas">0</span> tipos de pieza (<span id="resumen-total-unidades" class="text-cyan-400">0</span> unidades)
              </div>
              <div class="text-xs text-slate-400">Listo para enviar a la línea de Control en Vivo</div>
            </div>
          </div>

          <button 
            id="btn-enviar-produccion" 
            class="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 flex items-center space-x-2 transition-all transform active:scale-95 cursor-pointer text-xs"
          >
            <i data-lucide="play" class="w-4 h-4 fill-slate-950"></i>
            <span>Enviar a Fabricar</span>
          </button>
        </div>
      </div>

    </div>
  `;
}

/**
 * Renderiza los renglones de la tabla de selección con checkboxes y controles compactos de cantidad
 */
export async function refrescarGridSeleccion(onRefreshIcons) {
  try {
    piezasDisponibles = await piezasService.obtenerTodas();
    const query = filtroBusqueda.toLowerCase().trim();
    
    const filtradas = piezasDisponibles.filter(p => {
      if (!query) return true;
      return (p.codigo1 && p.codigo1.toLowerCase().includes(query)) ||
             (p.codigo2 && p.codigo2.toLowerCase().includes(query)) ||
             (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
             (p.material && p.material.toLowerCase().includes(query));
    });

    const tbody = document.getElementById('lista-seleccion-body');
    if (!tbody) return;

    if (filtradas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-12 text-center text-slate-500">
            <div class="flex flex-col items-center justify-center space-y-2.5">
              <div class="w-10 h-10 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                <i data-lucide="inbox" class="w-5 h-5"></i>
              </div>
              <p class="text-xs font-medium text-slate-300">No hay piezas en el catálogo</p>
              <p class="text-[11px] text-slate-500 mt-1">Primero añade piezas en la Pantalla 1 (Catálogo) para poder seleccionarlas.</p>
            </div>
          </td>
        </tr>
      `;
      actualizarBarraFlotante();
      return;
    }

    tbody.innerHTML = filtradas.map(pieza => {
      const estaSeleccionada = !!seleccionPiezas[pieza.id];
      const cantidadActual = estaSeleccionada ? seleccionPiezas[pieza.id].cantidad : 1;

      return `
        <tr class="border-b border-slate-800/40 transition-colors group ${estaSeleccionada ? 'bg-cyan-500/10 hover:bg-cyan-500/15' : 'hover:bg-slate-800/40'}">
          
          <!-- Columna 1: Checkbox de selección individual -->
          <td class="py-3 px-4 text-center">
            <button 
              type="button" 
              data-action="toggle-check" 
              data-id="${pieza.id}" 
              class="w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer mx-auto ${estaSeleccionada ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30' : 'bg-slate-950/80 border-slate-700 text-transparent hover:border-slate-500'}"
              title="${estaSeleccionada ? 'Deseleccionar pieza' : 'Seleccionar pieza'}"
            >
              <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
            </button>
          </td>

          <!-- Columna 2: Código 1 -->
          <td class="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
            <span class="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">
              ${pieza.codigo1 || 'S/C'}
            </span>
          </td>

          <!-- Columna 3: Código 2 -->
          <td class="py-3 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">
            ${pieza.codigo2 ? `<span class="px-2.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono">${pieza.codigo2}</span>` : '<span class="text-slate-600">-</span>'}
          </td>

          <!-- Columna 4: Descripción -->
          <td class="py-3 px-4 font-medium text-slate-200">
            ${pieza.descripcion || '-'}
          </td>

          <!-- Columna 5: Material (Cápsula Satinada) -->
          <td class="py-3 px-4 whitespace-nowrap">
            <span class="bg-slate-800/70 border border-slate-700/50 text-cyan-300 font-mono text-xs px-3 py-1 rounded-full shadow-inner inline-flex items-center">
              ${pieza.material || 'N/A'}
            </span>
          </td>

          <!-- Columna 6: Cantidad a Fabricar con Controles Compactos [-] [input] [+] -->
          <td class="py-3 px-4 text-right pr-6 whitespace-nowrap">
            <div class="flex items-center justify-end space-x-1.5">
              <div class="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner">
                <button 
                  type="button" 
                  data-action="dec-qty" 
                  data-id="${pieza.id}" 
                  class="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  title="Disminuir cantidad"
                >
                  -
                </button>
                <input 
                  type="number" 
                  min="1" 
                  max="9999" 
                  data-action="input-qty" 
                  data-id="${pieza.id}" 
                  value="${cantidadActual}" 
                  class="w-12 text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                />
                <button 
                  type="button" 
                  data-action="inc-qty" 
                  data-id="${pieza.id}" 
                  class="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  title="Aumentar cantidad"
                >
                  +
                </button>
              </div>
            </div>
          </td>

        </tr>
      `;
    }).join('');

    actualizarBarraFlotante();
    if (onRefreshIcons) onRefreshIcons();
  } catch (error) {
    console.error('Error al cargar piezas en tabla de selección:', error);
  }
}

/**
 * Actualiza la barra flotante y el contador superior con el total de piezas y unidades
 */
function actualizarBarraFlotante() {
  const barra = document.getElementById('barra-flotante-envio');
  const contador = document.getElementById('contador-seleccionadas');
  const badgeTop = document.getElementById('badge-contador-top');
  const totalPiezasEl = document.getElementById('resumen-total-piezas');
  const totalUnidadesEl = document.getElementById('resumen-total-unidades');

  const keys = Object.keys(seleccionPiezas);
  const numTipos = keys.length;
  let numUnidades = 0;

  keys.forEach(k => {
    numUnidades += Number(seleccionPiezas[k].cantidad || 1);
  });

  if (contador) contador.textContent = numTipos;
  if (badgeTop) badgeTop.textContent = numTipos;
  if (totalPiezasEl) totalPiezasEl.textContent = numTipos;
  if (totalUnidadesEl) totalUnidadesEl.textContent = numUnidades;

  if (barra) {
    if (numTipos > 0) {
      barra.classList.remove('translate-y-24', 'opacity-0');
      barra.classList.add('translate-y-0', 'opacity-100');
    } else {
      barra.classList.remove('translate-y-0', 'opacity-100');
      barra.classList.add('translate-y-24', 'opacity-0');
    }
  }
}

/**
 * Configura los event listeners de la Pantalla 2
 */
export function setupSeleccionListeners({ onToast, onRefreshIcons, onNavigateToControl, onDataChange }) {
  const filtroInput = document.getElementById('filtro-seleccion');
  const btnClearSearch = document.getElementById('btn-clear-search-sel');
  const btnLimpiar = document.getElementById('btn-limpiar-seleccion');
  const btnEnviarTop = document.getElementById('btn-enviar-top');
  const btnEnviar = document.getElementById('btn-enviar-produccion');
  const tbody = document.getElementById('lista-seleccion-body');

  if (filtroInput) {
    filtroInput.addEventListener('input', (e) => {
      filtroBusqueda = e.target.value;
      refrescarGridSeleccion(onRefreshIcons);
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      filtroBusqueda = '';
      filtroInput.value = '';
      refrescarGridSeleccion(onRefreshIcons);
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      seleccionPiezas = {};
      refrescarGridSeleccion(onRefreshIcons);
      onToast?.('Selección limpiada', 'info');
    });
  }

  // Delegación de eventos en la tabla
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('button[data-action="toggle-check"]');
      const incBtn = e.target.closest('button[data-action="inc-qty"]');
      const decBtn = e.target.closest('button[data-action="dec-qty"]');

      if (toggleBtn) {
        const id = Number(toggleBtn.getAttribute('data-id'));
        const pieza = piezasDisponibles.find(p => p.id === id);
        if (!pieza) return;

        if (seleccionPiezas[id]) {
          delete seleccionPiezas[id];
        } else {
          // Obtener cantidad actual de la fila si existe
          const qtyInput = tbody.querySelector(`input[data-action="input-qty"][data-id="${id}"]`);
          const cant = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
          seleccionPiezas[id] = { pieza, cantidad: cant };
        }
        refrescarGridSeleccion(onRefreshIcons);
      } else if (incBtn) {
        const id = Number(incBtn.getAttribute('data-id'));
        const pieza = piezasDisponibles.find(p => p.id === id);
        if (!pieza) return;

        if (!seleccionPiezas[id]) {
          seleccionPiezas[id] = { pieza, cantidad: 2 };
        } else {
          seleccionPiezas[id].cantidad = Number(seleccionPiezas[id].cantidad || 1) + 1;
        }
        refrescarGridSeleccion(onRefreshIcons);
      } else if (decBtn) {
        const id = Number(decBtn.getAttribute('data-id'));
        const pieza = piezasDisponibles.find(p => p.id === id);
        if (!pieza) return;

        if (seleccionPiezas[id]) {
          const nuevaCant = Number(seleccionPiezas[id].cantidad || 1) - 1;
          if (nuevaCant <= 0) {
            delete seleccionPiezas[id];
          } else {
            seleccionPiezas[id].cantidad = nuevaCant;
          }
          refrescarGridSeleccion(onRefreshIcons);
        }
      }
    });

    tbody.addEventListener('change', (e) => {
      const qtyInput = e.target.closest('input[data-action="input-qty"]');
      if (qtyInput) {
        const id = Number(qtyInput.getAttribute('data-id'));
        const pieza = piezasDisponibles.find(p => p.id === id);
        if (!pieza) return;

        const val = parseInt(qtyInput.value, 10);
        if (val > 0) {
          seleccionPiezas[id] = { pieza, cantidad: val };
        } else {
          delete seleccionPiezas[id];
        }
        refrescarGridSeleccion(onRefreshIcons);
      }
    });
  }

  // Función común para enviar piezas seleccionadas a producción
  const ejecutarEnvioProduccion = async () => {
    const items = Object.values(seleccionPiezas);
    if (items.length === 0) {
      onToast?.('Selecciona al menos una pieza para fabricar marcando su casilla', 'error');
      return;
    }

    try {
      let fusionadosCount = 0;
      let nuevosCount = 0;

      for (const item of items) {
        const resultado = await trabajosService.agregarOFusionar({
          piezaId: item.pieza.id,
          codigo1: item.pieza.codigo1,
          codigo2: item.pieza.codigo2,
          descripcion: item.pieza.descripcion,
          material: item.pieza.material,
          cantidad: Number(item.cantidad || 1),
          fechaCreacion: new Date().toISOString()
        });

        if (resultado.fusionado) {
          fusionadosCount++;
        } else {
          nuevosCount++;
        }
      }

      // Limpiar selección
      seleccionPiezas = {};
      actualizarBarraFlotante();
      
      let mensaje = `${nuevosCount} nuevo(s) trabajo(s) en proceso.`;
      if (fusionadosCount > 0) {
        mensaje += ` ${fusionadosCount} trabajo(s) existente(s) fueron fusionados sumando su cantidad.`;
      }
      onToast?.(mensaje, 'success');

      if (onDataChange) await onDataChange();
      if (onNavigateToControl) onNavigateToControl();
    } catch (err) {
      console.error(err);
      onToast?.('Error al enviar trabajos: ' + err.message, 'error');
    }
  };

  if (btnEnviarTop) {
    btnEnviarTop.addEventListener('click', ejecutarEnvioProduccion);
  }

  if (btnEnviar) {
    btnEnviar.addEventListener('click', ejecutarEnvioProduccion);
  }
}
