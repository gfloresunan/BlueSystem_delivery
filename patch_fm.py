with open('app/src/main/java/com/example/FirebaseManager.kt', 'r') as f:
    content = f.read()

old_map = """                            AppUser(
                                uid = doc.id,
                                nombre = nombre,
                                email = email,
                                telefono = telefono,
                                userType = userType,
                                active = active
                            )"""

new_map = """                            AppUser(
                                uid = doc.id,
                                nombre = nombre,
                                email = email,
                                telefono = telefono,
                                userType = userType,
                                role = doc.getString("role") ?: doc.getString("rol") ?: "",
                                requestedRole = doc.getString("requestedRole") ?: "",
                                active = active
                            )"""

content = content.replace(old_map, new_map)

with open('app/src/main/java/com/example/FirebaseManager.kt', 'w') as f:
    f.write(content)
