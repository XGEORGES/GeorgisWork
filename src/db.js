import Dexie from 'dexie';

/**
 * Instancia principal de la Base de Datos IndexedDB con Dexie.js
 * Cumple estrictamente con el esquema definido en APP_SPEC.md
 */
export const db = new Dexie('GeorgisWorkDB');

// Definición de esquema versión 1
db.version(1).stores({
  piezas: '++id, codigo1, codigo2, descripcion, material, fechaCreacion',
  trabajos: '++id, piezaId, codigo1, codigo2, descripcion, material, cantidad, estado, fechaCreacion, fechaInicio, fechaFin',
  intervalosTiempo: '++id, trabajoId, tipo, timestamp', // tipo: 'empezar' | 'pausar' | 'terminar'
  configuracion: 'clave, valor' // Tema claro/oscuro, etc.
});

// ============================================================================
// Métodos CRUD y Operaciones para la tabla 'piezas'
// ============================================================================
export const piezasService = {
  async obtenerTodas() {
    return await db.piezas.orderBy('fechaCreacion').reverse().toArray();
  },

  async obtenerPorId(id) {
    return await db.piezas.get(Number(id));
  },

  async agregar(pieza) {
    const nuevaPieza = {
      codigo1: pieza.codigo1?.trim() || '',
      codigo2: pieza.codigo2?.trim() || '',
      descripcion: pieza.descripcion?.trim() || '',
      material: pieza.material?.trim() || '',
      fechaCreacion: pieza.fechaCreacion || new Date().toISOString()
    };
    return await db.piezas.add(nuevaPieza);
  },

  async actualizar(id, cambios) {
    return await db.piezas.update(Number(id), cambios);
  },

  async eliminar(id) {
    return await db.piezas.delete(Number(id));
  },

  async buscar(termino) {
    if (!termino) return await this.obtenerTodas();
    const query = termino.toLowerCase().trim();
    return await db.piezas
      .filter(p => 
        (p.codigo1 && p.codigo1.toLowerCase().includes(query)) ||
        (p.codigo2 && p.codigo2.toLowerCase().includes(query)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
        (p.material && p.material.toLowerCase().includes(query))
      )
      .toArray();
  }
};

// ============================================================================
// Métodos CRUD y Operaciones para la tabla 'trabajos'
// ============================================================================
export const trabajosService = {
  async obtenerActivos() {
    // Trabajos en estado 'pendiente', 'fabricando', o 'pausado'
    return await db.trabajos
      .filter(t => t.estado !== 'terminado')
      .reverse()
      .toArray();
  },

  async obtenerTerminados() {
    return await db.trabajos
      .filter(t => t.estado === 'terminado')
      .reverse()
      .toArray();
  },

  async obtenerPorId(id) {
    return await db.trabajos.get(Number(id));
  },

  async agregarOFusionar(trabajoData) {
    return await db.transaction('rw', db.trabajos, async () => {
      // Buscar si ya existe un trabajo activo con el mismo codigo1/codigo2 o piezaId
      const activos = await db.trabajos
        .filter(t => t.estado !== 'terminado' && (
          (t.piezaId && t.piezaId === trabajoData.piezaId) ||
          (t.codigo1 === trabajoData.codigo1 && t.codigo2 === trabajoData.codigo2)
        ))
        .first();

      if (activos) {
        // Fusión: sumar la nueva cantidad a la cantidad previa
        const nuevaCantidad = Number(activos.cantidad || 0) + Number(trabajoData.cantidad || 1);
        await db.trabajos.update(activos.id, { cantidad: nuevaCantidad });
        return { fusionado: true, id: activos.id, nuevaCantidad };
      } else {
        // Nuevo trabajo
        const nuevoTrabajo = {
          piezaId: trabajoData.piezaId || null,
          codigo1: trabajoData.codigo1 || '',
          codigo2: trabajoData.codigo2 || '',
          descripcion: trabajoData.descripcion || '',
          material: trabajoData.material || '',
          cantidad: Number(trabajoData.cantidad || 1),
          estado: 'pendiente', // 'pendiente' | 'fabricando' | 'pausado' | 'terminar'
          fechaCreacion: trabajoData.fechaCreacion || new Date().toISOString(),
          fechaInicio: null,
          fechaFin: null
        };
        const id = await db.trabajos.add(nuevoTrabajo);
        return { fusionado: false, id };
      }
    });
  },

  async actualizarEstado(id, estado, fechaFin = null) {
    const updateData = { estado };
    if (fechaFin) updateData.fechaFin = fechaFin;
    return await db.trabajos.update(Number(id), updateData);
  },

  async eliminar(id) {
    return await db.transaction('rw', db.trabajos, db.intervalosTiempo, async () => {
      await db.intervalosTiempo.where({ trabajoId: Number(id) }).delete();
      await db.trabajos.delete(Number(id));
    });
  }
};

// ============================================================================
// Métodos CRUD y Operaciones para 'intervalosTiempo'
// ============================================================================
export const intervalosService = {
  async registrarEvento(trabajoId, tipo) {
    const evento = {
      trabajoId: Number(trabajoId),
      tipo, // 'empezar' | 'pausar' | 'terminar'
      timestamp: Date.now()
    };
    return await db.intervalosTiempo.add(evento);
  },

  async obtenerPorTrabajo(trabajoId) {
    return await db.intervalosTiempo
      .where({ trabajoId: Number(trabajoId) })
      .sortBy('timestamp');
  },

  async obtenerTodos() {
    return await db.intervalosTiempo.toArray();
  }
};

// ============================================================================
// Métodos CRUD y Operaciones para 'configuracion'
// ============================================================================
export const configService = {
  async get(clave, valorPorDefecto = null) {
    const record = await db.configuracion.get(clave);
    return record ? record.valor : valorPorDefecto;
  },

  async set(clave, valor) {
    return await db.configuracion.put({ clave, valor });
  }
};

// ============================================================================
// Algoritmo de Tiempo Total (Regla de Negocio APP_SPEC.md)
// ============================================================================
/**
 * Calcula el tiempo neto trabajado sumando los intervalos activos
 * @param {Array<{tipo: 'empezar'|'pausar'|'terminar', timestamp: number}>} intervalos 
 * @returns {{ totalMs: number, horas: number, minutos: number, formateado: string }}
 */
export function calcularTiempoTotal(intervalos) {
  if (!intervalos || !intervalos.length) {
    return { totalMs: 0, horas: 0, minutos: 0, formateado: '0h 0min' };
  }

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

  // Si está actualmente fabricando (el último evento fue 'empezar'), incluir tiempo hasta Date.now()
  if (inicioActual !== null) {
    tiempoTotalMs += (Date.now() - inicioActual);
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

// ============================================================================
// Backup & Exportación/Importación de Base de Datos (JSON)
// ============================================================================
export const backupService = {
  /**
   * Exporta la base de datos a formato JSON:
   * - Tabla 'piezas' (catálogo completo)
   * - Tabla 'trabajos' ÚNICAMENTE con estado 'terminado' (historial)
   * - Tabla 'intervalosTiempo' correspondientes a esos trabajos terminados
   * - Tabla 'configuracion' (preferencias de tema, etc.)
   * - EXCLUYE cualquier trabajo activo ('pendiente', 'fabricando', 'pausado')
   */
  async exportarJSON() {
    // 1. Catálogo completo de piezas
    const piezas = await db.piezas.toArray();

    // 2. Trabajos terminados únicamente (excluyendo activos)
    const trabajosTerminados = await db.trabajos
      .filter(t => t.estado === 'terminado')
      .toArray();

    // Obtener conjunto de IDs de trabajos terminados
    const idsTrabajosTerminados = new Set(trabajosTerminados.map(t => t.id));

    // 3. Intervalos de tiempo pertenecientes a esos trabajos terminados
    const todosIntervalos = await db.intervalosTiempo.toArray();
    const intervalosTerminados = todosIntervalos.filter(i => idsTrabajosTerminados.has(i.trabajoId));

    // 4. Configuración
    const configuracion = await db.configuracion.toArray();

    const data = {
      version: 1,
      tipo: 'backup_georgiswork',
      fechaExportacion: new Date().toISOString(),
      piezas,
      trabajos: trabajosTerminados,
      intervalosTiempo: intervalosTerminados,
      configuracion
    };

    return JSON.stringify(data, null, 2);
  },

  /**
   * Importa y restaura una copia de seguridad JSON:
   * - Restaura el catálogo de piezas
   * - Restaura el historial de trabajos terminados con sus intervalos
   * - Deja la cola de trabajos en proceso (Pantalla 3) limpia y vacía
   */
  async importarJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data.piezas || !Array.isArray(data.piezas)) {
      throw new Error('Estructura de respaldo no válida (no se encontró catálogo de piezas).');
    }

    return await db.transaction('rw', db.piezas, db.trabajos, db.intervalosTiempo, db.configuracion, async () => {
      // Limpiar completamente todas las tablas
      await db.piezas.clear();
      await db.trabajos.clear();
      await db.intervalosTiempo.clear();
      await db.configuracion.clear();

      // 1. Restaurar catálogo de piezas
      if (data.piezas?.length) {
        await db.piezas.bulkAdd(data.piezas);
      }

      // 2. Filtrar y restaurar ÚNICAMENTE trabajos con estado 'terminado'
      const trabajosValidos = (data.trabajos || []).filter(t => t.estado === 'terminado');
      const idsTrabajosValidos = new Set(trabajosValidos.map(t => t.id));

      if (trabajosValidos.length > 0) {
        await db.trabajos.bulkAdd(trabajosValidos);
      }

      // 3. Restaurar intervalos que correspondan a esos trabajos terminados
      const intervalosValidos = (data.intervalosTiempo || []).filter(i => idsTrabajosValidos.has(i.trabajoId));
      if (intervalosValidos.length > 0) {
        await db.intervalosTiempo.bulkAdd(intervalosValidos);
      }

      // 4. Restaurar configuración si existe
      if (data.configuracion?.length) {
        await db.configuracion.bulkAdd(data.configuracion);
      }
    });
  }
};

// ============================================================================
// Verificación de Salud e Integridad de la Base de Datos
// ============================================================================
export async function checkDatabaseHealth() {
  try {
    if (!db.isOpen()) {
      await db.open();
    }

    const piezasCount = await db.piezas.count();
    const trabajosCount = await db.trabajos.count();
    const intervalosCount = await db.intervalosTiempo.count();
    const configCount = await db.configuracion.count();

    return {
      success: true,
      name: db.name,
      version: db.verno,
      counts: {
        piezas: piezasCount,
        trabajos: trabajosCount,
        intervalosTiempo: intervalosCount,
        configuracion: configCount
      },
      message: 'IndexedDB inicializada y operativa con Dexie.js'
    };
  } catch (error) {
    console.error('Error al conectar con Dexie.js:', error);
    return {
      success: false,
      name: db.name,
      error: error.message || 'Error desconocido al abrir IndexedDB'
    };
  }
}
