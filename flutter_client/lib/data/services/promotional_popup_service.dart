/// BLUE SYSTEM DELIVERY ENTERPRISE — PROMOTIONAL POPUP SERVICE
/// 1:1 Parity with Android PromotionalPopupRepository.kt
/// Manages campaign eligibility, global cooldown, and frequency persistence.

import '../../domain/entities/promotional_popup_entity.dart';
import '../../platform/storage/secure_storage_adapter.dart';

class PopupEvaluationResult {
  final PromotionalPopupEntity? popup;
  final int remainingCooldownMs;
  final String discardReason;

  const PopupEvaluationResult({
    this.popup,
    this.remainingCooldownMs = 0,
    this.discardReason = '',
  });

  bool get hasPopup => popup != null;
}

class PromotionalPopupService {
  static const int minGlobalCooldownMs = 60000; // 60s cooldown mínimo entre popups
  static int _lastGlobalDismissedTimestamp = 0;
  static final Set<String> _sessionDismissedIds = {};
  static final Map<String, String> _memoryStore = {};

  final ISecureStorage? _storage;

  PromotionalPopupService([this._storage]);

  static Future<PromotionalPopupService> create({ISecureStorage? storage}) async {
    return PromotionalPopupService(storage ?? PlatformSecureStorage());
  }

  String _getEffectiveAccountKey(String? userId, String? tenantId) {
    final user = (userId != null && userId.trim().isNotEmpty) ? userId.trim() : 'GUEST';
    final tenant = (tenantId != null && tenantId.trim().isNotEmpty) ? tenantId.trim() : 'DEFAULT_TENANT';
    return '${user}_$tenant';
  }

  bool isWithinValidityPeriod(PromotionalPopupEntity popup, [int? nowMs]) {
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    if (popup.startDate.isNotEmpty) {
      try {
        final start = DateTime.parse(popup.startDate).millisecondsSinceEpoch;
        if (now < start) return false;
      } catch (_) {}
    }
    if (popup.endDate.isNotEmpty) {
      try {
        final end = DateTime.parse(popup.endDate).millisecondsSinceEpoch;
        if (now > end) return false;
      } catch (_) {}
    }
    return true;
  }

  PopupEvaluationResult evaluateEligiblePopup({
    required List<PromotionalPopupEntity> popups,
    String targetScreen = 'DASHBOARD',
    String? categoryId,
    String? sectionId,
    String? userId,
    String? tenantId,
  }) {
    if (popups.isEmpty) {
      return const PopupEvaluationResult(discardReason: 'NO_CANDIDATES');
    }

    final candidates = popups.where((p) {
      if (!p.isEffectivelyActive) return false;
      if (p.placements.isNotEmpty) {
        if (!p.placements.contains(targetScreen.toUpperCase())) return false;
      }
      if (categoryId != null && p.targetCategoryIds.isNotEmpty) {
        if (!p.targetCategoryIds.contains(categoryId)) return false;
      }
      if (sectionId != null && p.targetSectionIds.isNotEmpty) {
        if (!p.targetSectionIds.contains(sectionId)) return false;
      }
      return true;
    }).toList()
      ..sort((a, b) => b.priority.compareTo(a.priority));

    final now = DateTime.now().millisecondsSinceEpoch;
    PromotionalPopupEntity? candidateInCooldown;
    int cooldownRemaining = 0;

    for (final popup in candidates) {
      if (!isWithinValidityPeriod(popup, now)) continue;

      if (!shouldShowPopup(popup, userId: userId, tenantId: tenantId)) {
        continue;
      }

      final elapsed = now - _lastGlobalDismissedTimestamp;
      if (elapsed < minGlobalCooldownMs) {
        final remaining = minGlobalCooldownMs - elapsed;
        candidateInCooldown ??= popup;
        cooldownRemaining = remaining;
        continue;
      }

      return PopupEvaluationResult(popup: popup);
    }

    if (candidateInCooldown != null) {
      return PopupEvaluationResult(
        remainingCooldownMs: cooldownRemaining,
        discardReason: 'GLOBAL_COOLDOWN',
      );
    }

    return const PopupEvaluationResult(discardReason: 'NO_ELIGIBLE_POPUP');
  }

  bool shouldShowPopup(
    PromotionalPopupEntity popup, {
    String? userId,
    String? tenantId,
  }) {
    final accountKey = _getEffectiveAccountKey(userId, tenantId);
    final sessionKey = '${accountKey}_${popup.id}';
    final isAlways = popup.frequency.toUpperCase() == 'ALWAYS' || popup.frequency.toUpperCase() == 'WHILE_ACTIVE';

    if (!isAlways && _sessionDismissedIds.contains(sessionKey)) {
      return false;
    }

    final todayStr = DateTime.now().toIso8601String().substring(0, 10);
    final ver = popup.deliveryVersion;

    switch (popup.frequency.toUpperCase()) {
      case 'ONCE':
        final shownOnce = _memoryStore['shown_once_${accountKey}_${popup.id}_v$ver'];
        return shownOnce != 'true';
      case 'ONCE_PER_DAY':
        final lastShownDate = _memoryStore['last_shown_date_${accountKey}_${popup.id}_v$ver'] ?? '';
        return lastShownDate != todayStr;
      case 'ONCE_PER_SESSION':
        return !_sessionDismissedIds.contains(sessionKey);
      case 'ALWAYS':
      case 'WHILE_ACTIVE':
        return true;
      default:
        return !_sessionDismissedIds.contains(sessionKey);
    }
  }

  void recordPopupDismissed(
    PromotionalPopupEntity popup, {
    String? userId,
    String? tenantId,
  }) {
    final accountKey = _getEffectiveAccountKey(userId, tenantId);
    final sessionKey = '${accountKey}_${popup.id}';
    final isAlways = popup.frequency.toUpperCase() == 'ALWAYS' || popup.frequency.toUpperCase() == 'WHILE_ACTIVE';

    if (!isAlways) {
      _sessionDismissedIds.add(sessionKey);
    }
    _lastGlobalDismissedTimestamp = DateTime.now().millisecondsSinceEpoch;

    final todayStr = DateTime.now().toIso8601String().substring(0, 10);
    final ver = popup.deliveryVersion;

    _memoryStore['shown_once_${accountKey}_${popup.id}_v$ver'] = 'true';
    _memoryStore['last_shown_date_${accountKey}_${popup.id}_v$ver'] = todayStr;
    _memoryStore['last_shown_timestamp_${accountKey}_${popup.id}_v$ver'] = DateTime.now().millisecondsSinceEpoch.toString();

    _storage?.write('shown_once_${accountKey}_${popup.id}_v$ver', 'true');
    _storage?.write('last_shown_date_${accountKey}_${popup.id}_v$ver', todayStr);
  }
}
