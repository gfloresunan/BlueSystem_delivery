package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.domain.model.finance.FinancialFilter

/**
 * Repositorio de Preferencias Locales para el Merchant Finance Center (MFC)
 */
class MerchantFinancePreferenceRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("mfc_finance_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_LAST_FILTER = "last_financial_filter"
    }

    fun saveLastFilter(filter: FinancialFilter) {
        prefs.edit().putString(KEY_LAST_FILTER, filter.name).apply()
    }

    fun getLastFilter(): FinancialFilter {
        val name = prefs.getString(KEY_LAST_FILTER, FinancialFilter.TODAY.name)
        return try { FinancialFilter.valueOf(name!!) } catch (e: Exception) { FinancialFilter.TODAY }
    }
}
