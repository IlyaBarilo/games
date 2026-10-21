(() => {
    'use strict';
    const pageMode = document.currentScript.dataset.view;
    const storageKey = 'games-view-mode';
    const url = new URL(location.href);
    const requested = url.searchParams.get('view');
    const explicit = requested === '2d' || requested === '3d';
    let saved;
    try { saved = localStorage.getItem(storageKey); } catch {}
    const mode = explicit ? requested : pageMode === '2d' ? '2d' : saved === '2d' ? '2d' : '3d';
    // Build-time image hints run only for the selected view.
    document.documentElement.dataset.viewMode = mode;
    const remember = () => { try { localStorage.setItem(storageKey, mode); } catch {} };
    remember();
    if (explicit) url.searchParams.delete('view');
    if (mode !== pageMode) {
        const target = new URL(mode === '2d' ? 'gamespace.html' : 'index.html', url);
        target.search = url.search;
        target.hash = url.hash;
        location.replace(target.href);
        return;
    }
    if (explicit) history.replaceState(history.state, '', url.href);
    // Returning with Back/Forward also selects the page that is actually visible.
    window.addEventListener('pageshow', remember);
})();
