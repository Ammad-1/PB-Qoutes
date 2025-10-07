const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'printberry.sqlite');
const QUOTES_DIR = path.join(__dirname, '..', 'Quotes');

function deleteIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { recursive: true, force: true });
      return true;
    }
  } catch (e) {
    console.error('Failed to delete', filePath, e.message);
  }
  return false;
}

// Delete database file
const dbDeleted = deleteIfExists(DB_PATH);

// Clean Quotes directory contents (keep folder)
try {
  const quotesDir = path.join(__dirname, '..', '..', 'Quotes');
  if (fs.existsSync(quotesDir)) {
    const entries = fs.readdirSync(quotesDir);
    for (const entry of entries) {
      const target = path.join(quotesDir, entry);
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
} catch (e) {
  console.error('Failed cleaning Quotes directory:', e.message);
}

console.log(dbDeleted ? 'Database removed.' : 'Database not found (already clean).');
console.log('Quotes folder cleaned.');


