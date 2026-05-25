package delivery.trinidad.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import delivery.trinidad.R

val MontserratFamily = FontFamily(
    Font(R.font.montserrat_wght, FontWeight.Normal),
    Font(R.font.montserrat_wght, FontWeight.Bold),
    Font(R.font.montserrat_wght, FontWeight.ExtraBold),
    Font(R.font.montserrat_wght, FontWeight.Black)
)

val TekoFamily = FontFamily(
    Font(R.font.teko_wght, FontWeight.Bold),
    Font(R.font.teko_wght, FontWeight.Bold, FontStyle.Italic)
)

val Typography = Typography(
    headlineLarge = TextStyle(
        fontFamily = MontserratFamily,
        fontWeight = FontWeight.Black,
        fontSize = 32.sp,
        lineHeight = 34.sp,
        letterSpacing = 0.sp
    ),
    titleLarge = TextStyle(
        fontFamily = MontserratFamily,
        fontWeight = FontWeight.Black,
        fontSize = 22.sp,
        lineHeight = 26.sp,
        letterSpacing = 0.sp
    ),
    titleMedium = TextStyle(
        fontFamily = MontserratFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 16.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = MontserratFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.sp
    ),
    labelLarge = TextStyle(
        fontFamily = TekoFamily,
        fontWeight = FontWeight.Black,
        fontSize = 14.sp,
        lineHeight = 16.sp,
        letterSpacing = 1.sp
    )
)
