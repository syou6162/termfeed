# termfeed

[![npm version](https://badge.fury.io/js/termfeed.svg)](https://badge.fury.io/js/termfeed) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern RSS reader that runs in the terminal

<p align="center">
  <img src="./termfeed_icon.png" alt="termfeed icon" width="200">
</p>

## Overview

termfeed is a fully local RSS reader that runs entirely within the terminal. You can manage and read RSS feeds with a fast, keyboard-driven interface without leaving the command line.

## Key Features

### 🎯 Terminal UI (Main Feature)
- **Two-pane layout**: Left pane for feeds (30%), right pane for article details (70%)
- **Vim-style key bindings**: `j`/`k` (article navigation), `s`/`a` (feed navigation), `v` (open in browser)
- **Auto-read functionality**: Automatic marking as read when moving feeds or exiting the app
- **Unread article focus**: Navigate only unread articles, automatically excluding read ones
- **Pin feature**: Mark articles for later reading with `p` key, batch open with `o` key (livedoor Reader style)
- **Favorite integration**: `f` key automatically sets pin when adding to favorites (v0.4.0+)
- **Favorites list**: `Shift+F` key switches to single-pane view for favorite articles only
- **Feed rating**: Set feed importance with `0`-`5` keys, display by rating sections
- **Intelligent display**: Only expand currently selected rating section
- **Help overlay**: `?` key shows keyboard shortcut list

### ⚙️ CLI Management Features
- Add, update, and remove RSS feeds from command line
- Article read status management and favorite functionality
- High-speed feed updates with batch processing
- **Tutorial mode**: Try with sample feeds included

### 💾 Data Management
- Manage articles, read status, and favorites with local SQLite
- Fully local operation with no external service dependencies

### 🤖 MCP (Model Context Protocol) Support
- Access article data from AI agents like Claude Code
- Provide data via MCP instead of RESTful API
- Enable real-time article analysis and summarization

## Tech Stack

- TypeScript
- Ink (React-based terminal UI)
- better-sqlite3 (SQLite database)
- axios (HTTP communication)
- @modelcontextprotocol/sdk (MCP integration)

## Installation

### Run with npx (Recommended)

```bash
# Try tutorial mode (with sample feeds)
npx termfeed tutorial

# Run latest version directly
npx termfeed tui

# Run specific commands
npx termfeed add https://example.com/feed.rss
npx termfeed update
```

### Global Installation with npm

```bash
# Install globally
npm install -g termfeed

# Run
termfeed tui
```

### Build from Source

```bash
# Clone repository
git clone https://github.com/syou6162/termfeed.git
cd termfeed

# Install dependencies
npm install

# Build
npm run build

# Install globally (optional)
npm link
```

## Usage

### Terminal UI (Recommended)

#### Launch

```bash
# Try tutorial mode (recommended for first time)
termfeed tutorial

# Launch RSS reader in TUI mode
termfeed tui
```

#### Tutorial Mode

For first-time users, tutorial mode is recommended:

```bash
termfeed tutorial
```

- **Sample feeds included**: 4 tech blog feeds are automatically registered
- **In-memory DB**: Data is automatically deleted on exit, perfect for trying out
- **Instant experience**: Try termfeed features immediately without feed registration hassle

#### Keyboard Operations

| Key | Function |
|------|------|
| `j` / `↓` | Move to next article (unread only) |
| `k` / `↑` | Move to previous article (unread only) |
| `s` | Move to next feed |
| `a` | Move to previous feed |
| `v` | Open selected article in browser (background) |
| `f` | Toggle favorite (automatically sets pin) |
| `Shift+F` | Switch to favorites list view |
| `p` | Toggle pin (mark articles for later reading) |
| `o` | Open pinned articles (max 10 at a time, oldest first) |
| `g` | Scroll to top of article |
| `G` | Scroll to bottom of article |
| `e` | Toggle error details display |
| `r` | Update all feeds |
| `0`-`5` | Set feed rating |
| `?` | Show/hide help |
| `q` | Exit |
| `Ctrl+C` | Force exit |

#### Features

- **Auto-read**: Selected articles are automatically marked as read when moving feeds (`s`/`a`) or exiting (`q`)
- **Unread focus**: Only unread articles are navigable with `j`/`k`. Read articles are automatically excluded from the list
- **Priority feed display**: Feeds with unread articles are shown at the top for efficient checking
- **Background browser**: `v` key opens browser while maintaining terminal focus
- **Pin feature**: `p` key pins articles for later reading, `o` key opens up to 10 pinned articles in browser. Articles are opened in chronological order (oldest first), and opened articles are automatically unpinned. Press `o` multiple times to open the next 10 articles. Even if some URLs fail to open, successfully opened URLs will be unpinned
- **Favorite and pin integration**: `f` key automatically sets pin when adding to favorites. Removing from favorites also removes pin (v0.4.0+)
- **Favorites list view**: `Shift+F` key switches to single-pane view for favorite articles only. Article scrolling, pinning, and favorite removal operations are available

### CLI Commands (Management)

#### Getting Started

First, try the **tutorial mode** to experience the features:

```bash
termfeed tutorial
```

#### Feed Management

```bash
# Add RSS feed
termfeed add <RSS_URL>

# Example: Add Hatena Bookmark popular entries
termfeed add https://b.hatena.ne.jp/hotentry.rss

# Remove feed
termfeed rm <FEED_ID>

# List feeds (with IDs, grouped by rating sections)
termfeed list

# Check feed list in export format
termfeed export -  # Display to stdout
```

#### Article Reading

**Use TUI mode (`termfeed tui`).**
TUI provides interactive features including unread article browsing, favorite management, browser opening, and feed rating.

##### Feed Rating Feature
- Set feed importance with `0`-`5` keys (0=no rating, 5=highest rating)
- Feeds are displayed in rating sections, sorted by highest rating first
- Only the section containing the currently selected feed is expanded
- Unread article counts are displayed for each section, optimizing information density

#### Feed Updates

Feeds can be updated through the following methods:

- **TUI mode**: After launching `termfeed tui`, press `r` key to update all feeds
- **MCP server**: Use `update_all_feeds` tool

TUI allows real-time monitoring of update status and immediate viewing of new articles.

#### Feed Export/Import

```bash
# Export feeds in OPML format (default)
termfeed export
# -> outputs to subscriptions.opml

# Export with specified filename
termfeed export my-feeds.opml

# Export in text format (one URL per line)
termfeed export feeds.txt --format text

# Auto-detect from extension (.txt → text format)
termfeed export feeds.txt

# Import from OPML file
termfeed import subscriptions.opml

# Import from text file (one URL per line)
termfeed import feeds.txt

# Explicitly specify format
termfeed import feeds.xml --format opml
```

**Supported formats:**
- **OPML format**: Standard format for data migration between RSS readers (.opml, .xml)
- **Text format**: Simple one-URL-per-line format. Supports comment lines (starting with #)

### MCP Server (AI Agent Integration)

termfeed operates as an MCP (Model Context Protocol) server, allowing AI agents like Claude Code to access article data.

#### Starting MCP Server

```bash
# Start as MCP server (stdio communication)
termfeed mcp-server
```

#### Usage with Claude Code

Register as MCP server in Claude Code:

```bash
# Register development version (specify repository path)
claude mcp add --scope user termfeed -- npx tsx /path/to/termfeed/src/index.ts mcp-server

# Register built/installed version
claude mcp add --scope user termfeed -- termfeed mcp-server
```

#### Available Resources

Access termfeed data in Claude Code as follows:

**Resources (data reading):**
```
@termfeed:articles://unread          # 10 unread articles (default)
@termfeed:articles://favorites       # 10 favorite articles
```

**Tools (operation execution):**
- `update_all_feeds`: Update all feeds and fetch new articles
- `get_article`: Get detailed article content (full text) by article ID

**Tool usage example:**
```
get_article(id: 123)  # Get details for article ID 123
```

**Note:** Individual article retrieval is implemented as a tool rather than a resource to improve discoverability in Claude Code.

#### Usage Examples

Natural language query examples in Claude Code:

- "Summarize unread articles from termfeed"
- "Analyze trends from favorite articles"
- "Tell me about article ID 456"

#### MCP Benefits

- **Real-time**: Instant access to latest article data
- **Structured**: Detailed information in JSON format including metadata
- **Secure**: Local communication only, no external APIs
- **Efficient**: Dynamic retrieval of only needed data

### Database Location

SQLite database is created by default at `~/.local/share/termfeed/termfeed.db` (XDG Base Directory compliant).
You can change the location with the `TERMFEED_DB` environment variable:

```bash
export TERMFEED_DB=/path/to/your/termfeed.db
```

## License

MIT License - See [LICENSE](./LICENSE) for details.