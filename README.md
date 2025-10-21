# termfeed

[![npm version](https://badge.fury.io/js/termfeed.svg)](https://badge.fury.io/js/termfeed) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern RSS reader that works in your terminal

<p align="center">
  <img src="./termfeed_icon.png" alt="termfeed icon" width="200">
</p>

## Overview

termfeed is a fully local RSS reader that works entirely within your terminal. You can manage and read RSS feeds with a fast, keyboard-driven interface without ever leaving the command line.

## Key Features

### 🎯 Terminal UI (Main Feature)
- **Two-pane layout**: Left side feed list (30%), right side article detail (70%)
- **Vim-like keybindings**: `j`/`k` (article navigation), `s`/`a` (feed navigation), `v` (open in browser)
- **Auto mark as read**: Automatically marks articles as read when switching feeds or exiting the app
- **Focus on unread articles**: Navigate only through unread articles, automatically exclude read articles
- **Pin feature**: Mark articles for later reading with `p` key, open them all at once with `o` key (livedoor Reader style)
- **Favorite integration**: Automatically pins when favoriting with `f` key (v0.4.0+)
- **Favorites list**: Switch to a dedicated single-pane view for favorite articles with `Shift+F` key
- **Feed rating**: Set feed importance with `0`-`5` keys, display by rating sections
- **Intelligent display**: Expand only the currently selected rating section
- **Help overlay**: Display keyboard shortcut list with `?` key

### ⚙️ CLI Management Features
- Add, update, and delete RSS feeds from the command line
- Article read state management, favorites feature
- Fast feed updates with batch processing
- **Tutorial mode**: Try it out with sample feeds

### 💾 Data Management
- Manage articles, read state, and favorites with local SQLite
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

# Run the latest version directly
npx termfeed tui

# Run specific commands
npx termfeed add https://example.com/feed.rss
npx termfeed update
```

### Install globally with npm

```bash
# Install globally
npm install -g termfeed

# Run
termfeed tui
```

### Build from source

```bash
# Clone the repository
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

#### Startup

```bash
# Try tutorial mode (recommended for first-time users)
termfeed tutorial

# Start RSS reader in TUI mode
termfeed tui
```

#### Tutorial Mode

If you're using termfeed for the first time, tutorial mode is recommended:

```bash
termfeed tutorial
```

- **Sample feeds included**: 4 tech blog feeds are pre-registered
- **In-memory DB**: Data is automatically deleted on exit, perfect for trying out
- **Instant experience**: Try termfeed features immediately without the hassle of registering feeds

#### Keyboard Operations

| Key | Function |
|------|------|
| `j` / `↓` | Move to next article (unread only) |
| `k` / `↑` | Move to previous article (unread only) |
| `s` | Move to next feed |
| `a` | Move to previous feed |
| `v` | Open selected article in browser (background) |
| `f` | Toggle favorite (automatically pins) |
| `Shift+F` | Switch to favorites list view |
| `p` | Toggle pin (mark article for later reading) |
| `o` | Open pinned articles (up to 10 at a time, oldest first) |
| `g` | Scroll to top within article |
| `G` | Scroll to bottom within article |
| `e` | Toggle error details display |
| `r` | Update all feeds |
| `0`-`5` | Set feed rating |
| `?` | Show/hide help |
| `q` | Quit |
| `Ctrl+C` | Force quit |

#### Features

- **Auto mark as read**: The currently selected article is automatically marked as read when you switch feeds (`s`/`a`) or quit (`q`)
- **Focus on unread**: Only unread articles can be navigated with `j`/`k`. Read articles are automatically excluded from the list
- **Priority feed display**: Feeds with unread articles are displayed at the top for efficient checking
- **Background browser**: Terminal focus is maintained even when opening a browser with the `v` key
- **Pin feature**: You can pin articles for later reading with the `p` key, and open up to 10 pinned articles at once with the `o` key. Articles are opened in oldest-first order (FIFO), and pins are automatically removed after opening. Press `o` multiple times to open the next 10 articles. Even if some URLs fail to open, pins for successful URLs are removed
- **Favorite and pin integration**: Automatically pins when you add to favorites with the `f` key. Removing from favorites also removes the pin (v0.4.0+)
- **Favorites list view**: Switch to a dedicated single-pane view for favorite articles with the `Shift+F` key. You can scroll articles, pin/unpin, and remove from favorites

### CLI Commands (For Management)

#### Getting Started

First, try out the features in **tutorial mode**:

```bash
termfeed tutorial
```

#### Feed Management

```bash
# Add an RSS feed
termfeed add <RSS_URL>

# Example: Add popular entries from Hatena Bookmark
termfeed add https://b.hatena.ne.jp/hotentry.rss

# Delete a feed
termfeed rm <FEED_ID>

# Display feed list (with IDs, by rating sections)
termfeed list

# Check feed list in export format
termfeed export -  # Display to stdout
```

#### Reading Articles

**Please use TUI mode (`termfeed tui`).**
In TUI, you can interactively use features such as viewing unread articles, favorites management, opening in browser, and feed ratings.

##### Feed Rating Feature
- Set feed importance with `0`-`5` keys (0=no rating, 5=highest rating)
- Feeds are displayed in sections by rating, sorted in order of high ratings
- Only the section containing the currently selected feed is expanded
- Unread article counts are displayed for each section, optimizing information density

#### Updating Feeds

You can update feeds in the following ways:

- **TUI mode**: After starting `termfeed tui`, press `r` key to update all feeds
- **MCP server**: Use the `update_all_feeds` tool

In TUI, you can check the update status in real-time and immediately view new articles.


#### Exporting/Importing Feeds

```bash
# Export feeds in OPML format (default)
termfeed export
# -> Output to subscriptions.opml

# Export with a specified filename
termfeed export my-feeds.opml

# Export in text format (one URL per line)
termfeed export feeds.txt --format text

# Auto-detect from file extension (.txt → text format)
termfeed export feeds.txt

# Import from OPML file
termfeed import subscriptions.opml

# Import from text file (one URL per line)
termfeed import feeds.txt

# Explicitly specify format
termfeed import feeds.xml --format opml
```

**Supported formats:**
- **OPML format**: Used for data migration between standard RSS readers (.opml, .xml)
- **Text format**: Simple one-URL-per-line format. Supports comment lines (starting with #)

### MCP Server (AI Agent Integration)

termfeed can operate as an MCP (Model Context Protocol) server, allowing AI agents like Claude Code to access article data.

#### Starting the MCP Server

```bash
# Start as MCP server (stdio communication)
termfeed mcp-server
```

#### How to Use with Claude Code

Register as an MCP server in Claude Code:

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

**Tools (execute operations):**
- `update_all_feeds`: Update all feeds to fetch new articles
- `get_article`: Get details (full text) of an individual article by specifying article ID

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
- **Efficient**: Dynamically fetch only the data you need

### Database Location

By default, the SQLite database is created at `~/.local/share/termfeed/termfeed.db` (XDG Base Directory compliant).
You can change the location with the `TERMFEED_DB` environment variable:

```bash
export TERMFEED_DB=/path/to/your/termfeed.db
```

## License

MIT License - See [LICENSE](./LICENSE) for details.
