import striptags from 'striptags';

/**
 * HTMLコンテンツをTUI表示用のプレーンテキストに変換
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  let text = html;

  // リンクの処理: <a href="url">text</a> -> text [url]
  // stripTagsの前に処理する必要がある
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 [$1]');

  // 改行タグを実際の改行に変換
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<div[^>]*>/gi, '');

  // リストアイテムの処理
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<ul[^>]*>/gi, '');
  text = text.replace(/<\/ul>/gi, '');
  text = text.replace(/<ol[^>]*>/gi, '');
  text = text.replace(/<\/ol>/gi, '');

  // 残りのHTMLタグを除去
  text = striptags(text);

  // 連続する改行を最大2つまでに制限
  text = text.replace(/\n{3,}/g, '\n\n');

  // 前後の空白を除去
  return text.trim();
}

/**
 * 長いテキストを指定された行数で切り詰める
 */
export function truncateLines(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }
  return lines.slice(0, maxLines).join('\n') + '...';
}
