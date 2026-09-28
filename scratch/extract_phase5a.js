const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// Add import
const importStatement = 'import com.example.presentation.customer.components.*';
if (!code.includes(importStatement)) {
  code = code.replace(
    'package com.example.presentation.customer\n',
    'package com.example.presentation.customer\n\n' + importStatement + '\n'
  );
}

const lines = code.split('\n');

let catCardIdx = -1;
let favScreenIdx = -1;
let notifItemIdx = -1;
let searchCardIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('fun CategoryCard(')) {
    catCardIdx = (i > 0 && lines[i-1].includes('@Composable')) ? i - 1 : i;
  }
  if (lines[i].includes('fun FavoritesScreen(')) {
    favScreenIdx = (i > 0 && lines[i-1].includes('@Composable')) ? i - 1 : i;
  }
  if (lines[i].includes('fun NotificationItem(')) {
    notifItemIdx = (i > 0 && lines[i-1].includes('@Composable')) ? i - 1 : i;
  }
  if (lines[i].includes('fun GlobalSearchResultItemCard(')) {
    searchCardIdx = (i > 0 && lines[i-1].includes('@Composable')) ? i - 1 : i;
  }
}

console.log('catCardIdx:', catCardIdx, lines[catCardIdx]);
console.log('favScreenIdx:', favScreenIdx, lines[favScreenIdx]);
console.log('notifItemIdx:', notifItemIdx, lines[notifItemIdx]);
console.log('searchCardIdx:', searchCardIdx, lines[searchCardIdx]);

if (catCardIdx !== -1 && favScreenIdx !== -1 && notifItemIdx !== -1 && searchCardIdx !== -1) {
  const part1 = lines.slice(0, catCardIdx);
  const part2_favorites = lines.slice(favScreenIdx, notifItemIdx);
  const part3_search = lines.slice(searchCardIdx);
  
  const newLines = [...part1, ...part2_favorites, ...part3_search];
  const newCode = newLines.join('\n');
  fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', newCode, 'utf8');
  console.log('CustomerHomeScreen.kt updated successfully! New total lines:', newLines.length);
} else {
  console.error('Could not find all indices!');
}
