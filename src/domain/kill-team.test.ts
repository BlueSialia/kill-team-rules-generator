import { describe, expect, it } from 'vitest';

import {
  CURRENT_SCHEMA_VERSION,
  createDefaultKillTeamDocument,
  killTeamDocumentSchema,
  parseKillTeamDocument,
} from './kill-team';

describe('killTeamDocumentSchema', () => {
  it('accepts the default document', () => {
    const document = createDefaultKillTeamDocument();

    expect(parseKillTeamDocument(document)).toEqual(document);
  });

  it('fills omitted optional content with empty defaults', () => {
    const document = parseKillTeamDocument({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      kind: 'kill-team',
    });

    expect(document.identity.name).toBe('');
    expect(document.presentation.theme.primary).toBe('');
    expect(document.factionRules.tacOps).toEqual([]);
    expect(document.operatives).toEqual([]);
  });

  it('rejects documents with an unsupported schema version', () => {
    const result = killTeamDocumentSchema.safeParse({
      schemaVersion: 2,
      kind: 'kill-team',
    });

    expect(result.success).toBe(false);
  });

  it('rejects documents with an invalid kind', () => {
    const result = killTeamDocumentSchema.safeParse({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      kind: 'not-a-kill-team',
    });

    expect(result.success).toBe(false);
  });

  it('rejects symbols that are not SVG data URLs', () => {
    const result = killTeamDocumentSchema.safeParse({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      kind: 'kill-team',
      identity: {
        symbol: 'data:image/png;base64,not-an-svg',
      },
    });

    expect(result.success).toBe(false);
  });

  it('accepts SVG symbols and operative portraits', () => {
    const result = killTeamDocumentSchema.safeParse({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      kind: 'kill-team',
      identity: {
        symbol: 'data:image/svg+xml;base64,PHN2Zy8+',
      },
      operatives: [
        {
          portrait: 'data:image/png;base64,not-an-svg',
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
