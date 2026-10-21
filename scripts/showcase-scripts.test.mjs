import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { minifyShowcaseScript } from './showcase-scripts.mjs';
const name = 'assets/js/pavilion.js';
const fixture = `/* Copyright test author. All rights reserved. */
/* @license Test terms must survive. */
(async () => {
    'use strict';
    const events = [], field = 'selectedDifficulty';
    function calculate(first, second = 2) { events.push('calculate'); return first + second; }
    class Sample { constructor(value) { this.value = value; } }
    const api = { calculate, selectedDifficulty: 3, get status() { events.push('status'); return this[field]; } };
    const shader = 'attribute vec3 position;\\nvoid main(){gl_Position=vec4(position,1.);}', negative = -0;
    const pattern = /[a-z]+\\/text/gi, message = '\u041a\u0440\u0430\u043a\u0435\u043d <script> & \\u2028';
    await Promise.resolve();
    return JSON.stringify({ events, value: api.calculate(api.status), name: calculate.name, count: calculate.length, className: Sample.name,
        keys: Object.keys(api), shader, pattern: pattern.source, flags: pattern.flags, message,
        negativeZero: Object.is(negative, -0), numeric: [1e-280, 1e280, .1 + .2, NaN, Infinity],
        optional: api.missing?.method?.() ?? 'fallback', sample: new Sample(17).value });
})();`;
const compact = await minifyShowcaseScript(name, fixture);
assert(compact.includes('Copyright test author. All rights reserved.'));
assert(compact.includes('@license Test terms must survive.'));
assert.equal(await vm.runInNewContext(compact), await vm.runInNewContext(fixture), 'Minification must preserve async execution, APIs, numeric values, function names and strings');
assert.equal(compact, await minifyShowcaseScript(name, fixture), 'Build output must be deterministic');
await assert.rejects(minifyShowcaseScript('games/example/example.html', fixture), /allowlist/);
await assert.rejects(minifyShowcaseScript(name, 'const invalid = ;'), /Unexpected token/);
const source = fs.readFileSync(new URL('../assets/js/pavilion.js', import.meta.url), 'utf8');
const pavilion = await minifyShowcaseScript(name, source);
new vm.Script(pavilion);
assert(Buffer.byteLength(pavilion) < Buffer.byteLength(source) * .85, 'The built pavilion must have a meaningful transfer size reduction');
console.log('Passed: build-only pavilion minification preserves comments, async behavior, public keys, function/class names, exact values and strings; games are excluded.');
