# 25 — DYNAMIC MENU, BANNERS & PROMOTION ENGINE

**Subsystems:** Dynamic Catalog, Marketing Banners & Discount Engine  
**Collections:** `/banners`, `/categories`, `/promotions`, `/coupons`

---

## 🏷️ 1. Dynamic Banner Carousel (`/banners`)

- **Admin Management:** Configured via `panel-admin/public/banners.html`.
- **Fields:** `title`, `imageUrl`, `targetScreen`, `targetMerchantId`, `isActive`, `priority`, `validUntil`.
- **Customer Rendering:** Consumed by `BannerCarousel` in `CustomerHomeScreen.kt`. Tapping a banner triggers deep-link navigation directly to the target merchant or category.

---

## 🍕 2. Menu Versioning & Smart Caching (ADR-003)

- To prevent $N+1$ read query storms on mobile clients:
  - Each merchant document maintains a `menuVersion` integer.
  - Customer app caches the full menu in Room local storage.
  - The menu is only re-downloaded from Firestore if the server's `menuVersion` has incremented.

---
*Evidence: verified in `panel-admin/public/js/banners.js` and `app/src/main/java/com/example/ui/customer/HomeScreen.kt`.*
