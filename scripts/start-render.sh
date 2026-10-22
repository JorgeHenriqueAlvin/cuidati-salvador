#!/bin/sh
set -eu
# Render fornece a URL pública. APP_ORIGIN explícita permite usar domínio próprio.
export APP_ORIGIN="${APP_ORIGIN:-${RENDER_EXTERNAL_URL:?RENDER_EXTERNAL_URL nao definida}}"
exec node server/index.js
