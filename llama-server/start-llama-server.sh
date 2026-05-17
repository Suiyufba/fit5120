#!/usr/bin/env sh
set -eu

if [ ! -f "${LLAMA_MODEL_PATH}" ]; then
  echo "Model file not found at ${LLAMA_MODEL_PATH}" >&2
  echo "Mount or bake your GGUF model there before starting the service." >&2
  exit 1
fi

exec /llama-server \
  --model "${LLAMA_MODEL_PATH}" \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --ctx-size "${LLAMA_CTX_SIZE}" \
  --threads "${LLAMA_THREADS}" \
  --parallel "${LLAMA_PARALLEL}" \
  --batch-size "${LLAMA_BATCH}" \
  --ubatch-size "${LLAMA_UBATCH}"
