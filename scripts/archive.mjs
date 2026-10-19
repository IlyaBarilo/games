import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

export function findSevenZip() {
    const candidates = [process.env.SEVEN_ZIP, '7z', '7zz', '7za'];
    if (process.platform === 'win32') {
        for (const folder of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) {
            if (folder) candidates.push(path.join(folder, '7-Zip', '7z.exe'));
        }
    }
    for (const binary of candidates.filter(Boolean)) {
        const result = spawnSync(binary, ['i'], { encoding: 'utf8', windowsHide: true });
        if (!result.error && result.status === 0) return binary;
    }
    throw new Error('7-Zip not found. Install 7-Zip or set SEVEN_ZIP to the executable path.');
}

export function createArchive(binary, source, destination) {
    source = fs.realpathSync(source);
    destination = path.resolve(destination);
    const temporary = destination.replace(/\.7z$/, '.building.7z');
    assert(destination.endsWith('.7z') && temporary !== destination);
    assert.equal(path.dirname(source), path.dirname(destination), 'Archive must be next to its build directory');
    for (const target of [destination, temporary]) {
        assert(!fs.existsSync(target) || (fs.lstatSync(target).isFile() && !fs.lstatSync(target).isSymbolicLink()), 'Archive target must be a regular file');
    }
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    const run = args => {
        const result = spawnSync(binary, args, { cwd: source, encoding: 'utf8', windowsHide: true });
        if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout || '7-Zip failed');
        return result.stdout;
    };
    try {
        run(['a', '-t7z', '-m0=LZMA2', '-mx=5', '-ms=off', '-mhe=off', temporary, '--', ...fs.readdirSync(source).sort()]);
        run(['t', temporary]);
        const listing = run(['l', '-slt', temporary]);
        const expected = new Map();
        function walk(folder, prefix = '') {
            for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
                const relative = prefix + entry.name;
                assert(!entry.isSymbolicLink(), 'Symlink in build output');
                if (entry.isDirectory()) walk(path.join(folder, entry.name), relative + '/');
                else expected.set(relative, fs.statSync(path.join(folder, entry.name)).size);
            }
        }
        walk(source);
        const entries = listing.split(/\r?\n----------\r?\n/).slice(1).join('\n').trim().split(/\r?\n\s*\r?\n/);
        const seen = new Set();
        for (const block of entries) {
            const fields = Object.fromEntries(block.split(/\r?\n/).filter(line => line.includes(' = ')).map(line => {
                const index = line.indexOf(' = ');
                return [line.slice(0, index), line.slice(index + 3)];
            }));
            if (!fields.Path || fields.Folder === '+' || (fields.Attributes || '').startsWith('D')) continue;
            const relative = fields.Path.replaceAll('\\', '/');
            assert(!relative.startsWith('/') && !/^[a-z]:/i.test(relative) && relative.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe archive path');
            assert(!seen.has(relative) && expected.has(relative), 'Unexpected or duplicate archive path: ' + relative);
            assert.equal(Number(fields.Size), expected.get(relative), 'Wrong archived size: ' + relative);
            assert(fields.Encrypted !== '+', 'Encrypted archive entry');
            seen.add(relative);
        }
        assert(seen.has('index.html'), 'Missing root index.html');
        assert.equal(seen.size, expected.size, 'Archive file count mismatch');
        fs.renameSync(temporary, destination);
        return { path: destination, files: seen.size, bytes: fs.statSync(destination).size };
    } catch (error) {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
        throw error;
    }
}
