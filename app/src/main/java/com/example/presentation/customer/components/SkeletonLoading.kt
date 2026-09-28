package com.example.presentation.customer.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun SkeletonShimmerEffect(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(12.dp)
) {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_anim"
    )

    val brush = Brush.linearGradient(
        colors = listOf(
            Color(0xFFE2E8F0),
            Color(0xFFF1F5F9),
            Color(0xFFE2E8F0)
        ),
        start = androidx.compose.ui.geometry.Offset(translateAnim - 300f, translateAnim - 300f),
        end = androidx.compose.ui.geometry.Offset(translateAnim, translateAnim)
    )

    Box(
        modifier = modifier
            .clip(shape)
            .background(brush)
    )
}

@Composable
fun DashboardSkeletonLoading() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Skeleton Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                SkeletonShimmerEffect(modifier = Modifier.size(46.dp), shape = RoundedCornerShape(23.dp))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    SkeletonShimmerEffect(modifier = Modifier.width(120.dp).height(16.dp))
                    SkeletonShimmerEffect(modifier = Modifier.width(90.dp).height(12.dp))
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                SkeletonShimmerEffect(modifier = Modifier.size(38.dp), shape = RoundedCornerShape(19.dp))
                SkeletonShimmerEffect(modifier = Modifier.size(38.dp), shape = RoundedCornerShape(19.dp))
            }
        }

        // Skeleton Banner Carousel
        SkeletonShimmerEffect(modifier = Modifier.fillMaxWidth().height(150.dp), shape = RoundedCornerShape(16.dp))

        // Skeleton Categories
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            repeat(4) {
                SkeletonShimmerEffect(modifier = Modifier.width(100.dp).height(40.dp), shape = RoundedCornerShape(14.dp))
            }
        }

        // Skeleton Store Cards
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            repeat(2) {
                SkeletonShimmerEffect(modifier = Modifier.width(200.dp).height(130.dp), shape = RoundedCornerShape(16.dp))
            }
        }
    }
}
