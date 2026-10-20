import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseReleaseTag, stampBuild } from './version.mjs';
import { assetNames } from './release.mjs';
import { siteBaseUrl, applyMetadata } from './metadata.mjs';
import { findSevenZip, createArchive } from './archive.mjs';

test('Release validation runs before npm install in a clean checkout and retains Git checks', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'games-clean-release-'));
    try {
        // Copy the real scripts, but deliberately omit node_modules.
        fs.cpSync(fileURLToPath(new URL('.', import.meta.url)), path.join(root, 'scripts'), { recursive: true });
        assert(!fs.existsSync(path.join(root, 'node_modules')));
        const stub = path.join(root, 'git-fixture.mjs');
        fs.writeFileSync(stub, `import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';
const calls = [], sha = '1234567890abcdef1234567890abcdef12345678';
childProcess.spawnSync = (binary, args, options) => {
    assert.equal(binary, 'git');
    assert.equal(options.cwd, ${JSON.stringify(root)});
    calls.push(args);
    if (args[0] === 'rev-parse' && args[1] === 'HEAD') return { status: 0, stdout: sha };
    if (args[0] === 'rev-parse' && args[1] === 'refs/tags/v0.1^{commit}') return { status: 0, stdout: process.env.GIT_FIXTURE === 'wrong-tag' ? 'different-commit' : sha };
    if (args[0] === 'merge-base') {
        assert.deepEqual(args, ['merge-base', '--is-ancestor', sha, 'refs/remotes/origin/main']);
        return process.env.GIT_FIXTURE === 'outside-main' ? { status: 1, stderr: 'fixture commit is outside main' } : { status: 0, stdout: '' };
    }
    throw new Error('Unexpected Git command: ' + args.join(' '));
};
syncBuiltinESMExports();
process.on('exit', code => { if (code === 0) assert.equal(calls.length, 3); });
`);
        const validate = mode => spawnSync(process.execPath, ['--import', pathToFileURL(stub).href, path.join(root, 'scripts/release.mjs'), 'validate'], {
            cwd: root, env: { ...process.env, RELEASE_TAG: 'v0.1', GIT_FIXTURE: mode }, encoding: 'utf8', windowsHide: true
        });
        const success = validate('valid');
        assert.equal(success.status, 0, success.stderr);
        assert.match(success.stdout, /Release tag matches checkout and belongs to main/);
        const wrongTag = validate('wrong-tag');
        assert.notEqual(wrongTag.status, 0);
        assert.match(wrongTag.stderr, /Checkout must match the release tag/);
        const outsideMain = validate('outside-main');
        assert.notEqual(outsideMain.status, 0);
        assert.match(outsideMain.stderr, /fixture commit is outside main/);
    } finally {
        assert(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
        assert(path.basename(root).startsWith('games-clean-release-'));
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Site metadata uses the page content and preserves the hosting subdirectory', () => {
    assert.equal(siteBaseUrl(''), null);
    for (const value of ['file:///tmp/', 'javascript:alert(1)', 'https://user:secret@example.org/', 'https://example.org/?x=1', 'https://example.org/#fragment', '/relative/']) assert.throws(() => siteBaseUrl(value));
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'games-metadata-'));
    try {
        fs.mkdirSync(path.join(root, 'content/games'), { recursive: true });
        const html = '<html><head><title>Игра &amp; автор</title><meta name="description" content="Особенности &amp; замысел"></head><body>Body</body></html>';
        const files = ['index.html', 'gamespace.html', 'content/games/demo.html'];
        for (const file of files) fs.writeFileSync(path.join(root, file), html);
        applyMetadata(root, null);
        const offline = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
        assert(offline.includes('property="og:title" content="Игра &amp; автор"'));
        assert(!offline.includes('property="og:url"'));
        assert(!offline.includes('property="og:image"'));
        assert(!offline.includes('rel="canonical"'));
        for (const file of files) fs.writeFileSync(path.join(root, file), html);
        applyMetadata(root, siteBaseUrl('https://example.org/collection'));
        for (const file of files) {
            const rendered = fs.readFileSync(path.join(root, file), 'utf8');
            assert(rendered.includes('content="https://example.org/collection/assets/social-preview.jpg"'));
            assert(rendered.includes('content="Особенности &amp; замысел"'));
            assert(rendered.includes('href="https://example.org/collection/' + (file === 'index.html' ? '' : file) + '"'));
        }
    } finally {
        assert(path.dirname(root) === fs.realpathSync(os.tmpdir()) || path.dirname(root) === os.tmpdir());
        assert(path.basename(root).startsWith('games-metadata-'));
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Release tags preserve one to four numeric parts and artifact names', () => {
    for (const tag of ['v1', 'v0.1', 'v0.1.1', 'v0.1.2', 'v0.1.0', 'v0.1.2.3']) {
        assert.deepEqual(parseReleaseTag(tag), { tag, version: tag.slice(1) });
        assert.deepEqual(assetNames(tag), [`games-web-${tag}.7z`, `games-gamespace-${tag}.7z`, `SHA256SUMS-${tag}.txt`, 'games-gamespace-latest.7z']);
    }
    for (const tag of [undefined, '', '1', 'v', 'v1.2.3.4.5', 'v1-beta', 'v1\n', ' v1', 'v1 & echo unsafe', 'v1/../../']) {
        assert.throws(() => parseReleaseTag(tag));
    }
});

