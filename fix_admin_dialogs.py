with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'r') as f:
    content = f.read()

import re

# We will just remove the if (userToEdit != null) block
content = re.sub(r'if\s*\(\s*userToEdit\s*!=\s*null\s*\)\s*\{.*?\n    \}\n    // --- DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN ---', '    // --- DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN ---', content, flags=re.DOTALL)

with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'w') as f:
    f.write(content)
