import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { FeedList } from '../FeedList.js';
import type { FeedWithUnreadCount } from '../../utils/feed-sorter.js';

describe('FeedList', () => {
  const createMockFeed = (
    id: number,
    rating: number = 0,
    unreadCount: number = 10
  ): FeedWithUnreadCount => ({
    id,
    url: `https://example.com/feed${id}`,
    title: `Feed ${id}`,
    description: `Description ${id}`,
    last_updated_at: new Date(),
    created_at: new Date(),
    rating,
    unreadCount,
  });

  describe('スライディングウィンドウページネーション', () => {
    it('同じレーティングに11件のフィードがある場合、最初の10件のみ表示される', () => {
      const feeds = Array.from({ length: 11 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={0} />);

      const output = lastFrame();

      // Feed 1から10までが表示されている
      for (let i = 1; i <= 10; i++) {
        expect(output).toContain(`Feed ${i}`);
      }

      // Feed 11は表示されていない
      expect(output).not.toContain('Feed 11');
    });

    it('11番目のフィードを選択した場合、11番目から10件が表示される', () => {
      const feeds = Array.from({ length: 20 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={10} />);

      const output = lastFrame();

      // Feed 1-10は表示されていない
      for (let i = 1; i <= 10; i++) {
        expect(output).not.toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 11から20までが表示されている
      for (let i = 11; i <= 20; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }
    });

    it('5番目のフィードを選択した場合、5-14番目が表示される', () => {
      const feeds = Array.from({ length: 15 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={4} />);

      const output = lastFrame();

      // Feed 1-4は表示されていない
      for (let i = 1; i <= 4; i++) {
        expect(output).not.toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 5から14までが表示されている
      for (let i = 5; i <= 14; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 15は表示されていない
      expect(output).not.toContain('Feed 15');
    });

    it('最後のフィードを選択した場合、最後の10件が表示される', () => {
      const feeds = Array.from({ length: 20 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={19} />);

      const output = lastFrame();

      // Feed 10以前は表示されていない
      for (let i = 1; i <= 10; i++) {
        expect(output).not.toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 11から20までが表示されている
      for (let i = 11; i <= 20; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }
    });

    it('12番目のフィードを選択した場合、6-15番目が表示される', () => {
      const feeds = Array.from({ length: 15 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={11} />);

      const output = lastFrame();

      // Feed 1-5は表示されていない
      for (let i = 1; i <= 5; i++) {
        expect(output).not.toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 6から15までが表示されている（最後の10件）
      for (let i = 6; i <= 15; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }
    });
  });

  describe('レーティング別の表示', () => {
    it('異なるレーティングのフィードが混在する場合、現在選択中のレーティングセクションのみ展開される', () => {
      const feeds = [
        ...Array.from({ length: 5 }, (_, i) => createMockFeed(i + 1, 5, 10)),
        ...Array.from({ length: 5 }, (_, i) => createMockFeed(i + 6, 3, 10)),
        ...Array.from({ length: 5 }, (_, i) => createMockFeed(i + 11, 1, 10)),
      ];

      // レーティング3のフィード（インデックス5）を選択
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={5} />);

      const output = lastFrame();

      // レーティング5のセクションは表示されているが、フィード一覧は表示されていない
      expect(output).toContain('★★★★★');
      expect(output).not.toMatch(/Feed [1-5](?!\d)/);

      // レーティング3のセクションとフィード一覧が表示されている
      expect(output).toContain('★★★');
      for (let i = 6; i <= 10; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // レーティング1のセクションは表示されているが、フィード一覧は表示されていない
      expect(output).toContain('★');
      expect(output).not.toMatch(/Feed 1[1-5](?!\d)/);
    });

    it('各レーティングセクションで独立してスライディングウィンドウが動作する', () => {
      const feeds = [
        ...Array.from({ length: 15 }, (_, i) => createMockFeed(i + 1, 5, 10)),
        ...Array.from({ length: 15 }, (_, i) => createMockFeed(i + 16, 3, 10)),
      ];

      // レーティング5の最後のフィード（インデックス14）を選択
      const { rerender, lastFrame } = render(<FeedList feeds={feeds} selectedIndex={14} />);

      let output = lastFrame();

      // レーティング5のセクションで最後の10件が表示されている
      expect(output).not.toContain('Feed 5');
      expect(output).toContain('Feed 15');

      // レーティング3の最初のフィード（インデックス15）を選択
      rerender(<FeedList feeds={feeds} selectedIndex={15} />);
      output = lastFrame();

      // レーティング3のセクションで最初の10件が表示されている
      expect(output).toContain('Feed 16');
      expect(output).toContain('Feed 25');
      expect(output).not.toContain('Feed 26');
    });
  });

  describe('未読件数の表示', () => {
    it('フィードごとの未読件数が正しく表示される', () => {
      const feeds = [createMockFeed(1, 3, 5), createMockFeed(2, 3, 0), createMockFeed(3, 3, 100)];

      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={0} />);

      const output = lastFrame();

      expect(output).toContain('Feed 1');
      expect(output).toContain('(5件)');

      expect(output).toContain('Feed 2');
      expect(output).toContain('(0件)');

      expect(output).toContain('Feed 3');
      expect(output).toContain('(100件)');
    });

    it('総未読件数が正しく表示される', () => {
      const feeds = [createMockFeed(1, 5, 10), createMockFeed(2, 5, 20), createMockFeed(3, 3, 30)];

      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={0} />);

      const output = lastFrame();

      expect(output).toContain('フィード一覧 (未読60件)');
    });
  });

  describe('ピン数の表示', () => {
    it('ピン数が0より大きい場合のみ表示される', () => {
      const feeds = [createMockFeed(1, 3, 10)];

      const { lastFrame: withoutPins } = render(
        <FeedList feeds={feeds} selectedIndex={0} pinnedCount={0} />
      );

      expect(withoutPins()).not.toContain('ピン');

      const { lastFrame: withPins } = render(
        <FeedList feeds={feeds} selectedIndex={0} pinnedCount={5} />
      );

      expect(withPins()).toContain('ピン5件');
    });
  });

  describe('選択状態の表示', () => {
    it('選択されたフィードに選択マーカーが表示される', () => {
      const feeds = Array.from({ length: 3 }, (_, i) => createMockFeed(i + 1, 3, 10));

      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={1} />);

      const output = lastFrame();
      const lines = output?.split('\n') || [];

      // Feed 2が選択されている
      const feed2Line = lines.find((line) => line.includes('Feed 2'));
      expect(feed2Line).toContain('>');

      // Feed 1と3は選択されていない
      const feed1Line = lines.find((line) => line.includes('Feed 1'));
      const feed3Line = lines.find((line) => line.includes('Feed 3'));
      expect(feed1Line).not.toContain('>');
      expect(feed3Line).not.toContain('>');
    });
  });

  describe('空の状態', () => {
    it('フィードが登録されていない場合、適切なメッセージが表示される', () => {
      const { lastFrame } = render(<FeedList feeds={[]} selectedIndex={0} />);

      const output = lastFrame();

      expect(output).toContain('フィードが登録されていません');
      expect(output).toContain('ヒント: `termfeed add [URL]` でフィードを追加できます');
    });
  });

  describe('selectedIndexの動作確認', () => {
    it('selectedIndex=0の時、1-10番目が表示される', () => {
      const feeds = Array.from({ length: 15 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={0} />);

      const output = lastFrame();

      // Feed 1-10が表示されている
      for (let i = 1; i <= 10; i++) {
        expect(output).toContain(`Feed ${i}`);
      }
      // Feed 11以降は表示されていない
      expect(output).not.toContain('Feed 11');

      // Feed 1が選択されている（>マーク）
      const lines = output?.split('\n') || [];
      const feed1Line = lines.find((line) => line.includes('Feed 1'));
      expect(feed1Line).toContain('>');
    });

    it('selectedIndex=1の時（2番目のフィード）、2-11番目が表示される', () => {
      const feeds = Array.from({ length: 15 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={1} />);

      const output = lastFrame();

      // Feed 1は表示されていない
      expect(output).not.toMatch(/Feed 1(?!\d)/);

      // Feed 2-11が表示されている
      for (let i = 2; i <= 11; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 12以降は表示されていない
      expect(output).not.toContain('Feed 12');

      // Feed 2が選択されている（>マーク）
      const lines = output?.split('\n') || [];
      const feed2Line = lines.find((line) => line.includes('Feed 2'));
      expect(feed2Line).toContain('>');
    });

    it('selectedIndex=9の時（10番目のフィード）、6-15番目が表示される', () => {
      const feeds = Array.from({ length: 15 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={9} />);

      const output = lastFrame();

      // Feed 1-5は表示されていない
      for (let i = 1; i <= 5; i++) {
        expect(output).not.toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 6-15が表示されている（最後の10件）
      for (let i = 6; i <= 15; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 10が選択されている（>マーク）
      const lines = output?.split('\n') || [];
      const feed10Line = lines.find((line) => line.includes('Feed 10'));
      expect(feed10Line).toContain('>');
    });

    it('selectedIndex=10の時（11番目のフィード）、6-15番目が表示される（15件しかないため）', () => {
      const feeds = Array.from({ length: 15 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={10} />);

      const output = lastFrame();

      // デバッグ出力
      console.log('=== selectedIndex=10の出力 ===');
      console.log(output);
      console.log('=== 終了 ===');

      // Feed 1-5は表示されていない
      for (let i = 1; i <= 5; i++) {
        expect(output).not.toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 6-15が表示されている（最後の10件）
      for (let i = 6; i <= 15; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 11が選択されている（>マーク）
      const lines = output?.split('\n') || [];
      const feed11Line = lines.find((line) => line.includes('Feed 11'));
      expect(feed11Line).toContain('>');
    });

    it('selectedIndex=10の時（11番目のフィード）、20件ある場合は11-20番目が表示される', () => {
      const feeds = Array.from({ length: 20 }, (_, i) => createMockFeed(i + 1, 3, 10));
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={10} />);

      const output = lastFrame();

      // Feed 1-10は表示されていない
      for (let i = 1; i <= 10; i++) {
        expect(output).not.toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 11-20が表示されている
      for (let i = 11; i <= 20; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 11が選択されている（>マーク）
      const lines = output?.split('\n') || [];
      const feed11Line = lines.find((line) => line.includes('Feed 11'));
      expect(feed11Line).toContain('>');
    });

    it('グローバルインデックスからセクション内インデックスへの変換が正しく動作する', () => {
      // 異なるレーティングのフィードを作成
      const feeds = [
        ...Array.from({ length: 5 }, (_, i) => createMockFeed(i + 1, 5, 10)), // rating 5
        ...Array.from({ length: 15 }, (_, i) => createMockFeed(i + 6, 3, 10)), // rating 3
      ];

      // rating 3セクションの11番目（グローバルインデックス15）を選択
      const { lastFrame } = render(<FeedList feeds={feeds} selectedIndex={15} />);

      const output = lastFrame();

      // デバッグ出力
      console.log('=== rating混在時のselectedIndex=15の出力 ===');
      console.log(output);
      console.log('=== 終了 ===');

      // rating 5のフィードは表示されていない（折りたたまれている）
      expect(output).not.toMatch(/Feed [1-5](?!\d)/);

      // rating 3のFeed 11-20が表示されている（最後の10件）
      for (let i = 11; i <= 20; i++) {
        expect(output).toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 6-10は表示されていない
      for (let i = 6; i <= 10; i++) {
        expect(output).not.toMatch(new RegExp(`Feed ${i}(?!\\d)`));
      }

      // Feed 16が選択されている（>マーク）
      const lines = output?.split('\n') || [];
      const feed16Line = lines.find((line) => line.includes('Feed 16'));
      expect(feed16Line).toContain('>');
    });
  });
});
