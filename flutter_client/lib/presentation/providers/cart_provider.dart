/// BLUE SYSTEM DELIVERY ENTERPRISE — CART PROVIDER (STATE MANAGEMENT)
/// Decoupled, reactive cart state management following Flutter best practices.
/// Enforces dynamic deliveryFee resolution from SSOT /businesses/{id}.deliveryFee (fallback C$45.00, NEVER C$35.00).

import 'package:flutter/foundation.dart';
import '../../core/observability/app_logger.dart';
import '../../domain/entities/catalog_entity.dart';

class CartItem {
  final String id;
  final String name;
  final double price;
  final double basePrice;
  final int quantity;
  final String? imageUrl;
  final String businessId;
  final String businessName;
  final String tenantId;
  final String branchId;
  final String compositeKey;
  final List<Map<String, dynamic>> selectedOptions;

  const CartItem({
    required this.id,
    required this.name,
    required this.price,
    required this.basePrice,
    required this.quantity,
    this.imageUrl,
    required this.businessId,
    required this.businessName,
    required this.tenantId,
    this.branchId = '',
    required this.compositeKey,
    this.selectedOptions = const [],
  });

  CartItem copyWith({
    int? quantity,
    double? price,
  }) {
    return CartItem(
      id: id,
      name: name,
      price: price ?? this.price,
      basePrice: basePrice,
      quantity: quantity ?? this.quantity,
      imageUrl: imageUrl,
      businessId: businessId,
      businessName: businessName,
      tenantId: tenantId,
      branchId: branchId,
      compositeKey: compositeKey,
      selectedOptions: selectedOptions,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'basePrice': basePrice,
      'quantity': quantity,
      'imageUrl': imageUrl,
      'businessId': businessId,
      'business': businessName,
      'businessName': businessName,
      'tenantId': tenantId,
      'branchId': branchId,
      'compositeKey': compositeKey,
      'selectedOptions': selectedOptions,
    };
  }
}

class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];
  BusinessEntity? _activeBusiness;

  List<CartItem> get items => List.unmodifiable(_items);
  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);
  bool get isEmpty => _items.isEmpty;
  bool get isNotEmpty => _items.isNotEmpty;

  BusinessEntity? get activeBusiness => _activeBusiness;

  String get businessId => _items.isNotEmpty ? _items.first.businessId : '';
  String get businessName => _items.isNotEmpty ? _items.first.businessName : '';
  String get tenantId => _items.isNotEmpty ? _items.first.tenantId : '';
  String get branchId => _items.isNotEmpty ? _items.first.branchId : '';

  double get subtotal {
    return _items.fold(0.0, (sum, item) => sum + (item.price * item.quantity));
  }

  double? _dynamicDeliveryFee;
  double? get dynamicDeliveryFee => _dynamicDeliveryFee;

  /// Dynamic delivery fee from Core Route Calculation or Business SSOT
  /// Fallback: C$ 45.00 for Commerce Delivery. NEVER C$ 35.00 (which belongs strictly to X->Y package delivery).
  double get deliveryFee {
    if (_items.isEmpty) return 0.0;
    return _dynamicDeliveryFee ?? _activeBusiness?.deliveryFee ?? 45.0;
  }

  double get total {
    if (_items.isEmpty) return 0.0;
    return subtotal + deliveryFee;
  }

  void setDynamicDeliveryFee(double? fee) {
    if (_dynamicDeliveryFee != fee) {
      _dynamicDeliveryFee = fee;
      notifyListeners();
    }
  }

  void setActiveBusiness(BusinessEntity? business) {
    if (_activeBusiness?.businessId == business?.businessId &&
        _activeBusiness?.deliveryFee == business?.deliveryFee) {
      return;
    }
    _activeBusiness = business;
  }

  void addItem({
    required String id,
    required String name,
    required double price,
    double? basePrice,
    String? imageUrl,
    required String businessId,
    required String businessName,
    required String tenantId,
    String branchId = '',
    List<Map<String, dynamic>> selectedOptions = const [],
  }) {
    // If adding from a different business, warn or clear
    if (_items.isNotEmpty && _items.first.businessId != businessId) {
      AppLogger.info('CartProvider', 'Switching merchant from ${_items.first.businessId} to $businessId. Resetting cart.');
      _items.clear();
    }

    final optionsSignature = selectedOptions.isEmpty
        ? 'plain'
        : selectedOptions.map((o) => '${o['name']}:${o['selectedChoice'] ?? o['price']}').join('|');
    final compositeKey = '$id-$optionsSignature';

    final existingIndex = _items.indexWhere((item) => item.compositeKey == compositeKey);
    if (existingIndex >= 0) {
      _items[existingIndex] = _items[existingIndex].copyWith(
        quantity: _items[existingIndex].quantity + 1,
      );
    } else {
      _items.add(
        CartItem(
          id: id,
          name: name,
          price: price,
          basePrice: basePrice ?? price,
          quantity: 1,
          imageUrl: imageUrl,
          businessId: businessId,
          businessName: businessName,
          tenantId: tenantId,
          branchId: branchId,
          compositeKey: compositeKey,
          selectedOptions: selectedOptions,
        ),
      );
    }

    AppLogger.info('CartProvider', 'Added item: $name (x1). Total items: $itemCount');
    notifyListeners();
  }

  void updateQuantity(int index, int delta) {
    if (index < 0 || index >= _items.length) return;

    final currentQty = _items[index].quantity;
    final newQty = currentQty + delta;

    if (newQty <= 0) {
      _items.removeAt(index);
    } else {
      _items[index] = _items[index].copyWith(quantity: newQty);
    }

    notifyListeners();
  }

  void removeItem(int index) {
    if (index >= 0 && index < _items.length) {
      _items.removeAt(index);
      notifyListeners();
    }
  }

  void clearCart() {
    _items.clear();
    notifyListeners();
  }
}
