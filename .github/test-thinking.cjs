const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const controls = new Map();
function $(id) {
  if (!controls.has(id)) controls.set(id, { value: '', options: [], val(v) { if (v === undefined) return this.value; this.value = v; return this; }, empty() { this.options = []; return this; }, append(v) { this.options.push(v); return this; }, text() { return this; } });
  return controls.get(id);
}
let saves = 0;
const profiles = { A: { api_url: 'https://openrouter.ai/api/v1', model: 'meta/muse-spark-1.3-contributor', untouched: 123 }, B: { thinking_mode: 'high', thinking_category: 'or_glm' } };
const context = vm.createContext({ $, Option: function(label, value) { this.value = value; }, profileSelect: { val: () => 'A' }, extension_settings14: { plugin: { llm_profiles: profiles } }, extensionName: 'plugin', saveSettingsDebounced7: () => saves++ });
vm.runInContext(fs.readFileSync('.github/thinking-runtime.js', 'utf8'), context);
for (const category of ['deepseek', 'openrouter', 'or_muse', 'or_glm', 'or_switch']) {
  for (const mode of context.getManualThinkingModes(category)) {
    for (const proxy of [false, true]) {
      const body = { model: 'test', stream: true };
      context.applyManualLlmThinking(body, { thinking_category: category, thinking_mode: mode }, proxy);
      if (mode === 'default') { assert.deepEqual(body, { model: 'test', stream: true }); continue; }
      const p = proxy ? JSON.parse(body.custom_include_body) : JSON.parse(JSON.stringify(body));
      const effort = ['enabled', 'disabled'].includes(mode) ? undefined : mode;
      if (category === 'deepseek') {
        assert.equal(p.thinking.type, mode === 'disabled' ? 'disabled' : 'enabled');
        assert.equal(p.reasoning_effort, effort);
      } else {
        assert.equal(p.reasoning.enabled, mode !== 'disabled');
        assert.equal(p.reasoning.effort, effort);
        assert.equal(p.thinking, undefined);
      }
      assert.equal(body.stream, true);
    }
  }
}
assert.equal(context.getManualThinkingCategory(profiles.A), 'or_muse');
assert.throws(() => context.applyManualLlmThinking({}, { ...profiles.A, thinking_mode: 'disabled' }), /思考档位/);
assert.throws(() => context.applyManualLlmThinking({}, { ...profiles.B, thinking_mode: 'low' }), /思考档位/);
$('#ch-llm_thinking_category').val('or_muse');
$('#ch-llm_thinking_mode').val('minimal');
context.saveManualThinkingControls();
assert.equal(saves, 1);
assert.equal(profiles.A.thinking_mode, 'minimal');
assert.equal(profiles.A.untouched, 123);
assert.equal(profiles.B.thinking_mode, 'high');
context.refreshManualThinkingControls(profiles.B);
assert.equal($('#ch-llm_thinking_mode').val(), 'high');
context.refreshManualThinkingControls(JSON.parse(JSON.stringify(profiles.A)));
assert.equal($('#ch-llm_thinking_mode').val(), 'minimal');
assert.ok(!$('#ch-llm_thinking_mode').options.some(x => x.value === 'disabled'));
let replay = fs.readFileSync(0, 'utf8');
function run(file) {
  try { vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    require: () => ({ readFileSync: p => p === 'index.js' ? replay : fs.readFileSync(p, 'utf8'), writeFileSync: (_, s) => replay = s }),
    process: { exit: () => { throw 'done'; } }
  }); } catch (e) { if (e !== 'done') throw e; }
}
run('.github/apply-thinking.cjs');
run('.github/apply-thinking-v2.cjs');
assert.equal(replay, fs.readFileSync('index.js', 'utf8'));
run('.github/apply-thinking-v2.cjs');
assert.equal(replay, fs.readFileSync('index.js', 'utf8'));
console.log('PASS: categories, modes, both transports, auto-save, profile isolation, reload, model limits, sync replay');
