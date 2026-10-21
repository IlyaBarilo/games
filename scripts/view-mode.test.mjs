import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../assets/js/view-mode.js', import.meta.url), 'utf8');
const storage = new Map();
function visit(pageMode, href, unavailable = false) {
    const result = { redirect: null, canonical: null, onShow: null, view: {} };
    const context = {
        document: { documentElement: { dataset: result.view }, currentScript: { dataset: { view: pageMode } } }, URL,
        location: { href, replace: value => { result.redirect = value; } },
        history: { state: { scroll: 20 }, replaceState: (state, title, value) => { result.canonical = value; assert.equal(state.scroll, 20); } },
        window: { addEventListener: (event, listener) => { assert.equal(event, 'pageshow'); result.onShow = listener; } }
    };
    Object.defineProperty(context, 'localStorage', { get() {
        if (unavailable) throw Error('Storage denied');
        return { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
    } });
    vm.runInNewContext(source, context);
    return result;
}
const root = 'https://example.test/collection/';
assert.equal(visit('3d', root).redirect, null, 'First visit opens 3D');
assert.equal(storage.get('games-view-mode'), '3d');
assert.equal(visit('3d', root).view.viewMode, '3d');
assert.equal(visit('3d', root + 'index.html?view=2d').view.viewMode, '2d');
storage.clear();
visit('2d', root + 'gamespace.html');
assert.equal(visit('3d', root + 'index.html?app=1#games').redirect, root + 'gamespace.html?app=1#games');
const explicit = visit('3d', root + 'index.html?view=3d&app=1#games');
assert.equal(explicit.redirect, null, 'Return to 3D overrides saved 2D');
assert.equal(explicit.canonical, root + 'index.html?app=1#games');
assert.equal(visit('3d', root).redirect, null, '3D choice survives another visit');
visit('2d', root + 'gamespace.html');
explicit.onShow();
assert.equal(storage.get('games-view-mode'), '3d', 'Back/Forward remembers visible mode');
assert.equal(visit('3d', root + 'index.html?view=2d').redirect, root + 'gamespace.html');
storage.set('games-view-mode', 'invalid');
assert.equal(visit('3d', root).redirect, null, 'Unknown saved mode falls back to 3D');
assert.equal(visit('3d', root, true).redirect, null, 'Denied localStorage does not block 3D');
assert.equal(visit('3d', root + 'index.html?view=3d', true).canonical, root + 'index.html');
assert.equal(visit('2d', root + 'gamespace.html', true).redirect, null, '2D works without storage');
console.log('View mode preference tests passed.');
