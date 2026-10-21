import fs from 'node:fs';
import './licenses.test.mjs';
import './qr.test.mjs';
import './pavilion.test.mjs';
import './view-mode.test.mjs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { projectRoot, loadCatalog, checkProject, htmlReferences } from './check.mjs';
import { renderDescription, renderDetailsPage } from './descriptions.mjs';

const read = file => fs.readFileSync(path.join(projectRoot, file), 'utf8').replace(/\r\n/g, '\n');
const snake = read('games/snake3d-turns/snake3d-turns.html');
const tictac = read('games/tictac/tictac.html');
const robosklad = read('games/tictac-robots/tictac-robots.html');
const evolution = read('games/snake-evolution/snake-evolution.html');
function between(source, start, end) {
    const first = source.indexOf(start);
    const last = source.indexOf(end, first);
    assert(first >= 0 && last > first, 'Missing source boundary: ' + start);
    return source.slice(first, last);
}

// Read and execute only the existing parameter-selection code, without changing games.
function resolveSnake(search, saved = 'hard') {
    const definitions = between(snake, 'var DIFF={', 'var devUsed=');
    const valid = snake.match(/function validDifficulty\(id\)\{[^\n]*\}/)[0];
    const selection = between(snake, 'var savedDifficulty=', '\ntry{');
    const context = { window: { location: { search } }, URLSearchParams, readStore: () => saved };
    const result = vm.runInNewContext(definitions + '\n' + valid + '\n' + selection + '\nJSON.stringify({selected:selectedDifficulty,config:DIFF[selectedDifficulty],presets:Object.keys(DIFF)});', context);
    return JSON.parse(result);
}
function resolveTictac(search) {
    const selection = between(tictac, 'const DIFFICULTIES = {', '// Конфигурация игры');
    const context = { window: { location: { search } }, URLSearchParams };
    return JSON.parse(vm.runInNewContext(selection + '\nJSON.stringify({selected:difficulty,config,presets:Object.keys(DIFFICULTIES)});', context));
}
function resolveRobosklad(search, saved = {}) {
    const scripts = [...robosklad.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
    const rules = scripts.find(source => source.includes('globalThis.RoboRules='));
    const scene = scripts.find(source => source.includes('function initialConfig()'));
    assert(rules && scene, 'Missing Robosklad configuration code');
    const selection = between(scene, 'function initialConfig(){', '  const RENDER_LEVELS=');
    const context = { location: { search }, URLSearchParams, localStorage: { getItem: () => JSON.stringify(saved) } };
    return JSON.parse(vm.runInNewContext(rules + '\nconst R = globalThis.RoboRules;\n' + selection + '\nconst config = initialConfig(); JSON.stringify({ selected: config.difficulty, config, presets: Object.keys(R.DIFFICULTIES) });', context));
}
function resolveEvolution(search, saved = 5) {
    const progressCode = between(evolution, 'const EvolutionProgress = (() => {', '})();') + '})();';
    const selection = between(evolution, 'const query = new URLSearchParams(location.search);', "  if (query.has('cells'))");
    const context = { location: { search }, URLSearchParams, progress: { difficulty: saved } };
    return JSON.parse(vm.runInNewContext(progressCode + '\n' + selection + '\nJSON.stringify({selected:String(progress.difficulty),config:{difficulty:progress.difficulty},presets:["1","2","3","4","5"]});', context));
}
const numericGames = ["zvezdny-kurer","staya-svetlyachkov","bashnya-oblakov","bashnya-do-oblakov","podvodnaya-ekspeditsiya"];
function resolveNumericGame(id, search) {
    const source = read('games/' + id + '/' + id + '.html');
    const parser = source.match(/function readDifficulty\(\)\s*\{[^}]*\}/)[0];
    const location = { search };
    const selected = vm.runInNewContext(parser + ';readDifficulty()', { location, window: { location }, URLSearchParams });
    return { selected: String(selected), config: { difficulty: selected }, presets: ['1','2','3','4','5'] };
}
for (const id of numericGames) for (const search of ['', '?diff=invalid', '?diff=0', '?diff=6', '?diff=2.5']) {
    assert.equal(resolveNumericGame(id, search).selected, '3', id + ' must retain its default difficulty');
}
function resolveLagoon(search) {
    const source = read('games/tictac-sea/tictac-sea.html');
    const rules = between(source, 'var Qa=', 'function Np(');
    return JSON.parse(vm.runInNewContext(rules + '\nconst selected=Up(' + JSON.stringify(search) + '); JSON.stringify({selected:selected.difficulty,config:Qa[selected.difficulty],presets:Object.keys(Qa)});', { URLSearchParams }));
}
for (const query of ['', '?diff=invalid']) assert.equal(resolveLagoon(query).selected, 'normal');
const contracts = {
    'tictac-sea': ['easy', 'normal', 'hard', 'expert'],
    ...Object.fromEntries(numericGames.map(id => [id, ["1", "2", "3", "4", "5"]])),
    'snake3d-turns': ['easy', 'normal', 'hard'],
    'tictac': ['simple', 'normal', 'hard', 'expert'],
    'tictac-robots': ['simple', 'normal', 'hard', 'expert'],
    'snake-evolution': ['1', '2', '3', '4', '5']
};
const catalog = loadCatalog(projectRoot);
const active = catalog.games.filter(game => game.available);
for (const game of active) {
    const main = new URL(game.link, 'https://games.example/collection/');
    const levels = Object.values(game.difficulties || {});
    const expected = contracts[game.id];
    if (!expected) {
        assert(['8march-shariki', 'interactive-screen-benchmark'].includes(game.id), 'New game needs an explicit launch contract');
        assert.equal(levels.length, 0);
        assert(!main.searchParams.has('diff'));
        continue;
    }
    const defaultDifficulty = game.id === 'snake-evolution' || numericGames.includes(game.id) ? '3' : 'normal';
    assert.equal(main.searchParams.get('diff'), defaultDifficulty);
    const actual = levels.map(level => new URL(level.link, main).searchParams.get('diff'));
    assert.deepEqual(actual, expected, 'Catalog values must match restored presets');
    const resolve = { 'snake3d-turns': resolveSnake, tictac: resolveTictac, 'tictac-robots': resolveRobosklad, 'snake-evolution': resolveEvolution, 'tictac-sea': resolveLagoon }[game.id] || (search => resolveNumericGame(game.id, search));
    assert.equal(resolve(main.search).selected, defaultDifficulty, 'Default link must select the existing normal preset');
    for (const level of levels) {
        const url = new URL(level.link, 'https://games.example/collection/');
        const value = url.searchParams.get('diff');
        const result = resolve(url.search);
        assert.equal(result.selected, value, 'Difficulty link silently falls back: ' + level.link);
        assert(result.presets.includes(value));
        assert(result.config);
        assert.equal(url.pathname, main.pathname);
        assert(!url.searchParams.has('ui'));
    }
}
assert.deepEqual(resolveSnake('?diff=easy').presets, ['easy', 'normal', 'hard']);
assert.equal(resolveSnake('?diff=normal', 'hard').selected, 'normal', 'URL must override saved difficulty');
assert.equal(resolveSnake('?diff=hard', 'easy').selected, 'hard', 'URL must override saved difficulty');

