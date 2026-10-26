#!/bin/sh
# Emits a fresh OAuth bearer header for Google's MCP endpoints.
# Stopgap while the platform has no registered OAuth client: uses gcloud ADC.
cat >/dev/null
exec 2>/dev/null
TOKEN=$(gcloud auth print-access-token 2>/dev/null)
[ -n "$TOKEN" ] || { echo '{}'; exit 0; }
printf '{"Authorization":"Bearer %s"}' "$TOKEN"
