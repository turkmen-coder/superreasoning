/**
 * Signed Release types — Cryptographic integrity for prompt versions.
 *
 * Each production-promoted prompt version gets a content hash (SHA-256)
 * and metadata signature to ensure tamper-evidence and auditability.
 */

export interface ContentHash {
  algorithm: 'sha256';
  /** Hex-encoded hash of prompt content + metadata */
  hash: string;
  /** What was hashed (for reproducibility) */
  scope: 'content' | 'content+metadata' | 'full';
}

export interface ReleaseSignature {
  /** Unique signature ID */
  id: string;
  /** The prompt version being signed */
  promptId: string;
  version: string;
  /** Content hash of the prompt at signing time */
  contentHash: ContentHash;
  /** Who signed it (userId) */
  signedBy: string;
  signedByEmail?: string;
  /** When it was signed */
  signedAt: string;
  /** Optional approval reference */
  approvalId?: string;
  /** Verification status */
  verified: boolean;
  /** Metadata included in the signature */
  metadata: {
    framework?: string;
    domain?: string;
    provider?: string;
    gateResults?: {
      judge: { passed: boolean; score: number };
      lint: { passed: boolean };
      contract: { passed: boolean; score: number };
    };
  };
}

export interface SignRequest {
  promptId: string;
  version: string;
  /** Override: sign even without full gate pass (admin only) */
  force?: boolean;
}

export interface SignResult {
  success: boolean;
  signature?: ReleaseSignature;
  error?: string;
}

export interface VerifyRequest {
  promptId: string;
  version: string;
  /** Current content to verify against stored hash */
  currentContent: string;
}

export interface VerifyResult {
  verified: boolean;
  signature?: ReleaseSignature;
  /** If verification failed, why */
  reason?: 'no_signature' | 'hash_mismatch' | 'content_modified' | 'metadata_mismatch';
  /** Original hash vs current hash (if mismatch) */
  details?: {
    expectedHash: string;
    actualHash: string;
  };
}

export interface ProvenanceChainEntry {
  version: string;
  status: string;
  signature?: ReleaseSignature;
  promotedBy?: string;
  promotedAt?: string;
  gatesPassed: boolean;
}

export interface ProvenanceChain {
  promptId: string;
  entries: ProvenanceChainEntry[];
  /** SHA-256 chain: each entry hashes previous entry's hash */
  chainHash: string;
  /** Is the chain intact (no gaps or tampered entries)? */
  chainValid: boolean;
}
