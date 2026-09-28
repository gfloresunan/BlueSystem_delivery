const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// Add import
const importStatement = 'import com.example.presentation.customer.favorites.FavoritesScreen';
if (!code.includes(importStatement)) {
  code = code.replace(
    'import com.example.presentation.customer.search.*',
    'import com.example.presentation.customer.search.*\nimport com.example.presentation.customer.favorites.FavoritesScreen'
  );
}

// Cut out FavoritesScreen definition at bottom
const lines = code.split('\n');
let favIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('fun FavoritesScreen(')) {
    favIdx = (i > 0 && lines[i-1].includes('@Composable')) ? i - 1 : i;
    break;
  }
}

console.log('favIdx at bottom:', favIdx);
if (favIdx !== -1) {
  const newLines = lines.slice(0, favIdx);
  fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', newLines.join('\n') + '\n', 'utf8');
  console.log('CustomerHomeScreen.kt updated! New line count:', newLines.length);
} else {
  console.error('FavoritesScreen definition not found!');
}
