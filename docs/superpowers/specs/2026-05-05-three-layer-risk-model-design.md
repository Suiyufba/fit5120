# Route Risk Scoring — Three-Layer Model

## Summary

Replace the current flat weighted-sum risk model with a three-layer architecture:
**Base Risk × Environmental Multiplier + Interaction Penalty**.

This fixes 4 defects in the current model (weather double-counting, recency ignoring `now`, correlated zone/hazard scores, density boost ignoring type diversity) and adds 3 new factor categories (sunset/daylight, season, temperature) plus hazard interaction effects.

## Current Model (baseline)

```
rawWeighted = 0.34*hazardScore + 0.12*weatherScore + 0.18*zoneExposure
            + 0.16*routeDifficulty + 0.20*geographyScore + feasibilityPenalty
finalScore = clamp(rawWeighted * profileFactor)
```

Defects:
1. weatherScore overlaps with hazardScore (weather hazards counted twice)
2. recencyFactor() uses Date.now() instead of passed `now` param
3. hazardScore and zoneExposure are highly correlated (same input, similar computation)
4. Density boost `0.78 + count*0.18` doesn't distinguish 6×same-type from 6×different-types

## New Model

### Layer 1: Base Risk (0–100)

```
baseRisk = clamp(0.40 * hazardExposure + 0.30 * routeEffort + 0.30 * terrainDanger)
```

**hazardExposure** — consolidated hazard impact with type diversity:
- All hazards evaluated via `toHazardImpact()` (severity × distance × type × recency)
- Top 6 impacts, averaged
- diversityBoost = `1 + (uniqueTypes / maxPossibleTypes) * 0.35` (range: 1.06–1.35)
- Replaces old hazardScore + weatherScore + crude density boost

**routeEffort** — physical demand of the route:
- `0.55 * burdenScore + 0.45 * elevationFatigue`
- burdenScore = distanceEndurance + durationExposure (existing, without detour penalty)
- elevationFatigue = `clamp(0.6*ascent/1400*100 + 0.4*maxSlope/35*100)`

**terrainDanger** — spatial hazard coverage + terrain hazards:
- `0.40 * zoneCoverage + 0.30 * terrainSurface + 0.30 * exposureCounts`
- zoneCoverage = existing coverageZoneScore (reduced weight in overall model)
- terrainSurface = existing terrainPenalty
- exposureCounts = `clamp(riverCrossings*10 + cliffExposure*14 + closureCount*28, 0, 100)`

### Layer 2: Environmental Multiplier (0.70–1.40)

```
envMultiplier = clamp(1.0 + sunAdjust + seasonAdjust + tempAdjust, 0.70, 1.40)
```

**sunAdjust** — daylight vs. estimated finish time:
- Compute sunset hour from lat/lng + date (pure math, no API)
- Compare to `now + durationMin`
- -0.10 (finish 2h+ before sunset) to +0.22 (finish 1h+ after sunset)

**seasonAdjust** — Southern Hemisphere seasonal risk:
- summer (Dec–Feb): +0.10 (bushfire + snakes + heat)
- autumn (Mar–May): -0.05 (mildest)
- winter (Jun–Aug): +0.06 (short daylight + cold + alpine snow)
- spring (Sep–Nov): 0.00 (baseline)

**tempAdjust** — feels-like temperature from OpenWeather:
- <5°C: +0.06 (cold stress) up to >42°C: +0.20 (dangerous heat)

### Layer 3: Interaction Penalty (0–30)

Additive penalty when hazard types and route conditions combine:

| Condition | Penalty |
|-----------|---------|
| fire hazard + storm/wind hazard present | +12 |
| flood/storm hazard + maxSlope ≥ 22% | +10 |
| heat hazard + durationMin ≥ 180 | +8 |
| closureCount > 0 + only 1 candidate route | +10 |
| fire hazard within 1km of route | +8 |
| ≥2 different hazard types within same 1km segment | +6 |
| finish after sunset + (cliffExposure > 0 or riverCrossings > 0) | +8 |
| temp < 2°C + flood/storm hazard | +6 |

### Final Score

```
riskScore = clamp(baseRisk * envMultiplier + interactionPenalty)
riskScore = clamp(riskScore * profileFactor)  // newcomer 1.12, intermediate 1.0, advanced 0.9
```

Go/No-Go thresholds, difficulty labels, risk levels, suggestedPrep all remain on top of the final riskScore — unchanged contract.

## Fixes Applied

| Defect | Fix |
|--------|-----|
| Weather double-counting | hazardExposure processes all hazards once; no separate weatherScore |
| recencyFactor ignores `now` | Pass `now` through to recencyFactor, use it instead of Date.now() |
| zoneExposure/hazardScore correlation | Folded into separate dimensions (hazardExposure for intensity, terrainDanger for spatial coverage) |
| Density boost ignores type diversity | Replaced with diversityBoost based on unique hazard types |

## New Factors Added

| Factor | Data Source | API Cost |
|--------|------------|----------|
| Sunset/daylight vs finish time | Pure math (lat/lng + date) | Zero |
| Season risk adjustment | Existing seasonFromDate() | Zero |
| Temperature risk | OpenWeather feels_like (already fetched) | Zero |
| Hazard type diversity | Existing hazards array | Zero |
| Hazard interaction effects | Existing hazards + geography | Zero |

## Files Changed

| File | Changes |
|------|---------|
| `backend/src/modules/routes/domain/routeRisk.js` | Core rewrite: new three-layer scoring, sunset calculation, diversity boost, interaction rules, fix recencyFactor |
| `backend/src/modules/routes/domain/routeTiming.js` | No changes (elevation/terrain formulas unchanged) |
| `backend/src/modules/routes/services/routePlannerService.js` | Pass temperature data and `now` parameter through; extract max feels_like from weather hazards |
| `backend/src/modules/routes/domain/routeRisk.test.js` | Rewrite tests for three-layer model; add sunset/season/temp/interaction test cases |

## Backwards Compatibility

API response shape unchanged (`riskScore`, `riskLevel`, `goNoGo`, `scoringBreakdown`, etc.).
scoringBreakdown will include new fields: `baseRisk`, `envMultiplier`, `interactionPenalty`, plus sub-component breakdowns.