test('Release packaging creates an identical permanent GameSpace asset and covers it with checksums', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'games-release-alias-'));
    const tag = 'v0.1.2.3', release = parseReleaseTag(tag);
    const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    try {
        fs.cpSync(fileURLToPath(new URL('.', import.meta.url)), path.join(root, 'scripts'), { recursive: true });
        for (const mode of ['web', 'gamespace']) {
            const folder = path.join(root, 'dist', mode);
            fs.mkdirSync(folder, { recursive: true });
            fs.writeFileSync(path.join(folder, 'release.json'), JSON.stringify(release));
            fs.writeFileSync(path.join(folder, 'index.html'), '<!doctype html><title>' + mode + '</title>');
        }
        const source = path.join(root, 'dist/games-gamespace.7z');
        createArchive(findSevenZip(), path.join(root, 'dist/gamespace'), source);
        const pack = () => spawnSync(process.execPath, [path.join(root, 'scripts/release.mjs'), 'package'], {
            cwd: root, env: { ...process.env, RELEASE_TAG: tag }, encoding: 'utf8', windowsHide: true
        });
        const result = pack();
        assert.equal(result.status, 0, result.stderr);
        const output = path.join(root, 'dist/release');
        assert.deepEqual(fs.readdirSync(output).sort(), assetNames(tag).sort());
        const latest = path.join(output, 'games-gamespace-latest.7z');
        const versioned = path.join(output, `games-gamespace-${tag}.7z`);
        assert.deepEqual(fs.readFileSync(latest), fs.readFileSync(source));
        assert.deepEqual(fs.readFileSync(versioned), fs.readFileSync(source));
        const sums = fs.readFileSync(path.join(output, `SHA256SUMS-${tag}.txt`), 'utf8').trim().split('\n');
        assert.equal(sums.length, 3);
        for (const name of [`games-web-${tag}.7z`, `games-gamespace-${tag}.7z`, 'games-gamespace-latest.7z']) {
            assert(sums.includes(`${digest(path.join(output, name))}  ${name}`), 'Missing or wrong checksum: ' + name);
        }
        const previous = digest(latest);
        fs.writeFileSync(path.join(root, 'dist/gamespace/release.json'), JSON.stringify(parseReleaseTag('v1')));
        const mismatch = pack();
        assert.notEqual(mismatch.status, 0);
        assert.match(mismatch.stderr, /Build must use the same release tag/);
        assert.equal(digest(latest), previous, 'A mismatched build must preserve the previous asset');
    } finally {
        assert(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
        assert(path.basename(root).startsWith('games-release-alias-'));
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Pavilion release version uses its header slot and preserves the first version 0.1', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'games-pavilion-version-'));
    try {
        const slot = '<span class="release-version" data-release-slot hidden></span>';
        assert(fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8').includes(slot), 'The real pavilion must provide its release header slot');
        const html = `<html><body><main><header>Павильон ${slot}</header><canvas></canvas></main></body></html>`;
        const file = path.join(root, 'index.html');
        fs.writeFileSync(file, html);
        stampBuild(root, null);
        assert.equal(fs.readFileSync(file, 'utf8'), html);
        assert(!fs.existsSync(path.join(root, 'release.json')));
        for (const tag of ['v0.1', 'v0.1.1', 'v0.1.2']) {
            fs.writeFileSync(file, html);
            stampBuild(root, parseReleaseTag(tag));
            const rendered = fs.readFileSync(file, 'utf8'), version = tag.slice(1);
            assert.match(rendered, new RegExp(`<header>[^]*data-release-version="${version.replaceAll('.', '\\.')}"[^]*</header>`));
            assert(rendered.includes(`aria-label="Версия ${version}">${version}</span>`));
            assert.equal((rendered.match(/data-release-version=/g) || []).length, 1);
            assert(!rendered.includes('data-release-slot hidden'));
            assert(!rendered.includes('<p data-release-version'));
            assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8')), { tag, version });
        }
    } finally {
        assert(path.dirname(root) === fs.realpathSync(os.tmpdir()) || path.dirname(root) === os.tmpdir());
        assert(path.basename(root).startsWith('games-pavilion-version-'));
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Release stamping updates site pages and metadata while preserving game bytes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'games-release-'));
    try {
        fs.mkdirSync(path.join(root, 'games/demo'), { recursive: true });
        fs.mkdirSync(path.join(root, 'content/games'), { recursive: true });
        const html = '<html><body>Example</body></html>';
        for (const file of ['index.html', 'gamespace.html', 'content/games/demo.html', 'games/demo/index.html']) fs.writeFileSync(path.join(root, file), html);
        stampBuild(root, null);
        assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), html);
        assert(!fs.existsSync(path.join(root, 'release.json')));
        stampBuild(root, parseReleaseTag('v0.1.2.3'));
        for (const file of ['index.html', 'gamespace.html', 'content/games/demo.html']) assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /Версия 0\.1\.2\.3/);
        assert.equal(fs.readFileSync(path.join(root, 'games/demo/index.html'), 'utf8'), html);
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8')), { tag: 'v0.1.2.3', version: '0.1.2.3' });
    } finally {
        assert(path.dirname(root) === fs.realpathSync(os.tmpdir()) || path.dirname(root) === os.tmpdir());
        assert(path.basename(root).startsWith('games-release-'));
        fs.rmSync(root, { recursive: true, force: true });
    }
});
