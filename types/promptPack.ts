/**
 * Prompt Pack — Collection of related prompts for sharing/reuse.
 */

export interface PromptPack {
  id: string;
  orgId: string;
  name: string;
  description: string;
  promptIds: string[];      // Array of prompt external IDs
  visibility: 'private' | 'org' | 'public';
  tags: string[];
  createdBy: string;        // User ID
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}

export interface CreatePackPayload {
  name: string;
  description?: string;
  promptIds: string[];
  visibility?: 'private' | 'org' | 'public';
  tags?: string[];
}

export interface UpdatePackPayload {
  name?: string;
  description?: string;
  promptIds?: string[];
  visibility?: 'private' | 'org' | 'public';
  tags?: string[];
}

export interface PromptPackWithStats extends PromptPack {
  promptCount: number;
}
