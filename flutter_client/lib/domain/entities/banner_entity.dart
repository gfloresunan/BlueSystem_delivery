/// BLUE SYSTEM DELIVERY ENTERPRISE — BANNER DOMAIN ENTITY
/// Canonical schema for Promotional Banners (/banners/{bannerId}).
/// Mirrors BannerPromocional from Android (Models.kt) and Admin Web (banners.js).

class BannerEntity {
  final String id;
  final String imageUrl;
  final String title;
  final String subtitle;
  final String actionType; // "PRODUCT", "CATEGORY", "BUSINESS", "URL", "NONE"
  final String actionId;   // ID del producto/categoría/comercio o enlace externo
  final String targetUrl;
  final String businessId;
  final bool isActive;
  final int priority;
  final String backgroundColor;

  // Legacy fields for backward compatibility
  final String imagenUrl;
  final String titulo;
  final String tipoAccion;
  final String destinoId;

  const BannerEntity({
    required this.id,
    required this.imageUrl,
    required this.title,
    this.subtitle = '',
    this.actionType = 'NONE',
    this.actionId = '',
    this.targetUrl = '',
    this.businessId = '',
    this.isActive = true,
    this.priority = 0,
    this.backgroundColor = '#0D47A1',
    this.imagenUrl = '',
    this.titulo = '',
    this.tipoAccion = '',
    this.destinoId = '',
  });

  String get effectiveImageUrl =>
      imageUrl.isNotEmpty ? imageUrl : (imagenUrl.isNotEmpty ? imagenUrl : '');

  String get effectiveTitle =>
      title.isNotEmpty ? title : (titulo.isNotEmpty ? titulo : 'Promoción');

  String get effectiveActionType =>
      actionType.isNotEmpty ? actionType : (tipoAccion.isNotEmpty ? tipoAccion : 'NONE');

  String get effectiveActionId =>
      actionId.isNotEmpty ? actionId : (destinoId.isNotEmpty ? destinoId : targetUrl);

  factory BannerEntity.fromMap(Map<String, dynamic> map, String id) {
    return BannerEntity(
      id: id,
      imageUrl: map['imageUrl'] as String? ?? map['imagenUrl'] as String? ?? '',
      title: map['title'] as String? ?? map['titulo'] as String? ?? '',
      subtitle: map['subtitle'] as String? ?? '',
      actionType: map['actionType'] as String? ?? map['tipoAccion'] as String? ?? 'NONE',
      actionId: map['actionId'] as String? ?? map['destinoId'] as String? ?? map['targetUrl'] as String? ?? '',
      targetUrl: map['targetUrl'] as String? ?? '',
      businessId: map['businessId'] as String? ?? '',
      isActive: map['isActive'] as bool? ?? true,
      priority: (map['priority'] as num?)?.toInt() ?? 0,
      backgroundColor: map['backgroundColor'] as String? ?? '#0D47A1',
      imagenUrl: map['imagenUrl'] as String? ?? '',
      titulo: map['titulo'] as String? ?? '',
      tipoAccion: map['tipoAccion'] as String? ?? '',
      destinoId: map['destinoId'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() => {
        'imageUrl': imageUrl,
        'title': title,
        'subtitle': subtitle,
        'actionType': actionType,
        'actionId': actionId,
        'targetUrl': targetUrl,
        'businessId': businessId,
        'isActive': isActive,
        'priority': priority,
        'backgroundColor': backgroundColor,
        'imagenUrl': effectiveImageUrl,
        'titulo': effectiveTitle,
        'tipoAccion': effectiveActionType,
        'destinoId': effectiveActionId,
      };
}
