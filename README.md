# termfeed

[![npm version](https://badge.fury.io/js/termfeed.svg)](https://badge.fury.io/js/termfeed) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern RSS reader that runs in the terminal

<p align="center">
  <img src="./termfeed_icon.png" alt="termfeed icon" width="200">
</p>

## Overview

termfeed is a local RSS reader that runs entirely within the terminal. You can manage and read RSS feeds with a fast, keyboard-driven interface without leaving the command line.

## Key Features

### 🎯 Terminal UI (Main Feature)
- **2-pane layout**: Left feed list (30%), right article details (70%)
- **Vim-style key bindings**: `j`/`k` (article navigation), `s`/`a` (feed navigation), `v` (open in browser)
- **Auto-read function**: Automatic marking as read when switching feeds or exiting app
- **Unread article focus**: Navigate only through unread articles, automatically exclude read articles
- **Pin function**: Mark articles for later reading with `p` key, open pinned articles in batch with `o` key (livedoor Reader style)
- **Favorite synchronization**: Automatically set pins when adding to favorites with `f` key (v0.4.0+)
- **Favorites list**: Switch to dedicated single-pane view for favorite articles with `Shift+F` key
- **Feed rating**: Set feed importance with `0`-`5` keys, display by rating sections
- **Intelligent display**: Only expand the currently selected rating section
- **Help overlay**: Display keyboard shortcuts list with `?` key

### ⚙️ CLI Management Functions
- Add, update, and delete RSS feeds from command line
- Article read management and favorites function
- High-speed feed updates with batch processing
- **Tutorial mode**: Try with sample feeds included

### 💾 Data Management
- Manage articles, read status, and favorites with local SQLite
- Completely local operation with no external service dependencies

### 🤖 MCP (Model Context Protocol) Support
- Access article data from AI agents like Claude Code
- Provide data via MCP instead of RESTful API
- Enable real-time article analysis and summarization

## Technology Stack

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

### Global installation with npm

```bash
# Install globally
npm install -g termfeed

# Run
termfeed tui
```

### Build from source

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

For first-time termfeed users, tutorial mode is recommended:

```bash
termfeed tutorial
```

- **Sample feeds included**: 4 tech blog feeds are automatically registered
- **In-memory DB**: Data is automatically deleted on exit, perfect for trying out
- **Instant experience**: Try termfeed features immediately without the hassle of feed registration

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
| `p` | Toggle pin (mark article for later reading) |
| `o` | Open pinned articles (max 10 at once, oldest first) |
| `g` | Scroll to top of article |
| `G` | Scroll to bottom of article |
| `e` | Toggle error details display |
| `r` | Update all feeds |
| `0`-`5` | Set feed rating |
| `?` | Show/hide help |
| `q` | Exit |
| `Ctrl+C` | Force exit |

#### Features

- **Auto-read**: Articles are automatically marked as read when switching feeds (`s`/`a`) or exiting (`q`)
- **Unread focus**: Only unread articles can be navigated with `j`/`k`. Read articles are automatically excluded from the list
- **Feed priority display**: Feeds with unread articles are displayed at the top for efficient checking
- **Background browser**: Browser focus is maintained in terminal when opening with `v` key
- **Pin function**: Articles can be pinned for later reading with `p` key, and pinned articles can be opened in browser (max 10 at once) with `o` key. Articles are opened in oldest-first order and pins are automatically removed after opening. Press `o` key multiple times to open the next 10 articles. Pins are removed for successfully opened URLs even if some URLs fail to open
- **Favorite and pin synchronization**: Adding to favorites with `f` key automatically sets pins. Removing from favorites also removes pins (v0.4.0+)
- **Favorites list view**: Switch to dedicated single-pane view for favorite articles with `Shift+F` key. Article scrolling, pinning, and favorite removal operations are available

### CLI Commands (For Management)

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

# Delete feed
termfeed rm <FEED_ID>

# Display feed list (with IDs, grouped by rating sections)
termfeed list

# Check feed list in export format
termfeed export -  # Display to stdout
```

#### Article Reading

**Use TUI mode (`termfeed tui`).**
TUI provides interactive features like reading unread articles, favorites management, opening in browser, and feed rating.

##### Feed Rating Function
- Set feed importance with `0`-`5` keys (0=no rating, 5=highest rating)
- Feeds are displayed in sections by rating, sorted by high rating first
- Only the section containing the currently selected feed is expanded
- Unread article count is displayed for each section, optimizing information density

#### Feed Updates

Feeds can be updated using the following methods:

- **TUI mode**: After launching `termfeed tui`, press `r` key to update all feeds
- **MCP server**: Use `update_all_feeds` tool

TUI allows real-time monitoring of update status and immediate reading of new articles.


#### Feed Export/Import

```bash
# Export feeds in OPML format (default)
termfeed export
# -> Output to subscriptions.opml

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

termfeed can operate as an MCP (Model Context Protocol) server, allowing AI agents like Claude Code to access article data.

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

You can access termfeed data within Claude Code as follows:

**Resources (data reading):**
```
@termfeed:articles://unread          # 10 unread articles (default)
@termfeed:articles://favorites       # 10 favorite articles
```

**Tools (operation execution):**
- `update_all_feeds`: Update all feeds and retrieve new articles
- `get_article`: Get individual article details (full text) by specifying article ID

**Tool usage example:**
```
get_article(id: 123)  # Get details of article ID 123
```

**Note:** Individual article retrieval is implemented as a tool rather than a resource to improve discoverability in Claude Code.

#### Usage Examples

Natural language query examples in Claude Code:

- "Summarize unread articles in termfeed"
- "Analyze trends from favorite articles"
- "Tell me about the content of article ID 456"

#### MCP Benefits

- **Real-time**: Instant access to latest article data
- **Structured**: Detailed information including metadata in JSON format
- **Secure**: Local communication only, no external APIs
- **Efficient**: Dynamic retrieval of only necessary data

### Database Location

SQLite database is created by default at `~/.local/share/termfeed/termfeed.db` (XDG Base Directory compliant).
You can change the location with the `TERMFEED_DB` environment variable:

```bash
export TERMFEED_DB=/path/to/your/termfeed.db
```

## License

MIT License - See [LICENSE](./LICENSE) for details.