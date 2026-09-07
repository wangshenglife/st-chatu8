const fs = require('node:fs');
let source = fs.readFileSync('index.js', 'utf8');
if (source.includes('function installManualThinkingControls(')) process.exit(0);
function replace(before, after) {
  if (source.split(before).length !== 2) throw new Error('Thinking v2 anchor mismatch: ' + before);
  source = source.replace(before, after);
}
const start = source.indexOf('function applyManualLlmThinking(');
const end = source.indexOf('function collectProfileDataFromUI()', start);
if (start < 0 || end < 0) throw new Error('Thinking v1 missing');
source = source.slice(0, start) + fs.readFileSync('.github/thinking-runtime.js', 'utf8') + '\n' + source.slice(end);
replace('    thinking_mode: apiProfile.thinking_mode ?? "default",', '    thinking_mode: apiProfile.thinking_mode ?? "default",\n    thinking_category: apiProfile.thinking_category ?? "auto",');
replace('    $("#ch-llm_thinking_mode").val(profile.thinking_mode || "default");', '    refreshManualThinkingControls(profile);');
replace('    thinking_mode: $("#ch-llm_thinking_mode").val() || "default"', '    thinking_mode: $("#ch-llm_thinking_mode").val() || "default",\n    thinking_category: $("#ch-llm_thinking_category").val() || "auto"');
const uiStart = source.indexOf('  if (!$("#ch-llm_thinking_mode").length) {');
const uiEnd = source.indexOf('  historyDepthSlider =', uiStart);
if (uiStart < 0 || uiEnd < 0) throw new Error('Thinking UI anchor missing');
source = source.slice(0, uiStart) + '  installManualThinkingControls();\n' + source.slice(uiEnd);
for (const profile of ['config', 'profileData']) {
  const call = `    applyManualLlmThinking(requestBody, ${profile}, !bypass_proxy);\n`;
  const position = source.indexOf(call);
  if (position < 0) throw new Error('Thinking request anchor missing');
  source = source.replace(call, '');
  const fetchPosition = source.indexOf('      const response = await fetch(requestUrl, {', position);
  if (fetchPosition < 0) throw new Error('Thinking fetch anchor missing');
  source = source.slice(0, fetchPosition) + '  ' + call + source.slice(fetchPosition);
}
fs.writeFileSync('index.js', source);
