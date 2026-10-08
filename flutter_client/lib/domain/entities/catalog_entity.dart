/// BLUE SYSTEM DELIVERY ENTERPRISE — CATALOG & MERCHANT ENTITIES
/// Clean Architecture Domain Entities for Commercial Multi-Tenant Catalog (1:1 Android Parity).

import 'editorial_ad_entity.dart';
export 'editorial_ad_entity.dart';

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
  final String iconType; // 'EMOJI' | 'SYSTEM_ICON' | 'IMAGE_URL'
  final String type; // 'BUSINESS' | 'PRODUCT'
  final String color;
  final String bgColor;
  final int orderIndex;
  final bool showInHome;
  final bool isFeatured;
  final bool active;
  final String slug;
  final String description;

  const CategoryEntity({
    required this.categoryId,
    required this.name,
    required this.icon,
    this.iconType = 'EMOJI',
    this.type = 'BUSINESS',
    this.color = '#3B82F6',
    this.bgColor = '#EFF6FF',
    this.orderIndex = 0,
    this.showInHome = true,
    this.isFeatured = false,
    this.active = true,
    this.slug = '',
    this.description = '',
  });

  bool get isProductType {
    final t = type.trim().toUpperCase();
    return t == 'PRODUCT' || t == 'PRODUCTO';
  }

  bool get isBusinessType {
    final t = type.trim().toUpperCase();
    return t == 'BUSINESS' || t == 'COMERCIO';
  }

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

    final rawType = (map['type'] as String? ?? map['tipo'] as String? ?? 'BUSINESS').trim().toUpperCase();

    return CategoryEntity(
      categoryId: id.isNotEmpty ? id : (map['id'] as String? ?? ''),
      name: name,
      icon: icon,
      iconType: map['iconType'] as String? ?? 'EMOJI',
      type: rawType,
      color: map['color'] as String? ?? '#3B82F6',
      bgColor: map['bgColor'] as String? ?? '#EFF6FF',
      orderIndex: (map['orderIndex'] as num?)?.toInt() ?? 0,
      showInHome: map['showInHome'] as bool? ?? true,
      isFeatured: map['isFeatured'] as bool? ?? false,
      active: map['active'] as bool? ?? map['isActive'] as bool? ?? true,
      slug: map['slug'] as String? ?? '',
      description: map['description'] as String? ?? map['descripcion'] as String? ?? '',
    );
  }
}

class BranchEntity {
  final String branchId;
  final String tenantId;
  final String businessId;
  final String businessName;
  final String branchName;
  final String name;
  final String address;
  final String phone;
  final String city;
  final double latitude;
  final double longitude;
  final double rating;
  final double distanceKm;
  final bool isOpen;

  const BranchEntity({
    required this.branchId,
    required this.tenantId,
    required this.businessId,
    this.businessName = '',
    this.branchName = '',
    required this.name,
    required this.address,
    required this.phone,
    this.city = 'Managua',
    required this.latitude,
    required this.longitude,
    this.rating = 4.8,
    this.distanceKm = 0.0,
    this.isOpen = true,
  });

  String get effectiveDisplayName =>
      branchName.isNotEmpty ? branchName : (name.isNotEmpty ? name : businessName);

