// Jest resolver shim for '@hookform/resolvers/zod'
// This avoids PNPM symlink quirks by resolving the installed package path at runtime
const path = require('path');
const fs = require('fs');

function resolveZodEntry() {
  // 1) Try default Node resolution from this file's location
  try {
    const pkgDefault = require.resolve('@hookform/resolvers/package.json');
    return path.join(path.dirname(pkgDefault), 'zod', 'dist', 'zod.js');
  } catch (_) {}

  // 2) Try using computed search paths
  const searchPaths = (require.resolve.paths && require.resolve.paths('@hookform/resolvers')) || [];
  for (const base of [__dirname, process.cwd(), path.join(__dirname, '..'), ...searchPaths]) {
    try {
      const pkgPath = require.resolve('@hookform/resolvers/package.json', { paths: [base] });
      return path.join(path.dirname(pkgPath), 'zod', 'dist', 'zod.js');
    } catch (_) {}
  }
  // 3) Resolve via realpath of PNPM-linked module under apps/web
  const candidates = [
    path.join(__dirname, '..', 'node_modules', '@hookform', 'resolvers'),
    path.join(process.cwd(), 'apps', 'web', 'node_modules', '@hookform', 'resolvers'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        const real = fs.realpathSync(c);
        const zodCjs = path.join(real, 'zod', 'dist', 'zod.js');
        if (fs.existsSync(zodCjs)) return zodCjs;
      }
    } catch (_) {}
  }
  // 4) Fallback: scan pnpm virtual store for a variant that contains the zod subpath
  try {
    const store = path.join(process.cwd(), 'node_modules', '.pnpm');
    const entries = fs.existsSync(store) ? fs.readdirSync(store) : [];
    for (const name of entries) {
      if (name.startsWith('@hookform+resolvers@')) {
        const base = path.join(store, name, 'node_modules', '@hookform', 'resolvers');
        const zodCjs = path.join(base, 'zod', 'dist', 'zod.js');
        if (fs.existsSync(zodCjs)) return zodCjs;
      }
    }
  } catch (_) {}
  throw new Error("Cannot resolve '@hookform/resolvers' package.json for zod entry");
}

module.exports = require(resolveZodEntry());
