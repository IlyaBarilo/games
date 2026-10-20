import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import MarkdownIt from 'markdown-it';
import vm from 'node:vm';

const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });
const documents = [
    { source: 'LICENSE.md', output: 'terms.html', title: 'Условия использования' },
    { source: 'NOTICE.md', output: 'third-party.html', title: 'Сторонние лицензии' },
    { source: 'USAGE.md', output: 'usage.html', title: 'Как скачать и играть' }
];

// Pin complete supplemental texts, including notices lost by upstream minification.
export function checkSupplementalLicenses(root) {
    const required = new Map([
        ['licenses/earcut-3.0.2-ISC.txt', '324139c19d87af03fda38afea1590e00ca354c4159bdb2ae9e9cec070cfa46a8'],
        ['licenses/three.js-r186-MIT.txt', '8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc'],
        ['licenses/earcut-2.2.2-ISC.txt', 'cd661c432ea8243974e6fde6fc433ebee3e96525ca8b66321b9d9971674ede60'],
        ['licenses/phaser-adaptations-BSD-2-Clause.txt', '72349c5916cfba89a97f7330c202d021d2a83c4d0e6e51ee4fb4275706d1d5b2']
    ]);
    for (const [file, expected] of required) {
        const text = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
        assert.equal(createHash('sha256').update(text).digest('hex'), expected, 'Incomplete or changed license: ' + file);
    }
}

export function checkEmbeddedLicenses(root) {
    const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
    const author = read('LICENSE.md').trim();
    const context = { window: {} };
    vm.runInNewContext(read('catalog/games.js'), context);
    const games = context.window.GAMES_CATALOG.games.filter(game => game.available && game.directory);
    for (const { id } of games) {
        const html = read(`games/${id}/${id}.html`);
        const block = html.match(/<!-- COLLECTION_AUTHOR_LICENSE\n([\s\S]*?)\nEND_COLLECTION_AUTHOR_LICENSE -->/);
        assert(block?.[1].includes(author), 'Missing complete author terms inside HTML: ' + id);
        assert(/<meta\b[^>]*charset\s*=\s*["']?utf-8["']?[^>]*>/i.test(html.slice(0, 1024)), 'UTF-8 declaration must precede long license notices: ' + id);
    }
    for (const [id, license] of [
        ['snake3d-turns', 'earcut-2.2.2-ISC.txt'],
        ['tictac-robots', 'phaser-adaptations-BSD-2-Clause.txt'],
        ['tictac-sea', 'earcut-3.0.2-ISC.txt'],
        ['tictac-sea', 'three.js-r186-MIT.txt']
    ]) {
        const html = read(`games/${id}/${id}.html`);
        assert(html.includes(read('licenses/' + license).trim()), 'Missing complete embedded third-party license: ' + id);
    }
}

export function renderLegalPages(root) {
    checkSupplementalLicenses(root);
    checkEmbeddedLicenses(root);
    const mit = fs.readFileSync(path.join(root, 'licenses/three.js-MIT.txt'), 'utf8');
    const bundledThree = fs.readFileSync(path.join(root, 'games/snake3d-turns/snake3d-turns.html'), 'utf8');
    assert(bundledThree.replace(/\r\n/g, '\n').includes(mit.replace(/\r\n/g, '\n').trim()), 'Bundled three.js must preserve the complete license text');
    const ofl = fs.readFileSync(path.join(root, 'licenses/Roboto-OFL.txt'), 'utf8');
    assert(ofl.includes('Copyright 2011 The Roboto Project Authors (https://github.com/googlefonts/roboto-classic)'));
    assert(ofl.includes('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007'));
    const tictac = fs.readFileSync(path.join(root, 'games/tictac/tictac.html'), 'utf8');
    assert(tictac.replace(/\r\n/g, '\n').includes(ofl.replace(/\r\n/g, '\n').trim()), 'Embedded Roboto fonts must preserve the complete license text');
    return new Map(documents.map(document => {
        const source = fs.readFileSync(path.join(root, document.source), 'utf8');
        assert(source.trim(), 'Empty legal document: ' + document.source);
        const body = markdown.render(source)
            .replaceAll('href="LICENSE.md"', 'href="terms.html"')
            .replaceAll('href="USAGE.md"', 'href="usage.html"')
            .replaceAll('href="NOTICE.md"', 'href="third-party.html"');
        const page = `<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${document.title} — Игры Ильи Барило</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <style>
        body { margin: 0 auto; padding: 1.5rem; max-width: 65rem; font: 1rem/1.65 system-ui, sans-serif; color: #202637; background: #fff; overflow-wrap: anywhere; }
        nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
        a { color: #174a9c; }
        h1, h2, h3 { line-height: 1.3; }
        table { display: block; overflow-x: auto; border-collapse: collapse; }
        th, td { padding: .65rem; border: 1px solid #c9ced8; text-align: left; vertical-align: top; }
    </style>
</head>
<body>
    <nav aria-label="Навигация"><a href="index.html">Коллекция</a><a href="usage.html">Как скачать и играть</a><a href="terms.html">Условия использования</a><a href="third-party.html">Сторонние лицензии</a></nav>
    <main>
${body}
    </main>
</body>
</html>
`;
        return [document.output, page];
    }));
}
