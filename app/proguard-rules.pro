# ─── Configuración ProGuard / R8 para BlueSystem Delivery ─────────────────────
#
# Reglas generales del proyecto. Las reglas de dependencias externas
# son manejadas automáticamente por sus respectivos .pro de consumidor.
#
# Referencia: https://developer.android.com/guide/developing/tools/proguard.html

# Preservar información de línea para stack traces de producción
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ─── EIAM — Identity & Access Management Module ───────────────────────────────
#
# Los modelos de dominio EIAM son deserializados por Firestore mediante reflexión
# (DocumentSnapshot.toObject). R8/ProGuard NO debe eliminar ni renombrar sus
# campos o constructores. Aunque @Keep está presente en cada clase, las reglas
# explícitas aquí sirven como segunda línea de defensa.

# Modelos de dominio (Firestore toObject reflection)
-keep class com.example.eiam.domain.model.** { *; }

# Claims — accedidos por reflexión en CustomClaimsEngine
-keep class com.example.eiam.security.claims.EiamClaims { *; }
-keep class com.example.eiam.security.claims.** { *; }

# SDK — punto de entrada de terceros y otros módulos BlueSystem
-keep class com.example.eiam.sdk.EiamSdk { *; }
-keep class com.example.eiam.sdk.** { *; }

# Engines — pueden ser accedidos por nombre en tests de integración
-keep class com.example.eiam.domain.engine.** { *; }

# Repositorios (interfaces)
-keep interface com.example.eiam.domain.repository.** { *; }

# Preservar enums EIAM (EiamRole, EiamAction, AccountStatus, etc.)
-keepclassmembers enum com.example.eiam.** {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ─── Firebase Firestore ────────────────────────────────────────────────────────
# Las clases anotadas con @Keep son preservadas automáticamente.
# Esta regla protege cualquier clase que implemente serialización Firestore
# sin anotación explícita (por si se añaden modelos en el futuro).
-keepclassmembers class * {
    @com.google.firebase.firestore.PropertyName <fields>;
}

# ─── Firebase Auth ─────────────────────────────────────────────────────────────
-keep class com.google.firebase.auth.** { *; }

# ─── Kotlin Coroutines ─────────────────────────────────────────────────────────
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# ─── Kotlin Serialization (si se usa en el futuro) ────────────────────────────
-keepattributes *Annotation*
-keepattributes Signature

# ─── WebView (si aplica) ───────────────────────────────────────────────────────
# -keepclassmembers class fqcn.of.javascript.interface.for.webview {
#    public *;
# }
