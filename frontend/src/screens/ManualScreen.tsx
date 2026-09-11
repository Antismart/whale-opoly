/**
 * ManualScreen — the in-app rulebook ("Abyssal Protocol").
 *
 * Two-pane docs layout: a sticky 240px table of contents with a scroll-progress
 * rail and a text filter on the left, long-form rules capped at 720px on the right.
 *
 * Every number in this file was checked against the live implementation in
 * src/App.tsx and contracts/src/systems/*.cairo. Presentation only — this screen
 * holds no game state and calls no contract.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './manual.css'

/* ------------------------------------------------------------------
   Content model
   ------------------------------------------------------------------ */

/**
 * Inline markup inside every `text` string below:
 *   **bold**   → <strong>
 *   `chip`     → tabular-nums value chip, e.g. `$200`, `0.1 ETH`
 */
type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'note'; tone: 'info' | 'cost'; title: string; text: string }
  | { kind: 'table'; head: [string, string]; rows: [string, string][]; swatches?: string[] }
  | { kind: 'diagram' }

type ManualSection = {
  id: string
  title: string
  /** One line under the section title, also searchable. */
  summary: string
  blocks: Block[]
}

const SECTIONS: ManualSection[] = [
  {
    id: 'overview',
    title: 'What is Whaleopoly?',
    summary: 'What you stake, what you play with, and what the chain is actually doing.',
    blocks: [
      {
        kind: 'p',
        text:
          'Whaleopoly is an on-chain, Monopoly-style board game running on **Starknet Sepolia**. ' +
          'Two to six players take a seat at a table, stake ETH to enter, and play a full 40-tile ' +
          'ocean board — roll, move, buy properties, collect rent, and try to be the last player ' +
          'left solvent.',
      },
      { kind: 'h3', text: 'Two currencies, one rule' },
      {
        kind: 'note',
        tone: 'info',
        title: 'Read this once and never be confused again',
        text:
          'ETH is used for exactly two things: the entry stake you pay for a seat, and the pot those ' +
          'stakes go into. Everything that happens **on the board** is in game dollars. You start with ' +
          '`$1,500`, properties cost `$60` to `$400`, and rent, taxes, bail and mortgages are all dollars. ' +
          'No amount printed on a tile is ever ETH.',
      },
      { kind: 'h3', text: 'What the chain does' },
      {
        kind: 'ul',
        items: [
          'Creating, joining, starting and cancelling a table are Starknet transactions.',
          'Rolls, purchases, rent, building, mortgaging and trades are submitted to the Dojo game contracts.',
          'The pot is held on-chain and settled by the contract when the table ends.',
          'State is read back through the Torii indexer, so every player sees the same board.',
        ],
      },
      {
        kind: 'p',
        text:
          'The board itself is ocean-themed and entirely original — 22 properties across eight colour ' +
          'groups, four rails and two utilities, from Reef Row to Leviathan Lp.',
      },
    ],
  },

  {
    id: 'getting-started',
    title: 'Getting Started',
    summary: 'Connect a wallet, take a seat at a table, and start the game.',
    blocks: [
      { kind: 'h3', text: '1. Connect your wallet' },
      {
        kind: 'p',
        text:
          'Use **Connect Wallet** in the top bar. Whaleopoly accounts are handled by the Cartridge ' +
          'Controller, so you can create one with a passkey or a social login instead of installing a ' +
          'browser extension. You approve transactions from the Controller as you play.',
      },
      { kind: 'h3', text: '2. Create or join a table' },
      {
        kind: 'p',
        text:
          'Open the Lobby. Either create a table — choosing an entry tier and how many seats it has — or ' +
          'join a table someone else has opened. A table seats **2 to 6 players**.',
      },
      {
        kind: 'table',
        head: ['Entry tier', 'Stake per seat'],
        rows: [
          ['Bronze', '0.01 ETH'],
          ['Silver', '0.1 ETH'],
          ['Gold', '1 ETH'],
          ['Platinum', '10 ETH'],
        ],
      },
      {
        kind: 'p',
        text:
          'Those four tiers are the only ones. Your stake is the one number in the whole game that is ' +
          'denominated in ETH; every seat at a table stakes the same amount, and together they make the pot.',
      },
      { kind: 'h3', text: '3. Start the game' },
      {
        kind: 'p',
        text:
          'The host starts the table once at least two seats are filled — a table never starts by itself, ' +
          'however full it is. Before it starts, the host can cancel it. Every player begins on **Start** ' +
          'with `$1,500` in game dollars.',
      },
      {
        kind: 'note',
        tone: 'info',
        title: 'This is a testnet',
        text:
          'Whaleopoly is deployed to Starknet Sepolia. The ETH you stake is testnet ETH, and nothing here ' +
          'touches mainnet.',
      },
    ],
  },

  {
    id: 'gameplay',
    title: 'How to Play',
    summary: 'The turn loop, doubles, and what happens on every kind of tile.',
    blocks: [
      { kind: 'h3', text: 'Your turn' },
      { kind: 'diagram' },
      {
        kind: 'ol',
        items: [
          '**Roll** — two dice are rolled and your token moves that many tiles around the board.',
          '**Resolve the tile** you land on — buy it, pay rent, draw a card, or pay tax.',
          '**Build or trade** — optional, and only ever on your own turn.',
          '**End turn** — play passes to the next player.',
        ],
      },
      {
        kind: 'note',
        tone: 'info',
        title: 'Turn order is enforced',
        text:
          'Only the player whose turn it is can roll, buy, build, mortgage or trade. Actions taken out of ' +
          'turn are refused before they ever reach the contract.',
      },
      { kind: 'h3', text: 'Doubles' },
      {
        kind: 'ul',
        items: [
          'Roll a double and you take another turn once the current one is resolved.',
          'Roll doubles **three times in a row** and you go straight to Jail instead of moving.',
          'Rolling a double while in Jail releases you and you move on that roll — but it does not earn you the extra turn.',
        ],
      },
      { kind: 'h3', text: 'Where you can land' },
      {
        kind: 'ul',
        items: [
          '**Start** (tile 0) — collect `$200` every time you pass it or land on it.',
          '**Unowned property, rail or utility** — buy it at the listed price, or send it to auction.',
          '**Owned property** — pay rent to the owner. Rent climbs steeply with houses.',
          '**Chance or Chest** — draw a card from that deck and apply it immediately.',
          '**Income Tax** (tile 4) — pay `$200`.',
          '**Luxury Tax** (tile 38) — pay `$75`.',
          '**Go to Jail** (tile 30) — you are moved straight to Jail.',
          '**Free Stop** (tile 20) — nothing happens. A safe harbour.',
          '**Jail / Just Visiting** (tile 10) — harmless unless you were sent there.',
        ],
      },
      {
        kind: 'note',
        tone: 'cost',
        title: 'Tax is deducted the moment you land',
        text:
          'Income Tax takes `$200` and Luxury Tax takes `$75`, with no option to decline. If either payment ' +
          'pushes your balance below zero, you are bankrupt on the spot.',
      },
    ],
  },

  {
    id: 'properties',
    title: 'Properties & Building',
    summary: 'Prices, colour groups, how rent scales, rails, utilities and mortgages.',
    blocks: [
      { kind: 'h3', text: 'Buying' },
      {
        kind: 'p',
        text:
          'Land on an unowned property, rail or utility and you can buy it at its listed price. The board ' +
          'holds 22 properties in eight colour groups, four rails and two utilities.',
      },
      { kind: 'h3', text: 'The eight colour groups' },
      {
        kind: 'table',
        head: ['Colour group', 'Prices'],
        swatches: [
          'var(--group-1)',
          'var(--group-2)',
          'var(--group-3)',
          'var(--group-4)',
          'var(--group-5)',
          'var(--group-6)',
          'var(--group-7)',
          'var(--group-8)',
        ],
        rows: [
          ['Reef Row, Coral Cove', '$60'],
          ['Kelp Keys, Tide Terrace, Lagoon Lane', '$100 – $120'],
          ['Pearl Plaza, Shell Square, Trident Trail', '$140 – $160'],
          ['Barnacle Blvd, Seagrass St, Whale Way', '$180 – $200'],
          ['Anchor Ave, Current Ct, Harpoon Hwy', '$220 – $240'],
          ['Driftwood Dr, Gull Grove, Marlin Meadows', '$260 – $280'],
          ['Siren St, Net Nook, Kraken Knoll', '$300 – $320'],
          ['Poseidon Pl, Leviathan Lp', '$350 – $400'],
        ],
      },
      { kind: 'h3', text: 'Building houses and hotels' },
      {
        kind: 'p',
        text:
          'You can only build on a colour group you own **completely**. A house costs `$50` in the two ' +
          'cheapest groups and rises to `$200` in the most expensive. Build up to four houses on a ' +
          'property; the fifth build is a hotel, and a hotel costs **double** that group’s house price.',
      },
      { kind: 'h3', text: 'How rent scales' },
      {
        kind: 'p',
        text:
          'Base rent is 10% of the property price, with a floor of `$10`. Every level of development ' +
          'multiplies it:',
      },
      {
        kind: 'table',
        head: ['Development', 'Rent'],
        rows: [
          ['No houses', '1x base'],
          ['1 house', '5x'],
          ['2 houses', '15x'],
          ['3 houses', '45x'],
          ['4 houses', '62x'],
          ['Hotel', '75x'],
        ],
      },
      { kind: 'h3', text: 'Rails and utilities' },
      {
        kind: 'ul',
        items: [
          '**Rails** — four of them, `$200` each. Rent ignores dice and development entirely: it is `$25`, `$50`, `$100` or `$200` depending only on how many rails the owner holds.',
          '**Utilities** — two of them, `$150` each. Rent is 4x the dice roll, or 10x if one player owns both.',
        ],
      },
      { kind: 'h3', text: 'Mortgaging' },
      {
        kind: 'p',
        text:
          'Mortgage a property you own to raise cash: the bank pays you **half its price**. Buying it back ' +
          'costs that half **plus 10% interest** — a `$200` property returns `$100` and costs `$110` to clear.',
      },
      {
        kind: 'note',
        tone: 'cost',
        title: 'A mortgaged property earns nothing',
        text:
          'While a property is mortgaged, anyone who lands on it pays no rent at all. Unmortgage before you ' +
          'start counting on the income.',
      },
    ],
  },

  {
    id: 'jail',
    title: 'Jail',
    summary: 'How you end up inside, what you can still do, and the three ways out.',
    blocks: [
      { kind: 'h3', text: 'How you get sent there' },
      {
        kind: 'ul',
        items: [
          'You land on **Go to Jail** (tile 30).',
          'You draw a **Go to Jail** card from the Chance deck.',
          'You roll doubles **three times in a row**.',
        ],
      },
      { kind: 'h3', text: 'While you are inside' },
      {
        kind: 'ul',
        items: [
          'Your sentence is three turns.',
          'A normal roll does not move you off tile 10.',
          'You still collect rent on everything you own — Jail does not touch your properties.',
        ],
      },
      { kind: 'h3', text: 'Three ways out' },
      {
        kind: 'ul',
        items: [
          '**Roll a double** — you are released and move on that roll. No extra turn is granted.',
          '**Pay bail** — `$50`, and you are out immediately.',
          '**Use a Jail Pass** — the Get Out of Jail Free card from either deck, if you are holding one.',
        ],
      },
      {
        kind: 'note',
        tone: 'cost',
        title: 'Serving the sentence still costs you',
        text:
          'If you are still inside after three turns you are released automatically — and the `$50` bail is ' +
          'taken regardless of what you can afford. If that takes your balance below zero it bankrupts you, ' +
          'exactly like Income Tax. Rolling a double or paying early is strictly better than waiting.',
      },
    ],
  },

  {
    id: 'trading',
    title: 'Trading',
    summary: 'Selling a property to another player, sending one to auction, and what a set is worth.',
    blocks: [
      { kind: 'h3', text: 'Proposing a trade' },
      {
        kind: 'p',
        text:
          'Open **Trade** on your turn. Choose the player, choose one of your properties, and set your ' +
          'asking price in game dollars. The trade is submitted to the property contract: the property ' +
          'moves to them, the dollars move to you.',
      },
      {
        kind: 'note',
        tone: 'info',
        title: 'One property, one price',
        text:
          'The trade dialog sells a single property for a dollar amount. It does not swap property for ' +
          'property, and it does not bundle cash with a deed.',
      },
      { kind: 'h3', text: 'Auctions' },
      {
        kind: 'p',
        text:
          'When you land on an unowned property you can send it to **auction** instead of buying it. ' +
          'Bidding is in game dollars, and the opening bid is the listed price — you can name any amount ' +
          'from there upwards. No other player bids against you, so an auction is really a way to pay ' +
          'over the odds for a deed you want badly enough.',
      },
      { kind: 'h3', text: 'What a property is actually worth' },
      {
        kind: 'ul',
        items: [
          'The deed that completes a colour group is worth far more than its price — a complete set is the only way to build.',
          'Selling into an opponent’s near-complete group hands them the right to build. Price it like it.',
          'A player short of cash may sell below price rather than mortgage. That is often the best deal on the board.',
        ],
      },
    ],
  },

  {
    id: 'bankruptcy',
    title: 'Bankruptcy & Winning',
    summary: 'What happens when you run out of money, and how a table ends.',
    blocks: [
      { kind: 'h3', text: 'Going bankrupt' },
      {
        kind: 'p',
        text:
          'If a payment takes your balance below `$0` you are bankrupt and out of the game immediately. ' +
          'Rent, tax and card penalties are all checked the moment they are applied.',
      },
      {
        kind: 'ul',
        items: [
          'Everything you own transfers to the player you last owed money to.',
          'If there is no such creditor, your properties return to unowned and can be bought again.',
          'All houses and hotels on those properties are cleared.',
        ],
      },
      {
        kind: 'note',
        tone: 'cost',
        title: 'Raise cash before the payment lands',
        text:
          'Mortgaging returns half a property’s price and is the fastest lever you have when your balance ' +
          'is thin. Selling a property through Trade is the other. Neither is available once you are out.',
      },
      { kind: 'h3', text: 'Winning' },
      {
        kind: 'ul',
        items: [
          'The game ends when one player is left standing and everyone else has gone bankrupt.',
          'If the table reaches its 100-turn limit first, the player with the highest balance wins.',
        ],
      },
      {
        kind: 'p',
        text:
          'The winner is written to the game contract, which closes the table and settles the ETH pot ' +
          'on-chain. Game dollars are never paid out — they only decide who wins.',
      },
    ],
  },

  {
    id: 'cards',
    title: 'Chance & Chest Cards',
    summary: 'Both decks in full — twelve Chance cards and twelve Chest cards.',
    blocks: [
      {
        kind: 'p',
        text:
          'Two decks of twelve. Each is shuffled when the table starts and drawn from as players land on ' +
          'its tiles. **Get Out of Jail Free** is kept until you use it; every other card resolves the ' +
          'moment it is drawn.',
      },
      { kind: 'h3', text: 'Chance — 12 cards' },
      {
        kind: 'table',
        head: ['Card', 'Effect'],
        rows: [
          ['Advance to Start', 'Move to Start, collect $200'],
          ['Bank error', 'Collect $75'],
          ['Pay fine', 'Pay $50'],
          ['Speeding fine', 'Pay $15'],
          ['Go to Jail', 'Straight to Jail'],
          ['Get Out of Jail Free', 'Keep until needed'],
          ['Advance 3', 'Move forward 3 tiles'],
          ['Go Back 2', 'Move back 2 tiles'],
          ['Nearest Rail', 'Move to the nearest rail'],
          ['Nearest Utility', 'Move to the nearest utility'],
          ['Repairs', 'Pay $25 per house, $100 per hotel'],
          ['Collect from each', 'Collect $10 from every other player'],
        ],
      },
      { kind: 'h3', text: 'Chest — 12 cards' },
      {
        kind: 'table',
        head: ['Card', 'Effect'],
        rows: [
          ['Consulting fee', 'Collect $25'],
          ['Doctor fee', 'Pay $50'],
          ['Tax refund', 'Collect $20'],
          ['Get Out of Jail Free', 'Keep until needed'],
          ['Advance to Start', 'Move to Start, collect $200'],
          ['Birthday', 'Collect $10 from every other player'],
          ['School fees', 'Pay $50'],
          ['Hospital fees', 'Pay $100'],
          ['You inherit', 'Collect $100'],
          ['Charity donation', 'Pay $20'],
          ['Repair assets', 'Pay $40 per house, $115 per hotel'],
          ['Move forward 1', 'Advance 1 tile'],
        ],
      },
      {
        kind: 'note',
        tone: 'info',
        title: 'The "nearest" cards move you, they do not charge you',
        text:
          'Nearest Rail and Nearest Utility relocate your token to the next one ahead of you. Arriving that ' +
          'way does not trigger a rent payment.',
      },
    ],
  },

  {
    id: 'onchain',
    title: 'On-Chain Features',
    summary: 'The network, the wallet, the indexer, and the five-minute turn deadline.',
    blocks: [
      { kind: 'h3', text: 'Network' },
      {
        kind: 'p',
        text:
          'Whaleopoly runs on **Starknet Sepolia**, Starknet’s public testnet. Game logic is a set of ' +
          'Dojo contracts — game manager, board actions and property management — deployed to that network.',
      },
      { kind: 'h3', text: 'What is written on-chain' },
      {
        kind: 'ul',
        items: [
          'Creating, joining, starting and cancelling a table.',
          'Rolling the dice and moving your token.',
          'Buying a property and paying rent.',
          'Building houses and hotels, mortgaging and unmortgaging.',
          'Trades between players.',
          'Ending the game and settling the pot.',
        ],
      },
      { kind: 'h3', text: 'Your wallet' },
      {
        kind: 'p',
        text:
          'Accounts run through the Cartridge Controller. Connect once from the top bar and disconnect from ' +
          'the same control. Whaleopoly never holds your keys.',
      },
      { kind: 'h3', text: 'Reading the table' },
      {
        kind: 'p',
        text:
          'Game state lives in Dojo models and is read back through the Torii indexer, which is why every ' +
          'player at a table sees the same board without passing anything between browsers.',
      },
      { kind: 'h3', text: 'Players who stall' },
      {
        kind: 'p',
        text:
          'Every turn carries a five-minute deadline on-chain. Once it expires, any other player at the ' +
          'table can force-skip whoever has stalled and play continues. A table cannot be held hostage by ' +
          'someone who has walked away.',
      },
      {
        kind: 'note',
        tone: 'info',
        title: 'Scope',
        text:
          'Whaleopoly is a game contract and a front end, and nothing more. There is no zero-knowledge ' +
          'proving, no gasless play, no tournaments or seasons, and no stored match history — the chain ' +
          'holds the tables that exist right now.',
      },
    ],
  },
]

