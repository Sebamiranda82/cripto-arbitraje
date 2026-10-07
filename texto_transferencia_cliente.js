/* ══════════════════════════════════════════════════
   TEXTO_TRANSFERENCIA_CLIENTE.JS — Limpia el texto de una transferencia del Excel para mostrarlo.
   Quita el nombre del titular (el de la empresa que factura) que el banco repite en cada
   concepto, para que la fila entre en un solo renglón. Solo cambia lo que se VE en la lista:
   no toca el Excel ni lo que se carga al formulario.
   Tolera mayúsculas, tildes y separadores (espacios, comas, puntos, guiones) entre las palabras.
   Función pura, sin dependencias.
══════════════════════════════════════════════════ */
const TextoTransferencia = (() => {
    const ACENTOS = { a: 'aáàäâ', e: 'eéèëê', i: 'iíìïî', o: 'oóòöô', u: 'uúùüû', n: 'nñ' };
    const SEP = '[\\s,.;:\\-]+';

    function escapar(c) { return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    // "ANDRES" → [aáàäâ] / [nñ] por letra, para empatar sin importar la tilde.
    function palabraRegex(palabra) {
        return palabra.toLowerCase().split('').map(c => ACENTOS[c] ? `[${ACENTOS[c]}]` : escapar(c)).join('');
    }

    function regexNombre(nombre) {
        const palabras = String(nombre || '').trim().split(/[\s,.;:\-]+/).filter(Boolean);
        if (palabras.length < 2) return null;            // una sola palabra podría borrar texto útil
        return new RegExp(palabras.map(palabraRegex).join(SEP), 'gi');
    }

    // Texto sin el/los nombres indicados, con los separadores sobrantes recortados.
    function sinTitular(texto, ...nombres) {
        let r = String(texto == null ? '' : texto);
        // Donde estaba el nombre se deja una marca; luego se barren los separadores que lo rodeaban
        // ("TRF- -ABC" → "TRF ABC") sin tocar los demás guiones o puntos del texto.
        nombres.forEach(n => { const re = regexNombre(n); if (re) r = r.replace(re, '\u0001'); });
        r = r.replace(/[\s,.;:\-]*\u0001[\s,.;:\-]*/g, ' ');
        return r.replace(/\s{2,}/g, ' ').replace(/^[\s,.;:\-\/]+|[\s,.;:\-\/]+$/g, '').trim();
    }

    return { sinTitular };
})();
if (typeof module !== 'undefined') module.exports = TextoTransferencia;
