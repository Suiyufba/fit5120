# HikeShield Product Video Plan

目标：制作一条约 2 分钟的 HikeShield Victoria product video。建议拆成 8 个 15 秒片段生成，再在剪映、CapCut、DaVinci Resolve 或 Premiere 里合成。

核心信息：HikeShield 是面向 Victoria, Australia 的 hiking safety planning platform，帮助用户在出发前查看 live hazard signals、规划 safer route、理解 route risk、提交 community reports、阅读 safety knowledge。它支持更安全的 pre-hike planning，但不替代 VicEmergency、BOM、Parks Victoria 或 000。

Working title: **The Wrong Trail, The Right Plan**

中文概念：**善意不等于安全计划。**

## 1. Overall Story

前 30 秒用轻微黑色幽默和梦境循环做 hook：hiker 每次凭直觉做选择，都会陷入新的风险判断。第三次醒来后，他停止“猜”，打开 HikeShield，在出发前查看风险、规划路线、理解准备事项。后 90 秒转为干净、可信、实用的 product demo。

| Time | Section | Purpose | Method |
|---|---|---|---|
| 0-15s | The First Wrong Choice | 善意但盲目地冒险 | AI 剧情 |
| 15-30s | Still Guessing | 反向选择也仍是 guessing | AI 剧情 |
| 30-45s | HikeShield Breaks The Loop | 第三次醒来，打开产品 | AI + logo/home |
| 45-60s | Home + Risk Map | 展示 live risk signals | 实录网页优先 |
| 60-75s | Route Planner | 展示 safer route planning | 实录网页优先 |
| 75-90s | Route Detail | 展示 metrics、3D terrain、risk sections、prep | 实录网页优先 |
| 90-105s | Community Reports | 展示报告 hazard 和 000 边界 | 实录网页优先 |
| 105-120s | Knowledge + Resolution | 展示 Knowledge Hub + 安全结尾 | AI + screenshot |

## 2. Assets

上传这些素材给 AI 平台：

```text
/Users/junqiliu/Desktop/IT/goHiking/frontend/public/hikeshield-logo.png
/Users/junqiliu/Desktop/IT/goHiking/docs/product-promo-screenshots/01-home.png
/Users/junqiliu/Desktop/IT/goHiking/docs/product-promo-screenshots/02-risk-map.png
/Users/junqiliu/Desktop/IT/goHiking/docs/product-promo-screenshots/03-route-planner.png
/Users/junqiliu/Desktop/IT/goHiking/docs/product-promo-screenshots/04-route-detail.png
/Users/junqiliu/Desktop/IT/goHiking/docs/product-promo-screenshots/05-community-reports.png
/Users/junqiliu/Desktop/IT/goHiking/docs/product-promo-screenshots/06-report-hazard.png
/Users/junqiliu/Desktop/IT/goHiking/docs/product-promo-screenshots/07-knowledge-hub.png
```

每段给 AI 的图片：

| Clip | Upload | Do Not Upload |
|---|---|---|
| 1 | 不需要产品图；可不给 | 全部 UI 截图 |
| 2 | 不需要产品图；可不给 | 全部 UI 截图 |
| 3 | `hikeshield-logo.png`, `01-home.png` | 其他 UI |
| 4 | `hikeshield-logo.png`, `01-home.png`, `02-risk-map.png` | Planner, Detail, Reports, Knowledge |
| 5 | `hikeshield-logo.png`, `03-route-planner.png` | 其他 UI |
| 6 | `hikeshield-logo.png`, `04-route-detail.png` | 其他 UI |
| 7 | `hikeshield-logo.png`, `05-community-reports.png`, `06-report-hazard.png` | 其他 UI |
| 8 | `hikeshield-logo.png`, `07-knowledge-hub.png` | 其他 UI |

重要：如果 AI 生成的 UI 字变形、logo 拼错、按钮乱码，产品部分直接改用真实网页录屏或截图推拉动画。UI 可信度比电影感更重要。

## 3. Global AI Prompt

每条 AI 生成都加这一段：

