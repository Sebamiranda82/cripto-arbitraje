/* ══════════════════════════════════════════════════
   SESION_UI.JS — Pantallas de ingreso: login, registro, alta de empresa
   (con licencia o demo), barra de usuario y cartel del demo.
   Depende de Api (api_cliente.js) y Modal (ui_modal.js). No conoce nada de facturas.
   Sesion.iniciar({ exigir }) :
     exigir=true  → sin sesión válida no se puede usar la app
     exigir=false → la app funciona igual; solo se ofrece "Ingresar"
   Cuando hay sesión lista con empresa, dispara el evento 'sesion-lista'.
══════════════════════════════════════════════════ */
const Sesion = (() => {
    let exigirLogin = false;
    let modal, barra;
    const esc = Modal.esc;

    const CSS = `
    #barra-sesion{display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 16px;font-size:11px;color:#94a3b8;flex-wrap:wrap}
    #barra-sesion button{background:transparent;border:1px solid #2d3748;color:#94a3b8;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer}
    #barra-sesion .demo{background:#3b2f0a;border:1px solid #92400e;color:#fbbf24;border-radius:6px;padding:3px 8px}
    #barra-sesion .demo.bloq{background:#3b1010;border-color:#991b1b;color:#f87171}`;

    function construir() {
        const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
        modal = Modal.crear();
        barra = document.createElement('div'); barra.id = 'barra-sesion';
        document.body.insertBefore(barra, document.body.firstChild);
    }

    const caja = () => modal.caja;
    const abrir = () => modal.abrir();
    const cerrar = () => modal.cerrar();
    const mensaje = (txt, ok) => modal.msg(txt, ok);
    const val = id => (document.getElementById(id)?.value || '').trim();

    /* ── Vistas ── */
    function vistaLogin() {
        caja().innerHTML = `<h3>INGRESAR</h3>
            <label>Correo</label><input id="ses-correo" type="email" autocomplete="username" inputmode="email">
            <label>Contraseña</label><input id="ses-clave" type="password" autocomplete="current-password">
            <div class="msg" id="ses-msg"></div>
            <button class="btn" id="ses-entrar">Ingresar</button>
            <button class="btn sec" id="ses-ir-registro">Crear cuenta nueva</button>
            ${exigirLogin ? '' : '<button class="btn sec" id="ses-cerrar">Cerrar</button>'}`;
        document.getElementById('ses-entrar').onclick = hacerLogin;
        document.getElementById('ses-clave').onkeydown = e => { if (e.key === 'Enter') hacerLogin(); };
        document.getElementById('ses-ir-registro').onclick = vistaRegistro;
        const c = document.getElementById('ses-cerrar'); if (c) c.onclick = cerrar;
        abrir();
    }

    function vistaRegistro() {
        caja().innerHTML = `<h3>CREAR CUENTA</h3>
            <label>Correo</label><input id="ses-correo" type="email" autocomplete="username" inputmode="email">
            <label>Contraseña (mínimo 8, letras y números)</label><input id="ses-clave" type="password" autocomplete="new-password">
            <label>Repetir contraseña</label><input id="ses-clave2" type="password" autocomplete="new-password">
            <div class="msg" id="ses-msg"></div>
            <button class="btn" id="ses-registrar">Crear cuenta</button>
            <button class="btn sec" id="ses-ir-login">Ya tengo cuenta</button>`;
        document.getElementById('ses-registrar').onclick = hacerRegistro;
        document.getElementById('ses-ir-login').onclick = vistaLogin;
        abrir();
    }

    // Usuario logueado sin empresa: licencia (cliente pago) o demo.
    function vistaEmpresa(modo) {
        modo = modo || 'licencia';
        const datosComunes = `
            <label>RUC (13 dígitos)</label><input id="ses-ruc" inputmode="numeric" maxlength="13">
            <label>Razón social</label><input id="ses-razon">
            <label>Nombre comercial (opcional)</label><input id="ses-comercial">
            <label>Dirección matriz</label><input id="ses-dir">`;
        const extra = modo === 'licencia'
            ? `<label>Código de licencia</label><input id="ses-licencia" autocapitalize="characters">`
            : `<label>Tu cédula (10 dígitos)</label><input id="ses-cedula" inputmode="numeric" maxlength="10">
               <div class="nota">Prueba gratis: 30 días o 30 facturas, lo que ocurra primero. Usas tu propio RUC y tu propio certificado de firma.</div>`;
        caja().innerHTML = `<h3>DATOS DE TU EMPRESA</h3>
            <div class="tabs"><button id="ses-t-lic" class="${modo === 'licencia' ? 'on' : ''}">Tengo licencia</button><button id="ses-t-demo" class="${modo === 'demo' ? 'on' : ''}">Probar gratis</button></div>
            ${datosComunes}${extra}
            <div class="msg" id="ses-msg"></div>
            <button class="btn" id="ses-crear-emp">${modo === 'licencia' ? 'Crear empresa' : 'Empezar la prueba'}</button>
            <button class="btn sec" id="ses-salir">Salir</button>`;
        document.getElementById('ses-t-lic').onclick = () => vistaEmpresa('licencia');
        document.getElementById('ses-t-demo').onclick = () => vistaEmpresa('demo');
        document.getElementById('ses-crear-emp').onclick = () => crearEmpresa(modo);
        document.getElementById('ses-salir').onclick = cerrarSesion;
        abrir();
    }

    /* ── Acciones ── */
    async function hacerLogin() {
        mensaje('Ingresando…', true);
        const r = await Api.json('/usuarios/login', 'POST', { correo: val('ses-correo'), clave: document.getElementById('ses-clave').value, equipo: Api.equipoId() }).catch(e => ({ ok: false, error: e.message }));
        if (!r.ok) return mensaje(r.error || 'No se pudo ingresar');
        Api.guardarSesion(r.usuario);
        await continuarConSesion();
    }

    async function hacerRegistro() {
        const clave = document.getElementById('ses-clave').value;
        if (clave !== document.getElementById('ses-clave2').value) return mensaje('Las contraseñas no coinciden.');
        mensaje('Creando cuenta…', true);
        const r = await Api.json('/usuarios/registrar', 'POST', { correo: val('ses-correo'), clave }).catch(e => ({ ok: false, error: e.message }));
        if (!r.ok) return mensaje(r.error || 'No se pudo crear la cuenta');
        // Entra directo con las mismas credenciales
        const l = await Api.json('/usuarios/login', 'POST', { correo: val('ses-correo'), clave, equipo: Api.equipoId() });
        if (!l.ok) return mensaje(l.error || 'Cuenta creada, pero no se pudo ingresar');
        Api.guardarSesion(l.usuario);
        await continuarConSesion();
    }

    async function crearEmpresa(modo) {
        mensaje('Guardando…', true);
        const base = { ruc: val('ses-ruc'), razonSocial: val('ses-razon'), nombreComercial: val('ses-comercial'), dirMatriz: val('ses-dir') };
        const r = modo === 'licencia'
            ? await Api.json('/empresa/crear', 'POST', Object.assign(base, { codigoLicencia: val('ses-licencia') }))
            : await Api.json('/demo/crear', 'POST', Object.assign(base, { cedula: val('ses-cedula') }));
        if (!r.ok) return mensaje(r.error || 'No se pudo crear la empresa');
        // El token es el mismo; solo cambió la empresa del usuario
        const u = Api.usuario(); u.empresa_id = r.empresaId; Api.guardarSesion(Object.assign({ token: Api.token() }, u));
        await continuarConSesion();
    }

    async function cerrarSesion() {
        try { await Api.json('/usuarios/logout', 'POST', {}); } catch (e) {}
        Api.limpiarSesion();
        pintarBarra(null);
        if (exigirLogin) vistaLogin(); else cerrar();
        window.dispatchEvent(new CustomEvent('sesion-cerrada'));
    }

    /* ── Estado ── */
    async function pintarBarra(estadoDemo) {
        const u = Api.usuario();
        if (!u) { barra.innerHTML = '<button id="ses-abrir">Ingresar</button>'; document.getElementById('ses-abrir').onclick = vistaLogin; return; }
        let demo = '';
        if (estadoDemo && estadoDemo.esDemo) {
            demo = estadoDemo.bloqueado
                ? `<span class="demo bloq">Demo terminado: ${esc(estadoDemo.motivo)}</span>`
                : `<span class="demo">Demo: ${estadoDemo.diasRestantes} días · ${estadoDemo.facturasRestantes} facturas</span>`;
        }
        barra.innerHTML = `${demo}<span>${esc(u.correo)}</span><button id="ses-salir-barra">Salir</button>`;
        document.getElementById('ses-salir-barra').onclick = cerrarSesion;
    }

    // Con token guardado: pide la empresa; decide qué pantalla toca.
    async function continuarConSesion() {
        if (!Api.token()) { pintarBarra(null); return exigirLogin ? vistaLogin() : undefined; }
        const e = await Api.json('/empresa', 'GET').catch(() => ({ ok: false }));
        if (e._status === 403 && e.sinEmpresa) { pintarBarra(null); return vistaEmpresa('licencia'); }
        if (e._status === 401) { pintarBarra(null); return vistaLogin(); }
        if (!e.ok) { mensaje(e.error || 'No se pudo leer la empresa'); return; }
        cerrar();
        const d = await Api.json('/demo/estado', 'GET').catch(() => null);
        await pintarBarra(d && d.ok ? d : null);
        window.dispatchEvent(new CustomEvent('sesion-lista', { detail: { empresa: e.data, demo: d && d.ok ? d : null } }));
    }

    function iniciar(opciones) {
        exigirLogin = !!(opciones && opciones.exigir);
        construir();
        window.addEventListener('sesion-expirada', () => { pintarBarra(null); vistaLogin(); });
        if (Api.token()) return continuarConSesion();
        pintarBarra(null);
        if (exigirLogin) vistaLogin();
    }

    return { iniciar, mostrarLogin: vistaLogin, cerrarSesion };
})();
