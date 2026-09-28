package com.example.domain.engine.update

import com.example.domain.model.AppUpdateConfig
import com.example.domain.model.AppUpdateResolution
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Motor central de resolución de versiones y políticas de actualización remota.
 * Totalmente desacoplado de UI / Android Context para máxima testabilidad y determinismo.
 */
object AppUpdateResolver {

    const val PLATFORM_ANDROID = "ANDROID"
    const val PLATFORM_IOS = "IOS"
    const val PLATFORM_ALL = "ALL"

    /**
     * Resuelve el estado de actualización a partir de la versión instalada y la configuración remota.
     */
    fun resolve(
        installedVersion: String,
        config: AppUpdateConfig?,
        currentPlatform: String = PLATFORM_ANDROID,
        currentTimeMillis: Long = System.currentTimeMillis(),
        defaultPackageName: String = "com.aistudio.delivery.djweq"
    ): AppUpdateResolution {
        // Caso A: Sin configuración o desactivada remotamente
        if (config == null || !config.enabled) {
            return AppUpdateResolution.NoUpdate
        }

        // Caso E: Filtrado por plataforma objetivo
        val targetPlatforms = config.targetPlatforms.map { it.trim().uppercase(Locale.ROOT) }
        val platformMatches = targetPlatforms.isEmpty() ||
                targetPlatforms.contains(PLATFORM_ALL) ||
                targetPlatforms.contains(currentPlatform.trim().uppercase(Locale.ROOT))

        if (!platformMatches) {
            return AppUpdateResolution.NoUpdate
        }

        // Caso F: Ventana temporal (startAt / endAt)
        if (!isWithinScheduleWindow(config.startAt, config.endAt, currentTimeMillis)) {
            return AppUpdateResolution.NoUpdate
        }

        val safeInstalled = installedVersion.trim().ifEmpty { "1.0.0" }
        val safeLatest = config.latestVersion.trim().ifEmpty { safeInstalled }
        val safeMin = config.minimumVersion.trim().ifEmpty { safeInstalled }

        val cmpLatest = compareSemVer(safeInstalled, safeLatest)
        val cmpMin = compareSemVer(safeInstalled, safeMin)

        // Caso B / Test-08 / Test-09: Versión instalada igual o superior a la última disponible
        if (cmpLatest >= 0) {
            return AppUpdateResolution.NoUpdate
        }

        val storeUrl = resolveStoreUrl(config, currentPlatform, defaultPackageName)

        // Caso D / Test-03 / Test-07: Actualización obligatoria por violar versión mínima o flag forceUpdate
        val isForced = (cmpMin < 0) ||
                config.forceUpdate ||
                config.updateType.equals("FORCED", ignoreCase = true)

        if (isForced) {
            return AppUpdateResolution.ShowUpdate(
                config = config,
                isForced = true,
                canDismiss = false,
                storeUrl = storeUrl,
                resolutionReason = if (cmpMin < 0) "MINIMUM_VERSION_VIOLATION" else "EXPLICIT_FORCE"
            )
        }

        // Caso C: Actualización recomendada o informativa
        val canDismiss = config.allowDismiss
        val isInfo = config.updateType.equals("INFO", ignoreCase = true)

        return AppUpdateResolution.ShowUpdate(
            config = config,
            isForced = false,
            canDismiss = canDismiss,
            storeUrl = storeUrl,
            resolutionReason = if (isInfo) "INFO" else "RECOMMENDED"
        )
    }

    /**
     * Resuelve el estado de actualización a partir de una configuración en bruto (Map o no tipada).
     * Garantiza resiliencia total frente a payloads malformados o con tipos anómalos.
     */
    fun resolveFromRaw(
        installedVersion: String,
        rawConfig: Any?,
        currentPlatform: String = PLATFORM_ANDROID,
        currentTimeMillis: Long = System.currentTimeMillis(),
        defaultPackageName: String = "com.aistudio.delivery.djweq"
    ): AppUpdateResolution {
        val safeConfig = parseSafe(rawConfig)
        return resolve(
            installedVersion = installedVersion,
            config = safeConfig,
            currentPlatform = currentPlatform,
            currentTimeMillis = currentTimeMillis,
            defaultPackageName = defaultPackageName
        )
    }

