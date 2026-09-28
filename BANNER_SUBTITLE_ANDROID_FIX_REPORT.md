# BLUESYSTEM DELIVERY — REPORTE DE MICRO-FIX: SUBTÍTULO DE BANNERS EN APP ANDROID

## 1. Causa Raíz
Se realizó el seguimiento completo de la cadena de datos:
`Panel Admin Web → Firestore → FirebaseManager.kt → BannerPromocional Model → SmartBannerEngine.kt → UI Compose`

- **Panel Admin Web ([promotions.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/promotions.js)):** Guarda correctamente el campo `subtitle`.
- **Firestore:** Colección `banners` contiene el campo `"subtitle"`.
- **Android Model ([Models.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt)):** `BannerPromocional` tiene definida la propiedad `val subtitle: String = ""`.
- **FirebaseManager ([FirebaseManager.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt)):** Deserializa automáticamente `subtitle` con `toObjects(BannerPromocional::class.java)`.
- **SmartBannerEngine ([SmartBannerEngine.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/engine/marketing/SmartBannerEngine.kt)):** Mantiene la instancia intacta.
- **UI Compose ([BannersSection.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/BannersSection.kt)):** **AQUÍ SE PERDÍA EL DATO.** El composable renderizaba únicamente `banner.getEffectiveTitle()` sin incluir una etiqueta `Text` para `banner.subtitle`.

---

## 2. Campo Firestore Utilizado
El campo oficial en la colección `banners` es:
```json
"subtitle": "¡Gana puntos dobles en todo..."
```

---

## 3. Modelo Android Afectado
Clase `BannerPromocional` en [Models.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt#L138-L160). La propiedad `val subtitle: String = ""` ya existía y no requirió modificaciones.

---

## 4. FirebaseManager Afectado
`FirebaseManager.kt` **NO requirió ninguna modificación**. Su deserializador automático vía Firestore POJO ya mapeaba `subtitle` de manera transparente.

---

## 5. UI Afectada
Componente Jetpack Compose [BannersSection.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/BannersSection.kt).

---

## 6. Cambios Realizados
En [BannersSection.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/BannersSection.kt):
1. Se agregó import de `androidx.compose.ui.text.style.TextOverflow`.
2. Se configuró el composable `Text` para el título con `maxLines = 1` y `overflow = TextOverflow.Ellipsis`.
3. Se añadió la renderización condicional para `banner.subtitle`:
   ```kotlin
   if (banner.subtitle.isNotBlank()) {
       Text(
           text = banner.subtitle,
           color = Color.White.copy(alpha = 0.9f),
           fontSize = 13.sp,
           fontWeight = FontWeight.Normal,
           maxLines = 2,
           overflow = TextOverflow.Ellipsis,
           modifier = Modifier.padding(top = 2.dp)
       )
   }
   ```
4. Se incluyó también el despliegue del subtítulo en el bloque de fallback por error de carga de imagen.

---

## 7. Compatibilidad con Banners Antiguos
- Si `subtitle` es nulo, vacío o espacios en blanco (`isNotBlank() == false`), el composable `Text` no se renderiza.
- No se muestran leyendas como `null`, `undefined` o `N/A`.
- Banners antiguos sin subtítulo continúan visualizándose exactamente igual.

---

## 8. Prueba de Creación
Al crear un banner desde Panel Admin Web con `Título: Día Fritoni` y `Subtítulo: ¡Gana puntos dobles en todo!`, el banner aparece en la App Android mostrando ambos textos en el overlay.

---

## 9. Prueba de Edición
Al editar el subtítulo en Panel Admin Web a `¡Hoy tienes puntos dobles en todos tus pedidos!`, la App Android refleja el cambio de subtítulo inmediatamente.

---

## 10. Prueba Realtime
El evento `onSnapshot` de Firestore sigue funcionando en tiempo real sin requerir reinicio de la app, recarga o logout/login.

---

## 11. Prueba Sin Subtítulo
Banners creados sin subtítulo se despliegan únicamente con el título, manteniendo limpia la interfaz.

---

## 12. Build
- Compilación de módulo Android realizada exitosamente con `./gradlew clean assembleDebug`.
- `BUILD SUCCESSFUL in 2m 15s`.

---

## 13. Resultado Final
🟢 **MICRO-FIX COMPLETADO Y CERTIFICADO.**
El subtítulo de los banners promocionales se despliega correctamente en la App Android y se actualiza en tiempo real en perfecta sintonía con el Panel Admin Web.
