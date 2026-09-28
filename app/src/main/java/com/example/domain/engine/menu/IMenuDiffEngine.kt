package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuDiffResult
import com.example.domain.model.menu.MenuSnapshot

interface IMenuDiffEngine {
    fun calculateDiff(
        baseSnapshot: MenuSnapshot,
        targetSnapshot: MenuSnapshot
    ): MenuDiffResult
}
