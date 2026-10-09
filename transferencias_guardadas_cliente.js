/* ══════════════════════════════════════════════════
   TRANSFERENCIAS_GUARDADAS_CLIENTE.JS — El Excel de transferencias queda guardado en este navegador, por empresa.
   Así no hay que volver a buscarlo ni cargarlo cada vez que se sale de la pantalla y se regresa.
   Guarda solo lo necesario de cada transferencia: banco, fecha, importe y concepto.
   Depende de: AlmacenLocal, Api (para saber la empresa de la sesión).
══════════════════════════════════════════════════ */
const TransferenciasGuardadas = (() => {
    const MAX_FILAS = 5000;
    const almacen = AlmacenLocal.crear('transferencias', {
        alcance: () => { const u = Api.usuario(); return u && u.empresa_id != null ? 'e' + u.empresa_id : 'local'; },
    });
    const limpiar = l => (Array.isArray(l) ? l : []).filter(t => t && typeof t === 'object' && t.importe !== undefined && t.importe !== '')
        .map(t => ({ banco: String(t.banco ?? ''), fecha: String(t.fecha ?? ''), importe: String(t.importe), concepto: String(t.concepto ?? '') }));

    // true = quedó guardado en el navegador; false = no se pudo (solo dura mientras no se recargue)
    function guardar(nombreArchivo, lista) {
        const l = limpiar(lista);
        if (!l.length || l.length > MAX_FILAS) return false;
        const ok = almacen.guardar({ nombre: String(nombreArchivo || ''), lista: l });
        AlmacenLocal.pedirPersistencia();
        return ok;
    }

    // { nombre, lista, guardadoEn } o null
    function leer() {
        const r = almacen.leer();
        if (!r || !r.valor) return null;
        const lista = limpiar(r.valor.lista);
        return lista.length ? { nombre: String(r.valor.nombre || ''), lista, guardadoEn: r.guardadoEn } : null;
    }

    return { guardar, leer, borrar: () => almacen.borrar() };
})();
