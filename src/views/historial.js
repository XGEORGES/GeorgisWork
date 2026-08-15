import { trabajosService, intervalosService, calcularTiempoTotal } from '../db.js';
import { MATERIALES_CNC } from './catalogo.js';

// Estado local de filtros para el Historial
let historialCache = [];
let filtroTexto = '';
let filtroMaterial = 'todos';
let fechaDesde = '';
let fechaHasta = '';

/**
 * Renderiza la interfaz completa de la Pantalla 4 (Historial de Trabajos Terminados - Estilo Syntrix / Dark Telemetry)
 */
export function renderHistorialView() {
  return `
    <div class="space-y-6 pb-16">
      
      <!-- Encabezado de la Pantalla 4 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2.5">
            <i data-lucide="history" class="w-7 h-7 text-emerald-400"></i>
            <span>Historial de Trabajos Concluidos</span>
          </h1>
          <p class="text-sm text-slate-400 mt-1">Registro cronológico de órdenes finalizadas, tiempos netos reales y métricas de producción.</p>
        </div>

        <div class="flex items-center gap-2">
          <button id="btn-limpiar-filtros-historial" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center space-x-1.5 active:scale-95 cursor-pointer">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
            <span>Restablecer Filtros</span>
          </button>
        </div>
      </div>

      <!-- Tarjetas de Métricas Resumen (KPIs Telemetría) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Total Trabajos Terminados -->
        <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-5 flex items-center space-x-4">
          <div class="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <i data-lucide="check-circle-2" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Trabajos Concluidos</div>
            <div id="kpi-total-trabajos" class="text-2xl font-mono font-bold text-white mt-0.5">0</div>
          </div>
        </div>

        <!-- Total Piezas Producidas -->
        <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-5 flex items-center space-x-4">
          <div class="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <i data-lucide="layers" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Piezas Fabricadas</div>
            <div id="kpi-total-piezas" class="text-2xl font-mono font-bold text-white mt-0.5">0</div>
          </div>
        </div>

        <!-- Tiempo Total Mecanizado -->
        <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-5 flex items-center space-x-4">
          <div class="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <i data-lucide="clock" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Tiempo Total Neto</div>
            <div id="kpi-tiempo-total" class="text-2xl font-mono font-bold text-amber-400 mt-0.5">0h 0min</div>
          </div>
        </div>

        <!-- Promedio por Pieza -->
        <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-5 flex items-center space-x-4">
          <div class="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <i data-lucide="gauge" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Promedio / Pieza</div>
            <div id="kpi-promedio-pieza" class="text-2xl font-mono font-bold text-cyan-400 mt-0.5">0 min</div>
          </div>
        </div>

      </div>

      <!-- Barra de Filtros Avanzados (Fechas, Búsqueda y Material) -->
      <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-4 sm:p-5 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          
          <!-- Búsqueda por texto -->
          <div class="md:col-span-4">
            <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Búsqueda rápida</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <i data-lucide="search" class="w-3.5 h-3.5"></i>
              </span>
              <input 
                type="text" 
                id="filtro-historial-texto" 
                placeholder="Código, descripción o plano..." 
                value="${filtroTexto}"
                class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 text-sm placeholder-slate-500 shadow-inner transition-colors"
              />
            </div>
          </div>

          <!-- Filtro por Material -->
          <div class="md:col-span-3">
            <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Material</label>
            <select 
              id="filtro-historial-material" 
              class="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 shadow-inner transition-colors"
            >
              <option value="todos" ${filtroMaterial === 'todos' ? 'selected' : ''}>Todos los materiales</option>
              ${MATERIALES_CNC.map(m => `<option value="${m}" ${filtroMaterial === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>

          <!-- Rango: Fecha Desde -->
          <div class="md:col-span-2">
            <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Fecha Desde</label>
            <input 
              type="date" 
              id="filtro-historial-desde" 
              value="${fechaDesde}"
              class="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 shadow-inner transition-colors"
            />
          </div>

          <!-- Rango: Fecha Hasta -->
          <div class="md:col-span-2">
            <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Fecha Hasta</label>
            <input 
              type="date" 
              id="filtro-historial-hasta" 
              value="${fechaHasta}"
              class="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 shadow-inner transition-colors"
            />
          </div>

          <!-- Contador Resultados -->
          <div class="md:col-span-1 flex items-center justify-end pb-2">
            <span class="text-xs font-mono text-slate-400" id="contador-historial">0</span>
          </div>

        </div>
      </div>

      <!-- Tabla de Trabajos Terminados (Syntrix Glassmorphism) -->
      <div class="bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800/80">
              <tr>
                <th scope="col" class="py-3.5 px-4 font-mono">Código 1</th>
                <th scope="col" class="py-3.5 px-4 font-mono">Código 2</th>
                <th scope="col" class="py-3.5 px-4">Descripción</th>
                <th scope="col" class="py-3.5 px-4">Material</th>
                <th scope="col" class="py-3.5 px-4 text-center">Cantidad</th>
                <th scope="col" class="py-3.5 px-4 font-mono text-emerald-400">Tiempo Total Fabricado</th>
                <th scope="col" class="py-3.5 px-4 text-xs">Fecha Inicio</th>
                <th scope="col" class="py-3.5 px-4 text-xs">Fecha Término</th>
                <th scope="col" class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="lista-historial-body" class="divide-y divide-slate-800/40">
              <!-- Renderizado dinámico -->
              <tr>
                <td colspan="9" class="py-12 text-center text-slate-500">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-emerald-400"></i>
                    <span>Cargando historial de trabajos...</span>
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
 * Carga los trabajos concluidos, calcula tiempos netos y actualiza la tabla y KPIs
 */
export async function refrescarHistorial(onRefreshIcons) {
  try {
    const todosTerminados = await trabajosService.obtenerTerminados();
    
    // Obtener intervalos y tiempos calculados para cada trabajo
    historialCache = await Promise.all(
      todosTerminados.map(async (t) => {
        const intervalos = await intervalosService.obtenerPorTrabajo(t.id);
        const tiempoInfo = calcularTiempoTotal(intervalos);
        return {
          ...t,
          intervalos,
          tiempoInfo
        };
      })
    );

    // Ordenar del más reciente al más antiguo por fechaFin o fechaCreacion
    historialCache.sort((a, b) => {
      const fechaA = new Date(a.fechaFin || a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaFin || b.fechaCreacion).getTime();
      return fechaB - fechaA;
    });

    // Aplicar filtros
    const query = filtroTexto.toLowerCase().trim();
    const filtrados = historialCache.filter(t => {
      // Filtro texto
      const coincideTexto = !query ||
        (t.codigo1 && t.codigo1.toLowerCase().includes(query)) ||
        (t.codigo2 && t.codigo2.toLowerCase().includes(query)) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(query)) ||
        (t.material && t.material.toLowerCase().includes(query));

      // Filtro material
      const coincideMaterial = filtroMaterial === 'todos' || t.material === filtroMaterial;

      // Filtro fechas
      let coincideFecha = true;
      if (fechaDesde || fechaHasta) {
        const fechaRegistro = t.fechaFin || t.fechaCreacion;
        if (fechaRegistro) {
          const fStr = fechaRegistro.slice(0, 10);
          if (fechaDesde && fStr < fechaDesde) coincideFecha = false;
          if (fechaHasta && fStr > fechaHasta) coincideFecha = false;
        }
      }

      return coincideTexto && coincideMaterial && coincideFecha;
    });

    // Actualizar KPIs
    actualizarKPIs(filtrados);

    // Renderizar tabla
    const tbody = document.getElementById('lista-historial-body');
    const contador = document.getElementById('contador-historial');
    if (contador) contador.textContent = `${filtrados.length} reg.`;

    if (!tbody) return;

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-12 text-center text-slate-500">
            <div class="flex flex-col items-center justify-center space-y-2.5">
              <div class="w-10 h-10 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                <i data-lucide="inbox" class="w-5 h-5"></i>
              </div>
              <p class="text-xs font-medium text-slate-300">No hay registros en el historial con los filtros aplicados</p>
              <p class="text-[11px] text-slate-500">
                ${historialCache.length === 0 ? 'Cuando concluyas trabajos en la Pantalla 3 aparecerán aquí.' : 'Prueba modificando las fechas o criterios de búsqueda.'}
              </p>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = filtrados.map(t => {
        const fechaTermino = t.fechaFin 
          ? new Date(t.fechaFin).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : (t.fechaCreacion ? new Date(t.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

        // Calcular fecha de inicio: primer evento 'empezar' entre los intervalos
        const primerEmpezar = t.intervalos
          .filter(i => i.tipo === 'empezar')
          .sort((a, b) => a.timestamp - b.timestamp)[0];
        const fechaInicio = primerEmpezar
          ? new Date(primerEmpezar.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '-';

        return `
          <tr class="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
            <td class="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
              <span class="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">
                ${t.codigo1 || 'S/C'}
              </span>
            </td>
            <td class="py-3 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">
              ${t.codigo2 ? `<span class="px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">${t.codigo2}</span>` : '<span class="text-slate-600">-</span>'}
            </td>
            <td class="py-3 px-4 font-medium text-slate-200">
              ${t.descripcion || '-'}
            </td>
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="bg-slate-800/70 border border-slate-700/50 text-cyan-300 font-mono text-xs px-3 py-1 rounded-full shadow-inner inline-flex items-center">
                ${t.material || 'N/A'}
              </span>
            </td>
            <td class="py-3 px-4 text-center font-mono font-bold text-white whitespace-nowrap">
              ${t.cantidad} u.
            </td>
            <td class="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
              <span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono">
                ${t.tiempoInfo.formateado}
              </span>
            </td>
            <td class="py-3 px-4 text-xs text-slate-400 font-mono whitespace-nowrap">
              ${fechaInicio}
            </td>
            <td class="py-3 px-4 text-xs text-slate-400 font-mono whitespace-nowrap">
              ${fechaTermino}
            </td>
            <td class="py-3 px-4 text-right whitespace-nowrap">
              <div class="flex items-center justify-end space-x-1">
                <button 
                  data-action="ver-intervalos" 
                  data-id="${t.id}" 
                  title="Ver detalle de intervalos de tiempo" 
                  class="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                >
                  <i data-lucide="list" class="w-3.5 h-3.5"></i>
                </button>
                <button 
                  data-action="eliminar-historial" 
                  data-id="${t.id}" 
                  title="Eliminar del historial" 
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

    if (onRefreshIcons) onRefreshIcons();
  } catch (error) {
    console.error('Error al refrescar historial:', error);
  }
}

/**
 * Calcula y actualiza las tarjetas de KPIs
 */
function actualizarKPIs(trabajos) {
  const kpiTrabajos = document.getElementById('kpi-total-trabajos');
  const kpiPiezas = document.getElementById('kpi-total-piezas');
  const kpiTiempo = document.getElementById('kpi-tiempo-total');
  const kpiPromedio = document.getElementById('kpi-promedio-pieza');

  const totalTrabajos = trabajos.length;
  let totalPiezas = 0;
  let totalMs = 0;

  trabajos.forEach(t => {
    totalPiezas += Number(t.cantidad || 0);
    totalMs += Number(t.tiempoInfo?.totalMs || 0);
  });

  const totalMinutos = Math.floor(totalMs / (1000 * 60));
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  const tiempoFormateado = `${horas}h ${minutos}min`;

  let promedioMinPorPieza = 0;
  if (totalPiezas > 0) {
    promedioMinPorPieza = (totalMinutos / totalPiezas).toFixed(1);
  }

  if (kpiTrabajos) kpiTrabajos.textContent = totalTrabajos;
  if (kpiPiezas) kpiPiezas.textContent = totalPiezas;
  if (kpiTiempo) kpiTiempo.textContent = tiempoFormateado;
  if (kpiPromedio) kpiPromedio.textContent = `${promedioMinPorPieza} min`;
}

/**
 * Configura los event listeners para filtros y acciones de la Pantalla 4
 */
export function setupHistorialListeners({ onToast, onRefreshIcons, onDataChange }) {
  const filtroTextoInput = document.getElementById('filtro-historial-texto');
  const filtroMaterialSelect = document.getElementById('filtro-historial-material');
  const fechaDesdeInput = document.getElementById('filtro-historial-desde');
  const fechaHastaInput = document.getElementById('filtro-historial-hasta');
  const btnLimpiar = document.getElementById('btn-limpiar-filtros-historial');
  const tbody = document.getElementById('lista-historial-body');

  if (filtroTextoInput) {
    filtroTextoInput.addEventListener('input', (e) => {
      filtroTexto = e.target.value;
      refrescarHistorial(onRefreshIcons);
    });
  }

  if (filtroMaterialSelect) {
    filtroMaterialSelect.addEventListener('change', (e) => {
      filtroMaterial = e.target.value;
      refrescarHistorial(onRefreshIcons);
    });
  }

  if (fechaDesdeInput) {
    fechaDesdeInput.addEventListener('change', (e) => {
      fechaDesde = e.target.value;
      refrescarHistorial(onRefreshIcons);
    });
  }

  if (fechaHastaInput) {
    fechaHastaInput.addEventListener('change', (e) => {
      fechaHasta = e.target.value;
      refrescarHistorial(onRefreshIcons);
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      filtroTexto = '';
      filtroMaterial = 'todos';
      fechaDesde = '';
      fechaHasta = '';

      if (filtroTextoInput) filtroTextoInput.value = '';
      if (filtroMaterialSelect) filtroMaterialSelect.value = 'todos';
      if (fechaDesdeInput) fechaDesdeInput.value = '';
      if (fechaHastaInput) fechaHastaInput.value = '';

      refrescarHistorial(onRefreshIcons);
      onToast?.('Filtros del historial restablecidos', 'info');
    });
  }

  // Delegación de acciones en la tabla
  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      const verBtn = e.target.closest('button[data-action="ver-intervalos"]');
      const deleteBtn = e.target.closest('button[data-action="eliminar-historial"]');

      if (verBtn) {
        const id = Number(verBtn.getAttribute('data-id'));
        const trabajo = historialCache.find(t => t.id === id);
        if (trabajo) {
          const lineas = trabajo.intervalos.map((inv, idx) => {
            const hora = new Date(inv.timestamp).toLocaleTimeString('es-ES');
            return `${idx + 1}. [${inv.tipo.toUpperCase()}] -> ${hora}`;
          }).join('\n');

          alert(`Trabajo: ${trabajo.codigo1} - ${trabajo.descripcion}\nCantidad: ${trabajo.cantidad} u. | Tiempo Total: ${trabajo.tiempoInfo.formateado}\n\nIntervalos registrados (${trabajo.intervalos.length}):\n${lineas || 'Sin eventos registrados'}`);
        }
      } else if (deleteBtn) {
        const id = Number(deleteBtn.getAttribute('data-id'));
        const trabajo = historialCache.find(t => t.id === id);
        if (trabajo) {
          const confirmar = confirm(`¿Estás seguro de eliminar el registro histórico de "${trabajo.codigo1}"?`);
          if (confirmar) {
            await trabajosService.eliminar(id);
            onToast?.(`Registro de ${trabajo.codigo1} eliminado del historial`, 'info');
            await refrescarHistorial(onRefreshIcons);
            if (onDataChange) onDataChange();
          }
        }
      }
    });
  }
}
