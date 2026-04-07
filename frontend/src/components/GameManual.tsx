import { useState } from 'react'
import './Manual.css'

const sections = [
  {
    id: 'overview',
    title: 'What is Whale-Opoly?',
    content: `Whale-Opoly is an on-chain Monopoly-style board game built on Starknet.
Players stake real ETH to join, roll dice, buy ocean-themed properties, build houses,
and compete to be the last player standing. The winner takes the majority of the prize pool.

All game actions (dice rolls, purchases, trades) are recorded on the blockchain via
the Dojo game engine, ensuring fair and transparent gameplay.`
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: `**1. Connect Your Wallet**
Click "Connect Wallet" in the top-right corner. Whale-Opoly uses the Cartridge Controller
— sign up with Google, Discord, or a passkey. Your session is saved, so you won't need
to sign every action.

**2. Create or Join a Lobby**
Go to the Lobby section. Either create a new game (pick entry tier and max players) or
join an existing lobby. Entry tiers:
• Bronze — 0.01 ETH
• Silver — 0.1 ETH
• Gold — 1 ETH
• Platinum — 10 ETH

**3. Start the Game**
Once 2-6 players have joined, the host clicks "Start." All players begin at the START
tile with $1,500 in game currency.`
  },
  {
    id: 'gameplay',
    title: 'How to Play',
    content: `**Your Turn**
1. Click "ROLL" — dice are rolled on-chain and your token moves automatically
2. Resolve where you land (see below)
3. Take optional actions (build, mortgage, trade)
4. Click "End Turn" — the next player goes

**Landing on Tiles**
• **Unowned Property** — You can buy it at the listed price
• **Owned Property** — You pay rent to the owner (higher with houses/hotels)
• **Chance / Chest** — Draw a card with a random effect (gain/lose money, move, etc.)
• **Tax** — Pay $100 to the bank
• **Go to Jail** — Sent directly to Jail for up to 3 turns
• **Start (GO)** — Collect $200 each time you pass
• **Free Stop** — Nothing happens, safe harbor
• **Jail / Visiting** — Just visiting (unless you're sent here)`
  },
  {
    id: 'properties',
    title: 'Properties & Building',
    content: `**Buying Properties**
When you land on an unowned property, rail, or utility, you can buy it.
Properties belong to 8 color groups with 2-3 properties each.

**Color Groups & Prices**
• Reef Row, Coral Cove (light blue) — $60 each
• Kelp Keys, Tide Terrace, Lagoon Lane (green) — $100-$120
• Pearl Plaza, Shell Square, Trident Trail (purple) — $140-$160
• Barnacle Blvd, Seagrass St, Whale Way (gold) — $180-$200
• Anchor Ave, Current Ct, Harpoon Hwy (teal) — $220-$240
• Driftwood Dr, Gull Grove, Marlin Meadows (salmon) — $260-$280
• Siren St, Net Nook, Kraken Knoll (blue) — $300-$320
• Poseidon Pl, Leviathan Lp (dark blue) — $350-$400

**Building Houses**
Own ALL properties in a color group to build houses ($50-$200 each depending
on the group). Each house increases rent dramatically. Build up to 4 houses,
then upgrade to a hotel (level 5).

**Rent Multipliers**
No houses: 1x base rent | 1 house: 5x | 2: 15x | 3: 45x | 4: 62x | Hotel: 75x

**Rails & Utilities**
• 4 Rails ($200 each) — Rent scales by how many you own: $25 / $50 / $100 / $200
• 2 Utilities ($150 each) — Rent is 4x dice roll (10x if you own both)`
  },
  {
    id: 'jail',
    title: 'Jail',
    content: `**Going to Jail**
You're sent to Jail if you:
• Land on the "Go to Jail" tile (position 30)
• Draw a "Go to Jail" card

**While in Jail**
• You cannot move or roll dice
• Jail lasts up to 3 turns
• You still collect rent on properties you own

**Getting Out**
• **Pay Bail** — $50 to get out immediately (click "Pay Bail")
• **Use a Jail Pass** — If you have a "Get Out of Jail Free" card
• **Serve Time** — After 3 turns you're automatically released (bail forced if you can afford it)`
  },
  {
    id: 'trading',
    title: 'Trading',
    content: `**How to Trade**
Click "Trade" during your turn to open the trade dialog. Select:
1. Which player to trade with
2. Which of your properties to offer
3. Your asking price

The trade executes immediately on-chain via the property_management contract.

**Strategy Tips**
• Trade to complete color groups — that's when you can build houses
• Properties are worth more than their purchase price if they complete a set
• Don't trade away properties that would give opponents a monopoly`
  },
  {
    id: 'bankruptcy',
    title: 'Bankruptcy & Winning',
    content: `**Bankruptcy**
If your balance drops below $0 after paying rent or tax, you're bankrupt:
• You're eliminated from the game
• All your properties return to unowned
• All your houses are removed

**Winning**
The last player standing wins! When only one player remains:
• The game ends automatically
• Prize pool is distributed on-chain:

| Place | Share |
|-------|-------|
| Winner | 60% |
| Runner-up | 25% |
| Third place | 10% |
| Platform fee | 3% |
| Insurance fund | 2% |

**Mortgage to Survive**
Before going bankrupt, try mortgaging properties for 50% of their value.
Unmortgage later for 55% (includes 10% interest). Mortgaged properties
don't collect rent.`
  },
  {
    id: 'cards',
    title: 'Chance & Chest Cards',
    content: `**Chance Cards (12 cards)**
• Advance to Start — Collect $200
• Bank error in your favor — Collect $75
• Pay fine — Pay $50
• Speeding fine — Pay $15
• Go to Jail — Go directly to Jail
• Get Out of Jail Free — Keep until needed
• Advance 3 tiles / Go Back 2 tiles
• Nearest Rail — Move and pay rent
• Nearest Utility — Move and pay rent
• Repairs — Pay $25/house, $100/hotel
• Collect $10 from each player

**Chest Cards (12 cards)**
• Consulting fee — Collect $25
• Doctor/Hospital fees — Pay $50-$100
• Tax refund — Collect $20
• Get Out of Jail Free — Keep until needed
• Advance to Start — Collect $200
• Birthday — Collect $10 from each player
• School fees — Pay $50
• You inherit — Collect $100
• Charity donation — Pay $20
• Repair assets — Pay $40/house, $115/hotel
• Move forward 1 tile`
  },
  {
    id: 'onchain',
    title: 'On-Chain Features',
    content: `**What's on the blockchain?**
Every game action is a Starknet transaction:
• Creating and joining lobbies
• Rolling dice (randomness from block data)
• Buying properties and paying rent
• Building houses and mortgaging
• Trading between players
• Game start and end with prize distribution

**Cartridge Controller**
Your wallet is managed by Cartridge's embedded account. Session keys
mean you don't need to approve every action — just connect once and play.

**Dojo Engine**
The game logic runs as Dojo smart contracts with models stored in the
Torii indexer for real-time state sync between players.

**Tiers & Staking**
Different entry tiers exist for different risk appetites. All entry
fees go to the treasury and are distributed as prizes when the game ends.

**AFK Protection**
If a player goes AFK, any other player can force-skip their turn after
the 5-minute timeout expires. This prevents games from being stalled.`
  },
]

