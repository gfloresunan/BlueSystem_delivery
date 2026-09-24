/// BLUE SYSTEM DELIVERY ENTERPRISE — CATALOG & MERCHANT ENTITIES
/// Clean Architecture Domain Entities for Commercial Multi-Tenant Catalog.

class ProductEntity {
  final String productId;
  final String tenantId;
  final String businessId;
  final String name;
  final String description;
  final double price;
  final String category;
  final String? imageUrl;
  final bool isAvailable;
  final int stock;
  final int createdAt;
  final int updatedAt;

  const ProductEntity({
    required this.productId,
    required this.tenantId,
    required this.businessId,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    this.imageUrl,
    this.isAvailable = true,
    this.stock = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProductEntity.fromMap(Map<String, dynamic> map, String id) {
    return ProductEntity(
      productId: id.isNotEmpty ? id : (map['productId'] as String? ?? ''),
      tenantId: map['tenantId'] as String? ?? '',
      businessId: map['businessId'] as String? ?? '',
      name: map['name'] as String? ?? '',
      description: map['description'] as String? ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      category: map['category'] as String? ?? 'General',
      imageUrl: map['imageUrl'] as String?,
      isAvailable: map['isAvailable'] as bool? ?? true,
      stock: (map['stock'] as num?)?.toInt() ?? 0,
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (map['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'tenantId': tenantId,
      'businessId': businessId,
      'name': name,
      'description': description,
      'price': price,
      'category': category,
      'imageUrl': imageUrl,
      'isAvailable': isAvailable,
      'stock': stock,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class BranchEntity {
  final String branchId;
  final String tenantId;
  final String businessId;
  final String name;
  final String address;
  final String phone;
  final double latitude;
  final double longitude;
  final bool isOpen;

  const BranchEntity({
    required this.branchId,
    required this.tenantId,
    required this.businessId,
    required this.name,
    required this.address,
    required this.phone,
    required this.latitude,
    required this.longitude,
    this.isOpen = true,
  });

  factory BranchEntity.fromMap(Map<String, dynamic> map, String id) {
    return BranchEntity(
      branchId: id.isNotEmpty ? id : (map['branchId'] as String? ?? ''),
      tenantId: map['tenantId'] as String? ?? '',
      businessId: map['businessId'] as String? ?? '',
      name: map['name'] as String? ?? '',
      address: map['address'] as String? ?? '',
      phone: map['phone'] as String? ?? '',
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      isOpen: map['isOpen'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'branchId': branchId,
      'tenantId': tenantId,
      'businessId': businessId,
      'name': name,
      'address': address,
      'phone': phone,
      'latitude': latitude,
      'longitude': longitude,
      'isOpen': isOpen,
    };
  }
}

class PromotionEntity {
  final String promotionId;
  final String tenantId;
  final String title;
  final String description;
  final double discountPercent;
  final String? code;
  final bool isActive;

  const PromotionEntity({
    required this.promotionId,
    required this.tenantId,
    required this.title,
    required this.description,
    required this.discountPercent,
    this.code,
    this.isActive = true,
  });

  factory PromotionEntity.fromMap(Map<String, dynamic> map, String id) {
    return PromotionEntity(
      promotionId: id.isNotEmpty ? id : (map['promotionId'] as String? ?? ''),
      tenantId: map['tenantId'] as String? ?? '',
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? '',
      discountPercent: (map['discountPercent'] as num?)?.toDouble() ?? 0.0,
      code: map['code'] as String?,
      isActive: map['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'promotionId': promotionId,
      'tenantId': tenantId,
      'title': title,
      'description': description,
      'discountPercent': discountPercent,
      'code': code,
      'isActive': isActive,
    };
  }
}
