# Amaze - v1.3.0

Amaze is a feature-rich Discord bot focused on performance, persistent economies, strategy, and community interaction. Built with Node.js, discord.js, SQLite, and a custom Matrix Database Architecture, it is designed to provide fast command execution while supporting complex game systems and large amounts of persistent user data.

# ✨ What's New in v1.3.0

## ⚔️ Slay RPG (Major Feature)

The biggest addition to Amaze.

- Create your own RPG character.
- Choose between multiple character archetypes.
- Train your stats over time.
- Battle other players in turn-based PvP combat.
- Persistent character progression.
- Character information and stat viewing.

Commands

- "/slay start"
- "/slay train"
- "/slay battle"
- "/slay charinfo"

---

## Features

### 💰 Economy

- Daily, weekly and monthly rewards
- Currency transfers
- Amash leaderboard
- Persistent economy system

### 📈 Stock Market

- Buy stocks
- Sell stocks
- Portfolio tracking
- Persistent investment data

### 🛒 Shop System

- Browse shop
- Buy items
- Sell items
- Inventory management

### ⭐ Reputation System

- Vouch users
- Defame users
- Reputation leaderboards
- Reputation statistics
- User profiles

### 🎲 Gambling

- Coin Flip
- Slot Machine

### 🎮 Games

- Rock Paper Scissors

### ⚙️ Utility

- Ping
- Help
- Vote support
- Prefix configuration

---

## Architecture

Amaze uses a custom Database Abstraction Layer, abstracting SQLite into reusable schemas and universal database operations.

### Highlights include:

- High-performance SQLite backend
- Universal database access layer
- Cached data lookups
- Persistent progression systems
- Modular command architecture
- Feature-based folder structure

---

### Tech Stack

- Node.js
- discord.js
- Express
- better-sqlite3
- SQLite
- dotenv

---

## Performance

Amaze is built around low-latency database access.

- Persistent SQLite storage
- Cached lookups
- Optimized database operations
- Modular architecture for easier maintenance

---

## Current Modules

- Economy
- Stocks
- Reputation
- Shop
- Gambling
- Games
- Slay RPG
- Configuration
- General Utilities

---

## Version

### Current Release: Amaze v1.3.0

The v1.3.0 release introduces the first version of the Slay RPG, adding persistent character creation, training, and PvP battles while continuing to improve the modular architecture that powers Amaze.