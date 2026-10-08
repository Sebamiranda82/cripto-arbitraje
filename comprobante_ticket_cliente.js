/* ══════════════════════════════════════════════════
   COMPROBANTE_TICKET_CLIENTE.JS — Factura en ticket térmico de 80 mm (40 columnas, letra monoespaciada).
   Es el ticket de CFB (buildTicket, tkPad, tkCols y los estilos de doPrint) con los datos de la factura:
   RUC, número, fecha, cliente, detalle, IVA por tarifa, total, autorización y clave de acceso.
   Solo dibuja: recibe el objeto de ComprobanteDatos.armar() y devuelve HTML. Depende de: Modal.esc
══════════════════════════════════════════════════ */
const ComprobanteTicket = (() => {
    const TK_W = 40;
    const eH = s => Modal.esc(s == null ? '' : String(s));

    // Estilos del ticket tal como los usa CFB.
    const css = `
    *{box-sizing:border-box;margin:0;padding:0;}body{background:#fff;display:flex;justify-content:center;}
    .ticket-paper{width:302px;padding:12px 10px;font-family:'Courier New',Courier,monospace;font-size:11px;line-height:1.4;}
    .tk-center{text-align:center;}.tk-company{font-size:13px;font-weight:bold;}.tk-sub{font-size:10px;color:#555;}
    .tk-div{border-top:1px dashed #999;margin:7px 0;}.tk-row{display:flex;justify-content:space-between;gap:4px;}.tk-row span:first-child{flex:1;}
    .tk-label{font-size:10px;color:#444;}.tk-total-box{background:#222;color:#fff;padding:6px 8px;border-radius:2px;margin-top:4px;display:flex;justify-content:space-between;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.tk-line{font-family:'Courier New',Courier,monospace;white-space:pre;font-size:10.5px;line-height:1.55;}
    .tkl{font-size:11px;font-weight:bold;}.tkv{font-size:14px;font-weight:bold;}.tk-footer{text-align:center;font-size:10px;color:#777;margin-top:8px;}
    @media print{@page{size:80mm auto;margin:2mm;}body{width:80mm;}}
  `;

    function tkPad(left, right, width) {
        left = String(left); right = String(right);
        let gap = width - left.length - right.length;
        if (gap < 1) gap = 1;
        return left + ' '.repeat(gap) + right;
    }
    function tkCols(a, b, c, wA, wB, wC) {
        a = String(a); b = String(b); c = String(c);
        if (a.length > wA) a = a.slice(0, wA);
        const padA = a + ' '.repeat(Math.max(0, wA - a.length));
        const padB = ' '.repeat(Math.max(0, wB - b.length)) + b;
        const padC = ' '.repeat(Math.max(0, wC - c.length)) + c;
        return padA + ' ' + padB + ' ' + padC;
    }
    // Parte un texto largo (clave de acceso) en renglones de 40 caracteres.
    const trozos = (s, w) => String(s || '').match(new RegExp('.{1,' + w + '}', 'g')) || [];

    function html(d) {
        const L = (t, extra) => `<div class="tk-line"${extra ? ` style="${extra}"` : ''}>${eH(t)}</div>`;
        const guion = '-'.repeat(TK_W), igual = '='.repeat(TK_W);
        const e = d.emisor;
        const nombre = e.nombreComercial || e.razonSocial || 'Mi Empresa';
        const filas = d.items.map(it => {
            const nom = it.nombre.length > 17 ? it.nombre.substring(0, 17) : it.nombre;
            return L(tkCols(nom, `${it.cant}x$${Number(it.precio).toFixed(2)}`, `$${Number(it.sub).toFixed(2)}`, 17, 11, 10));
        }).join('');
        const ivas = Object.keys(d.ivaGroups).sort((a, b) => a - b).map(k => L(tkPad(`IVA ${d.ivaGroups[k].pct}%`, `$ ${d.ivaGroups[k].iva.toFixed(2)}`, TK_W))).join('');
        return `<div class="tk-center"><div class="tk-company">${eH(nombre.toUpperCase())}</div><div class="tk-sub">${eH(e.dirEstablecimiento || e.dirMatriz || '')}</div><div class="tk-sub">RUC: ${eH(e.ruc)}</div></div>
  ${L(guion)}
  ${L(tkPad('Factura:', d.numero, TK_W))}
  ${L(tkPad('Fecha:', d.fecha, TK_W))}
  ${d.cliente.raz ? L(tkPad('Cliente:', d.cliente.raz.substring(0, 26), TK_W)) : ''}
  ${d.cliente.ced ? L(tkPad('Ced/RUC:', d.cliente.ced, TK_W)) : ''}
  ${L(guion)}
  ${L(tkCols('DESCRIPCION', 'CANT x P.U.', 'TOTAL', 17, 11, 10), 'font-weight:bold')}
  ${L(guion)}
  ${filas}
  ${L(guion)}
  ${L(tkPad('Subtotal sin IVA', `$ ${d.subtotal.toFixed(2)}`, TK_W))}
  ${ivas}
  ${L(igual)}
  ${L(tkPad('TOTAL', `$ ${d.total.toFixed(2)}`, TK_W), 'font-weight:bold')}
  ${L(igual)}
  ${d.autorizada ? L('AUTORIZADA POR EL SRI') + (d.autorizacion ? L('Autorizacion:') + trozos(d.autorizacion, TK_W).map(t => L(t)).join('') : '') : L('SIN AUTORIZACION DEL SRI AUN')}
  ${d.claveAcceso && d.claveAcceso !== d.autorizacion ? L('Clave de acceso:') + trozos(d.claveAcceso, TK_W).map(t => L(t)).join('') : ''}
  <div class="tk-footer">¡Gracias por su preferencia!<br>${d.ambiente ? 'Ambiente: ' + eH(d.ambiente) + '<br>' : ''}Factura electrónica</div>`;
    }

    return { html, css, tkPad, tkCols, TK_W };
})();
