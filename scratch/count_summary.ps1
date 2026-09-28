$androidFiles = Get-ChildItem -File -Recurse app/src/main/java
$screens = $androidFiles | Where-Object { $_.Name -like "*Screen.kt" -or $_.Name -like "*Dialog*.kt" -or $_.Name -like "*Overlay.kt" -or $_.Name -like "*Section.kt" } | Select-Object -ExpandProperty FullName
$viewModels = $androidFiles | Where-Object { $_.Name -like "*ViewModel.kt" } | Select-Object -ExpandProperty FullName
$repos = $androidFiles | Where-Object { $_.Name -like "*Repository*.kt" -or $_.Name -like "*Manager*.kt" -or $_.Name -like "*Service*.kt" -or $_.Name -like "*Engine*.kt" } | Select-Object -ExpandProperty FullName

Write-Host "Android Screens/Dialogs: $($screens.Count)"
Write-Host "Android ViewModels: $($viewModels.Count)"
Write-Host "Android Repos/Services/Engines: $($repos.Count)"

$flutterFiles = Get-ChildItem -File -Recurse flutter_client/lib
$flutterScreens = $flutterFiles | Where-Object { $_.Name -like "*screen*.dart" -or $_.Name -like "*dialog*.dart" -or $_.Name -like "*sheet*.dart" -or $_.Name -like "*shell*.dart" } | Select-Object -ExpandProperty FullName
$flutterProviders = $flutterFiles | Where-Object { $_.Name -like "*provider*.dart" -or $_.Name -like "*state*.dart" -or $_.Name -like "*controller*.dart" } | Select-Object -ExpandProperty FullName
$flutterServices = $flutterFiles | Where-Object { $_.Name -like "*service*.dart" -or $_.Name -like "*repo*.dart" -or $_.Name -like "*adapter*.dart" } | Select-Object -ExpandProperty FullName

Write-Host "Flutter Screens/Shells: $($flutterScreens.Count)"
Write-Host "Flutter Providers/State: $($flutterProviders.Count)"
Write-Host "Flutter Services/Adapters: $($flutterServices.Count)"
