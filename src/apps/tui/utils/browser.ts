import { spawn } from 'child_process';

export type BrowserCommand = {
  command: string;
  args: string[];
};

export function validateUrl(url: string): boolean {
  const trimmedUrl = url.trim();
  return trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');
}

export function getBrowserCommand(url: string): BrowserCommand {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS - バックグラウンドで開く
    return {
      command: 'open',
      args: ['-g', url],
    };
  } else if (platform === 'win32') {
    // Windows - 最小化で開く
    return {
      command: 'cmd',
      args: ['/c', 'start', '/min', url],
    };
  } else {
    // Linux/Unix - バックグラウンドで開く
    return {
      command: 'xdg-open',
      args: [url],
    };
  }
}

export function openUrlInBrowser(url: string): void {
  const trimmedUrl = url.trim();

  if (!validateUrl(trimmedUrl)) {
    throw new Error(`無効なURLです: ${trimmedUrl}`);
  }

  const { command, args } = getBrowserCommand(trimmedUrl);

  const childProcess = spawn(command, args, {
    stdio: 'ignore',
    detached: true,
  });

  childProcess.on('error', (error) => {
    console.error('ブラウザの起動に失敗しました:', error.message);
  });

  // プロセスを親から切り離す
  childProcess.unref();
}
