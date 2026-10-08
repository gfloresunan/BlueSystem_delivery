/// BLUE SYSTEM DELIVERY ENTERPRISE — SCHEDULED COMMERCE ENGINE
/// 1:1 Parity with Android ScheduledCommerceEngine.kt
/// Canonical Engine for Scheduled Deliveries (Protocol BSD-SCHEDULED-COMMERCE-PHASE-3-CUSTOMER-FLOW-001).

import 'package:intl/intl.dart';
import '../../domain/entities/catalog_entity.dart';
import 'operating_hours_resolver.dart';

class ScheduledDay {
  final DateTime date;
  final String dateStr;
  final String dayOfWeekLabel;
  final String dayNumberLabel;
  final String monthLabel;
  final bool isAvailable;
  final bool isToday;
  final String reason;

  const ScheduledDay({
    required this.date,
    required this.dateStr,
    required this.dayOfWeekLabel,
    required this.dayNumberLabel,
    required this.monthLabel,
    required this.isAvailable,
    required this.isToday,
    this.reason = '',
  });
}

class ScheduledSlot {
  final String slotKey;
  final String label;
  final DateTime windowStartAt;
  final DateTime windowEndAt;
  final bool isAvailable;
  final int remainingCapacity;
  final String reason;

  const ScheduledSlot({
    required this.slotKey,
    required this.label,
    required this.windowStartAt,
    required this.windowEndAt,
    this.isAvailable = true,
    this.remainingCapacity = 5,
    this.reason = '',
  });
}

class GreetingCardTemplate {
  final String id;
  final String name;
  final String category;
  final String iconEmoji;
  final String description;

  const GreetingCardTemplate({
    required this.id,
    required this.name,
    required this.category,
    required this.iconEmoji,
    required this.description,
  });
}

class ScheduledCommerceEngine {
  static const String canonicalTimezone = 'America/Managua';

  static const List<GreetingCardTemplate> defaultCardTemplates = [
    GreetingCardTemplate(
      id: 'CARD_CLASSIC_ELEGANT',
      name: 'Clásica Elegante',
      category: 'General',
      iconEmoji: '💌',
      description: 'Diseño sobrio y elegante para toda ocasión',
    ),
    GreetingCardTemplate(
      id: 'CARD_ROSES_ROMANTIC',
      name: 'Rosas & Amor',
      category: 'Romance',
      iconEmoji: '🌹',
      description: 'Motivo floral romántico con dedicatoria especial',
    ),
    GreetingCardTemplate(
      id: 'CARD_BIRTHDAY_CELEBRATION',
      name: 'Feliz Cumpleaños',
      category: 'Celebración',
      iconEmoji: '🎂',
      description: 'Diseño festivo para cumpleaños y festejos',
    ),
    GreetingCardTemplate(
      id: 'CARD_CONGRATULATIONS',
      name: '¡Felicidades!',
      category: 'Logros',
      iconEmoji: '🎉',
      description: 'Ideal para celebraciones, graduaciones y metas',
    ),
  ];

  static final DateFormat _dayOfWeekFmt = DateFormat('EEE', 'es_NI');
  static final DateFormat _dayNumFmt = DateFormat('d', 'es_NI');
  static final DateFormat _monthFmt = DateFormat('MMM', 'es_NI');
  static final DateFormat _timeFmt = DateFormat('h:mm a', 'en_US');

  static List<ScheduledDay> getAvailableDays({
    required BusinessEntity business,
    String timezone = canonicalTimezone,
    DateTime? now,
  }) {
    final current = now ?? DateTime.now();
    final today = DateTime(current.year, current.month, current.day);
    final maxAdvanceDays = business.scheduledMaxAdvanceDays;
    final blockedDates = business.scheduledBlockedDates.toSet();
    final schedule = business.horario;

    final List<ScheduledDay> daysList = [];

    for (int offset = 0; offset < maxAdvanceDays; offset++) {
      final candidateDate = today.add(Duration(days: offset));
      final dateStr = DateFormat('yyyy-MM-dd').format(candidateDate);
      final isToday = offset == 0;

      if (blockedDates.contains(dateStr)) {
        daysList.add(
          _createScheduledDay(
            candidateDate,
            isAvailable: false,
            isToday: isToday,
            reason: 'Fecha no disponible',
          ),
        );
        continue;
      }

      // Evaluamos el mediodía de ese día para verificar si el comercio abre ese día
      final middayCandidate = DateTime(candidateDate.year, candidateDate.month, candidateDate.day, 12, 0);
      final isOperatingDay = OperatingHoursResolver.isStoreOpen(
        schedule: schedule,
        manualOpen: true,
        timezone: timezone,
        targetDateTime: middayCandidate,
      );

      final reason = !isOperatingDay ? 'Cerrado este día' : '';
      daysList.add(
        _createScheduledDay(
          candidateDate,
          isAvailable: isOperatingDay,
          isToday: isToday,
          reason: reason,
        ),
      );
    }

    return daysList;
  }

