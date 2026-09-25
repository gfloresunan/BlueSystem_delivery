/// BLUE SYSTEM DELIVERY ENTERPRISE — COMMERCIAL HOME DASHBOARD
/// High-fidelity contextual dashboard showing active brand, tenant, Gatekeeper module cards, and operations summary.

import 'package:flutter/material.dart';

import '../../../domain/entities/banner_entity.dart';
import '../../../data/services/banner_service.dart';
import '../../providers/session_state.dart';

class CommercialHomeScreen extends StatelessWidget {
  final SessionState sessionState;
  final Function(String routeName) onNavigate;
  final IBannerService? bannerService;

  const CommercialHomeScreen({
    super.key,
    required this.sessionState,
    required this.onNavigate,
    this.bannerService,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = sessionState.currentUser;
    final claims = sessionState.claims;
    final tenant = sessionState.activeTenant;
    final brand = sessionState.activeBrand;
    final subscription = sessionState.activeSubscription;

    final roleName = claims?.role.name.toUpperCase() ?? 'GUEST';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── 1. GREETING & CONTEXT HEADER ─────────────────────────────────
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  theme.colorScheme.primaryContainer,
                  theme.colorScheme.surfaceVariant,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bienvenido, ${user?.displayName ?? user?.email ?? 'Usuario'}',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onPrimaryContainer,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${brand?.displayName ?? 'BlueSystem Delivery'} • ${tenant?.name ?? 'Tenant Activo'}',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onPrimaryContainer.withOpacity(0.8),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Chip(
                      label: Text(
                        roleName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                      backgroundColor: theme.colorScheme.primary,
                      labelStyle: TextStyle(color: theme.colorScheme.onPrimary),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.verified, size: 16, color: theme.colorScheme.primary),
                    const SizedBox(width: 6),
                    Text(
                      'Plan: ${subscription?.planName ?? 'Standard'} (${subscription?.planTier.name.toUpperCase() ?? 'TIER 1'})',
                      style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'GATEKEEPER ACTIVE',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // ─── 1.5 PROMOTIONAL BANNERS CAROUSEL ─────────────────────────────
          if (bannerService != null) _buildBannerCarousel(context),

          // ─── 2. OPERATIONAL MODULES GRID ──────────────────────────────────
          Text(
            'Módulos Comerciales',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          GridView.count(
            crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.2,
            children: [
              _buildModuleCard(
                context,
                moduleKey: 'ORDERS',
                title: 'Pedidos',
                subtitle: 'Flujo y despachos',
                icon: Icons.receipt_long_outlined,
                color: Colors.blue,
                routeName: '/orders',
              ),
              _buildModuleCard(
                context,
                moduleKey: 'TRIPS',
                title: 'Envíos X→Y',
                subtitle: 'Punto a Punto',
                icon: Icons.local_shipping_outlined,
                color: Colors.teal,
                routeName: '/trips',
              ),
              _buildModuleCard(
                context,
                moduleKey: 'CATALOG',
                title: 'Comercio',
                subtitle: 'Productos y Sucursales',
                icon: Icons.storefront_outlined,
                color: Colors.amber,
                routeName: '/merchant',
              ),
              _buildModuleCard(
                context,
                moduleKey: 'FLEET',
                title: 'Flota & GPS',
                subtitle: 'Motorizados y Telemetría',
                icon: Icons.two_wheeler_outlined,
                color: Colors.purple,
                routeName: '/fleet',
              ),
            ],
          ),
          const SizedBox(height: 24),

          // ─── 3. QUICK STATS SUMMARY ───────────────────────────────────────
          Text(
            'Resumen de Actividad',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(
                child: _buildSummaryTile(
                  context,
                  title: 'Pedidos Hoy',
                  value: '—',
                  icon: Icons.shopping_bag_outlined,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryTile(
                  context,
                  title: 'Envíos Activos',
                  value: '—',
                  icon: Icons.moped_outlined,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryTile(
                  context,
                  title: 'Motorizados',
                  value: '—',
                  icon: Icons.people_outline,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildModuleCard(
    BuildContext context, {
    required String moduleKey,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String routeName,
  }) {
    final theme = Theme.of(context);
    final isAllowed = sessionState.canAccess(moduleKey);

    return InkWell(
      onTap: isAllowed ? () => onNavigate(routeName) : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isAllowed
              ? theme.colorScheme.surface
              : theme.colorScheme.surfaceVariant.withOpacity(0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isAllowed
                ? theme.colorScheme.outlineVariant.withOpacity(0.4)
                : theme.colorScheme.outlineVariant.withOpacity(0.2),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: isAllowed ? color : Colors.grey, size: 28),
                if (!isAllowed)
                  const Icon(Icons.lock_outline, size: 16, color: Colors.grey),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: isAllowed ? theme.colorScheme.onSurface : Colors.grey,
                  ),
                ),
                Text(
                  isAllowed ? subtitle : 'No habilitado',
                  style: TextStyle(
                    fontSize: 11,
                    color: isAllowed ? theme.colorScheme.onSurfaceVariant : Colors.grey,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryTile(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
  }) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: theme.colorScheme.primary),
          const SizedBox(height: 8),
          Text(
            value,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _buildBannerCarousel(BuildContext context) {
    final theme = Theme.of(context);
    return StreamBuilder<List<BannerEntity>>(
      stream: bannerService!.watchActiveBanners(),
      builder: (context, snapshot) {
        final banners = snapshot.data ?? [];
        if (banners.isEmpty) return const SizedBox(height: 16);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Promociones & Novedades',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '${banners.length} activas',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 130,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: banners.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, idx) => _buildBannerCard(context, banners[idx]),
              ),
            ),
            const SizedBox(height: 20),
          ],
        );
      },
    );
  }

  Widget _buildBannerCard(BuildContext context, BannerEntity banner) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: () {
        final act = banner.effectiveActionType.toUpperCase();
        if ((act == 'BUSINESS' || act == 'OPENSTORE' || act == 'STORE') && banner.effectiveActionId.isNotEmpty) {
          onNavigate('/merchant');
        } else if (act == 'PRODUCT' || act == 'CATEGORY' || act == 'OPENPROMOTION' || act == 'PROMOTION') {
          onNavigate('/orders');
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 260,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            colors: [
              theme.colorScheme.primary.withOpacity(0.85),
              theme.colorScheme.secondary.withOpacity(0.85),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            if (banner.imageUrl.isNotEmpty)
              Positioned.fill(
                child: Image.network(
                  banner.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.black.withOpacity(0.7),
                    Colors.black.withOpacity(0.2),
                  ],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (banner.titulo.isNotEmpty)
                    Text(
                      banner.titulo,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  if (banner.subtitulo.isNotEmpty)
                    Text(
                      banner.subtitulo,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
