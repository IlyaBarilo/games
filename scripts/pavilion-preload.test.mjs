import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { renderPavilionPreloads } from './pavilion-preload.mjs';
import { loadCatalog, projectRoot } from './check.mjs';

const marker = '<!-- pavilion-preview-preloads -->';
const catalog = loadCatalog(projectRoot);
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rendered = renderPavilionPreloads(html, catalog.games);
assert(rendered.indexOf('data-pavilion-preloads') > rendered.indexOf('src="assets/js/view-mode.js"'));
assert(rendered.indexOf('data-pavilion-preloads') < rendered.indexOf('</head>'));
function links(markup, viewMode = '3d') {
    const appended = [], script = markup.match(/<script data-pavilion-preloads>([\s\S]*?)<\/script>/)?.[1];
    assert(script, 'Missing generated preload script');
    vm.runInNewContext(script, { document: {
        documentElement: { dataset: { viewMode } },
        createElement(tag) { assert.equal(tag, 'link'); return {}; },
        head: { append(link) { appended.push(link); } }
    } });
    return appended;
}
const expected = [...new Set(catalog.games.filter(game => game.available).map(game => game.imageUrl))];
assert.deepEqual(links(rendered).map(link => link.href), expected);
assert(links(rendered).every(link => link.rel === 'preload' && link.as === 'image' && link.fetchPriority === 'low'));
assert.equal(links(rendered, '2d').length, 0, 'Saved 2D must not request pavilion artwork');
assert.equal(links(rendered, null).length, 0);
assert.equal(links(rendered, '').length, 0, 'Without a selected view ordinary image loading remains the fallback');
const hostile = 'games/</script><script>throw Error(1)</script>/a&b.jpg';
const tricky = renderPavilionPreloads(marker, [{ available: true, imageUrl: hostile }, { available: true, imageUrl: hostile }, { available: false, imageUrl: 'hidden.jpg' }, { available: true }]);
assert.equal((tricky.match(/<\/script>/g) || []).length, 1, 'Catalog strings cannot close the generated script');
assert.deepEqual(links(tricky).map(link => link.href), [hostile]);
assert.equal(links(renderPavilionPreloads(marker, [])).length, 0);
assert.throws(() => renderPavilionPreloads('', []), /one preview preload slot/);
assert.throws(() => renderPavilionPreloads(marker + marker, []), /one preview preload slot/);
console.log('Passed: early pavilion artwork hints follow the catalog, reuse exact URLs, exclude hidden/duplicate images, respect 2D and safely escape script text.');
