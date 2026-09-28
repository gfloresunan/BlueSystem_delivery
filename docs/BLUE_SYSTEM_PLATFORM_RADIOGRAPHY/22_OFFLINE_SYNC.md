# 22 — OFFLINE ARCHITECTURE & WORKMANAGER SYNC

**Persistence Layer:** Room Database (`AppDatabase.kt`)  
**Background Engine:** Android `WorkManager`  
**Target:** Local-first caching of menus, offline cart, and network recovery.

---

## 🔄 1. Room Database Entities & Local DAOs

- **`AppDatabase.kt`:** Local SQLite database instance managed by Android Architecture Components.
- **DAOs:**
  - `CartDao.kt`: In-flight cart items stored locally to prevent cart loss on app kill.
  - `MerchantCacheDao.kt`: Cached merchant metadata and menu snapshots for instant app launch.
  - `PendingSyncDao.kt`: Queue of telemetry or delivery confirmation events created during offline coverage loss.

---

## ⚙️ 2. WorkManager Reconciliation

When network connectivity is restored (`NetworkType.CONNECTED` constraint):
1. `LocationSyncWorker.kt` flushes any buffered location packets.
2. `OrderSyncWorker.kt` queries Firestore to refresh active order state machine.

---
*Evidence: source code of `app/src/main/java/com/example/data/local/` and `app/src/main/java/com/example/worker/`.*
