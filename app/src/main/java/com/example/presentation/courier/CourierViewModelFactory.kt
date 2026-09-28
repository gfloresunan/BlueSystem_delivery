package com.example.presentation.courier

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.data.local.AppDatabase
import com.example.data.sync.SyncManager

class CourierViewModelFactory(private val context: Context) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CourierViewModel::class.java)) {
            val database = AppDatabase.getDatabase(context)
            val syncManager = SyncManager(
                context,
                database.pendingActionDao(),
                database.offlineOrderDao()
            )
            @Suppress("UNCHECKED_CAST")
            return CourierViewModel(database.offlineOrderDao(), syncManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
