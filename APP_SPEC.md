APP_SPEC.md: Sistema de Gestión de Trabajos CNC (PWA Local)
1. Arquitectura Técnica
Entorno & Build: Vite + Vanilla JavaScript (o React) + Tailwind CSS.

Base de Datos Local: IndexedDB mediante Dexie.js (sin backend, 100% offline).

Exportación de Reportes: SheetJS (xlsx) para exportar horas extras a Excel (.xlsx) y generación de archivo JSON para copias de seguridad completas.

Gráficas: Chart.js para visualización de métricas de producción.

Iconos: Lucide Icons (engranaje, filtros, play, pausa, check, basurero, edición).

Distribución: PWA (Progressive Web App) lista para desplegar en GitHub Pages con almacenamiento persistente en el navegador.

2. Esquema de Base de Datos (Dexie.js)
// Definición de base de datos
db.version(1).stores({
  piezas: '++id, codigo1, codigo2, descripcion, material, fechaCreacion',
  trabajos: '++id, piezaId, codigo1, codigo2, descripcion, material, cantidad, estado, fechaCreacion, fechaInicio, fechaFin',
  intervalosTiempo: '++id, trabajoId, tipo, timestamp', // tipo: 'empezar' | 'pausar' | 'terminar'
  configuracion: 'clave, valor' // Tema claro/oscuro, etc.
});

. Lógica de Negocio y Reglas Críticas
A. Registro y fusión de trabajos (Pantallas 2 y 3)
Si se agrega una pieza desde la Pantalla 2 que ya existe en la lista de trabajos activos de la Pantalla 3:

Se localiza el registro existente.

Se suma la nueva cantidad a la cantidad previa.

Los cronómetros, intervalos ya registrados y el estado actual (Fabricando o Pausado) se mantienen intactos.

B. Cálculo de Tiempo Total Fabricado (Pantallas 4 y 5)
El tiempo neto trabajado se calcula sumando exclusivamente los intervalos de actividad:

/**
 * Calcula el tiempo neto trabajado sumando los intervalos activos
 * @param {Array<{tipo: 'empezar'|'pausar'|'terminar', timestamp: number}>} intervalos 
 * @returns {{ totalMs: number, horas: number, minutos: number, formateado: string }}
 */
export function calcularTiempoTotal(intervalos) {
  // Ordenar cronológicamente por fecha/hora
  const ordenados = [...intervalos].sort((a, b) => a.timestamp - b.timestamp);

  let tiempoTotalMs = 0;
  let inicioActual = null;

  for (const evento of ordenados) {
    if (evento.tipo === 'empezar') {
      inicioActual = evento.timestamp;
    } else if ((evento.tipo === 'pausar' || evento.tipo === 'terminar') && inicioActual !== null) {
      tiempoTotalMs += (evento.timestamp - inicioActual);
      inicioActual = null; // Reinicia el ciclo
    }
  }

  // Convertir milisegundos a horas y minutos
  const totalMinutos = Math.floor(tiempoTotalMs / (1000 * 60));
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  return {
    totalMs: tiempoTotalMs,
    horas,
    minutos,
    formateado: `${horas}h ${minutos}min`
  };
}

Restricción: El botón Terminar solo se habilita después de haber hecho clic al menos una vez en Empezar.

C. Horario Laboral y Algoritmo de Horas Extras (Pantalla 5)Jornada Ordinaria:Lunes a Viernes: 08:00 a 17:30.Sábado: 08:00 a 13:30.Domingos y Feriados Nacionales (Sector Público): Todo el tiempo computa como hora extra (100%).Regla de Redondeo de Horas Extras:Si $\text{Horas Extras} == 0$: No se muestra en la Pantalla 5.Si el valor es exacto (ej. 3.0 h, 3.5 h): Se mantiene exacto.Si la fracción decimal está entre $]0.0, 0.5[$: Se redondea a 0.5 (ej. 3.2 h $\rightarrow$ 3.5 h).Si la fracción decimal es $> 0.5$: Se redondea al siguiente entero (ej. 3.7 h $\rightarrow$ 4.0 h).

Pantalla 4: Historial de Trabajos Terminados
Tabla de trabajos concluidos: Código 1, Código 2, Descripción, Material, Cantidad, Tiempo Total Fabricado (formato: Xh Ymin) y Fechas.

Orden: Del más reciente al más antiguo.

Filtros: Por rango de fechas, códigos, descripción y material.

Pantalla 5: Reporte de Horas Extras
Listado de registros con horas extras: Fecha (DD/MM), Descripción de la pieza y Horas Extras calculadas con redondeo comercial aplicado (formato decimal: 3.5 h, 4.0 h).

Filtros en pantalla: Selector de fecha inicial y fecha final.

Exportación a Excel: Botón dedicado para generar un archivo .xlsx estructurado para Recursos Humanos filtrado por el rango de fechas seleccionado.

Menú de Configuración (Modal Engranaje)
Tema Visual: Selector deslizante (toggle) para cambiar en tiempo real entre Modo Claro (Light) y Modo Oscuro (Dark), persistido en Dexie/LocalStorage.

Copia de Seguridad:

Botón Exportar Base de Datos (JSON): Descarga un backup íntegro de todas las tablas.

Botón Importar Base de Datos (JSON): Selector de archivo para restaurar la información en cualquier equipo.

Botón de cierre (X) en la esquina superior derecha.

5. Fases Modulares de Construcción para el Agente

Módulo 1: Setup y Base de Datos (Dexie.js)

Inicializar proyecto Vite con Tailwind CSS.

Crear archivo src/db.js con el esquema de Dexie y métodos CRUD base.

Módulo 2: Pantalla 1 (Catálogo) y Menú de Configuración

Crear formulario de piezas, listado con filtros, edición y borrado.

Implementar modal de configuración con selector de tema oscuro/claro y exportar/importar JSON.

Módulo 3: Pantalla 2 (Selección) y Pantalla 3 (Control en Vivo)

Implementar selección múltiple con cantidades y redirección.

Implementar lógica de fusión de cantidades duplicadas.

Construir tabla de trabajos en proceso con botones Empezar/Pausar/Terminar y registro de intervalos de tiempo.

Módulo 4: Pantalla 4 (Historial) y Métricas

Cálculo de sumatoria de intervalos netos en horas y minutos.

Ordenación cronológica inversa y filtros avanzados.

Módulo 5: Pantalla 5 (Horas Extras) y Exportador Excel

Algoritmo de división de jornada laboral (L-V 8:00 a 17:30, Sáb 8:00 a 13:30, Dom/Feriados 100%).
Implementación de reglas de redondeo ($0.5$ / entero superior).Integración de SheetJS para exportar a archivo .xlsx con filtro de fechas.

Módulo 6: PWA y Preparación GitHub Pages

Configurar manifest.json, iconos y Service Worker para uso 100% offline.


