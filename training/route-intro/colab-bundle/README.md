# Route Intro Colab Bundle

This folder is the Colab-ready package for training the HikeShield route-intro
model on a GPU.

## Included Files

- `route_intro_train.combined.jsonl`
- `route_intro_eval.combined.jsonl`
- `lora.qwen-0.5b.colab.json`
- `train_lora.py`
- `evaluate_model.py`
- `requirements.txt`
- `RouteIntro_Qwen_Colab.ipynb`

## Recommended Colab Runtime

- Runtime type: `Python 3`
- Hardware accelerator: `T4 GPU` or better

## Quick Start

1. Upload the whole bundle folder to Colab or Drive.
2. Open `RouteIntro_Qwen_Colab.ipynb`.
3. Run the cells in order.

## Output

By default, the LoRA adapter is saved to:

`/content/drive/MyDrive/hikeshield-route-intro/qwen2.5-0.5b-route-intro-lora`

You can change that path in `lora.qwen-0.5b.colab.json`.
