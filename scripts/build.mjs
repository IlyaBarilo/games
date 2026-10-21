import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { projectRoot, loadCatalog, checkProject, excludedGameFiles } from './check.mjs';
import { findSevenZip, createArchive } from './archive.mjs';
import { renderDetailsPage } from './descriptions.mjs';
import { renderLegalPages } from './licenses.mjs';
import { parseReleaseTag, stampBuild } from './version.mjs';
import { siteBaseUrl, applyMetadata } from './metadata.mjs';

const release = process.env.RELEASE_TAG ? parseReleaseTag(process.env.RELEASE_TAG) : null;
const siteConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'catalog/site.json'), 'utf8'));
const baseUrl = siteBaseUrl(process.env.SITE_URL || siteConfig.url);

// Validate before replacing previous build outputs.
console.log('Source:', checkProject(projectRoot));
const sevenZip = findSevenZip();
const sourceCatalog = loadCatalog(projectRoot);
// Render before replacing outputs, so invalid Markdown or templates fail early.
const descriptions = new Map(sourceCatalog.games.filter(game => game.available && game.detailsSource)
    .map(game => [game.id, renderDetailsPage(projectRoot, game)]));
const legalPages = renderLegalPages(projectRoot);
const dist = path.resolve(projectRoot, 'dist');
assert(!fs.existsSync(dist) || !fs.lstatSync(dist).isSymbolicLink(), 'dist must not be a symlink');
fs.mkdirSync(dist, { recursive: true });
assert.equal(fs.realpathSync(dist), path.join(fs.realpathSync(projectRoot), 'dist'));

function copy(relative, output, destination = relative) {
    const target = path.join(output, destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(path.join(projectRoot, relative), target, {
        recursive: true,
        filter: source => !['local', '.git', 'AGENTS.md', '.gitignore'].includes(path.basename(source)) && !excludedGameFiles.has(path.relative(projectRoot, source).split(path.sep).join('/'))
    });
}

for (const mode of ['web', 'gamespace']) {
    const output = path.resolve(dist, mode);
    assert(output === path.join(projectRoot, 'dist', mode), 'Unexpected output directory');
    assert(!fs.existsSync(output) || !fs.lstatSync(output).isSymbolicLink(), 'Output must not be a symlink');
    // Clear only these two generated directories. Keeping the directory itself
    // allows a Windows viewer or terminal to hold it open during a rebuild.
    fs.mkdirSync(output, { recursive: true });
    for (const entry of fs.readdirSync(output)) {
        const target = path.resolve(output, entry);
        assert(path.dirname(target) === output, 'Unexpected generated entry');
        fs.rmSync(target, { recursive: true, force: true });
    }
    const games = sourceCatalog.games.filter(game => game.available && (mode === 'web' || game.directory)).map(game => {
        const entry = { ...game };
        delete entry.detailsSource;
        return entry;
    });
    const usedSections = new Set(games.map(game => game.section));
    const catalog = { ...sourceCatalog, sections: sourceCatalog.sections.filter(section => usedSections.has(section.id)), games };
    fs.mkdirSync(path.join(output, 'catalog'), { recursive: true });
    fs.writeFileSync(path.join(output, 'catalog/games.js'), 'window.GAMES_CATALOG = ' + JSON.stringify(catalog, null, 4) + ';\n');

    copy('index.html', output);
    for (const resource of ['LICENSE.md', 'NOTICE.md', 'USAGE.md', 'licenses']) copy(resource, output);
    for (const [relative, html] of legalPages) fs.writeFileSync(path.join(output, relative), html);
    // Both distributions include the pavilion, 2D catalog and local information pages.
    const resources = ['gamespace.html', 'assets/favicon.png', 'assets/js/catalog.js', 'assets/js/gamespace.js', 'assets/css/gamespace.css', 'assets/icons/role/teacher-cap-minimal.svg', 'assets/js/view-mode.js', 'assets/css/site.css', 'assets/js/pavilion-loading.js', 'assets/js/pavilion.js', 'assets/js/pavilion-developer.js', 'assets/css/pavilion.css', 'game-info.html', 'assets/js/details.js', 'assets/social-preview.jpg', 'assets/js/qr-code.js', 'assets/css/qr-code.css', 'assets/vendor/qrcodegen-v1.8.0.js'];
    for (const resource of resources) copy(resource, output);
    for (const directory of new Set(games.map(game => game.directory).filter(Boolean))) copy(directory, output);
    for (const game of games) {
        if (!game.detailsUrl) continue;
        if (descriptions.has(game.id)) {
            const target = path.join(output, game.detailsUrl);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, descriptions.get(game.id));
            const media = `content/media/${game.id}`;
            if (fs.existsSync(path.join(projectRoot, media))) copy(media, output);
        } else copy(game.detailsUrl, output);
    }
    if (mode === 'web') applyMetadata(output, baseUrl);
    stampBuild(output, release);
    console.log(`${path.relative(projectRoot, output)}:`, checkProject(output, mode));
}
console.log('Archive:', createArchive(sevenZip, path.join(dist, 'gamespace'), path.join(dist, 'games-gamespace.7z')));
console.log('Ready: dist/web, dist/gamespace and dist/games-gamespace.7z.');
