import re
with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'r') as f:
    content = f.read()

# Replace the garbage between the end of orderToAssign dialog and OrderCard
content = re.sub(r'\) \}\n            \} \}\n        \)\n    \}\n.*?(?=@Composable\nfun OrderCard)', r') }\n            } }\n        )\n    }\n', content, flags=re.DOTALL)

with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'w') as f:
    f.write(content)
