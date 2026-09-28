# FIRESTORE INTEGRATION & ADR-003 COST GOVERNANCE (RSC)
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.5)**

---

## 1. Presupuesto y Gobernanza ADR-003

- **Listeners Reactivos**: Máximo **2 listeners activos** por sesión (`restaurantSettingsStream`).
- **Caché L1/L2/L3**: Utiliza almacenamiento local en memoria (`cachedSettings`) y SharedPreferences para prevenir lecturas redundantes en Firestore.
