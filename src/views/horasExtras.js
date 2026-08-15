import * as XLSX from 'xlsx';
import { db, trabajosService, intervalosService } from '../db.js';
import { procesarHorasExtrasTrabajo } from '../utils/horasExtras.js';

let registrosHorasExtrasCache = [];
let fechaInicioFiltro = '';
let fechaFinFiltro = '';

export function renderHorasExtrasView() {
  return `
    <div class="space-y-6 pb-20">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <i data-lucide="clock" class="w-7 h-7 text-rose-600 dark:text-rose-400"></i>
            <span class="tracking-tight">Reporte de Horas Extras & Liquidación</span>
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Cálculo laboral según jornada ordinaria (L-V 8:00-17:30, Sáb 8:00-13:30, Dom/Feriados 100%) y redondeo normativo.</p>
        </div>

        <div class="flex items-center gap-3">
          <button 
            id="btn-exportar-excel" 
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 flex items-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <i data-lucide="file-spreadsheet" class="w-4 h-4 fill-slate-950"></i>
            <span>Exportar Excel (.XLSX)</span>
          </button>
        </div>
      </div>

      <!-- Tarjetas KPI -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <!-- Total HE -->
        <div class="glass-card p-5 flex items-center space-x-4">
          <div class="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-md">
            <i data-lucide="clock" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Horas Extras (A Liquidar)</div>
            <div id="kpi-total-horas-extras" class="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">0.0 h</div>
          </div>
        </div>

        <!-- Conteo Registros -->
        <div class="glass-card p-5 flex items-center space-x-4">
          <div class="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-md">
            <i data-lucide="file-text" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Registros con Sobretiempo</div>
            <div id="kpi-conteo-registros" class="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">0</div>
          </div>
        </div>

        <!-- Horas Exactas -->
        <div class="glass-card p-5 flex items-center space-x-4">
          <div class="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 shadow-md">
            <i data-lucide="calculator" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Horas Extras Exactas</div>
            <div id="kpi-horas-exactas" class="text-2xl font-mono font-bold text-cyan-600 dark:text-cyan-300 mt-0.5">0.00 h</div>
          </div>
        </div>

      </div>

      <!-- Barra de Filtros -->
      <div class="glass-card p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center space-x-2">
            <label for="filtro-he-desde" class="text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase">Fecha Inicial:</label>
            <input 
              type="date" 
              id="filtro-he-desde" 
              value="${fechaInicioFiltro}" 
              class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-rose-500 text-xs text-slate-900 dark:text-slate-200 shadow-inner transition-colors"
            />
          </div>

          <div class="flex items-center space-x-2">
            <label for="filtro-he-hasta" class="text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase">Fecha Final:</label>
            <input 
              type="date" 
              id="filtro-he-hasta" 
              value="${fechaFinFiltro}" 
              class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-rose-500 text-xs text-slate-900 dark:text-slate-200 shadow-inner transition-colors"
            />
          </div>

          <button id="btn-limpiar-filtro-he" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-900/90 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/80 transition-colors active:scale-95 shadow-md cursor-pointer">
            Todos los Registros
          </button>
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Mostrando: <span id="contador-he-registros" class="text-rose-600 dark:text-rose-400 font-bold">0</span> registros
        </div>

      </div>

      <!-- Tabla de Reporte de Horas Extras -->
      <div class="glass-panel overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-200/90 dark:bg-slate-950/90 text-[11px] uppercase font-mono font-bold text-slate-700 dark:text-cyan-400/90 tracking-wider border-b border-slate-300 dark:border-slate-800/90">
              <tr>
                <th scope="col" class="py-3.5 px-4">Fecha</th>
                <th scope="col" class="py-3.5 px-4 text-amber-600 dark:text-amber-400">Tramo Inicio HE</th>
                <th scope="col" class="py-3.5 px-4 text-amber-600 dark:text-amber-400">Tramo Fin HE</th>
                <th scope="col" class="py-3.5 px-4">Código</th>
                <th scope="col" class="py-3.5 px-4">Descripción de la Pieza</th>
                <th scope="col" class="py-3.5 px-4 text-center">Cant.</th>
                <th scope="col" class="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400">Horas Extras a Liquidar</th>
              </tr>
            </thead>
            <tbody id="lista-he-body" class="divide-y divide-slate-200 dark:divide-slate-800/40">
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

export async function refrescarHorasExtras(onRefreshIcons) {
  try {
    const todosTrabajos = await db.trabajos.toArray();
    let acumulado = [];

    for (const t of todosTrabajos) {
      const intervalos = await intervalosService.obtenerPorTrabajo(t.id);
      const registrosTrabajo = procesarHorasExtrasTrabajo(intervalos, t);
      acumulado.push(...registrosTrabajo);
    }

    acumulado.sort((a, b) => b.fechaKey.localeCompare(a.fechaKey));
    registrosHorasExtrasCache = acumulado;

    const filtrados = registrosHorasExtrasCache.filter(r => {
      if (fechaInicioFiltro && r.fechaKey < fechaInicioFiltro) return false;
      if (fechaFinFiltro && r.fechaKey > fechaFinFiltro) return false;
      return true;
    });

    actualizarKPIsHorasExtras(filtrados);

    const tbody = document.getElementById('lista-he-body');
    const contador = document.getElementById('contador-he-registros');
    if (contador) contador.textContent = filtrados.length;

    if (!tbody) return;

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-500">
            <div class="flex flex-col items-center justify-center space-y-2.5">
              <div class="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800/60 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <i data-lucide="inbox" class="w-5 h-5"></i>
              </div>
              <p class="text-xs font-medium text-slate-800 dark:text-slate-300">No hay horas extras computadas en este período</p>
              <p class="text-[11px] text-slate-500">
                Las horas extras se calculan automáticamente cuando se mecaniza fuera de la jornada ordinaria o en domingos/feriados.
              </p>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = filtrados.map(r => {
        return `
          <tr class="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors">
            <td class="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
              <span class="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-mono">
                ${r.fechaCompleta}
              </span>
            </td>
            
            <td class="py-3.5 px-4 font-mono text-amber-600 dark:text-amber-300 text-xs whitespace-nowrap">
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 inline-block mr-2 animate-pulse"></span>
                <span>${r.horaInicioHE}</span>
              </span>
            </td>
            
            <td class="py-3.5 px-4 font-mono text-amber-600 dark:text-amber-300 text-xs whitespace-nowrap">
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 inline-block mr-2"></span>
                <span>${r.horaFinHE}</span>
              </span>
            </td>
            
            <td class="py-3.5 px-4 font-mono text-cyan-600 dark:text-cyan-300 text-xs whitespace-nowrap">
              <span class="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 font-mono font-bold">
                ${r.codigo1 || '-'}
              </span>
            </td>
            <td class="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
              ${r.descripcion}
              ${r.codigo2 ? `<span class="ml-1 text-xs text-slate-500 dark:text-slate-400 font-mono font-normal">(${r.codigo2})</span>` : ''}
            </td>
            <td class="py-3.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              ${r.cantidad} u.
            </td>
            <td class="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
              <span class="px-3 py-1 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 shadow-md text-xs font-bold font-mono">
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

export function exportarReporteExcel(registros, onToast) {
  if (!registros || registros.length === 0) {
    onToast?.('No hay registros de horas extras para exportar con los filtros seleccionados', 'error');
    return;
  }

  try {
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

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dataFilas);

    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 35 },
      { wch: 18 },
      { wch: 24 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Horas Extras CNC');

    const fechaStr = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `Reporte_Horas_Extras_GeorgisWork_${fechaStr}.xlsx`;

    XLSX.writeFile(workbook, nombreArchivo);
    onToast?.(`Reporte de horas extras exportado: ${nombreArchivo}`, 'success');
  } catch (err) {
    console.error('Error al exportar Excel:', err);
    onToast?.('Error al generar archivo Excel: ' + err.message, 'error');
  }
}

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
      const filtrados = registrosHorasExtrasCache.filter(r => {
        if (fechaInicioFiltro && r.fechaKey < fechaInicioFiltro) return false;
        if (fechaFinFiltro && r.fechaKey > fechaFinFiltro) return false;
        return true;
      });

      exportarReporteExcel(filtrados, onToast);
    });
  }
}