/* ------------------------------------------------------------------
   Inline markup
   ------------------------------------------------------------------ */

const INLINE_SPLIT = /(\*\*[^*]+\*\*|`[^`]+`)/

function renderInline(text: string): ReactNode[] {
  return text
    .split(INLINE_SPLIT)
    .filter(chunk => chunk.length > 0)
    .map((chunk, i) => {
      if (chunk.length > 4 && chunk.startsWith('**') && chunk.endsWith('**')) {
        return <strong key={i}>{chunk.slice(2, -2)}</strong>
      }
      if (chunk.length > 2 && chunk.startsWith('`') && chunk.endsWith('`')) {
        return (
          <code key={i} className="mn-code num">
            {chunk.slice(1, -1)}
          </code>
        )
      }
      return <span key={i}>{chunk}</span>
    })
}

function stripInline(text: string): string {
  return text.replace(/[*`]/g, '')
}

function blockText(block: Block): string {
  switch (block.kind) {
    case 'p':
    case 'h3':
      return block.text
    case 'ul':
    case 'ol':
      return block.items.join(' ')
    case 'note':
      return `${block.title} ${block.text}`
    case 'table':
      return [...block.head, ...block.rows.flat()].join(' ')
    case 'diagram':
      return 'turn loop roll move resolve tile build trade end turn'
  }
}

