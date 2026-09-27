/// BLUE SYSTEM DELIVERY ENTERPRISE — OPERATING HOURS RESOLVER
/// 1:1 Parity with Android OperatingHoursResolver.kt (BSD-MERCHANT-OPERATING-HOURS-ROOT-CAUSE-001)
/// Evaluates schedule maps, 24h formats, 12h formats, overnight shifts, and manual emergency switch.

class OperatingHoursStatus {
  final bool isOpen;
  final String reason;
  final String todayScheduleText;

  const OperatingHoursStatus({
    required this.isOpen,
    required this.reason,
    required this.todayScheduleText,
  });
}

class DayScheduleConfig {
  final bool isOpen;
  final String? openTime;
  final String? closeTime;

  const DayScheduleConfig({
    required this.isOpen,
    this.openTime,
    this.closeTime,
  });
}

class OperatingHoursResolver {
  static const String defaultTimezone = 'America/Managua';

  /// Resolves whether the merchant or branch is currently open.
  static bool isStoreOpen({
    dynamic schedule,
    bool manualOpen = true,
    DateTime? targetDateTime,
  }) {
    return resolveStatus(
      schedule: schedule,
      manualOpen: manualOpen,
      targetDateTime: targetDateTime,
    ).isOpen;
  }

  /// Resolves the detailed operating status.
  static OperatingHoursStatus resolveStatus({
    dynamic schedule,
    bool manualOpen = true,
    DateTime? targetDateTime,
  }) {
    // 1. Manual switch
    if (!manualOpen) {
      return const OperatingHoursStatus(
        isOpen: false,
        reason: 'MANUALLY_CLOSED',
        todayScheduleText: 'Cerrado temporalmente',
      );
    }

    // 2. Extract schedule map
    final scheduleMap = _extractScheduleMap(schedule);
    if (scheduleMap == null || scheduleMap.isEmpty) {
      return OperatingHoursStatus(
        isOpen: manualOpen,
        reason: 'NO_SCHEDULE_CONFIGURED',
        todayScheduleText: manualOpen ? 'Abierto' : 'Cerrado',
      );
    }

    // 3. Resolve time
    final now = targetDateTime ?? DateTime.now();
    final currentDay = now.weekday; // 1 = Monday ... 7 = Sunday
    final currentMinutes = now.hour * 60 + now.minute;

    // 4. Today config
    final todayConfig = _getDayConfig(scheduleMap, currentDay);
    final todayIsOpen = todayConfig?.isOpen ?? true;
    final todayOpenTime = todayConfig?.openTime;
    final todayCloseTime = todayConfig?.closeTime;

    // Check yesterday's overnight shift
    final prevDay = currentDay == 1 ? 7 : currentDay - 1;
    final yesterdayConfig = _getDayConfig(scheduleMap, prevDay);
    if (yesterdayConfig != null && yesterdayConfig.isOpen) {
      final yOpen = _parseTimeToMinutes(yesterdayConfig.openTime);
      final yClose = _parseTimeToMinutes(yesterdayConfig.closeTime);
      if (yOpen != null && yClose != null && yOpen > yClose) {
        // Overnight shift (e.g. 18:00 to 02:00)
        if (currentMinutes < yClose) {
          return const OperatingHoursStatus(
            isOpen: true,
            reason: 'OPEN_OVERNIGHT_SHIFT',
            todayScheduleText: 'Abierto (Turno nocturno)',
          );
        }
      }
    }

    if (!todayIsOpen) {
      return const OperatingHoursStatus(
        isOpen: false,
        reason: 'CLOSED_DAY',
        todayScheduleText: 'Cerrado hoy',
      );
    }

    if (todayOpenTime == null || todayCloseTime == null) {
      return const OperatingHoursStatus(
        isOpen: true,
        reason: 'OPEN_NO_HOURS_RESTRICTION',
        todayScheduleText: 'Abierto 24 Horas',
      );
    }

    final openMinutes = _parseTimeToMinutes(todayOpenTime);
    final closeMinutes = _parseTimeToMinutes(todayCloseTime);

    if (openMinutes == null || closeMinutes == null) {
      return const OperatingHoursStatus(
        isOpen: true,
        reason: 'OPEN_MALFORMED_HOURS_FALLBACK',
        todayScheduleText: 'Abierto',
      );
    }

    // 24 Hours check
    if ((openMinutes == 0 && closeMinutes == 1439) || (openMinutes == 0 && closeMinutes == 0)) {
      return const OperatingHoursStatus(
        isOpen: true,
        reason: 'OPEN_24_HOURS',
        todayScheduleText: 'Abierto 24 Horas',
      );
    }

    // Regular Daytime shift (e.g. 08:00 to 18:00)
    if (openMinutes <= closeMinutes) {
      final isOpenNow = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
      return OperatingHoursStatus(
        isOpen: isOpenNow,
        reason: isOpenNow ? 'OPEN_REGULAR_HOURS' : 'OUTSIDE_OPERATING_HOURS',
        todayScheduleText: '$todayOpenTime - $todayCloseTime',
      );
    } else {
      // Overnight Shift starting today (e.g. 18:00 to 02:00)
      final isOpenNow = currentMinutes >= openMinutes;
      return OperatingHoursStatus(
        isOpen: isOpenNow,
        reason: isOpenNow ? 'OPEN_OVERNIGHT_HOURS' : 'OUTSIDE_OPERATING_HOURS',
        todayScheduleText: '$todayOpenTime - $todayCloseTime',
      );
    }
  }

