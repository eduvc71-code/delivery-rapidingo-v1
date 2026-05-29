package delivery.trinidad

import android.content.Context
import android.util.Base64
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

data class GoogleCredentialProfile(
    val userId: String,
    val email: String,
    val displayName: String
)

class GoogleCredentialAuthException(message: String, cause: Throwable? = null) : Exception(message, cause)

suspend fun signInWithGoogleCredential(context: Context): GoogleCredentialProfile = withContext(Dispatchers.Main) {
    val credentialManager = CredentialManager.create(context)
    runCatching {
        credentialManager.clearCredentialState(ClearCredentialStateRequest())
    }

    val googleIdOption = GetGoogleIdOption.Builder()
        .setServerClientId(BuildConfig.GOOGLE_SIGN_IN_SERVER_CLIENT_ID)
        .setFilterByAuthorizedAccounts(false)
        .setAutoSelectEnabled(false)
        .build()

    val request = GetCredentialRequest.Builder()
        .addCredentialOption(googleIdOption)
        .build()

    try {
        val credential = credentialManager.getCredential(context, request).credential
        if (credential !is CustomCredential ||
            credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            throw GoogleCredentialAuthException("Credencial de Google no reconocida.")
        }

        val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
        val email = googleCredential.id.trim().lowercase()
        if (email.isBlank()) {
            throw GoogleCredentialAuthException("Google no devolvio un correo valido.")
        }

        val subject = googleSubjectFromToken(googleCredential.idToken)
        val userId = subject?.let { "google_$it" } ?: email
        val displayName = googleCredential.displayName?.takeIf { it.isNotBlank() }
            ?: email.substringBefore('@')

        GoogleCredentialProfile(
            userId = userId,
            email = email,
            displayName = displayName
        )
    } catch (error: GoogleCredentialAuthException) {
        throw error
    } catch (error: GetCredentialException) {
        throw GoogleCredentialAuthException("No se pudo iniciar con Gmail.", error)
    } catch (error: Exception) {
        throw GoogleCredentialAuthException("No se pudo leer la credencial de Gmail.", error)
    }
}

private fun googleSubjectFromToken(idToken: String): String? {
    val payload = idToken.split('.').getOrNull(1) ?: return null
    val json = String(Base64.decode(payload, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING))
    return JSONObject(json).optString("sub").takeIf { it.isNotBlank() }
}
