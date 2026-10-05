/**
 * BlueSystem Delivery Enterprise — Category & Product Icon Resolver
 * BSD-MERCHANT-ORDER-FINANCIAL-VISIBILITY-RESPONSIVE-UX-001
 * 
 * Regla de Iconografía Contextual por Rubro Comercial:
 * - Restaurante / Gastronomía: 🍽️ / 🍔
 * - Farmacia / Salud: 💊
 * - Supermercado / Abarrotes: 🛒
 * - Tecnología / Electrónica: 💻 / 📱 / 🔌 / 🎧
 * - Retail / Tienda / Moda: 🏪 / 👕 / 📦
 * - Fallback Universal de Producto: 📦 (NUNCA emoji gastronómico como fallback universal)
 */

export interface ResolvedProductVisual {
  hasImage: boolean;
  imageUrl?: string;
  emoji: string;
  label: string;
}

export function resolveBusinessCategoryIcon(categoryRaw?: string): { emoji: string; label: string; isRestaurant: boolean } {
  const norm = (categoryRaw || '').toLowerCase().trim();

  const isRestaurant = norm.includes('restaurante') ||
    norm.includes('comida') ||
    norm.includes('gastronom') ||
    norm.includes('fritanga') ||
    norm.includes('burger') ||
    norm.includes('pizza') ||
    norm.includes('cafe') ||
    norm.includes('bar');

  if (isRestaurant) {
    return { emoji: '🍽️', label: 'Gastronomía', isRestaurant: true };
  }
  if (norm.includes('farmacia') || norm.includes('salud') || norm.includes('medic')) {
    return { emoji: '💊', label: 'Farmacia', isRestaurant: false };
  }
  if (norm.includes('super') || norm.includes('mercado') || norm.includes('abarrote')) {
    return { emoji: '🛒', label: 'Supermercado', isRestaurant: false };
  }
  if (norm.includes('tecno') || norm.includes('electron') || norm.includes('comput') || norm.includes('gadget')) {
    return { emoji: '💻', label: 'Tecnología', isRestaurant: false };
  }
  if (norm.includes('tienda') || norm.includes('retail') || norm.includes('ropa') || norm.includes('moda')) {
    return { emoji: '🏪', label: 'Tienda', isRestaurant: false };
  }
  if (norm.includes('licor') || norm.includes('bebida')) {
    return { emoji: '🍾', label: 'Licores & Bebidas', isRestaurant: false };
  }

  return { emoji: '📦', label: 'Comercio', isRestaurant: false };
}

export function resolveItemVisual(
  item: { name?: string; productName?: string; imageUrl?: string; image?: string; category?: string; categoryName?: string },
  businessCategory?: string
): ResolvedProductVisual {
  const imageUrl = item.imageUrl || item.image;
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
    return {
      hasImage: true,
      imageUrl,
      emoji: '📦',
      label: item.productName || item.name || 'Producto'
    };
  }

  const combined = `${item.name || ''} ${item.productName || ''} ${item.category || ''} ${item.categoryName || ''} ${businessCategory || ''}`.toLowerCase();

  // Tecnología & Gadgets
  if (combined.includes('parlante') || combined.includes('speaker') || combined.includes('audio') || combined.includes('auricular') || combined.includes('audifono') || combined.includes('sound')) {
    return { hasImage: false, emoji: '🎧', label: 'Audio / Tecnología' };
  }
  if (combined.includes('celular') || combined.includes('telefono') || combined.includes('phone') || combined.includes('movil') || combined.includes('xiaomi') || combined.includes('samsung') || combined.includes('iphone')) {
    return { hasImage: false, emoji: '📱', label: 'Telefonía' };
  }
  if (combined.includes('cable') || combined.includes('hdmi') || combined.includes('usb') || combined.includes('cargador') || combined.includes('adaptador')) {
    return { hasImage: false, emoji: '🔌', label: 'Accesorios' };
  }
  if (combined.includes('laptop') || combined.includes('comput') || combined.includes('pc') || combined.includes('mouse') || combined.includes('teclado') || combined.includes('monitor')) {
    return { hasImage: false, emoji: '💻', label: 'Cómputo' };
  }

  // Salud & Farmacia
  if (combined.includes('medic') || combined.includes('pastilla') || combined.includes('jarabe') || combined.includes('farmacia') || combined.includes('alcohol') || combined.includes('vendas')) {
    return { hasImage: false, emoji: '💊', label: 'Farmacia' };
  }

  // Supermercado
  if (combined.includes('arroz') || combined.includes('frijol') || combined.includes('leche') || combined.includes('aceite') || combined.includes('jabon') || combined.includes('detergente')) {
    return { hasImage: false, emoji: '🛒', label: 'Abarrotes' };
  }

  // Gastronomía (Únicamente si el comercio o producto pertenece a comida)
  const bizInfo = resolveBusinessCategoryIcon(businessCategory);
  if (bizInfo.isRestaurant) {
    if (combined.includes('pizza')) return { hasImage: false, emoji: '🍕', label: 'Pizza' };
    if (combined.includes('hamburguesa') || combined.includes('burger')) return { hasImage: false, emoji: '🍔', label: 'Hamburguesa' };
    if (combined.includes('pollo') || combined.includes('alitas')) return { hasImage: false, emoji: '🍗', label: 'Pollo' };
    if (combined.includes('cafe')) return { hasImage: false, emoji: '☕', label: 'Café' };
    return { hasImage: false, emoji: '🍽️', label: 'Plato' };
  }

  // Fallback universal de producto seguro
  return { hasImage: false, emoji: '📦', label: 'Producto' };
}
