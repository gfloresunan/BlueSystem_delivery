package com.example.eiam.presentation.ui.bsds.haptics

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.ui.hapticfeedback.HapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType

/**
 * 📳 BSHapticEngine - Motor de Retroalimentación Táctil Hháptica BDL 3.0 (ADR-007)
 * Proporciona respuesta hháptica contextual en Android para reconocimiento de eventos sin mirar la pantalla.
 */
object BSHapticEngine {

    fun performOrderAccepted(haptic: HapticFeedback?, context: Context?) {
        haptic?.performHapticFeedback(HapticFeedbackType.LongPress)
        vibrateCustomPattern(context, longArrayOf(0, 50), intArrayOf(0, 180))
    }

    fun performPaymentReceived(context: Context?) {
        // Pulso doble rápido para recepción de dinero (30ms - pausa 20ms - 30ms)
        vibrateCustomPattern(context, longArrayOf(0, 30, 20, 30), intArrayOf(0, 200, 0, 255))
    }

    fun performErrorOrAlert(haptic: HapticFeedback?, context: Context?) {
        haptic?.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        // Vibración triple corta para error
        vibrateCustomPattern(context, longArrayOf(0, 40, 30, 40, 30, 40), intArrayOf(0, 255, 0, 255, 0, 255))
    }

    fun performRiskAlert(context: Context?) {
        // Vibración sostenida progresiva para alerta crítica
        vibrateCustomPattern(context, longArrayOf(0, 100, 50, 150), intArrayOf(0, 120, 0, 255))
    }

    private fun vibrateCustomPattern(context: Context?, timings: LongArray, amplitudes: IntArray) {
        if (context == null) return
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val effect = VibrationEffect.createWaveform(timings, amplitudes, -1)
                    vibrator.vibrate(effect)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(timings, -1)
                }
            }
        } catch (_: Exception) {
            // Ignorar suavemente si el dispositivo no soporta vibración
        }
    }
}
