with open('app/src/main/java/com/example/presentation/admin/AdminUsersScreen.kt', 'r') as f:
    content = f.read()

import_statement = "import androidx.compose.foundation.clickable\n"
if import_statement not in content:
    content = content.replace("import androidx.compose.foundation.background", import_statement + "import androidx.compose.foundation.background")

with open('app/src/main/java/com/example/presentation/admin/AdminUsersScreen.kt', 'w') as f:
    f.write(content)
