import { describe, it, expect } from 'vitest';
import { convertHtmlToText, truncateText, formatSummary, wrapText } from './html';

describe('convertHtmlToText', () => {
  it('空文字列の処理', () => {
    expect(convertHtmlToText('')).toBe('');
  });

  it('プレーンテキストはそのまま返す', () => {
    expect(convertHtmlToText('Hello World')).toBe('Hello World');
  });

  it('scriptタグを削除', () => {
    const html = 'Text before<script>console.log("test");</script>Text after';
    expect(convertHtmlToText(html)).toBe('Text beforeText after');
  });

  it('styleタグを削除', () => {
    const html = 'Text before<style>body { color: red; }</style>Text after';
    expect(convertHtmlToText(html)).toBe('Text beforeText after');
  });

  it('見出しタグの処理（前後に改行）', () => {
    const html = '<h1>Title</h1>';
    const result = convertHtmlToText(html);
    expect(result).toBe(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nTitle\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );
  });

  it('H2タグの処理', () => {
    const html = '<h2>Subtitle</h2>';
    const result = convertHtmlToText(html);
    expect(result).toBe('■ Subtitle');
  });

  it('H3タグの処理', () => {
    const html = '<h3>Section</h3>';
    const result = convertHtmlToText(html);
    expect(result).toBe('▶ Section');
  });

  it('H4-H6タグの処理', () => {
    const html = '<h4>Subsection</h4>';
    const result = convertHtmlToText(html);
    expect(result).toBe('● Subsection');
  });

  it('パラグラフタグの処理', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';
    const result = convertHtmlToText(html);
    expect(result).toBe('First paragraph\n\nSecond paragraph');
  });

  it('divタグの処理', () => {
    const html = '<div>First section</div><div>Second section</div>';
    expect(convertHtmlToText(html)).toBe('First section\n\nSecond section');
  });

  it('リストアイテムの処理（箇条書き記号付き）', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    expect(convertHtmlToText(html)).toBe('• Item 1\n\n  • Item 2');
  });

  it('改行タグの処理', () => {
    const html = 'Line 1<br>Line 2';
    const result = convertHtmlToText(html);
    expect(result).toBe('Line 1\n\nLine 2');
  });

  it('HTMLエンティティのデコード', () => {
    const html = '&lt;code&gt; &amp; &quot;quotes&quot; &#39;apostrophe&#39;';
    expect(convertHtmlToText(html)).toBe('<code> & "quotes" \'apostrophe\'');
  });

  it('複雑なHTML構造の処理', () => {
    const html = `
      <h1>Main Title</h1>
      <p>This is a paragraph with <strong>bold</strong> text.</p>
      <h2>Subtitle</h2>
      <ul>
        <li>First item</li>
        <li>Second item</li>
      </ul>
      <p>Another paragraph</p>
    `;
    const result = convertHtmlToText(html);
    const expected =
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nMain Title\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n      \n\nThis is a paragraph with bold text.\n\n      \n\n■ Subtitle\n\n      \n\n          • First item\n\n          • Second item\n\n      \n\n      \n\nAnother paragraph';
    expect(result).toBe(expected);
  });

  it('連続する改行を適切に処理', () => {
    const html = '<p>Text</p><p>More text</p>';
    const result = convertHtmlToText(html);
    expect(result).toBe('Text\n\nMore text');
  });

  it('ネストされたリストの処理', () => {
    const html =
      '<ul><li>Item 1<ul><li>Nested 1</li><li>Nested 2</li></ul></li><li>Item 2</li></ul>';
    const result = convertHtmlToText(html);
    expect(result).toBe('• Item 1\n\n  • Nested 1\n\n  • Nested 2\n\n  • Item 2');
  });

  it('順序付きリスト（ol）の処理', () => {
    const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
    const result = convertHtmlToText(html);
    expect(result).toBe('• First\n\n  • Second\n\n  • Third');
  });

  it('インラインタグ（strong, em, a）の削除', () => {
    const html = 'This is <strong>bold</strong>, <em>italic</em>, and <a href="#">link</a> text.';
    expect(convertHtmlToText(html)).toBe('This is bold, italic, and link text.');
  });

  it('画像タグの処理', () => {
    const html = 'Before <img src="test.jpg" alt="Test Image"> After';
    expect(convertHtmlToText(html)).toBe('Before  After');
  });

  it('テーブルタグの処理', () => {
    const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
    expect(convertHtmlToText(html)).toBe('Cell 1Cell 2');
  });

  it('コメントの削除', () => {
    const html = 'Before <!-- This is a comment --> After';
    // HTMLコメントも通常のタグとして削除される
    expect(convertHtmlToText(html)).toBe('Before  After');
  });

  it('preタグ内のテキストの保持', () => {
    const html = '<pre>  Formatted\n    Text\n      With Spaces</pre>';
    const result = convertHtmlToText(html);
    expect(result).toContain('Formatted');
    expect(result).toContain('Text');
    expect(result).toContain('With Spaces');
  });

  it('空のタグの処理', () => {
    const html = '<p></p><div></div><br><p>Content</p>';
    // 空のp/divタグは改行、brは改行、最後のpは内容+改行
    // 連続改行は\n\nに統一され、trim()で前後の空白削除
    expect(convertHtmlToText(html)).toBe('Content');
  });

  it('特殊なHTMLエンティティの処理', () => {
    const html = '&copy; &reg; &trade; &hellip; &mdash; &ndash;';
    const result = convertHtmlToText(html);
    // 現在の実装では処理されないが、将来的に対応する可能性
    expect(result).toBe('&copy; &reg; &trade; &hellip; &mdash; &ndash;');
  });

  it('複数の空白文字の処理', () => {
    const html = 'Multiple   spaces   and&nbsp;&nbsp;&nbsp;non-breaking spaces';
    expect(convertHtmlToText(html)).toBe('Multiple   spaces   and   non-breaking spaces');
  });

  it('改行を含むパラグラフの処理', () => {
    const html = '<p>First line\nSecond line\nThird line</p>';
    expect(convertHtmlToText(html)).toBe('First line\n\nSecond line\n\nThird line');
  });

  it('blockquoteタグの処理', () => {
    const html = '<blockquote>This is a quote</blockquote>';
    const result = convertHtmlToText(html);
    expect(result).toBe('「This is a quote」');
  });

  it('figureタグの処理（削除）', () => {
    const html = 'Before <figure><img src="test.jpg"></figure> After';
    const result = convertHtmlToText(html);
    expect(result).toBe('Before \n\n After');
  });

  it('iframeタグの処理（削除）', () => {
    const html = 'Before <iframe src="test.html"></iframe> After';
    const result = convertHtmlToText(html);
    expect(result).toBe('Before \n\n After');
  });
});

