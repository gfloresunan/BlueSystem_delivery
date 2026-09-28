# SMART COURIER ASSIGNMENT ENGINE SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Algoritmo de Calificación y Sugerencia Inteligente

`SmartCourierAssignmentEngine` evalúa a cada repartidor disponible asignándole un puntaje ponderado de 0 a 100 basado en:

- **Distancia al Comercio (40%)**: Menor distancia otorga mayor puntuación.
- **Carga de Pedidos Activos (30%)**: Repartidores sin pedidos activos tienen prioridad.
- **Calificación del Repartidor (20%)**: Puntuación histórica de estrellas.
- **Nivel de Batería (10%)**: Batería superior al 20% asegura comunicación continua.

El repartidor con mayor puntaje recibe automáticamente el distintivo **⭐ Recomendado**.
