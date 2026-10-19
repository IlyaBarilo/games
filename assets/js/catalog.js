(function () {
    'use strict';

    const catalog = window.GAMES_CATALOG;
    window.GameCatalog = {
        link(reference, base = document.baseURI) {
            return new URL(reference, base).href;
        },
        sections() {
            return catalog.sections.map(section => ({
                ...section,
                games: catalog.games.filter(game => game.available === true && game.section === section.id)
            })).filter(section => section.games.length > 0);
        },
        find(id) {
            return catalog.games.find(game => game.id === id && game.available === true);
        },
        difficultyLinks(game, base = document.baseURI) {
            const entries = Object.entries(game.difficulties || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
            if (!entries.length) return null;
            const links = document.createElement('div');
            links.className = 'difficulty-links';
            links.setAttribute('role', 'group');
            links.setAttribute('aria-label', `Сложность: ${game.title}`);
            for (const [level, difficulty] of entries) {
                const link = document.createElement('a');
                link.className = 'difficulty-link';
                link.href = this.link(difficulty.link, base);
                link.textContent = difficulty.label || `Уровень ${level}`;
                link.setAttribute('aria-label', `${game.title}: ${link.textContent}`);
                links.append(link);
            }
            return links;
        },
        countLabel(count) {
            const last = count % 10;
            const lastTwo = count % 100;
            const word = lastTwo >= 11 && lastTwo <= 14
                ? 'игр' : last === 1 ? 'игра' : last >= 2 && last <= 4 ? 'игры' : 'игр';
            return `${count} ${word} в каталоге`;
        }
    };
})();
