/// BLUE SYSTEM DELIVERY ENTERPRISE — CATALOG & MERCHANT ENTITIES
/// Clean Architecture Domain Entities for Commercial Multi-Tenant Catalog (1:1 Android Parity).

class ProductEntity {
  final String productId;
  final String tenantId;
  final String businessId;
  final String restaurantId;
  final String comercioId;
  final String branchId;
  final String name;
  final String description;
  final double price;
  final double? originalPrice;
  final int discountPercentage;
  final bool hasDiscount;
  final String category;
  final String categoryName;
  final String subCategoryName;
  final String? imageUrl;
  final bool isAvailable;
  final bool isPopular;
  final bool isTopSeller;
  final int stock;
  final int createdAt;
  final int updatedAt;
  final List<Map<String, dynamic>> optionGroups;

  const ProductEntity({
    required this.productId,
    required this.tenantId,
    required this.businessId,
    this.restaurantId = '',
    this.comercioId = '',
    this.branchId = '',
    required this.name,
    required this.description,
    required this.price,
    this.originalPrice,
    this.discountPercentage = 0,
    this.hasDiscount = false,
    required this.category,
    this.categoryName = '',
    this.subCategoryName = '',
    this.imageUrl,
    this.isAvailable = true,
    this.isPopular = false,
    this.isTopSeller = false,
    this.stock = 0,
    required this.createdAt,
    required this.updatedAt,
    this.optionGroups = const [],
  });

