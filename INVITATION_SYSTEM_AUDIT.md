# INVITATION_SYSTEM_AUDIT.md
# Auditoría del Sistema de Invitaciones — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Extraído del código fuente. Sin suposiciones.
> **Resultado**: El sistema de invitaciones **NO EXISTE** en el código fuente actual.

---

## 1. Búsqueda Realizada

Se realizaron búsquedas en todo el código fuente (`app/src/main/java`) con los siguientes términos:

| Término de Búsqueda | Resultados |
|---|---|
| `invitacion` | 0 resultados |
| `invitation` | 0 resultados |
| `inviteCode` | 0 resultados |
| `invite_code` | 0 resultados |
| `collection("invitations")` | 0 resultados |
| `collection("employees")` | 0 resultados |
| `collection("staff")` | 0 resultados |

**Conclusión: No existe ningún sistema de invitaciones en el código actual.**

---

## 2. ¿Cómo se Crea un Empleado Nuevo Actualmente?

### Proceso Real (Extraído del Código)

El proceso actual para que un empleado acceda al sistema es:

```
1. El empleado se registra por su cuenta en la app
   ↓
   AuthManager.registrarUsuario(
     email, contraseña, nombre, teléfono,
     userType = "customer"  ← todos empiezan como cliente
   )

2. El empleado solicita cambio de rol (opcional)
   ↓
   FirebaseManager.solicitarCambioRol(userId, "business" | "courier")
   → Escribe requestedRole en /users/{uid}

3. El administrador aprueba la solicitud
   ↓
   AdminUsersViewModel.updateUserRole(userId, newRole)
   → FirebaseManager.updateUserRole()
   → Actualiza role, rol en /users/{uid}
   → Registra en /users/{uid}/role_history/

4. El usuario reinicia sesión → Splash redirecciona al módulo correcto
```

---

## 3. Análisis por Pregunta

### ¿Desde la app?
**Parcialmente.** El empleado puede registrarse desde la app, pero no puede ser invitado. El admin solo puede cambiar roles, no crear cuentas por encargo.

### ¿Desde Web?
**No existe Portal Web actualmente.** Sprint 16 está pendiente.

### ¿Existe sistema de invitación?
**❌ No.** No existe ningún flujo de invitación (link, token, email de invitación, QR, código de acceso).

### ¿Existe aceptación de invitación?
**❌ No.** Sin invitación, no hay flujo de aceptación.

### ¿Se crea manualmente?
**Sí, parcialmente.** El admin puede cambiar el rol de cualquier usuario registrado desde `AdminUsersScreen`. Pero el usuario debe haberse registrado previamente por su cuenta.

### ¿Se comparte usuario?
**❌ No está implementado pero es posible que suceda.** No existe control que impida que múltiples personas compartan credenciales. No hay detección de sesiones concurrentes.

---

## 4. Flujo de Solicitud de Rol (Único Mecanismo Existente)

**Archivo**: `FirebaseManager.kt:669-687`

```kotlin
suspend fun solicitarCambioRol(userId: String, requestedRole: String?): Boolean {
    val validRoles = listOf("business", "courier", null)
    // Solo permite solicitar "business" o "courier"
    db.collection("users").document(userId).update(
        mapOf("requestedRole" to (requestedRole ?: ""))
    )
}
```

```kotlin
// Admin aprueba:
suspend fun updateUserRole(userId, newRole, changedByAdminId, reason, previousRole): Boolean {
    userRef.update(mapOf(
        "role" to newRole,
        "rol" to newRole,
        "requestedRole" to ""
    ))
    userRef.collection("role_history").add(auditLog)
}

// Admin rechaza:
suspend fun rejectUserRoleRequest(userId, changedByAdminId): Boolean {
    userRef.update(mapOf("requestedRole" to ""))
    userRef.collection("role_history").add(auditLog)
}
```

---

## 5. Limitaciones Críticas del Sistema Actual

| Limitación | Descripción |
|---|---|
| Sin onboarding de empleados | No hay forma de invitar a un cajero, cocinero o supervisor al sistema |
| Sin vinculación comercio-empleado | Un empleado no puede ser "del restaurante X" |
| Sin roles granulares en registro | Todos los usuarios empiezan como `customer` |
| Sin email de bienvenida | No existe envío de credenciales ni enlace de configuración |
| Sin link de invitación | No existe URL/token/QR de invitación |
| Sin expiración de invitación | N/A (no existe sistema) |
| Sin revocación de acceso | No existe mecanismo de desactivación de cuenta |
| Sin límite de solicitudes | Un usuario puede solicitar cambio de rol ilimitadas veces |
