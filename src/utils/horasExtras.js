/**
 * Feriados Nacionales Oficiales (Mes-Día en formato MM-DD)
 */
export const FERIADOS_NACIONALES = [
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '06-07', // Batalla de Arica
  '06-29', // San Pedro y San Pablo
  '07-23', // Día de la FAP
  '07-28', // Fiestas Patrias
  '07-29', // Fiestas Patrias
  '08-06', // Batalla de Junín
  '08-30', // Santa Rosa de Lima
  '10-08', // Combate de Angamos
  '11-01', // Todos los Santos
  '12-08', // Inmaculada Concepción
  '12-09', // Batalla de Ayacucho
  '12-25'  // Navidad
];

/**
 * Determina si una fecha dada es Domingo o Feriado Nacional
 * @param {Date} date 
 * @returns {boolean}
 */
export function esDomingoOFeriado(date) {
  const diaSemana = date.getDay(); // 0 = Domingo
  if (diaSemana === 0) return true;

  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const mmdd = `${mm}-${dd}`;

  return FERIADOS_NACIONALES.includes(mmdd);
}

/**
 * Regla de Redondeo Comercial de Horas Extras (APP_SPEC.md Regla C)
 * - Si Horas Extras == 0: Retorna 0.
 * - Si el valor es exacto (ej. 3.0 h, 3.5 h): Se mantiene exacto.
 * - Si la fracción decimal está entre ]0.0, 0.5[: Se redondea a 0.5 (ej. 3.2 -> 3.5).
 * - Si la fracción decimal es > 0.5: Se redondea al siguiente entero (ej. 3.7 -> 4.0).
 * 
 * @param {number} horasDecimales 
 * @returns {number}
 */
export function redondearHorasExtrasComercial(horasDecimales) {
  if (!horasDecimales || horasDecimales <= 0.001) return 0;

  const entero = Math.floor(horasDecimales);
  // Redondeo a 4 decimales para evitar imprecisiones de coma flotante
  const fraccion = Math.round((horasDecimales - entero) * 10000) / 10000;

  if (fraccion === 0) {
    return entero;
  }
  if (fraccion === 0.5) {
    return entero + 0.5;
  }
  if (fraccion > 0 && fraccion < 0.5) {
    return entero + 0.5;
  }
  if (fraccion > 0.5) {
    return entero + 1.0;
  }

  return horasDecimales;
}

/**
 * Calcula los minutos de horas extras de un solo segmento continuo [inicioMs, finMs]
 * @param {number} inicioMs Timestamp inicio
 * @param {number} finMs Timestamp fin
 * @returns {{ minutosOrdinarios: number, minutosExtras: number }}
 */
export function calcularSegmentoHorasExtras(inicioMs, finMs) {
  if (finMs <= inicioMs) return { minutosOrdinarios: 0, minutosExtras: 0 };

  let minutosOrdinarios = 0;
  let minutosExtras = 0;

  // Evaluamos minuto a minuto para máxima exactitud en cruces de medianoche o límites
  const pasoMs = 60 * 1000; // 1 minuto
  let cursor = inicioMs;

  while (cursor < finMs) {
    const d = new Date(cursor);
    const diaSemana = d.getDay(); // 0: Dom, 1: Lun ... 6: Sáb
    const hora = d.getHours();
    const minuto = d.getMinutes();
    const minutoDelDia = hora * 60 + minuto;

    if (esDomingoOFeriado(d)) {
      // Domingos y feriados: 100% horas extras
      minutosExtras++;
    } else if (diaSemana >= 1 && diaSemana <= 5) {
      // Lunes a Viernes: 08:00 (480 min) a 17:30 (1050 min)
      if (minutoDelDia >= 480 && minutoDelDia < 1050) {
        minutosOrdinarios++;
      } else {
        minutosExtras++;
      }
    } else if (diaSemana === 6) {
      // Sábado: 08:00 (480 min) a 13:30 (810 min)
      if (minutoDelDia >= 480 && minutoDelDia < 810) {
        minutosOrdinarios++;
      } else {
        minutosExtras++;
      }
    }

    cursor += pasoMs;
  }

  return { minutosOrdinarios, minutosExtras };
}

