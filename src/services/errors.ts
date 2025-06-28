/**
 * RSS取得関連のカスタムエラークラス
 */
export class RSSFetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'RSSFetchError';
  }
}

/**
 * RSS解析関連のカスタムエラークラス
 */
export class RSSParseError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'RSSParseError';
  }
}

/**
 * フィード管理関連のカスタムエラークラス
 */
export class FeedManagementError extends Error {
  constructor(
    message: string,
    public readonly feedId?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'FeedManagementError';
  }
}

/**
 * フィード重複エラークラス
 */
export class DuplicateFeedError extends Error {
  constructor(
    public readonly url: string,
    options?: ErrorOptions
  ) {
    super(`Feed already exists: ${url}`, options);
    this.name = 'DuplicateFeedError';
  }
}

/**
 * フィードが見つからないエラークラス
 */
export class FeedNotFoundError extends Error {
  constructor(
    public readonly feedId: number,
    options?: ErrorOptions
  ) {
    super(`Feed not found: ${feedId}`, options);
    this.name = 'FeedNotFoundError';
  }
}
