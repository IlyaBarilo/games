import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import jsQR from 'jsqr';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = vm.createContext({ TextEncoder, URL });
const vendor = fs.readFileSync(path.join(root, 'assets/vendor/qrcodegen-v1.8.0.js'), 'utf8');
vm.runInContext(vendor, context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/qr-code.js'), 'utf8'), context);
const api = context.QRCodeTools;
context.document = {
    createElementNS(namespaceURI, tagName) {
        return {
            namespaceURI, tagName, attributes: {}, children: [],
            setAttribute(name, value) { this.attributes[name] = String(value); },
            append(...children) { this.children.push(...children); }
        };
    }
};

// Rasterize the actual exported SVG's rectangular path commands, then decode
// with an independent library. This checks the renderer, UTF-8/ECI, and payload.
function decodeSvg(text) {
    const svg = api.createSvg(text, 'Тестовый QR-код');
    const size = Number(svg.attributes.width), scale = 5, width = size * scale;
    assert.equal(svg.attributes.viewBox, `0 0 ${size} ${size}`);
    assert.equal(svg.children[0].attributes.fill, '#fff');
    assert.equal(svg.children[1].attributes.fill, '#000');
    const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
    const commands = [...svg.children[1].attributes.d.matchAll(/M(\d+),(\d+)h(\d+)v1h-(\d+)z/g)];
    assert(commands.length > 0);
    for (const [, xs, ys, ws, reverse] of commands) {
        assert.equal(ws, reverse);
        const x = Number(xs), y = Number(ys), length = Number(ws);
        assert(x >= 4 && y >= 4 && x + length <= size - 4 && y < size - 4, 'Missing quiet zone');
        for (let row = y * scale; row < (y + 1) * scale; row++) {
            for (let col = x * scale; col < (x + length) * scale; col++) {
                const offset = (row * width + col) * 4;
                pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
            }
        }
    }
    const result = jsQR(pixels, width, width, { inversionAttempts: 'dontInvert' });
    assert(result, 'QR could not be decoded');
    assert.equal(result.data, text, 'QR changed the supplied text');
}

for (const [relative, base] of [
    ['../../games/snake3d-turns/snake3d-turns.html?diff=normal', 'https://ilyabarilo.github.io/games/content/games/snake3d-turns.html'],
    ['../../games/tictac/tictac.html?diff=normal', 'https://ilyabarilo.github.io/games/content/games/tictac.html'],
    ['games/tictac-robots/tictac-robots.html?diff=normal', 'https://ilyabarilo.github.io/games/game-info.html'],
    ['../../games/8march-shariki/8march-shariki.html', 'https://ilyabarilo.github.io/games/content/games/8march-shariki.html']
]) {
    const url = api.resolveLink(relative, base);
    assert(url.startsWith('https://ilyabarilo.github.io/games/games/'));
    decodeSvg(url);
}
for (const text of ['12345678901234567890', 'Любой текст: игра, QR-код, 8 Марта!\nВторая строка. 🎮 中文', '<img src=x onerror=alert(1)>', 'Длинный текст. '.repeat(45)]) decodeSvg(text);
assert.throws(() => api.encode(''), /Укажите текст/);
assert.throws(() => api.encode('x'.repeat(10000)));
assert.throws(() => api.resolveLink('javascript:alert(1)', 'https://example.test/'), /HTTP/);
assert.equal(api.resolveLink('../game.html?diff=hard#start', 'https://example.test/nested/page.html'), 'https://example.test/game.html?diff=hard#start');
const license = fs.readFileSync(path.join(root, 'licenses/qrcodegen-MIT.txt'), 'utf8').replace(/\r\n/g, '\n').trim();
for (const source of [vendor.replace(/\r\n/g, '\n'), vendor.replace(/\r?\n/g, '\r\n')]) {
    const header = source.slice(2, source.indexOf('*/')).split(/\r?\n/).map(line => line.replace(/^ \* ?/, '')).join('\n').trim();
    assert.equal(license, header, 'QR vendor notice must be preserved in full');
}
console.log('Passed: independent QR decoding of all game URLs, Unicode, multiline and long text, SVG quiet zones and complete vendor notice.');
