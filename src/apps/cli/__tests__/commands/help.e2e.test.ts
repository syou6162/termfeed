import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PATH = path.join(__dirname, '../../../../../dist/cli.js');

describe('help command E2E', () => {
  it('should display main help message with --help flag', () => {
    const result = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });

    // メインのヘルプメッセージが表示されることを確認
    expect(result).toContain('Usage: termfeed [options] [command]');
    expect(result).toContain('A terminal-based RSS reader with Vim-like keybindings');

    // オプションが表示されることを確認
    expect(result).toContain('-V, --version');
    expect(result).toContain('-h, --help');
    expect(result).toContain('display help for command');

    // コマンドが表示されることを確認
    expect(result).toContain('add [options] <url>');
    expect(result).toContain('Add a new RSS feed');
    expect(result).toContain('rm <feedId>');
    expect(result).toContain('Remove RSS feed by ID');
    expect(result).toContain('tui');
    expect(result).toContain('Start RSS reader in TUI mode');
    expect(result).toContain('export [options] [file]');
    expect(result).toContain('Export feed subscriptions to OPML or text file');
    expect(result).toContain('import [options] <file>');
    expect(result).toContain('Import feed subscriptions from OPML or text file');
    expect(result).toContain('mcp-server');
    expect(result).toContain('Start MCP server to expose termfeed data to LLM');
    expect(result).toContain('help [command]');
    expect(result).toContain('Display help for command');
  });

  it('should display help message with help command', () => {
    const result = execSync(`node ${CLI_PATH} help`, { encoding: 'utf-8' });

    // helpコマンドでも同じメッセージが表示されることを確認
    expect(result).toContain('Usage: termfeed [options] [command]');
    expect(result).toContain('A terminal-based RSS reader with Vim-like keybindings');
  });

  it('should match add command help snapshot', () => {
    const result = execSync(`node ${CLI_PATH} add --help`, { encoding: 'utf-8' });
    expect(result).toMatchSnapshot();
  });

  it('should match rm command help snapshot', () => {
    const result = execSync(`node ${CLI_PATH} rm --help`, { encoding: 'utf-8' });
    expect(result).toMatchSnapshot();
  });

  it('should match tui command help snapshot', () => {
    const result = execSync(`node ${CLI_PATH} tui --help`, { encoding: 'utf-8' });
    expect(result).toMatchSnapshot();
  });

  it('should match export command help snapshot', () => {
    const result = execSync(`node ${CLI_PATH} export --help`, { encoding: 'utf-8' });
    expect(result).toMatchSnapshot();
  });

  it('should match import command help snapshot', () => {
    const result = execSync(`node ${CLI_PATH} import --help`, { encoding: 'utf-8' });
    expect(result).toMatchSnapshot();
  });

  it('should match mcp-server command help snapshot', () => {
    const result = execSync(`node ${CLI_PATH} mcp-server --help`, { encoding: 'utf-8' });
    expect(result).toMatchSnapshot();
  });

  it('should match help output snapshot', () => {
    const result = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });
    expect(result).toMatchSnapshot();
  });
});
