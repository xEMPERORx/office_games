# Office Game Hub — Build Plan

> Disguised as a dark-theme code editor. Hosted on AWS ECS. Multiplayer via room codes + chat lobby.

---

## What We're Building

A browser-based multiplayer game platform that looks like a VS Code / dark IDE from the outside. Players join via a room code and can play:

- **UNO** — card shedding game
- **Ludo** — board game (2–4 players)
- **Teen Patti** — Indian poker
- **Napoleon** — trick-taking card game
- **Exploding Kittens** — strategic card game of survival (2–5 players)

All games run in the same app. One person creates a room, shares the 6-digit code via Slack/chat, others join. Includes a chat lobby so players can coordinate without anyone noticing.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fast, component-based, easy to build card UIs |
| Styling | Tailwind CSS (dark theme) | Looks like an IDE out of the box |
| Realtime | Socket.IO | Room-based multiplayer, instant state sync |
| Backend | Node.js + Express | Hosts Socket.IO server |
| State | In-memory (server-side) | No DB needed for game state |
| Container | Docker | Single image for ECS |
| Hosting | AWS ECS (Fargate) | Serverless containers, easy to scale |
| Load Balancer | AWS ALB | Routes HTTP/WebSocket traffic |
| Domain (optional) | Route 53 + ACM | HTTPS with your own domain |

---

## Project Structure

```
office-game-hub/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── IDE/
│   │   │   │   ├── Titlebar.jsx       # Fake "VS Code" title bar
│   │   │   │   ├── Sidebar.jsx        # Fake file explorer panel
│   │   │   │   ├── StatusBar.jsx      # Fake git/lint status bar at bottom
│   │   │   │   └── EditorTabs.jsx     # Fake open file tabs
│   │   │   ├── Lobby/
│   │   │   │   ├── JoinRoom.jsx       # Enter room code screen
│   │   │   │   ├── ChatPanel.jsx      # Chat sidebar (looks like a terminal)
│   │   │   │   └── PlayerList.jsx     # Who's in the room
│   │   │   └── Games/
│   │   │       ├── UNO/
│   │   │       │   ├── UNOGame.jsx
│   │   │       │   ├── UNOCard.jsx
│   │   │       │   └── UNOLogic.js
│   │   │       ├── Ludo/
│   │   │       │   ├── LudoGame.jsx
│   │   │       │   ├── LudoBoard.jsx
│   │   │       │   └── LudoLogic.js
│   │   │       ├── TeenPatti/
│   │   │       │   ├── TeenPattiGame.jsx
│   │   │       │   ├── TeenPattiCard.jsx
│   │   │       │   └── TeenPattiLogic.js
│   │   │       ├── Napoleon/
│   │   │       │   ├── NapoleonGame.jsx
│   │   │       │   └── NapoleonLogic.js
│   │   │       └── ExplodingKittens/
│   │   │           ├── ExplodingKittensGame.jsx
│   │   │           ├── EKCard.jsx             # Card renderer with type icons
│   │   │           └── EKLogic.js             # Client-side card type constants
│   │   ├── hooks/
│   │   │   └── useSocket.js           # Socket.IO connection hook
│   │   ├── context/
│   │   │   └── GameContext.jsx        # Global game + room state
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── index.js                   # Express + Socket.IO entry point
│   │   ├── roomManager.js             # Create/join/leave rooms
│   │   ├── games/
│   │   │   ├── uno.js                 # UNO server logic
│   │   │   ├── ludo.js                # Ludo server logic
│   │   │   ├── teenpatti.js           # Teen Patti server logic
│   │   │   ├── napoleon.js            # Napoleon server logic
│   │   │   └── explodingkittens.js    # Exploding Kittens server logic
│   │   └── utils/
│   │       ├── deck.js                # Card deck generator + shuffler
│   │       └── roomCode.js            # 6-digit room code generator
│   └── package.json
│
├── Dockerfile
├── docker-compose.yml       # Local dev
└── .env.example
```

---

## Disguise — How It Looks Like an IDE

The outer shell of the app mimics VS Code. The game is rendered inside what looks like the "editor area".

```
┌─────────────────────────────────────────────────────────────┐
│  ● ● ●   office-utils — Visual Studio Code         _ □ ✕   │  ← Fake title bar
├──────┬──────────────────────────────────┬───────────────────┤
│ EXPL │  game.ts   utils.ts   config.ts  │                   │  ← Fake tabs
│ORer  ├──────────────────────────────────┤   CHAT /          │
│      │                                  │   TERMINAL        │
│ 📁   │       [GAME RENDERS HERE]        │                   │  ← Chat looks like
│ src  │                                  │   > player1: ok   │    a terminal
│  📄  │                                  │   > player2: go   │
│  📄  │                                  │   > you: gg       │
│      │                                  │   > _             │
├──────┴──────────────────────────────────┴───────────────────┤
│  ⎇ main   ✓ 0   ⚠ 0   Ln 42, Col 18   UTF-8   TypeScript  │  ← Fake status bar
└─────────────────────────────────────────────────────────────┘
```

