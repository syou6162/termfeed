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

export function openUrlInBrowser(url: string | string[]): Promise<void> {
  // 単一URLの場合は配列に変換
  const urls = Array.isArray(url) ? url : [url];

  // URLが空の場合は何もしない
  if (urls.length === 0) {
    return Promise.resolve();
  }

  // 各URLを順次開く
  const openPromises = urls.map((singleUrl, index) => {
    return new Promise<void>((resolve, reject) => {
      // 少し遅延を入れて順次開く（同時に大量に開くのを防ぐ）
      setTimeout(() => {
        const trimmedUrl = singleUrl.trim();

        if (!validateUrl(trimmedUrl)) {
          reject(new Error(`無効なURLです: ${trimmedUrl}`));
          return;
        }

        const { command, args } = getBrowserCommand(trimmedUrl);

        const childProcess = spawn(command, args, {
          stdio: 'ignore',
          detached: true,
        });

        let hasError = false;

        childProcess.on('error', (error) => {
          hasError = true;
          reject(new Error(`ブラウザの起動に失敗しました: ${error.message}`));
        });

        // spawnイベントが完了するまで少し待つ
        process.nextTick(() => {
          if (!hasError) {
            childProcess.unref();
            resolve();
          }
        });
      }, index * 100); // 100ms間隔で開く
    });
  });

  return Promise.all(openPromises).then(() => undefined);
}
