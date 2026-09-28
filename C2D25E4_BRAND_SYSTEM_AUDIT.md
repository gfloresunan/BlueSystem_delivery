# C2D25E.4 — BRAND SYSTEM & VISUAL IDENTITY AUDIT
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Auditoría del Sistema de Marca Dinámica

El sistema de marca (`BrandEntity`) separa claramente lo que ocurre en tiempo de compilación (Build-Time) de lo que ocurre en tiempo de ejecución (Runtime):

```mermaid
graph TD
    A[Brand Entity / Firestore /brands/{id}] -->|Build-Time Pipeline| B[tools/brand_asset_resolver.js]
    A -->|Runtime Theme Resolver| C[Theme Hydration Engine]
    B -->|Generated Static Assets| D[Launcher Icons & Splash Assets]
    C -->|Compose ThemeData| E[Android Native Theme]
    C -->|Flutter ThemeData| F[Flutter Material 3 Theme]
    C -->|CSS Variables & Tailwind| G[Web Design System]
```

---

### 2. Estructura Canónica de `BrandVisualConfig`

```typescript
export interface BrandVisualConfig {
  logoUrl: string;        // Cloud Storage URL
  iconUrl: string;        // 1024x1024 master icon
  splashUrl: string;      // Master splash screen
  primaryColor: string;   // HEX (ej. #FF6D00)
  secondaryColor: string; // HEX (ej. #2979FF)
  accentColor: string;    // HEX (ej. #00E676)
  backgroundColor: string;// HEX (ej. #121212)
  textColor: string;      // HEX (ej. #FFFFFF)
  fontFamily?: string;    // 'Outfit' | 'Inter'
}
```

---

### 3. Reutilización Universal

1. **Android Nativo:** `BrandHydrationResolver.kt` convierte los valores HEX en objetos `androidx.compose.ui.graphics.Color`.
2. **Flutter:** Un `BrandThemeResolver.dart` futuro leerá los mismos campos HEX y construirá un `ThemeData(colorScheme: ColorScheme(...))`.
3. **Web:** Las propiedades se inyectan en variables CSS (`:root { --primary-color: #FF6D00; }`).

---

### 4. Veredicto

```text
══════════════════════════════════════════════════════════════
BRAND SYSTEM VERDICT:
🟢 100% UNIVERSAL & RUNTIME/BUILD-TIME DECOUPLED
══════════════════════════════════════════════════════════════
```