  factory BranchEntity.fromMap(Map<String, dynamic> map, String id) {
    final bName = map['branchName'] as String? ?? '';
    final name = map['name'] as String? ?? map['nombre'] as String? ?? bName;
    final bizName = map['businessName'] as String? ?? map['comercioNombre'] as String? ?? '';

    return BranchEntity(
      branchId: id.isNotEmpty ? id : (map['branchId'] as String? ?? map['id'] as String? ?? ''),
      tenantId: map['tenantId'] as String? ?? '',
      businessId: map['businessId'] as String? ?? map['comercioId'] as String? ?? '',
      businessName: bizName,
      branchName: bName.isNotEmpty ? bName : name,
      name: name,
      address: map['address'] as String? ?? map['direccion'] as String? ?? '',
      phone: map['phone'] as String? ?? map['telefono'] as String? ?? '',
      city: map['city'] as String? ?? map['ciudad'] as String? ?? 'Managua',
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      rating: (map['rating'] as num?)?.toDouble() ?? 4.8,
      distanceKm: (map['distanceKm'] as num?)?.toDouble() ?? 0.0,
      isOpen: map['isOpen'] as bool? ?? map['abierto'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'branchId': branchId,
      'tenantId': tenantId,
      'businessId': businessId,
      'businessName': businessName,
      'branchName': branchName,
      'name': name,
      'address': address,
      'phone': phone,
      'latitude': latitude,
      'longitude': longitude,
      'rating': rating,
      'distanceKm': distanceKm,
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
  final int unitsSold30d;
  final bool priceParityVerified;
  final int? priceParityVerifiedAt;
  final int? activatedAt;
  final Map<String, dynamic>? weeklySchedule;
  final double? calculatedDistanceKm;
  final bool scheduledOrdersEnabled;

  Map<String, dynamic>? get horario => weeklySchedule;
  int get scheduledMaxAdvanceDays => 7;
  List<String> get scheduledBlockedDates => const [];
  int get scheduledMinLeadTimeMinutes => 60;
  int get scheduledPreparationBufferMinutes => 30;
  int get scheduledSlotIntervalMinutes => 60;
  int get scheduledDeliveryWindowMinutes => 60;

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
    this.unitsSold30d = 0,
    this.priceParityVerified = false,
    this.priceParityVerifiedAt,
    this.activatedAt,
    this.weeklySchedule,
    this.calculatedDistanceKm,
    this.scheduledOrdersEnabled = true,
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

  BusinessEntity copyWith({
    double? calculatedDistanceKm,
    bool? isOpen,
  }) {
    return BusinessEntity(
      businessId: businessId,
      tenantId: tenantId,
      name: name,
      category: category,
      address: address,
      phone: phone,
      description: description,
      logoUrl: logoUrl,
      bannerUrl: bannerUrl,
      deliveryTime: deliveryTime,
      rating: rating,
      ratingCount: ratingCount,
      deliveryFee: deliveryFee,
      minOrder: minOrder,
      isOpen: isOpen ?? this.isOpen,
      isFeatured: isFeatured,
      isVerified: isVerified,
      isActive: isActive,
      isDeleted: isDeleted,
      status: status,
      lifecycleStatus: lifecycleStatus,
      city: city,
      latitude: latitude,
      longitude: longitude,
      unitsSold30d: unitsSold30d,
      priceParityVerified: priceParityVerified,
      priceParityVerifiedAt: priceParityVerifiedAt,
      activatedAt: activatedAt,
      weeklySchedule: weeklySchedule,
      calculatedDistanceKm: calculatedDistanceKm ?? this.calculatedDistanceKm,
      scheduledOrdersEnabled: scheduledOrdersEnabled ?? this.scheduledOrdersEnabled,
    );
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

    // HOTFIX: Safe Map extraction — Firestore may return GeoPoint (not Map) for
    // 'location'/'coordenadas'. The hard `as Map?` cast throws TypeError in
    // release mode (minified as 'minified:uq'). Use `is Map` guard instead.
    final locRaw = map['location'];
    final coordRaw = map['coordenadas'];
    final locMap = locRaw is Map ? locRaw : null;
    final coordMap = coordRaw is Map ? coordRaw : null;

    // Also extract lat/lng directly from GeoPoint if present
    double? geoPointLat(dynamic obj) {
      if (obj == null) return null;
      try {
        // GeoPoint exposes .latitude and .longitude as getters
        final dynamic g = obj;
        final dynamic latVal = g.latitude;
        if (latVal is num) return latVal.toDouble();
      } catch (_) {}
      return null;
    }
    double? geoPointLng(dynamic obj) {
      if (obj == null) return null;
      try {
        final dynamic g = obj;
        final dynamic lngVal = g.longitude;
        if (lngVal is num) return lngVal.toDouble();
      } catch (_) {}
      return null;
    }

    final lat = (map['latitude'] as num?)?.toDouble() ??
        (locMap?['latitude'] as num?)?.toDouble() ??
        (coordMap?['latitud'] as num?)?.toDouble() ??
        geoPointLat(locRaw) ??
        geoPointLat(coordRaw) ??
        0.0;
    final lng = (map['longitude'] as num?)?.toDouble() ??
        (locMap?['longitude'] as num?)?.toDouble() ??
        (coordMap?['longitud'] as num?)?.toDouble() ??
        geoPointLng(locRaw) ??
        geoPointLng(coordRaw) ??
        0.0;

    final unitsSold = (map['unitsSold30d'] as num?)?.toInt() ?? (map['unitsSold'] as num?)?.toInt() ?? 0;
    final priceParity = map['priceParityVerified'] as bool? ?? map['mismoPrecioVerificado'] as bool? ?? false;

    int? parseTimestamp(dynamic val) {
      if (val == null) return null;
      if (val is num) return val.toInt();
      if (val is Map && val['_seconds'] != null) {
        return (val['_seconds'] as num).toInt() * 1000;
      }
      // Handle native Firestore Timestamp object (has .millisecondsSinceEpoch)
      try {
        final dynamic ts = val;
        final dynamic ms = ts.millisecondsSinceEpoch;
        if (ms is num) return ms.toInt();
        final dynamic sec = ts.seconds;
        if (sec is num) return sec.toInt() * 1000;
      } catch (_) {}
      return null;
    }

    final Map<String, dynamic>? sched = map['weeklySchedule'] is Map
        ? Map<String, dynamic>.from(map['weeklySchedule'] as Map)
        : (map['schedule'] is Map
            ? Map<String, dynamic>.from(map['schedule'] as Map)
            : (map['horario'] is Map ? Map<String, dynamic>.from(map['horario'] as Map) : null));

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
      unitsSold30d: unitsSold,
      priceParityVerified: priceParity,
      priceParityVerifiedAt: parseTimestamp(map['priceParityVerifiedAt']),
      activatedAt: parseTimestamp(map['activatedAt']),
      weeklySchedule: sched,
      scheduledOrdersEnabled: map['scheduledOrdersEnabled'] as bool? ?? map['pedidosProgramadosHabilitados'] as bool? ?? true,
    );
  }
}

/// SPRINT 15 / C2D & ENTERPRISE 2.0 DASHBOARD CONFIGURATION (1:1 Android Models.kt:1114-1246)
class DashboardConfigEntity {
  final bool showBanners;
  final bool showCategories;
  final bool showBranchesBlock;
  final bool showFeaturedBusinesses;
  final bool showFeaturedProducts;
  final bool showPromotions;
  final bool showSamePrice;
  final bool showFlashDeals;
  final bool showTopSelling;
  final bool showRecommended;
  final bool showNewBusinesses;
  final bool showQuickReorder;
  final bool showFavoritesBlock;
  final bool showNearbyBusinesses;
  final bool showAllBusinesses;
  final bool showExpressDeliveryBanner; // FAIL-CLOSED: Oculto por defecto (Addendum P0-02)
  final bool xToYServiceEnabled; // FAIL-CLOSED: Deshabilitado por defecto (Addendum P0-02)
  final bool showEditorialAds; // Dynamic Editorial Ads (BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001)
  final bool showServiceExplorer; // Explora Servicios / Category Experience Manager (BSD-CUSTOMER-SERVICE-CATEGORY-HUB-001)
  final double nearbyInitialRadiusKm;
  final double nearbySecondaryRadiusKm;
  final double nearbyMaxRadiusKm;
  final int nearbyMinimumMerchantCount;
  final bool nearbyAutoExpandEnabled;
  final String nearbyOrdering; // 'nearest' | 'rating'
  final List<String> sectionOrder;
  final Map<String, String> blockTitles;
  final Map<String, BlockActionConfigEntity> blockActions;

  static const List<String> canonicalDefaultSectionOrder = [
    'BANNERS',
    'SERVICE_EXPLORER',
    'CATEGORIES',
    'BRANCHES',
    'NEARBY',
    'FEATURED_BUSINESSES',
    'FEATURED_PRODUCTS',
    'FLASH_DEALS',
    'PROMOTIONS',
    'SAME_PRICE',
    'TOP_SELLING',
    'RECOMMENDED',
    'NEW_BUSINESSES',
    'QUICK_REORDER',
    'FAVORITES',
    'EXPRESS_DELIVERY',
    'EDITORIAL_ADS',
    'ALL_BUSINESSES',
  ];

  static const Map<String, String> canonicalDefaultBlockTitles = {
    'BANNERS': 'Banners Promocionales',
    'SERVICE_EXPLORER': 'Explora servicios',
    'CATEGORIES': '¿Qué se te antoja hoy?',
    'BRANCHES': 'Sucursales por Comercio 🏢',
    'NEARBY': 'Comercios Cerca de Ti 🏢',
    'FEATURED_BUSINESSES': 'Comercios Destacados ⭐',
    'FEATURED_PRODUCTS': 'Productos Estrella ⭐',
    'FLASH_DEALS': 'Ofertas Flash ⚡ (Tiempo Limitado)',
    'PROMOTIONS': 'Productos con Descuentos 🏷️',
    'SAME_PRICE': 'Mismo Precio que en Local 💰',
    'TOP_SELLING': 'Los Más Vendidos 🔥',
    'RECOMMENDED': 'Recomendados para ti 🎯',
    'NEW_BUSINESSES': 'Comercios Nuevos 🟢',
    'QUICK_REORDER': 'Volver a Pedir 🔄',
    'FAVORITES': 'Tus Comercios Favoritos ❤️',
    'EXPRESS_DELIVERY': 'Envíos Express X→Y',
    'EDITORIAL_ADS': 'Destacados y Novedades',
    'ALL_BUSINESSES': 'Todos los Comercios 🏪',
  };

  const DashboardConfigEntity({
    this.showBanners = true,
    this.showCategories = true,
    this.showBranchesBlock = true,
    this.showFeaturedBusinesses = true,
    this.showFeaturedProducts = true,
    this.showPromotions = true,
    this.showSamePrice = true,
    this.showFlashDeals = true,
    this.showTopSelling = true,
    this.showRecommended = true,
    this.showNewBusinesses = true,
    this.showQuickReorder = true,
    this.showFavoritesBlock = true,
    this.showNearbyBusinesses = true,
    this.showAllBusinesses = true,
    this.showExpressDeliveryBanner = false,
    this.xToYServiceEnabled = false,
    this.showEditorialAds = true,
    this.showServiceExplorer = true,
    this.nearbyInitialRadiusKm = 5.0,
    this.nearbySecondaryRadiusKm = 10.0,
    this.nearbyMaxRadiusKm = 15.0,
    this.nearbyMinimumMerchantCount = 5,
    this.nearbyAutoExpandEnabled = true,
    this.nearbyOrdering = 'nearest',
    this.sectionOrder = canonicalDefaultSectionOrder,
    this.blockTitles = const {},
    this.blockActions = const {},
  });

  /// Normaliza la lista de orden de secciones (1:1 Android Models.kt:1196-1214):
  /// 1. Respeta el orden remoto válido.
  /// 2. Elimina IDs duplicados conservando la primera aparición válida.
  /// 3. Descarta IDs desconocidos.
  /// 4. Anexa al final cualquier sección canónica faltante para evitar pérdida de bloques (incluyendo EDITORIAL_ADS y SERVICE_EXPLORER).
  List<String> getNormalizedSectionOrder() {
    final result = <String>[];
    final knownSet = canonicalDefaultSectionOrder.toSet();

    for (final rawId in sectionOrder) {
      final id = rawId.trim().toUpperCase();
      if (knownSet.contains(id) && !result.contains(id)) {
        result.add(id);
      }
    }

    for (final canonicalId in canonicalDefaultSectionOrder) {
      if (!result.contains(canonicalId)) {
        result.add(canonicalId);
      }
    }

    return result;
  }

  /// Resuelve el título dinámico con degradación segura (1:1 Android Models.kt:1220-1230):
  /// displayTitle = blockTitles[blockId] ?: defaultTitle ?: CANONICAL_DEFAULT
  String getDisplayTitle(String blockId, {String? defaultTitle}) {
    final normalizedId = blockId.trim().toUpperCase();
    final custom = blockTitles[normalizedId]?.trim();
    if (custom != null && custom.isNotEmpty) {
      return custom;
    }
    if (defaultTitle != null && defaultTitle.trim().isNotEmpty) {
      return defaultTitle;
    }
    return canonicalDefaultBlockTitles[normalizedId] ?? blockId;
  }

  /// Obtiene la acción configurada para el encabezado del bloque (Fail-Closed).
  BlockActionConfigEntity? getBlockAction(String blockId) {
    final normalizedId = blockId.trim().toUpperCase();
    final action = blockActions[normalizedId];
    if (action != null && action.isActionable) {
      return action;
    }
    return null;
  }

  factory DashboardConfigEntity.fromMap(Map<String, dynamic> map, {DashboardConfigEntity? base}) {
    final defaultBase = base ?? const DashboardConfigEntity();

    List<String> order = defaultBase.sectionOrder;
    if (map['sectionOrder'] is List) {
      final list = (map['sectionOrder'] as List).map((e) => e.toString()).toList();
      if (list.isNotEmpty) order = list;
    }

    final titles = Map<String, String>.from(defaultBase.blockTitles);
    if (map['blockTitles'] is Map) {
      (map['blockTitles'] as Map).forEach((k, v) {
        if (k != null && v != null) {
          titles[k.toString().trim().toUpperCase()] = v.toString();
        }
      });
    }

    final actions = Map<String, BlockActionConfigEntity>.from(defaultBase.blockActions);
    if (map['blockActions'] is Map) {
      (map['blockActions'] as Map).forEach((k, v) {
        if (k != null && v is Map<String, dynamic>) {
          actions[k.toString().trim().toUpperCase()] = BlockActionConfigEntity.fromMap(v);
        } else if (k != null && v is Map) {
          actions[k.toString().trim().toUpperCase()] = BlockActionConfigEntity.fromMap(Map<String, dynamic>.from(v));
        }
      });
    }

    return DashboardConfigEntity(
      showBanners: map.containsKey('showBanners') ? (map['showBanners'] as bool? ?? defaultBase.showBanners) : defaultBase.showBanners,
      showCategories: map.containsKey('showCategories') ? (map['showCategories'] as bool? ?? defaultBase.showCategories) : defaultBase.showCategories,
      showBranchesBlock: map.containsKey('showBranchesBlock') ? (map['showBranchesBlock'] as bool? ?? defaultBase.showBranchesBlock) : defaultBase.showBranchesBlock,
      showFeaturedBusinesses: map.containsKey('showFeaturedBusinesses') ? (map['showFeaturedBusinesses'] as bool? ?? defaultBase.showFeaturedBusinesses) : defaultBase.showFeaturedBusinesses,
      showFeaturedProducts: map.containsKey('showFeaturedProducts') ? (map['showFeaturedProducts'] as bool? ?? defaultBase.showFeaturedProducts) : defaultBase.showFeaturedProducts,
      showPromotions: map.containsKey('showPromotions') ? (map['showPromotions'] as bool? ?? defaultBase.showPromotions) : defaultBase.showPromotions,
      showSamePrice: map.containsKey('showSamePrice') ? (map['showSamePrice'] as bool? ?? defaultBase.showSamePrice) : defaultBase.showSamePrice,
      showFlashDeals: map.containsKey('showFlashDeals') ? (map['showFlashDeals'] as bool? ?? defaultBase.showFlashDeals) : defaultBase.showFlashDeals,
      showTopSelling: map.containsKey('showTopSelling') ? (map['showTopSelling'] as bool? ?? defaultBase.showTopSelling) : defaultBase.showTopSelling,
      showRecommended: map.containsKey('showRecommended') ? (map['showRecommended'] as bool? ?? defaultBase.showRecommended) : defaultBase.showRecommended,
      showNewBusinesses: map.containsKey('showNewBusinesses') ? (map['showNewBusinesses'] as bool? ?? defaultBase.showNewBusinesses) : defaultBase.showNewBusinesses,
      showQuickReorder: map.containsKey('showQuickReorder') ? (map['showQuickReorder'] as bool? ?? defaultBase.showQuickReorder) : defaultBase.showQuickReorder,
      showFavoritesBlock: map.containsKey('showFavoritesBlock') ? (map['showFavoritesBlock'] as bool? ?? defaultBase.showFavoritesBlock) : defaultBase.showFavoritesBlock,
      showNearbyBusinesses: map.containsKey('showNearbyBusinesses') ? (map['showNearbyBusinesses'] as bool? ?? defaultBase.showNearbyBusinesses) : defaultBase.showNearbyBusinesses,
      showAllBusinesses: map.containsKey('showAllBusinesses') ? (map['showAllBusinesses'] as bool? ?? defaultBase.showAllBusinesses) : defaultBase.showAllBusinesses,
      showExpressDeliveryBanner: map.containsKey('showExpressDeliveryBanner') ? (map['showExpressDeliveryBanner'] as bool? ?? defaultBase.showExpressDeliveryBanner) : defaultBase.showExpressDeliveryBanner,
      xToYServiceEnabled: map.containsKey('xToYServiceEnabled') ? (map['xToYServiceEnabled'] as bool? ?? defaultBase.xToYServiceEnabled) : defaultBase.xToYServiceEnabled,
      showEditorialAds: map.containsKey('showEditorialAds') ? (map['showEditorialAds'] as bool? ?? defaultBase.showEditorialAds) : defaultBase.showEditorialAds,
      showServiceExplorer: map.containsKey('showServiceExplorer') ? (map['showServiceExplorer'] as bool? ?? defaultBase.showServiceExplorer) : defaultBase.showServiceExplorer,
      nearbyInitialRadiusKm: (map['nearbyInitialRadiusKm'] as num?)?.toDouble() ?? defaultBase.nearbyInitialRadiusKm,
      nearbySecondaryRadiusKm: (map['nearbySecondaryRadiusKm'] as num?)?.toDouble() ?? defaultBase.nearbySecondaryRadiusKm,
      nearbyMaxRadiusKm: (map['nearbyMaxRadiusKm'] as num?)?.toDouble() ?? defaultBase.nearbyMaxRadiusKm,
      nearbyMinimumMerchantCount: (map['nearbyMinimumMerchantCount'] as num?)?.toInt() ?? defaultBase.nearbyMinimumMerchantCount,
      nearbyAutoExpandEnabled: map.containsKey('nearbyAutoExpandEnabled') ? (map['nearbyAutoExpandEnabled'] as bool? ?? defaultBase.nearbyAutoExpandEnabled) : defaultBase.nearbyAutoExpandEnabled,
      nearbyOrdering: map['nearbyOrdering'] as String? ?? defaultBase.nearbyOrdering,
      sectionOrder: order,
      blockTitles: titles,
      blockActions: actions,
    );
  }
}

/// SPRINT 15 / FLASH DEALS CANONICAL ENTITY (1:1 Android Models.kt:1112-1128)
class FlashDealEntity {
  final String id;
  final String productId;
  final String title;
  final String productName;
  final double price;
  final double originalPrice;
  final String discountTag;
  final String businessId;
  final String businessName;
  final String imageUrl;
  final int expiresAtMinutes;
  final bool active;
  final DateTime? startAt;
  final DateTime? endAt;
  final DateTime? createdAt;

  const FlashDealEntity({
    required this.id,
    this.productId = '',
    required this.title,
    this.productName = '',
    required this.price,
    this.originalPrice = 0.0,
    this.discountTag = '40% OFF',
    this.businessId = '',
    this.businessName = '',
    this.imageUrl = '',
    this.expiresAtMinutes = 120,
    this.active = true,
    this.startAt,
    this.endAt,
    this.createdAt,
  });

  /// 1:1 Android FirebaseManager.kt:2081-2093 Temporal Validity Check
  bool isCurrentlyValid() {
    if (!active) return false;
    final now = DateTime.now();
    if (startAt != null && startAt!.isAfter(now)) return false;
    if (endAt != null && endAt!.isBefore(now)) return false;
    if (expiresAtMinutes > 0 && createdAt != null) {
      final expireTime = createdAt!.add(Duration(minutes: expiresAtMinutes));
      if (now.isAfter(expireTime)) return false;
    }
    return true;
  }

  FlashDealEntity copyWith({
    String? id,
    String? productId,
    String? title,
    String? productName,
    double? price,
    double? originalPrice,
    String? discountTag,
    String? businessId,
    String? businessName,
    String? imageUrl,
  }) {
    return FlashDealEntity(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      title: title ?? this.title,
      productName: productName ?? this.productName,
      price: price ?? this.price,
      originalPrice: originalPrice ?? this.originalPrice,
      discountTag: discountTag ?? this.discountTag,
      businessId: businessId ?? this.businessId,
      businessName: businessName ?? this.businessName,
      imageUrl: imageUrl ?? this.imageUrl,
      expiresAtMinutes: expiresAtMinutes,
      active: active,
      startAt: startAt,
      endAt: endAt,
      createdAt: createdAt,
    );
  }

  factory FlashDealEntity.fromMap(Map<String, dynamic> map, String id) {
    DateTime? parseDate(dynamic val) {
      if (val == null) return null;
      if (val is DateTime) return val;
      if (val is int) return DateTime.fromMillisecondsSinceEpoch(val);
      if (val is Map && val['_seconds'] != null) {
        return DateTime.fromMillisecondsSinceEpoch((val['_seconds'] as int) * 1000);
      }
      return null;
    }

    final origPrice = (map['originalPrice'] as num?)?.toDouble() ?? (map['precioOriginal'] as num?)?.toDouble() ?? 0.0;
    final dealPrice = (map['price'] as num?)?.toDouble() ?? (map['precio'] as num?)?.toDouble() ?? 0.0;
    String discTag = map['discountTag'] as String? ?? '';
    if (discTag.isEmpty && origPrice > dealPrice && origPrice > 0) {
      final pct = (((origPrice - dealPrice) / origPrice) * 100).toInt();
      discTag = '-$pct%';
    }

    return FlashDealEntity(
      id: id.isNotEmpty ? id : (map['id'] as String? ?? ''),
      productId: map['productId'] as String? ?? '',
      title: map['title'] as String? ?? map['titulo'] as String? ?? map['productName'] as String? ?? '',
      productName: map['productName'] as String? ?? map['nombreProducto'] as String? ?? '',
      price: dealPrice,
      originalPrice: origPrice,
      discountTag: discTag.isNotEmpty ? discTag : '40% OFF',
      businessId: map['businessId'] as String? ?? map['comercioId'] as String? ?? '',
      businessName: map['businessName'] as String? ?? map['comercioNombre'] as String? ?? '',
      imageUrl: map['imageUrl'] as String? ?? map['imagenUrl'] as String? ?? '',
      expiresAtMinutes: (map['expiresAtMinutes'] as num?)?.toInt() ?? 120,
      active: map['active'] as bool? ?? map['activo'] as bool? ?? true,
      startAt: parseDate(map['startAt']),
      endAt: parseDate(map['endAt']),
      createdAt: parseDate(map['createdAt']),
    );
  }
}

