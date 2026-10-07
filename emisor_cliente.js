/* ══════════════════════════════════════════════════
   EMISOR_CLIENTE.JS — El emisor (RUC, razón social, direcciones, ambiente…)
   sale de la empresa de la sesión (GET /empresa), no de un texto fijo.
   Sin sesión se queda el emisor por defecto (modo transitorio del dueño).
   Solo se usa para mostrar y para la vista previa: el XML oficial lo arma
   el servidor con los datos de la empresa guardados en MySQL.
══════════════════════════════════════════════════ */
const Emisor = (() => {
    const REGIMEN_TEXTO = { RIMPE_NEGOCIO_POPULAR: 'RIMPE NEGOCIO POPULAR', RIMPE_EMPRENDEDOR: 'RIMPE EMPRENDEDOR', GENERAL: 'RÉGIMEN GENERAL' };

    function pintarEncabezado(e) {
        const t = document.getElementById('emisor-titulo');
        if (t) t.textContent = `${e.razonSocial} · ${REGIMEN_TEXTO[e.regimen] || e.regimen || ''}`;
        document.title = `Facturador SRI - ${e.razonSocial}`;
    }

    // `emisor` es el objeto compartido que usa la pantalla; se modifica en su lugar.
    function enlazar(emisor) {
        const porDefecto = Object.assign({}, emisor);
        const aplicar = ev => {
            const m = ev.detail && ev.detail.empresa; if (!m) return;
            Object.assign(emisor, {
                ruc: m.ruc, razonSocial: m.razon_social, nombreComercial: m.nombre_comercial || m.razon_social,
                regimen: m.regimen || emisor.regimen, obligadoContabilidad: m.obligado_contabilidad || 'NO',
                dirMatriz: m.dir_matriz || '', dirEstablecimiento: m.dir_establecimiento || m.dir_matriz || '',
                estab: m.estab || '001', ptoEmi: m.pto_emi || '001', ambiente: String(m.ambiente || '1'), tipoEmision: String(m.tipo_emision || '1'),
            });
            pintarEncabezado(emisor);
        };
        window.addEventListener('sesion-lista', aplicar);
        window.addEventListener('empresa-actualizada', aplicar);   // al guardar los datos en la pestaña Empresa
        const restaurar = () => { Object.assign(emisor, porDefecto); pintarEncabezado(emisor); };
        window.addEventListener('sesion-cerrada', restaurar);
        window.addEventListener('sesion-expirada', restaurar);
        pintarEncabezado(emisor);
    }
    return { enlazar };
})();
