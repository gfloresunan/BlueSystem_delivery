package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuCombo

data class ComboValidationResult(
    val isValid: Boolean,
    val errors: List<String> = emptyList()
)

interface IComboDAGValidationEngine {
    fun validateComboDAG(combos: List<MenuCombo>): ComboValidationResult
}

/**
 * Servidor de Dominio: ComboDAGValidationEngineImpl (Sprint 13B.4B)
 *
 * VALIDACIÓN DE GRAFO ACÍCLICO DIRIGIDO (DAG - Precondición 1):
 * Garantiza que la jerarquía de combos anidados no contenga referencias circulares infinitas (A -> B -> A).
 */
class ComboDAGValidationEngineImpl : IComboDAGValidationEngine {

    override fun validateComboDAG(combos: List<MenuCombo>): ComboValidationResult {
        val errors = mutableListOf<String>()
        val comboMap = combos.associateBy { it.id }

        // Mapa de adjacencia: ComboId -> List de IDs de Combos contenidos en sus slots
        val adjacencyList = mutableMapOf<String, List<String>>()
        for (combo in combos) {
            val containedComboIds = combo.slots
                .flatMap { it.allowedProductIds }
                .filter { it in comboMap }
            adjacencyList[combo.id] = containedComboIds
        }

        // Detección de ciclos mediante Algoritmo DFS (Colors: 0=UNVISITED, 1=VISITING, 2=VISITED)
        val stateMap = mutableMapOf<String, Int>()

        fun hasCycle(comboId: String, path: List<String>): Boolean {
            stateMap[comboId] = 1 // VISITING
            val neighbors = adjacencyList[comboId] ?: emptyList()

            for (neighbor in neighbors) {
                val currentState = stateMap.getOrDefault(neighbor, 0)
                if (currentState == 1) {
                    // Ciclo detectado
                    val cyclePath = (path + neighbor).joinToString(" -> ")
                    errors.add("Se detectó una referencia circular infinita (Ciclo DAG) en la estructura de combos: $cyclePath")
                    return true
                }
                if (currentState == 0) {
                    if (hasCycle(neighbor, path + neighbor)) return true
                }
            }

            stateMap[comboId] = 2 // VISITED
            return false
        }

        for (combo in combos) {
            if (stateMap.getOrDefault(combo.id, 0) == 0) {
                hasCycle(combo.id, listOf(combo.id))
            }
        }

        // Validaciones estructurales individuales
        for (combo in combos) {
            if (combo.name.isBlank()) {
                errors.add("El combo ID '${combo.id}' no posee un nombre válido.")
            }
            for (slot in combo.slots) {
                if (slot.isRequired && slot.allowedProductIds.isEmpty()) {
                    errors.add("El slot obligatorio '${slot.slotName}' en el combo '${combo.name}' no tiene productos permitidos.")
                }
            }
        }

        return ComboValidationResult(isValid = errors.isEmpty(), errors = errors)
    }
}
