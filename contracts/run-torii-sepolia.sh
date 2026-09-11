#!/usr/bin/env bash
#
# Local Torii indexer for the Whaleopoly world on Starknet Sepolia.
#
# WHY THIS EXISTS
#   Cartridge Slot deployments were discontinued — the hosted endpoint
#   (https://api.cartridge.gg/x/whaleopoly/torii) now returns 410 Gone and
#   `slot deployments create` is refused server-side. The contracts are
#   untouched on Sepolia; only the indexer in front of them had to move here.
#
# USAGE
#   ./run-torii-sepolia.sh
#   Then point the frontend at it:  VITE_TORII_URL=http://localhost:8080
#
# REQUIREMENTS
#   torii 1.8.x   (asdf plugin add torii https://github.com/dojoengine/asdf-torii.git
#                  && asdf install torii 1.8.16 && asdf set --home torii 1.8.16)
#   Contracts are Dojo 1.8.0 and the JS client is @dojoengine/torii-client 1.8.2,
#   so stay on the 1.8 line — a newer Torii can serve a gRPC schema the client
#   cannot read, which fails in a much more confusing way than a clean error.

set -euo pipefail

cd "$(dirname "$0")"

WORLD="${WORLD_ADDRESS:-0x0383a3e99dbe9407adac729ec343a84d8c291e04103eb5f3504fbe89afa76608}"
RPC="${STARKNET_RPC:-https://api.cartridge.gg/x/starknet/sepolia}"
PORT="${TORII_PORT:-8080}"

# The world was deployed at this block. Without it Torii scans from genesis —
# 8.3M blocks of empty history over a public RPC, during which the app sees
# nothing and looks broken.
WORLD_BLOCK="${WORLD_BLOCK:-8365014}"

TORII_BIN="${TORII_BIN:-$(command -v torii || echo "$HOME/.asdf/installs/torii/1.8.16/bin/torii")}"

if [ ! -x "$TORII_BIN" ]; then
  echo "torii not found. Install it with:" >&2
  echo "  asdf plugin add torii https://github.com/dojoengine/asdf-torii.git" >&2
  echo "  asdf install torii 1.8.16 && asdf set --home torii 1.8.16" >&2
  exit 1
fi

echo "torii      $("$TORII_BIN" --version)"
echo "world      $WORLD"
echo "rpc        $RPC"
echo "from block $WORLD_BLOCK"
echo "db         $(pwd)/.torii-sepolia   (delete to force a full re-index)"
echo "serving    http://localhost:$PORT"
echo

# Conservative resource settings. Torii's defaults allocate threads and batch
# sizes adaptively, which on a machine under memory pressure is enough to get
# it OOM-killed mid-catch-up. These cost indexing speed and buy stability;
# raise them if the machine has headroom.
exec "$TORII_BIN" \
  --world "$WORLD" \
  --rpc "$RPC" \
  --db-dir ./.torii-sepolia \
  --indexing.world_block "$WORLD_BLOCK" \
  --indexing.blocks_chunk_size 200 \
  --indexing.events_chunk_size 256 \
  --indexing.max_concurrent_tasks 2 \
  --runner.indexer_threads 2 \
  --runner.query_threads 2 \
  --http.addr 127.0.0.1 \
  --http.port "$PORT" \
  --http.cors_origins "*"
