# ai-service

AI microservice for Railway-friendly inference tasks.

## Current Endpoints

- `GET /health`
- `POST /route-intro`

## Route Intro Request

```json
{
  "distanceKm": 12.4,
  "durationMin": 205,
  "difficulty": "Moderate",
  "riskLevel": "Moderate",
  "goNoGo": "Go",
  "geographyProfile": {
    "terrainType": "bush trail",
    "surfaceType": "rocky",
    "trailCondition": "good",
    "totalAscentM": 520,
    "maxSlopePct": 21
  },
  "zoneSummary": {
    "level1Count": 1,
    "level2Count": 2,
    "level3Count": 0
  },
  "keyRisks": [
    {
      "title": "Bushfire watch",
      "type": "fire",
      "severity": "high",
      "distanceKm": 1.4
    }
  ]
}
```

## Route Intro Response

```json
{
  "ok": true,
  "intro": "This track offers a moderate walk...",
  "source": "gemini",
  "model": "gemini-2.5-flash-lite"
}
```

If no Gemini key is configured, the service returns a deterministic fallback paragraph instead.

## Providers

The service supports three route-intro providers:

- `local-model`
- `gemini`
- `fallback`

Set `ROUTE_INTRO_PROVIDER=auto` to prefer:

1. local model, when `ROUTE_INTRO_MODEL_ADAPTER_PATH` is set
2. Gemini, when `GEMINI_API_KEY` is set
3. fallback, otherwise

### Local Model Env Vars

```env
ROUTE_INTRO_PROVIDER=local-model
ROUTE_INTRO_MODEL_ADAPTER_PATH=/absolute/path/to/adapter
ROUTE_INTRO_MODEL_TOKENIZER_PATH=
ROUTE_INTRO_MODEL_PYTHON_BIN=python3
ROUTE_INTRO_MODEL_DEVICE_MAP=auto
ROUTE_INTRO_MODEL_TIMEOUT_MS=45000
ROUTE_INTRO_MODEL_MAX_NEW_TOKENS=160
```

The adapter path should point to the folder saved by your training run, such as
the LoRA output copied back from Colab. If the adapter folder does not contain a
complete tokenizer, leave `ROUTE_INTRO_MODEL_TOKENIZER_PATH` empty and the
worker will fall back to the base model declared in `adapter_config.json`, or
set it explicitly to a local tokenizer/model path.