assert.equal(resolveRobosklad('?diff=normal', { difficulty: 'expert', cols: 8, rows: 8 }).selected, 'normal', 'URL must override saved difficulty');
assert.equal(resolveEvolution('?diff=1', 5).selected, '1', 'Evolution URL must override saved difficulty');
assert.equal(resolveEvolution('?diff=5', 1).selected, '5', 'Evolution URL must override saved difficulty');
assert.equal(resolveEvolution('?diff=invalid').selected, '3');

// The website and detail pages create their difficulty anchors through this helper.
function element(tagName) {
    return { tagName, children: [], attributes: {}, append(child) { this.children.push(child); }, setAttribute(name, value) { this.attributes[name] = value; } };
}
const document = { baseURI: 'https://games.example/collection/index.html', createElement: element };
const context = { window: { GAMES_CATALOG: catalog }, document, URL };
vm.runInNewContext(read('assets/js/catalog.js'), context);
const helper = context.window.GameCatalog;
assert.equal(helper.sections().reduce((count, section) => count + section.games.length, 0), active.length);
for (const game of active) {
    const levels = Object.values(game.difficulties || {});
    for (const base of ['https://games.example/collection/index.html', 'https://games.example/collection/']) {
        const group = helper.difficultyLinks(game, base);
        if (!levels.length) { assert.equal(group, null); continue; }
        assert.equal(group.children.length, levels.length);
        for (let index = 0; index < levels.length; index++) {
            const expected = new URL(levels[index].link, base).href;
            assert.equal(group.children[index].href, expected);
            assert.equal(group.children[index].textContent, levels[index].label);
        }
    }
    const launch = new URL(helper.link(game.link));
    assert.equal(launch.searchParams.get('diff'), new URL(game.link, document.baseURI).searchParams.get('diff'));
    assert(!launch.searchParams.has('ui'));
}
assert(!('uiMode' in helper));
for (const entry of ['index.html', 'gamespace.html']) {
    const html = read(entry);
    assert(html.includes('src="catalog/games.js"'));
    assert(html.includes('src="assets/js/catalog.js"'));
}
// Bundled JS may contain HTML snippets and url(...) strings that are not file dependencies.
assert.deepEqual(htmlReferences(String.raw`
<!-- <img src="comment-only.png"> -->
<script src="engine.js">const a = '<img src="dynamic.png">'; const b = 'url(t)';</script>
<link rel="stylesheet" href="theme.css">
<img src="cover.webp" style="background: url('inline.webp')">
<style>.cover { background-image: url("style.webp"); }</style>
<a href="https://example.test/project.js">Project</a>
`), [
    { reference: 'engine.js', dependency: true },
    { reference: 'theme.css', dependency: true },
    { reference: 'cover.webp', dependency: true },
    { reference: 'https://example.test/project.js', dependency: false },
    { reference: 'style.webp', dependency: true },
    { reference: 'inline.webp', dependency: true }
]);

