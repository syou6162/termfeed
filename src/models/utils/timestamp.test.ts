import { describe, it, expect } from 'vitest';
import { dateToUnixSeconds, nowInUnixSeconds, unixSecondsToDate } from './timestamp.js';

describe('timestamp utilities', () => {
  describe('dateToUnixSeconds', () => {
    it('正常な日時を秒単位のUNIXタイムスタンプに変換できる', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const expected = 1704067200; // 2024-01-01 00:00:00 UTC
      expect(dateToUnixSeconds(date)).toBe(expected);
    });

    it('ミリ秒を切り捨てて変換する', () => {
      const date = new Date('2024-01-01T00:00:00.999Z');
      const expected = 1704067200; // ミリ秒部分は切り捨て
      expect(dateToUnixSeconds(date)).toBe(expected);
    });

    it('エポック時刻を正しく変換できる', () => {
      const date = new Date(0);
      expect(dateToUnixSeconds(date)).toBe(0);
    });

    it('将来の日時を正しく変換できる', () => {
      const date = new Date('2050-12-31T23:59:59.000Z');
      const expected = 2556143999;
      expect(dateToUnixSeconds(date)).toBe(expected);
    });

    it('無効なDateオブジェクトでエラーを投げる', () => {
      const invalidDate = new Date('invalid');
      expect(() => dateToUnixSeconds(invalidDate)).toThrow('Invalid date object');
    });
  });

  describe('unixSecondsToDate', () => {
    it('秒単位のUNIXタイムスタンプをDateオブジェクトに変換できる', () => {
      const timestamp = 1704067200; // 2024-01-01 00:00:00 UTC
      const expected = new Date('2024-01-01T00:00:00.000Z');
      expect(unixSecondsToDate(timestamp)).toEqual(expected);
    });

    it('エポック時刻を正しく変換できる', () => {
      expect(unixSecondsToDate(0)).toEqual(new Date(0));
    });

    it('将来のタイムスタンプを正しく変換できる', () => {
      const timestamp = 2556143999; // 2050-12-31 23:59:59 UTC
      const expected = new Date('2050-12-31T23:59:59.000Z');
      expect(unixSecondsToDate(timestamp)).toEqual(expected);
    });

    it('NaNでエラーを投げる', () => {
      expect(() => unixSecondsToDate(NaN)).toThrow('Invalid timestamp: must be a finite number');
    });

    it('Infinityでエラーを投げる', () => {
      expect(() => unixSecondsToDate(Infinity)).toThrow(
        'Invalid timestamp: must be a finite number'
      );
    });

    it('負の値でエラーを投げる', () => {
      expect(() => unixSecondsToDate(-1)).toThrow('Invalid timestamp: must not be negative');
    });
  });

  describe('nowInUnixSeconds', () => {
    it('現在時刻を秒単位で返す', () => {
      const before = Math.floor(Date.now() / 1000);
      const result = nowInUnixSeconds();
      const after = Math.floor(Date.now() / 1000);

      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it('整数値を返す', () => {
      const result = nowInUnixSeconds();
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('相互変換の整合性', () => {
    it('DateからタイムスタンプそしてDateへの変換で同じ秒精度の時刻になる', () => {
      const originalDate = new Date('2024-06-15T12:34:56.789Z');
      const timestamp = dateToUnixSeconds(originalDate);
      const convertedDate = unixSecondsToDate(timestamp);

      // 秒単位で切り捨てられた時刻と一致することを確認
      const expectedDate = new Date('2024-06-15T12:34:56.000Z');
      expect(convertedDate).toEqual(expectedDate);
    });

    it('複数の日時で相互変換が正しく動作する', () => {
      const testDates = [
        new Date('1970-01-01T00:00:00.000Z'), // エポック
        new Date('2000-01-01T00:00:00.000Z'), // 2000年
        new Date('2024-12-31T23:59:59.999Z'), // 年末
        new Date('2025-01-01T00:00:00.000Z'), // 年始
      ];

      testDates.forEach((originalDate) => {
        const timestamp = dateToUnixSeconds(originalDate);
        const convertedDate = unixSecondsToDate(timestamp);

        // 秒精度で比較
        expect(Math.floor(convertedDate.getTime() / 1000)).toBe(
          Math.floor(originalDate.getTime() / 1000)
        );
      });
    });
  });
});
