/**
 * JavaScriptのDateオブジェクトをSQLite用の秒単位タイムスタンプに変換
 */
export function dateToUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * 現在時刻を秒単位のUNIXタイムスタンプで取得
 */
export function nowInUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * SQLiteの秒単位タイムスタンプをJavaScriptのDateオブジェクトに変換
 */
export function unixSecondsToDate(seconds: number): Date {
  return new Date(seconds * 1000);
}