    /**
     * Parseo defensivo y tolerante a fallos de cualquier mapa o estructura no tipada.
     * Retorna null si los datos son inválidos, corruptos o no cumplen con los tipos requeridos.
     */
    @Suppress("UNCHECKED_CAST")
    fun parseSafe(raw: Any?): AppUpdateConfig? {
        if (raw == null) return null
        if (raw is AppUpdateConfig) return raw
        if (raw !is Map<*, *>) return null

        return try {
            val map = raw as Map<String, Any?>
            // Si el mapa contiene una clave "appUpdate", desempaquetarla
            val actualMap = (map["appUpdate"] as? Map<String, Any?>) ?: map

            // Validación estricta de enabled: DEBE ser booleano true
            val rawEnabled = actualMap["enabled"]
            val enabled = when (rawEnabled) {
                is Boolean -> rawEnabled
                else -> false // Falla segura ante cadenas ("YES", "TRUE"), números, etc.
            }

            if (!enabled) {
                return AppUpdateConfig(enabled = false)
            }

            val rawLatest = actualMap["latestVersion"]
            val latestVersion = when (rawLatest) {
                is String -> rawLatest.trim()
                else -> return AppUpdateConfig(enabled = false) // Tipo inválido -> NoUpdate seguro
            }

            val rawMin = actualMap["minimumVersion"]
            val minimumVersion = when (rawMin) {
                is String -> rawMin.trim()
                null -> "1.0.0"
                else -> return AppUpdateConfig(enabled = false)
            }

            val rawTargets = actualMap["targetPlatforms"]
            val targetPlatforms: List<String> = when (rawTargets) {
                is List<*> -> rawTargets.filterIsInstance<String>()
                is String -> listOf(rawTargets)
                else -> listOf("ANDROID", "IOS")
            }

            val rawType = actualMap["updateType"]?.toString() ?: "RECOMMENDED"
            val rawFrequency = actualMap["displayFrequency"]
            val displayFrequency = when (rawFrequency) {
                is String -> rawFrequency
                else -> "EACH_SESSION"
            }

            val forceUpdate = when (val f = actualMap["forceUpdate"]) {
                is Boolean -> f
                else -> false
            }

            AppUpdateConfig(
                enabled = enabled,
                updateType = rawType,
                latestVersion = latestVersion,
                minimumVersion = minimumVersion,
                targetPlatforms = targetPlatforms,
                title = actualMap["title"]?.toString() ?: "Actualiza BlueSystem Delivery",
                subtitle = actualMap["subtitle"]?.toString() ?: "",
                message = actualMap["message"]?.toString() ?: "",
                imageUrl = actualMap["imageUrl"] as? String,
                iconUrl = actualMap["iconUrl"] as? String,
                showLogo = actualMap["showLogo"] as? Boolean ?: true,
                primaryButtonText = actualMap["primaryButtonText"]?.toString() ?: "Actualizar ahora",
                secondaryButtonText = actualMap["secondaryButtonText"]?.toString() ?: "Más tarde",
                allowDismiss = actualMap["allowDismiss"] as? Boolean ?: (rawType != "FORCED"),
                forceUpdate = forceUpdate,
                playStoreUrl = actualMap["playStoreUrl"]?.toString() ?: "",
                appStoreUrl = actualMap["appStoreUrl"]?.toString() ?: "",
                backgroundColor = actualMap["backgroundColor"] as? String,
                primaryButtonColor = actualMap["primaryButtonColor"] as? String,
                textColor = actualMap["textColor"] as? String,
                startAt = actualMap["startAt"] as? String,
                endAt = actualMap["endAt"] as? String,
                displayFrequency = displayFrequency,
                cooldownHours = (actualMap["cooldownHours"] as? Number)?.toInt() ?: 24,
                campaignId = actualMap["campaignId"]?.toString() ?: "",
                schemaVersion = (actualMap["schemaVersion"] as? Number)?.toInt() ?: 1
            )
        } catch (_: Exception) {
            // Falla segura total ante cualquier estructura corrupta o anómala
            null
        }
    }

