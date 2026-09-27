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
  final List<SelectedOptionEntity> selectedOptions;
  final String businessName;

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
    this.selectedOptions = const [],
    this.businessName = '',
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
      businessName: map['businessName'] as String? ?? map['comercioNombre'] as String? ?? map['restaurantName'] as String? ?? '',
    );
  }

  /// Validates if the product is suitable for customer display (1:1 Android FirebaseManager.kt:1855-1945)
  bool isValidPublicProduct() {
    if (!isAvailable) return false;
    if (price <= 0) return false;
    if (name.trim().isEmpty) return false;
    if (businessId.trim().isEmpty) return false;
    if (isTestFixture()) return false;
    return true;
  }

  /// Identifies test fixtures, E2E artifacts, or developer test records (Ficha Técnica 06 / GAP-CAT-01)
  bool isTestFixture() {
    final n = name.trim().toLowerCase();
    if (n.isEmpty) return true;
    if (n == 'aldrich' || n == 'matio' || n == 'test' || n == 'prueba' || n == 'dummy' || n == 'fixture') return true;
    if (n.startsWith('test ') || n.startsWith('prueba ') || n.endsWith(' test') || n.endsWith(' prueba')) return true;
    if (n.contains('certificado e2e') || n.contains('certificación e2e')) return true;
    final b = businessId.trim().toLowerCase();
    if (b == 'demo_comercio' || b == 'test_biz') return true;
    return false;
  }

  List<OptionGroupEntity> get parsedOptionGroups {
    if (optionGroups.isEmpty) return const [];
    return optionGroups.map((g) => OptionGroupEntity.fromMap(g)).toList();
  }

  double get calculatedTotalPrice {
    final optionsCost = selectedOptions.fold(0.0, (sum, opt) => sum + opt.finalPrice);
    return price + optionsCost;
  }

  ProductEntity copyWith({
    String? productId,
    String? tenantId,
    String? businessId,
    String? restaurantId,
    String? comercioId,
    String? branchId,
    String? name,
    String? description,
    double? price,
    double? originalPrice,
    int? discountPercentage,
    bool? hasDiscount,
    String? category,
    String? categoryName,
    String? subCategoryName,
    String? imageUrl,
    bool? isAvailable,
    bool? isPopular,
    bool? isTopSeller,
    int? stock,
    int? createdAt,
    int? updatedAt,
    List<Map<String, dynamic>>? optionGroups,
    List<SelectedOptionEntity>? selectedOptions,
    String? businessName,
  }) {
    return ProductEntity(
      productId: productId ?? this.productId,
      tenantId: tenantId ?? this.tenantId,
      businessId: businessId ?? this.businessId,
      restaurantId: restaurantId ?? this.restaurantId,
      comercioId: comercioId ?? this.comercioId,
      branchId: branchId ?? this.branchId,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      originalPrice: originalPrice ?? this.originalPrice,
      discountPercentage: discountPercentage ?? this.discountPercentage,
      hasDiscount: hasDiscount ?? this.hasDiscount,
      category: category ?? this.category,
      categoryName: categoryName ?? this.categoryName,
      subCategoryName: subCategoryName ?? this.subCategoryName,
      imageUrl: imageUrl ?? this.imageUrl,
      isAvailable: isAvailable ?? this.isAvailable,
      isPopular: isPopular ?? this.isPopular,
      isTopSeller: isTopSeller ?? this.isTopSeller,
      stock: stock ?? this.stock,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      optionGroups: optionGroups ?? this.optionGroups,
      selectedOptions: selectedOptions ?? this.selectedOptions,
      businessName: businessName ?? this.businessName,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'tenantId': tenantId,
      'businessId': businessId,
      'businessName': businessName,
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
      'selectedOptions': selectedOptions.map((o) => o.toMap()).toList(),
    };
  }
}

/// Contrato Canónico 1:1 Android OptionDto (OptionDto.kt)
class OptionItemEntity {
  final String id;
  final String groupId;
  final String restaurantId;
  final String name;
  final double additionalPrice;
  final bool isDefault;
  final String status;
  final int orderIndex;

  const OptionItemEntity({
    required this.id,
    this.groupId = '',
    this.restaurantId = '',
    required this.name,
    this.additionalPrice = 0.0,
    this.isDefault = false,
    this.status = 'ACTIVE',
    this.orderIndex = 0,
  });

  bool get isFree => additionalPrice <= 0.0;

