import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { projectRoot } from './check.mjs';
import { findSevenZip, createArchive } from './archive.mjs';
import { parseReleaseTag } from './version.mjs';

export function assetNames(tag) {
    parseReleaseTag(tag);
    return [`games-web-${tag}.7z`, `games-gamespace-${tag}.7z`, `SHA256SUMS-${tag}.txt`];
}

function run(binary, args) {
    const result = spawnSync(binary, args, { cwd: projectRoot, encoding: 'utf8', windowsHide: true });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout || `${binary} failed`);
    return result.stdout.trim();
}

function validate(tag) {
    parseReleaseTag(tag);
    const commit = run('git', ['rev-parse', 'HEAD']);
    assert.equal(run('git', ['rev-parse', `refs/tags/${tag}^{commit}`]), commit, 'Checkout must match the release tag');
    run('git', ['merge-base', '--is-ancestor', commit, 'refs/remotes/origin/main']);
    console.log('Release tag matches checkout and belongs to main.');
}

function packageRelease(tag) {
    const release = parseReleaseTag(tag);
    const dist = path.join(projectRoot, 'dist');
    for (const mode of ['web', 'gamespace']) {
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dist, mode, 'release.json'), 'utf8')), release, 'Build must use the same release tag');
    }
    const [web, gamespace, sums] = assetNames(tag);
    const output = path.join(dist, 'release');
    assert(!fs.existsSync(output) || !fs.lstatSync(output).isSymbolicLink(), 'Release directory must not be a symlink');
    fs.mkdirSync(output, { recursive: true });
    createArchive(findSevenZip(), path.join(dist, 'web'), path.join(dist, web));
    fs.copyFileSync(path.join(dist, web), path.join(output, web));
    fs.copyFileSync(path.join(dist, 'games-gamespace.7z'), path.join(output, gamespace));
    const lines = [web, gamespace].map(name => `${digest(path.join(output, name))}  ${name}`);
    fs.writeFileSync(path.join(output, sums), lines.join('\n') + '\n');
    console.log('Ready: ' + assetNames(tag).join(', '));
}

function digest(file) {
    return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function upload(tag) {
    // Only named artifacts are uploaded; source files and working directories are excluded.
    const names = assetNames(tag);
    const endpoint = `repos/${process.env.GH_REPO}/releases/tags/${tag}`;
    const existing = JSON.parse(run('gh', ['api', endpoint])).assets;
    for (const name of names) {
        const file = path.join(projectRoot, 'dist/release', name);
        const asset = existing.find(item => item.name === name);
        if (asset) {
            assert.equal(asset.digest, `sha256:${digest(file)}`, 'Existing release asset differs; refusing to replace: ' + name);
            console.log('Already attached: ' + name);
        } else run('gh', ['release', 'upload', tag, file]);
    }
    const attached = JSON.parse(run('gh', ['api', endpoint])).assets;
    for (const name of names) assert.equal(attached.find(asset => asset.name === name)?.digest, `sha256:${digest(path.join(projectRoot, 'dist/release', name))}`, 'Uploaded asset checksum mismatch: ' + name);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const tag = process.env.RELEASE_TAG;
    parseReleaseTag(tag);
    const command = process.argv[2];
    if (command === 'validate') validate(tag);
    else if (command === 'package') packageRelease(tag);
    else if (command === 'upload') upload(tag);
    else throw new Error('Usage: node scripts/release.mjs validate|package|upload');
}
