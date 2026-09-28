# Firestore Cost Analysis & Governance Specification

## Modelo de Costos Estimado en Firestore

- **Lecturas:** $\$0.06$ por $100,000$ operaciones.
- **Escrituras:** $\$0.18$ por $100,000$ operaciones.
- **Cloud Functions:** $\$0.40$ por $1,000,000$ invocaciones.

Monitoreado automáticamente por `FirestoreCostTracker`.
