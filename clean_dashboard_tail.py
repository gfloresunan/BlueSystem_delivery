with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'r') as f:
    content = f.read()

import re

# Remove userToEdit variable
content = re.sub(r'var userToEdit by remember \{ mutableStateOf<AppUser\?>\(null\) \}\n\s*', '', content)

# Remove userToDelete variable
content = re.sub(r'var userToDelete by remember \{ mutableStateOf<AppUser\?>\(null\) \}\n\s*', '', content)

# Remove UserEdit dialog
content = re.sub(r'// --- DIÁLOGO DE EDICIÓN DE USUARIO ---.*?\}\n\s*\}\n', '', content, flags=re.DOTALL)

# Remove User Delete dialog if it exists
content = re.sub(r'// --- DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN ---.*?\}\n\s*\}\n\s*', '', content, flags=re.DOTALL)

with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'w') as f:
    f.write(content)
