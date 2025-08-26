#!/usr/bin/env bash

# Purpose: Load env vars from .env.sepolia and deploy using sozo with the sepolia profile.
# Notes:
# - Supports env files with or without leading `export`.
# - Restores prior environment on exit and unsets variables we introduced.
# - Does NOT commit or expose secrets; keep .env.sepolia out of git.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.sepolia"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file $ENV_FILE not found!" >&2
  exit 1
fi

echo "Loading environment variables from $ENV_FILE..."

# Save prior values (if any) so we can restore them
_PREV_STARKNET_RPC_URL=${STARKNET_RPC_URL-}
_PREV_DOJO_ACCOUNT_ADDRESS=${DOJO_ACCOUNT_ADDRESS-}
_PREV_DOJO_PRIVATE_KEY=${DOJO_PRIVATE_KEY-}

# Export all vars defined by the env file; support lines with or without 'export '
set -a
source "$ENV_FILE"
set +a

# Basic sanity check
if [[ -z "${STARKNET_RPC_URL:-}" || -z "${DOJO_ACCOUNT_ADDRESS:-}" || -z "${DOJO_PRIVATE_KEY:-}" ]]; then
  echo "Missing one or more required env vars (STARKNET_RPC_URL, DOJO_ACCOUNT_ADDRESS, DOJO_PRIVATE_KEY)." >&2
  exit 1
fi

cleanup_env() {
  echo "Cleaning up environment variables..."
  # Restore prior values or unset if they were empty before
  if [[ -n "${_PREV_STARKNET_RPC_URL}" ]]; then export STARKNET_RPC_URL="${_PREV_STARKNET_RPC_URL}"; else unset STARKNET_RPC_URL || true; fi
  if [[ -n "${_PREV_DOJO_ACCOUNT_ADDRESS}" ]]; then export DOJO_ACCOUNT_ADDRESS="${_PREV_DOJO_ACCOUNT_ADDRESS}"; else unset DOJO_ACCOUNT_ADDRESS || true; fi
  if [[ -n "${_PREV_DOJO_PRIVATE_KEY}" ]]; then export DOJO_PRIVATE_KEY="${_PREV_DOJO_PRIVATE_KEY}"; else unset DOJO_PRIVATE_KEY || true; fi
  echo "Environment variables restored."
}

trap cleanup_env EXIT

echo "Building the project (profile: sepolia)..."
sozo -P sepolia build

echo "Deploying to Sepolia..."
sozo -P sepolia migrate

echo "Deployment completed successfully."
