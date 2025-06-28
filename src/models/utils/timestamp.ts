/**
 * JavaScriptのDateオブジェクトをSQLite用の秒単位タイムスタンプに変換
 */
export function dateToUnixSeconds(date: Date): number {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error('Invalid date object');
  }
  return Math.floor(timestamp / 1000);
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
  if (!Number.isFinite(seconds)) {
    throw new Error('Invalid timestamp: must be a finite number');
  }
  if (seconds < 0) {
    throw new Error('Invalid timestamp: must not be negative');
  }
  const date = new Date(seconds * 1000);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid timestamp: unable to create valid Date');
  }
  return date;
}
