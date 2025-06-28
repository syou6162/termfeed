export function convertHtmlToText(html: string): string {
  if (!html) {
    return '';
  }

  return (
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // 見出しタグの処理
      .replace(/<h1\b[^>]*>/gi, '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      .replace(/<\/h1>/gi, '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      .replace(/<h2\b[^>]*>/gi, '\n\n■ ')
      .replace(/<\/h2>/gi, '\n\n')
      .replace(/<h3\b[^>]*>/gi, '\n\n▶ ')
      .replace(/<\/h3>/gi, '\n\n')
      .replace(/<h[4-6]\b[^>]*>/gi, '\n● ')
      .replace(/<\/h[4-6]>/gi, '\n')
      // パラグラフの処理（前後に改行）
      .replace(/<p\b[^>]*>/gi, '\n\n')
      .replace(/<\/p>/gi, '\n\n')
      // divの処理（前後に改行）
      .replace(/<div\b[^>]*>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n\n')
      // リストの開始タグ（前に改行）
      .replace(/<(ul|ol)\b[^>]*>/gi, '\n\n')
      // リストアイテムの処理（インデント付き）
      .replace(/<li\b[^>]*>/gi, '  • ')
      .replace(/<\/li>/gi, '\n')
      // リスト全体の処理（後に改行）
      .replace(/<\/(ul|ol)>/gi, '\n\n')
      // 改行タグ
      .replace(/<br\s*\/?>/gi, '\n')
      // blockquoteタグの処理（インデント付き）
      .replace(/<blockquote[^>]*>/gi, '\n「')
      .replace(/<\/blockquote>/gi, '」\n')
      // figureタグやiframeタグの処理（削除）
      .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '\n')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '\n')
      // 残りのタグを削除
      .replace(/<[^>]*>/g, '')
      // HTMLエンティティのデコード
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      // 連続改行を2つに統一（改行の後に空行1つ）
      .replace(/\n+/g, '\n\n')
      // 前後の空白を削除
      .trim()
  );
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + '...';
}

export function formatSummary(htmlContent: string | undefined, maxLength: number = 150): string {
  if (!htmlContent) {
    return '';
  }

  const plainText = convertHtmlToText(htmlContent);
  return truncateText(plainText, maxLength);
}

export function wrapText(text: string, maxWidth: number = 150): string {
  const lines = text.split('\n');
  const wrappedLines: string[] = [];

  for (const line of lines) {
    // 日本語文字を考慮した幅計算
    let currentLine = '';
    let currentWidth = 0;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const charCode = char.charCodeAt(0);
      // 全角文字判定を拡張（CJK統合漢字、ひらがな、カタカナ、全角記号など）
      const isFullWidth =
        (charCode >= 0x3000 && charCode <= 0x9fff) || // CJK文字
        (charCode >= 0xff00 && charCode <= 0xffef) || // 全角ASCII、半角カナ
        (charCode >= 0x20000 && charCode <= 0x2ffff); // CJK拡張

      const charWidth = isFullWidth ? 2 : 1;

      if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
        // 行を折り返す
        wrappedLines.push(currentLine);
        currentLine = char;
        currentWidth = charWidth;
      } else {
        currentLine += char;
        currentWidth += charWidth;
      }
    }

    if (currentLine.length > 0) {
      wrappedLines.push(currentLine);
    }
  }

  return wrappedLines.join('\n');
}
