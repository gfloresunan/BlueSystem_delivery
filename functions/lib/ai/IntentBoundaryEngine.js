"use strict";
/**
 * BlueSystem Delivery Enterprise — Intent Boundary Engine (C3-N)
 * PROTOCOL ID: BSD-AI-C3N-CUSTOMER-AI-COST-GOVERNANCE
 *
 * Primera línea de ahorro de costos y tokens:
 * Evalúa deterministamente si el mensaje del usuario pertenece al dominio
 * de BlueSystem Delivery (comercio, delivery, compras, pedidos, soporte)
 * o si está fuera de dominio (charla general, código, medicina, política, etc.).
 *
 * Para solicitudes fuera de dominio:
 * - 0 llamadas a Gemini (ahorro 100% tokens).
 * - 0 consultas a Firestore.
 * - 0 ejecuciones de herramientas.
 * - Retorno determinista inmediato y cortés en español.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentBoundaryEngine = void 0;
class IntentBoundaryEngine {
    /**
     * Evalúa si un mensaje está dentro del dominio comercial de BlueSystem.
     */
    static evaluate(message) {
        if (!message || message.trim().length === 0) {
            return {
                isPermitted: false,
                intent: "OFF_TOPIC",
                confidence: 1.0,
                deterministicResponse: this.STANDARD_REJECTION_MESSAGE,
                reason: "Mensaje vacío",
            };
        }
        const clean = message
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[¿?¡!.,;:()]/g, " ");
        // 1. Verificación contra patrones explícitos fuera de dominio
        for (const pattern of this.OUT_OF_SCOPE_PATTERNS) {
            if (pattern.regex.test(clean)) {
                return {
                    isPermitted: false,
                    intent: pattern.intent,
                    confidence: 0.95,
                    deterministicResponse: this.STANDARD_REJECTION_MESSAGE,
                    reason: pattern.reason,
                };
            }
        }
        // 2. Detección de intenciones directas dentro de dominio
        if (/\b(tracking|rastreo|donde viene|donde esta|ubicacion)\b/i.test(clean)) {
            return { isPermitted: true, intent: "ORDER_TRACKING", confidence: 0.95 };
        }
        if (/\b(cancelar)\b/i.test(clean) && /\b(pedido|orden)\b/i.test(clean)) {
            return { isPermitted: true, intent: "ORDER_ACTION", confidence: 0.95 };
        }
        if (/\b(pedido|orden|historial de pedidos|mis pedidos)\b/i.test(clean)) {
            return { isPermitted: true, intent: "ORDER_QUERY", confidence: 0.90 };
        }
        if (/\b(carrito|agregar al carrito|vaciar carrito|quitar del carrito)\b/i.test(clean)) {
            return { isPermitted: true, intent: "CART_QUERY", confidence: 0.95 };
        }
        if (/\b(promocion|descuento|cupon|oferta|promo)\b/i.test(clean)) {
            return { isPermitted: true, intent: "PROMOTION_DISCOVERY", confidence: 0.90 };
        }
        if (/\b(precio|cuanto cuesta|cuanto vale|costo)\b/i.test(clean)) {
            return { isPermitted: true, intent: "PRICE_QUERY", confidence: 0.90 };
        }
        if (/\b(comercio|restaurante|tienda|negocio|farmacia|supermercado|cerca de mi)\b/i.test(clean)) {
            return { isPermitted: true, intent: "BUSINESS_DISCOVERY", confidence: 0.90 };
        }
        if (/\b(categoria|categorias|seccion|tipo de comida)\b/i.test(clean)) {
            return { isPermitted: true, intent: "CATEGORY_DISCOVERY", confidence: 0.85 };
        }
        if (/\b(ayuda|como funciona|como pedir|soporte|metodos de pago)\b/i.test(clean)) {
            return { isPermitted: true, intent: "CUSTOMER_APP_HELP", confidence: 0.85 };
        }
        // Saludos directos y frases conversacionales de inicio
        if (/^(hola|buenos dias|buenas tardes|buenas noches|hey|que tal|saludos|buenas|buen dia)/i.test(clean)) {
            return { isPermitted: true, intent: "PURCHASE_ASSISTANCE", confidence: 0.85 };
        }
        // 3. Chequeo de coincidencia con palabras clave del dominio
        const hasDomainKeyword = this.IN_DOMAIN_KEYWORDS.some((kw) => clean.includes(kw));
        if (hasDomainKeyword) {
            return { isPermitted: true, intent: "PRODUCT_SEARCH", confidence: 0.75 };
        }
        // Si no contiene términos de dominio ni coincide con saludos estándar,
        // y es una frase extensa sin relación aparente:
        if (clean.split(/\s+/).length >= 4 && !hasDomainKeyword) {
            return {
                isPermitted: false,
                intent: "OFF_TOPIC",
                confidence: 0.85,
                deterministicResponse: this.STANDARD_REJECTION_MESSAGE,
                reason: "Consulta extensa sin términos relacionados con el comercio o delivery de BlueSystem",
            };
        }
        // Caso por defecto: búsqueda general de productos o asistencia
        return {
            isPermitted: true,
            intent: "PRODUCT_SEARCH",
            confidence: 0.70,
        };
    }
}
exports.IntentBoundaryEngine = IntentBoundaryEngine;
IntentBoundaryEngine.OUT_OF_SCOPE_PATTERNS = [
    // Generación de contenido / historias / poemas / chistes
    {
        regex: /\b(escribe|cuenta|inventa|genera|compon)\s+(un|una|el|la)?\s*(poema|cuento|historia|chiste|cancion|novela|guion|fabula|ensayo)\b/i,
        intent: "CONTENT_GENERATION",
        reason: "Solicitud de generación de contenido creativo ajeno al comercio de BlueSystem",
    },
    // Preguntas de programación / código / software general
    {
        regex: /\b(codigo|programar|javascript|typescript|python|c\+\+|java|html|css|sql|script|algoritmo|funcion|debug|compilar|react|flutter|kotlin)\b/i,
        intent: "UNRELATED_KNOWLEDGE",
        reason: "Consulta técnica de programación ajena a la app",
    },
    // Medicina / salud
    {
        regex: /\b(sintomas?|enfermedad|diagnostico|receta medica|pastillas?|medicamento|dosis|fiebre|dolor de cabeza|coronavirus|covid)\b/i,
        intent: "UNRELATED_KNOWLEDGE",
        reason: "Consulta médica o de salud ajena a BlueSystem",
    },
    // Asuntos legales / judiciales / política general
    {
        regex: /\b(demanda|juicio|abogado|ley|constitucion|politica|elecciones|presidente|gobierno|votar|candidato)\b/i,
        intent: "UNRELATED_KNOWLEDGE",
        reason: "Consulta legal o política ajena a BlueSystem",
    },
    // Preguntas académicas / tareas / ciencia general / astronomía / geografía general
    {
        regex: /\b(quien fue|quien descubrio|cual es la capital de|teoria de la relatividad|distancia a la luna|cuantos planetas|resuelve esta ecuacion|cuanto es \d+[\+\-\*\/]\d+)\b/i,
        intent: "UNRELATED_KNOWLEDGE",
        reason: "Consulta de cultura general / académica ajena a delivery",
    },
    // Búsqueda web general o clima
    {
        regex: /\b(busca en internet|buscar en google|clima en|pronostico del tiempo|noticias de hoy|resultado del partido|quien gano el partido)\b/i,
        intent: "EXTERNAL_WEB_SEARCH",
        reason: "Búsqueda web externa o clima general",
    },
    // Conversación social abierta / personal
    {
        regex: /\b(cual es tu sentido de la vida|tienes sentimientos|te quieres casar|que opinas de la vida|eres humano|tienes novia|eres hombre o mujer)\b/i,
        intent: "PERSONAL_ASSISTANT_GENERAL",
        reason: "Conversación existencial / social abierta",
    },
];
IntentBoundaryEngine.IN_DOMAIN_KEYWORDS = [
    "producto", "productos", "plato", "platos", "catalogo", "venden", "tienen", "recomienda",
    "recomiendame", "comer", "almuerzo", "cena", "desayuno", "antojo", "hambre",
    "pizza", "hamburguesa", "comida", "restaurante", "comercio", "negocio", "tienda",
    "laptop", "laptops", "pc", "computadora", "computadoras", "mouse", "teclado", "tablet",
    "pantalla", "monitor", "tecnologia", "electronica", "celular", "accesorios", "opcion", "opciones",
    "pedido", "orden", "carrito", "comprar", "precio", "costo", "cuanto vale", "cuanto cuesta",
    "menu", "promocion", "descuento", "cupon", "combo", "delivery", "envio", "repartidor",
    "tracking", "rastreo", "donde viene", "donde esta mi pedido", "cancelar pedido", "puntos",
    "lealtad", "saldo", "categoria", "bebidas", "postres", "alitas", "tacos", "farmacia",
    "supermercado", "direccion", "dirección", "pago", "efectivo", "tarjeta", "calificar", "resena"
];
IntentBoundaryEngine.STANDARD_REJECTION_MESSAGE = "Soy el asistente de BlueSystem Delivery especializado en ayudarte a descubrir comercios, " +
    "consultar productos, precios, promociones y gestionar tus pedidos. " +
    "¿En qué puedo orientarte hoy sobre tus compras o entregas en BlueSystem?";
//# sourceMappingURL=IntentBoundaryEngine.js.map