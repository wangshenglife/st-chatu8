const fs = require('node:fs');

const file = 'index.js';
let source = fs.readFileSync(file, 'utf8');
if (source.includes('async function ensureImageTagPromptGuards(')) process.exit(0);

function requiredIndex(needle, from = 0) {
  const index = source.indexOf(needle, from);
  if (index < 0) throw new Error(`Image tag guard anchor not found: ${needle}`);
  return index;
}

const autoAliasMatch = source.match(/const autoLLMImageGen = (extension_settings\d+)\[extensionName\]\?\.autoLLMImageGen;/);
if (!autoAliasMatch) throw new Error('Image tag guard could not resolve auto-LLM settings alias');
const settingsAlias = autoAliasMatch[1];

// Keep this anchor on the stable feature gate. Upstream 3.0.5 removed the old
// activateAutoLLMClick timer while retaining isAutoLLMEnabled and the same
// insertOriginalText behavior.
const autoLlmModuleIndex = requiredIndex('function isAutoLLMEnabled() {');
const guardRuntime = fs.readFileSync('.github/image-tag-prompt-guard.js', 'utf8').trimEnd();
source = source.slice(0, autoLlmModuleIndex) + guardRuntime + '\n' + source.slice(autoLlmModuleIndex);

const autoEnableNeedle = `      if (${settingsAlias}[extensionName]?.insertOriginalText !== "true") {`;
const autoStart = requiredIndex(autoEnableNeedle);
const autoEnd = requiredIndex('      const el = await findElement(messageId);', autoStart);
const guardedAutoEnable = `      const imageTagPromptGuardsReady = await ensureImageTagPromptGuards();
      const insertOriginalTextEnabled = ${settingsAlias}[extensionName]?.insertOriginalText === "true";
      if (!imageTagPromptGuardsReady && insertOriginalTextEnabled) {
        ${settingsAlias}[extensionName].insertOriginalText = "false";
        const insertTextSwitch = document.getElementById("insertOriginalText");
        if (insertTextSwitch) insertTextSwitch.checked = false;
        try {
          const { saveSettingsDebounced: saveImageTagGuardSettings } = await import("../../../../script.js");
          saveImageTagGuardSettings();
        } catch (e) {
          console.warn("[st-chatu8] Failed to save safe insertOriginalText fallback:", e);
        }
        toastr.warning("\u9632\u6B62\u751F\u56FE Tag \u8FDB\u5165 Prompt \u7684\u6B63\u5219\u4E0D\u53EF\u7528\uFF0C\u5DF2\u81EA\u52A8\u5173\u95ED\u201C\u63D2\u5165\u539F\u6587\u201D\u5E76\u6539\u7528\u9690\u85CF\u6570\u636E\u5B58\u50A8\u3002");
      } else if (imageTagPromptGuardsReady && !insertOriginalTextEnabled) {
        ${settingsAlias}[extensionName].insertOriginalText = "true";
        console.log("[st-chatu8] Auto-enabled insertOriginalText after verifying Prompt guards");
        debugLog("autoLLMClick.GENERATION_ENDED", "\u9A8C\u8BC1 Prompt \u8FC7\u6EE4\u540E\u81EA\u52A8\u542F\u7528 insertOriginalText", {
          \u539F\u56E0: "\u6D88\u606F\u957F\u5EA6 > 200"
        });
        const insertTextSwitch = document.getElementById("insertOriginalText");
        if (insertTextSwitch) insertTextSwitch.checked = true;
        try {
          const { saveSettingsDebounced: saveImageTagGuardSettings } = await import("../../../../script.js");
          saveImageTagGuardSettings();
        } catch (e) {
          console.warn("[st-chatu8] Failed to save settings:", e);
        }
      }
`;
source = source.slice(0, autoStart) + guardedAutoEnable + source.slice(autoEnd);

