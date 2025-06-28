/**
 * RSS/Atomフィードの取得時に発生するエラー
 * ネットワークエラー、タイムアウト、HTTPエラー（404, 500等）で使用
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
 * RSS/Atomフィードの解析時に発生するエラー
 * 無効なXML、パース失敗時に使用
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
 * フィード管理操作の一般的なエラー
 * CRUD操作やビジネスロジックでの予期しない問題で使用
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
 * 重複URLのフィード登録時に発生するエラー
 * 既存フィードと同じURLで新規登録を試みた場合に使用
 */
export class DuplicateFeedError extends Error {
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
 * 指定されたIDのフィードが見つからない場合のエラー
 * 削除済みまたは存在しないフィードIDを指定した場合に使用
 */
export class FeedNotFoundError extends Error {
  constructor(
    message: string,
    public readonly feedId: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/**
 * フィード更新処理で発生するエラー
 * RSS取得やパースエラーを含む、フィード更新の包括的なエラー
 */
export class FeedUpdateError extends Error {
  constructor(
    message: string,
    public readonly feedId: number,
    public readonly feedUrl: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
  }
}
