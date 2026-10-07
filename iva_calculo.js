/* ══════════════════════════════════════════════════
   IVA_CALCULO.JS — Única fórmula de IVA del sistema.
   Funciona igual en el navegador y en Node (el servidor la usará al
   armar el XML en la Fase 3), así el cartel que ve el usuario y lo que
   se envía al SRI nunca difieren.
   Reglas: IVA permitido 0, 5 o 15. Redondeo a 2 decimales por línea.
     incluyeIva=true : base = precio / (1 + IVA/100)
     incluyeIva=false: base = precio
     iva = base × IVA/100 (redondeado)   total = base + iva
   Nota: con "precios incluyen IVA" el total puede diferir en 1 centavo del
   precio de lista; se prefiere eso a un IVA que no cuadre con la base ante el SRI.
══════════════════════════════════════════════════ */
(function (root) {
    const IVA_PERMITIDOS = [0, 5, 15];
    const redondear2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

    function desglosar(precio, ivaPct, incluyeIva, cantidad) {
        const cant = cantidad === undefined ? 1 : cantidad;
        if (!Number.isFinite(precio) || precio < 0) throw new Error('Precio inválido');
        if (!Number.isFinite(cant) || cant <= 0) throw new Error('Cantidad inválida');
        if (!IVA_PERMITIDOS.includes(ivaPct)) throw new Error('IVA debe ser 0, 5 o 15');
        const bruto = precio * cant;
        const base = redondear2(incluyeIva ? bruto / (1 + ivaPct / 100) : bruto);
        const iva = redondear2(base * ivaPct / 100);
        return { base, iva, total: redondear2(base + iva), ivaPct };
    }

    const api = { IVA_PERMITIDOS, redondear2, desglosar };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.IvaCalculo = api;
})(typeof window !== 'undefined' ? window : globalThis);
