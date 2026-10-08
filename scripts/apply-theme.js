// // Run from project root:  node scripts/apply-theme.js
// // Har screen/component me StyleSheet.create( -> themedCreate( kar deta hai
// // aur import add karta hai. Dobara chalane par safe (idempotent).
// const fs = require('fs');
// const path = require('path');

// const root = path.join(__dirname, '..', 'src');
// const dirs = ['screens', 'components'];
// const skip = new Set(['EmployeesScreen.js', 'AppearanceScreen.js', 'Animated.js']);
// let changed = 0;

// dirs.forEach((d) => {
//   const dir = path.join(root, d);
//   if (!fs.existsSync(dir)) return;
//   fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !skip.has(f)).forEach((f) => {
//     const p = path.join(dir, f);
//     let src = fs.readFileSync(p, 'utf8');
//     if (!src.includes('StyleSheet.create(') || src.includes('themedCreate')) return;

//     src = src.replace(/StyleSheet\.create\(/g, 'themedCreate(');
//     const imp = "import { themedCreate } from '../theme/themedStyles';\n";
//     const m = src.match(/^import React[^\n]*\n/m);
//     src = m ? src.replace(m[0], m[0] + imp) : imp + src;

//     fs.writeFileSync(p, src);
//     changed += 1;
//     console.log('patched', path.join(d, f));
//   });
// });
// console.log(`Done. ${changed} file(s) patched.`);


// Run from project root:
// node scripts/apply-theme.js
//
// Har screen/component me:
// StyleSheet.create( -> themedCreate()
//
// Aur required import automatically add karta hai.
// Dobara chalane par safe (idempotent).

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');

const dirs = ['screens', 'components'];

// In files ko automatically modify nahi karna hai.
const skip = new Set([
  'EmployeesScreen.js',
  'AppearanceScreen.js',
  'Animated.js',
]);

let changed = 0;

dirs.forEach((d) => {
  const dir = path.join(root, d);

  if (!fs.existsSync(dir)) {
    return;
  }

  fs.readdirSync(dir)
    .filter(
      (f) =>
        f.endsWith('.js') &&
        !skip.has(f)
    )
    .forEach((f) => {
      const p = path.join(dir, f);

      let src = fs.readFileSync(p, 'utf8');

      // Already themed -> skip
      if (
        !src.includes('StyleSheet.create(') ||
        src.includes('themedCreate')
      ) {
        return;
      }

      // Replace StyleSheet.create with themedCreate
      src = src.replace(
        /StyleSheet\.create\(/g,
        'themedCreate('
      );

      // Add themedCreate import
      const imp =
        "import { themedCreate } from '../theme/themedStyles';\n";

      // Add import after React import
      const m = src.match(
        /^import React[^\n]*\n/m
      );

      if (m) {
        src = src.replace(
          m[0],
          m[0] + imp
        );
      } else {
        src = imp + src;
      }

      fs.writeFileSync(p, src);

      changed += 1;

      console.log(
        'patched',
        path.join(d, f)
      );
    });
});

console.log(
  `Done. ${changed} file(s) patched.`
);