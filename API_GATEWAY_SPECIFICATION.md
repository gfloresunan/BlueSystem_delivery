# API Gateway Engine Specification

`ApiGatewayEngine` actúa como la puerta de acceso y ruteador unificado de tráfico entrante hacia la plataforma.

## Protocolos Atendidos
- **REST**
- **GraphQL**
- **Webhooks**
- **Internal APIs**
- **Public APIs**

## Funcionalidades de Seguridad y Resiliencia
- **Rate Limiting:** Control de solicitudes por minuto por IP/Cliente.
- **Circuit Breaker:** Protección de fallback ante fallas o degradación de servicios downstream.
- **Token Authorization:** Verificación de encabezados de autorización JWT.
