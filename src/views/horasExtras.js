import * as XLSX from 'xlsx';
import { db, trabajosService, intervalosService } from '../db.js';
import { procesarHorasExtrasTrabajo } from '../utils/horasExtras.js';

// Estado local de la vista
let registrosHorasExtrasCache = [];
let fechaInicioFiltro = '';
let fechaFinFiltro = '';

/**
 * Renderiza la interfaz de la Pantalla 5 (Reporte de Horas Extras)
 */
export function renderHorasExtrasView() {
  return `
    <div class="space-y-6 pb-12">
      
      <!-- Encabezado de la Pantalla 5 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <i data-lucide="clock" class="w-7 h-7 text-rose-500"></i>
            <span>Reporte de Horas Extras & Exportación Excel</span>
          </h1>
          <p class="text-sm text-slate-400 mt-1">Cálculo laboral según jornada ordinaria (L-V 8:00-17:30, Sáb 8:00-13:30, Dom/Feriados 100%) y reglas de redondeo.</p>
        </div>

        <!-- Botón Exportar a Excel -->
        <div class="flex items-center gap-3">
          <button 
            id="btn-exportar-excel" 
            class="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
            <span>Exportar Excel (.XLSX)</span>
          </button>
        </div>
      </div>

      <!-- Tarjetas de Métricas de Horas Extras -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <!-- Total Horas Extras a Liquidar -->
        <div class="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div class="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <i data-lucide="clock" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Horas Extras (Redondeadas)</div>
            <div id="kpi-total-horas-extras" class="text-2xl font-mono font-bold text-rose-400 mt-0.5">0.0 h</div>
          </div>
        </div>

        <!-- Registros / Tareas con Sobretiempo -->
        <div class="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div class="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <i data-lucide="file-text" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registros con Sobretiempo</div>
            <div id="kpi-conteo-registros" class="text-2xl font-mono font-bold text-white mt-0.5">0</div>
          </div>
        </div>

        <!-- Horas Extras Reales Exactas -->
        <div class="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div class="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <i data-lucide="calculator" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Horas Extras Exactas (Sin Redondeo)</div>
            <div id="kpi-horas-exactas" class="text-2xl font-mono font-bold text-blue-400 mt-0.5">0.00 h</div>
          </div>
        </div>

      </div>

      <!-- Barra de Filtros por Rango de Fechas -->
      <div class="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center space-x-2">
            <label for="filtro-he-desde" class="text-xs font-semibold text-slate-400 uppercase">Fecha Inicial:</label>
            <input 
              type="date" 
              id="filtro-he-desde" 
              value="${fechaInicioFiltro}" 
              class="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div class="flex items-center space-x-2">
            <label for="filtro-he-hasta" class="text-xs font-semibold text-slate-400 uppercase">Fecha Final:</label>
            <input 
              type="date" 
              id="filtro-he-hasta" 
              value="${fechaFinFiltro}" 
              class="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <button id="btn-limpiar-filtro-he" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
            Todos los Registros
          </button>
        </div>

        <div class="text-xs text-slate-400 font-mono">
          Mostrando: <span id="contador-he-registros" class="text-rose-400 font-bold">0</span> registros
        </div>

      </div>

      <!-- Tabla de Reporte de Horas Extras -->
      <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th scope="col" class="py-3.5 px-4 font-mono">Fecha</th>
                <th scope="col" class="py-3.5 px-4 font-mono text-amber-400">Hora Inicio HE</th>
                <th scope="col" class="py-3.5 px-4 font-mono text-amber-400">Hora Fin HE</th>
                <th scope="col" class="py-3.5 px-4 font-mono">Código</th>
                <th scope="col" class="py-3.5 px-4">Descripción de la Pieza</th>
                <th scope="col" class="py-3.5 px-4 text-center">Cant.</th>
                <th scope="col" class="py-3.5 px-4 text-right font-mono text-rose-400">Horas Extras a Liquidar</th>
              </tr>
            </thead>
            <tbody id="lista-he-body" class="divide-y divide-slate-800/60 bg-slate-900/30">
              <!-- Renderizado dinámico -->
              <tr>
                <td colspan="7" class="py-12 text-center text-slate-500">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-rose-500"></i>
                    <span>Calculando horas extras laborales...</span>
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
 * Procesa todos los trabajos e intervalos, filtra por fechas y actualiza la tabla y KPIs
 */
export async function refrescarHorasExtras(onRefreshIcons) {
  try {
    const todosTrabajos = await db.trabajos.toArray();
    let acumulado = [];

    for (const t of todosTrabajos) {
      const intervalos = await intervalosService.obtenerPorTrabajo(t.id);
      const registrosTrabajo = procesarHorasExtrasTrabajo(intervalos, t);
      acumulado.push(...registrosTrabajo);
    }

    // Ordenar del más reciente al más antiguo
    acumulado.sort((a, b) => b.fechaKey.localeCompare(a.fechaKey));

    registrosHorasExtrasCache = acumulado;

    // Aplicar filtro de fechas
    const filtrados = registrosHorasExtrasCache.filter(r => {
      if (fechaInicioFiltro && r.fechaKey < fechaInicioFiltro) return false;
      if (fechaFinFiltro && r.fechaKey > fechaFinFiltro) return false;
      return true;
    });

    // Actualizar KPIs
    actualizarKPIsHorasExtras(filtrados);

    // Renderizar tabla
    const tbody = document.getElementById('lista-he-body');
    const contador = document.getElementById('contador-he-registros');
    if (contador) contador.textContent = filtrados.length;

    if (!tbody) return;

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-500">
            <div class="flex flex-col items-center justify-center space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                <i data-lucide="inbox" class="w-6 h-6"></i>
              </div>
              <p class="text-sm font-medium text-slate-300">No hay horas extras computadas en este período</p>
              <p class="text-xs text-slate-500">
                Las horas extras se calculan automáticamente cuando se mecaniza fuera de la jornada ordinaria o en domingos/feriados.
              </p>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = filtrados.map(r => {
        return `
          <tr class="hover:bg-slate-800/40 transition-colors">
            <td class="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
              <span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                ${r.fechaCompleta}
              </span>
            </td>
            <td class="py-3 px-4 font-mono text-amber-400 text-xs whitespace-nowrap">
              ${r.horaInicioHE}
            </td>
            <td class="py-3 px-4 font-mono text-amber-400 text-xs whitespace-nowrap">
              ${r.horaFinHE}
            </td>
            <td class="py-3 px-4 font-mono text-cyan-400 whitespace-nowrap">
              ${r.codigo1 || '-'}
            </td>
            <td class="py-3 px-4 font-medium text-slate-200">
              ${r.descripcion}
              ${r.codigo2 ? `<span class="ml-1 text-xs text-slate-500">(${r.codigo2})</span>` : ''}
            </td>
            <td class="py-3 px-4 text-center font-mono text-slate-300 whitespace-nowrap">
              ${r.cantidad} u.
            </td>
            <td class="py-3 px-4 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
              <span class="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm">
                ${r.horasExtrasRedondeadas.toFixed(1)} h
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (onRefreshIcons) onRefreshIcons();
  } catch (error) {
    console.error('Error al refrescar horas extras:', error);
  }
}

