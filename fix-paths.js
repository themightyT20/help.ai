// This script finds and fixes all instances of import.meta.dirname in your project
// Save this as fix-paths.js in your project root and run with: node fix-paths.js

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Directories to skip
const SKIP_DIRS = ['node_modules', 'dist', '.git'];

// Function to recursively find all .ts files
async function findAllTsFiles(dir) {
  const files = [];
  const entries = await readdir(dir);
  
  for (const entry of entries) {
    if (SKIP_DIRS.includes(entry)) continue;
    
    const fullPath = path.join(dir, entry);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      const subDirFiles = await findAllTsFiles(fullPath);
      files.push(...subDirFiles);
    } else if (entry.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to fix a file
async function fixFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  
  // Skip files that don't use import.meta.dirname
  if (!content.includes('import.meta.dirname')) {
    return false;
  }
  
  console.log(`Fixing file: ${filePath}`);
  
  // Create replacement with proper ESM path handling
  let newContent = content;
  
  // Add the imports if they don't exist
  if (!content.includes('import { fileURLToPath }')) {
    // Find the last import line
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import '));
    const lastImportLine = importLines[importLines.length - 1];
    const lastImportIndex = content.indexOf(lastImportLine) + lastImportLine.length;
    
    // Add our imports after the last import
    const importStatement = `\nimport { fileURLToPath } from 'url';`;
    newContent = newContent.slice(0, lastImportIndex) + importStatement + newContent.slice(lastImportIndex);
  }
  
  // Add the __filename and __dirname declarations if they don't exist
  if (!newContent.includes('const __filename =')) {
    // Find where to insert the declarations (after imports)
    const lastImportIndex = newContent.lastIndexOf('import ');
    const nextLineAfterImports = newContent.indexOf('\n', lastImportIndex);
    
    // Add declarations
    const declarations = `\n\n// Get proper directory paths for ESM\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\n`;
    newContent = newContent.slice(0, nextLineAfterImports + 1) + declarations + newContent.slice(nextLineAfterImports + 1);
  }
  
  // Replace all instances of import.meta.dirname with __dirname
  newContent = newContent.replace(/import\.meta\.dirname/g, '__dirname');
  
  // Write the fixed content back
  await writeFile(filePath, newContent);
  return true;
}

// Main function
async function main() {
  try {
    console.log('Searching for TypeScript files...');
    const tsFiles = await findAllTsFiles(process.cwd());
    console.log(`Found ${tsFiles.length} TypeScript files`);
    
    let fixedCount = 0;
    for (const file of tsFiles) {
      const wasFixed = await fixFile(file);
      if (wasFixed) fixedCount++;
    }
    
    console.log(`Fixed ${fixedCount} files containing import.meta.dirname`);
    console.log('Please rebuild your project now with: npm run build');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
