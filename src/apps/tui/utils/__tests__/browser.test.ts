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

    it('有効なURLでブラウザを起動する', () => {
      openUrlInBrowser('https://example.com');

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

    it('無効なURLでエラーをスローする', () => {
      expect(() => openUrlInBrowser('invalid-url')).toThrow('無効なURLです: invalid-url');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('URLの前後の空白を削除する', () => {
      openUrlInBrowser('  https://example.com  ');

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['https://example.com']),
        expect.any(Object)
      );
    });

    it('エラーハンドラを設定する', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      openUrlInBrowser('https://example.com');

      // エラーハンドラが設定されていることを確認
      expect(mockChildProcess.on).toHaveBeenCalledWith('error', expect.any(Function));

      // エラーハンドラを実行
      const errorHandler = mockChildProcess.on.mock.calls[0][1] as (error: Error) => void;
      const testError = new Error('Test error');
      errorHandler(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('ブラウザの起動に失敗しました:', 'Test error');
      consoleErrorSpy.mockRestore();
    });

    it('各プラットフォームで正しいコマンドを使用する', () => {
      const platforms = [
        { platform: 'darwin', expectedCommand: 'open' },
        { platform: 'win32', expectedCommand: 'cmd' },
        { platform: 'linux', expectedCommand: 'xdg-open' },
      ];

      platforms.forEach(({ platform, expectedCommand }) => {
        vi.clearAllMocks();
        Object.defineProperty(process, 'platform', {
          value: platform,
          configurable: true,
        });

        openUrlInBrowser('https://example.com');

        expect(mockSpawn).toHaveBeenCalledWith(
          expectedCommand,
          expect.any(Array),
          expect.any(Object)
        );
      });
    });
  });
});
