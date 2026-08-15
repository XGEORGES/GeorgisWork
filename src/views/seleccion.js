import { piezasService, trabajosService } from '../db.js';

let seleccionPiezas = {};
let piezasDisponibles = [];
let filtroBusqueda = '';

export function renderSeleccionView() {
  const numSeleccionadas = Object.keys(seleccionPiezas).length;

  return `
    <div class="space-y-6 pb-28">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <i data-lucide="check-square" class="w-7 h-7 text-cyan-600 dark:text-cyan-400"></i>
            <span class="tracking-tight">Selección de Piezas para Fabricar</span>
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Elige las piezas maestras y define las cantidades a enviar a la línea de mecanizado CNC.</p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <button 
            id="btn-limpiar-seleccion" 
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-900/90 hover:bg-slate-300 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            Limpiar Selección
          </button>

          <button 
            id="btn-enviar-top" 
            class="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer text-xs"
          >
            <i data-lucide="play" class="w-4 h-4 fill-slate-950"></i>
            <span>Enviar a Control en Vivo</span>
            <span id="badge-contador-top" class="px-2 py-0.5 rounded-full bg-slate-950/30 text-slate-950 font-mono text-[11px] font-extrabold border border-slate-950/20">
              ${numSeleccionadas}
            </span>
          </button>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="glass-card p-4 flex items-center justify-between gap-4">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <i data-lucide="search" class="w-4 h-4"></i>
          </span>
          <input 
            type="text" 
            id="filtro-seleccion" 
            placeholder="Buscar por código, descripción o material..." 
            value="${filtroBusqueda}"
            class="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-500 shadow-inner transition-colors"
          />
          ${filtroBusqueda ? `
            <button id="btn-clear-search-sel" class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>
        
        <div class="flex items-center justify-end px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono">
          Marcadas: <span id="contador-seleccionadas" class="ml-1.5 text-cyan-600 dark:text-cyan-400 font-bold">${numSeleccionadas}</span>
        </div>
      </div>

      <!-- Lista Modular -->
      <div class="space-y-3">
        <div class="hidden lg:flex items-center px-6 py-2.5 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-cyan-400/90 bg-slate-200/80 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800/90 rounded-xl shadow-inner">
          <div class="w-14 text-center">Sel.</div>
          <div class="w-40">Código Principal</div>
          <div class="w-36">Código Plano</div>
          <div class="flex-1">Descripción</div>
          <div class="w-44">Material</div>
          <div class="w-36 text-right">Cantidad a Fabricar</div>
        </div>

        <div id="lista-seleccion-container" class="space-y-2.5">
          <div class="py-12 text-center text-slate-500 glass-card p-6">
            <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-cyan-500 mx-auto mb-2"></i>
            <span class="text-xs font-mono">Cargando catálogo para selección...</span>
          </div>
        </div>
      </div>

      <!-- Barra Flotante Inferior -->
      <div id="barra-flotante-envio" class="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30 transition-all duration-300 transform translate-y-28 opacity-0">
        <div class="glass-panel p-4 flex items-center justify-between gap-4 border border-cyan-500/50 shadow-[0_10px_35px_rgba(6,182,212,0.25)]">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              <i data-lucide="layers" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-sm font-bold text-slate-900 dark:text-white">
                <span id="resumen-total-piezas">0</span> tipos de pieza (<span id="resumen-total-unidades" class="text-cyan-600 dark:text-cyan-400">0</span> unidades)
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">Listo para transferir a Control en Vivo</div>
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

    const container = document.getElementById('lista-seleccion-container');
    if (!container) return;

    if (filtradas.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center glass-card p-6">
          <p class="text-sm font-semibold text-slate-800 dark:text-white">No hay piezas en el catálogo</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Primero añade piezas en la Pantalla 1 (Catálogo).</p>
        </div>
      `;
      actualizarBarraFlotante();
      return;
    }

    container.innerHTML = filtradas.map(pieza => {
      const estaSeleccionada = !!seleccionPiezas[pieza.id];
      const cantidadActual = estaSeleccionada ? seleccionPiezas[pieza.id].cantidad : 1;

      const cardBorder = estaSeleccionada
        ? 'border-cyan-500/70 bg-cyan-500/10 dark:bg-cyan-950/25 shadow-md ring-1 ring-cyan-500/40'
        : 'hover:border-slate-400 dark:hover:border-slate-700/80';

      return `
        <div class="glass-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 transition-all duration-200 group ${cardBorder}">
          
          <!-- Checkbox -->
          <div class="w-full lg:w-14 flex items-center justify-start lg:justify-center">
            <button 
              type="button" 
              data-action="toggle-check" 
              data-id="${pieza.id}" 
              class="w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${estaSeleccionada ? 'bg-gradient-to-tr from-cyan-500 to-emerald-400 border-cyan-300 text-slate-950 shadow-md shadow-cyan-500/30' : 'bg-white dark:bg-slate-950/80 border-slate-300 dark:border-slate-700 text-transparent hover:border-slate-500'}"
              title="${estaSeleccionada ? 'Deseleccionar' : 'Seleccionar'}"
            >
              <i data-lucide="check" class="w-4 h-4 stroke-[3]"></i>
            </button>
          </div>

          <!-- Código 1 -->
          <div class="w-full lg:w-40 flex items-center space-x-2.5">
            <span class="w-2.5 h-2.5 rounded-full ${estaSeleccionada ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]'}"></span>
            <span class="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-mono font-bold text-xs shadow-sm">
              ${pieza.codigo1 || 'S/C'}
            </span>
          </div>

          <!-- Código 2 -->
          <div class="w-full lg:w-36">
            ${pieza.codigo2 ? `<span class="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 font-mono text-xs font-semibold">${pieza.codigo2}</span>` : '<span class="text-slate-400 dark:text-slate-600 font-mono text-xs">—</span>'}
          </div>

          <!-- Descripción -->
          <div class="flex-1 pr-2">
            <span class="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">${pieza.descripcion || '-'}</span>
          </div>

          <!-- Material -->
          <div class="w-full lg:w-44">
            <span class="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-mono text-xs shadow-inner font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mr-2"></span>
              ${pieza.material || 'N/A'}
            </span>
          </div>

          <!-- Controles de Cantidad -->
          <div class="w-full lg:w-36 flex items-center justify-end">
            <div class="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 p-1 rounded-xl shadow-inner">
              <button 
                type="button" 
                data-action="dec-qty" 
                data-id="${pieza.id}" 
                class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold transition-colors shadow-sm cursor-pointer"
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
                class="w-12 text-center bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
              />
              <button 
                type="button" 
                data-action="inc-qty" 
                data-id="${pieza.id}" 
                class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold transition-colors shadow-sm cursor-pointer"
                title="Aumentar cantidad"
              >
                +
              </button>
            </div>
          </div>

        </div>
      `;
    }).join('');

    actualizarBarraFlotante();
    if (onRefreshIcons) onRefreshIcons();
  } catch (error) {
    console.error('Error al cargar piezas en selección:', error);
  }
}

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
      barra.classList.remove('translate-y-28', 'opacity-0');
      barra.classList.add('translate-y-0', 'opacity-100');
    } else {
      barra.classList.remove('translate-y-0', 'opacity-100');
      barra.classList.add('translate-y-28', 'opacity-0');
    }
  }
}

export function setupSeleccionListeners({ onToast, onRefreshIcons, onNavigateToControl, onDataChange }) {
  const filtroInput = document.getElementById('filtro-seleccion');
  const btnClearSearch = document.getElementById('btn-clear-search-sel');
  const btnLimpiar = document.getElementById('btn-limpiar-seleccion');
  const btnEnviarTop = document.getElementById('btn-enviar-top');
  const btnEnviar = document.getElementById('btn-enviar-produccion');
  const container = document.getElementById('lista-seleccion-container');

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

  if (container) {
    container.addEventListener('click', (e) => {
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
          const qtyInput = container.querySelector(`input[data-action="input-qty"][data-id="${id}"]`);
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

    container.addEventListener('change', (e) => {
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

      seleccionPiezas = {};
      actualizarBarraFlotante();

      let mensaje = `${nuevosCount} nuevo(s) trabajo(s) en proceso.`;
      if (fusionadosCount > 0) {
        mensaje += ` ${fusionadosCount} trabajo(s) existente(s) fueron fusionados.`;
      }
      onToast?.(mensaje, 'success');

      if (onDataChange) await onDataChange();
      if (onNavigateToControl) onNavigateToControl();
    } catch (err) {
      console.error(err);
      onToast?.('Error al enviar trabajos: ' + err.message, 'error');
    }
  };

  if (btnEnviarTop) btnEnviarTop.addEventListener('click', ejecutarEnvioProduccion);
  if (btnEnviar) btnEnviar.addEventListener('click', ejecutarEnvioProduccion);
}