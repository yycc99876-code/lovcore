import { deflateRawSync } from 'node:zlib';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const outputDir = path.join(rootDir, 'public', 'downloads');
const outputFile = path.join(outputDir, 'lovcore-clipper.zip');

const ignoredNames = new Set(['.DS_Store', 'Thumbs.db']);

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let c = i;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
}

function collectFiles(dir, base = '') {
  return readdirSync(dir)
    .filter((name) => !ignoredNames.has(name))
    .flatMap((name) => {
      const absolutePath = path.join(dir, name);
      const relativePath = path.posix.join(base, name);
      const stats = statSync(absolutePath);

      if (stats.isDirectory()) {
        return collectFiles(absolutePath, relativePath);
      }

      if (!stats.isFile()) {
        return [];
      }

      return [{ absolutePath, relativePath, stats }];
    });
}

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const source = readFileSync(file.absolutePath);
    const compressed = deflateRawSync(source, { level: 9 });
    const name = Buffer.from(file.relativePath, 'utf8');
    const checksum = crc32(source);
    const { dosDate, dosTime } = dosDateTime(file.stats.mtime);

    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(8),
      uint16(dosTime),
      uint16(dosDate),
      uint32(checksum),
      uint32(compressed.length),
      uint32(source.length),
      uint16(name.length),
      uint16(0),
      name,
    ]);

    localParts.push(localHeader, compressed);

    const centralHeader = Buffer.concat([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(8),
      uint16(dosTime),
      uint16(dosDate),
      uint32(checksum),
      uint32(compressed.length),
      uint32(source.length),
      uint16(name.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      name,
    ]);

    centralParts.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0),
  ]);

  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
}

const files = collectFiles(extensionDir).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, createZip(files));

console.log(`Created ${path.relative(rootDir, outputFile)} with ${files.length} files.`);
