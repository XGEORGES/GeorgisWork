import { trabajosService, intervalosService, calcularTiempoTotal } from '../db.js';

let cronometroIntervalId = null;
let trabajosActivosCache = [];

/**
 * Renderiza la interfaz de la Pantalla 3 (Control en Vivo de Trabajos)
 */
export function renderControlView() {
  return `
    <div class="space-y-6 pb-12">
      
      <!-- Encabezado de la Pantalla 3 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <i data-lucide="play-circle" class="w-7 h-7 text-amber-500"></i>
            <span>Control en Vivo de Trabajos CNC</span>
          </h1>
          <p class="text-sm text-slate-400 mt-1">Monitoreo de producción en tiempo real, registro de intervalos y control de cronómetros.</p>
        </div>

        <!-- Indicador de Trabajos Activos -->
        <div class="flex items-center space-x-2">
          <div class="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Activos: <span id="contador-trabajos-activos">0</span></span>
          </div>
        </div>
      </div>

      <!-- Contenedor de Trabajos en Proceso -->
      <div id="lista-trabajos-control" class="space-y-4">
        <!-- Renderizado dinámico -->
        <div class="py-16 text-center text-slate-500 glass-card rounded-2xl p-8">
          <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3"></i>
          <p class="text-sm font-medium text-slate-300">Cargando línea de producción...</p>
        </div>
      </div>

    </div>
  `;
}

/**
 * Carga y renderiza todos los trabajos activos con sus estados y cronómetros
 */
