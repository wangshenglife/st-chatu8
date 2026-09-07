var IMAGE_TAG_PROMPT_GUARD_SCRIPTS = [
  {
    scriptName: "st-chatu8-\u4E0D\u53D1\u9001image\u6807\u7B7E",
    findRegex: "/<image>[\\s\\S]*?<\\/image>/g",
    replaceString: "",
    trimStrings: [],
    placement: [1, 2],
    disabled: false,
    markdownOnly: false,
    promptOnly: true,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null
  },
  {
    scriptName: "st-chatu8-\u9690\u85CFimgthink",
    findRegex: "/<imgthink>[\\s\\S]*?<\\/imgthink>/g",
    replaceString: "",
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: true,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null
  }
];
function imageTagPromptGuardMatches(script, expected) {
  if (!script) return false;
  return Object.entries(expected).every(([key, value]) => JSON.stringify(script[key]) === JSON.stringify(value));
}
async function ensureImageTagPromptGuards({ notify = false } = {}) {
  try {
    const regexEngine = await import("../../regex/engine.js");
    if (!regexEngine.getScriptsByType || !regexEngine.saveScriptsByType || regexEngine.SCRIPT_TYPES?.GLOBAL === void 0) {
      console.warn("[Chatu8] Cannot protect image tags: regex engine API is unavailable");
      if (notify) toastr.error("\u65E0\u6CD5\u786E\u8BA4 Prompt \u8FC7\u6EE4\u6B63\u5219\uFF0C\u5DF2\u4FDD\u6301\u201C\u63D2\u5165\u539F\u6587\u201D\u5173\u95ED\u3002");
      return false;
    }
    const scriptType = regexEngine.SCRIPT_TYPES.GLOBAL;
    const globalScripts = regexEngine.getScriptsByType(scriptType) || [];
    let changed = false;
    const repairedNames = [];
    for (const expected of IMAGE_TAG_PROMPT_GUARD_SCRIPTS) {
      let script = globalScripts.find((item) => item.scriptName === expected.scriptName);
      if (!script) {
        script = {
          ...expected,
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
        };
        globalScripts.push(script);
        changed = true;
        repairedNames.push(expected.scriptName);
        continue;
      }
      if (!imageTagPromptGuardMatches(script, expected)) {
        Object.assign(script, expected);
        changed = true;
        repairedNames.push(expected.scriptName);
      }
    }
    if (changed) await regexEngine.saveScriptsByType(globalScripts, scriptType);
    const verifiedScripts = regexEngine.getScriptsByType(scriptType) || [];
    const verified = IMAGE_TAG_PROMPT_GUARD_SCRIPTS.every((expected) => {
      const script = verifiedScripts.find((item) => item.scriptName === expected.scriptName);
      return imageTagPromptGuardMatches(script, expected);
    });
    if (!verified) {
      console.error("[Chatu8] Image tag Prompt guards failed verification");
      if (notify) toastr.error("Prompt \u8FC7\u6EE4\u6B63\u5219\u9A8C\u8BC1\u5931\u8D25\uFF0C\u5DF2\u4FDD\u6301\u201C\u63D2\u5165\u539F\u6587\u201D\u5173\u95ED\u3002");
      return false;
    }
    if (notify) {
      if (repairedNames.length > 0) toastr.success("\u5DF2\u521B\u5EFA\u6216\u4FEE\u590D\u9632\u6B62\u751F\u56FE Tag \u8FDB\u5165\u751F\u6587 Prompt \u7684\u5168\u5C40\u6B63\u5219\u3002");
      else toastr.info("\u751F\u56FE Tag Prompt \u8FC7\u6EE4\u6B63\u5219\u5DF2\u9A8C\u8BC1\u6709\u6548\u3002");
    }
    return true;
  } catch (error) {
    console.error("[Chatu8] Failed to ensure image tag Prompt guards:", error);
    if (notify) toastr.error("Prompt \u8FC7\u6EE4\u6B63\u5219\u68C0\u67E5\u5931\u8D25\uFF0C\u5DF2\u4FDD\u6301\u201C\u63D2\u5165\u539F\u6587\u201D\u5173\u95ED\u3002");
    return false;
  }
}
