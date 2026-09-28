# FASE F — RESUMEN EJECUTIVO AUDITORÍA DE IDENTIDADES Y USUARIOS

**Sistema:** BlueSystem Enterprise v2.2 / Delivery Platform  
**Firebase Project:** `bluesystem-7c9af`  
**Fecha:** 16 de Agosto, 2026  
**Modo:** SOLO LECTURA (Read-Only Audit)  

---

## 1. Métricas Cuantitativas de Auditoría

```text
GOVERNANCE USERS: 41
ADMIN USERS:      9
INTERSECTION:     9
GOVERNANCE ONLY:  32
ADMIN ONLY:       0
```

---

## 2. Root Cause (Causa Raíz)

```text
ROOT CAUSE:
La diferencia de 41 vs 9 registros se debe al comportamiento de ordenamiento en Firestore:

El Panel Admin Web (`users.js`) ejecuta:
    db.collection('users').orderBy('nombre', 'asc').onSnapshot(...)

En Firestore, la cláusula `orderBy('nombre')` actúa como un FILTRO IMPLÍCITO que excluye 
automáticamente cualquier documento que no tenga la propiedad `nombre` definida.

De los 41 documentos en `/users`:
- 9 tienen el campo `nombre` (visibles en Admin).
- 32 carecen del campo `nombre` (usan `name`, son perfiles incompletos o clientes POS legacy).

Governance Center (`identityService.js`) ejecuta `db.collection('users').get()` sin `orderBy`, 
por lo que obtiene el 100% de los 41 documentos.
```

---

## 3. Recommended Next Step (Siguiente Paso Recomendado)

```text
RECOMMENDED NEXT STEP:
1. Revisar y validar los resultados del presente diagnóstico de la FASE F.
2. Aprobar la creación del plan para la FASE G de implementación y normalización sin alterar datos operativos.
3. En la FASE G:
   - Modificar `users.js` para remover `orderBy('nombre')` de Firestore y ordenar en memoria.
   - Ejecutar un script de migración/normalización de esquemas para copiar `name` a `nombre` en los perfiles legacy.
   - Apuntar Governance Center a la colección `/user_devices` para reflejar correctamente los dispositivos FCM.
```