export async function refrescarControlTrabajos(onRefreshIcons) {
  try {
    trabajosActivosCache = await trabajosService.obtenerActivos();
    const container = document.getElementById('lista-trabajos-control');
    const contador = document.getElementById('contador-trabajos-activos');

    if (contador) contador.textContent = trabajosActivosCache.length;
    if (!container) return;

    if (trabajosActivosCache.length === 0) {
      container.innerHTML = `
        <div class="py-16 text-center text-slate-500 glass-card rounded-2xl p-8">
          <div class="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center text-amber-400 mx-auto mb-4 border border-slate-700/60 shadow-lg">
            <i data-lucide="play-circle" class="w-8 h-8"></i>
          </div>
          <h3 class="text-base font-bold text-slate-200">No hay trabajos en la línea de producción</h3>
          <p class="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
            Ve a la <strong class="text-cyan-400 font-semibold">Pantalla 2 (Selección)</strong> para enviar piezas a fabricar.
          </p>
        </div>
      `;
      detenerTimerLoop();
      if (onRefreshIcons) onRefreshIcons();
      return;
    }

    // Obtener intervalos para cada trabajo en paralelo
    const trabajosConInfo = await Promise.all(
      trabajosActivosCache.map(async (t) => {
        const intervalos = await intervalosService.obtenerPorTrabajo(t.id);
        const tiempoInfo = calcularTiempoTotal(intervalos);
        const tieneIntervalos = intervalos.length > 0;
        return { ...t, intervalos, tiempoInfo, tieneIntervalos };
      })
    );

    // Verificar si hay algún trabajo actualmente fabricando (concurrencia de máquina)
    const hayMaquinaOcupada = trabajosConInfo.some(t => t.estado === 'fabricando');

    container.innerHTML = trabajosConInfo.map(t => {
      const isFabricando = t.estado === 'fabricando';
      const isPausado = t.estado === 'pausado';
      const isPendiente = t.estado === 'pendiente' || !t.estado;

      // Estado Badge
      let badgeHtml = '';
      if (isFabricando) {
        badgeHtml = `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
            En Proceso
          </span>
        `;
      } else if (isPausado) {
        badgeHtml = `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span class="w-2 h-2 rounded-full bg-amber-400 mr-1.5"></span>
            Pausado
          </span>
        `;
      } else {
        badgeHtml = `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <span class="w-2 h-2 rounded-full bg-slate-500 mr-1.5"></span>
            Pendiente
          </span>
        `;
      }

      // Restricción concurrencia: si la máquina está ocupada y este trabajo NO es el que fabrica,
      // se bloquea el botón Empezar/Reanudar.
      const maquinaOcupadaPorOtro = hayMaquinaOcupada && !isFabricando;
      const puedeTerminar = t.tieneIntervalos;

      // HTML del botón Empezar o Pausar
      let btnAccionHtml = '';
      if (!isFabricando) {
        if (maquinaOcupadaPorOtro) {
          btnAccionHtml = `
            <button 
              type="button" 
              disabled
              title="Máquina ocupada: pausa el trabajo actual para iniciar otro"
              class="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-600 border border-slate-700/50 flex items-center space-x-1.5 cursor-not-allowed opacity-50 select-none"
            >
              <i data-lucide="lock" class="w-4 h-4"></i>
              <span>${isPausado ? 'Reanudar' : 'Empezar'}</span>
            </button>
          `;
        } else {
          btnAccionHtml = `
            <button 
              type="button" 
              data-action="empezar" 
              data-id="${t.id}" 
              class="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 flex items-center space-x-1.5 transition-all transform active:scale-95"
            >
              <i data-lucide="play" class="w-4 h-4 fill-white"></i>
              <span>${isPausado ? 'Reanudar' : 'Empezar'}</span>
            </button>
          `;
        }
      } else {
        btnAccionHtml = `
          <button 
            type="button" 
            data-action="pausar" 
            data-id="${t.id}" 
            class="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 flex items-center space-x-1.5 transition-all transform active:scale-95"
          >
            <i data-lucide="pause" class="w-4 h-4 fill-white"></i>
            <span>Pausar</span>
          </button>
        `;
      }

      return `
        <div class="glass-card rounded-2xl p-5 sm:p-6 border transition-all duration-300 ${isFabricando ? 'border-emerald-500/50 bg-slate-900/90 shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/20' : maquinaOcupadaPorOtro ? 'border-slate-800/50 bg-slate-900/40 opacity-70' : 'border-slate-800 bg-slate-900/70'}">
          
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            
            <!-- Columna Izquierda: Información de la Pieza & Cantidad -->
            <div class="space-y-2.5 flex-1">
              <div class="flex flex-wrap items-center gap-2.5">
                <span class="font-mono text-sm font-bold text-white px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  ${t.codigo1 || 'S/C'}
                </span>
                ${t.codigo2 ? `<span class="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-semibold">${t.codigo2}</span>` : ''}
                <span class="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 font-semibold">
                  ${t.material || 'Material'}
                </span>
                ${badgeHtml}
                ${maquinaOcupadaPorOtro ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800/60 text-slate-500 border border-slate-700/40"><i data-lucide="lock" class="w-3 h-3 mr-1"></i>Bloqueado</span>` : ''}
              </div>

              <div>
                <h3 class="text-base font-bold text-white tracking-tight">${t.descripcion}</h3>
                <div class="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                  <span>Cantidad a fabricar: <strong class="text-white font-mono text-sm">${t.cantidad}</strong> unidades</span>
                  <span>•</span>
                  <span>Intervalos: <strong class="text-slate-300 font-mono">${t.intervalos.length}</strong></span>
                </div>
              </div>
            </div>

            <!-- Columna Central: Cronómetro en Vivo -->
            <div class="flex flex-col items-center justify-center px-6 py-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 min-w-[200px]">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Tiempo Neto Trabajado</span>
              <div class="font-mono text-2xl font-bold tracking-tight ${isFabricando ? 'text-emerald-400 animate-pulse' : 'text-slate-200'}">
                ${t.tiempoInfo.formateado}
              </div>
              <span class="text-[10px] text-slate-500 font-mono mt-0.5">
                ${formatearSegundosExactos(t.tiempoInfo.totalMs)}
              </span>
            </div>

            <!-- Columna Derecha: Botones de Acción Empezar / Pausar / Terminar -->
            <div class="flex items-center justify-end gap-2.5 flex-wrap">
              
              ${btnAccionHtml}

              <!-- Botón Terminar (Con restricción) -->
              <button 
                type="button" 
                data-action="terminar" 
                data-id="${t.id}" 
                ${!puedeTerminar ? 'disabled title="Debes iniciar el trabajo al menos una vez antes de terminarlo"' : ''}
                class="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${puedeTerminar ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'}"
              >
                <i data-lucide="check" class="w-4 h-4"></i>
                <span>Terminar</span>
              </button>

              <!-- Botón Descartar / Cancelar Trabajo -->
              <button 
                type="button" 
                data-action="eliminar-trabajo" 
                data-id="${t.id}" 
                title="Descartar este trabajo de la línea" 
                class="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>

            </div>

          </div>

        </div>
      `;
    }).join('');

    iniciarTimerLoop(onRefreshIcons);
    if (onRefreshIcons) onRefreshIcons();
  } catch (error) {
    console.error('Error al refrescar control de trabajos:', error);
  }
}

/**
 * Formato auxiliar hh:mm:ss exacto
 */
function formatearSegundosExactos(ms) {
  const totalSeg = Math.floor(ms / 1000);
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Ciclo de temporizador para refrescar cronómetros activos cada segundo
 */
function iniciarTimerLoop(onRefreshIcons) {
  detenerTimerLoop();
  
  const hayFabricando = trabajosActivosCache.some(t => t.estado === 'fabricando');
  if (!hayFabricando) return;

  cronometroIntervalId = setInterval(async () => {
    // Si la vista sigue activa en el DOM, refrescar datos
    const container = document.getElementById('lista-trabajos-control');
    if (!container) {
      detenerTimerLoop();
      return;
    }
    await refrescarControlTrabajos(onRefreshIcons);
  }, 1000);
}

export function detenerTimerLoop() {
  if (cronometroIntervalId) {
    clearInterval(cronometroIntervalId);
    cronometroIntervalId = null;
  }
}

/**
 * Configura los event listeners para las acciones Empezar, Pausar, Terminar
 */
export function setupControlListeners({ onToast, onRefreshIcons, onDataChange, onNavigateToHistorial }) {
  const container = document.getElementById('lista-trabajos-control');

  if (container) {
    container.addEventListener('click', async (e) => {
      const empezarBtn = e.target.closest('button[data-action="empezar"]');
      const pausarBtn = e.target.closest('button[data-action="pausar"]');
      const terminarBtn = e.target.closest('button[data-action="terminar"]');
      const eliminarBtn = e.target.closest('button[data-action="eliminar-trabajo"]');

      if (empezarBtn) {
        const id = Number(empezarBtn.getAttribute('data-id'));
        await intervalosService.registrarEvento(id, 'empezar');
        await trabajosService.actualizarEstado(id, 'fabricando');
        onToast?.('Trabajo iniciado / reanudado', 'success');
        await refrescarControlTrabajos(onRefreshIcons);
        if (onDataChange) onDataChange();
      } 
      else if (pausarBtn) {
        const id = Number(pausarBtn.getAttribute('data-id'));
        await intervalosService.registrarEvento(id, 'pausar');
        await trabajosService.actualizarEstado(id, 'pausado');
        onToast?.('Trabajo pausado', 'info');
        await refrescarControlTrabajos(onRefreshIcons);
        if (onDataChange) onDataChange();
      } 
      else if (terminarBtn) {
        const id = Number(terminarBtn.getAttribute('data-id'));
        
        // Verificar si tiene intervalos antes de terminar
        const intervalos = await intervalosService.obtenerPorTrabajo(id);
        if (!intervalos || intervalos.length === 0) {
          onToast?.('Debes hacer clic en Empezar al menos una vez antes de terminar el trabajo', 'error');
          return;
        }

        const trabajo = await trabajosService.obtenerPorId(id);
        const confirmacion = confirm(`¿Confirmar finalización del trabajo "${trabajo.codigo1} - ${trabajo.descripcion}"? Se guardará en el Historial.`);
        if (!confirmacion) return;

        // Registrar evento final y marcar como terminado
        await intervalosService.registrarEvento(id, 'terminar');
        await trabajosService.actualizarEstado(id, 'terminado', new Date().toISOString());
        
        onToast?.(`Trabajo ${trabajo.codigo1} terminado con éxito`, 'success');
        await refrescarControlTrabajos(onRefreshIcons);
        if (onDataChange) onDataChange();
        if (onNavigateToHistorial) onNavigateToHistorial();
      } 
      else if (eliminarBtn) {
        const id = Number(eliminarBtn.getAttribute('data-id'));
        const trabajo = await trabajosService.obtenerPorId(id);
        const confirmacion = confirm(`¿Deseas descartar el trabajo "${trabajo.codigo1}" de la línea de producción?`);
        if (confirmacion) {
          await trabajosService.eliminar(id);
          onToast?.('Trabajo descartado', 'info');
          await refrescarControlTrabajos(onRefreshIcons);
          if (onDataChange) onDataChange();
        }
      }
    });
  }
}