function searchIndexFor(section: ManualSection): string {
  return stripInline(
    [section.title, section.summary, ...section.blocks.map(blockText)].join(' '),
  ).toLowerCase()
}

/* ------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------ */

function IconSearch() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="m10.2 10.2 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IconBack() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M9.5 3.5 5 8l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="4.9" r="0.85" fill="currentColor" />
    </svg>
  )
}

function IconCost() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <path
        d="M8 2.4 14.2 13H1.8L8 2.4Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 6.4v3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="0.85" fill="currentColor" />
    </svg>
  )
}

function IconDice() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="2.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.7" cy="5.7" r="1.05" fill="currentColor" />
      <circle cx="10.3" cy="10.3" r="1.05" fill="currentColor" />
    </svg>
  )
}

function IconMove() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M2.6 8h9.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2.6 2.2"
      />
      <path
        d="M9.9 4.9 13.4 8l-3.5 3.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTile() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="2.6" y="2.6" width="10.8" height="10.8" rx="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.6 6.1h10.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function IconBuild() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M8 2.3 13.4 6v7.2H2.6V6L8 2.3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.6 13.2V9.1h2.8v4.1" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function IconEnd() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="m5.3 8.2 1.9 1.9 3.5-3.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLoopBack() {
  return (
    <svg viewBox="0 0 38 14" width="34" height="12" fill="none" aria-hidden="true">
      <path
        d="M36.5 2.5H7.5A5 5 0 0 0 2.5 7.5v2.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="2.4 2.4"
      />
      <path
        d="m.7 8.6 1.8 2.6 1.8-2.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg viewBox="0 0 12 16" width="11" height="14" fill="none" aria-hidden="true">
      <path
        d="m4 4.5 4 3.5-4 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------
   Turn-loop diagram
   ------------------------------------------------------------------ */

const LOOP_STEPS: { label: string; icon: ReactNode; optional?: boolean }[] = [
  { label: 'Roll', icon: <IconDice /> },
  { label: 'Move', icon: <IconMove /> },
  { label: 'Resolve tile', icon: <IconTile /> },
  { label: 'Build / Trade', icon: <IconBuild />, optional: true },
  { label: 'End turn', icon: <IconEnd /> },
]

function TurnLoopDiagram() {
  return (
    <figure className="mn-diagram">
      <figcaption className="mn-diagram-cap caps">The turn loop</figcaption>
      <ol className="mn-loop">
        {LOOP_STEPS.map((step, i) => (
          <li className="mn-loop-item" key={step.label}>
            <span className={`mn-loop-node${step.optional ? ' is-optional' : ''}`}>
              <span className="mn-loop-icon">{step.icon}</span>
              <span className="mn-loop-label">{step.label}</span>
              {step.optional ? <span className="mn-loop-tag">optional</span> : null}
            </span>
            {i < LOOP_STEPS.length - 1 ? (
              <span className="mn-loop-arrow" aria-hidden="true">
                <IconChevron />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mn-loop-foot">
        <span className="mn-loop-return" aria-hidden="true">
          <IconLoopBack />
        </span>
        Play passes to the next player and the loop begins again.
      </p>
    </figure>
  )
}

/* ------------------------------------------------------------------
   Block renderer
   ------------------------------------------------------------------ */

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'p':
      return <p className="mn-p">{renderInline(block.text)}</p>

    case 'h3':
      return <h3 className="mn-h3">{renderInline(block.text)}</h3>

    case 'ul':
      return (
        <ul className="mn-ul">
          {block.items.map((item, i) => (
            <li className="mn-li" key={i}>
              <span className="mn-marker" aria-hidden="true" />
              <span className="mn-li-text">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )

    case 'ol':
      return (
        <ol className="mn-ol">
          {block.items.map((item, i) => (
            <li className="mn-step" key={i}>
              <span className="mn-step-num num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="mn-li-text">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      )

    case 'note':
      return (
        <aside className={`mn-note ${block.tone === 'cost' ? 'is-cost' : 'is-info'}`}>
          <span className="mn-note-icon" aria-hidden="true">
            {block.tone === 'cost' ? <IconCost /> : <IconInfo />}
          </span>
          <div className="mn-note-body">
            <p className="mn-note-title">{block.title}</p>
            <p className="mn-note-text">{renderInline(block.text)}</p>
          </div>
        </aside>
      )

    case 'table':
      return (
        <div className="mn-table" role="table">
          <div className="mn-tr mn-tr-head" role="row">
            <span className="mn-th" role="columnheader">
              {block.head[0]}
            </span>
            <span className="mn-th" role="columnheader">
              {block.head[1]}
            </span>
          </div>
          {block.rows.map((row, i) => (
            <div className="mn-tr" role="row" key={i}>
              <span className="mn-td" role="cell">
                {block.swatches?.[i] ? (
                  <span
                    className="mn-swatch"
                    style={{ background: block.swatches[i] }}
                    aria-hidden="true"
                  />
                ) : null}
                {row[0]}
              </span>
              <span className="mn-td mn-td-value num" role="cell">
                {row[1]}
              </span>
            </div>
          ))}
        </div>
      )

    case 'diagram':
      return <TurnLoopDiagram />
  }
}

/* ------------------------------------------------------------------
   Screen
   ------------------------------------------------------------------ */

export type ManualScreenProps = {
  /** Renders the "Back to board" button above the contents when provided. */
  onBackToBoard?: () => void
  /** Section id to open on mount. Defaults to the first section. */
  initialSectionId?: string
  /** Extra class on the screen root. */
  className?: string
}

/** Reading line: the y offset at which a section counts as "current". */
function readingLineOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')
  const topbar = Number.parseFloat(raw)
  return (Number.isFinite(topbar) ? topbar : 64) + 28
}

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

export function ManualScreen({ onBackToBoard, initialSectionId, className }: ManualScreenProps) {
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string>(
    () => SECTIONS.find(s => s.id === initialSectionId)?.id ?? SECTIONS[0].id,
  )
  const [progress, setProgress] = useState(0)

  const docRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef(new Map<string, HTMLElement>())

  const searchIndex = useMemo(
    () => new Map(SECTIONS.map(s => [s.id, searchIndexFor(s)])),
    [],
  )

  const trimmed = query.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!trimmed) return SECTIONS
    return SECTIONS.filter(s => (searchIndex.get(s.id) ?? '').includes(trimmed))
  }, [trimmed, searchIndex])

  const registerSection = useCallback((id: string, node: HTMLElement | null) => {
    if (node) sectionRefs.current.set(id, node)
    else sectionRefs.current.delete(id)
  }, [])

  /* Scroll spy + progress rail. Capture-phase so it works whether the page
     scrolls at the window or inside the shell's content column. */
  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const doc = docRef.current
      if (!doc) return

      const line = readingLineOffset()
      const viewport = window.innerHeight
      const rect = doc.getBoundingClientRect()
      const runway = rect.height - (viewport - line)
      setProgress(runway <= 0 ? 1 : clamp01((line - rect.top) / runway))

      let current: string | null = null
      for (const section of visible) {
        const node = sectionRefs.current.get(section.id)
        if (!node) continue
        if (node.getBoundingClientRect().top <= line + 8) current = section.id
      }
      if (!current && visible.length > 0) current = visible[0].id
      if (current) setActiveId(prev => (prev === current ? prev : current))
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [visible])

  const goToSection = useCallback((id: string) => {
    setActiveId(id)
    const node = sectionRefs.current.get(id)
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const tocItems = visible
  const progressPct = Math.round(progress * 100)

  return (
    <div className={`mn-screen${className ? ` ${className}` : ''}`}>
      {/* ---------------- Left: contents ---------------- */}
      <aside className="mn-side" aria-label="Rulebook contents">
        {onBackToBoard ? (
          <button type="button" className="btn btn-outline btn-sm btn-block mn-back" onClick={onBackToBoard}>
            <IconBack />
            Back to board
          </button>
        ) : null}

        <div className="mn-search">
          <label className="sr-only" htmlFor="mn-search-input">
            Search the rulebook
          </label>
          <span className="mn-search-icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            id="mn-search-input"
            className="input mn-search-input"
            type="search"
            placeholder="Search rules"
            value={query}
            autoComplete="off"
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <nav className="mn-toc" aria-label="Sections">
          <span className="mn-rail" aria-hidden="true">
            <span className="mn-rail-fill" style={{ height: `${progressPct}%` }} />
          </span>

          {tocItems.length === 0 ? (
            <p className="mn-toc-empty">
              No section matches <span className="bright">{query.trim()}</span>.
            </p>
          ) : (
            <ul className="mn-toc-list">
              {tocItems.map(section => {
                const index = SECTIONS.findIndex(s => s.id === section.id) + 1
                const isActive = section.id === activeId
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      className={`mn-toc-item${isActive ? ' is-active' : ''}`}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => goToSection(section.id)}
                    >
                      <span className="mn-toc-num num" aria-hidden="true">
                        {String(index).padStart(2, '0')}
                      </span>
                      <span className="mn-toc-label">{section.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>

        <p className="mn-side-foot meta">
          <span className="num">{progressPct}%</span> read
          {trimmed ? (
            <>
              {' · '}
              <span className="num">{tocItems.length}</span> of{' '}
              <span className="num">{SECTIONS.length}</span> shown
            </>
          ) : null}
        </p>
      </aside>

      {/* ---------------- Right: the rules ---------------- */}
      <div className="mn-doc" ref={docRef}>
        <header className="mn-doc-head">
          <p className="mn-eyebrow caps">Rulebook</p>
          <h1 className="mn-doc-title">How Whaleopoly works</h1>
          <p className="mn-doc-sub">
            Every rule, price and payout on the board, checked against the contracts that enforce them.
          </p>
          <div className="mn-doc-chips">
            <span className="chip chip-accent">Starknet Sepolia</span>
            <span className="chip">
              Entry &amp; pot in <span className="chip-value">ETH</span>
            </span>
            <span className="chip">
              Everything on the board in <span className="chip-value">game dollars</span>
            </span>
          </div>
        </header>

        {tocItems.length === 0 ? (
          <div className="empty mn-doc-empty">
            <p className="empty-title">Nothing matched</p>
            <p className="empty-text">
              No rulebook section contains “{query.trim()}”. Try a shorter term such as “rent”, “jail” or
              “mortgage”.
            </p>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setQuery('')}>
              Clear search
            </button>
          </div>
        ) : (
          tocItems.map(section => {
            const index = SECTIONS.findIndex(s => s.id === section.id) + 1
            return (
              <section
                key={section.id}
                id={`manual-${section.id}`}
                className="mn-section"
                aria-labelledby={`manual-${section.id}-title`}
                ref={node => registerSection(section.id, node)}
              >
                <header className="mn-section-head">
                  <p className="mn-section-index num" aria-hidden="true">
                    {String(index).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}
                  </p>
                  <h2 className="mn-section-title" id={`manual-${section.id}-title`}>
                    {section.title}
                  </h2>
                  <p className="mn-section-sub">{section.summary}</p>
                </header>
                {section.blocks.map((block, i) => (
                  <BlockView block={block} key={i} />
                ))}
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ManualScreen
