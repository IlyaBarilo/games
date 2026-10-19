import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseReleaseTag, stampBuild } from './version.mjs';
import { assetNames } from './release.mjs';
import { siteBaseUrl, applyMetadata } from './metadata.mjs';

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
        assert.deepEqual(assetNames(tag), [`games-web-${tag}.7z`, `games-gamespace-${tag}.7z`, `SHA256SUMS-${tag}.txt`]);
    }
    for (const tag of [undefined, '', '1', 'v', 'v1.2.3.4.5', 'v1-beta', 'v1\n', ' v1', 'v1 & echo unsafe', 'v1/../../']) {
        assert.throws(() => parseReleaseTag(tag));
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
