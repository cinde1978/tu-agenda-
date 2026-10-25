import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, drawFn) {
  // 1. Generate RGBA raw scanlines
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  // 2. Deflate
  const compressed = zlib.deflateSync(rawData);

  // Helper to build chunk
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);

    return Buffer.concat([len, typeAndData, crc]);
  }

  // CRC32 table
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  // PNG Header
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function brandIconRenderer(isMaskable = false) {
  return (x, y, w, h) => {
    const nx = x / w;
    const ny = y / h;

    // Background gradient: from #2563EB (37, 99, 235) to #4338CA (67, 56, 202)
    const t = (nx + ny) / 2;
    const bgR = Math.round(37 + (67 - 37) * t);
    const bgG = Math.round(99 + (56 - 99) * t);
    const bgB = Math.round(235 + (202 - 235) * t);

    // If maskable, bleed full background. If non-maskable, round corners
    if (!isMaskable) {
      const radius = 0.22;
      let dx = 0;
      let dy = 0;
      if (nx < radius) dx = radius - nx;
      else if (nx > 1 - radius) dx = nx - (1 - radius);
      if (ny < radius) dy = radius - ny;
      else if (ny > 1 - radius) dy = ny - (1 - radius);
      if (dx * dx + dy * dy > radius * radius) {
        return [0, 0, 0, 0]; // transparent
      }
    }

    // Calendar white sheet inside safe zone (0.22 to 0.78)
    const calLeft = isMaskable ? 0.22 : 0.18;
    const calRight = isMaskable ? 0.78 : 0.82;
    const calTop = isMaskable ? 0.26 : 0.23;
    const calBottom = isMaskable ? 0.82 : 0.82;

    if (nx >= calLeft && nx <= calRight && ny >= calTop && ny <= calBottom) {
      // Top header bar of calendar (darker blue)
      if (ny <= calTop + 0.15) {
        return [29, 78, 216, 255]; // #1D4ED8
      }
      // Checkmark in calendar
      // approximate checkmark points: (0.42, 0.65) to (0.48, 0.72) to (0.68, 0.50)
      const inCheck1 = distToSegment(nx, ny, 0.40, 0.62, 0.49, 0.71) < 0.026;
      const inCheck2 = distToSegment(nx, ny, 0.49, 0.71, 0.68, 0.50) < 0.026;
      if (inCheck1 || inCheck2) {
        return [37, 99, 235, 255]; // checkmark #2563EB
      }

      // Schedule dots
      if (
        (dist(nx, ny, 0.35, 0.48) < 0.025) ||
        (dist(nx, ny, 0.50, 0.48) < 0.025) ||
        (dist(nx, ny, 0.65, 0.48) < 0.025)
      ) {
        return [219, 234, 254, 255]; // #DBEAFE
      }

      return [255, 255, 255, 255]; // white body
    }

    // Binder rings
    if (ny >= calTop - 0.07 && ny <= calTop + 0.04) {
      if (
        (nx >= 0.30 && nx <= 0.35) ||
        (nx >= 0.475 && nx <= 0.525) ||
        (nx >= 0.65 && nx <= 0.70)
      ) {
        return [255, 255, 255, 255];
      }
    }

    return [bgR, bgG, bgB, 255];
  };
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

const pubDir = path.resolve('public');
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), createPng(180, 180, brandIconRenderer(false)));
fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), createPng(192, 192, brandIconRenderer(false)));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), createPng(512, 512, brandIconRenderer(false)));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), createPng(512, 512, brandIconRenderer(true)));

console.log('PWA PNG icons generated successfully in public/');