  factory ProductEntity.fromMap(Map<String, dynamic> map, String id) {
    final price = (map['price'] as num?)?.toDouble() ??
        (map['precio'] as num?)?.toDouble() ??
        0.0;
    final origPrice = (map['originalPrice'] as num?)?.toDouble() ??
        (map['precioOriginal'] as num?)?.toDouble();
    final discount = (map['discountPercentage'] as num?)?.toInt() ?? 0;
    final hasDisc = map['hasDiscount'] as bool? ?? (origPrice != null && origPrice > price);

    final cat = map['category'] as String? ??
        map['categoria'] as String? ??
        map['categoryName'] as String? ??
        'General';
    final catName = map['categoryName'] as String? ??
        map['categoria'] as String? ??
        cat;
    final subCat = map['subCategoryName'] as String? ??
        map['subcategoria'] as String? ??
        '';

    final img = map['imageUrl'] as String? ??
        map['mainImage'] as String? ??
        map['thumbnailUrl'] as String? ??
        map['photoUrl'] as String? ??
        (map['images'] is List && (map['images'] as List).isNotEmpty ? (map['images'] as List).first as String? : null);

    final optGroupsRaw = map['optionGroups'];
    final List<Map<String, dynamic>> groups = [];
    if (optGroupsRaw is List) {
      for (final g in optGroupsRaw) {
        if (g is Map) {
          groups.add(Map<String, dynamic>.from(g));
        }
      }
    }

    return ProductEntity(
      productId: id.isNotEmpty ? id : (map['id'] as String? ?? map['productId'] as String? ?? ''),
      tenantId: map['tenantId'] as String? ?? '',
      businessId: map['businessId'] as String? ?? map['comercioId'] as String? ?? map['restaurantId'] as String? ?? '',
      restaurantId: map['restaurantId'] as String? ?? '',
      comercioId: map['comercioId'] as String? ?? '',
      branchId: map['branchId'] as String? ?? '',
      name: map['name'] as String? ?? map['nombre'] as String? ?? 'Producto',
      description: map['description'] as String? ?? map['descripcion'] as String? ?? map['shortDescription'] as String? ?? '',
      price: price,
      originalPrice: origPrice,
      discountPercentage: discount,
      hasDiscount: hasDisc,
      category: cat,
      categoryName: catName,
      subCategoryName: subCat,
      imageUrl: img,
      isAvailable: map['isAvailable'] as bool? ?? map['disponible'] as bool? ?? (map['status'] == 'ACTIVE' || map['status'] == null),
      isPopular: map['isPopular'] as bool? ?? false,
      isTopSeller: map['isTopSeller'] as bool? ?? false,
      stock: (map['stock'] as num?)?.toInt() ?? (map['stockQuantity'] as num?)?.toInt() ?? 0,
      createdAt: (map['createdAt'] is num) ? (map['createdAt'] as num).toInt() : 0,
      updatedAt: (map['updatedAt'] is num) ? (map['updatedAt'] as num).toInt() : 0,
      optionGroups: groups,
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
      'originalPrice': originalPrice,
      'category': category,
      'categoryName': categoryName,
      'subCategoryName': subCategoryName,
      'imageUrl': imageUrl,
      'isAvailable': isAvailable,
      'stock': stock,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class CategoryEntity {
  final String categoryId;
  final String name;
  final String icon;
  final String bgColor;
  final int orderIndex;
  final bool showInHome;
  final bool isFeatured;
  final bool active;
  final String slug;

  const CategoryEntity({
    required this.categoryId,
    required this.name,
    required this.icon,
    this.bgColor = '#EFF6FF',
    this.orderIndex = 0,
    this.showInHome = true,
    this.isFeatured = false,
    this.active = true,
    this.slug = '',
  });

  factory CategoryEntity.fromMap(Map<String, dynamic> map, String id) {
    final name = map['name'] as String? ?? map['nombre'] as String? ?? 'Categoría';
    String icon = map['icon'] as String? ?? map['icono'] as String? ?? '';
    if (icon.isEmpty) {
      final n = name.toLowerCase();
      if (n.contains('restaurante') || n.contains('comida')) {
        icon = '🍔';
      } else if (n.contains('fritanga')) {
        icon = '🥩';
      } else if (n.contains('tecnolog') || n.contains('laptop') || n.contains('pc')) {
        icon = '💻';
      } else if (n.contains('tienda')) {
        icon = '🏪';
      } else if (n.contains('supermercado')) {
        icon = '🛒';
      } else if (n.contains('farmacia')) {
        icon = '💊';
      } else if (n.contains('postre')) {
        icon = '🍰';
      } else if (n.contains('ensalada')) {
        icon = '🥗';
      } else if (n.contains('cafeter')) {
        icon = '☕';
      } else {
        icon = '📁';
      }
    }

    return CategoryEntity(
      categoryId: id.isNotEmpty ? id : (map['id'] as String? ?? ''),
      name: name,
      icon: icon,
      bgColor: map['bgColor'] as String? ?? '#EFF6FF',
      orderIndex: (map['orderIndex'] as num?)?.toInt() ?? 0,
      showInHome: map['showInHome'] as bool? ?? true,
      isFeatured: map['isFeatured'] as bool? ?? false,
      active: map['active'] as bool? ?? map['isActive'] as bool? ?? true,
      slug: map['slug'] as String? ?? '',
    );
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
      name: map['name'] as String? ?? map['nombre'] as String? ?? '',
      address: map['address'] as String? ?? map['direccion'] as String? ?? '',
      phone: map['phone'] as String? ?? map['telefono'] as String? ?? '',
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      isOpen: map['isOpen'] as bool? ?? map['abierto'] as bool? ?? true,
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

class BusinessEntity {
  final String businessId;
  final String tenantId;
  final String name;
  final String category;
  final String address;
  final String phone;
  final String description;
  final String? logoUrl;
  final String? bannerUrl;
  final String deliveryTime;
  final double rating;
  final int ratingCount;
  final double deliveryFee;
  final double minOrder;
  final bool isOpen;
  final bool isFeatured;
  final bool isVerified;
  final bool isActive;
  final bool isDeleted;
  final String status;
  final String lifecycleStatus;
  final String city;
  final double latitude;
  final double longitude;

  const BusinessEntity({
    required this.businessId,
    required this.tenantId,
    required this.name,
    required this.category,
    required this.address,
    required this.phone,
    required this.description,
    this.logoUrl,
    this.bannerUrl,
    this.deliveryTime = '20-35 min',
    this.rating = 4.8,
    this.ratingCount = 18,
    this.deliveryFee = 45.0,
    this.minOrder = 100.0,
    this.isOpen = true,
    this.isFeatured = false,
    this.isVerified = true,
    this.isActive = true,
    this.isDeleted = false,
    this.status = 'ACTIVE',
    this.lifecycleStatus = 'ACTIVE',
    this.city = 'Managua',
    this.latitude = 0.0,
    this.longitude = 0.0,
  });

  /// 1:1 Android Parity validation from BusinessRepository.kt
  bool isValidPublicCatalogItem() {
    if (isDeleted) return false;
    final s = status.trim().toUpperCase();
    if (s == 'DELETED' || s == 'DEPROVISIONED' || s == 'SUSPENDED' || s == 'INACTIVE') return false;
    final ls = lifecycleStatus.trim().toUpperCase();
    if (ls == 'DELETED' || ls == 'DEPROVISIONED' || ls == 'SUSPENDED' || ls == 'INACTIVE') return false;
    if (!isActive) return false;
    if (name.trim().isEmpty) return false;
    return true;
  }

  factory BusinessEntity.fromMap(Map<String, dynamic> map, String id) {
    final name = map['name'] as String? ??
        map['nombre'] as String? ??
        map['comercioNombre'] as String? ??
        map['businessName'] as String? ??
        '';
    final category = map['category'] as String? ??
        map['categoria'] as String? ??
        'Restaurante';
    final logoUrl = map['logoUrl'] as String? ??
        map['photoUrl'] as String? ??
        map['avatarUrl'] as String? ??
        map['logo'] as String?;
    final bannerUrl = map['bannerUrl'] as String? ??
        map['coverUrl'] as String? ??
        map['portadaUrl'] as String? ??
        map['banner'] as String?;
    final deliveryTime = map['deliveryTime'] as String? ??
        map['tiempoEntrega'] as String? ??
        '20-35 min';
    final rating = (map['rating'] as num?)?.toDouble() ??
        (map['ratingAverage'] as num?)?.toDouble() ??
        (map['calificacion'] as num?)?.toDouble() ??
        4.8;
    final ratingCount = (map['ratingCount'] as num?)?.toInt() ??
        (map['reviewsCount'] as num?)?.toInt() ??
        18;
    final deliveryFee = (map['deliveryFee'] as num?)?.toDouble() ??
        (map['costoEnvio'] as num?)?.toDouble() ??
        45.0;
    final minOrder = (map['minOrder'] as num?)?.toDouble() ??
        (map['minimumOrder'] as num?)?.toDouble() ??
        (map['ordenMinima'] as num?)?.toDouble() ??
        100.0;

    final isOpen = map['isOpen'] as bool? ??
        map['abierto'] as bool? ??
        true;
    final isFeatured = map['isFeatured'] as bool? ??
        map['featured'] as bool? ??
        false;
    final isVerified = map['isVerified'] as bool? ??
        map['verified'] as bool? ??
        true;

    final status = (map['status'] as String? ?? 'ACTIVE').trim().toUpperCase();
    final lifecycleStatus = (map['lifecycleStatus'] as String? ?? 'ACTIVE').trim().toUpperCase();
    final isDeleted = map['isDeleted'] as bool? ?? false;
    final active = map['active'] as bool? ?? map['isActive'] as bool? ?? (status == 'ACTIVE');
    final isActive = map['isActive'] as bool? ?? map['active'] as bool? ?? (status == 'ACTIVE');

    final city = map['city'] as String? ??
        map['municipalityName'] as String? ??
        'Managua';

    final locMap = map['location'] as Map?;
    final coordMap = map['coordenadas'] as Map?;
    final lat = (map['latitude'] as num?)?.toDouble() ??
        (locMap?['latitude'] as num?)?.toDouble() ??
        (coordMap?['latitud'] as num?)?.toDouble() ??
        0.0;
    final lng = (map['longitude'] as num?)?.toDouble() ??
        (locMap?['longitude'] as num?)?.toDouble() ??
        (coordMap?['longitud'] as num?)?.toDouble() ??
        0.0;

    return BusinessEntity(
      businessId: id.isNotEmpty ? id : (map['businessId'] as String? ?? ''),
      tenantId: map['tenantId'] as String? ?? '',
      name: name,
      category: category,
      address: map['address'] as String? ?? map['direccion'] as String? ?? 'Managua, Nicaragua',
      phone: map['phone'] as String? ?? map['telefono'] as String? ?? '',
      description: map['description'] as String? ?? map['descripcion'] as String? ?? '',
      logoUrl: logoUrl,
      bannerUrl: bannerUrl,
      deliveryTime: deliveryTime,
      rating: rating,
      ratingCount: ratingCount,
      deliveryFee: deliveryFee,
      minOrder: minOrder,
      isOpen: isOpen,
      isFeatured: isFeatured,
      isVerified: isVerified,
      isActive: isActive && active,
      isDeleted: isDeleted,
      status: status,
      lifecycleStatus: lifecycleStatus,
      city: city,
      latitude: lat,
      longitude: lng,
    );
  }
}
