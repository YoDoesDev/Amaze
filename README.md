# Amaze - v1.2.0

**Amaze** is a high-performance Discord bot engine built for complex economies, stock market simulations, and deep reputation systems. Designed for scalability, Amaze utilizes a custom **Matrix-Database Architecture** to handle high-frequency data mutations and composite-key relational storage.

## Core Architecture
Amaze features a custom database.js engine that abstracts SQLite interactions into a "Schema Matrix," ensuring atomic consistency across composite tables.
 * **Matrix Engine:** Optimized universal wrappers (Get, Set, Create, Delete) that handle single and dual-key table logic automatically.
 * **Atomic Transactions:** Prevents race conditions during heavy market activity, such as stock buying and selling.
 * **Performance First:** Utilizes better-sqlite3 for synchronous, low-latency disk I/O.

## Feature Modules

### Economy
 * **Amash:** The core currency of the Amaze ecosystem.
 * **Coinflip:** A high-stakes gambling game with probability-shifting mechanics based on player stats.
 * **Shop/Inventory:** Manage assets, licenses, and special items.

### Stock Market
 * **Buy/Sell Stocks:** Invest in user reputation for long-term profit.
 * **Market Stability:** Real-time exit tax calculations based on time-held duration, ranging from "Paper Hands" fees to "Market Standard" rates.

### Reputation
 * **Vouching:** Build reputation for yourself and your peers with multiplier logic.
 * **Defamation:** Impact user reputation—and by proxy, their stock profit—with strategic cooldown-based strikes.
 * **PR Shields:** Strategic defensive items to protect your reputation from attackers.

## Technical Stack
 * **Language:** Node.js
 * **Library:** discord.js
 * **Database:** better-sqlite3 (with custom Matrix abstraction)
 * **Environment:** Powered by Termux (Mobile-first development environment).
## Development Disclaimer
This project is currently in active development. Features like !eval are restricted to authorized developers only for rapid debugging and live production maintenance.
> *Built with precision, powered by logic.*
