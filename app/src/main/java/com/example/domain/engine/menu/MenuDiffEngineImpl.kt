package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuDiffResult
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.model.menu.PriceChange

class MenuDiffEngineImpl : IMenuDiffEngine {

    override fun calculateDiff(
        baseSnapshot: MenuSnapshot,
        targetSnapshot: MenuSnapshot
    ): MenuDiffResult {
        val baseProductMap = baseSnapshot.products.associateBy { it.id }
        val targetProductMap = targetSnapshot.products.associateBy { it.id }

        val addedProducts = mutableListOf<MenuProduct>()
        val removedProducts = mutableListOf<MenuProduct>()
        val priceChanges = mutableListOf<PriceChange>()
        var modifiedCount = 0

        // 1. Productos añadidos o modificados en la versión destino
        for ((id, targetProd) in targetProductMap) {
            val baseProd = baseProductMap[id]
            if (baseProd == null) {
                addedProducts.add(targetProd)
                modifiedCount++
            } else {
                if (baseProd.basePrice != targetProd.basePrice) {
                    priceChanges.add(
                        PriceChange(
                            productId = id,
                            productName = targetProd.name,
                            oldPrice = baseProd.basePrice,
                            newPrice = targetProd.basePrice
                        )
                    )
                    modifiedCount++
                } else if (baseProd != targetProd) {
                    modifiedCount++
                }
            }
        }

        // 2. Productos eliminados en la versión destino
        for ((id, baseProd) in baseProductMap) {
            if (!targetProductMap.containsKey(id)) {
                removedProducts.add(baseProd)
                modifiedCount++
            }
        }

        return MenuDiffResult(
            baseVersion = baseSnapshot.semanticVersion,
            targetVersion = targetSnapshot.semanticVersion,
            addedProducts = addedProducts,
            removedProducts = removedProducts,
            priceChanges = priceChanges,
            modifiedProductCount = modifiedCount
        )
    }
}
