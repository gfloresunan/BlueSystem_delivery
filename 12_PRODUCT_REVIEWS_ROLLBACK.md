# 12. Plan de Reversión y Rescate (Rollback Protocol)

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Objetivo:** Proporcionar instrucciones precisas para revertir los cambios en caso de cualquier eventualidad imprevista.  

---

## 1. Comandos Git de Reversión

Para regresar exactamente al commit previo a las modificaciones del catálogo de productos y reseñas:

```bash
# Revertir los cambios en los 4 archivos de producción modificados
git checkout HEAD -- app/src/main/java/com/example/data/repository/ProductRepository.kt
git checkout HEAD -- app/src/main/java/com/example/ComercioDetalleViewModel.kt
git checkout HEAD -- app/src/main/java/com/example/FirebaseManager.kt
git checkout HEAD -- app/src/main/java/com/example/Models.kt

# Recompilar APK limpia en el estado previo
./gradlew clean assembleDebug
```

---

## 2. Garantía sobre la Base de Datos

Dado que **ningún documento, producto o comercio fue creado, modificado o eliminado en Firestore**, el procedimiento de rollback de código no requiere realizar ninguna restauración de base de datos. Los datos de producción se mantuvieron 100% intactos e inalterados durante toda la fase.
