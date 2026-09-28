# C2D26 — BRAND & WHITE LABEL IMPLEMENTATION

**Module:** Dynamic Brand System & Theming  
**Files:** `flutter_client/lib/core/brand/brand_context.dart`, `flutter_client/lib/presentation/theme/brand_theme_builder.dart`  

---

## 1. Architectural Strategy

- **Single Flutter Codebase:** One unified client codebase supporting dynamic run-time white labeling.
- **Brand Hydration:** Loaded at runtime from `/brands/{brandId}` via `BrandEntity` and `BrandVisualConfig`.
- **Material 3 Dynamic Generation:** `BrandThemeBuilder.buildTheme()` maps hex colors (`primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `textColor`) into full `ThemeData`.
- **Safe Fallbacks:** Any invalid hex string falls back to certified defaults (`#0284C7`, `#0F172A`, `Inter` font).
