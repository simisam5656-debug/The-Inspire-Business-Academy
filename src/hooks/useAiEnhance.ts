/**
 * useAiEnhance — lightweight hook for inline AI field enhancement.
 *
 * Usage:
 *   const { enhance, loading, suggestion, accept, dismiss } = useAiEnhance();
 *   // call enhance(fieldName, value, context) → sets suggestion
 *   // call accept() → returns suggestion string so caller can set their state
 *   // call dismiss() → clears suggestion
 */
import { useState, useCallback } from 'react';
import { AdminAiService } from '../services/adminAiService';

export interface UseAiEnhanceResult {
  enhance: (fieldName: string, value: string, context?: string) => Promise<void>;
  loading: boolean;
  suggestion: string | null;
  error: string | null;
  accept: () => string | null;
  dismiss: () => void;
}

export function useAiEnhance(): UseAiEnhanceResult {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enhance = useCallback(async (fieldName: string, value: string, context?: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setSuggestion(null);

    const res = await AdminAiService.generate({
      action: 'enhance_field',
      payload: { fieldName, fieldValue: value, context: context || 'Course management form' },
    });

    setLoading(false);

    if (!res.ok || !res.resultText) {
      setError(res.error || 'AI enhancement failed.');
      return;
    }
    setSuggestion(res.resultText.trim());
  }, []);

  const accept = useCallback((): string | null => {
    const val = suggestion;
    setSuggestion(null);
    setError(null);
    return val;
  }, [suggestion]);

  const dismiss = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return { enhance, loading, suggestion, error, accept, dismiss };
}
