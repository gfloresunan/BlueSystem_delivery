const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../firestore.rules');
const raw = fs.readFileSync(filePath, 'utf8');
const lines = raw.split(/\r?\n/);

// Las líneas 645 a 649 (0-indexed: 644 a 649)
console.log("Replacing from line", lines[644], "to", lines[649]);

const newBlock = [
  '                        // Repartidor/Motorizado: Separación de Reclamo Inicial vs Operación en Curso (BSD-C4-002)',
  '                        (',
  '                          isPlatformAdmin() ||',
  '                          // Caso A: Operación sobre pedido ya asignado (ÚNICAMENTE el motorizado asignado)',
  '                          (isCourierOrDriver() &&',
  '                           (currentUid() == resource.data.get("assignedCourierId", "") || currentUid() == resource.data.get("motorizadoId", ""))) ||',
  '                          // Caso B: Reclamo o rechazo de pedido disponible sin asignar en mismo tenant y ciudad',
  '                          (isCourierOrDriver() &&',
  '                           (resource.data.get("assignedCourierId", "") == "" || resource.data.get("assignedCourierId", null) == null) &&',
  '                           (resource.data.get("motorizadoId", "") == "" || resource.data.get("motorizadoId", null) == null) &&',
  '                           isCourierInSameTenantAndCity(resource.data) &&',
  '                           (resource.data.get("status", "") in ["ready", "READY", "listo", "LISTO"] ||',
  '                            (resource.data.get("serviceType", "") == "X_TO_Y_DELIVERY" && resource.data.get("status", "") in ["ready", "READY", "listo", "LISTO", "pending", "PENDING"])))',
  '                        ) &&'
];

lines.splice(644, 6, ...newBlock);
fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log("firestore.rules updated successfully!");
