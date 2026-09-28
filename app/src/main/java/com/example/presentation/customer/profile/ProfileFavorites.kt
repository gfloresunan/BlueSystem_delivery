package com.example.presentation.customer.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class FavoriteItem(
    val id: String = "",
    val type: String = "", // business, product, branch
    val title: String = "",
    val subtitle: String = "",
    val imageUrl: String = "",
    val rating: Double = 0.0
)

@Composable
fun ProfileFavorites(
    onNavigateToDetail: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedCategory by remember { mutableStateOf("comercios") }
    var searchQuery by remember { mutableStateOf("") }

    val mockFavorites = remember {
        listOf(
            FavoriteItem("f1", "business", "Tip Top Metrocentro", "Comida Rápida • Pollo Frito", "", 4.8),
            FavoriteItem("f2", "business", "Pizza Hut Galerías", "Restaurante • Pizzas & Pastas", "", 4.9),
            FavoriteItem("f3", "product", "Combo Pollo x8 Piezas", "Tip Top • C$ 340.00", "", 4.9),
            FavoriteItem("f4", "product", "Pizza Super Supreme", "Pizza Hut • C$ 420.00", "", 4.8),
            FavoriteItem("f5", "branch", "Sucursal Metrocentro B-12", "Abierto • Atiende Delivery 24/7", "", 4.9),
            FavoriteItem("f6", "branch", "Sucursal Plaza España", "Abierto • Prep: 15-20 min", "", 4.7)
        )
    }

    val categoryFilter = when (selectedCategory) {
        "productos" -> "product"
        "sucursales" -> "branch"
        else -> "business"
    }

    val filteredList = remember(mockFavorites, categoryFilter, searchQuery) {
        mockFavorites.filter { item ->
            item.type == categoryFilter && (searchQuery.isBlank() || item.title.contains(searchQuery, ignoreCase = true))
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Mis Favoritos ❤️",
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 6.dp)
        )

        // Buscador
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Buscar en mis favoritos...", fontSize = 13.sp) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray) },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF6366F1),
                unfocusedBorderColor = Color(0xFFE2E8F0),
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White
            )
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Categorías Selector
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("comercios" to "Comercios 🏪", "productos" to "Productos 🍔", "sucursales" to "Sucursales 🏢").forEach { (key, label) ->
                val isSelected = selectedCategory == key
                Button(
                    onClick = { selectedCategory = key },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isSelected) Color(0xFF6366F1) else Color(0xFFF1F5F9),
                        contentColor = if (isSelected) Color.White else Color(0xFF475569)
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (filteredList.isEmpty()) {
            Text(
                text = "No se encontraron favoritos en esta categoría.",
                fontSize = 13.sp,
                color = Color.Gray,
                modifier = Modifier.padding(16.dp)
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                filteredList.forEach { item ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onNavigateToDetail(item.type, item.id) },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFFEEF2FF)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Storefront, contentDescription = null, tint = Color(0xFF4F46E5), modifier = Modifier.size(22.dp))
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                                Text(item.subtitle, fontSize = 11.sp, color = Color.Gray)
                            }
                            Icon(Icons.Default.Favorite, contentDescription = "Eliminar de Favoritos", tint = Color(0xFFFF2D55), modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
        }
    }
}