  static ScheduledDay _createScheduledDay(
    DateTime date, {
    required bool isAvailable,
    required bool isToday,
    required String reason,
  }) {
    String dow;
    String dnum;
    String mon;
    try {
      dow = _dayOfWeekFmt.format(date).toUpperCase();
      dnum = _dayNumFmt.format(date);
      mon = _monthFmt.format(date).toUpperCase();
    } catch (_) {
      const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
      const monNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      dow = dayNames[(date.weekday - 1) % 7];
      dnum = date.day.toString();
      mon = monNames[(date.month - 1) % 12];
    }

    return ScheduledDay(
      date: date,
      dateStr: DateFormat('yyyy-MM-dd').format(date),
      dayOfWeekLabel: dow,
      dayNumberLabel: dnum,
      monthLabel: mon,
      isAvailable: isAvailable,
      isToday: isToday,
      reason: reason,
    );
  }

  static List<ScheduledSlot> getAvailableSlots({
    required BusinessEntity business,
    required DateTime selectedDate,
    String timezone = canonicalTimezone,
    DateTime? now,
  }) {
    final current = now ?? DateTime.now();
    final leadMinutes = business.scheduledMinLeadTimeMinutes;
    final prepBufferMinutes = business.scheduledPreparationBufferMinutes;
    final totalLeadMinutes = leadMinutes + prepBufferMinutes;
    final earliestDeliveryTime = current.add(Duration(minutes: totalLeadMinutes));

    final slotInterval = business.scheduledSlotIntervalMinutes;
    final windowDuration = business.scheduledDeliveryWindowMinutes;

    final targetDateOnly = DateTime(selectedDate.year, selectedDate.month, selectedDate.day);
    final nowDateOnly = DateTime(current.year, current.month, current.day);
    final isSelectedDateToday = targetDateOnly.isAtSameMomentAs(nowDateOnly);

    final operatingHours = OperatingHoursResolver.getOperatingIntervalsForDay(
      schedule: business.horario,
      targetDate: selectedDate,
    );

    if (operatingHours.isEmpty) {
      return [];
    }

    final List<ScheduledSlot> slots = [];

    for (final interval in operatingHours) {
      DateTime slotStart = DateTime(
        selectedDate.year,
        selectedDate.month,
        selectedDate.day,
        interval.openHour,
        interval.openMinute,
      );

      final intervalEnd = DateTime(
        selectedDate.year,
        selectedDate.month,
        selectedDate.day,
        interval.closeHour,
        interval.closeMinute,
      );

      while (slotStart.isBefore(intervalEnd)) {
        final slotEnd = slotStart.add(Duration(minutes: windowDuration));
        if (slotEnd.isAfter(intervalEnd)) break;

        final isPastLeadTime = !isSelectedDateToday || slotStart.isAfter(earliestDeliveryTime);

        String formatTime(DateTime dt) {
          try {
            return _timeFmt.format(dt);
          } catch (_) {
            final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
            final m = dt.minute.toString().padLeft(2, '0');
            final ampm = dt.hour >= 12 ? 'PM' : 'AM';
            return '$h:$m $ampm';
          }
        }

        final startLabel = formatTime(slotStart);
        final endLabel = formatTime(slotEnd);
        final label = '$startLabel - $endLabel';

        final slotKey =
            '${DateFormat('yyyy-MM-dd').format(slotStart)}_${slotStart.hour.toString().padLeft(2, '0')}${slotStart.minute.toString().padLeft(2, '0')}_${slotEnd.hour.toString().padLeft(2, '0')}${slotEnd.minute.toString().padLeft(2, '0')}';

        slots.add(
          ScheduledSlot(
            slotKey: slotKey,
            label: label,
            windowStartAt: slotStart,
            windowEndAt: slotEnd,
            isAvailable: isPastLeadTime,
            remainingCapacity: isPastLeadTime ? 5 : 0,
            reason: !isPastLeadTime ? 'Ventana expirada o requiere mayor anticipación' : '',
          ),
        );

        slotStart = slotStart.add(Duration(minutes: slotInterval));
      }
    }

    return slots;
  }
}
