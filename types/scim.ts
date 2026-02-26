/**
 * SCIM 2.0 types — System for Cross-domain Identity Management.
 *
 * Implements RFC 7643 (Core Schema) and RFC 7644 (Protocol) types
 * for user provisioning and deprovisioning via identity providers
 * (Okta, Azure AD, OneLogin, etc.).
 */

// ── SCIM Core Types ────────────────────────────────────────────────────────

export interface ScimMeta {
  resourceType: 'User' | 'Group';
  created: string;
  lastModified: string;
  location: string;
}

export interface ScimName {
  givenName: string;
  familyName: string;
  formatted?: string;
}

export interface ScimEmail {
  value: string;
  type: 'work' | 'home' | 'other';
  primary: boolean;
}

export interface ScimUser {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'];
  id: string;
  externalId?: string;
  userName: string;
  name: ScimName;
  emails: ScimEmail[];
  active: boolean;
  displayName?: string;
  title?: string;
  meta: ScimMeta;
  /** Custom extension: org role */
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: {
    department?: string;
    organization?: string;
  };
}

export interface ScimGroupMember {
  value: string;   // user id
  display: string;  // user displayName or email
  type?: 'User';
}

export interface ScimGroup {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'];
  id: string;
  externalId?: string;
  displayName: string;
  members: ScimGroupMember[];
  meta: ScimMeta;
}

// ── SCIM Protocol Types ────────────────────────────────────────────────────

export interface ScimListResponse<T> {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

export interface ScimError {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'];
  detail: string;
  status: string;
  scimType?: 'invalidFilter' | 'tooMany' | 'uniqueness' | 'mutability' | 'invalidSyntax' | 'invalidPath' | 'noTarget' | 'invalidValue' | 'invalidVers' | 'sensitive';
}

export interface ScimPatchOp {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'];
  Operations: Array<{
    op: 'add' | 'remove' | 'replace';
    path?: string;
    value?: unknown;
  }>;
}

/** Filter expression parsed from SCIM filter query param */
export interface ScimFilter {
  attribute: string;
  operator: 'eq' | 'ne' | 'co' | 'sw' | 'ew' | 'gt' | 'lt' | 'ge' | 'le';
  value: string;
}

// ── Internal Mapping Types ─────────────────────────────────────────────────

export interface ScimProvisioningConfig {
  /** Whether SCIM provisioning is enabled for this org */
  enabled: boolean;
  /** Bearer token for SCIM API authentication */
  bearerToken: string;
  /** Default role for newly provisioned users */
  defaultRole: 'viewer' | 'editor' | 'member';
  /** Auto-deactivate users removed via SCIM */
  autoDeactivate: boolean;
}

export const DEFAULT_SCIM_CONFIG: ScimProvisioningConfig = {
  enabled: false,
  bearerToken: '',
  defaultRole: 'member',
  autoDeactivate: true,
};
