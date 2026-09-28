with open('app/src/main/java/com/example/Models.kt', 'r') as f:
    content = f.read()

new_appuser = """data class AppUser(
    val uid: String = "",
    val nombre: String = "",
    val email: String = "",
    val telefono: String = "",
    val userType: String = "",
    val role: String = "",
    val requestedRole: String = "",
    val active: Boolean = false
)"""

import re
content = re.sub(r'data class AppUser\([^)]+\)', new_appuser, content)

with open('app/src/main/java/com/example/Models.kt', 'w') as f:
    f.write(content)
