package com.example.domain.model.dashboard

/**
 * Contrato de Interfaz Desacoplado Multiplataforma para Widgets del Dashboard (IDashboardWidget)
 * Preparado para reutilización de lógica en Compose Android, Compose Desktop y Web React.
 */
interface IDashboardWidget {
    val widgetId: String
    val type: WidgetType
    val isVisible: Boolean
    val isPinned: Boolean
    val density: WidgetDensity
}
