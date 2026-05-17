# Route Intro Training

This folder holds the dataset and workflow for fine-tuning a small route-intro
model for HikeShield.

## Goal

Train a model on:

- input: structured route planner JSON
- output: one short user-friendly intro paragraph

The backend remains the source of truth for:

- risk score
- go / no-go
- hazard detection

The model should only verbalize those facts.

## Fine-Tuning Scaffold

Files included:

- `requirements.txt`: Python dependencies for LoRA fine-tuning
- `configs/lora.json`: starter training config
- `prompts/system_prompt.txt`: canonical system prompt
- `train_lora.py`: starter SFT + LoRA training script
- `evaluate_model.py`: quick qualitative generation check

## Export Dataset

From the repo root:

```bash
node training/route-intro/export-dataset.mjs
```

That writes:

- `training/route-intro/data/route_intro_train.jsonl`
- `training/route-intro/data/route_intro_eval.jsonl`
- `training/route-intro/data/route_intro_manifest.json`

## Data Sources

The exporter supports:

1. Postgres route history via `DATABASE_URL`
2. A local JSON file via `--input`

Examples:

```bash
node training/route-intro/export-dataset.mjs --limit 500
node training/route-intro/export-dataset.mjs --input training/route-intro/examples/history.json
node training/route-intro/export-dataset.mjs --output training/route-intro/data/custom
```

If you do not yet have Postgres route history, bootstrap a starter history file
from the live local backend first:

```bash
node training/route-intro/bootstrap-from-api.mjs
node training/route-intro/export-dataset.mjs --input training/route-intro/data/bootstrap/route_history_bootstrap.json
```

## Output Format

Each JSONL row uses chat-style fine-tuning messages:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "Write one short user-friendly hiking route introduction from structured route data. Use only the facts provided."
    },
    {
      "role": "user",
      "content": "{\"distanceKm\":9.6,\"durationMin\":185,...}"
    },
    {
      "role": "assistant",
      "content": "This track offers a moderate walk..."
    }
  ],
  "metadata": {
    "routeId": "route-1",
    "historyId": 42,
    "targetSource": "fallback"
  }
}
```

## Recommended Next Step

Start by exporting fallback-based labels, then manually review a subset and
replace the assistant output with higher-quality edited text before fine-tuning.

## Review Workflow

Create an editable review batch:

```bash
node training/route-intro/review-sample.mjs --count 50
```

This writes:

- `training/route-intro/review/route_intro_review_batch.json`

For each item:

- edit `reviewedIntro`
- set `approved` to `true` when ready
- optionally add `notes`

Then merge reviewed edits back into JSONL:

```bash
node training/route-intro/merge-reviewed.mjs
```

This writes:

- `training/route-intro/data/reviewed/route_intro_train.reviewed.jsonl`
- `training/route-intro/data/reviewed/route_intro_eval.reviewed.jsonl`
- `training/route-intro/data/reviewed/route_intro_review_manifest.json`

## Training

Install Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r training/route-intro/requirements.txt
```

Run the starter LoRA fine-tune:

```bash
python3 training/route-intro/train_lora.py
```

The default config trains against:

- `training/route-intro/data/reviewed/route_intro_train.reviewed.jsonl`
- `training/route-intro/data/reviewed/route_intro_eval.reviewed.jsonl`

and writes adapters to:

- `training/route-intro/artifacts/qwen2.5-1.5b-route-intro-lora`

## Quick Evaluation

After training:

```bash
python3 training/route-intro/evaluate_model.py \
  --model training/route-intro/artifacts/qwen2.5-1.5b-route-intro-lora
```

This prints a few expected vs generated route intros for manual review.

## Generate Larger Synthetic Training Sets

If you need more volume before manual review catches up, generate synthetic
route-intro examples from the reviewed seed set:

```bash
node training/route-intro/generate-synthetic.mjs --count 1200
```

This writes:

- `training/route-intro/data/synthetic/route_intro_train.synthetic.jsonl`
- `training/route-intro/data/synthetic/route_intro_eval.synthetic.jsonl`
- `training/route-intro/data/synthetic/route_intro_synthetic_manifest.json`

If a Gemini key is configured in the environment, the generator will use it for
labels. Otherwise it falls back to deterministic route-intro generation.

To build a smaller high-quality Gemini-only subset on the free tier, pace the
requests and keep only successful Gemini responses:

```bash
GEMINI_API_KEY=... npm run generate:route-intro-gemini -- --count 40 --max-attempts 120 --output training/route-intro/data/synthetic-gemini
```

That writes the same train/eval files, but skips fallback rows if Gemini is
rate-limited.

## Build A Combined Training Corpus

To combine the best sources into one training set, use:

```bash
npm run combine:route-intro-datasets
```

This writes:

- `training/route-intro/data/combined/route_intro_train.combined.jsonl`
- `training/route-intro/data/combined/route_intro_eval.combined.jsonl`
- `training/route-intro/data/combined/route_intro_combined_manifest.json`

The combiner uses this priority order:

1. reviewed examples
2. Gemini-only examples
3. fallback synthetic examples

It also drops duplicate route payloads and filters obvious Gemini hallucinations
such as mentioning river crossings or cliff exposure when those counts are zero
in the structured input.

## Export A Colab Bundle

To package the current dataset and training files for Google Colab:

```bash
npm run export:route-intro-colab-bundle
```

That writes a ready-to-upload folder at:

- `training/route-intro/colab-bundle/`

The bundle includes:

- combined train/eval JSONL files
- `train_lora.py`
- `evaluate_model.py`
- `requirements.txt`
- `lora.qwen-0.5b.colab.json`
- `RouteIntro_Qwen_Colab.ipynb`
