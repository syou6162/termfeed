import { render } from 'ink';
import type { ReactElement } from 'react';
import type { DatabaseManager } from '../../../models/database.js';

export interface TuiLaunchOptions {
  /** TUIアプリの名前（エラーメッセージ用） */
  appName: string;
  /** データベースマネージャー（クリーンアップ用、オプショナル） */
  databaseManager?: DatabaseManager;
}

/**
 * TUIアプリケーションを安全に起動し、適切なクリーンアップを行う
 * Raw modeエラーを防ぐためのプロセス終了ハンドラーを設定
 *
 * 注意: このハンドラーはInkのRaw modeクリーンアップ専用です。
 * App.tsx内のSIGINT/SIGTERMハンドラーは既読化処理のため別途必要です。
 */
export function launchTuiApp(component: ReactElement, options: TuiLaunchOptions): void {
  const { appName, databaseManager } = options;

  try {
    const { clear, unmount } = render(component);

    // プロセス終了時のクリーンアップ（Raw modeエラー防止）
    const cleanup = () => {
      clear();
      unmount();
      if (databaseManager) {
        databaseManager.close();
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (error) {
    console.error(
      `${appName}の起動に失敗しました:`,
      error instanceof Error ? error.message : error
    );
    if (databaseManager) {
      databaseManager.close();
    }
    process.exit(1);
  }
}
