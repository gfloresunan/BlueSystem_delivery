package com.example.domain.repository.menu

import com.example.domain.model.menu.MenuSnapshot

interface IMenuSnapshotRepository {
    suspend fun saveSnapshot(snapshot: MenuSnapshot)
    suspend fun getSnapshotByVersion(restaurantId: String, semanticVersion: String): MenuSnapshot?
    suspend fun getLatestSnapshot(restaurantId: String): MenuSnapshot?
    suspend fun listSnapshots(restaurantId: String): List<MenuSnapshot>
}