    /**
     * Construye la proyección pública sanitizada para /system_config/app_update.
     * Garantiza de forma estricta (whitelist) que NINGÚN campo sensible o interno
     * del documento global (financialConfig, canary, internalFlags, tenantConfig, etc.)
     * sea expuesto públicamente a clientes anónimos o invitados.
     */
    fun buildSanitizedProjection(rawGlobalConfig: Map<String, Any?>?): Map<String, Any?> {
        if (rawGlobalConfig == null) return emptyMap()

        // 1. Extraer appUpdate si viene anidado en el documento global
        val appUpdateObj = parseSafe(rawGlobalConfig) ?: return emptyMap()

        // 2. Proyección estricta con lista blanca de campos visuales y de versión
        val projection = mutableMapOf<String, Any?>()
        projection["enabled"] = appUpdateObj.enabled
        projection["updateType"] = appUpdateObj.updateType
        projection["latestVersion"] = appUpdateObj.latestVersion
        projection["minimumVersion"] = appUpdateObj.minimumVersion
        projection["targetPlatforms"] = appUpdateObj.targetPlatforms
        projection["title"] = appUpdateObj.title
        projection["subtitle"] = appUpdateObj.subtitle
        projection["message"] = appUpdateObj.message
        if (appUpdateObj.imageUrl != null) projection["imageUrl"] = appUpdateObj.imageUrl
        if (appUpdateObj.iconUrl != null) projection["iconUrl"] = appUpdateObj.iconUrl
        projection["showLogo"] = appUpdateObj.showLogo
        projection["primaryButtonText"] = appUpdateObj.primaryButtonText
        projection["secondaryButtonText"] = appUpdateObj.secondaryButtonText
        projection["allowDismiss"] = appUpdateObj.allowDismiss
        projection["forceUpdate"] = appUpdateObj.forceUpdate
        projection["playStoreUrl"] = appUpdateObj.playStoreUrl
        projection["appStoreUrl"] = appUpdateObj.appStoreUrl
        if (appUpdateObj.backgroundColor != null) projection["backgroundColor"] = appUpdateObj.backgroundColor
        if (appUpdateObj.primaryButtonColor != null) projection["primaryButtonColor"] = appUpdateObj.primaryButtonColor
        if (appUpdateObj.textColor != null) projection["textColor"] = appUpdateObj.textColor
        if (appUpdateObj.startAt != null) projection["startAt"] = appUpdateObj.startAt
        if (appUpdateObj.endAt != null) projection["endAt"] = appUpdateObj.endAt
        projection["displayFrequency"] = appUpdateObj.displayFrequency
        projection["cooldownHours"] = appUpdateObj.cooldownHours
        projection["campaignId"] = appUpdateObj.campaignId
        projection["schemaVersion"] = appUpdateObj.schemaVersion

        return projection
    }

    /**
     * Comparación semántica de versiones (SemVer).
     * Retorna:
     *  < 0 si v1 < v2
     *  0   si v1 == v2
     *  > 0 si v1 > v2
     *
     * Ejemplo: compareSemVer("1.9.0", "1.10.0") == -1
     */
    fun compareSemVer(v1: String, v2: String): Int {
        val p1 = parseVersionParts(v1)
        val p2 = parseVersionParts(v2)

        val maxLen = maxOf(p1.size, p2.size)
        for (i in 0 until maxLen) {
            val num1 = p1.getOrElse(i) { 0 }
            val num2 = p2.getOrElse(i) { 0 }
            if (num1 != num2) {
                return num1.compareTo(num2)
            }
        }
        return 0
    }

    private fun parseVersionParts(version: String): List<Int> {
        if (version.isBlank()) return listOf(0, 0, 0)
        // Eliminar prefijos comunes como 'v' o 'V' y sufijos de build '-alpha', '+build'
        val cleaned = version.trim()
            .removePrefix("v")
            .removePrefix("V")
            .split("-")[0]
            .split("+")[0]

        return cleaned.split(".")
            .map { part ->
                part.trim().toIntOrNull() ?: 0
            }
    }

    private fun isWithinScheduleWindow(startAt: String?, endAt: String?, now: Long): Boolean {
        if (startAt != null && startAt.isNotBlank()) {
            val startMillis = parseIsoToMillis(startAt)
            if (startMillis != null && now < startMillis) {
                return false
            }
        }
        if (endAt != null && endAt.isNotBlank()) {
            val endMillis = parseIsoToMillis(endAt)
            if (endMillis != null && now > endMillis) {
                return false
            }
        }
        return true
    }

    private fun parseIsoToMillis(isoString: String): Long? {
        return try {
            val formats = listOf(
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd'T'HH:mm:ss.SSS",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss"
            )
            for (fmt in formats) {
                try {
                    val sdf = SimpleDateFormat(fmt, Locale.US).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }
                    val date = sdf.parse(isoString)
                    if (date != null) return date.time
                } catch (_: Exception) {}
            }
            null
        } catch (_: Exception) {
            null
        }
    }

    fun resolveStoreUrl(
        config: AppUpdateConfig,
        platform: String,
        packageName: String
    ): String {
        return if (platform.equals(PLATFORM_IOS, ignoreCase = true)) {
            config.appStoreUrl.ifBlank { "https://apps.apple.com" }
        } else {
            if (config.playStoreUrl.isNotBlank()) {
                config.playStoreUrl
            } else {
                "market://details?id=$packageName"
            }
        }
    }
}
