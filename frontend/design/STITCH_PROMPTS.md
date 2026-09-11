# Whaleopoly — Stitch Design Prompt Pack

How to use: Stitch (stitch.withgoogle.com) → **Web** mode. Paste **Prompt 0** first to
establish the design system, then paste each screen prompt as a *new screen* in the same
project so it inherits the style. Design one screen per prompt — Stitch degrades when you
ask for several at once. Use the "Refine" follow-ups at the bottom to iterate.

---

## Prompt 0 — Design system / style foundation

> Create the design system for **Whaleopoly**, a premium on-chain multiplayer board game
> (Monopoly-style property strategy) built on Starknet. Desktop web app, 1440×900 canvas,
> dark UI only.
>
> **Art direction:** "bioluminescent deep ocean" — a luxury crypto-native trading terminal
> that happens to be a board game. Think Linear × a high-end DEX × a deep-sea documentary.
> Calm, dark, dense with information, never cartoonish and never neon-gamer. Restrained
> glow used as hierarchy, not decoration.
>
> **Color tokens:**
> - Background base `#040a15`, elevated surface `#0a1628`, panel `rgba(6,22,40,0.85)`
> - Surface tints: `rgba(14,165,233,0.04)` / `0.07` / `0.11` for elevation 1/2/3
> - Borders: `rgba(14,165,233,0.08)` subtle, `0.15` default, `0.25` strong
> - Text `#e0f2fe`, bright `#f0f9ff`, muted `#7aa2c4`
> - Accent cyan `#0ea5e9`, secondary teal `#14b8a6`, gold `#f59e0b`, warning `#f97316`,
>   danger `#ef4444`, success `#14b8a6`
> - Ambient background: three huge blurred radial orbs (cyan, teal, deep cyan) at 6%
>   opacity behind everything, plus a faint caustic light gradient from top-left.
>
> **Typography:** Outfit (300–800). Display 28–34px/700 tight tracking, section titles
> 15px/600, body 15px, meta and chips 12–13px, all numeric values tabular-lining.
>
> **Components to define:** pill chip (999px radius, tinted surface, 12px muted label);
> primary "glow" button (cyan→teal gradient, soft 20px outer glow); outline button
> (transparent, cyan 45% border); ghost button; card panel (18px radius, 1px border,
> subtle inner top highlight); stat tile; list row with hover lift; input and select
> (tinted surface, cyan focus ring); toast (4 variants: success teal, error red, info
> cyan, loading amber); modal (blurred backdrop, 20px radius panel, header + body +
> action row).
>
> **Motion notes:** 150–160ms ease transitions, hover raises border + surface tint one
> step, active nav item gets a gradient wash and inner glow.
>
> Output a style sheet screen showing the palette swatches, type scale, and every
> component in default / hover / active / disabled states.

---

## Prompt 1 — App shell (persistent chrome)

> Design the **application shell** for Whaleopoly, dark ocean theme, 1440×900.
>
> **Left sidebar, 260px, sticky full height:** brand block at top — 42px rounded whale
> logo with cyan glow, "Whaleopoly" 18px bold, "On-chain strategy" 12px muted underneath.
> Below it a vertical nav of 4 items, each a 10px-radius row with a 16px line icon and
> label: **Lobby** (dice icon), **Harbor** (chart icon), **Play** (board icon),
> **Manual** (book icon). The active item has a cyan gradient wash, brighter border and
> subtle glow; inactive items are transparent with a hairline border. Pin a status chip
> to the sidebar bottom reading "Starknet Sepolia" with a small pulsing teal dot.
>
> **Top bar:** breadcrumb / current section name on the left in muted 14px; on the right
> a wallet button showing a wallet glyph and truncated address `0x04f2…8a1c`, plus a small
> ETH balance chip. Include the connected-state dropdown as a second variant: connected
> address, network row, copy-address action, and a red-tinted "Disconnect" item.
>
> **Content area:** 28px padding, panels on a soft dark ground, centered footer line
> "© Whaleopoly • Built on Starknet" in 12px muted.
>
> Show the shell with an empty content area so it can be reused under every screen.

---

