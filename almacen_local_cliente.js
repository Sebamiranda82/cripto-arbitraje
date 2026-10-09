/* ══════════════════════════════════════════════════
   ALMACEN_LOCAL_CLIENTE.JS — Guardar datos en este navegador de forma segura, para que sigan ahí aunque la
   persona cambie de pestaña, de aplicación o recargue la página.

   - Cada dato tiene un nombre y un "alcance" (p. ej. la empresa de la sesión), así una empresa nunca ve lo de otra.
   - Si el navegador no deja guardar (modo privado, sin espacio), nunca rompe la pantalla: guarda en memoria
     para esta visita y avisa con `false`.
   - `pedirPersistencia()` le pide al navegador que no borre estos datos cuando le falte espacio.
   No sabe qué se guarda: es una pieza para cualquier dato. Sin dependencias.
══════════════════════════════════════════════════ */
const AlmacenLocal = (() => {
    const PREFIJO = 'srifactu:';
    const memoria = new Map();      // respaldo si localStorage no está disponible

    function crear(nombre, { alcance = () => 'local', version = 1 } = {}) {
        const clave = () => `${PREFIJO}${nombre}:${alcance()}`;
        return {
            // true si quedó guardado en el navegador; false si solo quedó en memoria (se pierde al recargar)
            guardar(valor) {
                const reg = JSON.stringify({ v: version, guardadoEn: new Date().toISOString(), valor });
                memoria.set(clave(), reg);
                try { localStorage.setItem(clave(), reg); return true; } catch (e) { return false; }
            },
            // { valor, guardadoEn } o null (no hay nada, o está dañado / de otra versión)
            leer() {
                let txt = null;
                try { txt = localStorage.getItem(clave()); } catch (e) { /* sin acceso */ }
                if (txt == null) txt = memoria.get(clave()) || null;
                if (!txt) return null;
                try { const r = JSON.parse(txt); return r && r.v === version && 'valor' in r ? r : null; } catch (e) { return null; }
            },
            borrar() { memoria.delete(clave()); try { localStorage.removeItem(clave()); } catch (e) { /* nada */ } },
        };
    }

    function pedirPersistencia() {
        try { return navigator.storage && navigator.storage.persist ? navigator.storage.persist() : Promise.resolve(false); }
        catch (e) { return Promise.resolve(false); }
    }

    return { crear, pedirPersistencia };
})();
