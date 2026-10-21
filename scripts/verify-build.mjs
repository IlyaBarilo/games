import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { projectRoot, checkProject, loadCatalog, excludedGameFiles } from './check.mjs';
import { parseReleaseTag } from './version.mjs';
import { renderPavilionPreloads } from './pavilion-preload.mjs';
import { prepareShowcaseScripts } from './showcase-scripts.mjs';

const preparedScripts = await prepareShowcaseScripts(projectRoot);
const release = process.env.RELEASE_TAG ? parseReleaseTag(process.env.RELEASE_TAG) : null;
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const privateNames = new Set(['local', '.git', 'AGENTS.md', '.gitignore', 'node_modules']);
const directories = new Set(loadCatalog(projectRoot).games.filter(game => game.available).map(game => game.directory));
function walk(folder, visit) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        assert(!entry.isSymbolicLink(), 'Unexpected symlink: ' + entry.name);
        const file = path.join(folder, entry.name);
        visit(file, entry);
        if (entry.isDirectory()) walk(file, visit);
    }
}
for (const mode of ['web', 'gamespace']) {
    const output = path.join(projectRoot, 'dist', mode);
    checkProject(output, mode);
    const entryHtml = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    assert(entryHtml.includes('id="scene"'), 'Missing 3D pavilion: ' + mode);
    assert(entryHtml.includes('assets/js/view-mode.js'), 'Missing mode preference: ' + mode);
    assert(entryHtml.includes('data-view="3d"'), 'Initial entry must be 3D: ' + mode);
    const preload = renderPavilionPreloads('<!-- pavilion-preview-preloads -->', loadCatalog(output).games);
    assert(entryHtml.includes(preload), 'Preview hints must match the built catalog: ' + mode);
    const catalogHtml = fs.readFileSync(path.join(output, 'gamespace.html'), 'utf8');
    assert(!catalogHtml.includes('data-pavilion-preloads'), '2D must not preload 3D artwork');
    assert(catalogHtml.includes('index.html?view=3d'), 'Missing return to pavilion: ' + mode);
    assert(catalogHtml.includes('data-view="2d"'), 'Missing 2D catalog mode: ' + mode);
    for (const resource of ['assets/js/pavilion.js', 'assets/js/pavilion-loading.js', 'assets/js/pavilion-developer.js', 'assets/js/view-mode.js', 'assets/css/pavilion.css', 'assets/js/gamespace.js', 'assets/css/gamespace.css']) {
        const expectedHash = preparedScripts.has(resource) ? createHash('sha256').update(preparedScripts.get(resource)).digest('hex') : hash(path.join(projectRoot, resource));
        assert.equal(hash(path.join(output, resource)), expectedHash, 'Missing or changed showcase resource: ' + mode + '/' + resource);
    }
    // The kit must accompany unchanged game HTML in every distribution.
    for (const document of ['LICENSE.md', 'NOTICE.md', 'USAGE.md']) {
        assert.equal(hash(path.join(output, document)), hash(path.join(projectRoot, document)), 'Document changed: ' + document);
    }
    walk(path.join(projectRoot, 'licenses'), (file, entry) => {
        if (entry.isFile()) {
            const relative = path.relative(projectRoot, file);
            assert.equal(hash(path.join(output, relative)), hash(file), 'License missing or changed: ' + relative);
        }
    });
    walk(output, (file, entry) => {
        assert(!privateNames.has(entry.name), 'Private material: ' + file);
        assert(!excludedGameFiles.has(path.relative(output, file).split(path.sep).join('/')), 'Internal game notes: ' + file);
        if (!entry.isFile() || !entry.name.endsWith('.html') || path.relative(output, file).split(path.sep)[0] === 'games') return;
        const html = fs.readFileSync(file, 'utf8');
        assert(!html.includes('__VERSION__'), 'Unresolved version marker');
        if (release) assert(html.includes(`data-release-version="${release.version}"`), 'Wrong release version: ' + file);
        else assert(!html.includes('data-release-version='), 'Version in a non-release build');
    });
    if (release) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'release.json'), 'utf8')), release);
    else assert(!fs.existsSync(path.join(output, 'release.json')));
    for (const directory of directories) {
        const source = path.join(projectRoot, directory);
        walk(source, (file, entry) => {
            if (entry.isFile() && !excludedGameFiles.has(path.relative(projectRoot, file).split(path.sep).join('/'))) assert.equal(hash(path.join(output, directory, path.relative(source, file))), hash(file), 'Game file changed: ' + file);
        });
        walk(path.join(output, directory), (file, entry) => {
            if (entry.isFile()) assert(fs.existsSync(path.join(source, path.relative(path.join(output, directory), file))), 'Unexpected game file: ' + file);
        });
    }
}
console.log('Build verified: links, private-file exclusions, release version and unchanged game files.');
