# 🐋 Whale-opoly Deployment Guide

## Overview
Whale-opoly is a comprehensive Web3 Monopoly game built on Starknet using the Dojo Engine. This guide covers deployment to both local and testnet environments.

## ✅ Current Implementation Status

### Successfully Implemented Systems
- ✅ **Game Manager** - Core game state management, player joining, game lifecycle
- ✅ **Board Actions** - Player movement, dice rolling, property interactions  
- ✅ **Property Management** - Property ownership, transfers, auctions
- ✅ **Treasury** - Multi-signature wallet, fund management, security
- ✅ **Random Engine** - Advanced 578-line system with commit-reveal schemes
- ✅ **Security Simple** - Basic security monitoring and validation

### Build Status
```bash
✅ Compilation: SUCCESSFUL
✅ Contract Artifacts: 55 generated
✅ Models: 16 (game state, players, properties, etc.)
✅ Events: 24 (transactions, alerts, game events)
✅ Cairo Version: 2.10.1 compatible
```

## 🚀 Deployment Options

### Option 1: Sepolia Testnet (Recommended)

#### Prerequisites
1. **Starknet Wallet**: Install Argent X or Braavos
2. **Sepolia ETH**: Get testnet funds from https://starknet-faucet.vercel.app/
3. **Account Setup**: Export your account address and private key

#### Configuration
Update `dojo_dev.toml`:
```toml
[env]
rpc_url = "https://api.cartridge.gg/x/starknet/sepolia"
account_address = "YOUR_SEPOLIA_ACCOUNT_ADDRESS"
private_key = "YOUR_SEPOLIA_PRIVATE_KEY"
```

#### Deploy Command
```bash
cd contracts
sozo build
sozo migrate --namespaces whale_opoly
```

### Option 2: Local Development

#### Prerequisites
```bash
# Ensure Dojo is installed
dojo --version

# Start local node
katana --dev --dev.no-fee
```

#### Configuration
Update `dojo_dev.toml`:
```toml
[env]
rpc_url = "http://localhost:5050/"
account_address = "0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec"
private_key = "0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912"
```

## 🎮 Game Features

### Core Gameplay
- **Multi-player Support**: Up to 8 players per game
- **Property Trading**: Buy, sell, and auction properties
- **Random Events**: Secure dice rolling and card drawing
- **Financial Management**: Advanced treasury with multi-sig security

### Advanced Features
- **Commit-Reveal Randomness**: Prevents manipulation
- **Security Monitoring**: Real-time fraud detection
- **Event-Driven Architecture**: Real-time game state updates
- **Modular Design**: Easy to extend with new features

## 📊 Contract Interfaces

### Game Manager
```cairo
trait IGameManager {
    fn create_game(ref self, max_players: u8) -> u64;
    fn join_game(ref self, game_id: u64);
    fn start_game(ref self, game_id: u64);
    fn end_game(ref self, game_id: u64);
}
```

### Board Actions
```cairo
trait IBoardActions {
    fn roll_dice(ref self, game_id: u64) -> (u8, u8);
    fn move_player(ref self, game_id: u64, spaces: u8);
    fn purchase_property(ref self, game_id: u64, property_id: u32);
}
```

### Random Engine
```cairo
trait IRandomEngine {
    fn commit_randomness(ref self, game_id: u64, commitment: felt252);
    fn reveal_randomness(ref self, game_id: u64, nonce: u64, salt: felt252);
    fn generate_dice_roll(ref self, game_id: u64) -> (u8, u8);
}
```

## 🔧 Development Tools

### Build Commands
```bash
# Compile contracts
sozo build

# Run tests (when available)
sozo test

# Check contract sizes
ls -la target/dev/*.json | wc -l
```

### Verification Commands
```bash
# Check RPC connectivity
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"starknet_chainId","params":[],"id":1}' \
  https://api.cartridge.gg/x/starknet/sepolia

# Verify contract compilation
find target/dev -name "whale_opoly_*.json" | head -10
```

## 📈 Next Steps

### Phase 1: Deployment
1. Set up Sepolia testnet account
2. Fund account with testnet ETH
3. Deploy contracts using sozo migrate
4. Verify deployment success

### Phase 2: Frontend Integration
1. Create React/Next.js frontend
2. Integrate with Starknet.js
3. Build game interface
4. Add wallet connection

### Phase 3: Enhanced Features
1. Enable advanced systems (economics, market events)
2. Add more game mechanics
3. Implement leaderboards
4. Add NFT integration

### Phase 4: Production
1. Security audit
2. Mainnet deployment
3. Launch marketing
4. Community building

## 🛠 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf target/
sozo build
```

#### Connection Issues
```bash
# Test RPC connectivity
curl http://localhost:5050/health

# Check Katana logs
katana --dev --dev.no-fee --verbose
```

#### Migration Failures
```bash
# Use environment variables
STARKNET_RPC_URL="http://localhost:5050" \
DOJO_ACCOUNT_ADDRESS="0x..." \
DOJO_PRIVATE_KEY="0x..." \
sozo migrate --namespaces whale_opoly
```

## 📞 Support

- **Documentation**: https://dojoengine.org
- **GitHub**: https://github.com/Antismart/whale-opoly
- **Discord**: Dojo Engine Community

---

**Status**: ✅ Ready for deployment to Sepolia testnet
**Last Updated**: August 3, 2025
