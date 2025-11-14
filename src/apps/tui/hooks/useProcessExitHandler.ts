import { useEffect, useRef } from 'react';

/**
 * プロセス終了時に処理を実行するカスタムフック
 * SIGINT/SIGTERMシグナルを監視し、プロセス終了時にコールバックを実行します
 */
export function useProcessExitHandler(callback: () => void) {
  // コールバックの最新の参照を保持
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // プロセス終了時の処理（アプリ全体で1回だけ登録）
  useEffect(() => {
    const handleExit = () => {
      callbackRef.current();
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    return () => {
      process.off('SIGINT', handleExit);
      process.off('SIGTERM', handleExit);
    };
  }, []); // 空の依存配列 = アプリ起動時に1回だけ実行
}
