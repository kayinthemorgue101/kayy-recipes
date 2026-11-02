// Drawn placeholder for recipes that don't have a photo yet.
// A top-down empty plate on a warm dark table. No dependencies.

const zlib = require("zlib");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const start = y * (w * 3 + 1);
    raw[start] = 0;
    rgb.copy(raw, start + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function hash(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
}

function ellipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function createPlaceholder(w = 720, h = 900) {
  const rgb = Buffer.alloc(w * h * 3);
  const cx = w * 0.5;
  const cy = h * 0.48;
  const rx = w * 0.30;
  const ry = h * 0.145;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w - 0.5;
      const ny = y / h - 0.46;
      const vig = Math.min(1, (nx * nx * 1.15 + ny * ny * 1.35) * 2.15);
      let r = mix(32, 10, vig);
      let g = mix(22, 8, vig);
      let b = mix(18, 7, vig);

      const glow = Math.exp(-(nx * nx * 7.5 + (y / h - 0.36) * (y / h - 0.36) * 10));
      r += glow * 78;
      g += glow * 24;
      b += glow * 14;

      const side = Math.exp(-((x / w - 0.86) ** 2 * 18 + (y / h - 0.08) ** 2 * 14));
      r += side * 70;
      g += side * 16;
      b += side * 12;

      const shadow = ellipse(x, y, cx, cy + ry * 0.22, rx * 1.08, ry * 1.18);
      if (shadow < 1) {
        const a = (1 - shadow) * (1 - shadow) * 0.62;
        r *= 1 - a;
        g *= 1 - a;
        b *= 1 - a;
      }

      const e = ellipse(x, y, cx, cy, rx, ry);
      if (e <= 1) {
        const rimT = (e - 0.72) / 0.28;
        if (e > 0.72) {
          const light = 1 - (y - (cy - ry)) / (ry * 2);
          const shade = 0.62 + Math.max(0, light) * 0.5;
          const edge = rimT > 0.82 ? 0.78 : 1;
          r = 236 * shade * edge;
          g = 214 * shade * edge;
          b = 186 * shade * edge;
          const spec = ellipse(x, y, cx - rx * 0.28, cy - ry * 0.62, rx * 0.42, ry * 0.18);
          if (spec < 1 && rimT < 0.75) {
            const s = (1 - spec) * 0.55;
            r = mix(r, 255, s);
            g = mix(g, 248, s);
            b = mix(b, 236, s);
          }
        } else {
          const well = ellipse(x, y, cx, cy + ry * 0.04, rx * 0.78, ry * 0.72);
          const depth = Math.min(1, well);
          r = mix(42, 18, depth);
          g = mix(28, 13, depth);
          b = mix(24, 12, depth);
          const innerGlow = Math.exp(-well * 2.4) * 0.22;
          r += innerGlow * 90;
          g += innerGlow * 28;
          b += innerGlow * 16;
        }
      }

      const n = hash(x, y) - 0.5;
      const grain = e <= 1 && e > 0.72 ? 7 : 11;
      r += n * grain;
      g += n * grain;
      b += n * (grain * 0.85);

      const i = (y * w + x) * 3;
      rgb[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      rgb[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      rgb[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
  }

  return encodePNG(w, h, rgb);
}

module.exports = { createPlaceholder, encodePNG };