checkProject(projectRoot);
console.log('Passed: restored word parameters, real preset selection, saved-difficulty override, shared catalog links and local resources.');

// Real Markdown formatting, safe output, and a complete page under a subdirectory.
const formatted = renderDescription('# Название\n\nПервый **важный** абзац.\n\n## Раздел\n\n- Один\n- [Два](../../index.html#games)\n\n`<code>`\n\n<script>alert(1)</script>\n\n[Плохая ссылка](javascript:alert(1))');
assert(!formatted.includes('<h1>'));
assert(formatted.includes('<strong>важный</strong>'));
assert(formatted.includes('<h2>Раздел</h2>'));
assert(formatted.includes('<ul>'));
assert(formatted.includes('href="../../index.html#games"'));
assert(formatted.includes('<code>&lt;code&gt;</code>'));
assert(!formatted.includes('<script>'));
assert(!formatted.includes('href="javascript:'));
assert.throws(() => renderDescription('# Только заголовок'), /empty/);
assert.throws(() => renderDescription('Текст\n\n# Второй заголовок'), /Use ##/);
const described = active.find(game => game.id === 'snake3d-turns');
const page = renderDetailsPage(projectRoot, described);
assert.equal((page.match(/<h1\b/g) || []).length, 1);
assert(page.includes('Codex писал и изменял код по моим требованиям.'));
assert(page.includes('Сам код я не редактировал.'));
for (const heading of read(described.detailsSource).matchAll(/^## (.+)$/gm)) {
    assert(page.includes(`<h2>${heading[1]}</h2>`), 'Missing author section: ' + heading[1]);
}
const pageScripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
assert.deepEqual(pageScripts.map(match => match[1].match(/src="([^"]+)"/)?.[1]), [
    '../../assets/vendor/qrcodegen-v1.8.0.js', '../../assets/js/qr-code.js'
]);
assert(pageScripts.every(match => /\bdefer\b/.test(match[1]) && !match[2].trim()), 'Only deferred QR files may run; author text and launch links remain static');
assert(!page.includes('{{'));
for (const level of [described, ...Object.values(described.difficulties)]) {
    const url = new URL('../../' + level.link, 'https://games.example/collection/' + described.detailsUrl);
    assert(page.includes(`href="../../${level.link}"`));
    assert.equal(url.pathname, '/collection/games/snake3d-turns/snake3d-turns.html');
}
assert.throws(() => renderDetailsPage(projectRoot, { ...described, detailsSource: '../outside.md' }), /Unexpected description source/);
console.log('Passed: Markdown formatting, escaping, author sections, one page title, static launch links and nested site paths.');

// Notices must describe the locked tools and preserve their complete licenses.
const lock = JSON.parse(read('package-lock.json'));
const notice = read('NOTICE.md');
for (const [directory, dependency] of Object.entries(lock.packages).filter(([directory]) => directory)) {
    const name = directory.replace(/^node_modules\//, '');
    assert(notice.includes(`| ${name} | ${dependency.version} |`), 'Missing or outdated dependency notice: ' + name);
    const license = fs.readdirSync(path.join(projectRoot, directory)).find(file => /^license(?:[.-]|$)/i.test(file));
    assert(license, 'Dependency has no license file: ' + name);
    assert.equal(read(`licenses/build/${name}.txt`), read(`${directory}/${license}`), 'License text differs from installed dependency: ' + name);
}
console.log('Passed: third-party notices match locked build dependencies and preserve their complete license texts.');
