const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Generate an RGBA PNG buffer with Node.js built-in zlib
function createGhostIconPNG(size) {
  const width = size;
  const height = size;

  // Raw RGBA pixel data with filter byte per row
  const rowLength = width * 4 + 1;
  const buffer = Buffer.alloc(rowLength * height);

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    buffer[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Gradient from Indigo (#6366f1) to Purple (#a855f7)
        const t = (x + y) / (width + height);
        const r = Math.round(99 + t * (168 - 99));
        const g = Math.round(102 + t * (85 - 102));
        const b = Math.round(241 + t * (247 - 241));

        // Draw an inner ghost-like shape or shield center (white-ish)
        const innerDx = Math.abs(x - centerX);
        const innerDy = y - (centerY - size * 0.05);
        if (innerDx < size * 0.22 && innerDy > -size * 0.25 && innerDy < size * 0.28) {
          // Eyes in the ghost
          const eyeY = centerY - size * 0.08;
          const leftEyeX = centerX - size * 0.1;
          const rightEyeX = centerX + size * 0.1;
          const distLeftEye = Math.sqrt((x - leftEyeX) ** 2 + (y - eyeY) ** 2);
          const distRightEye = Math.sqrt((x - rightEyeX) ** 2 + (y - eyeY) ** 2);

          if (distLeftEye < size * 0.04 || distRightEye < size * 0.04) {
            // Dark eye
            buffer[pixelOffset] = 15;     // R
            buffer[pixelOffset + 1] = 23; // G
            buffer[pixelOffset + 2] = 42; // B
            buffer[pixelOffset + 3] = 255;// A
          } else {
            // White ghost body
            buffer[pixelOffset] = 248;
            buffer[pixelOffset + 1] = 250;
            buffer[pixelOffset + 2] = 252;
            buffer[pixelOffset + 3] = 255;
          }
        } else {
          // Shield background
          buffer[pixelOffset] = r;
          buffer[pixelOffset + 1] = g;
          buffer[pixelOffset + 2] = b;
          buffer[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent outside circle
        buffer[pixelOffset] = 0;
        buffer[pixelOffset + 1] = 0;
        buffer[pixelOffset + 2] = 0;
        buffer[pixelOffset + 3] = 0;
      }
    }
  }

  // Compress IDAT chunk
  const compressed = zlib.deflateSync(buffer);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const iconsDir = path.join(__dirname, '../extension/icons');
fs.mkdirSync(iconsDir, { recursive: true });

[16, 48, 128].forEach((size) => {
  const pngBuf = createGhostIconPNG(size);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated icon${size}.png (${pngBuf.length} bytes)`);
});

