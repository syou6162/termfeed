import { describe, it, expect } from 'vitest';
import { calculateSlidingWindow } from '../useSlidingWindow.js';

describe('calculateSlidingWindow', () => {
  describe('基本的な動作', () => {
    it('アイテム数がwindowSize以下の場合、すべてのアイテムを返す', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 0);

      expect(result.visibleItems).toHaveLength(5);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(5);
      expect(result.totalItems).toBe(5);
      expect(result.isWindowActive).toBe(false);
    });

    it('アイテム数がwindowSizeを超える場合、指定数のアイテムを返す', () => {
      const items = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 0);

      expect(result.visibleItems).toHaveLength(10);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(10);
      expect(result.totalItems).toBe(15);
      expect(result.isWindowActive).toBe(true);
    });
  });

  describe('スライディングウィンドウの動作', () => {
    it('選択されたアイテムを先頭にして指定数のアイテムを返す', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 10);

      expect(result.visibleItems).toHaveLength(10);
      expect(result.visibleItems[0].id).toBe(11);
      expect(result.visibleItems[9].id).toBe(20);
      expect(result.startIndex).toBe(10);
      expect(result.endIndex).toBe(20);
    });

    it('末尾に近い場合、最後のwindowSize分のアイテムを返す', () => {
      const items = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 10);

      // 11番目を選択しても、6-15番目が表示される（末尾調整）
      expect(result.visibleItems).toHaveLength(10);
      expect(result.visibleItems[0].id).toBe(6);
      expect(result.visibleItems[9].id).toBe(15);
      expect(result.startIndex).toBe(5);
      expect(result.endIndex).toBe(15);
    });

    it('最初のアイテムを選択した場合、先頭から表示', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 0);

      expect(result.visibleItems[0].id).toBe(1);
      expect(result.visibleItems[9].id).toBe(10);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(10);
    });

    it('最後のアイテムを選択した場合、最後のwindowSize分を表示', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 19);

      expect(result.visibleItems).toHaveLength(10);
      expect(result.visibleItems[0].id).toBe(11);
      expect(result.visibleItems[9].id).toBe(20);
      expect(result.startIndex).toBe(10);
      expect(result.endIndex).toBe(20);
    });
  });

  describe('カスタムwindowSize', () => {
    it('カスタムwindowSizeが正しく適用される', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 5, { windowSize: 5 });

      expect(result.visibleItems).toHaveLength(5);
      expect(result.visibleItems[0].id).toBe(6);
      expect(result.visibleItems[4].id).toBe(10);
    });

    it('windowSizeが総アイテム数より大きい場合、すべてのアイテムを返す', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 2, { windowSize: 20 });

      expect(result.visibleItems).toHaveLength(5);
      expect(result.isWindowActive).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('空の配列を処理できる', () => {
      const result = calculateSlidingWindow([], 0);

      expect(result.visibleItems).toHaveLength(0);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.isWindowActive).toBe(false);
    });

    it('selectedIndexが範囲外の場合でもエラーにならない', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 10);

      expect(result.visibleItems).toHaveLength(5);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(5);
    });

    it('ちょうどwindowSizeのアイテム数の場合', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const result = calculateSlidingWindow(items, 5);

      expect(result.visibleItems).toHaveLength(10);
      expect(result.isWindowActive).toBe(false);
      expect(result.visibleItems[0].id).toBe(1);
      expect(result.visibleItems[9].id).toBe(10);
    });

    it('windowSize + 1のアイテム数の場合の境界動作', () => {
      const items = Array.from({ length: 11 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

      // 最初のアイテムを選択
      const result1 = calculateSlidingWindow(items, 0);
      expect(result1.visibleItems).toHaveLength(10);
      expect(result1.visibleItems[0].id).toBe(1);
      expect(result1.visibleItems[9].id).toBe(10);

      // 2番目のアイテムを選択
      const result2 = calculateSlidingWindow(items, 1);
      expect(result2.visibleItems).toHaveLength(10);
      expect(result2.visibleItems[0].id).toBe(2);
      expect(result2.visibleItems[9].id).toBe(11);
    });
  });
});
