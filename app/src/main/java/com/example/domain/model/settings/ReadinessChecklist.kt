package com.example.domain.model.settings

data class ReadinessItem(
    val id: String,
    val title: String,
    val isCompleted: Boolean = false,
    val weight: Int = 10
)

data class ReadinessChecklist(
    val items: List<ReadinessItem> = listOf(
        ReadinessItem("check_info", "Información Básica y Razón Social", isCompleted = true, weight = 15),
        ReadinessItem("check_schedule", "Horario Semanal Definido", isCompleted = true, weight = 15),
        ReadinessItem("check_delivery", "Zona y Radio de Entrega Configurado", isCompleted = true, weight = 15),
        ReadinessItem("check_payments", "Métodos de Pago Activos", isCompleted = true, weight = 15),
        ReadinessItem("check_menu", "Menú con Productos Publicados", isCompleted = true, weight = 15),
        ReadinessItem("check_kds", "Estaciones de Cocina Asignadas", isCompleted = true, weight = 10),
        ReadinessItem("check_branding", "Logo y Marca Personalizada", isCompleted = false, weight = 10),
        ReadinessItem("check_staff", "Personal y Roles Registrados", isCompleted = true, weight = 5)
    )
) {
    val readinessScorePercent: Int
        get() {
            val totalWeight = items.sumOf { it.weight }
            val completedWeight = items.filter { it.isCompleted }.sumOf { it.weight }
            return if (totalWeight > 0) ((completedWeight.toDouble() / totalWeight) * 100).toInt() else 0
        }
}
