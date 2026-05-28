const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../node_modules/vite-plugin-monaco-editor/dist/workerMiddleware.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes('fs.rmdirSync(')) {
    content = content.replace('fs.rmdirSync(', 'fs.rmSync(');
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('Successfully patched vite-plugin-monaco-editor to use fs.rmSync');
  } else {
    console.log('vite-plugin-monaco-editor is already patched or does not contain rmdirSync');
  }
} else {
  console.warn('vite-plugin-monaco-editor/dist/workerMiddleware.js not found');
}
