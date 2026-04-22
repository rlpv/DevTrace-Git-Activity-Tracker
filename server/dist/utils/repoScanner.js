import { readdir } from 'node:fs/promises';
import path from 'node:path';
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.turbo', '.cache']);
async function isGitRepo(dirPath) {
    try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        return entries.some((entry) => entry.name === '.git');
    }
    catch {
        return false;
    }
}
export async function scanGitRepos(rootPath) {
    const discovered = [];
    const stack = [path.resolve(rootPath)];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) {
            continue;
        }
        const repo = await isGitRepo(current);
        if (repo) {
            discovered.push({
                repoName: path.basename(current),
                repoPath: current,
            });
            continue;
        }
        let entries;
        try {
            entries = await readdir(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            if (SKIP_DIRS.has(entry.name)) {
                continue;
            }
            stack.push(path.join(current, entry.name));
        }
    }
    return discovered;
}
