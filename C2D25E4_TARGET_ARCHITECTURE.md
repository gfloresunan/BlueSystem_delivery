# C2D25E.4 — TARGET ARCHITECTURE SPECIFICATION
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Arquitectura Objetivo Multiplataforma

```text
                        BLUE SYSTEM PLATFORM
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
          TENANT               BRAND             SUBSCRIPTION
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                           APP CONFIG
                                 │
                             GATEKEEPER
                                 │
                          BLUE SYSTEM CORE
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
         Android              Flutter               Web
         Native            Client Layer           Portals
      (Reference)                │
            │              ┌─────┴─────┐
            │              │           │
            │           Android       iOS
            │              │           │
            └──────────────┼───────────┘
                           │
                 SAME BUSINESS BACKEND
            (ONE SOURCE OF TRUTH FIRESTORE)
```

---

### 2. Principios Rectores de la Arquitectura Objetivo

1. **One Database / One Backend:** Todos los clientes móviles y portales web comparten el mismo backend de Firebase, las mismas Cloud Functions y la misma base de datos Firestore.
2. **Preservación del Reference Client:** La aplicación Android nativa actual (Kotlin/Compose) se mantiene como el cliente de referencia operativo en constante evolución dentro de **Track A**.
3. **Desarrollo Flutter Multiplataforma para Nuevos Productos:** Flutter se utilizará para desarrollar aplicaciones comerciales para Android e iOS, consumiendo el Core común sin duplicar la lógica de negocio.
4. **Cero Migración Forzada:** No se reescribirá la aplicación Android nativa a Flutter; coexistirán como clientes complementarios de la misma plataforma.
