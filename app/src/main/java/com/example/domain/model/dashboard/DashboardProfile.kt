package com.example.domain.model.dashboard

/**
 * Perfiles de Visualización del Dashboard (Layout Profiles)
 * Permite cambiar la disposición de tarjetas según el turno o rol del comerciante.
 */
enum class DashboardProfileType {
    OPERATIONS,  // Enfoque equilibrado de operación general
    KITCHEN,     // Enfoque en comandas, KDS y tiempos de cocina
    SALES,       // Enfoque en finanzas, ticket promedio y analíticas
    INVENTORY,   // Enfoque en control de stock, agotados e insumos
    CUSTOM       // Perfil personalizado por usuario
}

data class DashboardProfile(
    val type: DashboardProfileType,
    val name: String,
    val description: String,
    val defaultVisibleWidgets: List<WidgetType>
)
