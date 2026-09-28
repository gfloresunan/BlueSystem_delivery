# FLEET MAP ENGINE SPECIFICATION (DCT)
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Especificación del Mapa Operacional de Flota

El `FleetMapEngine` gestiona la visualización simultánea de:

- 📍 **Restaurante**: Coordenadas de la sucursal activa.
- 📍 **Clientes**: Puntos de entrega de los pedidos activos.
- 🛵 **Motorizados**: Posición en vivo, estado (`Disponible`, `Asignado`, `Recogiendo`, `En ruta`, `Pausado`, `Desconectado`), velocidad, nivel de batería y calificación.
- 📍 **Rutas y ETA**: Trayectoria entre restaurante y cliente con ETA estimado.
