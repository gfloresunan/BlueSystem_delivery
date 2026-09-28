package com.example.eiam.presentation.merchant

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.eiam.data.repository.EmployeeRepository
import com.example.eiam.domain.engine.InvitationEngine
import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.Employee
import com.example.eiam.domain.model.EiamRole
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.UUID

data class MerchantStaffUiState(
    val isLoading: Boolean = false,
    val employees: List<Employee> = emptyList(),
    val errorMessage: String? = null,
    val actionSuccessMessage: String? = null
)

class MerchantStaffViewModel(
    private val employeeRepo: EmployeeRepository = EmployeeRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(MerchantStaffUiState())
    val uiState: StateFlow<MerchantStaffUiState> = _uiState.asStateFlow()

    private var listenerRegistration: ListenerRegistration? = null

    fun loadStaff(businessId: String) {
        if (businessId.isBlank()) return

        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
        listenerRegistration?.remove()

        val db = FirebaseFirestore.getInstance()
        listenerRegistration = db.collection("employees")
            .whereEqualTo("businessId", businessId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Error al sincronizar personal: ${error.localizedMessage}"
                    )
                    return@addSnapshotListener
                }

                val staffList = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        val emp = doc.toObject(Employee::class.java)
                        emp?.copy(employeeId = doc.id)
                    } catch (e: Exception) {
                        null
                    }
                } ?: emptyList()

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    employees = staffList.sortedByDescending { it.createdAt?.seconds ?: 0L },
                    errorMessage = null
                )
            }
    }

    fun inviteEmployee(
        name: String,
        email: String,
        phone: String,
        role: EiamRole,
        businessId: String,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val currentUid = FirebaseAuth.getInstance().currentUser?.uid ?: "owner"
                val empId = UUID.randomUUID().toString()
                val now = Timestamp.now()

                val newEmployee = Employee(
                    employeeId = empId,
                    uid = "",
                    businessId = businessId,
                    role = role,
                    status = AccountStatus.ACTIVE,
                    displayName = name.trim(),
                    email = email.trim(),
                    phone = phone.trim(),
                    invitedBy = currentUid,
                    createdAt = now,
                    updatedAt = now
                )

                // Persistir en Firestore /employees
                employeeRepo.saveEmployee(newEmployee)

                // Registrar también invitación en /invitations
                try {
                    val invitation = InvitationEngine.createInvitation(
                        businessId = businessId,
                        role = role,
                        invitedEmail = email.trim(),
                        invitedPhone = phone.trim(),
                        invitedBy = currentUid
                    )
                    FirebaseFirestore.getInstance().collection("invitations")
                        .document(invitation.token)
                        .set(invitation)
                        .await()
                } catch (_: Exception) {
                    // Si falla invitation es no-bloqueante ya que el registro de employee es el primario
                }

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    actionSuccessMessage = "Colaborador '$name' agregado exitosamente"
                )
                onSuccess()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = "Error al registrar colaborador: ${e.localizedMessage}"
                )
            }
        }
    }

    fun removeEmployee(employeeId: String) {
        viewModelScope.launch {
            try {
                employeeRepo.deleteEmployee(employeeId)
                _uiState.value = _uiState.value.copy(
                    actionSuccessMessage = "Colaborador eliminado correctamente"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = "Error al eliminar colaborador: ${e.localizedMessage}"
                )
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(errorMessage = null, actionSuccessMessage = null)
    }

    override fun onCleared() {
        super.onCleared()
        listenerRegistration?.remove()
    }
}
