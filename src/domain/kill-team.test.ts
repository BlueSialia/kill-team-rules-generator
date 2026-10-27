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
    expect(document.identity.teamKeyword).toBe('');
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

  it('uses the reduced metadata shape for non-operative entries', () => {
    const document = parseKillTeamDocument({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      kind: 'kill-team',
      factionRules: {
        chapterTactics: [
          {
            name: 'Disciplined advance',
            cost: '1',
            timing: 'Strategy phase',
            restrictions: 'Leader only',
            keywords: ['TACTICAL'],
            rulesText: 'Move one additional inch.',
          },
        ],
        tacOps: [
          {
            name: 'Secure the line',
            archetype: 'Seek and Destroy',
            revealCondition: 'Reveal at the end of Turning Point 2.',
            scoringCondition: 'Score if you control the objective.',
            cost: '2',
            timing: 'Strategy phase',
            restrictions: 'Leader only',
            keywords: ['TACTICAL'],
            rulesText: 'Hold the line.',
          },
        ],
      },
      operatives: [
        {
          keywords: ['ASHEN GUARD'],
          equipmentOptions: [
            {
              name: 'Field kit',
              cost: '1',
              timing: 'Any time',
              restrictions: 'Scout only',
              keywords: ['EQUIPMENT'],
              rulesText: 'Gain a reroll.',
            },
          ],
        },
      ],
      equipment: [
        {
          name: 'Med kit',
          cost: '1',
          timing: 'Any time',
          restrictions: 'Medic only',
          rulesText: 'Restore wounds.',
        },
      ],
    });

    expect(document.factionRules.chapterTactics[0]).toEqual({
      name: 'Disciplined advance',
      rulesText: 'Move one additional inch.',
    });
    expect(document.factionRules.tacOps[0]).toEqual({
      name: 'Secure the line',
      archetype: 'Seek and Destroy',
      revealCondition: 'Reveal at the end of Turning Point 2.',
      scoringCondition: 'Score if you control the objective.',
      rulesText: 'Hold the line.',
    });
    expect(document.operatives[0]?.equipmentOptions[0]).toEqual({
      name: 'Field kit',
      rulesText: 'Gain a reroll.',
    });
    expect(document.equipment[0]).toEqual({
      name: 'Med kit',
      rulesText: 'Restore wounds.',
    });
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
