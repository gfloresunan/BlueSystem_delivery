# RESTAURANT SETTINGS CENTER (RSC) SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.5)**

---

## 1. Visión General de la Plataforma Centralizada de Configuración (RSC)

El **Restaurant Settings Center (RSC)** centraliza los 19 módulos de parámetros operativos y de negocio en una **única pantalla unificada**, eliminando cualquier configuración dispersa en otras partes de la aplicación.

```mermaid
graph TD
    Header[Smart Header con Readiness Score % 🚀] --> Categories[Rejilla de 19 Módulos de Configuración]
    Categories --> Wizard[Restaurant Setup Wizard (8 Pasos) 🌟]
    Categories --> Engine[RestaurantSettingsEngine (SHA-256 / Rollback / Checksum)]
    Categories --> Export[Exportación / Importación JSON 💾]
```

---

## 2. Los 19 Módulos Integrados

1. **Restaurante**: Nombre, razón social, logo, tipo de cocina, moneda, zona horaria.
2. **Sucursales**: Multi-sucursal con GPS, radio de entrega y teléfono.
3. **Horarios**: Editor visual semanal con turnos múltiples y cierres.
4. **Delivery**: Radio máximo, tarifa, envío gratis y pedido mínimo.
5. **Cocina (KDS)**: Estaciones (`GRILL`, `FRYER`, `DRINKS`, `DESSERT`, `ASSEMBLY`), tiempos e impresoras.
6. **Menú**: Stock automático, publicación y destacados.
7. **Pagos**: Efectivo, tarjeta, transferencia, propinas.
8. **Impuestos**: IVA, ISV, exenciones.
9. **Promociones**: Happy Hour, cupones, combos.
10. **Motorizados**: Auto-asignación y sugerencia inteligente.
11. **Personal**: Roles (Propietario, Gerente, Cajero, Supervisor).
12. **Clientes**: Programa VIP y reseñas.
13. **Notificaciones**: Push, WhatsApp, Email, SMS, Telegram.
14. **Seguridad**: Tiempo de sesión, MFA ready, dispositivos autorizados.
15. **Integraciones**: ERP, POS, webhooks.
16. **Branding**: Colores de marca y mensajes.
17. **IA**: Preparatorio para Sprint 17.
18. **Respaldo**: Exportar e importar configuración con checksum.
19. **Información**: Versión del sistema y build.