## Prompt 2 — Lobby (create & join games)

> Design the **Lobby** screen for Whaleopoly inside the existing app shell.
>
> **Hero band across the top:** headline "Dive In. Stake. Conquer." at 32px bold with a
> tiny glowing orb after the last word, subhead "Create a table or join the depths — 2 to
> 6 players, winner takes the pot." Right side of the hero shows three small live-stat
> chips: open tables, players online, total ETH staked. Ghost silhouette of a whale
> rendered at 4% opacity bleeding off the right edge of the hero.
>
> **Create-a-table card:** a single elevated panel with a horizontal row of fields —
> *Your username* (text input), *Entry tier* (custom segmented selector, NOT a plain
> dropdown: four tier cards labelled **Bronze 0.01 ETH**, **Silver 0.1 ETH**,
> **Gold 1 ETH**, **Platinum 10 ETH**, each with its own metal-tinted accent, tier icon,
> and a selected state with glow), *Max players* (stepper control 2–6 showing 6 seat dots
> that fill as the number rises), and a primary glow button "Create table". Underneath, a
> muted helper line: "Entry fee is escrowed on-chain until the game resolves."
>
> **Open tables list:** section header "Open tables" with a result count and a filter
> row (All tiers / Bronze / Silver / Gold / Platinum + "Only joinable" toggle). Each table
> is a wide row: left — "Table #128" in bold plus a meta row of chips (`3/4 players`,
> `entry 0.1 ETH`, `host WhaleLord`, `pot 0.3 ETH`); middle — a seat indicator showing
> filled and empty player slots as colored avatar circles; right — "Join" outline button,
> "Start" glow button (only when 2+ players), and a subtle "Cancel" ghost action visible
> to the host only. Rows lift and brighten on hover.
>
> Also design the **empty state**: centered whale glyph, "No open tables yet", "Be the
> first to create one" and a primary button.

---

## Prompt 3 — Harbor (dashboard)

> Design the **Harbor** dashboard screen for Whaleopoly — the at-a-glance overview,
> two-column layout, roughly 1.35fr / 1fr.
>
> **Left column:**
> - A row of 6 stat tiles: Open tables, Players, Owned tiles, Houses built, Cash total,
>   Cards remaining. Each tile has a 12px muted label, a 24px tabular-numeric value, a
>   tiny trend delta, and a 40px sparkline in cyan at low opacity.
> - Below: "Your active game" card — mini board thumbnail on the left (abstract 11×11
>   ring of tiles, no text), and on the right the turn indicator, your cash, properties
>   owned, and a "Return to board" glow button.
> - Below that: "Open tables" — 3 compact table rows with join/start actions.
>
> **Right column:**
> - "Recent activity" feed — vertical list of events, each with a colored status dot
>   (teal success / amber warning / cyan info), bold title, right-aligned relative
>   timestamp, and a muted one-line body. Example entries: "Rent paid — Coral Cove",
>   "Lobby created on-chain", "Property auctioned".
> - "Players in game" panel — rows with a colored player dot, name, current tile name
>   right-aligned in muted text, and cash in tabular numerals. The active player's row
>   is highlighted with a tinted background and left accent bar.
> - A footer button "Go to board".
>
> Keep density high but airy: 16px gaps, hairline dividers, no heavy shadows.

---

## Prompt 4 — Play (the game board) ← the hero screen