  factory OptionItemEntity.fromMap(Map<String, dynamic> map) {
    return OptionItemEntity(
      id: map['id'] as String? ?? map['optionId'] as String? ?? '',
      groupId: map['groupId'] as String? ?? '',
      restaurantId: map['restaurantId'] as String? ?? '',
      name: map['name'] as String? ?? map['nombre'] as String? ?? '',
      additionalPrice: (map['additionalPrice'] as num?)?.toDouble() ??
          (map['precioAdicional'] as num?)?.toDouble() ??
          (map['price'] as num?)?.toDouble() ??
          0.0,
      isDefault: map['isDefault'] as bool? ?? false,
      status: map['status'] as String? ?? 'ACTIVE',
      orderIndex: (map['orderIndex'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'groupId': groupId,
        'name': name,
        'additionalPrice': additionalPrice,
        'isDefault': isDefault,
        'status': status,
        'orderIndex': orderIndex,
      };
}

/// Contrato Canónico 1:1 Android OptionGroupDto (OptionGroupDto.kt)
class OptionGroupEntity {
  final String id;
  final String restaurantId;
  final String name;
  final String description;
  final int minSelection;
  final int maxSelection;
  final bool isRequired;
  final int allowFreeOptionsCount;
  final int orderIndex;
  final List<OptionItemEntity> options;

  const OptionGroupEntity({
    required this.id,
    this.restaurantId = '',
    required this.name,
    this.description = '',
    this.minSelection = 0,
    this.maxSelection = 1,
    this.isRequired = false,
    this.allowFreeOptionsCount = 0,
    this.orderIndex = 0,
    this.options = const [],
  });

  bool get isSingleChoice => maxSelection == 1;

  factory OptionGroupEntity.fromMap(Map<String, dynamic> map) {
    final rawOptions = map['options'];
    final List<OptionItemEntity> parsedOptions = [];
    if (rawOptions is List) {
      for (final opt in rawOptions) {
        if (opt is Map) {
          parsedOptions.add(OptionItemEntity.fromMap(Map<String, dynamic>.from(opt)));
        }
      }
    }

    return OptionGroupEntity(
      id: map['id'] as String? ?? map['groupId'] as String? ?? '',
      restaurantId: map['restaurantId'] as String? ?? '',
      name: map['name'] as String? ?? map['nombre'] as String? ?? 'Opciones',
      description: map['description'] as String? ?? '',
      minSelection: (map['minSelection'] as num?)?.toInt() ?? 0,
      maxSelection: (map['maxSelection'] as num?)?.toInt() ?? (map['isSingleChoice'] == true ? 1 : 99),
      isRequired: map['isRequired'] as bool? ?? map['required'] as bool? ?? false,
      allowFreeOptionsCount: (map['allowFreeOptionsCount'] as num?)?.toInt() ?? 0,
      orderIndex: (map['orderIndex'] as num?)?.toInt() ?? 0,
      options: parsedOptions,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'description': description,
        'minSelection': minSelection,
        'maxSelection': maxSelection,
        'isRequired': isRequired,
        'options': options.map((o) => o.toMap()).toList(),
      };
}

/// Contrato Canónico 1:1 Android SelectedOption (SelectedOption.kt)
class SelectedOptionEntity {
  final String optionGroupId;
  final String optionGroupName;
  final String optionId;
  final String optionName;
  final double additionalPrice;
  final bool isFreeOption;
  final double finalPrice;

  const SelectedOptionEntity({
    required this.optionGroupId,
    required this.optionGroupName,
    required this.optionId,
    required this.optionName,
    required this.additionalPrice,
    this.isFreeOption = false,
    required this.finalPrice,
  });

  factory SelectedOptionEntity.fromOption({
    required OptionGroupEntity group,
    required OptionItemEntity option,
  }) {
    final isFree = option.additionalPrice <= 0;
    return SelectedOptionEntity(
      optionGroupId: group.id,
      optionGroupName: group.name,
      optionId: option.id,
      optionName: option.name,
      additionalPrice: option.additionalPrice,
      isFreeOption: isFree,
      finalPrice: isFree ? 0.0 : option.additionalPrice,
    );
  }

  factory SelectedOptionEntity.fromMap(Map<String, dynamic> map) {
    final addPrice = (map['additionalPrice'] as num?)?.toDouble() ?? 0.0;
    final isFree = map['isFreeOption'] as bool? ?? (addPrice <= 0);
    return SelectedOptionEntity(
      optionGroupId: map['optionGroupId'] as String? ?? '',
      optionGroupName: map['optionGroupName'] as String? ?? '',
      optionId: map['optionId'] as String? ?? '',
      optionName: map['optionName'] as String? ?? '',
      additionalPrice: addPrice,
      isFreeOption: isFree,
      finalPrice: (map['finalPrice'] as num?)?.toDouble() ?? (isFree ? 0.0 : addPrice),
    );
  }

  Map<String, dynamic> toMap() => {
        'optionGroupId': optionGroupId,
        'optionGroupName': optionGroupName,
        'optionId': optionId,
        'optionName': optionName,
        'additionalPrice': additionalPrice,
        'isFreeOption': isFreeOption,
        'finalPrice': finalPrice,
      };
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
