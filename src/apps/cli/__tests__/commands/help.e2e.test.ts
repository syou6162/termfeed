import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PATH = path.join(__dirname, '../../../../../dist/cli.js');

describe('help command E2E', () => {
  it('should match help output snapshot', () => {
    const result = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });
    expect(result).toMatchSnapshot();
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

  it('should match tutorial command help snapshot', () => {
    const result = execSync(`node ${CLI_PATH} tutorial --help`, { encoding: 'utf-8' });
    expect(result).toMatchSnapshot();
  });
});
