FROM ghcr.io/ggml-org/llama.cpp:server

WORKDIR /app

COPY start-llama-server.sh /app/start-llama-server.sh
RUN chmod +x /app/start-llama-server.sh

ENV PORT=8080
ENV LLAMA_MODEL_PATH=/models/qwen-route-intro-q4_k_m.gguf
ENV LLAMA_CTX_SIZE=4096
ENV LLAMA_THREADS=4
ENV LLAMA_PARALLEL=1
ENV LLAMA_BATCH=512
ENV LLAMA_UBATCH=512

EXPOSE 8080

ENTRYPOINT ["/app/start-llama-server.sh"]
