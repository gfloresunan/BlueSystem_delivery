# PRODUCT WIZARD OFFLINE & AUTOSAVE SPECIFICATION
**BlueSystem Delivery Enterprise v2.1**

---

## 1. AutoSave & Recuperación de Borrador

- **Timer de AutoSave (15s)**: `ProductWizardViewModel` ejecuta una corrutina background que evalúa el estado del formulario cada 15 segundos. Si el nombre del producto no está vacío, guarda una copia JSON local vía `ProductDraftRepository`.
- **Detección al Abrir**: Al iniciar el Wizard en modo "Nuevo Producto", `checkDraft()` consulta si existe un borrador no guardado.
- **Banner de Recuperación**: Muestra un aviso destacado con opción para "Restaurar" o "Descartar" el borrador.

---

## 2. Resiliencia de Conexión y Firestore Offline

- **Persistencia Firestore Cache**: Si el usuario presiona "Guardar Producto" sin conexión a Internet, Firestore encola la mutación localmente. La UI emite el evento de éxito instantáneo y sincroniza en segundo plano cuando la red se reestablece.
