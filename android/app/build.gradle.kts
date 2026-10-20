plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// número de versión = número de compilación de GitHub (cada versión nueva se instala encima de la anterior)
val vc = (project.findProperty("vc") as String?)?.toIntOrNull() ?: 1

android {
    namespace = "mx.lineaitalia.alarmasparos"
    compileSdk = 34
    defaultConfig {
        applicationId = "mx.lineaitalia.alarmasparos"
        minSdk = 26
        targetSdk = 34
        versionCode = vc
        versionName = "1.$vc"
    }
    buildFeatures { buildConfig = true }
    // firma fija de Línea Italia: la pone GitHub desde sus "secretos" (nunca está en el repositorio)
    signingConfigs {
        create("lineaitalia") {
            System.getenv("KS_FILE")?.let { f ->
                storeFile = file(f)
                storePassword = System.getenv("KS_PASSWORD")
                keyAlias = System.getenv("KS_ALIAS")
                keyPassword = System.getenv("KS_PASSWORD")
                storeType = "pkcs12"
            }
        }
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("lineaitalia")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-firestore")
    implementation("androidx.core:core-ktx:1.13.1")
}
