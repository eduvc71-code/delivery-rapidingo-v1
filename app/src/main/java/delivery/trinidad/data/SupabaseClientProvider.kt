package delivery.trinidad.data

import delivery.trinidad.BuildConfig
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

object SupabaseClientProvider {
    val client by lazy {
        require(BuildConfig.SUPABASE_URL.isNotBlank()) {
            "SUPABASE_URL is empty. Set it in gradle.properties before enabling Supabase."
        }
        require(BuildConfig.SUPABASE_ANON_KEY.isNotBlank()) {
            "SUPABASE_ANON_KEY is empty. Set it in gradle.properties before enabling Supabase."
        }

        createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Auth)
            install(Postgrest)
            install(Realtime)
            install(Storage)
        }
    }
}
