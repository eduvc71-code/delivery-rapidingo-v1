import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) {
        file.inputStream().use { load(it) }
    }
}

fun secretProperty(name: String): String {
    return providers.gradleProperty(name).orNull?.takeIf { it.isNotBlank() }
        ?: localProperties.getProperty(name)?.takeIf { it.isNotBlank() }
        ?: ""
}

val supabaseUrl = secretProperty("SUPABASE_URL")
val supabaseAnonKey = secretProperty("SUPABASE_ANON_KEY")
val googleSignInServerClientId = secretProperty("GOOGLE_SIGN_IN_SERVER_CLIENT_ID")
    .ifBlank { "916799303545-7cgugqk1u0t920nn0aijbftr3atopj5t.apps.googleusercontent.com" }

android {
    namespace = "delivery.trinidad"
    compileSdk = 36

    defaultConfig {
        applicationId = "delivery.a2026.trinidad"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        buildConfigField("String", "SUPABASE_URL", "\"$supabaseUrl\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"$supabaseAnonKey\"")
        buildConfigField("String", "GOOGLE_SIGN_IN_SERVER_CLIENT_ID", "\"$googleSignInServerClientId\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    flavorDimensions += "role"
    productFlavors {
        create("cliente") {
            dimension = "role"
            applicationId = "delivery.a2026.trinidad.cliente"
            resValue("string", "app_name", "Cliente")
            buildConfigField("String", "APP_ROLE", "\"CLIENT\"")
            buildConfigField("String", "APP_DISPLAY_NAME", "\"Rapidingo Cliente\"")
            buildConfigField("Boolean", "IS_V2", "false")
        }
        create("delivery") {
            dimension = "role"
            applicationId = "delivery.a2026.trinidad.delivery"
            resValue("string", "app_name", "Delivery")
            buildConfigField("String", "APP_ROLE", "\"DELIVERY\"")
            buildConfigField("String", "APP_DISPLAY_NAME", "\"Rapidingo Delivery\"")
            buildConfigField("Boolean", "IS_V2", "false")
        }
        create("clienteV2") {
            dimension = "role"
            applicationId = "delivery.a2026.trinidad.cliente.v2"
            resValue("string", "app_name", "Beep Cliente")
            buildConfigField("String", "APP_ROLE", "\"CLIENT\"")
            buildConfigField("String", "APP_DISPLAY_NAME", "\"Beep Cliente\"")
            buildConfigField("Boolean", "IS_V2", "true")
        }
        create("deliveryV2") {
            dimension = "role"
            applicationId = "delivery.a2026.trinidad.delivery.v2"
            resValue("string", "app_name", "Beep Delivery")
            buildConfigField("String", "APP_ROLE", "\"DELIVERY\"")
            buildConfigField("String", "APP_DISPLAY_NAME", "\"Beep Delivery\"")
            buildConfigField("Boolean", "IS_V2", "true")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
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
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(platform(libs.supabase.bom))
    implementation(libs.supabase.auth)
    implementation(libs.supabase.postgrest)
    implementation(libs.supabase.realtime)
    implementation(libs.supabase.storage)
    implementation(libs.ktor.client.android)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.coil.compose)
    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.concurrent.futures)
    implementation("androidx.camera:camera-extensions:1.6.0")
    implementation("com.google.guava:guava:33.5.0-android")
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.osmdroid)
    implementation(libs.maplibre.android)
    implementation(libs.play.services.location)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.runtime)
    implementation(libs.androidx.foundation)
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.material)
    coreLibraryDesugaring(libs.android.desugar.jdk.libs)
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(platform(libs.androidx.compose.bom))
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
