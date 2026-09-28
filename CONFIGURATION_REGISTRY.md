# Configuration Registry Specification & Guide

`ConfigurationRegistry` representa el único punto de entrada para configuraciones de plataforma y parámetros del sistema.

## Características
- **Soporte para 8 tipos de datos:** String, Boolean, Integer, Double, JSON, Duration, Percentage, Currency.
- **Ambientes:** DEV, QA, STAGING, PRODUCTION.
- **Seguridad:** Firma por checksum SHA-256 e inmutabilidad por versión.

## Ejemplo de Uso
```kotlin
val registry = ConfigurationRegistryImpl()
val apiUrl = registry.getString("api_url", Environment.PRODUCTION, fallback = "https://api.bluesystem.com")
```
