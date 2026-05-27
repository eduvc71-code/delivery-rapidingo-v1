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

private val DarkColorSchemeV2 = darkColorScheme(
    primary = BrandYellow,
    onPrimary = BrandBlack,
    primaryContainer = Color(0xFF1F1F1F),
    onPrimaryContainer = Color.White,
    secondary = OpBlue,
    onSecondary = Color.White,
    tertiary = OpGreen,
    background = BrandBlack,
    onBackground = Color.White,
    surface = Color(0xFF1C1C1C),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF2E2E2E),
    onSurfaceVariant = BrandSurfaceGray,
    outline = Color(0xFF2E2E2E)
)

private val LightColorSchemeV2 = lightColorScheme(
    primary = BrandYellow,
    onPrimary = BrandBlack,
    primaryContainer = BrandSurfaceGray,
    onPrimaryContainer = BrandBlack,
    secondary = OpBlue,
    onSecondary = Color.White,
    secondaryContainer = BrandSurfaceGray,
    onSecondaryContainer = BrandBlack,
    tertiary = OpGreen,
    background = BrandBgLight,
    onBackground = BrandBlack,
    surface = BrandWhite,
    onSurface = BrandBlack,
    surfaceVariant = BrandSurfaceGray,
    onSurfaceVariant = BrandGrayMedium,
    outline = BrandSurfaceGray
)

@Composable
fun DeliveryRapidingoV2Theme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorSchemeV2
        else -> LightColorSchemeV2
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = TypographyV2,
        content = content
    )
}
