/* ══════════════════════════════════════════════════
   IMPRESION_CLIENTE.JS — Imprimir un documento ya dibujado (A4 o ticket) y recordar el formato elegido.
   Es la forma de imprimir de CFB (doPrint): se abre una ventana con el HTML y sus estilos y se llama a print();
   desde ahí se imprime o se "Guarda como PDF". También arma el mismo documento completo para la vista previa.
   No sabe nada de facturas: recibe { html, css, ticket, titulo }.
══════════════════════════════════════════════════ */
const Impresion = (() => {
    const LS_PREF = 'srifactu_print_pref';          // 'a4' | 'ticket'

    function preferencia() {
        try { const p = localStorage.getItem(LS_PREF); return p === 'a4' || p === 'ticket' ? p : null; } catch (e) { return null; }
    }
    function guardarPreferencia(tipo) { try { localStorage.setItem(LS_PREF, tipo); } catch (e) {} }
    function olvidarPreferencia() { try { localStorage.removeItem(LS_PREF); } catch (e) {} }

    // Documento HTML completo (el mismo para la vista previa y para imprimir).
    function documento({ html, css, ticket, titulo }) {
        const t = String(titulo || (ticket ? 'Ticket' : 'Factura')).replace(/[<>&"]/g, '');
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t}</title><style>${css}</style></head><body><div class="${ticket ? 'ticket-paper' : 'pdf-paper'}">${html}</div></body></html>`;
    }

    // Abre la ventana de impresión (debe llamarse directo desde un clic). false si el navegador la bloqueó.
    function imprimir(doc) {
        const win = window.open('', '_blank');
        if (!win) return false;
        win.document.write(documento(doc));
        win.document.close();
        setTimeout(() => { win.print(); }, 500);
        return true;
    }

    return { preferencia, guardarPreferencia, olvidarPreferencia, documento, imprimir };
})();
