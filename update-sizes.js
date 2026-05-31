
import fs from 'node:fs';

let content = fs.readFileSync('src/components/landing/landing-types.ts', 'utf8');

// Update ring 0 (width: 70 -> width: 74)
content = content.replace(/(ring: 0.*?width: )70/g, (_, prefix) => `${prefix}74`);

// Update ring 1 (width: 85 -> width: 89)
content = content.replace(/(ring: 1.*?width: )85/g, (_, prefix) => `${prefix}89`);

fs.writeFileSync('src/components/landing/landing-types.ts', content);

