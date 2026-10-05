# Guía Oficial de Provisión de Keystore de Producción (Android Release)
**Protocolo:** BSD-PRESTORE-PHASE-2.1-KEYSTORE-GUIDE-001  
**Sistema:** BlueSystem Delivery Enterprise  
**Gobernanza:** ADR-014 (No Auto-Rollout Policy)

---

## 1. Principio Fundamental de Seguridad Criptográfica
Por política estricta de seguridad y gobernanza:
- **No se deben almacenar contraseñas ni archivos JKS en el repositorio Git.**
- **No se inventan ni generan claves ficticias como sustituto de la clave oficial de publicación.**
- El archivo de configuración `app/build.gradle.kts` está configurado para resolver la firma de forma dinámica a través de variables de entorno o propiedades seguras de Gradle.

---

## 2. Variables de Configuración para Firma Oficial

Para compilar un APK o Android App Bundle (`.aab`) firmado para Google Play Store, se deben suministrar las siguientes variables de entorno en el entorno de build (máquina local o CI/CD):

| Variable de Entorno | Propiedad Gradle (`-P` o `gradle.properties`) | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `KEYSTORE_PATH` | `KEYSTORE_PATH` | Ruta absoluta o relativa al archivo `.jks` oficial | `C:\keys\bluesystem-upload-key.jks` o `./my-upload-key.jks` |
| `STORE_PASSWORD` | `STORE_PASSWORD` | Contraseña del almacén de claves (keystore) | `********` |
| `KEY_ALIAS` | `KEY_ALIAS` | Alias de la llave dentro del keystore | `upload` o `bluesystem-release` |
| `KEY_PASSWORD` | `KEY_PASSWORD` | Contraseña de la llave | `********` |

---

## 3. Procedimiento para Generación de la Llave Oficial (Si no existe previamente)

Si la organización aún no ha creado la llave de subida oficial para Google Play, el operador autorizado debe ejecutar el siguiente comando seguro con la herramienta `keytool` de JDK:

```bash
keytool -genkeypair -v \
  -keystore my-upload-key.jks \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storetype JKS
```

> **IMPORTANTE:** Guardar una copia de respaldo segura y cifrada del archivo `my-upload-key.jks` y sus contraseñas en el gestor de contraseñas corporativo. Si se pierde la clave de subida, deberá solicitarse un restablecimiento ante Google Play Console.

---

## 4. Ejecución del Build de Producción

Una vez definidas las variables en el entorno:

### Opción A — Variables de Entorno (Recomendado en CI/CD y PowerShell):
```powershell
$env:KEYSTORE_PATH = "C:\ruta\hacia\my-upload-key.jks"
$env:STORE_PASSWORD = "MiPasswordSeguroKeystore"
$env:KEY_ALIAS = "upload"
$env:KEY_PASSWORD = "MiPasswordSeguroKey"

# Compilar AAB para Google Play Console
.\gradlew.bat :app:bundleCoreRelease

# O compilar APK de producción
.\gradlew.bat :app:assembleCoreRelease
```

### Opción B — Propiedades de Línea de Comandos:
```bash
./gradlew :app:bundleCoreRelease \
  -PKEYSTORE_PATH=/ruta/my-upload-key.jks \
  -PSTORE_PASSWORD=MiPasswordSeguroKeystore \
  -PKEY_ALIAS=upload \
  -PKEY_PASSWORD=MiPasswordSeguroKey
```

---

## 5. Comportamiento en Modo Desarrollo / Auditoría Local
Si las variables no están presentes o el archivo keystore especificado no existe:
- Gradle emitirá un warning:  
  `⚠️ [SIGNING] Keystore no encontrado en: <ruta>. El build usará debugConfig/fallback hasta que se suministre la clave de producción oficial.`
- Se utilizará `debugConfig` para permitir la compilación y pruebas locales sin fallar por archivo inexistente.
- El artefacto generado en ausencia de la clave oficial **NO es apto para subir a Google Play Console**.
