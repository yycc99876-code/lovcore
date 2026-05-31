const fs = require('fs');
let content = fs.readFileSync('src/components/landing/landing-types.ts', 'utf8');

// Increment existing rings
content = content.replace(/ring: 2/g, 'ring: 3');
content = content.replace(/ring: 1/g, 'ring: 2');
content = content.replace(/ring: 0/g, 'ring: 1');

// Change comments
content = content.replace('// ═══ Outer Orbit (21 images) ═══', '// ═══ Outer Orbit (21 images) ═══ (Ring 3)');
content = content.replace('// ═══ Middle Orbit (17 images) ═══', '// ═══ Middle Orbit (17 images) ═══ (Ring 2)');
content = content.replace('// ═══ Inner Orbit (12 images) ═══', '// ═══ Inner Orbit (12 images) ═══ (Ring 1)');

// Add new ring 0
const newImages = [
  '01_concrete_corridor.webp',
  '02_translucent_leaves.webp',
  '03_underwater_light.webp',
  '04_amber_glass.webp',
  '05_monochrome_collage.webp',
  '06_metal_glass.webp',
  '07_soft_petals.webp',
  '08_rainy_street.webp'
];

let newRingCode = '\n  // ═══ Core Orbit (8 images) ═══ (Ring 0)\n';
newImages.forEach((img, i) => {
  const angle = (360 / 8) * i;
  newRingCode += `  { id: 'img-core-${i+1}', ring: 0, angle: ${angle.toFixed(1)}, image: '/cosmos-assets/${img}', width: 70, opacity: 0.5, tilt: ${(Math.random() * 10 - 5).toFixed(1)} },\n`;
});

content = content.replace('export const HERO_MEMORY_FRAGMENTS = [', 'export const HERO_MEMORY_FRAGMENTS = [' + newRingCode);

fs.writeFileSync('src/components/landing/landing-types.ts', content);