**Key disguise details:**
- Title bar says something like `office-utils — Visual Studio Code`
- Fake file tabs: `game.ts`, `utils.ts`, `config.ts` — clicking them does nothing visible
- Fake sidebar shows a file tree (all fake filenames)
- Chat panel styled as a terminal (`>` prompt, monospace font, dark bg)
- Status bar shows fake git branch, line numbers, language mode
- Game cards/board render in the "editor" area — colorful but contained

---

## Game Logic Overview

### Shared (all games)
- Server holds authoritative game state
- Each action is sent as a Socket.IO event
- Server validates the move, updates state, broadcasts to all players in the room
- Client only renders — never trusts itself for game logic

### UNO
- Standard 108-card deck
- Events: `draw_card`, `play_card`, `call_uno`, `challenge`
- Special cards: Skip, Reverse, Draw Two, Wild, Wild Draw Four
- Server tracks turn order, hand sizes, direction

### Ludo
- 4 players, 4 tokens each
- Events: `roll_dice`, `move_token`
- Server handles safe zones, captures, home column logic
- Supports 2–4 players (empty slots = no tokens)

### Teen Patti
- 3 cards per player, betting rounds
- Events: `bet`, `call`, `raise`, `fold`, `show`
- Server manages pot, blind/seen status, showdown comparison
- Supports 3–6 players

### Napoleon
- Trick-taking with a 32-card deck (7–A in 4 suits)
- Events: `bid`, `play_card`
- Server manages bidding phase, trick resolution, scoring
- 5 players: Napoleon + 2 allies vs 2 opponents

### Exploding Kittens
- 2–5 players; last player standing wins
- **Deck composition (56 cards base game):**

| Card | Count | Effect |
|---|---|---|
| Exploding Kitten | players - 1 | Draw this = you're out (unless you have a Defuse) |
| Defuse | 6 | Cancel an Exploding Kitten; reinsert it anywhere in deck |
| Attack | 4 | End your turn without drawing; next player takes 2 turns |
| Skip | 4 | End your turn without drawing |
| Favor | 4 | Force any player to give you 1 card of their choice |
| Shuffle | 4 | Shuffle the draw pile |
| See the Future | 5 | Peek at top 3 cards of draw pile (only you see them) |
| Nope | 5 | Cancel any action card (even another Nope) |
| Cat cards (5 types) | 4 each | Useless alone; play a pair to steal a random card |

- **Turn flow:**
  1. Play 0 or more cards from hand (optional)
  2. Draw 1 card from the deck
  3. If it's an Exploding Kitten → use Defuse or you're eliminated
  4. Pass turn to next player

- **Server events:**

| Event | Direction | Payload |
|---|---|---|
| `ek_play_card` | Client → Server | `{ cardId, targetPlayerId? }` |
| `ek_draw_card` | Client → Server | `{}` |
| `ek_play_nope` | Client → Server | `{ cardId }` (interrupt window) |
| `ek_defuse` | Client → Server | `{ cardId, insertPosition }` |
| `ek_see_future_result` | Server → Player | `{ top3Cards }` (private, only sender) |
| `ek_game_state` | Server → All | `{ hands (counts only), deckSize, discardPile, currentPlayer, eliminated }` |
| `ek_player_eliminated` | Server → All | `{ playerName }` |
| `ek_game_over` | Server → All | `{ winner }` |

- **Key server rules:**
  - After any action card is played, open a **2-second Nope window** before resolving — broadcast `nope_window_open` and wait for `ek_play_nope`; if received, cancel the action (and open another window for a counter-Nope)
  - `See the Future` result is sent **only to the requesting player** via `socket.emit` (not broadcast)
  - When a Defuse is played, the server asks the player for `insertPosition` (0 = top, deck.length = bottom) — validate it server-side
  - Player hands are **never sent in full to other clients** — only hand sizes are broadcast; each player only receives their own cards

---

## Socket.IO Events Reference

### Room Events
| Event | Direction | Payload |
|---|---|---|
| `create_room` | Client → Server | `{ playerName, gameType }` |
| `join_room` | Client → Server | `{ roomCode, playerName }` |
| `room_joined` | Server → Client | `{ roomCode, players, gameState }` |
| `player_joined` | Server → All | `{ playerName, players }` |
| `player_left` | Server → All | `{ playerName, players }` |
| `chat_message` | Client → Server | `{ message }` |
| `chat_message` | Server → All | `{ playerName, message, timestamp }` |
| `start_game` | Client → Server | `{}` (host only) |
| `game_started` | Server → All | `{ gameState }` |

