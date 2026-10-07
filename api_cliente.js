/* ══════════════════════════════════════════════════
   API_CLIENTE.JS — Única puerta de salida hacia el servidor.
   Toda llamada al servidor pasa por Api.fetch(): agrega el token de sesión
   y, si el servidor responde 401 con una sesión que ya no sirve, la limpia
   y avisa con el evento 'sesion-expirada'. Ningún otro archivo toca
   localStorage para la sesión ni arma el header del token.
══════════════════════════════════════════════════ */
const Api = (() => {
    const LS_TOKEN = 'sri_token', LS_USUARIO = 'sri_usuario', LS_EQUIPO = 'sri_equipo';
    const HEADER_TOKEN = 'x-cfb-token';
    let baseUrl = '';

    const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    const borrar = k => { try { localStorage.removeItem(k); } catch (e) {} };

    function equipoId() {
        let id = leer(LS_EQUIPO);
        if (!id) {
            id = 'eq-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            guardar(LS_EQUIPO, id);
        }
        return id;
    }

    function init(url) { baseUrl = url.replace(/\/$/, ''); }
    const token = () => leer(LS_TOKEN);
    const usuario = () => { try { return JSON.parse(leer(LS_USUARIO) || 'null'); } catch (e) { return null; } };

    function guardarSesion(u) {
        guardar(LS_TOKEN, u.token);
        guardar(LS_USUARIO, JSON.stringify({ id: u.id, correo: u.correo, nombre: u.nombre, rol: u.rol, empresa_id: u.empresa_id }));
    }
    function limpiarSesion() { borrar(LS_TOKEN); borrar(LS_USUARIO); }

    // Igual que fetch(), pero con URL relativa al servidor y el token incluido.
    async function llamar(path, opts = {}) {
        const headers = Object.assign({}, opts.headers || {});
        const t = token();
        if (t) headers[HEADER_TOKEN] = t;
        const resp = await fetch(baseUrl + path, Object.assign({}, opts, { headers }));
        if (resp.status === 401 && t) {
            limpiarSesion();
            window.dispatchEvent(new CustomEvent('sesion-expirada'));
        }
        return resp;
    }

    // Atajo para POST/PUT con JSON. Devuelve el JSON ya leído.
    async function json(path, metodo, cuerpo) {
        const resp = await llamar(path, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
        });
        let data;
        try { data = await resp.json(); } catch (e) { data = { ok: false, error: 'Respuesta inválida del servidor (' + resp.status + ')' }; }
        data._status = resp.status;
        return data;
    }

    return { init, fetch: llamar, json, token, usuario, guardarSesion, limpiarSesion, equipoId, get baseUrl() { return baseUrl; } };
})();
