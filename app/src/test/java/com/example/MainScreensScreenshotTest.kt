package com.example

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.example.domain.usecase.CheckSessionUseCase
import com.example.domain.usecase.ObtenerTipoUsuarioUseCase
import com.example.presentation.splash.SplashScreen
import com.example.presentation.splash.SplashViewModel
import com.example.ui.theme.MyApplicationTheme
import com.github.takahirom.roborazzi.RobolectricDeviceQualifiers
import com.github.takahirom.roborazzi.captureRoboImage
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableSharedFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = RobolectricDeviceQualifiers.Pixel8, sdk = [36])
class MainScreensScreenshotTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun role_selector_screenshot() {
        composeTestRule.setContent {
            MyApplicationTheme {
                RoleSelectorScreen(onRoleSelected = {})
            }
        }

        composeTestRule.onRoot().captureRoboImage(filePath = "src/test/screenshots/role_selector.png")
    }

    @Test
    fun splash_screen_screenshot() {
        // Mock dependencies
        val checkSessionUseCase = mockk<CheckSessionUseCase>()
        val obtenerTipoUsuarioUseCase = mockk<ObtenerTipoUsuarioUseCase>()

        // Mock ViewModel
        val splashViewModel = mockk<SplashViewModel>(relaxed = true)

        // Ensure navigationEvent is provided since SplashScreen collects it
        every { splashViewModel.navigationEvent } returns MutableSharedFlow()

        composeTestRule.setContent {
            MyApplicationTheme {
                SplashScreen(
                    viewModel = splashViewModel,
                    onNavigate = {}
                )
            }
        }

        composeTestRule.onRoot().captureRoboImage(filePath = "src/test/screenshots/splash_screen.png")
    }
}
