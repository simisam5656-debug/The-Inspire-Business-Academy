import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHATBOT_ALLOWED_TABLES,
  assertAllowedChatbotTable,
  buildChatbotContext,
  clearChatbotContextCache,
  STATIC_FALLBACK_PROMPT,
} from '../api/_lib/chatbotContext';

describe('Chatbot Context Builder & Security Isolation Tests', () => {
  test('1. Table allow-list allows only designated public tables', () => {
    // Verified public tables must be allowed
    for (const table of CHATBOT_ALLOWED_TABLES) {
      assert.doesNotThrow(() => assertAllowedChatbotTable(table));
    }
  });

  test('2. Table allow-list strictly rejects private / administrative tables', () => {
    const forbiddenTables = [
      'profiles',
      'users',
      'physical_students',
      'admissions',
      'online_payments',
      'student_enrollments',
      'physical_fee_payments',
      'academy_expenses',
      'audit_logs',
      'contact_messages',
      'manager_permissions',
      'coupons',
      'offer_promo_codes',
    ];

    for (const forbidden of forbiddenTables) {
      assert.throws(
        () => assertAllowedChatbotTable(forbidden),
        /SECURITY VIOLATION.*unauthorized table/i,
        `Table "${forbidden}" MUST be forbidden in chatbot queries`
      );
    }
  });

  test('3. Dynamic context builder constructs system prompt from mock database with public data', async () => {
    clearChatbotContextCache();

    const mockDb = {
      from: (table: string) => {
        assertAllowedChatbotTable(table);
        // Reusable chainable query mock
        const createQueryMock = (data: any[] = []) => {
          const chain: any = {
            data,
            error: null,
            eq: () => chain,
            order: () => chain,
            then: (resolve: any) => resolve({ data, error: null }),
          };
          return {
            select: () => chain,
          };
        };

        if (table === 'chatbot_settings') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    is_enabled: true,
                    extra_instructions: 'Always recommend taking the 6-month physical package first.',
                    fallback_message: 'Custom fallback message.',
                  },
                }),
              }),
            }),
          };
        }
        if (table === 'chatbot_knowledge') {
          return createQueryMock([
            {
              category: 'Lab',
              title: 'Workstations',
              content: 'Dedicated Core i7 desktop workstations with dual monitors in Sadiqabad.',
              keywords: 'lab, pc',
            },
          ]);
        }
        if (table === 'site_settings_public') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    academy_name: 'The Inspire Business Academy',
                    campus_address: 'Main Campus Sadiqabad',
                    phone: '0300-1112233',
                    whatsapp: '0300-1112233',
                    physical_monthly_fee: 5040,
                    physical_total_fee: 30240,
                    online_course_price: 5000,
                  },
                }),
              }),
            }),
          };
        }
        if (table === 'courses') {
          return createQueryMock([
            {
              title: 'YouTube Mastery',
              short_description: 'Monetization & viral workflows',
              price: 5000,
              online_price: 5000,
              duration_value: 6,
              available_for_physical: true,
              available_for_online: true,
            },
          ]);
        }
        if (table === 'faqs') {
          return createQueryMock([
            { question: 'Is certificate provided?', answer: 'Yes on 70% passing.' },
          ]);
        }
        // Defaults for other tables
        return createQueryMock([]);
      },
    };

    const res = await buildChatbotContext(undefined, mockDb);
    assert.equal(res.isEnabled, true);
    assert.ok(res.systemPrompt.includes('The Inspire Business Academy'));
    assert.ok(res.systemPrompt.includes('Workstations'));
    assert.ok(res.systemPrompt.includes('YouTube Mastery'));
    assert.ok(res.systemPrompt.includes('0300-1112233'));
    assert.ok(res.systemPrompt.includes('Rs. 5040'));
    assert.ok(res.systemPrompt.includes('Always recommend taking the 6-month physical package first.'));

    // Verify strict refusal instructions
    assert.ok(res.systemPrompt.includes('CRITICAL SECURITY & PRIVACY RULES'));
    assert.ok(res.systemPrompt.includes('NEVER disclose, lookup, or confirm personal student records'));

    // Context length constraint
    assert.ok(res.systemPrompt.length <= 6000, `Context length must be under 6000 chars, got ${res.systemPrompt.length}`);
  });

  test('4. Disabled chatbot settings return isEnabled: false and custom fallback message', async () => {
    clearChatbotContextCache();

    const mockDb = {
      from: (table: string) => {
        assertAllowedChatbotTable(table);
        if (table === 'chatbot_settings') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    is_enabled: false,
                    fallback_message: 'Our AI is paused for maintenance.',
                  },
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ data: [], error: null }) }) };
      },
    };

    const res = await buildChatbotContext(undefined, mockDb);
    assert.equal(res.isEnabled, false);
    assert.equal(res.fallbackMessage, 'Our AI is paused for maintenance.');
  });

  test('5. Unreachable database gracefully returns static fallback prompt without crashing', async () => {
    clearChatbotContextCache();

    // Database client that throws network/connection errors
    const brokenDb = {
      from: () => {
        throw new Error('Database connection failed: ECONNREFUSED');
      },
    };

    const res = await buildChatbotContext(undefined, brokenDb);
    assert.equal(res.isEnabled, true);
    assert.ok(res.systemPrompt.includes('The Inspire Business Academy'));
    assert.ok(res.systemPrompt.includes('Adeel Bhatti'));
  });
});
