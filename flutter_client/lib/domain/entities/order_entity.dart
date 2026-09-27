/// BLUE SYSTEM DELIVERY ENTERPRISE — ORDER DOMAIN ENTITY
/// Canonical schema for Commerce Orders (/orders/{orderId}).

enum OrderStatus {
  pending,
  accepted,
  preparing,
  readyForPickup,
  dispatched,
  arrivedAtCustomer,
  delivered,
  cancelled,
  rejected,
}

enum PaymentMethod { cash, card, online, transfer }

class OrderItemEntity {
  final String productId;
  final String title;
  final int quantity;
  final double unitPrice;
  final double subtotal;
  final String? notes;

  String get name => title;

  const OrderItemEntity({
    required this.productId,
    required this.title,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
    this.notes,
  });

  factory OrderItemEntity.fromMap(Map<String, dynamic> map) {
    final qty = (map['quantity'] as num?)?.toInt() ?? 1;
    final price = (map['price'] as num?)?.toDouble() ??
        (map['unitPrice'] as num?)?.toDouble() ??
        (map['basePrice'] as num?)?.toDouble() ??
        0.0;
    return OrderItemEntity(
      productId: map['productId'] as String? ?? '',
      title: map['productName'] as String? ?? map['title'] as String? ?? map['name'] as String? ?? '',
      quantity: qty,
      unitPrice: price,
      subtotal: (map['subtotal'] as num?)?.toDouble() ?? (price * qty),
      notes: map['notes'] as String?,
    );
  }

  Map<String, dynamic> toMap() => {
        'productId': productId,
        'title': title,
        'quantity': quantity,
        'unitPrice': unitPrice,
        'subtotal': subtotal,
        'notes': notes,
      };
}

class OrderEntity {
  final String orderId;
  final String tenantId;
  final String? brandId;
  final String businessId;
  final String businessName;
  final String? branchId;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String deliveryAddress;
  final double? deliveryLat;
  final double? deliveryLng;
  final double? merchantLat;
  final double? merchantLng;
  final String? assignedCourierId;
  final OrderStatus status;
  final List<OrderItemEntity> items;
  final double subtotal;
  final double deliveryFee;
  final double discount;
  final double total;
  final PaymentMethod paymentMethod;
  final bool isPaid;
  final int createdAt;
  final int updatedAt;