```text
Create a 15-second cinematic product video clip for HikeShield Victoria, a hiking safety planning platform for Victoria, Australia. Aspect ratio 16:9. Style: realistic Australian short film, subtle surreal black comedy at the beginning, then clean premium safety-tech product advertisement. Natural Melbourne morning light, Dandenong Ranges atmosphere, grounded acting, no horror, no gore, no visible animal suffering.

Keep visual continuity: same 28-35-year-old Victorian hiker, short dark hair, practical outdoor jacket, hiking watch, backpack nearby. Same mysterious woman, practical raincoat, calm intense expression, surreal messenger energy, not a villain.

When showing product UI, use the uploaded HikeShield screenshots exactly. Preserve the HikeShield logo, white canvas, dark navy typography, trail-green buttons, rounded pill navigation, Leaflet Victoria map, hazard layer chips, route planner sidebar, route detail metrics, community report form, Knowledge Hub cards, and emergency wording. Do not invent a different app. Do not misspell HikeShield.

Brand safety: HikeShield supports safer planning; it does not replace official emergency services. If life or property is in immediate danger, call 000.
```

Negative prompt:

```text
No gore, no blood, no animal injury, no graphic bushfire danger close-up, no realistic weapon, no horror lighting during product demo, no distorted hands, no fake UI, no fake brand names, no misspelled HikeShield, no unreadable text, no invented screens, no claim that HikeShield dispatches rescuers, no advice replacing VicEmergency, BOM, Parks Victoria, or 000.
```

## 4. Clip Prompts

## Clip 1: The First Wrong Choice

Purpose: 用黑色幽默建立“善意但盲目”的问题。

Images: 不上传 UI 截图。

Prompt:

```text
A realistic Melbourne apartment at early morning. A Victorian hiker drinks coffee beside hiking boots, backpack, rain jacket, and a Dandenong Ranges paper map. He looks excited for a hike. Suddenly the front door swings open and a mysterious woman in a practical raincoat steps in, calm and dramatic but funny.

Dialogue:
Woman: "Were you the hiker who saved a fox in the Dandenong Ranges?"
Hiker, awkwardly hopeful: "If this is where nature says thank you... yes?"

Quick surreal flashback: smoky Dandenong forest trail, orange glow far in the distance, the hiker carrying a fox away from smoke. Keep the fox safe, no injury, no panic close-up.

Back in the apartment, the woman says: "You cared. But you walked into a fire zone without knowing the risk."

End on his confused face as white light flickers like a dream reset.

On-screen text: "What if caring is not enough?"
Sound: coffee cup, door slam, playful suspense sting, soft bushfire rumble far away.
```

Edit: hard cut / white flash into Clip 2.

## Clip 2: Still Guessing

Purpose: 强化“反过来选也不是 safety plan”。

Images: 不上传 UI 截图。

Prompt:

```text
Continuation with the same hiker and same mysterious woman. Start with the hiker jolting awake in bed after the white flash. Hard cut to him hiking in the Dandenong Ranges. The forest is beautiful but uneasy. Distant smoke behind trees. A closed-looking side track. The same fox appears near the smoky direction.

This time the hiker hesitates, steps back, and chooses not to enter. Smash cut back to the apartment: he is holding coffee again, deja vu. The mysterious woman is at the door.

Dialogue:
Woman: "Were you the hiker who left a fox in the smoke?"
Hiker: "So... still not a thank-you visit?"
Woman: "Still guessing."

Dream loop resets with stylized flash to black.

On-screen text: "Guessing is not a safety plan."
Sound: gasp, forest wind, distant siren, door slam, comedic reset hit.
```

Edit: 结尾留 0.3 秒黑场，进入产品转场。

## Clip 3: HikeShield Breaks The Loop

Purpose: hiker 第三次醒来，不再直接出门，而是打开 HikeShield。

Images:

```text
hikeshield-logo.png
01-home.png
```

Prompt:

```text
Third morning in the same apartment. The hiker reaches for his boots, then stops. He looks at his laptop and phone. The uploaded HikeShield logo and Home screenshot are visible. He opens HikeShield Victoria instead of rushing out.

Show crisp close-up of the HikeShield Home page. Preserve the exact UI: "Find the safer trail before you leave home", white interface, trail-green action button, warm hiking imagery, active signals, community and knowledge preview sections.

The hiker's expression changes from panic to focused relief. Music shifts from playful suspense to clean hopeful product-tech rhythm.

Voiceover:
"The problem was never whether he cared. The problem was that he was planning blind."

On-screen text: "Plan before the trail."
```

Fallback: 如果 UI 失真，使用 `01-home.png` 做慢速 zoom/pan。

## Clip 4: Home + Risk Map

Purpose: 展示 HikeShield 的第一层价值：出发前看 Victoria live risk signals。

