import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

// 在内存中编译测试，Obsidian API 使用最小仓库替身，无需启动客户端。
const result = await build({
    absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
    entryPoints: ['tests/stats.test.ts'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    target: 'node16',
    plugins: [{
        name: 'obsidian-test-stub',
        setup(builder) {
            builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'stub' }));
            builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
                contents: `export class TFile {} export class TFolder {} export const moment = { locale: () => 'en' };`
            }));
        }
    }]
});
// 明确使用北京时间，覆盖 UTC 尚为前一天的凌晨场景。
process.env.TZ = 'Asia/Shanghai';
const testModule = { exports: {} };
runInNewContext(result.outputFiles[0].text, {
    module: testModule, exports: testModule.exports,
    require: createRequire(import.meta.url), console, process, setTimeout, clearTimeout
});
await testModule.exports.run();