/**
 * Actualiza las tarjetas de KPIs de horas extras
 */
function actualizarKPIsHorasExtras(registros) {
  const kpiTotal = document.getElementById('kpi-total-horas-extras');
  const kpiConteo = document.getElementById('kpi-conteo-registros');
  const kpiExactas = document.getElementById('kpi-horas-exactas');

  let sumaRedondeada = 0;
  let sumaExacta = 0;

  registros.forEach(r => {
    sumaRedondeada += Number(r.horasExtrasRedondeadas || 0);
    sumaExacta += Number(r.horasExtrasExactas || 0);
  });

  if (kpiTotal) kpiTotal.textContent = `${sumaRedondeada.toFixed(1)} h`;
  if (kpiConteo) kpiConteo.textContent = registros.length;
  if (kpiExactas) kpiExactas.textContent = `${sumaExacta.toFixed(2)} h`;
}

/**
 * Exporta el reporte filtrado a un archivo Excel (.xlsx) estructurado con SheetJS
 */
export function exportarReporteExcel(registros, onToast) {
  if (!registros || registros.length === 0) {
    onToast?.('No hay registros de horas extras para exportar con los filtros seleccionados', 'error');
    return;
  }

  try {
    // Estructurar filas para Excel
    const dataFilas = registros.map((r, idx) => ({
      'N°': idx + 1,
      'Fecha': r.fechaCompleta,
      'Hora Inicio HE': r.horaInicioHE,
      'Hora Fin HE': r.horaFinHE,
      'Código Parte': r.codigo1,
      'Código Plano (DWG)': r.codigo2,
      'Descripción de la Pieza': r.descripcion,
      'Cantidad Fabricada': r.cantidad,
      'Horas Extras a Liquidar (h)': r.horasExtrasRedondeadas
    }));

    // Crear libro y hoja con SheetJS
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dataFilas);

    // Ajustar anchos de columna
    worksheet['!cols'] = [
      { wch: 5 },  // N°
      { wch: 14 }, // Fecha
      { wch: 14 }, // Hora Inicio HE
      { wch: 12 }, // Hora Fin HE
      { wch: 16 }, // Código Parte
      { wch: 16 }, // Código Plano
      { wch: 35 }, // Descripción
      { wch: 18 }, // Cantidad
      { wch: 24 }  // H. Extras Liquidar
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Horas Extras CNC');

    // Nombre de archivo con fecha
    const fechaStr = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `Reporte_Horas_Extras_GeorgisWork_${fechaStr}.xlsx`;

    // Descargar archivo binario
    XLSX.writeFile(workbook, nombreArchivo);
    onToast?.(`Reporte de horas extras exportado: ${nombreArchivo}`, 'success');
  } catch (err) {
    console.error('Error al exportar Excel:', err);
    onToast?.('Error al generar archivo Excel: ' + err.message, 'error');
  }
}

