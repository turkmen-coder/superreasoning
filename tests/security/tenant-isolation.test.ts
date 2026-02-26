/**
 * Tenant Isolation Tests
 *
 * Verifies that multi-tenant data isolation works correctly:
 * 1. SQL queries always include org_id filter (parameterized)
 * 2. DbPromptStore methods enforce orgId boundary
 * 3. Cross-tenant data access is impossible at the store layer
 * 4. Missing orgId returns empty results (safe default)
 */

import { describe, it, expect, vi } from 'vitest';
import { DbPromptStore } from '../../server/store/dbPromptStore';
import type { Pool, QueryResult } from 'pg';

// --- Mock pool factory ---

function createMockPool(queryHandler: (text: string, values: unknown[]) => QueryResult) {
  return {
    query: vi.fn(queryHandler),
  } as unknown as Pool;
}

const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const PROMPT_A = {
  external_id: 'prompt-1',
  version: '1.0',
  name: 'Org A Prompt',
  master_prompt: 'Secret data for Org A',
  reasoning: 'A reasoning',
  meta: null,
  created_at: new Date('2026-01-01'),
};

const PROMPT_B = {
  external_id: 'prompt-2',
  version: '1.0',
  name: 'Org B Prompt',
  master_prompt: 'Secret data for Org B',
  reasoning: 'B reasoning',
  meta: null,
  created_at: new Date('2026-01-02'),
};

