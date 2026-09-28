# Feature Flag Engine Specification & Guide

`FeatureFlagEngine` permite la activación dinámicas de banderas, experimentos y desplegados graduales.

## Ámbitos Soportados
- `GLOBAL`
- `TENANT`
- `SEGMENT`
- `ROLLOUT` (Hashing consistente por `userId`)
- `DEVICE`
- `USER`

## Garantía de Rendimiento
- Evaluación $<1\text{ms}$ utilizando caché L1 en memoria.
- Soporte para Kill Switch inmediato.
