import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { renderDetailsPage } from './descriptions.mjs';
import { renderLegalPages } from './licenses.mjs';

// Internal development notes stay in the source checkout only. License files are unaffected.
export const excludedGameFiles = new Set([
    "games/zvezdny-kurer/zvezdny-kurer.md",
    "games/staya-svetlyachkov/staya-svetlyachkov.md",
    "games/bashnya-oblakov/bashnya-oblakov-development-notes.md",
    "games/bashnya-do-oblakov/bashnya-do-oblakov-development-notes.md"
]);

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadCatalog(root) {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'catalog/games.js'), 'utf8'), context, { timeout: 1000 });
    return context.window.GAMES_CATALOG;
}

// Inspect static HTML and CSS resources, not strings inside bundled JavaScript.
export function htmlReferences(source) {
    const markup = source.replace(/<!--[^]*?-->/g, '').replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>');
    const references = [];
    const css = [...markup.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]);
    for (const tag of markup.matchAll(/<([a-z][a-z0-9:-]*)\b[^>]*>/gi)) {
        for (const match of tag[0].matchAll(/\s(src|href)\s*=\s*["']([^"']+)["']/gi)) {
            references.push({ reference: match[2], dependency: match[1].toLowerCase() === 'src' || tag[1].toLowerCase() === 'link' });
        }
        for (const match of tag[0].matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) css.push(match[1] ?? match[2]);
    }
    for (const style of css) {
        for (const match of style.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
            if (!match[1].includes('$' + '{')) references.push({ reference: match[1], dependency: true });
        }
    }
    return references;
}

export function checkProject(root, mode = 'web') {
    root = path.resolve(root);
    const catalog = loadCatalog(root);
    assert.equal(catalog.version, 1, 'Unsupported catalog version');
    const sectionIds = new Set(catalog.sections.map(section => section.id));
    assert.equal(sectionIds.size, catalog.sections.length, 'Duplicate section ID');
    const gameIds = new Set();
    const checked = new Set();
    const generatedPages = new Map();
    // Source pages are generated virtually; built pages must exist on disk.
    if (fs.existsSync(path.join(root, 'package.json'))) {
        for (const [relative, html] of renderLegalPages(root)) generatedPages.set(path.resolve(root, relative), html);
    } else {
        // Validate the license kit as well as its generated HTML pages.
        renderLegalPages(root);
    }
    for (const game of catalog.games.filter(game => game.available && game.detailsSource)) {
        generatedPages.set(path.resolve(root, game.detailsUrl), renderDetailsPage(root, game));
    }
    const isExternal = value => /^(?:https?:)?\/\//i.test(value);

    function checkReference(reference, from = 'index.html', dependency = false) {
        if (!reference || reference.startsWith('#') || /^(?:data:|mailto:|tel:)/i.test(reference)) return;
        if (isExternal(reference)) {
            assert(!(mode === 'gamespace' && dependency), `Offline dependency is external: ${reference}`);
            return;
        }
        assert(!reference.startsWith('/'), `Use a relative path: ${reference}`);
        const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
        if (!clean) return;
        const file = path.resolve(root, path.dirname(from), clean);
        assert(file.startsWith(root + path.sep), `Reference leaves output directory: ${reference}`);
        const parts = path.relative(root, file).split(path.sep);
        assert(!parts.some(part => ['local', '.git', 'AGENTS.md', '.gitignore', 'node_modules'].includes(part)), `Private dependency: ${reference} (from ${from})`);
        assert(generatedPages.has(file) || (fs.existsSync(file) && fs.statSync(file).isFile()), `Missing file: ${path.relative(root, file)} (from ${from})`);
        if (checked.has(file)) return;
        checked.add(file);
        const relative = path.relative(root, file);
        const extension = path.extname(file);
        if (!['.html', '.css', '.js'].includes(extension)) return;
        const source = generatedPages.get(file) ?? fs.readFileSync(file, 'utf8');
        if (extension === '.js') {
            new vm.Script(source, { filename: relative });
            return;
        }
        if (extension === '.html') {
            for (const script of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
                new vm.Script(script[1], { filename: relative });
            }
            for (const { reference, dependency } of htmlReferences(source)) checkReference(reference, relative, dependency);
        } else {
            for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
                if (!match[1].includes('$' + '{')) checkReference(match[1], relative, true);
            }
        }
    }

    for (const game of catalog.games) {
        assert(game.id && !gameIds.has(game.id), `Missing or duplicate game ID: ${game.id}`);
        gameIds.add(game.id);
        assert(sectionIds.has(game.section), `Unknown section: ${game.section}`);
        assert.equal(typeof game.available, 'boolean', `Missing availability: ${game.id}`);
        assert(game.creator !== 'students', `Student entry: ${game.id}`);
        if (!game.available) continue;
        if (!isExternal(game.link)) {
            assert(game.directory && game.link.startsWith(game.directory + '/'), `Game entry must be inside its directory: ${game.id}`);
            assert(/^games\/[a-z0-9-]+$/.test(game.directory), `Expected one directory per game: ${game.directory}`);
        } else {
            assert(mode !== 'gamespace', `External game in offline catalog: ${game.id}`);
        }
        for (const field of ['link', 'imageUrl', 'imageUrlMobile']) {
            if (game[field]) checkReference(game[field], 'index.html', field !== 'link');
        }
        const levels = Object.entries(game.difficulties || {});
        const difficultyValues = new Set();
        const entryUrl = new URL(game.link, 'https://catalog.invalid/');
        if (!isExternal(game.link)) {
            if (levels.length) assert(entryUrl.searchParams.get('diff'), `Missing default difficulty: ${game.id}`);
            else assert(!entryUrl.searchParams.has('diff'), `Game without difficulty must not have diff: ${game.id}`);
        }
        for (const [order, difficulty] of levels) {
            // Numeric keys order the buttons; each game defines its own URL values.
            assert(/^\d+$/.test(order), `Invalid difficulty order: ${game.id}/${order}`);
            const url = new URL(difficulty.link, 'https://catalog.invalid/');
            const value = url.searchParams.get('diff');
            assert(value && value.trim(), `Missing difficulty value: ${game.id}/${order}`);
            assert(!difficultyValues.has(value), `Duplicate difficulty value: ${game.id}/${value}`);
            assert.equal(url.origin + url.pathname, entryUrl.origin + entryUrl.pathname, `Difficulty opens a different game: ${game.id}/${order}`);
            difficultyValues.add(value);
            checkReference(difficulty.link);
        }
        if (levels.length && !isExternal(game.link)) assert(difficultyValues.has(entryUrl.searchParams.get('diff')), `Default difficulty is not in the catalog: ${game.id}`);
        if (game.detailsUrl) checkReference(game.detailsUrl);
    }
    checkReference('index.html');
    checkReference('terms.html');
    checkReference('third-party.html');
    checkReference('LICENSE.md');
    checkReference('NOTICE.md');
    checkReference('gamespace.html');
    checkReference('game-info.html');
    checkReference('assets/icons/role/teacher-cap-minimal.svg', 'index.html', true);
    return { mode, activeGames: catalog.games.filter(game => game.available).length, hiddenGames: catalog.games.filter(game => !game.available).length, checkedFiles: checked.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const result = checkProject(process.argv[2] || projectRoot, process.argv[3] || 'web');
    console.log(JSON.stringify(result, null, 2));
}
