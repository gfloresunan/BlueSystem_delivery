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

  String get subtitulo => subtitle;

  factory BannerEntity.fromMap(Map<String, dynamic> map, String id) {
    final effectiveImg = map['imageUrl'] as String? ?? map['imagenUrl'] as String? ?? '';
    final effectiveTtl = map['title'] as String? ?? map['titulo'] as String? ?? '';
    final effectiveSub = map['subtitle'] as String? ?? map['subtitulo'] as String? ?? '';
    final effectiveAct = map['actionType'] as String? ?? map['tipoAccion'] as String? ?? 'NONE';
    final effectiveDest = map['actionId'] as String? ?? map['destinoId'] as String? ?? map['targetUrl'] as String? ?? '';
    final effectivePrio = (map['priority'] as num?)?.toInt() ?? (map['prioridad'] as num?)?.toInt() ?? 0;
    final effectiveActive = map['isActive'] as bool? ?? map['activo'] as bool? ?? true;

    return BannerEntity(
      id: id,
      imageUrl: effectiveImg,
      title: effectiveTtl,
      subtitle: effectiveSub,
      actionType: effectiveAct,
      actionId: effectiveDest,
      targetUrl: map['targetUrl'] as String? ?? '',
      businessId: map['businessId'] as String? ?? '',
      isActive: effectiveActive,
      priority: effectivePrio,
      backgroundColor: map['backgroundColor'] as String? ?? '#0D47A1',
      imagenUrl: effectiveImg,
      titulo: effectiveTtl,
      tipoAccion: effectiveAct,
      destinoId: effectiveDest,
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
