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
// Función de Inicialización Demo (Desactivada para Producción Limpia)
// ============================================================================
export async function seedDemoPiezas() {
  // Base de datos limpia: No inserta datos automáticamente
  return;
}

// ============================================================================
// Métodos CRUD y Operaciones para la tabla 'trabajos'
// ============================================================================
export const trabajosService = {
  async obtenerActivos() {
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
      const activos = await db.trabajos
        .filter(t => t.estado !== 'terminado' && (
          (t.piezaId && t.piezaId === trabajoData.piezaId) ||
          (t.codigo1 === trabajoData.codigo1 && t.codigo2 === trabajoData.codigo2)
        ))
        .first();

      if (activos) {
        const nuevaCantidad = Number(activos.cantidad || 0) + Number(trabajoData.cantidad || 1);
        await db.trabajos.update(activos.id, { cantidad: nuevaCantidad });
        return { fusionado: true, id: activos.id, nuevaCantidad };
      } else {
        const nuevoTrabajo = {
          piezaId: trabajoData.piezaId || null,
          codigo1: trabajoData.codigo1 || '',
          codigo2: trabajoData.codigo2 || '',
          descripcion: trabajoData.descripcion || '',
          material: trabajoData.material || '',
          cantidad: Number(trabajoData.cantidad || 1),
          estado: 'pendiente',
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
      tipo,
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
export function calcularTiempoTotal(intervalos) {
  if (!intervalos || !intervalos.length) {
    return { totalMs: 0, horas: 0, minutos: 0, formateado: '0h 0min' };
  }

  const ordenados = [...intervalos].sort((a, b) => a.timestamp - b.timestamp);

  let tiempoTotalMs = 0;
  let inicioActual = null;

  for (const evento of ordenados) {
    if (evento.tipo === 'empezar') {
      inicioActual = evento.timestamp;
    } else if ((evento.tipo === 'pausar' || evento.tipo === 'terminar') && inicioActual !== null) {
      tiempoTotalMs += (evento.timestamp - inicioActual);
      inicioActual = null;
    }
  }

  if (inicioActual !== null) {
    tiempoTotalMs += (Date.now() - inicioActual);
  }

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
  async exportarJSON() {
    const piezas = await db.piezas.toArray();
    const trabajosTerminados = await db.trabajos
      .filter(t => t.estado === 'terminado')
      .toArray();

    const idsTrabajosTerminados = new Set(trabajosTerminados.map(t => t.id));

    const todosIntervalos = await db.intervalosTiempo.toArray();
    const intervalosTerminados = todosIntervalos.filter(i => idsTrabajosTerminados.has(i.trabajoId));

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

  async importarJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data.piezas || !Array.isArray(data.piezas)) {
      throw new Error('Estructura de respaldo no válida (no se encontró catálogo de piezas).');
    }

    return await db.transaction('rw', db.piezas, db.trabajos, db.intervalosTiempo, db.configuracion, async () => {
      await db.piezas.clear();
      await db.trabajos.clear();
      await db.intervalosTiempo.clear();
      await db.configuracion.clear();

      if (data.piezas?.length) {
        await db.piezas.bulkAdd(data.piezas);
      }

      const trabajosValidos = (data.trabajos || []).filter(t => t.estado === 'terminado');
      const idsTrabajosValidos = new Set(trabajosValidos.map(t => t.id));

      if (trabajosValidos.length > 0) {
        await db.trabajos.bulkAdd(trabajosValidos);
      }

      const intervalosValidos = (data.intervalosTiempo || []).filter(i => idsTrabajosValidos.has(i.trabajoId));
      if (intervalosValidos.length > 0) {
        await db.intervalosTiempo.bulkAdd(intervalosValidos);
      }

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