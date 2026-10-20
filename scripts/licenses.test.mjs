import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { checkSupplementalLicenses, checkEmbeddedLicenses } from './licenses.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
checkSupplementalLicenses(root);
checkEmbeddedLicenses(root);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'games-license-test-'));
try {
    fs.mkdirSync(path.join(temporary, 'licenses'));
    const files = ['earcut-2.2.2-ISC.txt', 'phaser-adaptations-BSD-2-Clause.txt', 'earcut-3.0.2-ISC.txt', 'three.js-r186-MIT.txt'];
    for (const file of files) fs.copyFileSync(path.join(root, 'licenses', file), path.join(temporary, 'licenses', file));
    checkSupplementalLicenses(temporary);
    const bsd = path.join(temporary, 'licenses', files[1]);
    const complete = fs.readFileSync(bsd, 'utf8');
    fs.writeFileSync(bsd, complete.slice(0, complete.indexOf('1. Redistributions')));
    assert.throws(() => checkSupplementalLicenses(temporary), /Incomplete or changed license/);
    fs.writeFileSync(bsd, complete);
    fs.unlinkSync(path.join(temporary, 'licenses', files[0]));
    assert.throws(() => checkSupplementalLicenses(temporary), /ENOENT/);
    fs.copyFileSync(path.join(root, 'licenses', files[0]), path.join(temporary, 'licenses', files[0]));
    fs.copyFileSync(path.join(root, 'LICENSE.md'), path.join(temporary, 'LICENSE.md'));
    fs.mkdirSync(path.join(temporary, 'catalog'));
    fs.copyFileSync(path.join(root, 'catalog/games.js'), path.join(temporary, 'catalog/games.js'));
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'catalog/games.js'), 'utf8'), context);
    const gameIds = Array.from(context.window.GAMES_CATALOG.games.filter(game => game.available && game.directory), game => game.id);
    for (const id of gameIds) {
        const folder = path.join(temporary, 'games', id);
        fs.mkdirSync(folder, { recursive: true });
        fs.copyFileSync(path.join(root, 'games', id, id + '.html'), path.join(folder, id + '.html'));
    }
    checkEmbeddedLicenses(temporary);
    for (const [id, removed] of [
        ['snake3d-turns', fs.readFileSync(path.join(root, 'licenses', files[0]), 'utf8').trim()],
        ['tictac-robots', complete.trim()],
        ...gameIds.map(id => [id, fs.readFileSync(path.join(root, 'LICENSE.md'), 'utf8').trim()]),
        ['tictac-sea', fs.readFileSync(path.join(root, 'licenses/earcut-3.0.2-ISC.txt'), 'utf8').trim()],
        ['tictac-sea', fs.readFileSync(path.join(root, 'licenses/three.js-r186-MIT.txt'), 'utf8').trim()]
    ]) {
        const game = path.join(temporary, 'games', id, id + '.html');
        const html = fs.readFileSync(game, 'utf8').replace(/\r\n/g, '\n');
        const normalized = removed.replace(/\r\n/g, '\n');
        assert(html.includes(normalized));
        fs.writeFileSync(game, html.replace(normalized, ''));
        assert.throws(() => checkEmbeddedLicenses(temporary), /Missing complete/);
        fs.writeFileSync(game, html);
    }
} finally {
    assert(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert(path.basename(temporary).startsWith('games-license-test-'));
    fs.rmSync(temporary, { recursive: true });
}
console.log('Passed: missing or truncated supplemental and embedded licenses, and missing author terms, are rejected.');
