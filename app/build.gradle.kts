import com.google.gms.googleservices.GoogleServicesPlugin.MissingGoogleServicesStrategy
import java.util.Properties
import java.io.FileInputStream

plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.kotlin.compose)
  alias(libs.plugins.google.devtools.ksp)
  alias(libs.plugins.roborazzi)
  alias(libs.plugins.secrets)
  alias(libs.plugins.google.services)
  alias(libs.plugins.firebase.crashlytics)
  // firebase.perf plugin removido: incompatible con AGP 9.x (usa com.android.build.api.transform.Transform eliminada)
  // La dependencia runtime 'firebase-perf' en dependencies{} permanece para monitoreo manual.
}

android {
  namespace = "com.example"
  compileSdk { version = release(36) { minorApiLevel = 1 } }

  defaultConfig {
    applicationId = "com.aistudio.delivery.djweq"
    minSdk = 24
    targetSdk = 36
    versionCode = 1
    versionName = "1.0"

    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

    val localProps = Properties()
    val localPropsFile = rootProject.file("local.properties")
    if (localPropsFile.exists()) {
        val inputStream = FileInputStream(localPropsFile)
        localProps.load(inputStream)
        inputStream.close()
    }
    val mapsApiKey = localProps.getProperty("GOOGLE_MAPS_API_KEY") ?: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI"
    manifestPlaceholders["GOOGLE_MAPS_API_KEY"] = mapsApiKey
  }

  flavorDimensions += "commercialProfile"

  productFlavors {
    create("core") {
      dimension = "commercialProfile"
      applicationId = "com.aistudio.delivery.djweq"
      resValue("string", "app_name", "BlueSystem Delivery")
      manifestPlaceholders["app_name"] = "BlueSystem Delivery"
    }
    create("enterpriseFitoni") {
      dimension = "commercialProfile"
      applicationId = "com.fitoni.delivery"
      resValue("string", "app_name", "Fitoni Express")
      manifestPlaceholders["app_name"] = "Fitoni Express"
    }
    create("whitelabel") {
      dimension = "commercialProfile"
      val customAppId = (project.findProperty("customApplicationId") as? String)?.takeIf { it.isNotBlank() } ?: "com.bluesystem.delivery"
      val customAppName = (project.findProperty("customAppName") as? String)?.takeIf { it.isNotBlank() } ?: "Delivery WhiteLabel"
      val customVersionName = (project.findProperty("customVersionName") as? String)?.takeIf { it.isNotBlank() } ?: "1.0.0"
      val customBuildNumber = (project.findProperty("customBuildNumber") as? String)?.toIntOrNull() ?: 100

      applicationId = customAppId
      versionName = customVersionName
      versionCode = customBuildNumber
      resValue("string", "app_name", customAppName)
      manifestPlaceholders["app_name"] = customAppName
    }
  }

  signingConfigs {
    create("release") {
      val keystorePath = System.getenv("KEYSTORE_PATH") ?: "${rootDir}/my-upload-key.jks"
      storeFile = file(keystorePath)
      storePassword = System.getenv("STORE_PASSWORD")
      keyAlias = "upload"
      keyPassword = System.getenv("KEY_PASSWORD")
    }
    create("debugConfig") {
      storeFile = file("${rootDir}/debug.keystore")
      storePassword = "android"
      keyAlias = "androiddebugkey"
      keyPassword = "android"
    }
  }

  buildTypes {
    release {
      isCrunchPngs = false
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      signingConfig = signingConfigs.getByName("release")
    }
    debug {
      signingConfig = signingConfigs.getByName("debug")
    }

  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
    isCoreLibraryDesugaringEnabled = true
  }
  buildFeatures {
    compose = true
    buildConfig = true
    resValues = true
  }
  testOptions { unitTests { isIncludeAndroidResources = true } }
  sourceSets {
    getByName("main") {
      res.srcDirs("src/main/res", "build/generated/res/brandAssets/res")
    }
  }
  packaging {
    resources {
      excludes += "**/desktop.ini"
      excludes += "**/.DS_Store"
    }
  }
  lint {
    baseline = file("lint-baseline.xml")
    // Suprimir warnings de deprecación de IconsAutoMirrored (pre-existentes, no EIAM)
    // abortOnError = false  // No se desactiva; se usa baseline para aislar issues pre-existentes
  }
}