/**
 * Configura los event listeners de la Pantalla 5
 */
export function setupHorasExtrasListeners({ onToast, onRefreshIcons }) {
  const fechaDesdeInput = document.getElementById('filtro-he-desde');
  const fechaHastaInput = document.getElementById('filtro-he-hasta');
  const btnLimpiar = document.getElementById('btn-limpiar-filtro-he');
  const btnExportar = document.getElementById('btn-exportar-excel');

  if (fechaDesdeInput) {
    fechaDesdeInput.addEventListener('change', (e) => {
      fechaInicioFiltro = e.target.value;
      refrescarHorasExtras(onRefreshIcons);
    });
  }

  if (fechaHastaInput) {
    fechaHastaInput.addEventListener('change', (e) => {
      fechaFinFiltro = e.target.value;
      refrescarHorasExtras(onRefreshIcons);
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      fechaInicioFiltro = '';
      fechaFinFiltro = '';
      if (fechaDesdeInput) fechaDesdeInput.value = '';
      if (fechaHastaInput) fechaHastaInput.value = '';
      refrescarHorasExtras(onRefreshIcons);
      onToast?.('Filtros de fecha restablecidos', 'info');
    });
  }

  if (btnExportar) {
    btnExportar.addEventListener('click', () => {
      // Filtrar registros activos
      const filtrados = registrosHorasExtrasCache.filter(r => {
        if (fechaInicioFiltro && r.fechaKey < fechaInicioFiltro) return false;
        if (fechaFinFiltro && r.fechaKey > fechaFinFiltro) return false;
        return true;
      });

      exportarReporteExcel(filtrados, onToast);
    });
  }
}