describe('Tenant Isolation — DbPromptStore', () => {
  describe('list()', () => {
    it('only returns prompts for the requested orgId', async () => {
      const pool = createMockPool((_text, values) => {
        // Only return rows matching the orgId parameter
        const orgId = values[0] as string;
        const rows = orgId === ORG_A ? [PROMPT_A] : orgId === ORG_B ? [PROMPT_B] : [];
        return { rows, rowCount: rows.length } as unknown as QueryResult;
      });

      const store = new DbPromptStore(pool);

      const listA = await store.list({ orgId: ORG_A });
      expect(listA).toHaveLength(1);
      expect(listA[0].id).toBe('prompt-1');
      expect(listA[0].masterPrompt).toBe('Secret data for Org A');

      const listB = await store.list({ orgId: ORG_B });
      expect(listB).toHaveLength(1);
      expect(listB[0].id).toBe('prompt-2');
      expect(listB[0].masterPrompt).toBe('Secret data for Org B');

      // Org A should never see Org B's data
      expect(listA.some((p) => p.id === 'prompt-2')).toBe(false);
      expect(listB.some((p) => p.id === 'prompt-1')).toBe(false);
    });

    it('returns empty array when orgId is null', async () => {
      const pool = createMockPool(() => {
        throw new Error('Should not call DB when orgId is null');
      });

      const store = new DbPromptStore(pool);
      const result = await store.list({ orgId: null });
      expect(result).toEqual([]);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('returns empty array when orgId is undefined and no default', async () => {
      const original = process.env.SR_DEFAULT_ORG_ID;
      delete process.env.SR_DEFAULT_ORG_ID;

      const pool = createMockPool(() => {
        throw new Error('Should not call DB');
      });

      const store = new DbPromptStore(pool);
      const result = await store.list({});
      expect(result).toEqual([]);

      if (original) process.env.SR_DEFAULT_ORG_ID = original;
    });
  });

  describe('get()', () => {
    it('uses parameterized query with orgId filter', async () => {
      const pool = createMockPool((text, values) => {
        // Verify orgId is the first parameter
        expect(values[0]).toBe(ORG_A);
        expect(text).toContain('$1::uuid');
        return { rows: [PROMPT_A], rowCount: 1 } as unknown as QueryResult;
      });

      const store = new DbPromptStore(pool);
      const result = await store.get('prompt-1', undefined, ORG_A);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('prompt-1');
    });

    it('returns null for cross-tenant access attempt', async () => {
      const pool = createMockPool((_text, values) => {
        const orgId = values[0] as string;
        // Org B tries to access Org A's prompt — DB returns no rows
        if (orgId === ORG_B) {
          return { rows: [], rowCount: 0 } as unknown as QueryResult;
        }
        return { rows: [PROMPT_A], rowCount: 1 } as unknown as QueryResult;
      });

      const store = new DbPromptStore(pool);

      // Org B tries to get Org A's prompt
      const result = await store.get('prompt-1', '1.0', ORG_B);
      expect(result).toBeNull();
    });

    it('returns null when orgId is null', async () => {
      const pool = createMockPool(() => {
        throw new Error('Should not call DB');
      });

      const store = new DbPromptStore(pool);
      const result = await store.get('prompt-1', '1.0', null);
      expect(result).toBeNull();
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('save()', () => {
    it('includes orgId in INSERT query', async () => {
      const capturedQueries: { text: string; values: unknown[] }[] = [];

      const pool = createMockPool((text, values) => {
        capturedQueries.push({ text, values });
        if (text.includes('INSERT INTO prompts')) {
          return { rows: [{ id: 1 }], rowCount: 1 } as unknown as QueryResult;
        }
        return { rows: [], rowCount: 1 } as unknown as QueryResult;
      });

      const store = new DbPromptStore(pool);
      await store.save(
        { id: 'prompt-new', version: '1.0', masterPrompt: 'Test', createdAt: new Date().toISOString() },
        ORG_A,
      );

      // First query should be INSERT INTO prompts with orgId
      expect(capturedQueries[0].text).toContain('INSERT INTO prompts');
      expect(capturedQueries[0].values[0]).toBe(ORG_A);
    });

    it('throws when orgId is missing', async () => {
      const original = process.env.SR_DEFAULT_ORG_ID;
      delete process.env.SR_DEFAULT_ORG_ID;

      const pool = createMockPool(() => {
        throw new Error('Should not call DB');
      });

      const store = new DbPromptStore(pool);
      await expect(
        store.save({ id: 'x', version: '1.0', masterPrompt: 'test', createdAt: new Date().toISOString() }, null),
      ).rejects.toThrow('org_id');

      if (original) process.env.SR_DEFAULT_ORG_ID = original;
    });
  });

  describe('delete()', () => {
    it('scopes DELETE to orgId', async () => {
      const pool = createMockPool((text, values) => {
        expect(values[0]).toBe(ORG_A);
        expect(text).toContain('org_id = $1::uuid');
        return { rows: [], rowCount: 1 } as unknown as QueryResult;
      });

      const store = new DbPromptStore(pool);
      const ok = await store.delete('prompt-1', undefined, ORG_A);
      expect(ok).toBe(true);
    });

    it('cannot delete another tenant data', async () => {
      const pool = createMockPool((_text, values) => {
        const orgId = values[0] as string;
        // Org B tries to delete Org A's prompt — no rows affected
        if (orgId === ORG_B) {
          return { rows: [], rowCount: 0 } as unknown as QueryResult;
        }
        return { rows: [], rowCount: 1 } as unknown as QueryResult;
      });

      const store = new DbPromptStore(pool);
      const ok = await store.delete('prompt-1', undefined, ORG_B);
      expect(ok).toBe(false);
    });

    it('returns false when orgId is null', async () => {
      const pool = createMockPool(() => {
        throw new Error('Should not call DB');
      });

      const store = new DbPromptStore(pool);
      const ok = await store.delete('prompt-1', undefined, null);
      expect(ok).toBe(false);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('listVersions()', () => {
    it('scopes version listing to orgId', async () => {
      const pool = createMockPool((_text, values) => {
        expect(values[0]).toBe(ORG_A);
        return {
          rows: [
            { ...PROMPT_A, version: '2.0', created_at: new Date('2026-02-01') },
            { ...PROMPT_A, version: '1.0' },
          ],
          rowCount: 2,
        } as unknown as QueryResult;
      });

      const store = new DbPromptStore(pool);
      const versions = await store.listVersions('prompt-1', ORG_A);
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe('2.0');
      expect(versions[1].version).toBe('1.0');
    });

    it('returns empty for cross-tenant version listing', async () => {
      const pool = createMockPool(() => {
        return { rows: [], rowCount: 0 } as unknown as QueryResult;
      });

      const store = new DbPromptStore(pool);
      const versions = await store.listVersions('prompt-1', ORG_B);
      expect(versions).toHaveLength(0);
    });
  });

  describe('SQL query safety', () => {
    it('all queries use parameterized $N placeholders (not string interpolation)', async () => {
      const capturedQueries: string[] = [];

      const pool = createMockPool((text) => {
        capturedQueries.push(text);
        if (text.includes('INSERT INTO prompts')) {
          return { rows: [{ id: 1 }], rowCount: 1 } as unknown as QueryResult;
        }
        return { rows: [], rowCount: 0 } as unknown as QueryResult;
      });

      const store = new DbPromptStore(pool);

      // Exercise all methods
      await store.list({ orgId: ORG_A });
      await store.get('test', '1.0', ORG_A);
      await store.save(
        { id: 'x', version: '1.0', masterPrompt: 'test', createdAt: new Date().toISOString() },
        ORG_A,
      );
      await store.listVersions('test', ORG_A);
      await store.delete('test', '1.0', ORG_A);

      // All queries should use parameterized placeholders
      for (const query of capturedQueries) {
        expect(query).toMatch(/\$\d+/); // Has at least one $N parameter
        // Should not have direct UUID interpolation
        expect(query).not.toContain(ORG_A);
      }
    });
  });
});
