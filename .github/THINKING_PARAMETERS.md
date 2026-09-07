# LLM 思考参数（2026-09-07 核对；随 .github 自动保留）

类别和模式选择后自动保存到当前 API 预设；切换预设、刷新后恢复。
只保存这两个字段，不会顺带覆盖尚未保存的 API 地址、Key 等字段。
保留原有“跟随接口”选项与已保存模式，不强制关闭用户原本开启的思考。

| 类别 | 参数 | 可选强度 |
| --- | --- | --- |
| DeepSeek 原生 | thinking.type；reasoning_effort | low / high / max |
| OpenRouter 通用 | reasoning.enabled；reasoning.effort | minimal / low / medium / high / xhigh / max，实际能力取决于模型 |
| OpenRouter Muse Spark 1.3（含 Contributor） | reasoning | minimal 至 max，必须思考，不提供关闭 |
| OpenRouter GLM 5.2 | reasoning | high / xhigh，可关闭；xhigh 对应最大思考 |
| OpenRouter 仅开关 | reasoning.enabled | 不发送 effort；用于 Kimi K2.5、Qwen 3.7 等 |

自动类别按 OpenRouter API 地址和已保存模型名识别以上特殊模型，否则在 OpenRouter 使用通用类别、其他地址沿用 DeepSeek 原生。自定义中转地址请手动选择类别。
“开启（默认强度）”仅开启思考，不指定强度；“跟随接口”完全不发送思考参数。
通用类别不保证每个模型支持全部档位；模型要求强制思考时不能用关闭。
不增加 OpenAI、Claude、MiMo、MiniMax、Mistral 专属适配或推荐。

参考：[OpenRouter reasoning](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)、[公开模型能力目录](https://openrouter.ai/api/v1/models)、[Muse](https://openrouter.ai/meta/muse-spark-1.3-contributor)、[GLM 5.2](https://openrouter.ai/z-ai/glm-5.2)、[DeepSeek](https://api-docs.deepseek.com/zh-cn/guides/thinking_mode/)。目录能力可能随模型/供应商更新。

维护验证：`git show 7a0824f:index.js | node .github/test-thinking.cjs`、`node --check index.js`。测试使用内存数据，不调用模型。
