package com.example.presentation.business.finance

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.AuditLogger
import com.example.data.repository.MerchantFinanceRepository
import com.example.domain.model.finance.*
import com.google.firebase.firestore.DocumentSnapshot
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

enum class FinanceSubTab {
    RESUMEN,
    TRANSACTIONS,
    SETTLEMENTS
}

data class MerchantFinanceUiState(
    val isLoading: Boolean = true,
    val isLoadingEvents: Boolean = false,
    val isLoadingSettlements: Boolean = false,
    val isSubmittingAction: Boolean = false,
    val businessId: String = "",
    val activeSubTab: FinanceSubTab = FinanceSubTab.RESUMEN,
    val activeFilter: FinancialFilter = FinancialFilter.TODAY,
    val customDateFrom: String? = null,
    val customDateTo: String? = null,
    val summary: FinancialSummary = FinancialSummary(),
    val events: List<FinancialEvent> = emptyList(),
    val settlements: List<MerchantSettlement> = emptyList(),
    val selectedSettlement: MerchantSettlement? = null,
    val selectedOrderEvent: FinancialEvent? = null,
    val currentPage: Int = 1,
    val hasNextPage: Boolean = false,
    val hasPrevPage: Boolean = false,
    val pendingActionSettlement: MerchantSettlement? = null,
    val actionFeedback: String? = null,
    val actionFeedbackType: String? = null, // "SUCCESS" | "ERROR"
    val errorMessage: String? = null,
    val pdfExportContent: String? = null,
    val excelExportPayload: Map<String, String>? = null
)

