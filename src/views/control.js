import { trabajosService, intervalosService, calcularTiempoTotal } from '../db.js';

let cronometroIntervalId = null;
let trabajosActivosCache = [];

export function renderControlView() {
  return `
    <div class="space-y-6 pb-20">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <i data-lucide="play-circle" class="w-7 h-7 text-cyan-600 dark:text-cyan-400"></i>
            <span class="tracking-tight">Control en Vivo de Trabajos CNC</span>
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Telemetría de producción en tiempo real, registro de intervalos y monitoreo de mecanizado.</p>
        </div>

        <div class="flex items-center space-x-2">
          <div class="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-900/90 border border-slate-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold flex items-center space-x-2.5 shadow-md">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span>Línea Activa: <strong id="contador-trabajos-activos" class="text-slate-900 dark:text-white text-sm">0</strong></span>
          </div>
        </div>
      </div>

      <!-- Contenedor Dinámico -->
      <div id="lista-trabajos-control" class="space-y-5">
        <div class="py-16 text-center text-slate-500 glass-card p-8">
          <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-3"></i>
          <p class="text-xs font-medium font-mono text-slate-600 dark:text-slate-300">Conectando telemetría de producción...</p>
        </div>
      </div>

    </div>
  `;
}

export async function refrescarControlTrabajos(onRefreshIcons) {
  try {
    trabajosActivosCache = await trabajosService.obtenerActivos();
    const container = document.getElementById('lista-trabajos-control');
    const contador = document.getElementById('contador-trabajos-activos');

    if (contador) contador.textContent = trabajosActivosCache.length;
    if (!container) return;

    if (trabajosActivosCache.length === 0) {
      container.innerHTML = `
        <div class="py-16 text-center glass-panel p-8">
          <div class="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mx-auto mb-4 border border-cyan-500/30 shadow-md">
            <i data-lucide="play-circle" class="w-8 h-8"></i>
          </div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight">No hay trabajos en la línea de producción</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Ve a la pestaña <strong class="text-cyan-600 dark:text-cyan-400 font-semibold">2. Selección</strong> para enviar piezas al cronómetro de mecanizado.
          </p>
        </div>
      `;
      detenerTimerLoop();
      if (onRefreshIcons) onRefreshIcons();
      return;
    }

    const trabajosConInfo = await Promise.all(
      trabajosActivosCache.map(async (t) => {
        const intervalos = await intervalosService.obtenerPorTrabajo(t.id);
        const tiempoInfo = calcularTiempoTotal(intervalos);
        const tieneIntervalos = intervalos.length > 0;
        return { ...t, intervalos, tiempoInfo, tieneIntervalos };
      })
    );

    const hayMaquinaOcupada = trabajosConInfo.some(t => t.estado === 'fabricando');

    container.innerHTML = trabajosConInfo.map(t => {
      const isFabricando = t.estado === 'fabricando';
      const isPausado = t.estado === 'pausado';

      let badgeHtml = '';
      if (isFabricando) {
        badgeHtml = `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-md">
            <span class="relative flex h-2 w-2 mr-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            MECANIZANDO
          </span>
        `;
      } else if (isPausado) {
        badgeHtml = `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 shadow-md">
            <span class="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
            EN PAUSA
          </span>
        `;
      } else {
        badgeHtml = `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-200 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/60">
            <span class="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
            EN COLA
          </span>
        `;
      }

      const maquinaOcupadaPorOtro = hayMaquinaOcupada && !isFabricando;
      const puedeTerminar = t.tieneIntervalos;

      let btnAccionHtml = '';
      if (!isFabricando) {
        if (maquinaOcupadaPorOtro) {
          btnAccionHtml = `
            <button 
              type="button" 
              disabled
              title="Máquina ocupada: pausa el trabajo actual para iniciar otro"
              class="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-800 flex items-center space-x-2 cursor-not-allowed opacity-60 select-none"
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
              class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 flex items-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <i data-lucide="play" class="w-4 h-4 fill-slate-950"></i>
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
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/30 flex items-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <i data-lucide="pause" class="w-4 h-4 fill-slate-950"></i>
            <span>Pausar</span>
          </button>
        `;
      }

      let cardBorder = '';
      if (isFabricando) {
        cardBorder = 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]';
      } else if (isPausado) {
        cardBorder = 'border-amber-500 ring-2 ring-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.12)]';
      } else if (maquinaOcupadaPorOtro) {
        cardBorder = 'opacity-65';
      }

      const totalSeg = Math.floor((t.tiempoInfo?.totalMs || 0) / 1000);
      const dashOffset = 283 - (Math.min(totalSeg % 3600, 3600) / 3600) * 283;
      const strokeColor = isFabricando ? '#10b981' : isPausado ? '#f59e0b' : '#94a3b8';

      return `
        <div class="glass-card p-6 border backdrop-blur-2xl shadow-xl transition-all duration-300 ${cardBorder}">
          
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            <!-- Columna Izquierda -->
            <div class="space-y-3 flex-1 min-w-[260px]">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-mono font-bold text-xs shadow-sm">
                  ${t.codigo1 || 'S/C'}
                </span>
                ${t.codigo2 ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800/90 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-mono text-xs font-semibold">${t.codigo2}</span>` : ''}
                <span class="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-mono text-xs shadow-inner font-medium">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mr-2"></span>
                  ${t.material || 'Material'}
                </span>
                ${badgeHtml}
                ${maquinaOcupadaPorOtro ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-200 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50"><i data-lucide="lock" class="w-3 h-3 mr-1"></i>Bloqueado</span>` : ''}
              </div>

              <div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white tracking-tight">${t.descripcion}</h3>
                <div class="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                  <span>Cantidad: <strong class="text-slate-900 dark:text-white text-sm font-bold">${t.cantidad}</strong> u.</span>
                  <span>•</span>
                  <span>Intervalos: <strong class="text-cyan-600 dark:text-cyan-400 font-bold">${t.intervalos.length}</strong></span>
                </div>
              </div>
            </div>

            <!-- Columna Central: Dial Gauge -->
            <div class="flex items-center justify-center p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 shadow-inner">
              <div class="relative flex items-center justify-center w-36 h-36">
                
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" class="text-slate-300 dark:text-slate-800" stroke-width="6" fill="transparent" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="42" 
                    stroke="${strokeColor}" 
                    stroke-width="6" 
                    stroke-linecap="round" 
                    stroke-dasharray="283" 
                    stroke-dashoffset="${dashOffset}" 
                    fill="transparent" 
                    class="transition-all duration-1000 ease-linear"
                    style="filter: drop-shadow(0 0 6px ${strokeColor});"
                  />
                </svg>

                <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">TIEMPO</span>
                  <div class="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                    ${t.tiempoInfo.formateado}
                  </div>
                  <span class="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    ${formatearSegundosExactos(t.tiempoInfo.totalMs)}
                  </span>
                </div>

              </div>
            </div>

            <!-- Columna Derecha -->
            <div class="flex lg:flex-col items-center justify-end gap-2.5">
              
              ${btnAccionHtml}

              <button 
                type="button" 
                data-action="terminar" 
                data-id="${t.id}" 
                ${!puedeTerminar ? 'disabled title="Debes iniciar el trabajo al menos una vez antes de terminarlo"' : ''}
                class="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${puedeTerminar ? 'bg-slate-200 dark:bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-800 dark:text-cyan-400 border border-slate-300 dark:border-cyan-500/30 shadow-md active:scale-95 cursor-pointer' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800/60 cursor-not-allowed opacity-40'}"
              >
                <i data-lucide="check" class="w-4 h-4"></i>
                <span>Terminar</span>
              </button>

              <button 
                type="button" 
                data-action="eliminar-trabajo" 
                data-id="${t.id}" 
                title="Descartar este trabajo de la línea" 
                class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
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

function formatearSegundosExactos(ms) {
  const totalSeg = Math.floor(ms / 1000);
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function iniciarTimerLoop(onRefreshIcons) {
  detenerTimerLoop();

  const hayFabricando = trabajosActivosCache.some(t => t.estado === 'fabricando');
  if (!hayFabricando) return;

  cronometroIntervalId = setInterval(async () => {
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
        onToast?.('Mecanizado iniciado', 'success');
        await refrescarControlTrabajos(onRefreshIcons);
        if (onDataChange) onDataChange();
      }
      else if (pausarBtn) {
        const id = Number(pausarBtn.getAttribute('data-id'));
        await intervalosService.registrarEvento(id, 'pausar');
        await trabajosService.actualizarEstado(id, 'pausado');
        onToast?.('Mecanizado pausado', 'info');
        await refrescarControlTrabajos(onRefreshIcons);
        if (onDataChange) onDataChange();
      }
      else if (terminarBtn) {
        const id = Number(terminarBtn.getAttribute('data-id'));
        const intervalos = await intervalosService.obtenerPorTrabajo(id);
        if (!intervalos || intervalos.length === 0) {
          onToast?.('Debes hacer clic en Empezar al menos una vez antes de terminar el trabajo', 'error');
          return;
        }

        const trabajo = await trabajosService.obtenerPorId(id);
        const confirmacion = confirm(`¿Confirmar finalización del trabajo "${trabajo.codigo1} - ${trabajo.descripcion}"?`);
        if (!confirmacion) return;

        await intervalosService.registrarEvento(id, 'terminar');
        await trabajosService.actualizarEstado(id, 'terminado', new Date().toISOString());

        onToast?.(`Trabajo ${trabajo.codigo1} concluido con éxito`, 'success');
        await refrescarControlTrabajos(onRefreshIcons);
        if (onDataChange) onDataChange();
        if (onNavigateToHistorial) onNavigateToHistorial();
      }
      else if (eliminarBtn) {
        const id = Number(eliminarBtn.getAttribute('data-id'));
        const trabajo = await trabajosService.obtenerPorId(id);
        const confirmacion = confirm(`¿Deseas descartar el trabajo "${trabajo.codigo1}" de la línea?`);
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