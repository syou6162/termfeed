import { useState, useCallback } from 'react';
import type { ErrorInfo, UseErrorManagerReturn } from '@/types';

/**
 * エラー状態を統一的に管理するカスタムフック
 */
export function useErrorManager(): UseErrorManagerReturn {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const addError = useCallback((error: ErrorInfo) => {
    setErrors((prev) => [...prev, error]);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearErrorsBySource = useCallback((source: ErrorInfo['source']) => {
    setErrors((prev) => prev.filter((error) => error.source !== source));
  }, []);

  const hasError = errors.length > 0;

  const getLatestError = useCallback(() => {
    return errors.length > 0 ? errors[errors.length - 1] : null;
  }, [errors]);

  return {
    errors,
    addError,
    clearErrors,
    clearErrorsBySource,
    hasError,
    getLatestError,
  };
}
