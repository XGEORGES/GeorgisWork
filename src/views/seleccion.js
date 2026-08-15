import { piezasService, trabajosService } from '../db.js';

// Estado local de la vista de selección
let seleccionPiezas = {}; // { [piezaId]: { pieza, cantidad } }
let piezasDisponibles = [];
let filtroBusqueda = '';

/**
 * Renderiza la interfaz de la Pantalla 2 (Selección de Piezas - Estilo Syntrix)
 */
export function renderSeleccionView() {
  return `
    <div class="space-y-6 pb-24">
      
      <!-- Encabezado de la Pantalla 2 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <i data-lucide="check-square" class="w-7 h-7 text-cyan-600 dark:text-cyan-400"></i>
            <span>Selección de Piezas para Fabricar</span>
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Elige las piezas y cantidades a enviar a la línea de mecanizado CNC.</p>
        </div>

        <div class="flex items-center gap-3">
          <button id="btn-limpiar-seleccion" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors active:scale-95 cursor-pointer">
            Limpiar Selección
          </button>
        </div>
      </div>

      <!-- Barra de Búsqueda Rápida -->
      <div class="glass-panel p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-md flex items-center justify-between gap-4 transition-colors">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <i data-lucide="search" class="w-4 h-4"></i>
          </span>
          <input 
            type="text" 
            id="filtro-seleccion" 
            placeholder="Buscar por código, descripción o material..." 
            value="${filtroBusqueda}"
            class="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
          />
        </div>
        <div class="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:block">
          Seleccionadas: <span id="contador-seleccionadas" class="text-cyan-600 dark:text-cyan-400 font-bold">0</span> piezas
        </div>
      </div>

      <!-- Grid de Tarjetas de Piezas del Catálogo -->
      <div id="grid-piezas-seleccion" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Renderizado dinámico -->
        <div class="col-span-full py-12 text-center text-slate-400">
          <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-cyan-500 mx-auto mb-2"></i>
          <span>Cargando piezas disponibles...</span>
        </div>
      </div>

      <!-- Barra Flotante Inferior de Envío a Producción -->
      <div id="barra-flotante-envio" class="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30 transition-all duration-300 transform translate-y-24 opacity-0">
        <div class="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-white/95 dark:bg-[#111827]/95 shadow-2xl flex items-center justify-between gap-4 backdrop-blur-2xl">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <i data-lucide="layers" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-sm font-bold text-slate-900 dark:text-white">
                <span id="resumen-total-piezas">0</span> tipos de pieza (<span id="resumen-total-unidades" class="text-cyan-600 dark:text-cyan-400">0</span> unidades)
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Listo para enviar a la línea de Control en Vivo</div>
            </div>
          </div>

          <button 
            id="btn-enviar-produccion" 
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 flex items-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <i data-lucide="play" class="w-4 h-4 fill-white"></i>
            <span>Enviar a Fabricar</span>
          </button>
        </div>
      </div>

    </div>
  `;
}

/**
 * Renderiza las tarjetas de piezas disponibles con controles de cantidad
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

    const grid = document.getElementById('grid-piezas-seleccion');
    if (!grid) return;

    if (filtradas.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400 glass-card rounded-2xl p-8 bg-white/90 dark:bg-[#111827]/75 border border-slate-200 dark:border-slate-800">
          <div class="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <i data-lucide="inbox" class="w-5 h-5"></i>
          </div>
          <p class="text-xs font-medium text-slate-700 dark:text-slate-300">No hay piezas en el catálogo</p>
          <p class="text-[11px] text-slate-400 mt-1">Primero añade piezas en la Pantalla 1 (Catálogo) para poder seleccionarlas.</p>
        </div>
      `;
      actualizarBarraFlotante();
      return;
    }

    grid.innerHTML = filtradas.map(pieza => {
      const estaSeleccionada = !!seleccionPiezas[pieza.id];
      const cantidadActual = estaSeleccionada ? seleccionPiezas[pieza.id].cantidad : 1;

      return `
        <div class="rounded-2xl p-5 border transition-all duration-200 shadow-md ${estaSeleccionada ? 'border-cyan-500/80 bg-cyan-50/40 dark:bg-[#111827] ring-1 ring-cyan-500/30 shadow-cyan-500/5' : 'border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-[#111827]/75 hover:border-slate-300 dark:hover:border-slate-700'}">
          
          <div class="flex items-start justify-between gap-2 mb-3">
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                  ${pieza.codigo1 || 'S/C'}
                </span>
                ${pieza.codigo2 ? `<span class="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 font-mono">${pieza.codigo2}</span>` : ''}
              </div>
              <h3 class="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-2 line-clamp-1">${pieza.descripcion}</h3>
            </div>
            
            <!-- Checkbox de selección rápida -->
            <button 
              type="button" 
              data-action="toggle-check" 
              data-id="${pieza.id}" 
              class="w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${estaSeleccionada ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-transparent hover:border-slate-400 dark:hover:border-slate-500'}"
            >
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="mb-4">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              ${pieza.material}
            </span>
          </div>

          <!-- Control de Cantidad -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Cantidad a fabricar:</span>
            
            <div class="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button 
                type="button" 
                data-action="dec-qty" 
                data-id="${pieza.id}" 
                class="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold transition-colors shadow-sm cursor-pointer"
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
                class="w-10 text-center bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
              />
              <button 
                type="button" 
                data-action="inc-qty" 
                data-id="${pieza.id}" 
                class="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold transition-colors shadow-sm cursor-pointer"
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

/**
 * Actualiza la barra flotante con el total de piezas y unidades
 */
function actualizarBarraFlotante() {
  const barra = document.getElementById('barra-flotante-envio');
  const contador = document.getElementById('contador-seleccionadas');
  const totalPiezasEl = document.getElementById('resumen-total-piezas');
  const totalUnidadesEl = document.getElementById('resumen-total-unidades');

  const keys = Object.keys(seleccionPiezas);
  const numTipos = keys.length;
  let numUnidades = 0;

  keys.forEach(k => {
    numUnidades += Number(seleccionPiezas[k].cantidad || 1);
  });

  if (contador) contador.textContent = numTipos;
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
  const btnLimpiar = document.getElementById('btn-limpiar-seleccion');
  const btnEnviar = document.getElementById('btn-enviar-produccion');
  const grid = document.getElementById('grid-piezas-seleccion');

  if (filtroInput) {
    filtroInput.addEventListener('input', (e) => {
      filtroBusqueda = e.target.value;
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

  // Delegación de eventos en las tarjetas
  if (grid) {
    grid.addEventListener('click', (e) => {
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
          seleccionPiezas[id] = { pieza, cantidad: 1 };
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

    grid.addEventListener('change', (e) => {
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

  // Enviar a Fabricar con Lógica de Fusión
  if (btnEnviar) {
    btnEnviar.addEventListener('click', async () => {
      const items = Object.values(seleccionPiezas);
      if (items.length === 0) {
        onToast?.('Selecciona al menos una pieza para fabricar', 'error');
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
    });
  }
}
