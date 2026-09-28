package com.example.presentation.customer.ai

import android.content.Context
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.navigation.NavController
import androidx.test.core.app.ApplicationProvider
import com.example.FirebaseManager
import com.example.domain.engine.ai.LocalToolDispatcher
import com.example.domain.model.ai.*
import com.example.presentation.customer.CustomerHomeScreen
import com.example.presentation.customer.CustomerHomeViewModel
import com.example.ui.theme.MyApplicationTheme
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import io.mockk.mockk
import io.mockk.coEvery
import com.example.data.repository.CustomerAIRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [36])
class CustomerHomeScreenAITest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var aiViewModel: CustomerAIAgentViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)

        val context = ApplicationProvider.getApplicationContext<Context>()
        val options = FirebaseOptions.Builder()
            .setApplicationId("com.aistudio.delivery.djweq")
            .setApiKey("AIzaSyFakeKeyForTestOnly1234567890")
            .setProjectId("bluesystem-delivery")
            .build()

        if (FirebaseApp.getApps(context).isEmpty()) {
            FirebaseApp.initializeApp(context, options)
        }

        val mockRepo = mockk<CustomerAIRepository>()
        coEvery { mockRepo.sendChatMessage(any(), any(), any(), any(), any()) } returns Result.success(
            CustomerAIResponse(
                responseId = "test-resp-1",
                conversationId = "test-conv-1",
                message = "¡Listo! Te ayudo con tu pedido."
            )
        )
        aiViewModel = CustomerAIAgentViewModel(repository = mockRepo)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testCustomerAIFloatingButton_isPresent_andOpensOverlayOnTap() {
        val mockNavController = mockk<NavController>(relaxed = true)
        val mockFirebaseManager = mockk<FirebaseManager>(relaxed = true)

        composeTestRule.setContent {
            MyApplicationTheme {
                CustomerHomeScreen(
                    navController = mockNavController,
                    firebaseManager = mockFirebaseManager,
                    isGuest = false,
                    onLogout = {},
                    aiViewModel = aiViewModel
                )
            }
        }

        // Verify CustomerAIFloatingButton is visible with contentDescription "Abrir Asistente AI"
        val fab = composeTestRule.onNodeWithContentDescription("Abrir Asistente AI")
        fab.assertIsDisplayed()

        // Verify initial state: overlay is closed
        assertFalse(aiViewModel.uiState.value.isOverlayVisible)

        // Perform click on AI Floating Button
        fab.performClick()

        // Verify overlay state changed to open
        assertTrue(aiViewModel.uiState.value.isOverlayVisible)
        assertTrue(aiViewModel.uiState.value.messages.isNotEmpty())
        assertEquals("¡Hola! Soy tu asistente de BlueSystem Delivery. ¿En qué te puedo ayudar hoy?", aiViewModel.uiState.value.messages.first().text)
    }

    @Test
    fun testCustomerAIOverlay_ChatInputBar_isVisibleAndAllowsTypingAndSending() {
        composeTestRule.setContent {
            MyApplicationTheme {
                CustomerAIOverlay(
                    viewModel = aiViewModel
                )
            }
        }

        // Open the overlay
        aiViewModel.openOverlay()
        composeTestRule.waitForIdle()

        // Verify ChatInputBar TextField is displayed
        val inputField = composeTestRule.onNode(hasSetTextAction())
        inputField.assertIsDisplayed()

        // Verify Send button is displayed
        val sendButton = composeTestRule.onNodeWithContentDescription("Enviar mensaje")
        sendButton.assertIsDisplayed()

        // Type a message
        inputField.performTextInput("Quiero una hamburguesa")
        composeTestRule.waitForIdle()

        // Tap Send button
        sendButton.performClick()
        testDispatcher.scheduler.advanceUntilIdle()
        composeTestRule.waitForIdle()

        // Verify user message was recorded in the state
        assertTrue(aiViewModel.uiState.value.messages.any { it.text == "Quiero una hamburguesa" && it.sender == MessageSender.USER })

        // Verify ChatInputBar remains displayed after sending
        val inputFieldAfter = composeTestRule.onNode(hasSetTextAction())
        inputFieldAfter.assertIsDisplayed()
        sendButton.assertIsDisplayed()
    }

    @Test
    fun testCustomerAIOverlay_ChatInputBar_remainsVisibleAfterError() {
        val mockErrorRepo = mockk<CustomerAIRepository>()
        coEvery { mockErrorRepo.sendChatMessage(any(), any(), any(), any(), any()) } returns Result.failure(
            RuntimeException("Network connection error")
        )
        val errorAiViewModel = CustomerAIAgentViewModel(repository = mockErrorRepo)

        composeTestRule.setContent {
            MyApplicationTheme {
                CustomerAIOverlay(
                    viewModel = errorAiViewModel
                )
            }
        }

        errorAiViewModel.openOverlay()
        composeTestRule.waitForIdle()

        // Simulate an error message in conversation
        errorAiViewModel.sendMessage("Trigger error query")
        testDispatcher.scheduler.advanceUntilIdle()
        composeTestRule.waitForIdle()

        // Verify error message is in chat
        assertTrue(errorAiViewModel.uiState.value.messages.isNotEmpty())

        // Verify ChatInputBar is still visible and displayed
        val inputField = composeTestRule.onNode(hasSetTextAction())
        inputField.assertIsDisplayed()

        val sendButton = composeTestRule.onNodeWithContentDescription("Enviar mensaje")
        sendButton.assertIsDisplayed()
    }
}
