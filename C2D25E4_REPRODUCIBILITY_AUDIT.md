# C2D25E.4 — BUILD REPRODUCIBILITY & TOOLCHAIN AUDIT
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Requisitos para Compilaciones Multiplataforma Reproducibles

La auditoría documenta los requisitos futuros para que los clientes Flutter Android e iOS puedan compilarse de manera determinista y reproducible:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                   TOOLCHAIN & REPRODUCIBILITY MATRIX                        │
├─────────────────────┬───────────────────────────────┬───────────────────────┤
│ Plataforma Target   │ Toolchain Requerido           │ Entorno de Build      │
├─────────────────────┼───────────────────────────────┼───────────────────────┤
│ Android Nativo      │ JDK 17, Android SDK 36, Gradle│ Local / Linux CI      │
│ Flutter Android     │ Flutter SDK 3.x, Dart 3.x, JDK│ Local / Linux CI      │
│ Flutter iOS         │ Flutter SDK 3.x, Xcode 15+, Mac│ macOS Runner CI       │
│ Web Portals         │ Node.js 20+, npm 10+, Vite    │ Local / Linux CI      │
└─────────────────────┴───────────────────────────────┴───────────────────────┘
```

---

### 2. Estándar de Integridad Criptográfica

1. **Hashes SHA-256:** Todo artefacto generado (APK, AAB, IPA o ZIP Web) debe registrar su checksum SHA-256 en `/build_requests/{requestId}` antes de su distribución.
2. **Version Pinning:** En fases de implementación, las versiones de los paquetes (`pubspec.yaml`, `package.json`, Gradle plugins) deben fijarse explícitamente sin rangos dinámicos (`^` o `~`).

---

### 3. Veredicto

```text
══════════════════════════════════════════════════════════════
REPRODUCIBILITY VERDICT:
🟢 REQUIREMENTS CLEARLY SPECIFIED (READY FOR FUTURE TOOLCHAIN INTEGRATION)
══════════════════════════════════════════════════════════════
```
