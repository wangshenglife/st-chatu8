const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('index.js', 'utf8');
const start = source.indexOf('function applyManualLlmThinking(');
const end = source.indexOf('function collectProfileDataFromUI()', start);
const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context);
const apply = context.applyManualLlmThinking;
for (const mode of [undefined, 'default', 'unknown', 'disabled', 'low', 'high', 'max']) {
  for (const proxy of [false, true]) {
    const body = { model: 'deepseek-v4-pro', stream: true };
    apply(body, { thinking_mode: mode }, proxy);
    const active = ['disabled', 'low', 'high', 'max'].includes(mode);
    const params = proxy && active ? JSON.parse(body.custom_include_body) : body;
    assert.equal(params.thinking?.type, active ? mode === 'disabled' ? 'disabled' : 'enabled' : undefined);
    assert.equal(params.reasoning_effort, active && mode !== 'disabled' ? mode : undefined);
    assert.equal(body.stream, true);
    if (proxy) assert.equal(body.thinking, undefined);
    if (!active) assert.deepEqual(body, { model: 'deepseek-v4-pro', stream: true });
  }
}
// Replay on the untouched baseline in memory, then verify idempotence.
let replay = fs.readFileSync(0, 'utf8');
const patch = fs.readFileSync('.github/apply-thinking.cjs', 'utf8');
const run = () => {
  try {
    vm.runInNewContext(patch, {
      require: () => ({ readFileSync: () => replay, writeFileSync: (_, value) => { replay = value; } }),
      process: { exit: () => { throw 'already-applied'; } },
    });
  } catch (error) { if (error !== 'already-applied') throw error; }
};
run();
assert.equal(replay, source);
run();
assert.equal(replay, source);
assert.equal((source.match(/applyManualLlmThinking\(requestBody,/g) || []).length, 2);
console.log('PASS: modes, direct/proxy, default compatibility, stream preservation, baseline replay and idempotence');
