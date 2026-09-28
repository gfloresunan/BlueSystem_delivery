# RESTAURANT SETTINGS TEST PLAN
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.5)**

---

## 1. Suite de Pruebas Unitarias (10 Clases)

Ubicación: `app/src/test/java/com/example/settings/`

1. `RestaurantSettingsViewModelTest.kt`: Selección de categoría y flujo del Setup Wizard.
2. `RestaurantSettingsEngineTest.kt`: Validación, checksum SHA-256 e incremento de versión.
3. `BranchManagementTest.kt`: Creación y parámetros de sucursales.
4. `ScheduleEngineTest.kt`: Configuración de horarios por turnos.
5. `NotificationSettingsTest.kt`: Canales de notificación activa.
6. `BrandingSettingsTest.kt`: Identidad y colores de marca.
7. `PermissionEngineTest.kt`: Validación de permisos por rol.
8. `FirestoreSettingsRepositoryTest.kt`: Inicialización JVM safe del repositorio.
9. `OfflineSettingsSyncTest.kt`: Sincronización offline de cola de cambios.
10. `PerformanceBudgetSettingsTest.kt`: Carga inicial < 500 ms.