export function GameManual() {
  const [activeSection, setActiveSection] = useState('overview')

  return (
    <div className="manual">
      <div className="manual-nav">
        {sections.map(s => (
          <button
            key={s.id}
            className={`manual-nav-item ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="manual-content">
        {sections.filter(s => s.id === activeSection).map(s => (
          <div key={s.id} className="manual-section">
            <h2 className="manual-title">{s.title}</h2>
            <div className="manual-body">
              {s.content.split('\n').map((line, i) => {
                const trimmed = line.trim()
                if (!trimmed) return <br key={i} />

                // Table rendering
                if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                  const cells = trimmed.split('|').filter(Boolean).map(c => c.trim())
                  if (trimmed.includes('---')) return null
                  const isHeader = i > 0 && sections.find(sec => sec.id === activeSection)?.content.split('\n')[i + 1]?.includes('---')
                  return (
                    <div key={i} className={`manual-table-row ${isHeader ? 'header' : ''}`}>
                      {cells.map((cell, j) => (
                        <span key={j} className="manual-table-cell">{cell}</span>
                      ))}
                    </div>
                  )
                }

                // Bold headers
                if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                  return <h3 key={i} className="manual-subtitle">{trimmed.replace(/\*\*/g, '')}</h3>
                }

                // Bold start
                if (trimmed.startsWith('**')) {
                  const parts = trimmed.split('**')
                  return (
                    <p key={i} className="manual-para">
                      {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                    </p>
                  )
                }

                // Bullet points
                if (trimmed.startsWith('\u2022')) {
                  return <div key={i} className="manual-bullet">{trimmed}</div>
                }

                // Numbered items
                if (/^\d+\./.test(trimmed)) {
                  return <div key={i} className="manual-step">{trimmed}</div>
                }

                return <p key={i} className="manual-para">{trimmed}</p>
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
