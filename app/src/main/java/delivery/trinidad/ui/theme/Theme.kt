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
    onPrimary = Color.White,
    primaryContainer = RapidingoRedDark,
    onPrimaryContainer = Color.White,
    secondary = RapidingoYellow,
    onSecondary = RapidingoInk,
    tertiary = RapidingoOrangeLight,
    background = RapidingoInk,
    onBackground = Color.White,
    surface = Color(0xFF171717),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF232323),
    onSurfaceVariant = Color(0xFFE5E5E5),
    outline = Color(0x33FF6A00)
)

private val LightColorScheme = lightColorScheme(
    primary = RapidingoOrange,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF23180F),
    onPrimaryContainer = RapidingoInk,
    secondary = RapidingoYellow,
    onSecondary = RapidingoInk,
    secondaryContainer = RapidingoRedLight,
    onSecondaryContainer = RapidingoInk,
    tertiary = RapidingoSuccess,
    background = RapidingoSurface,
    onBackground = Color.White,
    surface = Color(0xFF171717),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF232323),
    onSurfaceVariant = Color(0xFFE5E5E5),
    outline = Color(0x33FF6A00)
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
