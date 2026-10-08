/* ══════════════════════════════════════════════════
   COMPROBANTE_DATOS_CLIENTE.JS — Arma los datos que se imprimen de UNA factura. Nada de dibujo aquí.
   Entrada: la fila del historial + (si existe) el XML firmado que guarda el servidor
   (GET /facturas-historial/:numero/comprobante). Del XML salen las líneas, la clave de acceso, el comprador
   y la información adicional; sin XML (facturas antiguas) se arma una sola línea con lo del historial.
   Salida: un objeto simple que usan por igual el PDF y el ticket (ComprobantePdf / ComprobanteTicket):
     { tipo, numero, fecha, estado, autorizada, autorizacion, fechaAutorizacion, claveAcceso, ambiente,
       emisor:{razonSocial,nombreComercial,ruc,dirMatriz,dirEstablecimiento,obligadoContabilidad,rimpe},
       cliente:{ced,raz,dir}, items:[{cant,codigo,nombre,precio,sub,ivaPct}],
       subtotal, ivaGroups:{"15":{pct,base,iva}}, iva, total, formaPago, infoAdicional:[{nombre,valor}], logo }
   Sin dependencias (usa DOMParser del navegador).
══════════════════════════════════════════════════ */
const ComprobanteDatos = (() => {
    const AMBIENTES = { '1': 'PRUEBAS', '2': 'PRODUCCIÓN' };
    // Formas de pago de la ficha técnica del SRI.
    const FORMAS_PAGO = {
        '01': 'Sin utilización del sistema financiero', '15': 'Compensación de deudas', '16': 'Tarjeta de débito',
        '17': 'Dinero electrónico', '18': 'Tarjeta prepago', '19': 'Tarjeta de crédito',
        '20': 'Otros con utilización del sistema financiero', '21': 'Endoso de títulos'
    };
    const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
    const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

    // 'yyyy-mm-dd…' o 'dd/mm/yyyy' → 'dd/mm/yyyy'
    function fechaDDMMYYYY(v) {
        const s = String(v || '').trim();
        let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[1]}/${m[2]}/${m[3]}`;
        m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
    }

    // Texto del primer elemento con ese nombre dentro de `raiz` ('' si no hay).
    const txt = (raiz, nombre) => { const e = raiz && raiz.getElementsByTagName(nombre)[0]; return e ? e.textContent.trim() : ''; };

    // Lee lo que se necesita del XML de la factura. null si no es un XML de factura legible.
    function leerXml(xml) {
        if (!xml) return null;
        const doc = new DOMParser().parseFromString(String(xml), 'application/xml');
        if (doc.getElementsByTagName('parsererror').length || !doc.getElementsByTagName('infoFactura').length) return null;
        const trib = doc.getElementsByTagName('infoTributaria')[0], inf = doc.getElementsByTagName('infoFactura')[0];
        const items = [...doc.getElementsByTagName('detalle')].map(d => ({
            cant: num(txt(d, 'cantidad')), codigo: txt(d, 'codigoPrincipal') || txt(d, 'codigoInterno'), nombre: txt(d, 'descripcion'),
            precio: num(txt(d, 'precioUnitario')), sub: num(txt(d, 'precioTotalSinImpuesto')),
            ivaPct: num(txt(d.getElementsByTagName('impuesto')[0], 'tarifa')), iva: num(txt(d.getElementsByTagName('impuesto')[0], 'valor'))
        }));
        return {
            ambiente: txt(trib, 'ambiente'), claveAcceso: txt(trib, 'claveAcceso'),
            emisor: { razonSocial: txt(trib, 'razonSocial'), nombreComercial: txt(trib, 'nombreComercial'), ruc: txt(trib, 'ruc'),
                      dirMatriz: txt(trib, 'dirMatriz'), dirEstablecimiento: txt(inf, 'dirEstablecimiento'),
                      obligadoContabilidad: txt(inf, 'obligadoContabilidad'), rimpe: txt(trib, 'contribuyenteRimpe') },
            fecha: txt(inf, 'fechaEmision'),
            cliente: { ced: txt(inf, 'identificacionComprador'), raz: txt(inf, 'razonSocialComprador'), dir: txt(inf, 'direccionComprador') },
            items, subtotal: num(txt(inf, 'totalSinImpuestos')), total: num(txt(inf, 'importeTotal')),
            formaPago: txt(inf.getElementsByTagName('pago')[0], 'formaPago'),
            infoAdicional: [...doc.getElementsByTagName('campoAdicional')].map(c => ({ nombre: c.getAttribute('nombre') || '', valor: c.textContent.trim() }))
        };
    }

    // Agrupa por tarifa: { "15": { pct, base, iva } }. Si la línea no trae su IVA, se calcula.
    function agruparIva(items) {
        const g = {};
        items.forEach(it => {
            const k = String(it.ivaPct), x = g[k] || (g[k] = { pct: it.ivaPct, base: 0, iva: 0 });
            x.base += it.sub; x.iva += (it.iva !== undefined ? it.iva : it.sub * it.ivaPct / 100);
        });
        Object.values(g).forEach(x => { x.base = r2(x.base); x.iva = r2(x.iva); });
        return g;
    }

    // fila: la fila de facturas_historial · xml: XML firmado o null · emisorActual: respaldo si no hay XML · logo: data URL o null
    function armar({ fila, xml, emisorActual, logo }) {
        fila = fila || {};
        const x = leerXml(xml);
        const e = emisorActual || {};
        const items = x && x.items.length ? x.items : (() => {
            const sub = num(fila.subtotal != null ? fila.subtotal : fila.total), cant = num(fila.cantidad) || 1, iva = num(fila.iva);
            return [{ cant, codigo: '', nombre: fila.producto_servicio || 'SERVICIOS PRESTADOS', precio: r2(sub / cant), sub,
                      ivaPct: sub > 0 && iva > 0 ? Math.round(iva / sub * 100) : 0, iva }];
        })();
        const ivaGroups = agruparIva(items);
        const subtotal = x ? x.subtotal : r2(items.reduce((s, i) => s + i.sub, 0));
        const total = x ? x.total : num(fila.total);
        const estado = String(fila.estado_sri || '').trim();
        const emisor = x ? x.emisor : {
            razonSocial: e.razonSocial || '', nombreComercial: e.nombreComercial || e.razonSocial || '', ruc: e.ruc || '',
            dirMatriz: e.dirMatriz || '', dirEstablecimiento: e.dirEstablecimiento || e.dirMatriz || '',
            obligadoContabilidad: e.obligadoContabilidad || 'NO', rimpe: e.regimen === 'RIMPE_NEGOCIO_POPULAR' ? 'CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE' : ''
        };
        const amb = (x && x.ambiente) || e.ambiente || '';
        return {
            tipo: 'FACTURA', numero: fila.numero_factura_sri || '', fecha: (x && x.fecha) || fechaDDMMYYYY(fila.fecha_emision),
            estado, autorizada: /^AUTORIZADO/i.test(estado), autorizacion: fila.numero_autorizacion || '',
            fechaAutorizacion: fila.fecha_autorizacion || '', claveAcceso: (x && x.claveAcceso) || fila.clave_acceso || '',
            ambiente: AMBIENTES[amb] || '', emisor,
            cliente: { ced: (x && x.cliente.ced) || fila.cedula_cliente || '', raz: (x && x.cliente.raz) || fila.cliente || 'CONSUMIDOR FINAL', dir: (x && x.cliente.dir) || '' },
            items, subtotal, ivaGroups, iva: r2(total - subtotal), total,
            formaPago: x && x.formaPago ? `${x.formaPago} - ${FORMAS_PAGO[x.formaPago] || ''}`.trim() : '',
            infoAdicional: x ? x.infoAdicional : (fila.observacion ? [{ nombre: 'Observación', valor: fila.observacion }] : []),
            logo: logo || null
        };
    }

    return { armar, leerXml, agruparIva, fechaDDMMYYYY, FORMAS_PAGO };
})();
if (typeof module !== 'undefined') module.exports = ComprobanteDatos;
