with open('app/src/main/java/com/example/MainActivity.kt', 'r') as f:
    content = f.read()

import_statement = "import com.example.presentation.admin.AdminUsersScreen\nimport com.example.presentation.admin.AdminUsersViewModel\nimport com.example.presentation.admin.AdminUsersViewModelFactory\n"
if "AdminUsersScreen" not in content:
    content = content.replace("import com.example.presentation.auth.AuthViewModelFactory", "import com.example.presentation.auth.AuthViewModelFactory\n" + import_statement)

new_composable = """
                    composable("admin_users") {
                        val factory = remember { AdminUsersViewModelFactory(firebaseManager) }
                        val adminUsersViewModel: AdminUsersViewModel = viewModel(factory = factory)
                        AdminUsersScreen(
                            navController = navController,
                            viewModel = adminUsersViewModel
                        )
                    }
"""

# Insert before composable("admin_dashboard_screen")
if 'composable("admin_dashboard_screen")' in content:
    content = content.replace('composable("admin_dashboard_screen") {', new_composable + '                    composable("admin_dashboard_screen") {')

with open('app/src/main/java/com/example/MainActivity.kt', 'w') as f:
    f.write(content)
