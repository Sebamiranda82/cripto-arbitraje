---
name: arbitraje-sri-facturacion
description: Reglas inviolables para integrar facturación electrónica SRI Ecuador en la app Arbitraje Cripto, reutilizando el servidor cfb-servidor.onrender.com que ya funciona en producción para Centro Ferretero Bacilio. Usar esta skill SIEMPRE que se trabaje en facturación SRI dentro del proyecto cripto-arbitraje.
---

# Facturación SRI — Arbitraje Cripto (reutiliza servidor CFB)

## 🔒 REGLA INVIOLABLE — NO SE MODIFICARÁ BAJO NINGÚN MOTIVO

El servidor `cfb-servidor.onrender.com` (`server.js`, `firma_sri.js`) y el endpoint
`/firmar-enviar` **YA FUNCIONAN** y autorizan facturas reales ante el SRI Ecuador,
después de meses de trabajo.

**ESTÁ PROHIBIDO**, sin excepción:
- Modificar `server.js` o `firma_sri.js` del repo `cfb-servidor`.
- Modificar el certificado, la lógica de firma, el digest, o la estructura del XML base
  que ya está verificada y funcionando.
- Tocar ese repositorio desde el chat/proyecto de Arbitraje, aunque parezca que "ayudaría"
  a resolver un problema.

Si en algún momento parece necesario cambiar algo del proceso de facturación para
adaptarlo a Arbitraje, la única acción permitida es trabajar sobre una **copia nueva y
separada** — nunca tocar el original que ya está autorizado y en producción.

Cualquier sugerencia de "arreglar" o "mejorar" el firmado, el digest, la estructura del
XML base, o el servidor existente debe **descartarse de entrada**: ya está resuelto, no
se toca. Si el SRI rechaza un envío desde Arbitraje, el problema está del lado del XML
que genera Arbitraje (datos, formato, campos) — no del servidor ni de la firma.

## Lo único permitido

Que la app Arbitraje arme el JSON con los datos de cliente y productos, y llame
directamente al servidor existente usando `POST /firmar-enviar`, exactamente igual que
hace el frontend de CFB, sin modificar nada del lado del servidor.

```
POST https://cfb-servidor.onrender.com/firmar-enviar
Body JSON: { "xml": "<factura>...</factura>", "claveAcceso": "..." }
```

## Estructura exacta del XML (verificada y funcionando con el SRI)

```xml
<?xml version="1.0" encoding="UTF-8"?><factura id="comprobante" version="1.1.0">
    <infoTributaria>
        <ambiente>2</ambiente>
        <tipoEmision>1</tipoEmision>
        <razonSocial>MIRANDA ANDRES SEBASTIAN</razonSocial>
        <nombreComercial>MIRANDA ANDRES SEBASTIAN</nombreComercial>
        <ruc>0967482498001</ruc>
        <claveAcceso>[clave de 49 dígitos generada según algoritmo SRI]</claveAcceso>
        <codDoc>01</codDoc>
        <estab>001</estab>
        <ptoEmi>002</ptoEmi>
        <secuencial>[secuencial de 9 dígitos]</secuencial>
        <dirMatriz>CAPITAN NAJERA 4607</dirMatriz>
        <contribuyenteRimpe>CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE</contribuyenteRimpe>
    </infoTributaria>
    <infoFactura>
        <fechaEmision>[DD/MM/YYYY]</fechaEmision>
        <dirEstablecimiento>CAPITAN NAJERA 4607</dirEstablecimiento>
        <obligadoContabilidad>NO</obligadoContabilidad>
        <tipoIdentificacionComprador>[según cliente de Arbitraje]</tipoIdentificacionComprador>
        <razonSocialComprador>[cliente de Arbitraje]</razonSocialComprador>
        <identificacionComprador>[cédula/ruc cliente de Arbitraje]</identificacionComprador>
        <totalSinImpuestos>X.XX</totalSinImpuestos>
        <totalDescuento>0.00</totalDescuento>
        <totalConImpuestos>
            <totalImpuesto>
                <codigo>2</codigo>
                <codigoPorcentaje>0</codigoPorcentaje>
                <baseImponible>X.XX</baseImponible>
                <valor>0.00</valor>
            </totalImpuesto>
        </totalConImpuestos>
        <propina>0</propina>
        <importeTotal>X.XX</importeTotal>
        <moneda>DOLAR</moneda>
        <pagos>
            <pago>
                <formaPago>01</formaPago>
                <total>X.XX</total>
            </pago>
        </pagos>
    </infoFactura>
    <detalles>
        <detalle>
            <codigoPrincipal>[código producto Arbitraje]</codigoPrincipal>
            <descripcion>[producto Arbitraje]</descripcion>
            <cantidad>X.000000</cantidad>
            <precioUnitario>X.000000</precioUnitario>
            <descuento>0.00</descuento>
            <precioTotalSinImpuesto>X.XX</precioTotalSinImpuesto>
            <impuestos>
                <impuesto>
                    <codigo>2</codigo>
                    <codigoPorcentaje>0</codigoPorcentaje>
                    <tarifa>0.00</tarifa>
                    <baseImponible>X.XX</baseImponible>
                    <valor>0.00</valor>
                </impuesto>
            </impuestos>
        </detalle>
        <!-- repetir por cada producto -->
    </detalles>
    <infoAdicional>
        <campoAdicional nombre="Referencia">[referencia Arbitraje]</campoAdicional>
    </infoAdicional>
</factura>
```

## Reglas críticas ya verificadas funcionando — NO CAMBIARLAS

- `version="1.1.0"` (NO `"2.1.0"`).
- `<contribuyenteRimpe>CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE</contribuyenteRimpe>`
  en `infoTributaria` — NO usar `<regimenMicroempresa>` ni `<regimenMicroempresas>` en
  `infoFactura`.
- El digest/firma se calcula con encoding UTF-8 **del lado del servidor** (ya está
  arreglado ahí, NO TOCAR).
- Enviar el XML **como texto plano** en el campo `"xml"` del JSON — NUNCA en base64
  (el campo `"xmlB64"` no existe; fue un bug ya corregido en el pasado).
- El servidor de Render duerme tras inactividad: antes de enviar, hacer `GET` a
  `https://cfb-servidor.onrender.com/health` y esperar respuesta antes del `POST` a
  `/firmar-enviar`.
- Timeout del fetch: usar al menos **120 segundos** por si el servidor está
  despertando.

## Datos fijos del emisor (RUC 0967482498001)

| Campo | Valor |
|---|---|
| razonSocial / nombreComercial | `MIRANDA ANDRES SEBASTIAN` |
| ruc | `0967482498001` |
| dirMatriz / dirEstablecimiento | `CAPITAN NAJERA 4607` |
| obligadoContabilidad | `NO` |
| ambiente | `2` (Producción) |
| estab | `001` |
| ptoEmi | `002` |
| codDoc | `01` (Factura) |

## Checklist antes de cualquier cambio en facturación de Arbitraje

1. ¿Estoy a punto de editar `server.js` o `firma_sri.js` del repo `cfb-servidor`? →
   **DETENERME**. No está permitido.
2. ¿El SRI devolvió un error? → El problema está en el XML que genera Arbitraje
   (campos, orden, valores), nunca en el servidor ni en la firma.
3. ¿Necesito un cambio en el servidor? → Crear una copia/branch separado, jamás tocar
   el original en producción.
4. Antes de enviar: `GET /health` con timeout largo, luego `POST /firmar-enviar` con
   `{ xml, claveAcceso }` en texto plano, timeout ≥120s.
