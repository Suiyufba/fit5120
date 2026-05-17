# llama-server

Railway-ready `llama.cpp` server for the HikeShield route-intro GGUF model.

This service is scaffolded in the repo only. It is not wired into the website,
backend, or `ai-service` yet.

## Recommended Architecture

- Deploy this folder as a separate Railway service.
- Mount your `qwen-route-intro-q4_k_m.gguf` model to `/models/`.
- Call the service from `ai-service` or the backend.

## Required Env Vars

```env
PORT=8080
LLAMA_MODEL_PATH=/models/qwen-route-intro-q4_k_m.gguf
LLAMA_CTX_SIZE=4096
LLAMA_THREADS=4
LLAMA_PARALLEL=1
LLAMA_BATCH=512
LLAMA_UBATCH=512
```

## Local Run

If you have Docker available and your GGUF at `/absolute/path/to/qwen-route-intro-q4_k_m.gguf`:

```bash
docker build -t hikeshield-llama-server ./llama-server
docker run --rm -p 8080:8080 \
  -e LLAMA_MODEL_PATH=/models/qwen-route-intro-q4_k_m.gguf \
  -v /absolute/path/to:/models \
  hikeshield-llama-server
```

## API Request

Use the completion endpoint with the exact raw prompt that worked in `llama-cli`:

```json
See `example-request.json`.
```

Typical endpoint:

```text
POST /completion
```

## Railway Notes

- Start by mounting the GGUF via a Railway volume at `/models`.
- Once the runtime works, you can decide whether to bake the model into the
  image instead.