const initStart = requiredIndex('function initAutoLLMClick() {');
const initEnd = requiredIndex('\n}\n\n// utils/ui.js', initStart);
const startupGuard = `
  if (${settingsAlias}[extensionName]?.insertOriginalText === "true") {
    ensureImageTagPromptGuards().then(async (ready) => {
      if (ready || ${settingsAlias}[extensionName]?.insertOriginalText !== "true") return;
      ${settingsAlias}[extensionName].insertOriginalText = "false";
      const insertTextSwitch = document.getElementById("insertOriginalText");
      if (insertTextSwitch) insertTextSwitch.checked = false;
      try {
        const { saveSettingsDebounced: saveImageTagGuardSettings } = await import("../../../../script.js");
        saveImageTagGuardSettings();
      } catch (e) {
        console.warn("[st-chatu8] Failed to save startup safety fallback:", e);
      }
      toastr.warning("\u751F\u56FE Tag Prompt \u8FC7\u6EE4\u65E0\u6CD5\u9A8C\u8BC1\uFF0C\u5DF2\u81EA\u52A8\u5173\u95ED\u201C\u63D2\u5165\u539F\u6587\u201D\u3002");
    });
  }`;
source = source.slice(0, initEnd) + startupGuard + source.slice(initEnd);

const legacyStart = requiredIndex('  const CHATU8_IMAGE_REGEX_SCRIPT_NAME = ');
const legacyEnd = requiredIndex('  settingsModal.on("change", "#helpTipsEnabled"', legacyStart);
source = source.slice(0, legacyStart) + `  async function handleInsertOriginalTextRegex(enable) {
    if (!enable) return true;
    return await ensureImageTagPromptGuards({ notify: true });
  }
` + source.slice(legacyEnd);

const insertHandlerStart = requiredIndex('  settingsModal.find("#insertOriginalText").on("change", async function() {');
const insertHandlerEnd = requiredIndex('  settingsModal.find("#convertToJpegStorage")', insertHandlerStart);
const insertHandler = source.slice(insertHandlerStart, insertHandlerEnd);
const saveCallMatch = insertHandler.match(/(saveSettingsDebounced\d+)\(\);/);
if (!saveCallMatch) throw new Error('Image tag guard could not resolve UI save function');
const saveCall = saveCallMatch[1];
const guardedInsertHandler = `  settingsModal.find("#insertOriginalText").on("change", async function() {
    const isEnabled = $(this).prop("checked");
    if (isEnabled && !await handleInsertOriginalTextRegex(true)) {
      $(this).prop("checked", false);
      settings2.insertOriginalText = "false";
      ${saveCall}();
      return;
    }
    settings2.insertOriginalText = isEnabled.toString();
    ${saveCall}();
  });
`;
source = source.slice(0, insertHandlerStart) + guardedInsertHandler + source.slice(insertHandlerEnd);

const autoToggleStart = requiredIndex('      if (insertTextSwitch.length && !insertTextSwitch.prop("checked")) {');
const autoToggleEnd = requiredIndex('      if (', autoToggleStart + 10);
const guardedAutoToggle = `      if (insertTextSwitch.length && !insertTextSwitch.prop("checked")) {
        if (await handleInsertOriginalTextRegex(true)) {
          insertTextSwitch.prop("checked", true);
          settings2.insertOriginalText = "true";
          ${saveCall}();
          changes.push('\u5DF2\u5F00\u542F"\u63D2\u5165\u539F\u6587(\u975E\u540C\u5C42)"');
        } else {
          insertTextSwitch.prop("checked", false);
          settings2.insertOriginalText = "false";
          ${saveCall}();
          changes.push('\u9632\u6CC4\u9732\u6B63\u5219\u4E0D\u53EF\u7528\uFF0C\u5DF2\u4FDD\u6301"\u63D2\u5165\u539F\u6587"\u5173\u95ED');
        }
      }
`;
source = source.slice(0, autoToggleStart) + guardedAutoToggle + source.slice(autoToggleEnd);

fs.writeFileSync(file, source);
