// Run from project root:  node scripts/apply-theme-colors.js
// COLORS / colors constants ko themedColors(...) me wrap karta hai, taaki
// inline use (icon color, Text color, etc.) bhi dark mode / accent follow kare.
// Dobara chalane par safe. DashboardScreen (jo pehle se tc/tb use karti hai) skip hoti hai.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const dirs = ['screens', 'components'];
const skip = new Set([
  'EmployeesScreen.js', 'AppearanceScreen.js', 'Animated.js',
  'AuthKit.js', 'GeoStampCapture.js', 'SideDrawer.js', 'StatusDialog.js',
]);
let changed = 0;

dirs.forEach((d) => {
  const dir = path.join(root, d);
  if (!fs.existsSync(dir)) return;

  fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !skip.has(f)).forEach((f) => {
    const p = path.join(dir, f);
    let src = fs.readFileSync(p, 'utf8');

    if (src.includes('themedColors(')) return;                         // already done
    if (/import\s*\{[^}]*\btc\b[^}]*\}\s*from\s*['"]\.\.\/theme\/themedStyles['"]/.test(src)) return; // uses tc/tb already

    const re = /((?:export )?const (?:COLORS|colors) = )\{([\s\S]*?)\n\};/;
    if (!re.test(src)) return;

    src = src.replace(re, '$1themedColors({$2\n});');

    const named = /import\s*\{([^}]*)\}\s*from\s*'\.\.\/theme\/themedStyles';/;
    if (named.test(src)) {
      src = src.replace(named, (m, names) => `import { ${names.trim()}, themedColors } from '../theme/themedStyles';`);
    } else {
      const imp = "import { themedColors } from '../theme/themedStyles';\n";
      const m = src.match(/^import React[^\n]*\n/m);
      src = m ? src.replace(m[0], m[0] + imp) : imp + src;
    }

    fs.writeFileSync(p, src);
    changed += 1;
    console.log('patched', path.join(d, f));
  });
});
console.log(`Done. ${changed} file(s) patched.`);