// Configure the Secrets Gradle Plugin to use .env and .env.example files
// to match the convention used in Web projects.
secrets {
  propertiesFileName = ".env"
  defaultPropertiesFileName = ".env.example"
}

googleServices { missingGoogleServicesStrategy = MissingGoogleServicesStrategy.WARN }

// Some unused dependencies are commented out below instead of being removed.
// This makes it easy to add them back in the future if needed.
dependencies {
  implementation(platform(libs.androidx.compose.bom))
  implementation(platform(libs.firebase.bom))
  // implementation(libs.accompanist.permissions)
  implementation(libs.androidx.activity.compose)
  // implementation(libs.androidx.camera.camera2)
  // implementation(libs.androidx.camera.core)
  // implementation(libs.androidx.camera.lifecycle)
  // implementation(libs.androidx.camera.view)
  implementation(libs.androidx.compose.material.icons.core)
  implementation(libs.androidx.compose.material.icons.extended)
  implementation(libs.androidx.compose.material3)
    implementation("androidx.compose.material:material:1.6.0")
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.ui.graphics)
  implementation(libs.androidx.compose.ui.tooling.preview)
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.core.splashscreen)
  // implementation(libs.androidx.datastore.preferences)
  implementation(libs.androidx.lifecycle.runtime.compose)
  implementation(libs.androidx.lifecycle.runtime.ktx)
  implementation(libs.androidx.lifecycle.viewmodel.compose)
  implementation(libs.androidx.navigation.compose)
  implementation(libs.androidx.room.ktx)
  implementation(libs.androidx.room.runtime)
  implementation(libs.androidx.work.runtime.ktx)
  // implementation(libs.coil.compose)
  implementation(libs.converter.moshi)
  implementation(libs.firebase.ai)
  // Uncomment to use Firestore:
  implementation(libs.firebase.firestore)
    implementation(libs.firebase.storage)
    implementation(libs.coil.compose)
  implementation(libs.firebase.messaging)
  implementation(libs.firebase.functions)
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")

  // Firebase Auth with Google Sign-In requires all of the following to be uncommented together.
  // If you are using Firebase Auth with other providers (e.g. Email/Password), you may only need
  // firebase-auth.
  implementation(libs.firebase.auth)
  implementation(libs.firebase.analytics)
  implementation(libs.androidx.credentials)
  implementation(libs.androidx.credentials.play.services)
  implementation(libs.googleid)
  implementation(libs.androidx.biometric)
  implementation("com.facebook.android:facebook-login:17.0.0")
  implementation(libs.firebase.appcheck.recaptcha)
  implementation("com.google.firebase:firebase-appcheck-playintegrity")
  implementation("com.google.firebase:firebase-appcheck-debug")
  implementation("com.google.firebase:firebase-crashlytics")
  implementation("com.google.firebase:firebase-perf")
  implementation(libs.kotlinx.coroutines.android)
  implementation(libs.kotlinx.coroutines.core)
  implementation(libs.logging.interceptor)
  implementation(libs.moshi.kotlin)
  implementation(libs.okhttp)
  implementation(libs.play.services.location)
  implementation(libs.play.services.maps)
  implementation(libs.maps.compose)
  implementation(libs.retrofit)
  testImplementation(libs.androidx.compose.ui.test.junit4)
  testImplementation(libs.androidx.core)
  testImplementation(libs.androidx.junit)
  testImplementation(libs.junit)
  testImplementation(libs.kotlinx.coroutines.test)
  testImplementation(libs.robolectric)
  testImplementation(libs.mockk)
  testImplementation(libs.roborazzi)
  testImplementation(libs.roborazzi.compose)
  testImplementation(libs.roborazzi.junit.rule)
  androidTestImplementation(platform(libs.androidx.compose.bom))
  androidTestImplementation(libs.androidx.compose.ui.test.junit4)
  androidTestImplementation(libs.androidx.espresso.core)
  androidTestImplementation(libs.androidx.junit)
  androidTestImplementation(libs.androidx.runner)
  debugImplementation(libs.androidx.compose.ui.test.manifest)
  debugImplementation(libs.androidx.compose.ui.tooling)
  "ksp"(libs.androidx.room.compiler)
  "ksp"(libs.moshi.kotlin.codegen)
  coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
