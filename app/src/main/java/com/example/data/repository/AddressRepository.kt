package com.example.data.repository

import android.util.Log
import com.example.Address
import com.example.toAddressSafely
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AddressRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _addresses = MutableStateFlow<List<Address>>(emptyList())
    val addresses: StateFlow<List<Address>> = _addresses.asStateFlow()

    private var listenerRegistration: ListenerRegistration? = null
    private var currentUid: String = ""

    fun startListening(uid: String) {
        if (uid.isEmpty()) return
        val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        if (currentUser == null || currentUser.uid != uid) {
            Log.d("AddressRepository", "Skipping private listener. Guest mode or user mismatch.")
            return
        }
        if (listenerRegistration != null && currentUid == uid) return
        stopListening()
        currentUid = uid

        listenerRegistration = firestore.collection("users")
            .document(uid)
            .collection("addresses")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("AddressRepository", "Error listening to user addresses", error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        doc.toAddressSafely()
                    }
                    _addresses.value = list
                    Log.d("AddressRepository", "Addresses updated: total=${list.size}")
                }
            }
    }

    fun stopListening(): Boolean {
        val hadListener = listenerRegistration != null
        Log.d("LOGOUT", "Stopping AddressRepository...")
        listenerRegistration?.remove()
        listenerRegistration = null
        _addresses.value = emptyList()
        currentUid = ""
        return hadListener
    }
}
