package delivery.trinidad.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = RapidingoOrange,
    onPrimary = RapidingoInk,
    primaryContainer = RapidingoRedDark,
    onPrimaryContainer = Color.White,
    secondary = RapidingoRedLight,
    onSecondary = RapidingoInk,
    tertiary = RapidingoOrangeLight,
    background = RapidingoInk,
    onBackground = Color.White,
    surface = Color(0xFF211B18),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF342822),
    onSurfaceVariant = Color(0xFFFFE8DD)
)

private val LightColorScheme = lightColorScheme(
    primary = RapidingoRed,
    onPrimary = Color.White,
    primaryContainer = RapidingoOrangeSoft,
    onPrimaryContainer = RapidingoInk,
    secondary = RapidingoOrange,
    onSecondary = Color.White,
    secondaryContainer = RapidingoRedLight,
    onSecondaryContainer = RapidingoInk,
    tertiary = RapidingoSuccess,
    background = RapidingoSurface,
    onBackground = RapidingoInk,
    surface = Color.White,
    onSurface = RapidingoInk,
    surfaceVariant = Color(0xFFFFF1E8),
    onSurfaceVariant = RapidingoMuted,
    outline = Color(0xFFE7D7CE)
)

@Composable
fun DeliveryRapidingoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
