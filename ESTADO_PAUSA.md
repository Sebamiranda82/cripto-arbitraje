
## Scraper — eliminado por completo (29/09, madrugada)
- Ruta POST /arbitraje/reporte-facturas borrada de rutas_sri_router.js (commit df22665).
- Servicio srifactu-scraper borrado de Railway.
- Repositorio srifactu-scraper borrado de GitHub.
- Backups locales conservados en ~/srifactu-scraper (fuera de git, por si hace falta consultar el código viejo): server_BACKUP_FINAL_*.js, package_BACKUP_FINAL_*.json, rutas_sri_router_BACKUP_FINAL_*.js en ~/srifactu.
- Conciliación de facturas viejas (anteriores a la migración a MySQL) queda pendiente por método MANUAL: consultar el portal del SRI día por día.
- Confirmado que srifactu y facturador_sri.html siguen funcionando: GET /facturas-historial responde bien, factura nueva 001-002-000000406 ya quedó guardada con numero_autorizacion real, confirmando el flujo completo end-to-end.

## Migración CFB -> srifactu centralizado (decisión 06/10)
- Objetivo: srifactu es el único facturador y todas las apps lo llaman. CFB se retira solo cuando todo esté 100% probado y lo decida el usuario.
- Idénticos en CFB y srifactu (no hay que copiar): server_facturas, notas_credito, notas_debito, guia_remision, retencion, reconsultar_sri.
- NO pisar nada de srifactu: rutas_sri_router.js (cola de autorización, secuencial único, borradores, facturas_historial) y server_sri_consulta.js (timeout 90s).
- Falta traer de CFB: login + multiempresa (login_modulo.js, tabla usuarios, resolverEmpresaId, CORS por dominios) y cifrado de certificados (cifrar/descifrar de server_utils.js, con CERT_ENCRYPTION_KEY cargada solo en Railway, nunca por el chat).
- Falta en facturador_sri.html: botones de Nota de Crédito y demás documentos.
- Hoy las rutas migradas devuelven 401 "Sesion invalida" porque falta resolverEmpresaId.
- La app la usarán varias personas: hay que generalizar lo que hoy está fijo para una sola empresa (RUC y razón social en /arbitraje/factura, empresa_id 'facturador_sri' en facturas_historial y facturas_borrador, secuencial, certificado por empresa, EMISOR en el HTML).
- RUC proveedor del sistema (Res. NAC-DGERCGC26-00000027): a confirmar con el contador si debe seguir siendo 0967482498001 para todas las empresas.
- No desplegar mientras se hace un lote grande de facturas: la cola de autorización vive en memoria y un deploy deja facturas en Pendiente. Mejora pendiente: re-encolar las pendientes al arrancar.
- Punto de restauración: tag respaldo-pre-migracion-cfb en el repo srifactu.
- Sin definir: server_compras, server_proveedores, server_registro_cliente, server_demo_leads, server_demo_seguimiento.
