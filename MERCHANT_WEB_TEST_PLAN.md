# MERCHANT_WEB_TEST_PLAN.md
## Plan de Pruebas y Certificación

1. **Unit Tests**: Pruebas de utilidades, formateadores de moneda, lógica de cálculo de SLA y reglas de permisos.
2. **Integration Tests**: Integración entre componentes visuales y los servicios de Firestore/EIAM.
3. **Multi-Tenant Isolation Tests**: Verificación de rechazo de escrituras o lecturas sin el `businessId` correspondiente.
4. **Responsive Desktop Tests**: Validación en resoluciones 1366x768, 1920x1080, 2560x1440 y Galaxy Z Fold desplegado.
