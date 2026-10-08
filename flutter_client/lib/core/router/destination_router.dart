/// BLUE SYSTEM DELIVERY ENTERPRISE — DESTINATION ROUTER
/// 1:1 Parity with Android DestinationRouter.kt
/// Handles polymorphic action routing for Banners, Service Explorer, Dynamic Menus and Popups.

import 'package:flutter/material.dart';
import '../../domain/entities/catalog_entity.dart';
import '../../domain/services/core_service_interfaces.dart';
import '../../presentation/screens/category/category_landing_screen.dart';
import '../../presentation/screens/category/all_services_screen.dart';
import '../../presentation/screens/merchant/merchant_detail_screen.dart';

class DestinationRouter {
  static void navigate({
    required BuildContext context,
    required String navigationType,
    required String target,
    String? title,
    String? categorySlug,
    HomeServiceCategoryEntity? serviceCategory,
    required IMerchantService merchantService,
    Function(ProductEntity product, String businessName)? onAddToCart,
    VoidCallback? onOpenExpress,
  }) {
    final type = navigationType.trim().toUpperCase();

    switch (type) {
      case 'X_TO_Y':
      case 'EXPRESS':
      case 'ENVIOS':
        if (onOpenExpress != null) {
          onOpenExpress();
        }
        break;

      case 'CATEGORY_LANDING':
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => CategoryLandingScreen(
              categoryId: target.isNotEmpty ? target : (serviceCategory?.id ?? ''),
              categoryName: title ?? (serviceCategory?.name ?? ''),
              categorySlug: categorySlug ?? serviceCategory?.slug,
              serviceCategory: serviceCategory,
              merchantService: merchantService,
              onAddToCart: onAddToCart,
              onBack: () => Navigator.of(context).pop(),
            ),
          ),
        );
        break;

      case 'ALL_SERVICES':
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => AllServicesScreen(
              merchantService: merchantService,
              onAddToCart: onAddToCart,
              onBack: () => Navigator.of(context).pop(),
            ),
          ),
        );
        break;

      case 'MERCHANT':
      case 'COMMERCE':
      case 'BUSINESS':
        if (target.isNotEmpty) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => MerchantDetailScreen(
                businessId: target,
                merchantService: merchantService,
                onAddToCart: (p, b) => onAddToCart?.call(p, b),
                onBack: () => Navigator.of(context).pop(),
              ),
            ),
          );
        }
        break;

      case 'PRODUCT':
        if (target.isNotEmpty) {
          // If target is in format businessId?productId=xyz
          String bizId = target;
          String? prodId;
          if (target.contains('?productId=')) {
            final parts = target.split('?productId=');
            bizId = parts[0];
            prodId = parts.length > 1 ? parts[1] : null;
          }
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => MerchantDetailScreen(
                businessId: bizId,
                initialProductId: prodId,
                merchantService: merchantService,
                onAddToCart: (p, b) => onAddToCart?.call(p, b),
                onBack: () => Navigator.of(context).pop(),
              ),
            ),
          );
        }
        break;

      case 'COMING_SOON':
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(title ?? 'Muy Pronto'),
            content: Text(
              target.isNotEmpty ? target : 'Este servicio estará disponible próximamente.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Entendido'),
              ),
            ],
          ),
        );
        break;

      default:
        break;
    }
  }
}