Images:

```text
hikeshield-logo.png
01-home.png
02-risk-map.png
```

Prompt:

```text
Product screen-recording style using uploaded HikeShield Home screenshot and Risk Map screenshot as exact visual references. Start on the Home page hero: "Find the safer trail before you leave home." Cursor taps "Plan a safe route", then transitions to the Risk Map.

Show Real-time Victoria Risk Map, Official Open Data Monitoring, hazard layers for Fire, Flood, Storm, Heat, Trail, Other. Show active hazard feed, current summary, severity counts, map zoom controls, and Victoria map with subtle pulsing hazard circles.

Preserve exact HikeShield UI. Make it feel like real browser footage with gentle cursor movement, map zoom, and clean callout overlays.

Voiceover:
"Before you leave, HikeShield helps you check live risk signals across Victoria, including fire, flood, storm, heat, trail obstacles, and other hazards."

On-screen text: "Live Risk Map"
```

Better real recording: Home hero -> navigate Risk Map -> zoom once -> show hazard layers and visible feed.

## Clip 5: Route Planner

Purpose: 展示 planning by risk, not just distance。

Images:

```text
hikeshield-logo.png
03-route-planner.png
```

Prompt:

```text
Product screen-recording style using uploaded HikeShield Route Planner screenshot as exact UI reference. Show the Pre-Hike Safety Planner page. Cursor selects a start point and destination around Melbourne and the Dandenong Ranges. The map draws route options. The left panel shows Plan Route, point search, route summary, route history, and hazard legend.

Show that HikeShield plans by safety, not just shortest distance. Keep UI crisp: white panel, green controls, Leaflet map, route lines, hazard overlay.

Voiceover:
"Route Planner compares more than distance. It considers hazard exposure, terrain, weather conditions, effort, daylight, and your hiking experience level."

On-screen text: "Plan by risk, not just distance."
```

Better real recording: 打开 Route Planner -> 输入/选择起点终点 -> 点击 Plan Route -> 展示 route summary。

## Clip 6: Route Detail

Purpose: 展示 HikeShield 解释 route 为什么更安全。

Images:

```text
hikeshield-logo.png
04-route-detail.png
```

Prompt:

```text
Use uploaded HikeShield Route Detail screenshot as exact UI reference. Start with the Route Safety Detail page and Recommended Route panel. Show route metrics: distance, duration, difficulty, risk level, and safety status. Show the 3D terrain map area with a smooth camera-like inspection feeling, route line over terrain, and the detail panel with Geography Profile, Key Risk Sections, Suggested Prep, Share Route, and Open in Google Maps.

Do not invent a new app layout. Preserve HikeShield UI exactly.

Voiceover:
"Route Detail explains the decision: how long it takes, how difficult it is, where the key risk sections are, and what to prepare before you commit."

On-screen text: "Understand the route before you walk it."
```

Better real recording: metrics grid -> safety status -> Geography Profile -> Key Risk Sections -> Suggested Prep -> 3D map.

## Clip 7: Community Reports

Purpose: 展示 community intelligence，并明确 000 emergency boundary。

Images:

```text
hikeshield-logo.png
05-community-reports.png
06-report-hazard.png
```

Prompt:

```text
Use uploaded HikeShield Community Reports and Report Hazard screenshots as exact UI references. Show Community Intelligence + Official Risk Layer. Cursor picks a report location on the map, enters a report title such as "Smoke near trail", selects hazard type Fire / Smoke, severity High, adds a short description, optional reporter name, and optional photo.

Show the emergency modal clearly:
"If life or property is in immediate danger, please call 000 right now. Otherwise you can continue and submit a community report."

Keep the tone practical and responsible. Do not imply HikeShield replaces emergency services.

Voiceover:
"When hikers spot hazards, Community Reports help others see what is changing on the trail. And for urgent danger, call 000."

On-screen text: "Report what you see. Call 000 for emergencies."
```

Better real recording: Community Reports -> emergency modal -> continue reporting -> pick point -> fill form -> show Live Summary / Latest Reports。

## Clip 8: Knowledge + Resolution

Purpose: 展示 Knowledge Hub，并回到安全外景收尾。

Images:

```text
hikeshield-logo.png
07-knowledge-hub.png
```

Prompt:

