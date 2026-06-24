# Arbitraje Cripto — ANUAR PROYECTOS

Calculadora y registro de operaciones de arbitraje cripto USDT.

## Flujo
USD → USDT (Binance P2P) → ARS (Binance P2P) → USD (cambio manual)

## Features v2.5
- Calculadora 3 pasos con comisión Binance 0.038% (editable)
- Multi-usuario con localStorage (cada usuario lleva su propio registro)
- Historial persistente ordenado por fecha
- Exportación Excel acumulativa por usuario
- Generador XML Factura Electrónica SRI (RIMPE Negocio Popular, IVA 0%)
- Envío al SRI vía servidor CFB existente
- Cotización dólar blue en tiempo real
- Fecha editable para cargar operaciones pasadas

## Uso
Abrir `cripto_arbitraje.html` directamente en el navegador. No requiere servidor.

## Stack
HTML + CSS + JS vanilla · Tailwind CSS · SheetJS

