/// BLUE SYSTEM DELIVERY ENTERPRISE — COURIER FINANCIAL ENTITIES
/// Canonical schemas for Courier Balances (/courier_balances/{courierId})
/// and Courier Daily Closures (/courier_daily_closures/{closureId}).
/// ADR-018 / Frozen Baseline Compliance.

class CourierBalanceEntity {
  final String courierId;
  final int cashOutstandingCents;
  final int effectiveCashLimitCents;
  final bool isBlockedByCashLimit;
  final int lastCalculatedAt;
  final String? lastActNumber;

  const CourierBalanceEntity({
    required this.courierId,
    required this.cashOutstandingCents,
    required this.effectiveCashLimitCents,
    this.isBlockedByCashLimit = false,
    this.lastCalculatedAt = 0,
    this.lastActNumber,
  });

  double get cashOutstanding => cashOutstandingCents / 100.0;
  double get effectiveCashLimit => effectiveCashLimitCents / 100.0;
  double get remainingCashLimit =>
      (effectiveCashLimitCents - cashOutstandingCents).clamp(0, effectiveCashLimitCents) / 100.0;

  factory CourierBalanceEntity.fromMap(Map<String, dynamic> map, String id) {
    return CourierBalanceEntity(
      courierId: id,
      cashOutstandingCents: (map['cashOutstandingCents'] as num?)?.toInt() ?? 0,
      effectiveCashLimitCents: (map['effectiveCashLimitCents'] as num?)?.toInt() ??
          (map['cashLimitCents'] as num?)?.toInt() ??
          300000, // C$3,000 default
      isBlockedByCashLimit: map['isBlockedByCashLimit'] as bool? ?? false,
      lastCalculatedAt: (map['lastCalculatedAt'] as num?)?.toInt() ?? 0,
      lastActNumber: map['lastActNumber'] as String?,
    );
  }

  Map<String, dynamic> toMap() => {
        'courierId': courierId,
        'cashOutstandingCents': cashOutstandingCents,
        'effectiveCashLimitCents': effectiveCashLimitCents,
        'isBlockedByCashLimit': isBlockedByCashLimit,
        'lastCalculatedAt': lastCalculatedAt,
        'lastActNumber': lastActNumber,
      };
}

enum ClosureStatus { submitted, pendingApproval, approved, rejected }

class CourierDailyClosureEntity {
  final String closureId;
  final String courierId;
  final String courierName;
  final int totalCollectedCents;
  final String bankReference;
  final String depositReceiptUrl;
  final ClosureStatus status;
  final int createdAt;
  final int? approvedAt;
  final String? approvedBy;
  final String? actNumber;

  String get id => closureId;

  const CourierDailyClosureEntity({
    required this.closureId,
    required this.courierId,
    required this.courierName,
    required this.totalCollectedCents,
    required this.bankReference,
    required this.depositReceiptUrl,
    required this.status,
    required this.createdAt,
    this.approvedAt,
    this.approvedBy,
    this.actNumber,
  });

  double get totalCollected => totalCollectedCents / 100.0;

  factory CourierDailyClosureEntity.fromMap(Map<String, dynamic> map, String id) {
    final statusStr = (map['status'] as String? ?? 'SUBMITTED').toUpperCase();
    ClosureStatus parsedStatus;
    if (statusStr == 'APPROVED') {
      parsedStatus = ClosureStatus.approved;
    } else if (statusStr == 'REJECTED') {
      parsedStatus = ClosureStatus.rejected;
    } else if (statusStr == 'PENDING_APPROVAL') {
      parsedStatus = ClosureStatus.pendingApproval;
    } else {
      parsedStatus = ClosureStatus.submitted;
    }

    return CourierDailyClosureEntity(
      closureId: id,
      courierId: map['courierId'] as String? ?? '',
      courierName: map['courierName'] as String? ?? '',
      totalCollectedCents: (map['totalCollectedCents'] as num?)?.toInt() ??
          ((map['totalCollected'] as num?)?.toDouble() ?? 0.0 * 100).toInt(),
      bankReference: map['bankReference'] as String? ?? '',
      depositReceiptUrl: map['depositReceiptUrl'] as String? ?? map['receiptUrl'] as String? ?? '',
      status: parsedStatus,
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      approvedAt: (map['approvedAt'] as num?)?.toInt(),
      approvedBy: map['approvedBy'] as String?,
      actNumber: map['actNumber'] as String?,
    );
  }

  Map<String, dynamic> toMap() => {
        'closureId': closureId,
        'courierId': courierId,
        'courierName': courierName,
        'totalCollectedCents': totalCollectedCents,
        'bankReference': bankReference,
        'depositReceiptUrl': depositReceiptUrl,
        'status': status == ClosureStatus.approved
            ? 'APPROVED'
            : (status == ClosureStatus.rejected ? 'REJECTED' : 'PENDING_APPROVAL'),
        'createdAt': createdAt,
        'approvedAt': approvedAt,
        'approvedBy': approvedBy,
      };
}