/**
 * Procesa la lista de intervalos de un trabajo y calcula las horas extras desglosadas por fecha
 * @param {Array<{tipo: 'empezar'|'pausar'|'terminar', timestamp: number}>} intervalos 
 * @param {Object} trabajo Objeto de trabajo asociado
 * @returns {Array<Object>} Registros de horas extras por día
 */
export function procesarHorasExtrasTrabajo(intervalos, trabajo) {
  if (!intervalos || intervalos.length < 2) return [];

  const ordenados = [...intervalos].sort((a, b) => a.timestamp - b.timestamp);
  const segmentosPorFecha = {}; // { 'YYYY-MM-DD': { minutosExtras: 0, minutosOrdinarios: 0, primerTimestamp: number } }

  let inicioActual = null;

  for (const evento of ordenados) {
    if (evento.tipo === 'empezar') {
      inicioActual = evento.timestamp;
    } else if ((evento.tipo === 'pausar' || evento.tipo === 'terminar') && inicioActual !== null) {
      const finActual = evento.timestamp;
      
      // Agrupar por días si el intervalo cruza días
      let cursor = inicioActual;
      while (cursor < finActual) {
        const curDate = new Date(cursor);
        const yyyy = curDate.getFullYear();
        const mm = String(curDate.getMonth() + 1).padStart(2, '0');
        const dd = String(curDate.getDate()).padStart(2, '0');
        const fechaKey = `${yyyy}-${mm}-${dd}`;

        // Determinar final del día actual o finActual
        const finDeDia = new Date(curDate);
        finDeDia.setHours(23, 59, 59, 999);
        const subFin = Math.min(finActual, finDeDia.getTime() + 1);

        const { minutosOrdinarios, minutosExtras } = calcularSegmentoHorasExtras(cursor, subFin);

        if (!segmentosPorFecha[fechaKey]) {
          segmentosPorFecha[fechaKey] = {
            fecha: fechaKey,
            minutosExtras: 0,
            minutosOrdinarios: 0,
            primerTimestamp: cursor
          };
        }

        segmentosPorFecha[fechaKey].minutosExtras += minutosExtras;
        segmentosPorFecha[fechaKey].minutosOrdinarios += minutosOrdinarios;

        cursor = subFin;
      }

      inicioActual = null;
    }
  }

  // Convertir a registros para la tabla de horas extras
  const resultados = [];

  for (const [fechaKey, datos] of Object.entries(segmentosPorFecha)) {
    const horasExtrasExactas = datos.minutosExtras / 60;
    const horasExtrasRedondeadas = redondearHorasExtrasComercial(horasExtrasExactas);
    const horasTotalesReales = (datos.minutosExtras + datos.minutosOrdinarios) / 60;

    // Restricción APP_SPEC.md: Si Horas Extras == 0: No se muestra en la Pantalla 5
    if (horasExtrasRedondeadas > 0) {
      const d = new Date(datos.primerTimestamp);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const fechaDDMM = `${dia}/${mes}`;
      const fechaCompleta = `${dia}/${mes}/${d.getFullYear()}`;

      resultados.push({
        trabajoId: trabajo.id,
        fechaKey,
        fechaDDMM,
        fechaCompleta,
        codigo1: trabajo.codigo1 || '',
        codigo2: trabajo.codigo2 || '',
        descripcion: trabajo.descripcion || '',
        material: trabajo.material || '',
        cantidad: trabajo.cantidad || 1,
        minutosExtras: datos.minutosExtras,
        minutosOrdinarios: datos.minutosOrdinarios,
        horasTotalesReales: parseFloat(horasTotalesReales.toFixed(2)),
        horasExtrasExactas: parseFloat(horasExtrasExactas.toFixed(2)),
        horasExtrasRedondeadas: parseFloat(horasExtrasRedondeadas.toFixed(1)),
        formateado: `${horasExtrasRedondeadas.toFixed(1)} h`
      });
    }
  }

  return resultados;
}
