import assert from 'node:assert/strict';

// Keep the source catalog as the only list of artwork paths. No game assets are rewritten.
export function renderPavilionPreloads(html, games) {
    const marker = '<!-- pavilion-preview-preloads -->';
    assert.equal(html.split(marker).length, 2, 'Pavilion must provide one preview preload slot');
    const urls = [...new Set(games.filter(game => game.available && game.imageUrl).map(game => game.imageUrl))];
    const json = JSON.stringify(urls).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    const script = `<script data-pavilion-preloads>
(() => {
    if (document.documentElement.dataset.viewMode !== '3d') return;
    for (const href of ${json}) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.fetchPriority = 'low';
        link.href = href;
        document.head.append(link);
    }
})();
</script>`;
    return html.replace(marker, () => script);
}
