const fs = require('fs');
let content = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

const lines = content.split(/\r?\n/);
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// 3. BARRA HORIZONTAL DE CATEGORÍAS')) {
    startIdx = i;
  }
  if (lines[i].includes('// 4. CUSTOMER GLOBAL SEARCH ENGINE v1.0')) {
    endIdx = i;
  }
}

console.log('startIdx:', startIdx, 'endIdx:', endIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacementLines = [
    '                            // 3. BARRA HORIZONTAL DE CATEGORÍAS MODULARIZADA (FASE 5E.2)',
    '                            HomeCategoriesSection(',
    '                                showCategories = dashboardConfig.showCategories,',
    '                                publicBusinesses = publicBusinesses,',
    '                                categoriesList = categoriesList,',
    '                                selectedCategoryFilter = selectedCategoryFilter,',
    '                                onCategoryClick = { selectedCategoryFilter = it }',
    '                            )',
    ''
  ];

  const part1 = lines.slice(0, startIdx);
  const part2 = lines.slice(endIdx);
  const newLines = [...part1, ...replacementLines, ...part2];
  fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', newLines.join('\n'), 'utf8');
  console.log('CustomerHomeScreen.kt updated successfully! New line count:', newLines.length);
} else {
  console.error('Lines not found!');
}
