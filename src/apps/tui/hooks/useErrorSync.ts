import { useEffect } from 'react';
import type { ErrorSource } from '../types/error.js';
import type { UseErrorManagerReturn } from '../types/error.js';

/**
 * エラーソースごとにエラー状態を同期するカスタムフック
 */
export function useErrorSync(
  errorManager: UseErrorManagerReturn,
  source: ErrorSource,
  errorMessage: string | null
) {
  const { addError, clearErrorsBySource } = errorManager;

  useEffect(() => {
    if (errorMessage) {
      addError({
        source,
        message: errorMessage,
        timestamp: new Date(),
        recoverable: true,
      });
    } else {
      clearErrorsBySource(source);
    }
  }, [errorMessage, source, addError, clearErrorsBySource]);
}
