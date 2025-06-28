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
    this.name = this.constructor.name;
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
    this.name = this.constructor.name;
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
    this.name = this.constructor.name;
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
    this.name = this.constructor.name;
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
    this.name = this.constructor.name;
  }
}

/**
 * フィード更新エラークラス
 */
export class FeedUpdateError extends Error {
  constructor(
    public readonly feedId: number,
    public readonly feedUrl: string,
    options?: ErrorOptions
  ) {
    super(`Failed to update feed ${feedId}: ${feedUrl}`, options);
    this.name = this.constructor.name;
  }
}
