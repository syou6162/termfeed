import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateUrl, getBrowserCommand, openUrlInBrowser } from '../browser.js';
import { spawn } from 'child_process';

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    unref: vi.fn(),
  })),
}));

describe('browser utilities', () => {
  describe('validateUrl', () => {
    it('http URLを有効と判定する', () => {
      expect(validateUrl('http://example.com')).toBe(true);
    });

    it('https URLを有効と判定する', () => {
      expect(validateUrl('https://example.com')).toBe(true);
    });

    it('前後の空白を無視する', () => {
      expect(validateUrl('  https://example.com  ')).toBe(true);
    });

    it('httpやhttps以外のURLを無効と判定する', () => {
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('file:///path/to/file')).toBe(false);
      expect(validateUrl('javascript:alert("test")')).toBe(false);
      expect(validateUrl('example.com')).toBe(false);
    });

    it('空文字列を無効と判定する', () => {
      expect(validateUrl('')).toBe(false);
      expect(validateUrl('  ')).toBe(false);
    });
  });

  describe('getBrowserCommand', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
      });
    });

    it('macOSでは open コマンドを使用する', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const result = getBrowserCommand('https://example.com');
      expect(result).toEqual({
        command: 'open',
        args: ['-g', 'https://example.com'],
      });
    });

    it('Windowsでは cmd コマンドを使用する', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      const result = getBrowserCommand('https://example.com');
      expect(result).toEqual({
        command: 'cmd',
        args: ['/c', 'start', '/min', 'https://example.com'],
      });
    });

    it('Linux/Unixでは xdg-open コマンドを使用する', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      const result = getBrowserCommand('https://example.com');
      expect(result).toEqual({
        command: 'xdg-open',
        args: ['https://example.com'],
      });
    });
  });

  describe('openUrlInBrowser', () => {
    const mockSpawn = vi.mocked(spawn);
    let mockChildProcess: {
      on: ReturnType<typeof vi.fn>;
      unref: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockChildProcess = {
        on: vi.fn(),
        unref: vi.fn(),
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      mockSpawn.mockReturnValue(mockChildProcess as any);
    });

    it('有効なURLでブラウザを起動する', async () => {
      await openUrlInBrowser('https://example.com');

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['https://example.com']),
        {
          stdio: 'ignore',
          detached: true,
        }
      );
      expect(mockChildProcess.unref).toHaveBeenCalled();
    });

    it('無効なURLでエラーをスローする', async () => {
      await expect(openUrlInBrowser('invalid-url')).rejects.toThrow(
        '一部のURLを開けませんでした (1/1件失敗): invalid-url'
      );
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('URLの前後の空白を削除する', async () => {
      await openUrlInBrowser('  https://example.com  ');

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['https://example.com']),
        expect.any(Object)
      );
    });

    it('ブラウザ起動エラーをrejectする', async () => {
      mockChildProcess.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          // process.nextTickで実行されるため、即座にエラーを発生させる
          process.nextTick(() => {
            (handler as (error: Error) => void)(new Error('Test error'));
          });
        }
        return mockChildProcess;
      });

      await expect(openUrlInBrowser('https://example.com')).rejects.toThrow(
        '一部のURLを開けませんでした (1/1件失敗): https://example.com'
      );
    });

    it('各プラットフォームで正しいコマンドを使用する', async () => {
      const platforms = [
        { platform: 'darwin', expectedCommand: 'open' },
        { platform: 'win32', expectedCommand: 'cmd' },
        { platform: 'linux', expectedCommand: 'xdg-open' },
      ];

      for (const { platform, expectedCommand } of platforms) {
        vi.clearAllMocks();
        Object.defineProperty(process, 'platform', {
          value: platform,
          configurable: true,
        });

        await openUrlInBrowser('https://example.com');

        expect(mockSpawn).toHaveBeenCalledWith(
          expectedCommand,
          expect.any(Array),
          expect.any(Object)
        );
      }
    });
  });
});
