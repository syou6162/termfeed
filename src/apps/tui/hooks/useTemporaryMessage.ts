import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 一時的なメッセージを表示・管理するカスタムフック
 * 指定された時間が経過すると自動的にメッセージをクリアします
 */
export function useTemporaryMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((text: string, duration = 3000) => {
    // 既存のタイマーをクリア
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setMessage(text);
    timerRef.current = setTimeout(() => {
      setMessage(null);
      timerRef.current = null;
    }, duration);
  }, []);

  // クリーンアップ：アンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { message, showMessage };
}
