import argparse
import json
from pathlib import Path

from transformers import AutoModelForCausalLM, AutoTokenizer


def infer_repo_root() -> Path:
    script_path = Path(__file__).resolve()
    parents = script_path.parents

    if len(parents) >= 3:
        candidate = parents[2]
        if (candidate / "package.json").exists() or (candidate / ".git").exists():
            return candidate

    return script_path.parent


REPO_ROOT = infer_repo_root()


def resolve_repo_path(value: str) -> str:
    path = Path(value)
    if path.is_absolute():
        return str(path)
    return str((REPO_ROOT / path).resolve())


def parse_args():
    parser = argparse.ArgumentParser(description="Run a few route-intro eval generations.")
    parser.add_argument("--model", required=True, help="Model or adapter path to load.")
    parser.add_argument(
        "--eval-file",
        default="training/route-intro/data/reviewed/route_intro_eval.reviewed.jsonl",
        help="JSONL eval file.",
    )
    parser.add_argument("--limit", type=int, default=5, help="Number of eval examples to print.")
    return parser.parse_args()


def load_jsonl(file_path: str):
    with open(file_path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                yield json.loads(line)


def main():
    args = parse_args()
    model_path = resolve_repo_path(args.model)
    eval_file = resolve_repo_path(args.eval_file)

    tokenizer = AutoTokenizer.from_pretrained(model_path, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype="auto",
        device_map="auto",
    )

    rows = list(load_jsonl(eval_file))[: max(1, args.limit)]
    for index, row in enumerate(rows, start=1):
        messages = row["messages"][:-1]
        expected = row["messages"][-1]["content"]
        prompt = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        ) if getattr(tokenizer, "chat_template", None) else "\n\n".join(
            f"{msg['role'].upper()}:\n{msg['content']}" for msg in messages
        )

        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        outputs = model.generate(
            **inputs,
            max_new_tokens=160,
            do_sample=False,
            temperature=1.0,
        )
        generated = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()

        print(f"\n=== Example {index} ===")
        print("Prompt JSON:")
        print(messages[-1]["content"])
        print("\nExpected:")
        print(expected)
        print("\nGenerated:")
        print(generated)


if __name__ == "__main__":
    main()