describe('truncateText', () => {
  it('短いテキストはそのまま返す', () => {
    expect(truncateText('Short text', 20)).toBe('Short text');
  });

  it('長いテキストは切り詰めて省略記号を追加', () => {
    expect(truncateText('This is a very long text', 10)).toBe('This is...');
  });

  it('境界値での動作', () => {
    expect(truncateText('12345', 5)).toBe('12345');
    expect(truncateText('123456', 5)).toBe('12...');
  });
});

describe('formatSummary', () => {
  it('undefined入力で空文字列を返す', () => {
    expect(formatSummary(undefined)).toBe('');
  });

  it('HTMLを変換して切り詰める', () => {
    const html = '<p>This is a long paragraph with HTML tags</p>';
    expect(formatSummary(html, 20)).toBe('This is a long pa...');
  });

  it('デフォルトの最大長（150文字）', () => {
    const longHtml = '<p>' + 'a'.repeat(200) + '</p>';
    const result = formatSummary(longHtml);
    expect(result.length).toBe(150);
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('wrapText', () => {
  it('短いテキストはそのまま返す', () => {
    expect(wrapText('短いテキスト', 150)).toBe('短いテキスト');
  });

  it('長い行を指定幅で折り返す', () => {
    const longText = 'a'.repeat(200);
    const result = wrapText(longText, 150);
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0].length).toBe(150);
    expect(lines[1].length).toBe(50);
  });

  it('改行を含むテキストを正しく処理', () => {
    const text = 'First line\n' + 'a'.repeat(200) + '\nThird line';
    const result = wrapText(text, 150);
    const lines = result.split('\n');
    expect(lines.length).toBe(4);
    expect(lines[0]).toBe('First line');
    expect(lines[1].length).toBe(150);
    expect(lines[2].length).toBe(50);
    expect(lines[3]).toBe('Third line');
  });

  it('日本語文字を含むテキストを適切に折り返す', () => {
    const text = 'あ'.repeat(80); // 全角文字は2文字分の幅 = 160幅
    const result = wrapText(text, 150);
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0].length).toBeLessThanOrEqual(75); // 150÷2=75文字
    expect(lines[1].length).toBeGreaterThan(0);
  });

  it('混在テキスト（英数字と日本語）を処理', () => {
    const text = 'Hello ' + 'こんにちは'.repeat(30); // 混在
    const result = wrapText(text, 150);
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });
});