  static Map<String, dynamic>? _extractScheduleMap(dynamic schedule) {
    if (schedule == null) return null;
    if (schedule is Map<String, dynamic>) return schedule;
    if (schedule is Map) return Map<String, dynamic>.from(schedule);
    return null;
  }

  static DayScheduleConfig? _getDayConfig(Map<String, dynamic> scheduleMap, int weekday) {
    final dayKeys = _getDayKeys(weekday);
    dynamic rawConfig;

    for (final k in dayKeys) {
      if (scheduleMap.containsKey(k)) {
        rawConfig = scheduleMap[k];
        break;
      }
      // Also check lowercased keys
      for (final entry in scheduleMap.entries) {
        if (entry.key.trim().toLowerCase() == k) {
          rawConfig = entry.value;
          break;
        }
      }
      if (rawConfig != null) break;
    }

    if (rawConfig == null) return null;

    if (rawConfig is Map) {
      final map = Map<String, dynamic>.from(rawConfig);
      final isOpen = map['isOpen'] as bool? ??
          map['open'] as bool? ??
          map['abierto'] as bool? ??
          map['active'] as bool? ??
          true;
      final openTime = map['openTime'] as String? ??
          map['open'] as String? ??
          map['apertura'] as String? ??
          map['horaApertura'] as String?;
      final closeTime = map['closeTime'] as String? ??
          map['close'] as String? ??
          map['cierre'] as String? ??
          map['horaCierre'] as String?;
      return DayScheduleConfig(
        isOpen: isOpen,
        openTime: openTime,
        closeTime: closeTime,
      );
    }

    return null;
  }

  static List<String> _getDayKeys(int weekday) {
    switch (weekday) {
      case 1:
        return ['lunes', 'monday', 'mon', 'lun', '1'];
      case 2:
        return ['martes', 'tuesday', 'tue', 'mar', '2'];
      case 3:
        return ['miércoles', 'miercoles', 'wednesday', 'wed', 'mie', '3'];
      case 4:
        return ['jueves', 'thursday', 'thu', 'jue', '4'];
      case 5:
        return ['viernes', 'friday', 'fri', 'vie', '5'];
      case 6:
        return ['sábado', 'sabado', 'saturday', 'sat', 'sab', '6'];
      case 7:
        return ['domingo', 'sunday', 'sun', 'dom', '7'];
      default:
        return [];
    }
  }

  static int? _parseTimeToMinutes(String? timeStr) {
    if (timeStr == null || timeStr.trim().isEmpty) return null;
    final clean = timeStr.trim().toLowerCase();

    // Check 12-hour format with am/pm
    final isPm = clean.contains('pm') || clean.contains('p. m.');
    final isAm = clean.contains('am') || clean.contains('a. m.');

    final timePart = clean
        .replaceAll('am', '')
        .replaceAll('pm', '')
        .replaceAll('a. m.', '')
        .replaceAll('p. m.', '')
        .trim();

    final parts = timePart.split(':');
    if (parts.length < 2) return null;

    int? h = int.tryParse(parts[0].trim());
    final int? m = int.tryParse(parts[1].trim());

    if (h == null || m == null) return null;

    if (isPm && h < 12) h += 12;
    if (isAm && h == 12) h = 0;

    return h * 60 + m;
  }
}
