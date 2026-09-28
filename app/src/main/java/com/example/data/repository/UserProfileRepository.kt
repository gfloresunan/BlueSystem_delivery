package com.example.data.repository

import android.util.Log
import com.example.data.auth.PermissionManager
import com.example.domain.model.UserProfile
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class UserProfileRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _userProfile = MutableStateFlow<UserProfile?>(null)
    val userProfile: StateFlow<UserProfile?> = _userProfile.asStateFlow()

    private var listenerRegistration: ListenerRegistration? = null
    private var currentListeningUid: String = ""

    fun startListening(uid: String) {
        if (uid.isEmpty()) return
        val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        if (currentUser == null || currentUser.uid != uid) {
            Log.d("UserProfileRepo", "Skipping private listener. Guest mode or user mismatch.")
            return
        }
        if (listenerRegistration != null && currentListeningUid == uid) {
            Log.d("UserProfileRepo", "Listener already active for UID: $uid")
            return
        }
        stopListening()
        currentListeningUid = uid

        listenerRegistration = firestore.collection("users")
            .document(uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("USER_PROFILE", "Error escuchando perfil | Codigo: ${error.code} | Mensaje: ${error.message} | Excepcion: ${error.javaClass.simpleName}", error)
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    try {
                        val profile = snapshot.toObject(UserProfile::class.java)?.copy(uid = snapshot.id)
                        _userProfile.value = profile
                        PermissionManager.updatePermissionsForUser(profile)
                        Log.d("UserProfileRepo", "UserProfile updated for ${snapshot.id}: role=${profile?.getEffectiveRole()}, active=${profile?.isActive}")
                    } catch (e: Exception) {
                        Log.e("USER_PROFILE", "Error deserializando perfil | UID: $uid | Error: ${e.message}", e)
                    }
                } else {
                    Log.w("USER_PROFILE", "Documento inexistente | UID: $uid | Ruta consultada: users/$uid")
                }
            }
    }

    fun stopListening(): Boolean {
        val hadListener = listenerRegistration != null
        listenerRegistration?.remove()
        listenerRegistration = null
        currentListeningUid = ""
        _userProfile.value = null
        PermissionManager.setGuestPermissions()
        return hadListener
    }
}
