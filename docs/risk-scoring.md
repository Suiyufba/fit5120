# Risk Scoring Model

## Three-Layer Architecture

```
finalScore = clamp(baseRisk × envMultiplier + interactionPenalty)
finalScore = clamp(finalScore × profileFactor)
```

### Layer 1 — Base Risk (0–100)

Intrinsic danger of the route regardless of current conditions.

```
baseRisk = 0.40 × hazardExposure + 0.30 × routeEffort + 0.30 × terrainDanger
```

**hazardExposure** — How close and severe are nearby hazards?
- Each hazard within 8 km of the route contributes an impact score: `severityBase × distanceFactor × typeFactor × recencyFactor`
- Top 6 impacts averaged, then scaled by type diversity boost: `1 + (uniqueTypes / 6) × 0.35`
- Replaces the old separate `hazardScore` + `weatherScore` (which had a double-counting bug)

**routeEffort** — How physically demanding is this route?
- `0.55 × burdenScore + 0.45 × elevationFatigue`
- burdenScore: piecewise function of distance and duration (endurance + exposure curves)
- elevationFatigue: normalized ascent (÷1400m) and max slope (÷35%)

**terrainDanger** — How hazardous is the terrain itself?
- `0.40 × zoneCoverage + 0.30 × terrainSurface + 0.30 × exposureCounts`
- zoneCoverage: hazard spatial density in 1km/3km/5km zones
- terrainSurface: penalty for rough surfaces (rock, mud, sand) and poor trail conditions
- exposureCounts: river crossings ×10, cliff exposures ×14, closures ×28

### Layer 2 — Environmental Multiplier (0.70–1.40)

Current conditions that amplify or mitigate the base risk.

```
envMultiplier = clamp(1.0 + sunAdjust + seasonAdjust + tempAdjust, 0.70, 1.40)
```

| Factor | Condition | Adjustment |
|--------|-----------|------------|
| Sun (daylight gap) | Finish 2h+ before sunset | −0.10 |
| | Finish right at sunset | +0.08 |
| | Finish 30min after sunset | +0.15 |
| | Finish 1h+ after sunset (full dark) | +0.22 |
| Season (Southern Hemisphere) | Summer (Dec–Feb): bushfire + heat | +0.10 |
| | Autumn (Mar–May): mildest | −0.05 |
| | Winter (Jun–Aug): short daylight + cold | +0.06 |
| | Spring (Sep–Nov): baseline | 0.00 |
| Temperature (feels-like) | <5°C: cold stress | +0.06 |
| | 30–35°C: warm | +0.04 |
| | >42°C: dangerous heat | +0.20 |

Sunset time is computed from latitude, longitude, and date using solar geometry — no external API needed.

### Layer 3 — Interaction Penalty (0–30)

Additive penalty when hazard types and conditions compound. Capped at 30.

| Condition | Penalty |
|-----------|---------|
| Fire + storm/wind present | +12 |
| Flood/storm + max slope ≥ 22% | +10 |
| Heat + duration ≥ 180 min | +8 |
| Closure + only 1 candidate route | +10 |
| Fire within 1 km of route | +8 |
| ≥2 different hazard types within same 1 km segment | +6 |
| Finish after sunset + (cliffs or rivers present) | +8 |
| Temperature < 2°C + flood/storm present | +6 |

## Go / No-Go Decision

Separate from the risk score. Hard rules that bypass the score threshold:

| Rule | Applies To | Trigger |
|------|-----------|---------|
| Extreme hazard too close | All users | Distance threshold varies by level (2km/1.5km/1km) |
| **Fire within 1 km** | All users | Any severity — bushfire is too unpredictable |
| **High-severity hazard within 500 m** | All users | Fire, flood, storm at close range |
| Closure on route | All users | Any trail closure |
| Distance cap exceeded | Per level | 30km/45km/60km |
| Duration cap exceeded | Per level | 480min/660min/840min |
| Risk score threshold | Per level | 52/66/78 |

No-Go routes have a floor score (65–85) that overrides the computed score to prevent low-risk labeling.

## User Profile Factor

| Level | Multiplier | Effect |
|-------|-----------|--------|
| Newcomer | ×1.12 | +12% risk amplification |
| Intermediate | ×1.00 | baseline |
| Advanced | ×0.90 | −10% risk reduction |

Also affects duration estimation (pace factor), Go/No-Go thresholds, and suggested preparation tips.

## Scoring Breakdown (API Response)

The `scoringBreakdown` field in the API response includes:

```json
{
  "baseRisk": 42.3,
  "hazardExposure": 38.5,
  "diversityBoost": 1.06,
  "routeEffort": 35.2,
  "burdenScore": 38.4,
  "elevationFatigue": 31.3,
  "terrainDanger": 24.8,
  "zoneCoverage": 18.0,
  "terrainSurface": 16.0,
  "exposureCounts": 45.0,
  "envMultiplier": 1.08,
  "sunAdjust": 0.08,
  "seasonAdjust": 0.00,
  "tempAdjust": 0.00,
  "sunsetHour": 17.2,
  "finishHour": 18.0,
  "interactionPenalty": 12.0,
  "baseWeightedTotal": 57.7,
  "profileFactor": 1.12,
  "weightedTotal": 64.6,
  "noGoFloorScore": 0
}
```
