/* ══════════════════════════════════════════════════
   EXCEL_UTILS.JS — Lectura de Excel por NOMBRE de columna (compartido).
   Requiere la librería XLSX (SheetJS) cargada antes.
══════════════════════════════════════════════════ */

// Quita acentos y pasa a minúscula: "Fecha" = "fecha" = "FECHA".
function normalizarEncabezado(s) {
    return String(s || '').trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Lee la primera hoja de un File y devuelve filas (arreglo de arreglos).
function leerFilasExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.onload = e => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
                resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }));
            } catch (err) { reject(new Error('El archivo no es un Excel válido')); }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Índice de la primera columna cuyo encabezado empieza con alguno de los nombres. -1 si no existe.
function indiceColumna(encabezados, nombres) {
    return encabezados.findIndex(h => nombres.some(n => h.startsWith(n)));
}
