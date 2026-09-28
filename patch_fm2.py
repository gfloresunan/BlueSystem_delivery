with open('app/src/main/java/com/example/FirebaseManager.kt', 'r') as f:
    content = f.read()

# Add updateUserRole function
update_func = """
    fun updateUserRole(userId: String, newRole: String) {
        db.collection("users").document(userId)
            .update(
                "role", newRole,
                "rol", newRole, // for backward compat
                "active", true,
                "requestedRole", "" // clear pending request if any
            )
            .addOnSuccessListener { Log.d("FirebaseManager", "User role updated") }
            .addOnFailureListener { Log.e("FirebaseManager", "Error updating user role", it) }
    }

    fun rejectUserRoleRequest(userId: String) {
        db.collection("users").document(userId)
            .update("requestedRole", "")
            .addOnSuccessListener { Log.d("FirebaseManager", "User request rejected") }
            .addOnFailureListener { Log.e("FirebaseManager", "Error rejecting user request", it) }
    }
"""

# Insert before the last closing brace
last_brace = content.rfind('}')
if last_brace != -1:
    content = content[:last_brace] + update_func + content[last_brace:]
    with open('app/src/main/java/com/example/FirebaseManager.kt', 'w') as f:
        f.write(content)
