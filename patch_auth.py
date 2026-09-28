with open('app/src/main/java/com/example/presentation/auth/AuthScreen.kt', 'r') as f:
    content = f.read()

content = content.replace('user.uid', 'com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""')

with open('app/src/main/java/com/example/presentation/auth/AuthScreen.kt', 'w') as f:
    f.write(content)
print("AuthScreen patched")
