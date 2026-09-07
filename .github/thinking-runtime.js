// Inlined into index.js by apply-thinking-v2.cjs; no runtime imports.
function getManualThinkingCategory(profile) {
  if (profile.thinking_category && profile.thinking_category !== "auto") return profile.thinking_category;
  if (!/openrouter\.ai/i.test(profile.api_url || "")) return "deepseek";
  const model = String(profile.model || "").toLowerCase();
  if (model.includes("muse-spark-1.3")) return "or_muse";
  if (model.includes("glm-5.2")) return "or_glm";
  if (/kimi-k2\.5|qwen3\.7/.test(model)) return "or_switch";
  return "openrouter";
}
function getManualThinkingModes(category) {
  const modes = {
    deepseek: ["default", "disabled", "enabled", "low", "high", "max"],
    openrouter: ["default", "disabled", "enabled", "minimal", "low", "medium", "high", "xhigh", "max"],
    or_muse: ["default", "enabled", "minimal", "low", "medium", "high", "xhigh", "max"],
    or_glm: ["default", "disabled", "enabled", "high", "xhigh"],
    or_switch: ["default", "disabled", "enabled"]
  };
  return modes[category] || modes.deepseek;
}
function applyManualLlmThinking(body, profile, viaProxy = false) {
  profile ||= {};
  const mode = profile.thinking_mode || "default";
  if (mode === "default") return body;
  const category = getManualThinkingCategory(profile);
  if (!getManualThinkingModes(category).includes(mode)) {
    throw new Error("思考档位不适用于当前传参类别，请在 LLM API 预设重新选择。");
  }
  let parameters;
  if (category === "deepseek") {
    parameters = { thinking: { type: mode === "disabled" ? "disabled" : "enabled" } };
    if (!["disabled", "enabled"].includes(mode)) parameters.reasoning_effort = mode;
  } else {
    parameters = { reasoning: { enabled: mode !== "disabled" } };
    if (!["disabled", "enabled"].includes(mode)) parameters.reasoning.effort = mode;
  }
  if (viaProxy) body.custom_include_body = JSON.stringify(parameters);
  else Object.assign(body, parameters);
  return body;
}
function refreshManualThinkingControls(profile) {
  $("#ch-llm_thinking_category").val(profile.thinking_category || "auto");
  const category = getManualThinkingCategory(profile);
  const labels = { default: "跟随接口（不传参）", disabled: "关闭 / off", enabled: "开启（默认强度）", minimal: "最低 / minimal", low: "低 / low", medium: "中 / medium", high: "高 / high", xhigh: "超高 / xhigh", max: "最大 / max" };
  const select = $("#ch-llm_thinking_mode").empty();
  const modes = getManualThinkingModes(category);
  for (const mode of modes) select.append(new Option(labels[mode], mode));
  const saved = profile.thinking_mode || "default";
  if (!modes.includes(saved)) select.append(new Option("原选择不适用，请重新选择：" + saved, saved));
  select.val(saved);
  const notes = {
    deepseek: "DeepSeek 原生：thinking.type + reasoning_effort；OpenRouter 请选对应类别。",
    openrouter: "OpenRouter 通用 reasoning；各模型支持档位不同，强制思考模型不能关闭。",
    or_muse: "Muse Spark 1.3 / Contributor 必须思考；可选 minimal 至 max。",
    or_glm: "GLM 5.2：关闭、开启、high、xhigh（最大思考）。",
    or_switch: "Kimi K2.5 / Qwen 3.7：仅 reasoning.enabled，不发送未支持的 effort。"
  };
  $("#ch-llm_thinking_note").text((notes[category] || "") + " 选择后自动保存到当前 API 预设。");
}
function saveManualThinkingControls() {
  const name = profileSelect.val();
  const profile = extension_settings14[extensionName].llm_profiles?.[name];
  if (!profile) return;
  profile.thinking_category = $("#ch-llm_thinking_category").val() || "auto";
  profile.thinking_mode = $("#ch-llm_thinking_mode").val() || "default";
  saveSettingsDebounced7();
  refreshManualThinkingControls(profile);
}
function installManualThinkingControls() {
  if (!$("#ch-llm_thinking_category").length) {
    bypassProxyToggle.closest(".st-chatu8-field").after(
      '<div class="st-chatu8-field"><label for="ch-llm_thinking_category">思考参数类别</label>' +
      '<select id="ch-llm_thinking_category" class="text_pole">' +
      '<option value="auto">自动（按 API 地址 / 模型）</option>' +
      '<option value="openrouter">OpenRouter 通用</option>' +
      '<option value="or_muse">OpenRouter · Muse Spark 1.3 / Contributor</option>' +
      '<option value="or_glm">OpenRouter · GLM 5.2</option>' +
      '<option value="or_switch">OpenRouter · 仅开关（Kimi / Qwen）</option>' +
      '<option value="deepseek">DeepSeek 原生</option></select>' +
      '<label for="ch-llm_thinking_mode">思考模式</label><select id="ch-llm_thinking_mode" class="text_pole"></select>' +
      '<small id="ch-llm_thinking_note"></small></div>');
  }
  $("#ch-llm_thinking_category, #ch-llm_thinking_mode").off("change.manualThinking").on("change.manualThinking", saveManualThinkingControls);
}
