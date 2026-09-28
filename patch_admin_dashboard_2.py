with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'r') as f:
    content = f.read()

import re
content = re.sub(r'var userToEdit.*?\n', '', content)
content = re.sub(r'var userToDelete.*?\n', '', content)
content = re.sub(r'if \(userToEdit != null\) \{.*?\n        \}\n    \}\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'if \(userToDelete != null\) \{.*?\n        \}\n    \}\n', '', content, flags=re.DOTALL)

with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'w') as f:
    f.write(content)
