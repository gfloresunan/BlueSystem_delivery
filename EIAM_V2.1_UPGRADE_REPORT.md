# Reporte de Implementación: EIAM v2.1 Enterprise Upgrade

## Resumen Ejecutivo

Se ha finalizado la evolución del módulo **Enterprise Identity & Access Management (EIAM)** a su versión **v2.1**, incorporando un conjunto de mejoras arquitectónicas avanzadas para soporte de holdings, evaluación contextual de riesgo de seguridad, invitaciones multicanal y administración modular.

---

## 🏛️ 1. Nivel Superior de Organización (`Organization Engine`)
- **Jerarquía**: `Organization` → `Business` → `Branch`.
- **Casos de Uso**: Holdings empresariales, franquicias y grupos multimarca (ejemplo: *Grupo Tip Top* que posee *Pizza Tip Top* y *Hamburguesas Tip Top*, cada uno con sus respectivas sucursales).
- **Entidades**: `Organization.kt` y `OrganizationEngine.kt`.

---

## 👤 2. Desacoplamiento de Perfil Comerciante (`MerchantProfile`)
- **Aislamiento**: Preferencias de notificaciones, idioma, teléfono y banderas 2FA del comerciante separadas de la identidad central `Identity.kt`.
- **Entidades**: `MerchantProfile.kt`.

---

## 🛡️ 3. Evaluación de Riesgo de Dispositivo (`DeviceRiskEngine`)
- **Métricas de Hardware**: Detección de Root (`isRooted`), Emuladores (`isEmulator`), Modo Desarrollador (`isDeveloperMode`), firma `PlayIntegrity` y cambios de IP.
- **Niveles de Confianza**: Puntuación 0–100 (`TrustLevel.HIGH`, `TrustLevel.MEDIUM`, `TrustLevel.LOW`).
- **Entidades**: `DeviceRiskEngine.kt` y métricas extendidas en `DeviceInfo.kt`.

---

## 🔑 4. Score de Riesgo de Sesión & MFA Dinámico (`SessionRiskScore`)
- **Cálculo de Riesgo**: Puntuación dinámica en `UserSession.kt`.
- **Desafío MFA**: Si el `riskScore` cae por debajo de 50 (dispositivo no confiable o cambio brusco de IP), la sesión exige verificación MFA (`requiresMfa = true`).

---

## ✉️ 5. Invitaciones Multicanal
- **Canales Soportados**: `EMAIL`, `WHATSAPP`, `SMS`, `QR`, `CODE`, `DEEP_LINK` y `TEMPORARY_LINK`.
- **Entidades**: `InvitationChannel` en `Invitation.kt` y `InvitationEngine.kt`.

---

## 📋 6. Auditoría Enriquecida de Eventos de Seguridad
- **Nuevas Acciones Auditables**: `LOG_DEVICE_CHANGED`, `LOG_PASSWORD_CHANGED`, `LOG_PERMISSION_CHANGED`, `LOG_BUSINESS_CHANGED`, `LOG_BRANCH_CHANGED`, `LOG_MFA_ENABLED`, `LOG_SESSION_REVOKED`, `LOG_CLAIM_UPDATED`.
- **Dominio**: `ActionDomain.SECURITY` en `EiamAction.kt`.

---

## 🌐 7. Portal Merchant & Interfaces SDK
- **Portabilidad**: Interfaces de contrato en `Services.kt` y facade `EiamSdk.kt` preparadas para consumo homogéneo por Android, Merchant Web y Admin Web.

---

## 🖥️ 8. Admin Center Modular
- **Submódulos UI**: Navegación modular por pestañas en `EiamAdminCenterScreen.kt`:
  1. Usuarios
  2. Organizaciones & Comercios
  3. Sucursales & Empleados
  4. Roles & Permisos
  5. Sesiones & Dispositivos (Device Risk Scores)
  6. Invitaciones Multicanal
  7. Auditoría de Seguridad

---

## 🔒 9. Reforzamiento de Reglas Firestore
- **Validación de Consistencia**: Reglas en `firestore.rules` que obligan a que en cualquier documento de comercio, sucursal, empleado o producto exista coincidencia exacta entre `request.resource.data.businessId` y `request.auth.token.businessId`.
- **Custom Claims**: `functions/src/index.ts` actualizado para incluir `orgId` en el token JWT.

---

## 🎯 Cumplimiento de Políticas
- **Frozen Core Policy**: 100% de cumplimiento. Ningún motor legado fue modificado.
