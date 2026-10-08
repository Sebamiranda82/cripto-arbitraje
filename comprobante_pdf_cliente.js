/* ══════════════════════════════════════════════════
   COMPROBANTE_PDF_CLIENTE.JS — Factura en hoja A4 (para imprimir o "Guardar como PDF").
   Es el diseño del PDF de CFB (buildPDF + los estilos de doPrint), con los datos de la factura:
   RUC, número, autorización, ambiente, clave de acceso, comprador, detalle, totales por IVA e información adicional.
   Solo dibuja: recibe el objeto de ComprobanteDatos.armar() y devuelve HTML. No lee la pantalla ni el servidor.
   Depende de: Modal.esc
══════════════════════════════════════════════════ */
const ComprobantePdf = (() => {
    const eH = s => Modal.esc(s == null ? '' : String(s));
    const m2 = n => '$ ' + Number(n || 0).toFixed(2);

    // Estilos tal como los usa CFB para el A4, más 3 clases nuevas (clave, aviso, info adicional) al final.
    const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#fff;}
    .pdf-paper{padding:42px 46px;max-width:760px;margin:0 auto;}
    .pdf-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:26px;padding-bottom:18px;border-bottom:2px solid #bbb;}
    .pdf-company{font-family:'Syne',sans-serif;font-size:.98rem;font-weight:800;color:#444;}.pdf-tagline{font-size:.74rem;color:#888;margin-top:3px;}
    .pdf-doc-type{font-family:'Syne',sans-serif;font-size:.98rem;font-weight:800;color:#555;text-align:right;}.pdf-doc-num{font-size:.78rem;color:#888;text-align:right;margin-top:4px;}.pdf-doc-date{font-size:.74rem;color:#aaa;text-align:right;margin-top:2px;}
    .pdf-stitle{font-family:'Syne',sans-serif;font-weight:700;font-size:.67rem;letter-spacing:.12em;text-transform:uppercase;color:#888;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #ddd;}
    .pdf-section{margin-bottom:20px;}.pdf-cgrid{display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;}.pdf-cf{font-size:.79rem;color:#555;}.pdf-cf span{color:#999;margin-right:3px;}
    .pdf-table{width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.pdf-table thead tr{background:#d0d0d0 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.pdf-table thead th{font-family:'Syne',sans-serif;font-size:.64rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#333;padding:9px 11px;text-align:left;}.pdf-table thead th:last-child{text-align:right;}
    .pdf-table tbody tr{border-bottom:1px solid #f0f0f0;}.pdf-table tbody tr:nth-child(even){background:#f6f6f6;}.pdf-table tbody td{font-size:.81rem;color:#444;padding:8px 11px;}.pdf-table tbody td:last-child{text-align:right;font-family:'Syne',sans-serif;font-weight:600;}
    .pdf-totals{display:flex;flex-direction:column;gap:5px;max-width:280px;margin-left:auto;margin-top:14px;}.pdf-trow{display:flex;justify-content:space-between;font-size:.8rem;color:#555;padding:3px 0;}.pdf-tdiv{height:1px;background:#ccc;margin:5px 0;}
    .pdf-ttotal{display:flex;justify-content:space-between;background:#ddd;color:#333;padding:11px 14px;border-radius:6px;margin-top:5px;}.ptl{font-family:'Syne',sans-serif;font-weight:700;font-size:.85rem;}.ptv{font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;}
    .pdf-footer{margin-top:34px;padding-top:14px;border-top:1px solid #ddd;text-align:center;font-size:.69rem;color:#aaa;}
    .pdf-clave{font-family:'Courier New',monospace;font-size:.78rem;color:#444;word-break:break-all;}
    .pdf-aviso{margin-top:6px;font-size:.74rem;font-weight:700;color:#b45309;text-align:right;}
    .pdf-info{font-size:.76rem;color:#555;line-height:1.55;white-space:pre-line;}.pdf-info b{color:#888;font-weight:500;}
    @media print{@page{size:A4;margin:14mm;}body{width:auto;}}
  `;

    function ivaFilas(d) {
        return Object.keys(d.ivaGroups).sort((a, b) => a - b).map(k => {
            const g = d.ivaGroups[k];
            return `<div class="pdf-trow"><span>IVA ${g.pct}% (base ${m2(g.base)})</span><span>${m2(g.iva)}</span></div>`;
        }).join('');
    }

    function html(d) {
        const e = d.emisor;
        const filas = d.items.map(it => `<tr><td style="text-align:center">${eH(it.cant)}</td><td>${eH(it.nombre)}</td><td style="text-align:right;font-size:.72rem;color:#777">${eH(it.ivaPct)}%</td><td style="text-align:right">${m2(it.precio)}</td><td>${m2(it.sub)}</td></tr>`).join('');
        const logo = d.logo ? `<img src="${eH(d.logo)}" alt="" style="max-height:60px;max-width:140px;object-fit:contain">` : '';
        const nombre = e.nombreComercial || e.razonSocial || 'Mi Empresa';
        const lineasInfo = [
            d.formaPago ? `<b>Forma de pago:</b> ${eH(d.formaPago)}` : '',
            ...d.infoAdicional.map(c => `<b>${eH(c.nombre)}:</b> ${eH(c.valor)}`)
        ].filter(Boolean);
        return `<div class="pdf-hdr">
    <div style="display:flex;align-items:center;gap:14px">
      ${logo}
      <div>
        <div class="pdf-company">${eH(nombre)}</div>
        ${e.razonSocial && e.razonSocial !== nombre ? `<div class="pdf-tagline">${eH(e.razonSocial)}</div>` : ''}
        <div class="pdf-tagline">RUC: ${eH(e.ruc)}</div>
        <div class="pdf-tagline">${eH(e.dirMatriz)}</div>
        ${e.dirEstablecimiento && e.dirEstablecimiento !== e.dirMatriz ? `<div class="pdf-tagline">Establecimiento: ${eH(e.dirEstablecimiento)}</div>` : ''}
        <div class="pdf-tagline">Obligado a llevar contabilidad: ${eH(e.obligadoContabilidad || 'NO')}</div>
        ${e.rimpe ? `<div class="pdf-tagline">${eH(e.rimpe)}</div>` : ''}
      </div>
    </div>
    <div>
      <div class="pdf-doc-type">FACTURA</div>
      <div class="pdf-doc-num">N° ${eH(d.numero)}</div>
      <div class="pdf-doc-date">Fecha: ${eH(d.fecha)}</div>
      ${d.ambiente ? `<div class="pdf-doc-date">Ambiente: ${eH(d.ambiente)}</div>` : ''}
      ${d.autorizada ? `<div class="pdf-doc-date">Autorizada${d.fechaAutorizacion ? ': ' + eH(d.fechaAutorizacion) : ''}</div>` : `<div class="pdf-aviso">AÚN SIN AUTORIZACIÓN DEL SRI</div>`}
    </div>
  </div>
  ${d.autorizacion || d.claveAcceso ? `<div class="pdf-section"><div class="pdf-stitle">Autorización y clave de acceso</div>
    ${d.autorizacion ? `<div class="pdf-cf"><span>N° de autorización:</span></div><div class="pdf-clave">${eH(d.autorizacion)}</div>` : ''}
    ${d.claveAcceso ? `<div class="pdf-cf" style="margin-top:6px"><span>Clave de acceso:</span></div><div class="pdf-clave">${eH(d.claveAcceso)}</div>` : ''}
  </div>` : ''}
  <div class="pdf-section"><div class="pdf-stitle">Datos del cliente</div><div class="pdf-cgrid"><div class="pdf-cf"><span>Cédula/RUC:</span>${eH(d.cliente.ced || '—')}</div><div class="pdf-cf"><span>Razón Social:</span>${eH(d.cliente.raz || '—')}</div>${d.cliente.dir ? `<div class="pdf-cf" style="grid-column:1/-1"><span>Dirección:</span>${eH(d.cliente.dir)}</div>` : ''}</div></div>
  <div class="pdf-section"><div class="pdf-stitle">Detalle</div>
  <table class="pdf-table"><thead><tr><th style="width:40px">Cant.</th><th>Descripción</th><th style="width:50px;text-align:center">IVA</th><th style="width:100px;text-align:right">P. Unit.</th><th style="width:100px;text-align:right">Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
  <div class="pdf-totals">
    <div class="pdf-trow"><span>Subtotal (sin IVA)</span><span>${m2(d.subtotal)}</span></div>
    ${ivaFilas(d)}
    <div class="pdf-tdiv"></div>
    <div class="pdf-ttotal"><span class="ptl">TOTAL</span><span class="ptv">${m2(d.total)}</span></div>
  </div></div>
  ${lineasInfo.length ? `<div class="pdf-section"><div class="pdf-stitle">Información adicional</div><div class="pdf-info">${lineasInfo.join('<br>')}</div></div>` : ''}
  <div class="pdf-footer">${d.autorizada ? 'Comprobante electrónico autorizado por el SRI · Verifique su validez en srienlinea.sri.gob.ec' : 'Este comprobante aún no tiene la autorización del SRI'} · ${eH(nombre)}</div>`;
    }

    return { html, css };
})();
