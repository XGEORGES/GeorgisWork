import { trabajosService, intervalosService, calcularTiempoTotal } from '../db.js';

let cronometroIntervalId = null;
let trabajosActivosCache = [];

/**
 * Renderiza la interfaz de la Pantalla 3 (Control en Vivo de Trabajos - Estilo Telemetría CNC / Syntrix)
 */
export function renderControlView() {
  return `
    <div class="space-y-6 pb-16">
      
      <!-- Encabezado de la Pantalla 3 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2.5">
            <i data-lucide="play-circle" class="w-7 h-7 text-cyan-400"></i>
            <span>Control en Vivo de Trabajos CNC</span>
          </h1>
          <p class="text-sm text-slate-400 mt-1">Telemetría de producción en tiempo real, registro de intervalos y cronómetros de mecanizado.</p>
        </div>

        <!-- Indicador de Trabajos Activos -->
        <div class="flex items-center space-x-2">
          <div class="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold flex items-center space-x-2 shadow-sm shadow-cyan-500/10">
            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Línea Activa: <span id="contador-trabajos-activos">0</span></span>
          </div>
        </div>
      </div>

      <!-- Contenedor de Trabajos en Proceso -->
      <div id="lista-trabajos-control" class="space-y-5">
        <!-- Renderizado dinámico -->
        <div class="py-16 text-center text-slate-500 bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-8">
          <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3"></i>
          <p class="text-xs font-medium text-slate-300">Conectando telemetría de producción...</p>
        </div>
      </div>

    </div>
  `;
}

/**
 * Carga y renderiza todos los trabajos activos con sus estados y cronómetros estilo Telemetría
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
        <div class="py-16 text-center text-slate-500 bg-slate-900/65 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-8">
          <div class="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto mb-3 border border-cyan-500/30 shadow-md shadow-cyan-500/10">
            <i data-lucide="play-circle" class="w-7 h-7"></i>
          </div>
          <h3 class="text-sm font-bold text-white">No hay trabajos en la línea de producción</h3>
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

      // Estado Badge Telemetría
      let badgeHtml = '';
      if (isFabricando) {
        badgeHtml = `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5"></span>
            MECANIZANDO
          </span>
        `;
      } else if (isPausado) {
        badgeHtml = `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/40">
            <span class="w-2 h-2 rounded-full bg-amber-400 mr-1.5"></span>
            EN PAUSA
          </span>
        `;
      } else {
        badgeHtml = `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <span class="w-2 h-2 rounded-full bg-slate-500 mr-1.5"></span>
            EN COLA
          </span>
        `;
      }

      // Restricción concurrencia
      const maquinaOcupadaPorOtro = hayMaquinaOcupada && !isFabricando;
      const puedeTerminar = t.tieneIntervalos;

      // Botón Empezar o Pausar
      let btnAccionHtml = '';
      if (!isFabricando) {
        if (maquinaOcupadaPorOtro) {
          btnAccionHtml = `
            <button 
              type="button" 
              disabled
              title="Máquina ocupada: pausa el trabajo actual para iniciar otro"
              class="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/50 text-slate-500 border border-slate-800 flex items-center space-x-1.5 cursor-not-allowed opacity-60 select-none"
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
              class="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 flex items-center space-x-1.5 transition-all transform active:scale-95 cursor-pointer"
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
            class="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 flex items-center space-x-1.5 transition-all transform active:scale-95 cursor-pointer"
          >
            <i data-lucide="pause" class="w-4 h-4 fill-white"></i>
            <span>Pausar</span>
          </button>
        `;
      }

      // Estilo de tarjeta según estado Telemetría
      let cardBorderClass = 'border-slate-800/80 bg-slate-900/65';
      if (isFabricando) {
        cardBorderClass = 'border-emerald-500/50 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/30 bg-slate-900/90 glow-emerald';
      } else if (isPausado) {
        cardBorderClass = 'border-amber-500/40 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/20 bg-slate-900/90';
      } else if (maquinaOcupadaPorOtro) {
        cardBorderClass = 'border-slate-800/40 bg-slate-900/40 opacity-70';
      }

      return `
        <div class="rounded-2xl p-5 sm:p-6 border transition-all duration-300 backdrop-blur-2xl shadow-2xl shadow-black/60 ${cardBorderClass}">
          
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            
            <!-- Columna Izquierda: Identificación & Especificaciones -->
            <div class="space-y-2.5 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs font-bold text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25">
                  ${t.codigo1 || 'S/C'}
                </span>
                ${t.codigo2 ? `<span class="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-semibold">${t.codigo2}</span>` : ''}
                <span class="bg-slate-800/70 border border-slate-700/50 text-cyan-300 font-mono text-xs px-3 py-1 rounded-full shadow-inner inline-flex items-center">
                  ${t.material || 'Material'}
                </span>
                ${badgeHtml}
                ${maquinaOcupadaPorOtro ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800/60 text-slate-500 border border-slate-700/40"><i data-lucide="lock" class="w-3 h-3 mr-1"></i>Bloqueado</span>` : ''}
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

            <!-- Columna Central: Cronómetro CNC Gran Tamaño (text-5xl font-mono) -->
            <div class="flex flex-col items-center justify-center px-6 py-4 rounded-2xl bg-slate-950/90 border border-slate-800 min-w-[250px] shadow-inner">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full ${isFabricando ? 'bg-emerald-400 animate-ping' : isPausado ? 'bg-amber-400' : 'bg-slate-500'}"></span>
                <span>TIEMPO NETO TRABAJADO</span>
              </span>
              
              <div class="font-mono text-5xl font-bold tracking-tight ${isFabricando ? 'text-emerald-400 animate-pulse glow-emerald' : isPausado ? 'text-amber-400 glow-amber' : 'text-slate-100'}">
                ${t.tiempoInfo.formateado}
              </div>
              
              <span class="text-[11px] text-slate-500 font-mono mt-1">
                ${formatearSegundosExactos(t.tiempoInfo.totalMs)}
              </span>
            </div>

            <!-- Columna Derecha: Botones Ergonómicos de Control -->
            <div class="flex items-center justify-end gap-2.5 flex-wrap">
              
              ${btnAccionHtml}

              <!-- Botón Terminar (Con validación de intervalos) -->
              <button 
                type="button" 
                data-action="terminar" 
                data-id="${t.id}" 
                ${!puedeTerminar ? 'disabled title="Debes iniciar el trabajo al menos una vez antes de terminarlo"' : ''}
                class="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${puedeTerminar ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'}"
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
                class="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
        onToast?.('Mecanizado iniciado / reanudado', 'success');
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
        
        onToast?.(`Trabajo ${trabajo.codigo1} concluido con éxito`, 'success');
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