class MerchantFinanceViewModel(
    repositorySupplier: (() -> MerchantFinanceRepository)? = null
) : ViewModel() {

    private val repository by lazy { repositorySupplier?.invoke() ?: MerchantFinanceRepository() }

    private val _uiState = MutableStateFlow(MerchantFinanceUiState())
    val uiState: StateFlow<MerchantFinanceUiState> = _uiState.asStateFlow()

    private var summaryJob: Job? = null
    private var eventsJob: Job? = null
    private val pageCursors = mutableListOf<DocumentSnapshot?>()
    private var nextCursor: DocumentSnapshot? = null

    fun startFinanceCenter(businessId: String, initialSettlementId: String? = null) {
        if (businessId.isBlank()) return
        _uiState.update { it.copy(businessId = businessId, isLoading = true) }

        observeSummary(businessId)
        loadEvents(businessId, _uiState.value.activeFilter)
        loadSettlementsPage(page = 1, cursor = null)

        if (!initialSettlementId.isNullOrBlank()) {
            openSettlementById(initialSettlementId)
        }
    }

    fun selectTab(tab: FinanceSubTab) {
        _uiState.update { it.copy(activeSubTab = tab) }
        if (tab == FinanceSubTab.SETTLEMENTS && _uiState.value.settlements.isEmpty()) {
            loadSettlementsPage(1, null)
        }
    }

    fun setFilter(filter: FinancialFilter, dateFrom: String? = null, dateTo: String? = null) {
        _uiState.update {
            it.copy(
                activeFilter = filter,
                customDateFrom = dateFrom,
                customDateTo = dateTo,
                isLoadingEvents = true
            )
        }
        val bizId = _uiState.value.businessId
        if (bizId.isNotEmpty()) {
            loadEvents(bizId, filter, dateFrom, dateTo)
        }
    }

    private fun observeSummary(businessId: String) {
        summaryJob?.cancel()
        summaryJob = viewModelScope.launch {
            repository.getFinancialSummaryStream(businessId)
                .catch { e ->
                    _uiState.update { it.copy(isLoading = false, errorMessage = e.message) }
                }
                .collect { summary ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            summary = summary
                        )
                    }
                }
        }
    }

    private fun loadEvents(
        businessId: String,
        filter: FinancialFilter,
        dateFrom: String? = null,
        dateTo: String? = null
    ) {
        eventsJob?.cancel()
        eventsJob = viewModelScope.launch {
            _uiState.update { it.copy(isLoadingEvents = true) }
            repository.getFinancialEventsStream(businessId, filter, dateFrom, dateTo)
                .catch { e ->
                    _uiState.update { it.copy(isLoadingEvents = false, errorMessage = e.message) }
                }
                .collect { list ->
                    _uiState.update {
                        it.copy(
                            isLoadingEvents = false,
                            events = list
                        )
                    }

                    val missingOrderIds = list
                        .map { it.orderId }
                        .filter { it.isNotBlank() && repository.isOrderCodeMissing(it) }
                        .distinct()

                    if (missingOrderIds.isNotEmpty()) {
                        launch {
                            val resolvedMap = mutableMapOf<String, String>()
                            for (id in missingOrderIds) {
                                val code = repository.resolveOrderDisplayCode(id)
                                if (code.isNotBlank()) {
                                    resolvedMap[id] = code
                                }
                            }
                            if (resolvedMap.isNotEmpty()) {
                                _uiState.update { current ->
                                    val mapped = current.events.map { ev ->
                                        val code = resolvedMap[ev.orderId]
                                        if (code != null) ev.copy(orderCode = code) else ev
                                    }
                                    val sel = current.selectedOrderEvent?.let { s ->
                                        val code = resolvedMap[s.orderId]
                                        if (code != null) s.copy(orderCode = code) else s
                                    }
                                    current.copy(events = mapped, selectedOrderEvent = sel)
                                }
                            }
                        }
                    }
                }
        }
    }

    fun loadSettlementsPage(page: Int, cursor: DocumentSnapshot?) {
        val bizId = _uiState.value.businessId
        if (bizId.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingSettlements = true) }
            val res = repository.getSettlementsPage(bizId, cursor = cursor)
            res.onSuccess { pageResult ->
                nextCursor = pageResult.nextCursor
                if (page == 1) {
                    pageCursors.clear()
                    pageCursors.add(null)
                }
                _uiState.update {
                    it.copy(
                        isLoadingSettlements = false,
                        settlements = pageResult.settlements,
                        currentPage = page,
                        hasNextPage = pageResult.hasNextPage,
                        hasPrevPage = page > 1
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isLoadingSettlements = false,
                        errorMessage = err.message ?: "Error cargando liquidaciones"
                    )
                }
            }
        }
    }

    fun loadNextSettlementsPage() {
        if (!_uiState.value.hasNextPage || nextCursor == null || _uiState.value.isLoadingSettlements) return
        val nextPage = _uiState.value.currentPage + 1
        if (pageCursors.size < nextPage) {
            pageCursors.add(nextCursor)
        } else {
            pageCursors[nextPage - 1] = nextCursor
        }
        loadSettlementsPage(nextPage, nextCursor)
    }

    fun loadPrevSettlementsPage() {
        if (_uiState.value.currentPage <= 1 || _uiState.value.isLoadingSettlements) return
        val prevPage = _uiState.value.currentPage - 1
        val prevCursor = pageCursors.getOrNull(prevPage - 1)
        loadSettlementsPage(prevPage, prevCursor)
    }

    fun refreshSettlements() {
        val curPage = _uiState.value.currentPage
        val curCursor = pageCursors.getOrNull(curPage - 1)
        loadSettlementsPage(curPage, curCursor)
    }

    fun selectSettlement(settlement: MerchantSettlement?) {
        _uiState.update { it.copy(selectedSettlement = settlement) }
    }

    fun selectOrderEvent(event: FinancialEvent?) {
        if (event == null) {
            _uiState.update { it.copy(selectedOrderEvent = null) }
            return
        }

        if (event.orderCode.isNotBlank()) {
            _uiState.update { it.copy(selectedOrderEvent = event) }
            return
        }

        _uiState.update { it.copy(selectedOrderEvent = event) }

        if (event.orderId.isNotBlank()) {
            viewModelScope.launch {
                val resolved = repository.resolveOrderDisplayCode(event.orderId)
                if (resolved.isNotBlank()) {
                    _uiState.update { current ->
                        val updatedEvents = current.events.map { ev ->
                            if (ev.orderId == event.orderId) ev.copy(orderCode = resolved) else ev
                        }
                        val updatedSel = if (current.selectedOrderEvent?.orderId == event.orderId) {
                            current.selectedOrderEvent?.copy(orderCode = resolved)
                        } else {
                            current.selectedOrderEvent
                        }
                        current.copy(events = updatedEvents, selectedOrderEvent = updatedSel)
                    }
                }
            }
        }
    }

    private fun openSettlementById(settlementId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(activeSubTab = FinanceSubTab.SETTLEMENTS) }
            val existing = _uiState.value.settlements.find { it.settlementId == settlementId }
            if (existing != null) {
                _uiState.update { it.copy(selectedSettlement = existing) }
            }
        }
    }

    // ─── Acciones Transaccionales ───────────────────────────────────────────

    fun confirmSettlement(settlementId: String, notes: String? = null) {
        if (_uiState.value.isSubmittingAction) return
        _uiState.update { it.copy(isSubmittingAction = true, actionFeedback = null) }

        viewModelScope.launch {
            val result = repository.confirmSettlement(settlementId, notes)
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isSubmittingAction = false,
                        selectedSettlement = null,
                        actionFeedback = "¡Liquidación confirmada exitosamente! El período quedó cerrado y congelado.",
                        actionFeedbackType = "SUCCESS"
                    )
                }
                AuditLogger.logEvent("MERCHANT_SETTLEMENT_CONFIRMED", mapOf("settlementId" to settlementId))
                refreshSettlements()
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isSubmittingAction = false,
                        actionFeedback = err.message ?: "Error al confirmar liquidación.",
                        actionFeedbackType = "ERROR"
                    )
                }
            }
        }
    }

    fun disputeSettlement(
        settlementId: String,
        reason: String,
        claimedDifferenceCents: Long,
        description: String,
        evidenceUrl: String? = null
    ) {
        if (_uiState.value.isSubmittingAction) return
        _uiState.update { it.copy(isSubmittingAction = true, actionFeedback = null) }

        viewModelScope.launch {
            val result = repository.disputeSettlement(
                settlementId = settlementId,
                reason = reason,
                claimedDifferenceCents = claimedDifferenceCents,
                description = description,
                evidenceUrl = evidenceUrl
            )
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isSubmittingAction = false,
                        selectedSettlement = null,
                        actionFeedback = "Disputa formal registrada. La liquidación permanecerá en revisión administrativa.",
                        actionFeedbackType = "SUCCESS"
                    )
                }
                AuditLogger.logEvent("MERCHANT_SETTLEMENT_DISPUTED", mapOf("settlementId" to settlementId, "reason" to reason))
                refreshSettlements()
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isSubmittingAction = false,
                        actionFeedback = err.message ?: "Error al registrar la disputa.",
                        actionFeedbackType = "ERROR"
                    )
                }
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(actionFeedback = null, actionFeedbackType = null, errorMessage = null) }
    }

    // ─── Exportadores de Compatibilidad ─────────────────────────────────────

    fun generatePdfReport() {
        val summary = _uiState.value.summary
        val pdf = com.example.domain.engine.finance.FinancialReportGenerator.generatePdfReportContent("Restaurante Enterprise", summary)
        _uiState.update { it.copy(pdfExportContent = pdf) }
    }

    fun generateExcelReport() {
        val summary = _uiState.value.summary
        val excel = com.example.domain.engine.finance.FinancialReportGenerator.generateExcelReportPayload("Restaurante Enterprise", summary)
        _uiState.update { it.copy(excelExportPayload = excel) }
    }

    fun dismissExports() {
        _uiState.update { it.copy(pdfExportContent = null, excelExportPayload = null) }
    }
}