### Game Events (examples for UNO)
| Event | Direction | Payload |
|---|---|---|
| `play_card` | Client → Server | `{ cardId, chosenColor? }` |
| `draw_card` | Client → Server | `{}` |
| `call_uno` | Client → Server | `{}` |
| `game_state_update` | Server → All | `{ gameState }` |
| `game_over` | Server → All | `{ winner }` |

---

## Docker Setup

### Dockerfile
```dockerfile
FROM node:20-alpine AS base

# Build client
FROM base AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build server
FROM base AS production
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist ./public

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
```

### docker-compose.yml (local dev)
```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=development
    volumes:
      - ./server/src:/app/src
```

---

## AWS ECS Deployment

### Step 1 — Push image to ECR
```bash
# Authenticate
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin <account_id>.dkr.ecr.ap-south-1.amazonaws.com

# Build + tag + push
docker build -t office-game-hub .
docker tag office-game-hub:latest <account_id>.dkr.ecr.ap-south-1.amazonaws.com/office-game-hub:latest
docker push <account_id>.dkr.ecr.ap-south-1.amazonaws.com/office-game-hub:latest
```

### Step 2 — ECS Task Definition (key settings)
```json
{
  "family": "office-game-hub",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [{
    "name": "office-game-hub",
    "image": "<account_id>.dkr.ecr.ap-south-1.amazonaws.com/office-game-hub:latest",
    "portMappings": [{ "containerPort": 3000 }],
    "environment": [{ "name": "NODE_ENV", "value": "production" }]
  }]
}
```

### Step 3 — ECS Service
- Launch type: **Fargate**
- Desired count: **1** (enough for office use)
- VPC: use your existing VPC, private subnet
- Security group: allow inbound TCP 3000 from ALB only

### Step 4 — Application Load Balancer
- Listener: **HTTPS :443** → Target Group (port 3000)
- **Important:** Enable **WebSocket support** — ALB handles this automatically, but make sure the target group protocol is HTTP (not HTTPS) since TLS terminates at the ALB
- Stickiness: enable **sticky sessions** (needed so Socket.IO reconnects hit the same container)

### Step 5 — Optional: Custom Domain
```
Route 53 → A record (alias) → ALB DNS name
ACM → certificate for your domain → attach to ALB listener
```

---

## Environment Variables

```env
# server/.env
PORT=3000
NODE_ENV=production
MAX_ROOM_PLAYERS=10
ROOM_CODE_LENGTH=6
ROOM_EXPIRY_MINUTES=120    # Rooms auto-close after 2 hours of inactivity
```

---

## Local Dev Setup

```bash
# Clone and install
git clone <your-repo>
cd office-game-hub

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install

# Run both (from root)
# Terminal 1 — server
cd server && npm run dev      # nodemon on port 3000

# Terminal 2 — client
cd client && npm run dev      # Vite on port 5173 (proxies /socket.io to 3000)
```

Add this to `vite.config.js` so the dev client talks to the local server:
```js
server: {
  proxy: {
    '/socket.io': {
      target: 'http://localhost:3000',
      ws: true
    }
  }
}
```

---

## Build Order (Recommended)

1. **Skeleton first** — set up the IDE disguise shell (Titlebar, Sidebar, StatusBar) with hardcoded fake content. Get it looking convincing.
2. **Room system** — build `roomManager.js` + `JoinRoom.jsx` + Socket.IO connection. Test that 2 browsers can join the same room.
3. **Chat** — add `ChatPanel.jsx` styled as a terminal. Works on top of the room system.
4. **UNO first** — simplest card game to implement. Build full loop: deal → play → win.
5. **Teen Patti** — add betting logic on top of the card primitives from UNO.
6. **Ludo** — build the board separately, then hook up dice + movement.
7. **Napoleon** — most complex due to bidding. Leave for last.
8. **Exploding Kittens** — build after UNO since it shares card primitives; the Nope interrupt window is the trickiest part.
9. **Docker + ECS** — containerize once all games work locally.


## Notes

- **No auth needed** — room code is the only access control. Keep it internal.
- **No database** — all game state lives in server memory. If the container restarts, rooms reset. That's fine for office use.
- **1 Fargate task is enough** — at 6–10 concurrent players, resource usage is minimal. Scale up only if needed.
- **Sticky sessions on ALB are critical** — Socket.IO needs the same server for the same client. Without stickiness, reconnects break.
- **Keep the URL boring** — name it something like `dev-utils.yourcompany.internal` or `tools.yourcompany.com` so it looks legitimate.
