# FASE I — MATRIZ DE DEPENDENCIAS OPERACIONALES DE IDENTIDADES

**Regla de Protección Absoluta:** Si una identidad posee dependencias operativas (ventas, pagos, pedidos, entregas o auditoría), `DELETE_ALLOWED = FALSE`.  

---

## 1. Matriz de Dependencias Operativas (41 Identidades)

| UID | Nombre Efectivo | Orders | Deliveries | Sales | Payments | Audit Events | Notifications | Active Dependencies | Historical Dependencies | Delete Allowed? | Archive Allowed? |
| :--- | :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `1768226535785` | Gerald José  Flores Gutiérrez | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `1768243841542` | Kim | 0 | 0 | 27 | 0 | 0 | 0 | SÍ | SÍ | **FALSE** | FALSE |
| `1768878763084` | Henry Paz | 0 | 0 | 65 | 0 | 0 | 0 | SÍ | SÍ | **FALSE** | FALSE |
| `1769029559449` | Chepita | 0 | 0 | 8 | 0 | 0 | 0 | SÍ | SÍ | **FALSE** | FALSE |
| `3Wt0XdzeOTfG1OXn72ApIhVbE5i1` | Kimberly Flores Centeno | 1 | 0 | 0 | 0 | 0 | 0 | SÍ | SÍ | **FALSE** | FALSE |
| `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | kimberly Flores | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `9QHYGkSa3nWiJ7KfPkccjjuIaYp2` | Henry Paz | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1768621181014` | Zamir Ocornor | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769025804680` | Omar Altamirano | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769029685895` | Richard centeno | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769098535884` | Adolfo Urbina | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769190932815` | vicenta gutirrrez | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769194803657` | adolfo  urbina | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769465117595` | andy flores | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769487243198` | Helo Jdkdk | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769620170492` | pepe flores | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769633352410` | Gggg Ghh | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1769711990359` | venus flores | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1770060240159` | Jairo  AldNa | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1771428610412` | Nelson Busto | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-1772377026947` | Luciana  Aldana | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-CL-1768337682525` | allan mendoza | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-CL-1768342901776` | zoe flores | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-CL-1768365031013` | maria chavez | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `USR-CL-1768422839897` | denis flores | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `XWNzPT5p6fbf7reFdFBNTZoQrY42` | Junior Flores | 0 | 0 | 0 | 0 | 1 | 0 | SÍ | SÍ | **FALSE** | FALSE |
| `XWsjzZe8lsfthRQ5PgbDzlqA2nX2` | Gerald Flores | 1 | 0 | 0 | 0 | 0 | 0 | SÍ | SÍ | **FALSE** | FALSE |
| `admin_initial` | Admin Gerald Flores | 0 | 0 | 256 | 0 | 0 | 0 | SÍ | SÍ | **FALSE** | FALSE |
| `dbX1tvV2WNdFv4KWMbWNW8lngDI2` | Gerald Jose Flores Gutierrez | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | FRITONI | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `h00PIZpMgxSaqSVnYpRLPq0DYGC3` | ITED Virtual | 1 | 0 | 0 | 0 | 0 | 0 | SÍ | SÍ | **FALSE** | FALSE |
| `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | Aldrich Flores | 0 | 0 | 0 | 0 | 1 | 0 | SÍ | SÍ | **FALSE** | FALSE |
| `user_cli_1768237897386` | Aldrich  Flores | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `user_cli_1768240170991` | venus flores | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `user_cliente0002_2026` | Perla  Centeno | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `user_cliente0008_2026` | Junior Flores | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `user_cliente0009_2026` | hola oooo | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `user_cliente0010_2026` | maria ramos | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `user_cliente0011_2026` | sonia matamoros | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `user_cliente1768275049139` | eva morales | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
| `user_cliente1768278375844` | xoci ruiz | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | **FALSE** | TRUE |
