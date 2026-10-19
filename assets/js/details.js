(function () {
    'use strict';
    const game = window.GameCatalog.find(document.body.dataset.gameId);
    if (!game) return;
    const root = new URL('../../', document.baseURI);
    document.title = `${game.title} — Игры Ильи Барило`;
    document.querySelector('[data-game-title]').textContent = game.title;
    document.querySelector('[data-game-genre]').textContent = game.genre || '';
    document.querySelector('[data-game-description]').textContent = game.description || '';
    document.querySelector('[data-game-play]').href = window.GameCatalog.link(game.link, root);
    document.querySelectorAll('a[href]').forEach(link => {
        link.href = window.GameCatalog.link(link.getAttribute('href'));
    });
    const image = document.querySelector('[data-game-image]');
    image.src = new URL(game.imageUrl, root).href;
    image.alt = game.title;
    const levels = window.GameCatalog.difficultyLinks(game, root);
    if (levels) document.querySelector('[data-game-actions]').append(levels);
})();
