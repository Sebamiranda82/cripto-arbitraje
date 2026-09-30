
## Scraper — eliminado por completo (29/09, madrugada)
- Ruta POST /arbitraje/reporte-facturas borrada de rutas_sri_router.js (commit df22665).
- Servicio srifactu-scraper borrado de Railway.
- Repositorio srifactu-scraper borrado de GitHub.
- Backups locales conservados en ~/srifactu-scraper (fuera de git, por si hace falta consultar el código viejo): server_BACKUP_FINAL_*.js, package_BACKUP_FINAL_*.json, rutas_sri_router_BACKUP_FINAL_*.js en ~/srifactu.
- Conciliación de facturas viejas (anteriores a la migración a MySQL) queda pendiente por método MANUAL: consultar el portal del SRI día por día.
- Confirmado que srifactu y facturador_sri.html siguen funcionando: GET /facturas-historial responde bien, factura nueva 001-002-000000406 ya quedó guardada con numero_autorizacion real, confirmando el flujo completo end-to-end.
