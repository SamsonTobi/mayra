# Mayra Orchestrator — Modal Cloud Image (Path A)
#
# Alternative to the modal.Image fluent API in modal_app.py.
# Can be used with modal.Image.from_dockerfile("apps/orchestrator/Dockerfile").
#
# Contents: Python 3.12 + Chromium (headless) + agent-browser Rust binary + Python deps.

FROM python:3.12-slim

# System deps: Chromium for headless browsing, Node only for extracting agent-browser binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    nodejs \
    npm \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Extract the agent-browser Rust binary from the npm package (no Node runtime needed at runtime)
RUN npm install -g agent-browser \
    && cp "$(npm root -g)/agent-browser/bin/agent-browser-linux-x64" /usr/local/bin/agent-browser \
    && chmod +x /usr/local/bin/agent-browser \
    && npm uninstall -g agent-browser \
    && apt-get purge -y --auto-remove nodejs npm

# Python dependencies
RUN pip install --no-cache-dir \
    "fastapi>=0.115" \
    "uvicorn[standard]>=0.32" \
    "pydantic>=2.9" \
    "pydantic-settings>=2.6" \
    "httpx>=0.27" \
    "aiolimiter>=1.1" \
    "pillow>=12.2.0" \
    "websockets>=16.0"

# Copy orchestrator + contracts source
COPY apps/orchestrator /app/orchestrator
COPY packages/contracts/python /app/contracts-python

RUN pip install --no-cache-dir /app/contracts-python \
    && pip install --no-cache-dir -e /app/orchestrator

# Cloud-mode environment
ENV MAYRA_MODE=cloud \
    MAYRA_AUTH_MODE=password \
    MAYRA_CHROMIUM_LAUNCH_MODE=managed \
    MAYRA_HOST=0.0.0.0 \
    MAYRA_ALLOWED_HOSTS="*" \
    AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium \
    MAYRA_AGENT_BROWSER_BIN=/usr/local/bin/agent-browser \
    MAYRA_DATA_DIR=/tmp/mayra-data \
    MAYRA_SCREENSHOT_DIR=/volumes/screenshots

EXPOSE 8000
