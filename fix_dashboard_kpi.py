with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'r') as f:
    content = f.read()

import_statement = "import androidx.compose.material.icons.filled.Person\n"
if import_statement not in content:
    content = content.replace("import androidx.compose.material.icons.filled.Phone", import_statement + "import androidx.compose.material.icons.filled.Phone")

card_kpi_code = """
@Composable
fun CardKpi(
    titulo: String,
    valor: String,
    colorFondo: Color,
    colorTexto: Color,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorFondo),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = valor,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 24.sp,
                color = colorTexto
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = titulo,
                fontSize = 12.sp,
                color = colorTexto.copy(alpha = 0.8f)
            )
        }
    }
}
"""

if "fun CardKpi(" not in content:
    content += card_kpi_code

with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'w') as f:
    f.write(content)
