const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');
const target = '"unreadCourierCount"]))';
const replacement = '"unreadCourierCount"])';
if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('firestore.rules', content, 'utf8');
    console.log('Successfully patched firestore.rules!');
} else {
    console.log('Target not found in firestore.rules');
}
