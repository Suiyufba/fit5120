import argparse
import json
import os
from pathlib import Path

from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, set_seed
from trl import SFTConfig, SFTTrainer


def infer_repo_root() -> Path:
    script_path = Path(__file__).resolve()
    parents = script_path.parents

    if len(parents) >= 3:
        candidate = parents[2]
        if (candidate / "package.json").exists() or (candidate / ".git").exists():
            return candidate

    return script_path.parent


REPO_ROOT = infer_repo_root()


def load_json(path_str: str) -> dict:
    with open(path_str, "r", encoding="utf-8") as handle:
        return json.load(handle)


def resolve_repo_path(value: str) -> str:
    path = Path(value)
    if path.is_absolute():
      return str(path)
    return str((REPO_ROOT / path).resolve())


def parse_args():
    parser = argparse.ArgumentParser(description="Fine-tune a small route intro model with LoRA.")
    parser.add_argument(
        "--config",
        default=str(REPO_ROOT / "training/route-intro/configs/lora.json"),
        help="Path to the training config JSON file.",
    )
    return parser.parse_args()


def apply_chat_template(example, tokenizer):
    messages = example["messages"]
    if getattr(tokenizer, "chat_template", None):
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )
    else:
        chunks = []
        for message in messages:
            role = str(message.get("role", "user")).upper()
            content = str(message.get("content", "")).strip()
            chunks.append(f"{role}:\n{content}")
        text = "\n\n".join(chunks)
    return {"text": text}


def choose_target_modules(model, configured_modules):
    available_names = [name for name, _ in model.named_modules()]
    available_suffixes = {name.split(".")[-1] for name in available_names}

    configured = [module for module in configured_modules if module in available_suffixes]
    if configured:
        return configured

    fallback_order = [
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
        "c_attn",
        "c_proj",
        "c_fc",
        "query_key_value",
        "dense",
        "dense_h_to_4h",
        "dense_4h_to_h",
    ]
    detected = [module for module in fallback_order if module in available_suffixes]
    if detected:
        return detected

    raise ValueError(
        "Could not find compatible LoRA target modules on the loaded model. "
        f"Configured modules were: {configured_modules}. "
        f"Available module suffix samples: {sorted(list(available_suffixes))[:40]}"
    )


def main():
    args = parse_args()
    cfg = load_json(args.config)

    set_seed(int(cfg.get("seed", 42)))

    model_name = cfg["base_model"]
    train_file = resolve_repo_path(cfg["train_file"])
    eval_file = resolve_repo_path(cfg["eval_file"])
    output_dir = resolve_repo_path(cfg["output_dir"])
    max_seq_length = int(cfg.get("max_seq_length", 1024))

    if not os.path.exists(train_file):
        raise FileNotFoundError(f"Train file not found: {train_file}")
    if not os.path.exists(eval_file):
        raise FileNotFoundError(f"Eval file not found: {eval_file}")

    tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype="auto",
        device_map=cfg.get("device_map", "auto"),
    )

    raw_dataset = load_dataset(
        "json",
        data_files={
            "train": train_file,
            "eval": eval_file,
        },
    )

    formatted = raw_dataset.map(
        lambda example: apply_chat_template(example, tokenizer),
        remove_columns=raw_dataset["train"].column_names,
    )

    target_modules = choose_target_modules(
        model,
        cfg.get(
            "target_modules",
            ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        ),
    )
    print(f"Using LoRA target modules: {target_modules}")

    peft_config = LoraConfig(
        r=int(cfg.get("lora_r", 16)),
        lora_alpha=int(cfg.get("lora_alpha", 32)),
        lora_dropout=float(cfg.get("lora_dropout", 0.05)),
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=target_modules,
    )

    training_args = SFTConfig(
        output_dir=output_dir,
        learning_rate=float(cfg.get("learning_rate", 2e-4)),
        num_train_epochs=float(cfg.get("num_train_epochs", 3)),
        per_device_train_batch_size=int(cfg.get("per_device_train_batch_size", 2)),
        per_device_eval_batch_size=int(cfg.get("per_device_eval_batch_size", 2)),
        gradient_accumulation_steps=int(cfg.get("gradient_accumulation_steps", 8)),
        warmup_ratio=float(cfg.get("warmup_ratio", 0.05)),
        weight_decay=float(cfg.get("weight_decay", 0.01)),
        logging_steps=int(cfg.get("logging_steps", 10)),
        save_steps=int(cfg.get("save_steps", 100)),
        eval_steps=int(cfg.get("eval_steps", 100)),
        eval_strategy="steps",
        save_strategy="steps",
        use_cpu=bool(cfg.get("use_cpu", False)),
        bf16=False,
        fp16=False,
        max_length=max_seq_length,
        max_steps=int(cfg.get("max_steps", -1)),
        report_to=[],
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=formatted["train"],
        eval_dataset=formatted["eval"],
        processing_class=tokenizer,
        peft_config=peft_config,
    )

    trainer.train()
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

    print(f"Saved LoRA adapter and tokenizer to {output_dir}")


if __name__ == "__main__":
    main()
