import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';

// HTML in descriptions is displayed as text. Markdown links retain the parser's
// default protocol checks. No parser or Markdown source is shipped to browsers.
const markdown = new MarkdownIt({ html: false, typographer: false });
export const escapeHtml = value => markdown.utils.escapeHtml(String(value || ''));

export function renderDescription(source) {
    const tokens = markdown.parse(source, {});
    // The page template supplies the single h1 from the catalog.
    if (tokens[0]?.type === 'heading_open' && tokens[0].tag === 'h1') tokens.splice(0, 3);
    assert(tokens.length > 0, 'Markdown description is empty');
    assert(!tokens.some(token => token.type === 'heading_open' && token.tag === 'h1'), 'Use ## for description sections; the page already has a title');
    return markdown.renderer.render(tokens, markdown.options, {});
}

export function renderDetailsPage(root, game) {
    assert.equal(game.detailsSource, `content/games/${game.id}.md`, `Unexpected description source: ${game.id}`);
    assert.equal(game.detailsUrl, `content/games/${game.id}.html`, `Unexpected description URL: ${game.id}`);
    const body = renderDescription(fs.readFileSync(path.join(root, game.detailsSource), 'utf8'));
    const relativeUrl = reference => escapeHtml(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference) ? reference : '../../' + reference);
    const difficulties = Object.entries(game.difficulties || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
    const levels = difficulties.length ? `<div class="difficulty-links" role="group" aria-label="Сложность: ${escapeHtml(game.title)}">${difficulties.map(([order, level]) =>
        `<a class="difficulty-link" href="${relativeUrl(level.link)}">${escapeHtml(level.label || `Уровень ${order}`)}</a>`
    ).join('')}</div>` : '';
    const values = {
        title: escapeHtml(game.title), genre: escapeHtml(game.genre),
        description: escapeHtml(game.description), image: relativeUrl(game.imageUrl),
        play: relativeUrl(game.link), difficulties: levels, body
    };
    const template = fs.readFileSync(path.join(root, 'templates/game-details.html'), 'utf8');
    return template.replace(/\{\{([a-z]+)\}\}/g, (_, key) => {
        assert(Object.hasOwn(values, key), `Unknown description template field: ${key}`);
        return values[key];
    });
}
