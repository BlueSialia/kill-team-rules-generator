import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 1 as const;
export const DOCUMENT_KIND = 'kill-team' as const;
export const LOCAL_STORAGE_KEY = 'kill-team-rules-generator.document';

const text = () => z.string().default('');
const textList = () => z.array(z.string()).default([]);

const imageDataUrl = z
  .string()
  .refine((value) => value === '' || value.startsWith('data:image/'), {
    message: 'The image must be an image data URL.',
  })
  .default('');

const svgDataUrl = z
  .string()
  .refine((value) => value === '' || value.startsWith('data:image/svg+xml'), {
    message: 'The image must be an SVG data URL.',
  })
  .default('');

export const themeSchema = z
  .object({
    darkText: text(),
    lightText: text(),
    darkBackground: text(),
    lightBackground: text(),
    primary: text(),
    secondary: text(),
    accent: text(),
    alternativeAccent: text(),
  })
  .default({
    darkText: '',
    lightText: '',
    darkBackground: '',
    lightBackground: '',
    primary: '',
    secondary: '',
    accent: '',
    alternativeAccent: '',
  });

export const identitySchema = z
  .object({
    name: text(),
    symbol: svgDataUrl,
    teamKeyword: text(),
  })
  .default({
    name: '',
    symbol: '',
    teamKeyword: '',
  });

export const previewLayoutSchema = z.enum([
  'practical-a4',
  'operatives-datacards',
]);

export const presentationSchema = z
  .object({
    layout: previewLayoutSchema.default('practical-a4'),
    theme: themeSchema,
  })
  .default({
    layout: 'practical-a4',
    theme: {
      darkText: '',
      lightText: '',
      darkBackground: '',
      lightBackground: '',
      primary: '',
      secondary: '',
      accent: '',
      alternativeAccent: '',
    },
  });

export const ruleEntrySchema = z
  .object({
    name: text(),
    cost: text(),
    timing: text(),
    restrictions: text(),
    rulesText: text(),
  })
  .default({
    name: '',
    cost: '',
    timing: '',
    restrictions: '',
    rulesText: '',
  });

export const operativeRuleEntrySchema = ruleEntrySchema;

export const simpleRuleEntrySchema = z
  .object({
    name: text(),
    rulesText: text(),
  })
  .default({
    name: '',
    rulesText: '',
  });

export const tacOpSchema = z
  .object({
    name: text(),
    archetype: text(),
    revealCondition: text(),
    scoringCondition: text(),
    rulesText: text(),
  })
  .default({
    name: '',
    archetype: '',
    revealCondition: '',
    scoringCondition: '',
    rulesText: '',
  });

export const weaponSchema = z
  .object({
    name: text(),
    weaponType: text(),
    attacks: text(),
    skill: text(),
    damage: text(),
    criticalDamage: text(),
    rulesText: text(),
  })
  .default({
    name: '',
    weaponType: '',
    attacks: '',
    skill: '',
    damage: '',
    criticalDamage: '',
    rulesText: '',
  });

export const operativeSchema = z
  .object({
    name: text(),
    role: text(),
    portrait: imageDataUrl,
    keywords: textList(),
    movement: text(),
    actionPointLimit: text(),
    wounds: text(),
    save: text(),
    weapons: z.array(weaponSchema).default([]),
    abilities: z.array(operativeRuleEntrySchema).default([]),
    uniqueActions: z.array(operativeRuleEntrySchema).default([]),
    equipmentOptions: z.array(simpleRuleEntrySchema).default([]),
  })
  .default({
    name: '',
    role: '',
    portrait: '',
    keywords: [],
    movement: '',
    actionPointLimit: '',
    wounds: '',
    save: '',
    weapons: [],
    abilities: [],
    uniqueActions: [],
    equipmentOptions: [],
  });

export const factionRulesSchema = z
  .object({
    rules: z.array(ruleEntrySchema).default([]),
    chapterTactics: z.array(simpleRuleEntrySchema).default([]),
    tacOps: z.array(tacOpSchema).default([]),
  })
  .default({
    rules: [],
    chapterTactics: [],
    tacOps: [],
  });

export const ploySchema = z
  .object({
    name: text(),
    cost: text(),
    timing: text(),
    restrictions: text(),
    rulesText: text(),
  })
  .default({
    name: '',
    cost: '',
    timing: '',
    restrictions: '',
    rulesText: '',
  });

export const equipmentSchema = simpleRuleEntrySchema;

export const killTeamDocumentSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  kind: z.literal(DOCUMENT_KIND),
  identity: identitySchema,
  narrative: text(),
  teamComposition: text(),
  operatives: z.array(operativeSchema).default([]),
  factionRules: factionRulesSchema,
  strategyPloys: z.array(ploySchema).default([]),
  firefightPloys: z.array(ploySchema).default([]),
  equipment: z.array(equipmentSchema).default([]),
  presentation: presentationSchema,
});

export type Theme = z.infer<typeof themeSchema>;
export type Identity = z.infer<typeof identitySchema>;
export type PreviewLayout = z.infer<typeof previewLayoutSchema>;
export type Presentation = z.infer<typeof presentationSchema>;
export type RuleEntry = z.infer<typeof ruleEntrySchema>;
export type OperativeRuleEntry = z.infer<typeof operativeRuleEntrySchema>;
export type SimpleRuleEntry = z.infer<typeof simpleRuleEntrySchema>;
export type TacOp = z.infer<typeof tacOpSchema>;
export type Weapon = z.infer<typeof weaponSchema>;
export type Operative = z.infer<typeof operativeSchema>;
export type FactionRules = z.infer<typeof factionRulesSchema>;
export type Ploy = z.infer<typeof ploySchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type KillTeamDocument = z.infer<typeof killTeamDocumentSchema>;

export const defaultTheme: Theme = {
  darkText: '#20242b',
  lightText: '#f5f7fa',
  darkBackground: '#20242b',
  lightBackground: '#f5f7fa',
  primary: '#30475e',
  secondary: '#526b82',
  accent: '#d97745',
  alternativeAccent: '#7b9e87',
};

export const createDefaultKillTeamDocument = (): KillTeamDocument => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  kind: DOCUMENT_KIND,
  identity: {
    name: '',
    symbol: '',
    teamKeyword: '',
  },
  narrative: '',
  teamComposition: '',
  operatives: [],
  factionRules: {
    rules: [],
    chapterTactics: [],
    tacOps: [],
  },
  strategyPloys: [],
  firefightPloys: [],
  equipment: [],
  presentation: {
    layout: 'practical-a4',
    theme: defaultTheme,
  },
});

export const parseKillTeamDocument = (input: unknown): KillTeamDocument =>
  killTeamDocumentSchema.parse(input);

export const isKillTeamDocument = (input: unknown): input is KillTeamDocument =>
  killTeamDocumentSchema.safeParse(input).success;
