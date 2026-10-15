#!/usr/bin/env bash
set -euo pipefail
# Local-only scaffold. Cloned program and mint alone are insufficient for ORE E2E.
command -v solana-test-validator >/dev/null || { echo "solana-test-validator missing" >&2; exit 1; }
LEDGER_DIR="${LEDGER_DIR:-.anchor/test-ledger}"
RPC_URL="${UPSTREAM_RPC_URL:-https://api.mainnet-beta.solana.com}"
ORE_PROGRAM_ID="mineRHF5r6S7HyD9SppBfVMXMavDkJsxwGesEvxZr2A"
ORE_MINT="oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp"
if [[ "${CONFIRM_RESET:-}" != "YES" ]]; then echo "Set CONFIRM_RESET=YES to reset local ledger ${LEDGER_DIR}" >&2; exit 1; fi
echo "Warning: Board, Config, Round, Treasury, Automation and Entropy state are NOT provisioned."
exec solana-test-validator --ledger "${LEDGER_DIR}" --reset --url "${RPC_URL}" \
  --clone-upgradeable-program "${ORE_PROGRAM_ID}" --clone "${ORE_MINT}" \
  --rpc-port 8899 --faucet-port 9900
