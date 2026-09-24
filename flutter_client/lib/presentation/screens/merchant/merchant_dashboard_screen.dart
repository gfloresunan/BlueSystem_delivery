/// BLUE SYSTEM DELIVERY ENTERPRISE — MERCHANT DASHBOARD SCREEN
/// Product catalog, branch management, promotions — subscription-gated and tenant-isolated.

import 'package:flutter/material.dart';

import '../../../core/observability/app_logger.dart';
import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../providers/session_state.dart';
import '../../widgets/state_views.dart';

class MerchantDashboardScreen extends StatefulWidget {
  final SessionState sessionState;
  final IMerchantService merchantService;

  const MerchantDashboardScreen({
    super.key,
    required this.sessionState,
    required this.merchantService,
  });

  @override
  State<MerchantDashboardScreen> createState() => _MerchantDashboardScreenState();
}

class _MerchantDashboardScreenState extends State<MerchantDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tenantId = widget.sessionState.claims?.tenantId ?? widget.sessionState.activeTenant?.tenantId ?? '';
    final businessId = widget.sessionState.claims?.businessId ?? '';

    if (!widget.sessionState.canAccess('CATALOG')) {
      return const UnauthorizedView(moduleKey: 'CATALOG');
    }

    if (tenantId.isEmpty || businessId.isEmpty) {
      return const ErrorView(
        title: 'Contexto Comercial Incompleto',
        message: 'No se encontró un negocio activo asociado a su cuenta.',
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Panel Comercial'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.inventory_2_outlined), text: 'Productos'),
            Tab(icon: Icon(Icons.store_outlined), text: 'Sucursales'),
            Tab(icon: Icon(Icons.local_offer_outlined), text: 'Promociones'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildProductsTab(tenantId, businessId),
          _buildBranchesTab(tenantId, businessId),
          _buildPromotionsTab(tenantId),
        ],
      ),
    );
  }

  Widget _buildProductsTab(String tenantId, String businessId) {
    return StreamBuilder<List<ProductEntity>>(
      stream: widget.merchantService.watchProducts(businessId, tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const LoadingView(message: 'Cargando catálogo de productos...');
        }
        if (snapshot.hasError) {
          AppLogger.error('MerchantDashboardScreen', 'Products stream error', snapshot.error);
          return ErrorView(message: 'Error al cargar productos: ${snapshot.error}');
        }
        final products = snapshot.data ?? [];
        if (products.isEmpty) {
          return const EmptyView(
            title: 'Catálogo vacío',
            message: 'No hay productos registrados para esta sucursal.',
            icon: Icons.inventory_2_outlined,
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: products.length,
          itemBuilder: (ctx, i) => _buildProductCard(ctx, products[i]),
        );
      },
    );
  }

  Widget _buildBranchesTab(String tenantId, String businessId) {
    return StreamBuilder<List<BranchEntity>>(
      stream: widget.merchantService.watchBranches(businessId, tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const LoadingView(message: 'Cargando sucursales...');
        }
        if (snapshot.hasError) {
          return ErrorView(message: 'Error al cargar sucursales: ${snapshot.error}');
        }
        final branches = snapshot.data ?? [];
        if (branches.isEmpty) {
          return const EmptyView(
            title: 'Sin sucursales',
            message: 'No hay sucursales activas registradas.',
            icon: Icons.store_outlined,
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: branches.length,
          itemBuilder: (ctx, i) => _buildBranchCard(ctx, branches[i]),
        );
      },
    );
  }

  Widget _buildPromotionsTab(String tenantId) {
    return StreamBuilder<List<PromotionEntity>>(
      stream: widget.merchantService.watchPromotions(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const LoadingView(message: 'Cargando promociones...');
        }
        if (snapshot.hasError) {
          return ErrorView(message: 'Error al cargar promociones: ${snapshot.error}');
        }
        final promos = snapshot.data ?? [];
        if (promos.isEmpty) {
          return const EmptyView(
            title: 'Sin promociones activas',
            message: 'No hay promociones vigentes para este tenant.',
            icon: Icons.local_offer_outlined,
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: promos.length,
          itemBuilder: (ctx, i) => _buildPromoCard(ctx, promos[i]),
        );
      },
    );
  }

  Widget _buildProductCard(BuildContext context, ProductEntity product) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.4)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Icon(Icons.fastfood_outlined, color: theme.colorScheme.primary),
        ),
        title: Text(product.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${product.category} • Stock: ${product.stock}'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '\$${product.price.toStringAsFixed(2)}',
              style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: product.isAvailable ? Colors.green.withOpacity(0.15) : Colors.red.withOpacity(0.15),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                product.isAvailable ? 'DISPONIBLE' : 'AGOTADO',
                style: TextStyle(
                  fontSize: 10,
                  color: product.isAvailable ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBranchCard(BuildContext context, BranchEntity branch) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.4)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: branch.isOpen ? Colors.green.withOpacity(0.15) : Colors.red.withOpacity(0.15),
          child: Icon(Icons.store, color: branch.isOpen ? Colors.green : Colors.red),
        ),
        title: Text(branch.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(branch.address, style: const TextStyle(fontSize: 12)),
            Text(branch.phone, style: const TextStyle(fontSize: 12)),
          ],
        ),
        trailing: Chip(
          label: Text(branch.isOpen ? 'ABIERTO' : 'CERRADO', style: const TextStyle(fontSize: 11)),
          backgroundColor: branch.isOpen ? Colors.green.withOpacity(0.15) : Colors.red.withOpacity(0.15),
        ),
      ),
    );
  }

  Widget _buildPromoCard(BuildContext context, PromotionEntity promo) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.amber.withOpacity(0.4)),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.amber.withOpacity(0.15),
          child: const Icon(Icons.local_offer, color: Colors.amber),
        ),
        title: Text(promo.title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(promo.description),
        trailing: Text(
          '${promo.discountPercent.toStringAsFixed(0)}% OFF',
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.amber, fontSize: 14),
        ),
      ),
    );
  }
}
