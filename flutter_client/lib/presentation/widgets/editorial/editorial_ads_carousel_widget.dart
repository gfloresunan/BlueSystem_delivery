/// BLUE SYSTEM DELIVERY ENTERPRISE — EDITORIAL ADS CAROUSEL WIDGET
/// 1:1 Parity with Android Jetpack Compose EditorialAdsSection.kt (ADR-030 Certified).
/// Features:
/// - 5s Autoplay with touch pause & 6s debounce resume.
/// - Zero N+1 Merchant identity cache resolution with snapshot fallback.
/// - Animated Pill/Dot indicator (Active: 20x6 dp pill, Inactive: 6x6 dp circle).
/// - 0dp collapse when empty or toggled off (Zero CLS).
/// - Single card static rendering when count == 1 (No pager, no dots, no autoplay).

import 'dart:async';
import 'package:flutter/material.dart';

import '../../theme/brand_theme_builder.dart';
import '../../../domain/entities/catalog_entity.dart';

class EditorialAdsCarouselWidget extends StatefulWidget {
  final List<HomeEditorialAdEntity> ads;
  final List<BusinessEntity> publicBusinesses;
  final Function(HomeEditorialAdEntity ad)? onAdClick;
  final String title;
  final BlockActionConfigEntity? headerAction;
  final VoidCallback? onHeaderActionClick;

  const EditorialAdsCarouselWidget({
    super.key,
    required this.ads,
    this.publicBusinesses = const [],
    this.onAdClick,
    this.title = 'Destacados y Novedades',
    this.headerAction,
    this.onHeaderActionClick,
  });

  @override
  State<EditorialAdsCarouselWidget> createState() => _EditorialAdsCarouselWidgetState();
}

class _EditorialAdsCarouselWidgetState extends State<EditorialAdsCarouselWidget> {
  late PageController _pageController;
  int _currentPage = 0;
  Timer? _autoplayTimer;
  Timer? _resumeDebounceTimer;
  bool _isUserInteracting = false;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.92);
    _startAutoplay();
  }

  @override
  void didUpdateWidget(covariant EditorialAdsCarouselWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.ads.length != widget.ads.length) {
      _startAutoplay();
    }
  }

  void _startAutoplay() {
    _stopAutoplay();
    if (widget.ads.length <= 1) return;

    _autoplayTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted || _isUserInteracting || widget.ads.length <= 1) return;
      final nextPage = (_currentPage + 1) % widget.ads.length;
      _pageController.animateToPage(
        nextPage,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  void _stopAutoplay() {
    _autoplayTimer?.cancel();
    _autoplayTimer = null;
    _resumeDebounceTimer?.cancel();
    _resumeDebounceTimer = null;
  }

  void _onPointerDown() {
    _isUserInteracting = true;
    _resumeDebounceTimer?.cancel();
  }

  void _onPointerUp() {
    _resumeDebounceTimer?.cancel();
    // 6-second debounce matching Android Compose implementation
    _resumeDebounceTimer = Timer(const Duration(seconds: 6), () {
      if (mounted) {
        setState(() {
          _isUserInteracting = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _stopAutoplay();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.ads.isEmpty) {
      return const SizedBox.shrink(); // 0dp collapse
    }

    final isSingle = widget.ads.length == 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ─── Header: Dynamic Title + Optional Block Action ─────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  widget.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    color: BrandColors.textPrimaryLight,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (widget.headerAction != null && widget.headerAction!.isActionable)
                InkWell(
                  onTap: widget.onHeaderActionClick,
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    child: Text(
                      widget.headerAction!.label.isNotEmpty
                          ? '${widget.headerAction!.label} ›'
                          : 'Ver más ›',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: BrandColors.bluePrimary,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // ─── Carousel or Single Card ──────────────────────────────────────
        if (isSingle)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: _EditorialAdCard(
              ad: widget.ads.first,
              publicBusinesses: widget.publicBusinesses,
              onTap: () => widget.onAdClick?.call(widget.ads.first),
            ),
          )
        else
          Column(
            children: [
              Listener(
                onPointerDown: (_) => _onPointerDown(),
                onPointerUp: (_) => _onPointerUp(),
                child: SizedBox(
                  height: 180,
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: widget.ads.length,
                    onPageChanged: (idx) {
                      setState(() {
                        _currentPage = idx;
                      });
                    },
                    itemBuilder: (context, index) {
                      final ad = widget.ads[index];
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5.0),
                        child: _EditorialAdCard(
                          ad: ad,
                          publicBusinesses: widget.publicBusinesses,
                          onTap: () => widget.onAdClick?.call(ad),
                        ),
                      );
                    },
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // ─── Animated Dots / Pill Indicator ────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(widget.ads.length, (index) {
                  final isSelected = _currentPage == index;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    height: 6,
                    width: isSelected ? 20 : 6,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? BrandColors.bluePrimary
                          : Colors.grey.withOpacity(0.35),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  );
                }),
              ),
            ],
          ),
      ],
    );
  }
}

class _EditorialAdCard extends StatelessWidget {
  final HomeEditorialAdEntity ad;
  final List<BusinessEntity> publicBusinesses;
  final VoidCallback? onTap;

  const _EditorialAdCard({
    required this.ad,
    this.publicBusinesses = const [],
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Zero N+1 Merchant Identity Resolution
    String resolvedMerchantName = ad.effectiveMerchantName;
    String resolvedMerchantLogo = ad.effectiveMerchantLogoUrl;

    if (ad.merchantId.isNotEmpty && publicBusinesses.isNotEmpty) {
      final match = publicBusinesses.cast<BusinessEntity?>().firstWhere(
        (b) => b?.businessId == ad.merchantId,
        orElse: () => null,
      );
      if (match != null) {
        if (match.name.isNotEmpty) resolvedMerchantName = match.name;
        if (match.logoUrl != null && match.logoUrl!.isNotEmpty) resolvedMerchantLogo = match.logoUrl!;
      }
    }

    final badge = ad.effectiveBadgeText;
    final cta = ad.ctaText.isNotEmpty ? ad.ctaText : 'Ver más';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: 180,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.12),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
            image: ad.imageUrl.isNotEmpty
                ? DecorationImage(
                    image: NetworkImage(ad.imageUrl),
                    fit: BoxFit.cover,
                  )
                : null,
            gradient: ad.imageUrl.isEmpty
                ? const LinearGradient(
                    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
          ),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: LinearGradient(
                colors: [
                  Colors.black.withOpacity(0.20),
                  Colors.black.withOpacity(0.40),
                  Colors.black.withOpacity(0.85),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Row: Badge & Circular Merchant Logo
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (badge.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: BrandColors.bluePrimary,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 3,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Text(
                          badge,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      )
                    else
                      const SizedBox.shrink(),

                    if (resolvedMerchantLogo.isNotEmpty)
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          border: Border.all(color: Colors.white, width: 1.5),
                          image: DecorationImage(
                            image: NetworkImage(resolvedMerchantLogo),
                            fit: BoxFit.cover,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),

                // Bottom: Merchant Name, Title, Subtitle & CTA button
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (resolvedMerchantName.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 2.0),
                        child: Text(
                          resolvedMerchantName,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.85),
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                ad.title,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (ad.subtitle.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  ad.subtitle,
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.88),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w400,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),

                        // CTA Button
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.15),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Text(
                            '$cta ›',
                            style: const TextStyle(
                              color: Color(0xFF0F172A),
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
