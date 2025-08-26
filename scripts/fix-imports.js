const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files that need client imports
const clientImportFiles = [
  'apps/web/app/login/page.tsx',
  'apps/web/src/components/layout/AppFrame.tsx',
  'apps/web/src/components/layout/Header.tsx', 
  'apps/web/src/components/layout/Sidebar.tsx',
  'apps/web/src/features/calendar/MonthlyCalendarView.tsx',
  'apps/web/src/hooks/useTabRouter.ts'
];

// Process each file
const files = glob.sync('apps/web/**/*.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
});

let updatedCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let updated = false;
  let newContent = content;

  // Check if this file needs client imports
  const needsClient = clientImportFiles.includes(file);

  if (needsClient && content.includes("from '@entrip/shared'")) {
    // For files that import hooks/stores, change to /client
    newContent = newContent.replace(
      /from ['"]@entrip\/shared['"]/g,
      "from '@entrip/shared/client'"
    );
    updated = true;
  } else if (content.includes("from '@entrip/shared'")) {
    // For other files, check if they're importing only server-safe things
    // Parse the imports to see what's being imported
    const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]@entrip\/shared['"]/);
    if (importMatch) {
      const imports = importMatch[1].split(',').map(i => i.trim());
      const hasClientImports = imports.some(imp => 
        imp.includes('use') || imp.includes('Store') || imp.includes('Modal')
      );
      
      if (hasClientImports) {
        newContent = newContent.replace(
          /from ['"]@entrip\/shared['"]/g,
          "from '@entrip/shared/client'"
        );
        updated = true;
      }
    }
  }

  if (updated) {
    fs.writeFileSync(file, newContent);
    updatedCount++;
    console.log(`Updated: ${file}`);
  }
});

console.log(`\nTotal files updated: ${updatedCount}`);