"use strict";
/**
 * BlueSystem Delivery Enterprise — Declaraciones Tipadas de Herramientas para Gemini (C3-D)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_TOOL_DECLARATIONS = void 0;
exports.GEMINI_TOOL_DECLARATIONS = [
    // ─── Herramientas Locales (11) ───
    {
        name: "tool_search_products",
        description: "Busca platos y productos en el catálogo comercial.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: { type: "STRING", description: "Término de búsqueda de producto o comida (ej. 'pizza', 'hamburguesa')." },
            },
            required: ["query"],
        },
    },
    {
        name: "tool_search_businesses",
        description: "Busca restaurantes y comercios afiliados por nombre o tipo de cocina.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: { type: "STRING", description: "Nombre o categoría del comercio." },
            },
            required: ["query"],
        },
    },
    {
        name: "tool_resolve_catalog_entity",
        description: "Resuelve una entidad mencionada por el usuario al ID canónico de producto o comercio.",
        parameters: {
            type: "OBJECT",
            properties: {
                entityName: { type: "STRING", description: "Nombre o referencia de la entidad a resolver." },
            },
            required: ["entityName"],
        },
    },
    {
        name: "tool_get_product_detail",
        description: "Obtiene información detallada, precio y opciones de un producto.",
        parameters: {
            type: "OBJECT",
            properties: {
                productId: { type: "STRING", description: "ID canónico del producto." },
            },
            required: ["productId"],
        },
    },
    {
        name: "tool_get_business_detail",
        description: "Obtiene información, estado de apertura y costo de entrega de un comercio.",
        parameters: {
            type: "OBJECT",
            properties: {
                businessId: { type: "STRING", description: "ID canónico del comercio." },
            },
            required: ["businessId"],
        },
    },
    {
        name: "tool_get_nearby_businesses",
        description: "Descubre comercios cercanos a la ubicación del cliente.",
        parameters: {
            type: "OBJECT",
            properties: {
                lat: { type: "NUMBER", description: "Latitud del cliente (opcional si ya está en contexto)." },
                lng: { type: "NUMBER", description: "Longitud del cliente (opcional si ya está en contexto)." },
            },
        },
    },
    {
        name: "tool_get_cart",
        description: "Consulta los ítems y subtotal del carrito de compras actual.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "tool_add_to_cart",
        description: "Agrega un producto al carrito de compras.",
        parameters: {
            type: "OBJECT",
            properties: {
                productId: { type: "STRING", description: "ID del producto a agregar." },
                quantity: { type: "NUMBER", description: "Cantidad de unidades." },
            },
            required: ["productId"],
        },
    },
    {
        name: "tool_update_cart_quantity",
        description: "Incrementa o decrementa la cantidad de un ítem en el carrito.",
        parameters: {
            type: "OBJECT",
            properties: {
                productId: { type: "STRING", description: "ID del producto." },
                action: { type: "STRING", description: "'increment' o 'decrement'." },
            },
            required: ["productId"],
        },
    },
    {
        name: "tool_remove_from_cart",
        description: "Remueve un producto del carrito de compras.",
        parameters: {
            type: "OBJECT",
            properties: {
                productId: { type: "STRING", description: "ID del producto a remover." },
            },
            required: ["productId"],
        },
    },
    {
        name: "tool_clear_cart",
        description: "Vacía por completo el carrito de compras. Requiere confirmación humana.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    // ─── Herramientas Backend (8) ───
    {
        name: "tool_get_customer_context",
        description: "Obtiene el perfil básico, dirección principal y puntos de lealtad del cliente.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "tool_get_active_order",
        description: "Recupera la orden activa actual del cliente y su estado de preparación/entrega.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "tool_get_order_history",
        description: "Recupera los últimos pedidos realizados por el cliente.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "tool_get_order_tracking",
        description: "Obtiene el tiempo estimado de llegada y la distancia del repartidor para un pedido en camino.",
        parameters: {
            type: "OBJECT",
            properties: {
                orderId: { type: "STRING", description: "ID de la orden (opcional si es la orden activa)." },
            },
        },
    },
    {
        name: "tool_validate_coupon",
        description: "Valida autoritativamente un cupón de descuento.",
        parameters: {
            type: "OBJECT",
            properties: {
                couponCode: { type: "STRING", description: "Código del cupón a validar." },
                businessId: { type: "STRING", description: "ID del comercio." },
                cartSubtotal: { type: "NUMBER", description: "Subtotal actual del carrito." },
            },
            required: ["couponCode"],
        },
    },
    {
        name: "tool_create_authoritative_order",
        description: "Crea un pedido autoritativo en el backend. Requiere confirmación humana previa.",
        parameters: {
            type: "OBJECT",
            properties: {
                businessId: { type: "STRING", description: "ID del comercio." },
                items: {
                    type: "ARRAY",
                    description: "Lista de productos a pedir con su ID y cantidad.",
                    items: {
                        type: "OBJECT",
                        description: "Detalle del producto a ordenar.",
                        properties: {
                            productId: { type: "STRING", description: "ID del producto." },
                            quantity: { type: "NUMBER", description: "Cantidad de unidades." },
                        },
                    },
                },
                deliveryAddress: { type: "STRING", description: "Dirección de entrega." },
                paymentMethod: { type: "STRING", description: "Método de pago ('CASH' o 'CARD')." },
            },
            required: ["businessId", "items"],
        },
    },
    {
        name: "tool_cancel_order",
        description: "Cancela una orden pendiente del cliente. Requiere confirmación humana previa.",
        parameters: {
            type: "OBJECT",
            properties: {
                orderId: { type: "STRING", description: "ID del pedido a cancelar." },
            },
            required: ["orderId"],
        },
    },
    {
        name: "tool_submit_order_review",
        description: "Envía una calificación y reseña para un pedido entregado.",
        parameters: {
            type: "OBJECT",
            properties: {
                orderId: { type: "STRING", description: "ID del pedido a calificar." },
                rating: { type: "NUMBER", description: "Puntuación de 1 a 5 estrellas." },
                comment: { type: "STRING", description: "Comentario u opinión." },
            },
            required: ["orderId", "rating"],
        },
    },
    {
        name: "tool_get_available_coupons",
        description: "Consulta los cupones de descuento y promociones activas disponibles para el cliente.",
        parameters: {
            type: "OBJECT",
            properties: {
                businessId: { type: "STRING", description: "ID opcional del comercio para filtrar cupones específicos." },
            },
        },
    },
];