  const OrderEntity({
    required this.orderId,
    required this.tenantId,
    this.brandId,
    required this.businessId,
    this.businessName = '',
    this.branchId,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.deliveryAddress,
    this.deliveryLat,
    this.deliveryLng,
    this.merchantLat,
    this.merchantLng,
    this.assignedCourierId,
    required this.status,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.discount,
    required this.total,
    required this.paymentMethod,
    required this.isPaid,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OrderEntity.fromMap(Map<String, dynamic> map, String id) {
    final origenMap = map['origen'] as Map?;
    final coordMap = map['coordenadas'] as Map?;
    return OrderEntity(
      orderId: id,
      tenantId: map['tenantId'] as String? ?? '',
      brandId: map['brandId'] as String?,
      businessId: map['businessId'] as String? ?? '',
      businessName: map['businessName'] as String? ??
          map['comercioNombre'] as String? ??
          map['restaurantName'] as String? ??
          (origenMap?['nombreComercio'] as String?) ??
          '',
      branchId: map['branchId'] as String?,
      customerId: map['customerId'] as String? ?? map['clienteId'] as String? ?? map['userId'] as String? ?? '',
      customerName: map['customerName'] as String? ?? '',
      customerPhone: map['customerPhone'] as String? ?? '',
      deliveryAddress: map['deliveryAddress'] as String? ?? map['address'] as String? ?? '',
      deliveryLat: (map['deliveryLat'] as num?)?.toDouble() ??
          (map['latitude'] as num?)?.toDouble() ??
          (coordMap?['latitud'] as num?)?.toDouble(),
      deliveryLng: (map['deliveryLng'] as num?)?.toDouble() ??
          (map['longitude'] as num?)?.toDouble() ??
          (coordMap?['longitud'] as num?)?.toDouble(),
      merchantLat: (map['merchantLat'] as num?)?.toDouble() ??
          (map['pickupLat'] as num?)?.toDouble() ??
          (map['pickupLatitude'] as num?)?.toDouble() ??
          (map['businessLat'] as num?)?.toDouble() ??
          (origenMap?['latitud'] as num?)?.toDouble() ??
          (origenMap?['latitude'] as num?)?.toDouble(),
      merchantLng: (map['merchantLng'] as num?)?.toDouble() ??
          (map['pickupLng'] as num?)?.toDouble() ??
          (map['pickupLongitude'] as num?)?.toDouble() ??
          (map['businessLng'] as num?)?.toDouble() ??
          (origenMap?['longitud'] as num?)?.toDouble() ??
          (origenMap?['longitude'] as num?)?.toDouble(),
      assignedCourierId: map['assignedCourierId'] as String? ??
          map['courierId'] as String? ??
          map['motorizadoId'] as String?,
      status: _parseStatus(map['status'] as String?),
      items: (map['items'] as List<dynamic>?)
              ?.map((e) => OrderItemEntity.fromMap(e as Map<String, dynamic>))
              .toList() ??
          [],
      subtotal: (map['subtotal'] as num?)?.toDouble() ?? 0.0,
      deliveryFee: (map['deliveryFee'] as num?)?.toDouble() ?? 0.0,
      discount: (map['discount'] as num?)?.toDouble() ?? 0.0,
      total: (map['total'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: _parsePayment(map['paymentMethod'] as String?),
      isPaid: map['isPaid'] as bool? ?? false,
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (map['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }

  static OrderStatus _parseStatus(String? value) {
    switch (value?.toUpperCase()) {
      case 'ACCEPTED':
      case 'COURIER_ACCEPTED':
      case 'ASIGNADO':
      case 'ASSIGNED':
        return OrderStatus.accepted;
      case 'PREPARING':
      case 'PREPARANDO':
        return OrderStatus.preparing;
      case 'READY':
      case 'READY_FOR_PICKUP':
      case 'READYFORPICKUP':
      case 'LISTO':
      case 'PICKED_UP':
      case 'RECOGIDO':
        return OrderStatus.readyForPickup;
      case 'DISPATCHED':
      case 'ON_WAY':
      case 'IN_TRANSIT':
      case 'EN_CAMINO':
      case 'EN_RUTA':
        return OrderStatus.dispatched;
      case 'ARRIVED':
      case 'ARRIVED_AT_CUSTOMER':
      case 'ARRIVEDATCUSTOMER':
      case 'EN_DESTINO':
        return OrderStatus.arrivedAtCustomer;
      case 'DELIVERED':
      case 'COMPLETED':
      case 'ENTREGADO':
      case 'COMPLETADO':
        return OrderStatus.delivered;
      case 'CANCELLED':
      case 'CANCELADO':
        return OrderStatus.cancelled;
      case 'REJECTED':
      case 'RECHAZADO':
        return OrderStatus.rejected;
      case 'PENDING':
      case 'PENDIENTE':
      default:
        return OrderStatus.pending;
    }
  }

  static PaymentMethod _parsePayment(String? value) {
    switch (value?.toUpperCase()) {
      case 'CARD':
        return PaymentMethod.card;
      case 'ONLINE':
        return PaymentMethod.online;
      case 'TRANSFER':
        return PaymentMethod.transfer;
      case 'CASH':
      default:
        return PaymentMethod.cash;
    }
  }

  Map<String, dynamic> toMap() => {
        'orderId': orderId,
        'tenantId': tenantId,
        'brandId': brandId,
        'businessId': businessId,
        'branchId': branchId,
        'customerId': customerId,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'deliveryAddress': deliveryAddress,
        'deliveryLat': deliveryLat,
        'deliveryLng': deliveryLng,
        'assignedCourierId': assignedCourierId,
        'status': status.name.toUpperCase(),
        'items': items.map((e) => e.toMap()).toList(),
        'subtotal': subtotal,
        'deliveryFee': deliveryFee,
        'discount': discount,
        'total': total,
        'paymentMethod': paymentMethod.name.toUpperCase(),
        'isPaid': isPaid,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}
