import json
import os
import sys
from pathlib import Path

from peft import AutoPeftModelForCausalLM
from transformers import AutoTokenizer


SYSTEM_PROMPT = (
    "Write one short user-friendly hiking route introduction from structured route data. "
    "Use only the facts provided."
)


def load_model():
    adapter_path = os.environ.get("ROUTE_INTRO_MODEL_ADAPTER_PATH", "").strip()
    if not adapter_path:
        raise RuntimeError("ROUTE_INTRO_MODEL_ADAPTER_PATH is required for local model inference")

    adapter_config_path = Path(adapter_path) / "adapter_config.json"
    adapter_config = {}
    if adapter_config_path.exists():
        adapter_config = json.loads(adapter_config_path.read_text(encoding="utf-8"))

    tokenizer_source = (
        os.environ.get("ROUTE_INTRO_MODEL_TOKENIZER_PATH", "").strip()
        or adapter_path
    )
    base_model_name = str(adapter_config.get("base_model_name_or_path", "")).strip()
    device_map = os.environ.get("ROUTE_INTRO_MODEL_DEVICE_MAP", "auto").strip() or "auto"
    try:
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_source, use_fast=True)
    except Exception:
        try:
            tokenizer = AutoTokenizer.from_pretrained(tokenizer_source, use_fast=False)
        except Exception:
            if not base_model_name:
                raise
            try:
                tokenizer = AutoTokenizer.from_pretrained(base_model_name, use_fast=True)
            except Exception:
                tokenizer = AutoTokenizer.from_pretrained(base_model_name, use_fast=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoPeftModelForCausalLM.from_pretrained(
        adapter_path,
        torch_dtype="auto",
        device_map=device_map,
    )

    return tokenizer, model


def build_messages(route):
    user_payload = {
        "distanceKm": round(float(route.get("distanceKm", 0)), 1),
        "durationMin": round(float(route.get("durationMin", 0))),
        "difficulty": route.get("difficulty", "Moderate"),
        "riskLevel": route.get("riskLevel", "Low"),
        "goNoGo": route.get("goNoGo", "Go"),
        "geographyProfile": route.get("geographyProfile", {}),
        "zoneSummary": route.get("zoneSummary", {}),
        "keyRisks": route.get("keyRisks", []),
    }
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(user_payload)},
    ]


def build_prompt(tokenizer, route):
    messages = build_messages(route)
    if getattr(tokenizer, "chat_template", None):
        return tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )

    return "\n\n".join(
        f"{message['role'].upper()}:\n{message['content']}" for message in messages
    )


def normalize_text(text):
    return " ".join(str(text or "").strip().split())


def generate_intro(tokenizer, model, route):
    prompt = build_prompt(tokenizer, route)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(
        **inputs,
        max_new_tokens=int(os.environ.get("ROUTE_INTRO_MODEL_MAX_NEW_TOKENS", "160")),
        do_sample=False,
        temperature=1.0,
        pad_token_id=tokenizer.pad_token_id,
    )
    generated = tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True,
    )
    return normalize_text(generated)


def main():
    tokenizer, model = load_model()
    print(json.dumps({"ok": True, "event": "ready"}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            payload = json.loads(line)
            route = payload.get("route", {})
            intro = generate_intro(tokenizer, model, route)
            print(json.dumps({"ok": True, "intro": intro}), flush=True)
        except Exception as error:  # noqa: BLE001
            print(json.dumps({"ok": False, "error": str(error)}), flush=True)


if __name__ == "__main__":
    main()
