package com.example.eiam.presentation.ui.bsds.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.example.eiam.presentation.ui.bsds.theme.BSDSBlue700
import com.example.eiam.presentation.ui.bsds.theme.BSDSError
import com.example.eiam.presentation.ui.bsds.theme.BSDSSuccess

enum class BSButtonVariant {
    Primary,
    Secondary,
    Tertiary,
    Danger,
    Success
}

/**
 * 🔘 BSButton - Botón oficial oficial de BSDS v1.0 (ADR-005)
 * Altura estándar: 56dp | Radio de borde: 16dp
 */
@Composable
fun BSButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: BSButtonVariant = BSButtonVariant.Primary,
    enabled: Boolean = true,
    icon: ImageVector? = null
) {
    val buttonShape = RoundedCornerShape(16.dp)
    val buttonModifier = modifier
        .height(56.dp)
        .fillMaxWidth()

    when (variant) {
        BSButtonVariant.Primary -> {
            Button(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = buttonShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = BSDSBlue700,
                    contentColor = Color.White
                )
            ) {
                if (icon != null) {
                    Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                Text(text = text, style = MaterialTheme.typography.labelLarge)
            }
        }
        BSButtonVariant.Secondary -> {
            OutlinedButton(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = buttonShape,
                border = BorderStroke(1.5.dp, BSDSBlue700),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = BSDSBlue700
                )
            ) {
                if (icon != null) {
                    Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                Text(text = text, style = MaterialTheme.typography.labelLarge)
            }
        }
        BSButtonVariant.Tertiary -> {
            TextButton(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = buttonShape
            ) {
                if (icon != null) {
                    Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                Text(text = text, style = MaterialTheme.typography.labelLarge)
            }
        }
        BSButtonVariant.Danger -> {
            Button(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = buttonShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = BSDSError,
                    contentColor = Color.White
                )
            ) {
                if (icon != null) {
                    Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                Text(text = text, style = MaterialTheme.typography.labelLarge)
            }
        }
        BSButtonVariant.Success -> {
            Button(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = buttonShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = BSDSSuccess,
                    contentColor = Color.White
                )
            ) {
                if (icon != null) {
                    Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                Text(text = text, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

/**
 * 🔘 BSFloatingActionButton - Botón flotante circular 64dp
 */
@Composable
fun BSFloatingActionButton(
    onClick: () -> Unit,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    contentDescription: String? = null
) {
    FloatingActionButton(
        onClick = onClick,
        modifier = modifier.size(64.dp),
        shape = CircleShape,
        containerColor = BSDSBlue700,
        contentColor = Color.White,
        elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp)
    ) {
        Icon(imageVector = icon, contentDescription = contentDescription, modifier = Modifier.size(28.dp))
    }
}
