package com.example.presentation.customer.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.BusinessInfo
import com.example.domain.model.Category
import com.example.ui.theme.BluePrimary

@Composable
fun HomeCategoriesSection(
    showCategories: Boolean,
    publicBusinesses: List<BusinessInfo>,
    categoriesList: List<Category>,
    selectedCategoryFilter: String,
    onCategoryClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!showCategories) return

    val dynamicCategories = remember(publicBusinesses, categoriesList) {
        val homeRepoCats = categoriesList.filter { it.showInHome && it.active }.sortedBy { it.orderIndex }
        if (homeRepoCats.isNotEmpty()) {
            homeRepoCats.map { cat ->
                val emoji = if (cat.icon.isNotBlank()) cat.icon else "📁"
                val parsedColor = try {
                    val cStr = if (cat.bgColor.startsWith("#")) cat.bgColor else "#EFF6FF"
                    Color(android.graphics.Color.parseColor(cStr))
                } catch (e: Exception) {
                    Color(0xFFEFF6FF)
                }
                Triple(cat, emoji, parsedColor)
            }
        } else {
            val bizCats = publicBusinesses.map { it.getEffectiveCategory() }.filter { it.isNotBlank() }.distinct()
            bizCats.map { cat ->
                val emoji = when (cat.lowercase()) {
                    "restaurante", "restaurantes" -> "🍔"
                    "tienda", "tiendas" -> "🏬"
                    "supermercado", "supermercados" -> "🛒"
                    "farmacia", "farmacias" -> "💊"
                    "postres" -> "🍰"
                    else -> "📁"
                }
                val mockCat = Category(name = cat, icon = emoji)
                Triple(mockCat, emoji, Color(0xFFEFF6FF))
            }
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Categorías",
            fontWeight = FontWeight.ExtraBold,
            fontSize = 18.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(10.dp))

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(dynamicCategories) { (catObj, emoji, bgCol) ->
                val isSelected = selectedCategoryFilter.equals(catObj.name, ignoreCase = true) ||
                        (catObj.slug.isNotBlank() && selectedCategoryFilter.equals(catObj.slug, ignoreCase = true))
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = if (isSelected) BluePrimary else bgCol,
                    border = BorderStroke(
                        1.dp,
                        if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                    ),
                    modifier = Modifier
                        .clickable {
                            onCategoryClick(if (isSelected) "" else catObj.name)
                        }
                        .shadow(1.dp, RoundedCornerShape(16.dp))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(emoji, fontSize = 20.sp)
                        Text(
                            text = catObj.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                        )
                        if (catObj.isFeatured) {
                            Text("⭐", fontSize = 11.sp)
                        }
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}
