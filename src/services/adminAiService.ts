import { supabase } from '../lib/supabase';
import { AdminAiAction } from '../../api/admin/ai/generate';

export interface GenerateAiPayload {
  action: AdminAiAction;
  payload: Record<string, any>;
}

export interface AdminAiServiceResponse {
  ok: boolean;
  resultText?: string;
  error?: string;
  correlationId?: string;
  modelUsed?: string;
}

export const AdminAiService = {
  async generate(request: GenerateAiPayload): Promise<AdminAiServiceResponse> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          error: data.error || 'AI generation request failed.',
          correlationId: data.correlationId,
        };
      }

      return {
        ok: true,
        resultText: data.resultText,
        correlationId: data.correlationId,
        modelUsed: data.modelUsed,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || 'Network error connecting to AI endpoint.',
      };
    }
  },
};