> Design the **Play** screen for Whaleopoly — the main game table. Full-bleed, no page
> scroll, board and side rail fit within 1440×900.
>
> **Left ~65%: the board.** A square 11×11 grid board forming a ring of 40 tiles around a
> center. Deep navy tile faces with hairline cyan borders, sitting on a slightly darker
> felt surface with a soft inner shadow, like a lit table in a dark room.
> - Four larger corner tiles: **Start** (arrow + gold accent), **Jail / Just Visiting**
>   (split diagonal cell), **Free Stop**, **Go To Jail**.
> - Property tiles carry a bold color bar on the edge facing the center — 8 groups in
>   these exact colors: `#9ad0f5`, `#c7e59f`, `#d9a4f3`, `#f6d47c`, `#7fc9b0`, `#e7a592`,
>   `#7fb2f0`, `#3aa3e3` — with a soft matching glow, and the tile body tinted 15% of that
>   color. Ocean names in 9–10px uppercase, rotated to face inward on the left/right
>   sides: Reef Row, Coral Cove, Kelp Keys, Tide Terrace, Lagoon Lane, Pearl Plaza, Shell
>   Square, Trident Trail, Barnacle Blvd, Seagrass St, Whale Way, Anchor Ave, Current Ct,
>   Harpoon Hwy, Driftwood Dr, Gull Grove, Marlin Meadows, Siren St, Net Nook, Kraken
>   Knoll, Poseidon Pl, Leviathan Lp.
> - Non-property tiles: 4 rail tiles (Harbor / Mariner / Seafarer / Deep Rail, anchor
>   icon), 2 utilities (Power Plant, Water Works), 2 tax tiles, 3 Chance tiles (cyan "?"),
>   3 Community Chest tiles (teal chest icon).
> - Tile states to show: **owned** (a 3px owner-colored stripe along the outer edge),
>   **mortgaged** (desaturated with a diagonal hatch overlay), **selected** (bright cyan
>   ring + glow), **hovered** (raised border), **houses** (1–4 small teal house pips, or a
>   single gold hotel), **occupied** (2–3 player tokens as glowing colored discs nested in
>   the corner; the active player's token has a pulsing ring).
> - **Board center:** large watermark whale logo at low opacity, and beneath it a dice
>   tray — two 3D-ish dice with crisp pips, a "Roll" primary glow button, and a small
>   "last roll: 4 + 3" caption. Include a rolling/blurred dice variant.
>
> **Right ~35%: the control rail**, a scrollable stack of panels:
> 1. **Turn panel** — "Your turn" in bright text with a countdown ring timer, or
>    "Waiting for Kraken…" state with the opponent's color; player dot, name, current tile,
>    and cash right-aligned. Include a "Force skip (timed out)" subtle outline button.
> 2. **Action bar** — primary "End Turn" glow button, plus contextual outline buttons:
>    Buy, Build, Apply Card, Mortgage, Unmortgage, Pay Bail $50; and ghost buttons Trade
>    and Auction. Show disabled states for unavailable actions.
> 3. **Tile details** — color swatch + property name + kind label; rows for Price, Rent,
>    Rent with houses, Mortgage value, Owner (with player dot), Houses.
> 4. **Players** — up to 6 rows: color dot, name, current tile, cash; active row
>    highlighted; small badges for jail status and jail passes.
> 5. **Cards & decks** — Chance and Community Chest counts as two mini deck cards showing
>    remaining count.
> 6. **Activity log** — compact scrolling feed of the last moves.
>
> The board must be the clear focal point; the rail is quiet, monochrome, and secondary.

---

## Prompt 5 — Game modals & overlays

> Design 5 modal overlays for Whaleopoly. Shared treatment: heavily blurred dark
> backdrop, centered panel max 480px wide, 20px radius, 1px cyan-tinted border, soft
> outer glow, header row with a deck/type tag on the left and a close × on the right.
>
> 1. **Chance / Community Chest card draw** — the panel is styled as a playing card:
>    "CHANCE" tag in cyan (or "COMMUNITY CHEST" in teal), a large icon, card title
>    ("Advance to Start"), body text, and the effect rendered as a highlighted value chip
>    (e.g. `+$200` in teal or `−$150` in red). Actions: "Apply" glow button, "Close" ghost.
>    Add a subtle card-flip entrance.
> 2. **Propose a trade** — two-sided layout: your side and the counterparty's side, each
>    with a player selector, a scrollable list of owned properties with color swatches and
>    checkboxes, and a cash amount input with a slider. A center arrow icon showing the
>    swap. Live "fairness" hint line. Actions: "Send offer" / "Cancel".
> 3. **Auction** — property name and color bar at the top, current high bid large and
>    gold, bidder avatars with their bids in a list, an amount input with quick +10 / +50 /
>    +100 chips, and a countdown bar. Actions: "Place bid" / "Pass".
> 4. **Victory** — celebratory but restrained: whale glyph, "Victory!" 28px, winner name
>    in their player color, final net worth and the pot won in ETH, a compact final
>    standings table, and two actions: "Claim winnings" glow, "New game" outline.
> 5. **Bankruptcy** — red-tinted variant explaining the player is out, debts settled to
>    the creditor, with a single "Continue" action.
>
> Also design the **toast stack** (bottom-right, stacked 4 variants: success, error, info,
> loading-with-spinner) and a **transaction-pending toast** showing a truncated tx hash
> with a link-out icon.

---

## Prompt 6 — Manual (rules & docs)

> Design the **Manual** screen for Whaleopoly — an in-app rulebook, two-pane docs layout.
>
> Left pane, 240px: a sticky table of contents listing 9 sections — What is Whale-Opoly?,
> Getting Started, How to Play, Properties & Building, Jail, Trading, Bankruptcy &
> Winning, Chance & Chest Cards, On-Chain Features. The active item has a cyan left rail
> bar and brighter text; a thin scroll-progress indicator runs down the left edge.
>
> Right pane: readable long-form content at 680px max width — 24px section titles, 15px
> body at 1.7 line height in `#e0f2fe`, 17px subsection headings, bulleted lists with
> small cyan diamond markers, inline `code`-style chips for values like `$200` and
> `0.1 ETH`, and callout blocks (info = cyan-tinted, warning = amber-tinted) for rules
> that cost players money. Include one small diagram card illustrating the turn loop:
> Roll → Move → Resolve tile → Build/Trade → End turn.
>
> Top of the right pane: a search field "Search the manual" and a "Back to board" outline
> button.

---

## Prompt 7 — Onboarding & edge states

> Design 4 supporting states for Whaleopoly, same dark ocean system:
>
> 1. **Wallet not connected** — full-content-area state: whale glyph, "Connect a Starknet
>    wallet to play", a short line about Sepolia testnet, a primary "Connect wallet" glow
>    button, and a row of wallet options (Cartridge Controller, ArgentX, Braavos) as
>    selectable cards with logos and a "recommended" badge on the first.
> 2. **No active game** — centered whale glyph, "No active game", "Create or join a table
>    first, then start the match", primary button "Go to Lobby".
> 3. **Loading / syncing chain state** — skeleton version of the Play screen: board grid as
>    shimmering placeholder tiles, rail panels as pulsing bars, with a small status line
>    "Syncing from Torii…" and an animated cyan progress sliver.
> 4. **Mobile gate** (viewport under 900px) — full-screen centered: 64px whale, "Whaleopoly
>    is built for the deep", a line explaining the game needs a desktop screen, a chip
>    reading "Minimum 1024px wide", and a "Copy link to desktop" secondary button. Make
>    this one genuinely beautiful — it is the first thing many people will see.

---

## Refine follow-ups (paste after a screen is generated)

- "Increase information density: reduce vertical padding by 25%, tighten section gaps to
  12px, and make all numeric values tabular."
- "The glow is too strong. Halve every outer glow and rely on border brightness for
  hierarchy instead."
- "Make the board tiles read clearly at 100% zoom: raise label contrast, increase the
  color bar to 8px, and shorten names to fit on one line."
- "Add hover, focus-visible, disabled and loading states for every interactive element."
- "Show the same screen with a 6-player game in progress: all seats filled, several owned
  properties with houses, two mortgaged tiles, one player in jail."
- "Give me a light-on-dark accessible pass: verify all body text hits 4.5:1 against
  `#040a15` and raise the muted color if it fails."

---

## Constraints to keep repeating to Stitch

- Desktop web only, 1440×900 target, minimum 1024px. No mobile layout except the gate.
- Dark theme only — there is no light mode.
- 2–6 players, colors: `#ff6b6b`, `#4ecdc4`, `#45b7d1`, `#f9ca24`, `#a78bfa`, `#fb923c`.
- On-chain reality must show: tx hashes, pending states, "escrowed on-chain", Sepolia
  network chip, gas/entry fees in ETH.
- Never use Monopoly's trademarked names, board art, or the mustachioed mascot — all
  place names are ocean-themed originals.
