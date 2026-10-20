plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "mx.lineaitalia.alarmasparos"
    compileSdk = 34
    defaultConfig {
        applicationId = "mx.lineaitalia.alarmasparos"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0-prueba"
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
