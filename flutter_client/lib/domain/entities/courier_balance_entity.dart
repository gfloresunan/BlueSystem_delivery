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
  final String? status;
  final String? lastDepositVoucher;
  final int? lastDepositAmountCents;

  const CourierBalanceEntity({
    required this.courierId,
    required this.cashOutstandingCents,
    required this.effectiveCashLimitCents,
    this.isBlockedByCashLimit = false,
    this.lastCalculatedAt = 0,
    this.lastActNumber,
    this.status,
    this.lastDepositVoucher,
    this.lastDepositAmountCents,
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
      status: map['status'] as String?,
      lastDepositVoucher: map['lastDepositVoucher'] as String?,
      lastDepositAmountCents: (map['lastDepositAmountCents'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toMap() => {
        'courierId': courierId,
        'cashOutstandingCents': cashOutstandingCents,
        'effectiveCashLimitCents': effectiveCashLimitCents,
        'isBlockedByCashLimit': isBlockedByCashLimit,
        'lastCalculatedAt': lastCalculatedAt,
        'lastActNumber': lastActNumber,
        if (status != null) 'status': status,
        if (lastDepositVoucher != null) 'lastDepositVoucher': lastDepositVoucher,
        if (lastDepositAmountCents != null) 'lastDepositAmountCents': lastDepositAmountCents,
      };
}

enum ClosureStatus { submitted, pendingApproval, approved, rejected }

class CourierDailyClosureEntity {
  final String closureId;
  final String courierId;
  final String courierName;
  final int totalCollectedCents;
  final String bankName;
  final String bankReference;
  final String depositReceiptUrl;
  final ClosureStatus status;
  final String rawStatus;
  final int createdAt;
  final int? approvedAt;
  final String? approvedBy;
  final String? actNumber;
  final String? verificationCode;
  final String? rejectionReason;
  final String? businessDate;
  final int ordersCount;

  String get id => closureId;

  const CourierDailyClosureEntity({
    required this.closureId,
    required this.courierId,
    required this.courierName,
    required this.totalCollectedCents,
    this.bankName = '',
    required this.bankReference,
    required this.depositReceiptUrl,
    required this.status,
    this.rawStatus = 'OPEN',
    required this.createdAt,
    this.approvedAt,
    this.approvedBy,
    this.actNumber,
    this.verificationCode,
    this.rejectionReason,
    this.businessDate,
    this.ordersCount = 0,
  });

  double get totalCollected => totalCollectedCents / 100.0;

  factory CourierDailyClosureEntity.fromMap(Map<String, dynamic> map, String id) {
    final statusStr = (map['status'] as String? ?? 'SUBMITTED').toUpperCase();
    ClosureStatus parsedStatus;
    if (statusStr == 'APPROVED' || statusStr == 'VERIFIED') {
      parsedStatus = ClosureStatus.approved;
    } else if (statusStr == 'REJECTED') {
      parsedStatus = ClosureStatus.rejected;
    } else if (statusStr == 'PENDING_APPROVAL' ||
        statusStr == 'PENDING_ADMIN_VERIFICATION' ||
        statusStr == 'PENDING_VERIFICATION' ||
        statusStr == 'PENDING_AUDIT') {
      parsedStatus = ClosureStatus.pendingApproval;
    } else {
      parsedStatus = ClosureStatus.submitted;
    }

    final bankDeposit = map['bankDeposit'] as Map<String, dynamic>?;
    final officialAct = map['officialAct'] as Map<String, dynamic>?;

    final resolvedBankName = (bankDeposit?['bankName'] as String?) ??
        (map['bankName'] as String?) ??
        '';

    final resolvedBankRef = (bankDeposit?['bankReference'] as String?) ??
        (map['bankReference'] as String?) ??
        '';

    final resolvedReceiptUrl = (bankDeposit?['receiptDownloadUrl'] as String?) ??
        (map['depositReceiptUrl'] as String?) ??
        (map['receiptUrl'] as String?) ??
        '';

    final resolvedTotalCents = (bankDeposit?['depositAmountCents'] as num?)?.toInt() ??
        (map['totalCollectedCents'] as num?)?.toInt() ??
        (map['depositAmountCents'] as num?)?.toInt() ??
        (map['expectedAmountCents'] as num?)?.toInt() ??
        (((map['totalCollected'] as num?)?.toDouble() ?? 0.0) * 100).toInt();

    final resolvedActNumber = (officialAct?['actNumber'] as String?) ??
        (map['actNumber'] as String?);

    final resolvedVerificationCode = (officialAct?['verificationCode'] as String?) ??
        (map['verificationCode'] as String?);

    final resolvedApprovedAt = (map['verifiedAt'] as num?)?.toInt() ??
        (map['approvedAt'] as num?)?.toInt();

    final resolvedApprovedBy = (map['verifiedByName'] as String?) ??
        (map['verifiedByUid'] as String?) ??
        (officialAct?['supervisorName'] as String?) ??
        (map['approvedBy'] as String?);

    return CourierDailyClosureEntity(
      closureId: id,
      courierId: map['courierId'] as String? ?? '',
      courierName: (officialAct?['courierName'] as String?) ??
          (map['courierName'] as String?) ??
          '',
      totalCollectedCents: resolvedTotalCents,
      bankName: resolvedBankName,
      bankReference: resolvedBankRef,
      depositReceiptUrl: resolvedReceiptUrl,
      status: parsedStatus,
      rawStatus: statusStr,
      createdAt: (map['createdAt'] as num?)?.toInt() ??
          (map['createdAtMs'] as num?)?.toInt() ??
          0,
      approvedAt: resolvedApprovedAt,
      approvedBy: resolvedApprovedBy,
      actNumber: resolvedActNumber,
      verificationCode: resolvedVerificationCode,
      rejectionReason: map['rejectionReason'] as String?,
      businessDate: map['businessDate'] as String?,
      ordersCount: (map['ordersCount'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'closureId': closureId,
        'courierId': courierId,
        'courierName': courierName,
        'totalCollectedCents': totalCollectedCents,
        'bankName': bankName,
        'bankReference': bankReference,
        'depositReceiptUrl': depositReceiptUrl,
        'status': status == ClosureStatus.approved
            ? 'APPROVED'
            : (status == ClosureStatus.rejected
                ? 'REJECTED'
                : (status == ClosureStatus.pendingApproval
                    ? 'PENDING_APPROVAL'
                    : 'SUBMITTED')),
        'createdAt': createdAt,
        'approvedAt': approvedAt,
        'approvedBy': approvedBy,
        if (actNumber != null) 'actNumber': actNumber,
        if (verificationCode != null) 'verificationCode': verificationCode,
        if (rejectionReason != null) 'rejectionReason': rejectionReason,
        if (businessDate != null) 'businessDate': businessDate,
        'ordersCount': ordersCount,
      };
}