```text
Start with uploaded HikeShield Knowledge Hub screenshot as exact UI reference. Show "Field Intelligence For Safer Hikes", topic filters, featured article, and safety articles about weather decisions, bushfire readiness, and trail preparation.

Then cut to the same hiker walking a clear safer trail in the Dandenong Ranges, calm and prepared with backpack, water, and phone. Smoke is far away and avoided. A fox and koala are visible safely in the distance as a peaceful surreal callback. No danger, no rescue scene, no animal distress.

End card with uploaded HikeShield logo.

Voiceover:
"With risk intelligence, safer route planning, community reports, and practical safety knowledge, HikeShield helps Victorian hikers prepare with confidence."

Final on-screen text:
"HikeShield Victoria"
"Know the risks. Choose the safer route. Hike prepared."
"Plan safer hikes before you leave home."
```

Edit: end card 用白底、logo、dark navy text、trail-green accent。

## 5. Final Voiceover

Clips 1-2 用对白和音效即可。Clips 3-8 用同一个 narrator：

```text
Every choice felt wrong because he was guessing.

Before you leave, HikeShield Victoria helps you check live risk signals across the state.

Explore fire, flood, storm, heat, trail obstacles, and community reports in one clear map-based view.

Plan routes by more than distance. HikeShield compares hazard exposure, terrain, weather, effort, daylight, and your hiking experience level.

Each route includes distance, estimated duration, difficulty, risk level, safety status, key risk sections, and suggested preparation.

Route Detail helps you inspect terrain and understand why a route is safer before you commit.

And when hikers spot hazards on the trail, Community Reports help others make better decisions too.

For urgent danger, call 000. HikeShield supports safer planning; it does not replace emergency services.

HikeShield Victoria. Know the risks. Choose the safer route. Hike prepared.
```

## 6. Dialogue

Clip 1:

```text
Woman: Were you the hiker who saved a fox in the Dandenong Ranges?
Hiker: If this is where nature says thank you... yes?
Woman: You cared. But you walked into a fire zone without knowing the risk.
```

Clip 2:

```text
Woman: Were you the hiker who left a fox in the smoke?
Hiker: So... still not a thank-you visit?
Woman: Still guessing.
```

## 7. On-Screen Text

| Clip | Text |
|---|---|
| 1 | What if caring is not enough? |
| 2 | Guessing is not a safety plan. |
| 3 | Plan before the trail. |
| 4 | Live Risk Map |
| 5 | Plan by risk, not just distance. |
| 6 | Understand the route before you walk it. |
| 7 | Report what you see. Call 000 for emergencies. |
| 8 | HikeShield Victoria. Know the risks. Choose the safer route. Hike prepared. |

Subtitle style: white text, subtle dark shadow, one short sentence at a time, do not cover UI buttons or map controls.

## 8. Editing Notes

Order:

```text
Clip 1 -> Clip 2 -> Clip 3 -> Clip 4 -> Clip 5 -> Clip 6 -> Clip 7 -> Clip 8
```

Transitions:

- Clip 1 to 2: hard cut / white dream flash.
- Clip 2 to 3: flash to black, then music transition.
- Clip 3 to 7: clean direct cuts, like product demo.
- Clip 7 to 8: gentle crossfade or outdoor ambience transition.

Music:

- Clips 1-2: playful suspense.
- Clip 3: tension resolves into hopeful tech rhythm.
- Clips 4-8: restrained electronic/acoustic product ad music.

Sound effects:

- Coffee cup, door slam, dream flash, soft UI taps, map zoom, notification chime, outdoor wind and birds.

## 9. Real Recording Shot List

Record these from the real website if possible:

1. Home: hero, "Plan a safe route", risk preview.
2. Risk Map: hazard layer chips, zoom controls, current summary, visible feed.
3. Route Planner: select start/destination, click Plan Route, show route summary.
4. Route Detail: metrics, status tag, Geography Profile, Key Risk Sections, Suggested Prep, 3D map.
5. Community Reports: emergency modal, continue reporting, pick point, fill report, Live Summary.
6. Knowledge Hub: hero, filters, featured article, article cards.

## 10. Final Checklist

- HikeShield spelling correct.
- Dandenong Ranges spelling correct.
- UI text readable.
- No fake AI UI in product demo.
- No gore, blood, animal injury, or graphic disaster harm.
- No claim that HikeShield replaces emergency services.
- 000 disclaimer appears clearly.
- Logo appears in Clip 3 and final end card.
- Final video is about 120 seconds.
- Every 15-second clip has a clean start and end.
