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

export type OpenUrlResult = {
  succeeded: string[];
  failed: Array<{ url: string; error: Error }>;
};

export function openUrlInBrowser(url: string | string[]): Promise<void> {
  // 単一URLの場合は配列に変換
  const urls = Array.isArray(url) ? url : [url];

  // URLが空の場合は何もしない
  if (urls.length === 0) {
    return Promise.resolve();
  }

  const result: OpenUrlResult = {
    succeeded: [],
    failed: [],
  };

  // 各URLを順次開く（Promise.allSettledで一部失敗しても続行）
  const openPromises = urls.map((singleUrl, index) => {
    return new Promise<{ url: string; success: boolean; error?: Error }>((resolve) => {
      // 少し遅延を入れて順次開く（同時に大量に開くのを防ぐ）
      setTimeout(() => {
        const trimmedUrl = singleUrl.trim();

        if (!validateUrl(trimmedUrl)) {
          resolve({
            url: singleUrl,
            success: false,
            error: new Error(`無効なURLです: ${trimmedUrl}`),
          });
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
          resolve({
            url: singleUrl,
            success: false,
            error: new Error(`ブラウザの起動に失敗しました: ${error.message}`),
          });
        });

        // spawnイベントが完了するまで少し待つ
        process.nextTick(() => {
          if (!hasError) {
            childProcess.unref();
            resolve({ url: singleUrl, success: true });
          }
        });
      }, index * 100); // 100ms間隔で開く
    });
  });

  return Promise.all(openPromises).then((results) => {
    // 結果を集計
    results.forEach((res) => {
      if (res.success) {
        result.succeeded.push(res.url);
      } else {
        result.failed.push({ url: res.url, error: res.error! });
      }
    });

    // 失敗があった場合はエラーをスロー（成功したURLの情報も含む）
    if (result.failed.length > 0) {
      const failedUrls = result.failed.map((f) => f.url).join(', ');
      const error = new Error(
        `一部のURLを開けませんでした (${result.failed.length}/${urls.length}件失敗): ${failedUrls}`
      ) as Error & { result: OpenUrlResult };
      // エラーオブジェクトに詳細情報を付加
      error.result = result;
      throw error;
    }
  });
}
