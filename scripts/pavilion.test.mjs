import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets/js/pavilion.js'), 'utf8');
function declaration(name) {
    const start = source.indexOf('function ' + name + '(');
    assert(start >= 0, 'Missing scene function: ' + name);
    let end = source.indexOf('{', start) + 1, depth = 1;
    while (depth && end < source.length) {
        if (source[end] === '{') depth++;
        if (source[end] === '}') depth--;
        end++;
    }
    assert.equal(depth, 0);
    return source.slice(start, end);
}
const context = {};
vm.createContext(context);
vm.runInContext(['transform', 'pivotZ', 'mul', 'exhibitClamp', 'exhibitEase', 'lagoonShotTime', 'lagoonActionState',
    'lagoonKrakenPose', 'lagoonFloatState', 'lagoonFigurePose'].map(declaration).join('\n'), context);
for (let time = 0; time < 24; time += .1) {
    const model = context.lagoonKrakenPose(time);
    for (let column = 0; column < 3; column++) {
        assert(Math.abs(Math.hypot(...model.slice(column * 4, column * 4 + 3)) - 1) < 1e-6, 'Submersion must preserve the kraken size');
    }
    if (time > 17) assert(model[13] < -1, 'The whole kraken must move below the water');
    for (let piece = 0; piece < 4; piece++) {
        const state = context.lagoonFloatState(time, piece);
        if (state.amount > .999) assert(state.y >= .125 && state.y <= .135, 'Floating pieces must touch the water');
        const pose = context.lagoonFigurePose(time, piece);
        for (let column = 0; column < 3; column++) {
            assert(Math.abs(Math.hypot(...pose.slice(column * 4, column * 4 + 3)) - 1) < 1e-6, 'Pieces surface without growing');
        }
    }
}
const surfaced = context.lagoonKrakenPose(8);
assert(surfaced[8] < -.6 && surfaced[10] > .6, 'Kraken must face the ship and the visitor in front of the screen');
const finalFlashEnd = context.lagoonShotTime(2) + .15;
assert.equal(context.lagoonActionState(finalFlashEnd).rise, 1);
assert(context.lagoonActionState(finalFlashEnd + .1).rise < 1, 'Retreat must start immediately after the final flash');
assert.equal(context.lagoonActionState(finalFlashEnd + 1.4).rise, 0, 'Kraken must promptly disappear below the water');
// Run the real hull construction with a mesh collector; every surface edge must close.
const surfaces = [];
const hull = {
    motion: null, lagoonShipPose() {}, exhibitBeam() {},
    mesh(vertices) { surfaces.push(vertices); },
    quad(a, b, c, d) { surfaces.push([a, b, c, a, c, d].flatMap(point => [...point, 0, 0])); }
};
vm.createContext(hull);
const hullStart = source.indexOf('function lagoonHullHalf(');
const hullEnd = source.indexOf('for(const side of [-1,1]){const rail=[];', hullStart);
assert(hullEnd > hullStart);
vm.runInContext(source.slice(hullStart, hullEnd), hull);
const edges = new Map();
const pointKey = point => point.map(value => Math.round(value * 1e6)).join(',');
let triangles = 0;
for (const vertices of surfaces) for (let index = 0; index < vertices.length; index += 15) {
    const points = [vertices.slice(index, index + 3), vertices.slice(index + 5, index + 8), vertices.slice(index + 10, index + 13)];
    const u = points[1].map((value, axis) => value - points[0][axis]);
    const v = points[2].map((value, axis) => value - points[0][axis]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (Math.hypot(...normal) < 1e-8) continue;
    triangles++;
    for (let corner = 0; corner < 3; corner++) {
        const edge = [pointKey(points[corner]), pointKey(points[(corner + 1) % 3])].sort().join('|');
        edges.set(edge, (edges.get(edge) || 0) + 1);
    }
    if (points.every(point => Math.abs(point[2] + 1.65) < 1e-6)) assert(normal[2] < 0, 'Stern normals must face aft');
}
assert(triangles > 100);
assert([...edges.values()].every(count => count === 2), 'The ship hull, stern and deck must form a closed mesh');
console.log('Passed: kraken submerges at fixed size, game pieces float on water, and ship hull has no open edges.');
