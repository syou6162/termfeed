import type { Feed } from '@/types';

export type ExportFormat = 'opml' | 'text';

export class OPMLService {
  /**
   * フィード一覧をOPML形式のXMLに変換
   */
  static exportToOPML(feeds: Feed[]): string {
    const now = new Date().toUTCString();

    const outlines = feeds
      .map((feed) => {
        const title = this.escapeXml(feed.title || feed.url);
        const xmlUrl = this.escapeXml(feed.url);
        const htmlUrl = this.escapeXml(feed.url); // HTMLのURLは通常フィードURLと同じ

        return `    <outline text="${title}" title="${title}" type="rss" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}"/>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>termfeed subscriptions</title>
    <dateCreated>${now}</dateCreated>
    <dateModified>${now}</dateModified>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
  }

  /**
   * OPML形式のXMLからフィードURLを抽出
   */
  static parseOPML(opmlContent: string): string[] {
    const urls: string[] = [];

    // outline要素からxmlUrl属性を抽出する正規表現
    const outlineRegex = /<outline[^>]+xmlUrl=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = outlineRegex.exec(opmlContent)) !== null) {
      const url = this.unescapeXml(match[1]);
      if (url && this.isValidUrl(url)) {
        urls.push(url);
      }
    }

    return urls;
  }

  /**
   * XML特殊文字をエスケープ
   */
  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * XMLエスケープを解除
   */
  private static unescapeXml(str: string): string {
    return str
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
  }

  /**
   * URLの妥当性をチェック
   */
  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new globalThis.URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * フィード一覧をテキスト形式（1行1URL）に変換
   */
  static exportToText(feeds: Feed[]): string {
    return feeds.map((feed) => feed.url).join('\n');
  }

  /**
   * テキスト形式（1行1URL）からフィードURLを抽出
   */
  static parseText(textContent: string): string[] {
    return textContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#')) // 空行とコメント行を除外
      .filter((url) => this.isValidUrl(url));
  }

  /**
   * ファイル拡張子から形式を判定
   */
  static detectFormat(filename: string): ExportFormat {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'opml' || ext === 'xml') {
      return 'opml';
    }
    return 'text';
  }

  /**
   * コンテンツから形式を判定
   */
  static detectFormatFromContent(content: string): ExportFormat {
    const trimmed = content.trim();
    if (trimmed.startsWith('<?xml') || trimmed.includes('<opml')) {
      return 'opml';
    }
    return 'text';
  }
}
