import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import { openUrlInBrowser, validateUrl, getBrowserCommand } from './browser.js';

// child_processをモック
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// モックのChildProcessオブジェクトの型定義
type MockChildProcess = Pick<ChildProcess, 'on' | 'unref'> & {
  on: MockedFunction<ChildProcess['on']>;
  unref: MockedFunction<ChildProcess['unref']>;
};

describe('browser utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateUrl', () => {
    it('HTTPのURLを有効と判定する', () => {
      expect(validateUrl('http://example.com')).toBe(true);
    });

    it('HTTPSのURLを有効と判定する', () => {
      expect(validateUrl('https://example.com')).toBe(true);
    });

    it('前後の空白があっても有効と判定する', () => {
      expect(validateUrl('  https://example.com  ')).toBe(true);
    });

    it('HTTP/HTTPS以外のURLを無効と判定する', () => {
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('file:///path/to/file')).toBe(false);
      expect(validateUrl('example.com')).toBe(false);
    });
  });

  describe('getBrowserCommand', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: false,
      });
    });

    it('macOSでは正しいコマンドを返す', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: false,
      });

      const result = getBrowserCommand('https://example.com');
      expect(result).toEqual({
        command: 'open',
        args: ['-g', 'https://example.com'],
      });
    });

    it('Windowsでは正しいコマンドを返す', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: false,
      });

      const result = getBrowserCommand('https://example.com');
      expect(result).toEqual({
        command: 'cmd',
        args: ['/c', 'start', '/min', 'https://example.com'],
      });
    });

    it('Linux/Unixでは正しいコマンドを返す', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: false,
      });

      const result = getBrowserCommand('https://example.com');
      expect(result).toEqual({
        command: 'xdg-open',
        args: ['https://example.com'],
      });
    });
  });

  describe('openUrlInBrowser', () => {
    it('単一のURLを開ける', async () => {
      const mockChildProcess: MockChildProcess = {
        on: vi.fn(),
        unref: vi.fn(),
      } as unknown as MockChildProcess;
      vi.mocked(spawn).mockReturnValue(mockChildProcess as unknown as ChildProcess);

      const promise = openUrlInBrowser('https://example.com');

      // setTimeoutが実行されるのを待つ
      vi.advanceTimersByTime(0);

      // process.nextTickを実行
      await vi.runOnlyPendingTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      expect(spawn).toHaveBeenCalledWith('open', ['-g', 'https://example.com'], {
        stdio: 'ignore',
        detached: true,
      });
    });

    it('複数のURLを順次開ける', async () => {
      const mockChildProcess: MockChildProcess = {
        on: vi.fn(),
        unref: vi.fn(),
      } as unknown as MockChildProcess;
      vi.mocked(spawn).mockReturnValue(mockChildProcess as unknown as ChildProcess);

      const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com'];
      const promise = openUrlInBrowser(urls);

      // 各URLに対してsetTimeoutが実行される
      vi.advanceTimersByTime(0); // 1つ目のURL
      vi.advanceTimersByTime(100); // 2つ目のURL
      vi.advanceTimersByTime(100); // 3つ目のURL

      // process.nextTickを実行
      await vi.runOnlyPendingTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      expect(spawn).toHaveBeenCalledTimes(3);
    });

    it('無効なURLがあってもエラー詳細を含めて投げる', async () => {
      const urls = ['invalid-url', 'https://valid.com'];
      const mockChildProcess: MockChildProcess = {
        on: vi.fn(),
        unref: vi.fn(),
      } as unknown as MockChildProcess;
      vi.mocked(spawn).mockReturnValue(mockChildProcess as unknown as ChildProcess);

      const promise = openUrlInBrowser(urls);

      // Promiseが拒否されることを確認し、エラー詳細も検証
      const expectPromise = expect(promise).rejects.toMatchObject({
        message: '一部のURLを開けませんでした (1/2件失敗): invalid-url',
        result: {
          succeeded: ['https://valid.com'],
          failed: [
            {
              url: 'invalid-url',
              error: expect.objectContaining({
                message: '無効なURLです: invalid-url',
              }) as Error,
            },
          ],
        },
      } as Error & { result: unknown });

      // タイマーを進める
      vi.advanceTimersByTime(200);
      await vi.runOnlyPendingTimersAsync();

      // expectの結果を待つ
      await expectPromise;
    });

    it('ブラウザ起動エラーがあっても他のURLは処理する', async () => {
      const urls = ['https://fail.com', 'https://success.com'];
      const failedChildProcess: MockChildProcess = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            // 次のティックでエラーを発生させる
            process.nextTick(() => (callback as (error: Error) => void)(new Error('spawn failed')));
          }
        }),
        unref: vi.fn(),
      } as unknown as MockChildProcess;
      const successChildProcess: MockChildProcess = {
        on: vi.fn(),
        unref: vi.fn(),
      } as unknown as MockChildProcess;

      vi.mocked(spawn)
        .mockReturnValueOnce(failedChildProcess as unknown as ChildProcess)
        .mockReturnValueOnce(successChildProcess as unknown as ChildProcess);

      const promise = openUrlInBrowser(urls);

      // Promiseが拒否されることを確認し、エラー詳細も検証
      const expectPromise = expect(promise).rejects.toMatchObject({
        message: '一部のURLを開けませんでした (1/2件失敗): https://fail.com',
        result: {
          succeeded: ['https://success.com'],
          failed: [
            {
              url: 'https://fail.com',
              error: expect.objectContaining({
                message: 'ブラウザの起動に失敗しました: spawn failed',
              }) as Error,
            },
          ],
        },
      } as Error & { result: unknown });

      // タイマーを進める
      vi.advanceTimersByTime(200);
      await vi.runOnlyPendingTimersAsync();

      // expectの結果を待つ
      await expectPromise;
    });

    it('空の配列を渡した場合は何もしない', async () => {
      const promise = openUrlInBrowser([]);
      await expect(promise).resolves.toBeUndefined();
      expect(spawn).not.toHaveBeenCalled();
    });
  });
});
