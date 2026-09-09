// Reapply this fork's model-aware thinking controls after upstream version updates.
const fs = require('node:fs');
const file = 'index.js';
let source = fs.readFileSync(file, 'utf8');
if (source.includes('function applyManualLlmThinking(')) process.exit(0);
function replace(before, after, count = 1) {
  const matches = source.split(before).length - 1;
  if (matches !== count) throw new Error(`Thinking patch anchor mismatch: expected ${count}, got ${matches}: ${before.slice(0, 80)}`);
  source = source.split(before).join(after);
}
replace('function collectProfileDataFromUI() {', `function applyManualLlmThinking(body, profile, viaProxy = false) {
  const mode = profile?.thinking_mode;
  if (!["disabled", "low", "high", "max"].includes(mode)) return body;
  const parameters = { thinking: { type: mode === "disabled" ? "disabled" : "enabled" } };
  if (mode !== "disabled") parameters.reasoning_effort = mode;
  // SillyTavern custom backends rebuild the body; inject using their YAML merge.
  if (viaProxy) body.custom_include_body = JSON.stringify(parameters);
  else Object.assign(body, parameters);
  return body;
}
function collectProfileDataFromUI() {`);
replace('    send_images: apiProfile.send_images ?? false,', '    send_images: apiProfile.send_images ?? false,\n    thinking_mode: apiProfile.thinking_mode ?? "default",');
replace('    sendImagesToggle.prop("checked", sendImages);', '    sendImagesToggle.prop("checked", sendImages);\n    $("#ch-llm_thinking_mode").val(profile.thinking_mode || "default");');
replace('    send_images: sendImagesToggle.prop("checked")', '    send_images: sendImagesToggle.prop("checked"),\n    thinking_mode: $("#ch-llm_thinking_mode").val() || "default"');
replace('  sendImagesToggle = $("#ch-llm_send_images");', `  sendImagesToggle = $("#ch-llm_send_images");
  if (!$("#ch-llm_thinking_mode").length) {
    bypassProxyToggle.closest(".st-chatu8-field").after(\
      '<label style="display:block">DeepSeek V4 思考模式' +
      '<select id="ch-llm_thinking_mode" class="text_pole">' +
      '<option value="default">跟随接口（不发送参数）</option>' +
      '<option value="disabled">关闭思考</option>' +
      '<option value="low">低</option><option value="high">高</option>' +
      '<option value="max">最大</option></select>' +
      '<small>随 API 预设保存；中转需支持 thinking / reasoning_effort 参数。</small></label>');
  }`);
replace('    if (updateResultUI && attempt === 0) {', '    applyManualLlmThinking(requestBody, config, !bypass_proxy);\n    if (updateResultUI && attempt === 0) {', 2);
// The second request handler reads profileData instead of effective config.
const marker = source.indexOf('const { api_url, api_key, model, temperature, top_p, max_tokens, stream, bypass_proxy } = profileData;');
const tail = source.slice(marker);
source = source.slice(0, marker) + tail.replace('applyManualLlmThinking(requestBody, config, !bypass_proxy);', 'applyManualLlmThinking(requestBody, profileData, !bypass_proxy);');
const legacyTestBody = '    const body = { model, messages, temperature, top_p, max_tokens, stream: false };';
if (source.includes(legacyTestBody)) {
  replace(legacyTestBody, '    const body = applyManualLlmThinking({ model, messages, temperature, top_p, max_tokens, stream: false }, currentData, !bypass_proxy);');
} else {
  // 3.0.2+ builds the test body incrementally so individual model parameters can
  // be omitted. Apply the saved thinking selection after custom body parameters,
  // matching the precedence used by the two real request paths.
  const testStart = source.indexOf('async function onTestLLMClick() {');
  const testEnd = source.indexOf('function buildPrompt()', testStart);
  if (testStart < 0 || testEnd < 0) throw new Error('Thinking test request function missing');
  const testBlock = source.slice(testStart, testEnd);
  const testAnchor = '    const customHeadersMap = currentData.enable_custom_headers ? parseCustomHeaders(currentData.custom_headers) : {};';
  if (testBlock.split(testAnchor).length !== 2) throw new Error('Thinking test request anchor mismatch');
  const patchedTestBlock = testBlock.replace(testAnchor, `    applyManualLlmThinking(body, currentData, !bypass_proxy);\n${testAnchor}`);
  source = source.slice(0, testStart) + patchedTestBlock + source.slice(testEnd);
}
fs.writeFileSync(file, source);
