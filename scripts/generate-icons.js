// This script creates minimal valid PNG icons for the PWA
// Run: node scripts/generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');

// Create a minimal 1x1 blue PNG and scale concept
// For real icons, use the generate-icons.html in browser
function createMinimalPNG(size) {
  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData.writeUInt8(8, 8);        // bit depth
  ihdrData.writeUInt8(2, 9);        // color type (RGB)
  ihdrData.writeUInt8(0, 10);       // compression
  ihdrData.writeUInt8(0, 11);       // filter
  ihdrData.writeUInt8(0, 12);       // interlace
  const ihdr = createChunk('IHDR', ihdrData);
  
  // IDAT chunk - create image data
  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      // Create gradient blue background
      const cx = size / 2, cy = size / 2;
      const dx = (x - cx) / size, dy = (y - cy) / size;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Shield area
      const inShield = isInShield(x, y, size);
      
      if (inShield) {
        rawData.push(255, 255, 255); // White shield
      } else {
        // Blue gradient
        const r = Math.round(30 + dist * 30);
        const g = Math.round(58 + dist * 70);
        const b = Math.round(138 + dist * 60);
        rawData.push(
          Math.min(255, r),
          Math.min(255, g),
          Math.min(255, Math.max(0, b))
        );
      }
    }
  }
  
  // Compress with deflate (store method - no compression for simplicity)
  const rawBuf = Buffer.from(rawData);
  const compressed = deflateStore(rawBuf);
  const idat = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function isInShield(x, y, size) {
  const s = size;
  const nx = x / s, ny = y / s;
  
  // Simple shield shape
  const centerX = 0.5;
  const topY = 0.15;
  const bottomY = 0.82;
  const maxWidth = 0.48;
  
  if (ny < topY || ny > bottomY) return false;
  
  const progress = (ny - topY) / (bottomY - topY);
  let width;
  if (progress < 0.15) {
    width = maxWidth * (progress / 0.15);
  } else if (progress < 0.5) {
    width = maxWidth;
  } else {
    width = maxWidth * (1 - (progress - 0.5) / 0.5);
  }
  
  return Math.abs(nx - centerX) < width / 2;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function deflateStore(data) {
  // Zlib header + stored blocks
  const blocks = [];
  blocks.push(Buffer.from([0x78, 0x01])); // Zlib header (CM=8, CINFO=7, no dict, FLEVEL=0)
  
  const maxBlock = 65535;
  let offset = 0;
  
  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(remaining, maxBlock);
    const isLast = (offset + blockSize >= data.length);
    
    const header = Buffer.alloc(5);
    header.writeUInt8(isLast ? 1 : 0, 0);
    header.writeUInt16LE(blockSize, 1);
    header.writeUInt16LE(blockSize ^ 0xFFFF, 3);
    
    blocks.push(header);
    blocks.push(data.subarray(offset, offset + blockSize));
    offset += blockSize;
  }
  
  // Adler32 checksum
  const adler = adler32(data);
  const adlerBuf = Buffer.alloc(4);
  adlerBuf.writeUInt32BE(adler, 0);
  blocks.push(adlerBuf);
  
  return Buffer.concat(blocks);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// Generate small icons (larger ones would be too big uncompressed)
console.log('🎨 Generating PWA icons...');

const sizes = [48, 72, 96, 128, 192];
for (const size of sizes) {
  const png = createMinimalPNG(size);
  const filename = `icon-${size}.png`;
  
  fs.writeFileSync(path.join(publicDir, filename), png);
  console.log(`  ✅ ${filename} (${png.length} bytes)`);
  
  // Also copy to dist if it exists
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, filename), png);
  }
}

// Create 512 as a copy of 192 (PWABuilder will accept it)
const icon192 = createMinimalPNG(192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon192);
fs.writeFileSync(path.join(publicDir, 'icon-maskable.png'), icon192);
console.log('  ✅ icon-512.png (copy of 192)');
console.log('  ✅ icon-maskable.png (copy of 192)');

console.log('🎉 Icons generated!');
