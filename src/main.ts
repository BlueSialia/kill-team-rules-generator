import './styles/base.css';
import './styles/practical-a4.css';

import './styles/operatives-datacards.css';

import aplIcon from './assets/icons/apl.svg';
import attacksIcon from './assets/icons/attacks.svg';
import damageIcon from './assets/icons/damage.svg';
import meleeIcon from './assets/icons/melee.svg';
import movementIcon from './assets/icons/movement.svg';
import rangedIcon from './assets/icons/ranged.svg';
import saveIcon from './assets/icons/save.svg';
import skillIcon from './assets/icons/skill.svg';
import woundsIcon from './assets/icons/wounds.svg';

import {
  createDefaultKillTeamDocument,
  defaultTheme,
  equipmentSchema,
  LOCAL_STORAGE_KEY,
  operativeSchema,
  ploySchema,
  ruleEntrySchema,
  simpleRuleEntrySchema,
  tacOpSchema,
  type Equipment,
  type KillTeamDocument,
  type Operative,
  type OperativeRuleEntry,
  type PreviewLayout,
  type Ploy,
  type RuleEntry,
  type SimpleRuleEntry,
  type TacOp,
  type Weapon,
  weaponSchema,
} from './domain/kill-team';
import {
  createAutosave,
  createKillTeamExportFilename,
  deserializeKillTeamDocument,
  downloadKillTeamDocument,
  loadKillTeamDocument,
  type Autosave,
} from './domain/persistence';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('The application root element is missing.');
}

const sections = [
  ['identity', 'Cover / team identity'],
  ['narrative', 'Narrative / background'],
  ['composition', 'Team composition'],
  ['operatives', 'Operatives'],
  ['faction-rules', 'Faction rules'],
  ['strategy-ploys', 'Strategy ploys'],
  ['firefight-ploys', 'Firefight ploys'],
  ['equipment', 'Equipment'],
] as const;

const themeFields = [
  ['darkText', 'Dark text color'],
  ['lightText', 'Light text color'],
  ['darkBackground', 'Dark background'],
  ['lightBackground', 'Light background'],
  ['primary', 'Primary color'],
  ['secondary', 'Secondary color'],
  ['accent', 'Accent color'],
  ['alternativeAccent', 'Alternative accent color'],
] as const;

const layoutOptions: readonly (readonly [PreviewLayout, string])[] = [
  ['practical-a4', 'Practical A4'],

  ['operatives-datacards', 'Operative datacards only'],
];

const getStorage = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

const storage = getStorage();
let savedStatusTimeout: number | undefined;
let killTeamDocument: KillTeamDocument = storage
  ? loadKillTeamDocument(storage)
  : createDefaultKillTeamDocument();
const autosave: Autosave | undefined = storage
  ? createAutosave(
      storage,
      LOCAL_STORAGE_KEY,
      undefined,
      undefined,
      undefined,
      (error) => {
        if (savedStatusTimeout !== undefined) {
          window.clearTimeout(savedStatusTimeout);
          savedStatusTimeout = undefined;
        }
        setSaveStatus('Could not save locally');
        setError(
          error instanceof Error
            ? error.message
            : 'The document could not be saved locally.',
        );
      },
    )
  : undefined;
let draggedItem: { path: AnyListPath; index: number } | undefined;

type ListPath =
  | 'operatives'
  | 'factionRules.rules'
  | 'factionRules.chapterTactics'
  | 'factionRules.tacOps'
  | 'strategyPloys'
  | 'firefightPloys'
  | 'equipment';

type NestedListPath =
  | `operatives.${number}.weapons`
  | `operatives.${number}.abilities`
  | `operatives.${number}.uniqueActions`
  | `operatives.${number}.equipmentOptions`;

type AnyListPath = ListPath | NestedListPath;

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const previewValue = (value: string): string => {
  const keyword = killTeamDocument.identity.teamKeyword.trim();
  if (!keyword) {
    return escapeHtml(value);
  }

  const keywordPattern = new RegExp(escapeRegExp(keyword), 'gi');
  let rendered = '';
  let lastIndex = 0;
  for (const match of value.matchAll(keywordPattern)) {
    const index = match.index ?? lastIndex;
    rendered += escapeHtml(value.slice(lastIndex, index));
    rendered += `<strong class="team-keyword">${escapeHtml(match[0])}</strong>`;
    lastIndex = index + match[0].length;
  }
  return rendered + escapeHtml(value.slice(lastIndex));
};

const valueAt = (path: string): string => {
  let current: unknown = killTeamDocument;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return '';
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : '';
};

const setValueAt = (path: string, value: unknown): void => {
  const segments = path.split('.');
  const lastSegment = segments.pop();
  if (!lastSegment) {
    return;
  }

  let current: unknown = killTeamDocument;
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) {
      return;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (typeof current === 'object' && current !== null) {
    (current as Record<string, unknown>)[lastSegment] = value;
  }
};

const getList = (path: AnyListPath): unknown[] => {
  const value = valueAtPath(path);
  return Array.isArray(value) ? value : [];
};

const valueAtPath = (path: string): unknown => {
  let current: unknown = killTeamDocument;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const setList = (path: AnyListPath, list: unknown[]): void => {
  const segments = path.split('.');
  const lastSegment = segments.pop();
  if (!lastSegment) {
    return;
  }

  let current: unknown = killTeamDocument;
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) {
      return;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (typeof current === 'object' && current !== null) {
    (current as Record<string, unknown>)[lastSegment] = list;
  }
};

const emptyItem = (path: AnyListPath): unknown => {
  if (path === 'operatives') {
    return operativeSchema.parse({});
  }
  if (path.endsWith('.weapons')) {
    return weaponSchema.parse({});
  }
  if (path === 'strategyPloys' || path === 'firefightPloys') {
    return ploySchema.parse({});
  }
  if (path === 'equipment') {
    return equipmentSchema.parse({});
  }
  if (path === 'factionRules.tacOps') {
    return tacOpSchema.parse({});
  }
  if (
    path === 'factionRules.chapterTactics' ||
    path.endsWith('.equipmentOptions')
  ) {
    return simpleRuleEntrySchema.parse({});
  }
  return ruleEntrySchema.parse({});
};

const scheduleSave = (): void => {
  if (!autosave) {
    setSaveStatus('Local storage unavailable');
    return;
  }

  autosave.schedule(killTeamDocument);
  setSaveStatus('Saving…');
  if (savedStatusTimeout !== undefined) {
    window.clearTimeout(savedStatusTimeout);
  }
  savedStatusTimeout = window.setTimeout(() => {
    setSaveStatus('Saved locally');
  }, 500);
};

const field = (
  label: string,
  path: string,
  options: {
    multiline?: boolean;
    placeholder?: string;
    array?: boolean;
    fullWidth?: boolean;
  } = {},
): string => {
  const currentValue = options.array
    ? getArrayValue(path).join(', ')
    : valueAt(path);
  const control = options.multiline
    ? `<textarea data-path="${path}" ${options.array ? 'data-array="true"' : ''} rows="4" placeholder="${options.placeholder ?? ''}">${escapeHtml(currentValue)}</textarea>`
    : `<input data-path="${path}" ${options.array ? 'data-array="true"' : ''} type="text" value="${escapeHtml(currentValue)}" placeholder="${options.placeholder ?? ''}" />`;

  return `<label class="field${options.fullWidth ? ' field-wide' : ''}"><span>${label}</span>${control}</label>`;
};

const colorField = (
  key: (typeof themeFields)[number][0],
  label: string,
): string => {
  const path = `presentation.theme.${key}`;
  return `<label class="field color-field"><span>${label}</span><span class="color-control"><span class="color-swatch" data-color-swatch="${path}" aria-hidden="true"></span><input data-path="${path}" type="text" value="${escapeHtml(valueAt(path))}" placeholder="#30475e or another CSS color" /></span></label>`;
};

const selectField = (
  label: string,
  path: string,
  options: readonly (readonly [string, string])[],
): string => {
  const currentValue = valueAt(path);
  return `<label class="field"><span>${label}</span><select data-path="${path}"><option value="">Select a type</option>${options.map(([value, optionLabel]) => `<option value="${value}" ${currentValue === value ? 'selected' : ''}>${optionLabel}</option>`).join('')}</select></label>`;
};

const weaponTypeOptions = [
  ['melee', 'Melee'],
  ['ranged', 'Ranged'],
  ['both', 'Melee and ranged'],
] as const;

const previewIcons = {
  movement: movementIcon,
  apl: aplIcon,
  wounds: woundsIcon,
  save: saveIcon,
  attacks: attacksIcon,
  skill: skillIcon,
  damage: damageIcon,
  melee: meleeIcon,
  ranged: rangedIcon,
};

const previewIcon = (
  kind: keyof typeof previewIcons,
  label: string,
): string => {
  const definition = previewIcons[kind];
  return `<span class="preview-icon-wrapper" role="img" aria-label="${label}" title="${label}" style="--preview-icon-image: url(&quot;${escapeHtml(definition)}&quot;)"></span>`;
};

const weaponTypeIcon = (type: string): string => {
  const label = type === 'both' ? 'melee and ranged' : type;
  if (type !== 'melee' && type !== 'ranged' && type !== 'both') {
    return '';
  }
  const icons =
    type === 'both'
      ? `${previewIcon('melee', 'Melee')}${previewIcon('ranged', 'Ranged')}`
      : previewIcon(type, label);
  return `<span class="weapon-type-icon" aria-label="${label}" title="${label}">${icons}</span>`;
};

const previewStat = (
  kind: keyof typeof previewIcons,
  label: string,
  value: string,
): string =>
  hasText(value)
    ? `<div class="preview-stat" title="${label}">${previewIcon(kind, label)}<span>${previewValue(value)}</span></div>`
    : '';

const getArrayValue = (path: string): string[] => {
  const value = valueAtPath(path);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

const renderDragHandle = (
  path: AnyListPath,
  index: number,
  label: string,
): string =>
  `<button class="drag-handle" draggable="true" data-drag-path="${path}" data-drag-index="${index}" type="button" aria-label="Drag to reorder ${label}">⠿</button>`;

const itemName = (path: AnyListPath, index: number, fallback: string): string =>
  valueAt(`${path}.${index}.name`).trim() || fallback;

const renderRuleEntry = (
  path: AnyListPath,
  index: number,
  title: string,
): string => `
  <details class="list-item" data-drop-path="${path}" data-drop-index="${index}" open>
    <summary class="list-item-header">
      <div class="list-item-title">${renderDragHandle(path, index, title)}<strong>${escapeHtml(itemName(path, index, `New ${title.toLowerCase()}`))}</strong></div>
      ${renderItemActions(path, index)}
    </summary>
    <div class="item-content">
      <div class="field-grid">
        ${field('Name', `${path}.${index}.name`)}
        ${field('Cost', `${path}.${index}.cost`)}
        ${field('Timing / phase', `${path}.${index}.timing`)}
        ${field('Restrictions', `${path}.${index}.restrictions`)}
        ${field('Rules text', `${path}.${index}.rulesText`, { multiline: true, fullWidth: true })}
      </div>
    </div>
  </details>
`;

const renderSimpleRuleEntry = (
  path: AnyListPath,
  index: number,
  title: string,
): string => `
  <details class="list-item" data-drop-path="${path}" data-drop-index="${index}" open>
    <summary class="list-item-header">
      <div class="list-item-title">${renderDragHandle(path, index, title)}<strong>${escapeHtml(itemName(path, index, `New ${title.toLowerCase()}`))}</strong></div>
      ${renderItemActions(path, index)}
    </summary>
    <div class="item-content">
      <div class="field-grid">
        ${field('Name', `${path}.${index}.name`)}
        ${field('Rules text', `${path}.${index}.rulesText`, { multiline: true, fullWidth: true })}
      </div>
    </div>
  </details>
`;

const renderTacOp = (path: AnyListPath, index: number): string => `
  <details class="list-item" data-drop-path="${path}" data-drop-index="${index}" open>
    <summary class="list-item-header">
      <div class="list-item-title">${renderDragHandle(path, index, 'Tac Op')}<strong>${escapeHtml(itemName(path, index, 'New Tac Op'))}</strong></div>
      ${renderItemActions(path, index)}
    </summary>
    <div class="item-content">
      <div class="field-grid">
        ${field('Name', `${path}.${index}.name`)}
        ${field('Archetype', `${path}.${index}.archetype`)}
        ${field('Reveal condition', `${path}.${index}.revealCondition`, { multiline: true })}
        ${field('Scoring condition', `${path}.${index}.scoringCondition`, { multiline: true })}
        ${field('Rules text', `${path}.${index}.rulesText`, { multiline: true, fullWidth: true })}
      </div>
    </div>
  </details>
`;

const renderPloy = (path: AnyListPath, index: number): string => `
  <details class="list-item" data-drop-path="${path}" data-drop-index="${index}" open>
    <summary class="list-item-header">
      <div class="list-item-title">${renderDragHandle(path, index, 'ploy')}<strong>${escapeHtml(itemName(path, index, 'New ploy'))}</strong></div>
      ${renderItemActions(path, index)}
    </summary>
    <div class="item-content">
      <div class="field-grid">
        ${field('Name', `${path}.${index}.name`)}
        ${field('Cost', `${path}.${index}.cost`)}
        ${field('Timing / phase', `${path}.${index}.timing`)}
        ${field('Restrictions', `${path}.${index}.restrictions`)}
        ${field('Effect / rules text', `${path}.${index}.rulesText`, { multiline: true, fullWidth: true })}
      </div>
    </div>
  </details>
`;

const renderEquipment = (path: AnyListPath, index: number): string => `
  <details class="list-item" data-drop-path="${path}" data-drop-index="${index}" open>
    <summary class="list-item-header">
      <div class="list-item-title">${renderDragHandle(path, index, 'equipment')}<strong>${escapeHtml(itemName(path, index, 'New equipment'))}</strong></div>
      ${renderItemActions(path, index)}
    </summary>
    <div class="item-content">
      <div class="field-grid">
        ${field('Name', `${path}.${index}.name`)}
        ${field('Effect / rules text', `${path}.${index}.rulesText`, { multiline: true, fullWidth: true })}
      </div>
    </div>
  </details>
`;

const renderItemActions = (path: AnyListPath, index: number): string => `
  <div class="item-actions" aria-label="Item actions">
    <button class="icon-button" data-action="move-up" data-list-path="${path}" data-index="${index}" type="button" aria-label="Move item up" ${index === 0 ? 'disabled' : ''}>↑</button>
    <button class="icon-button" data-action="move-down" data-list-path="${path}" data-index="${index}" type="button" aria-label="Move item down" ${index === getList(path).length - 1 ? 'disabled' : ''}>↓</button>
    <button class="icon-button danger" data-action="delete-item" data-list-path="${path}" data-index="${index}" type="button" aria-label="Delete item">×</button>
  </div>
`;

const renderList = (
  path: AnyListPath,
  title: string,
  description: string,
  renderer: (path: AnyListPath, index: number) => string,
): string => {
  const items = getList(path);
  return `
    <div class="list-section" data-list-container="${path}">
      <div class="subsection-heading">
        <h3>${title}</h3>
        <p>${description}</p>
        <button class="button button-subtle" data-action="add-item" data-list-path="${path}" type="button">Add ${title.toLowerCase()}</button>
      </div>
      ${
        items.length === 0
          ? '<p class="empty-list">No entries yet. Add one to begin.</p>'
          : items.map((_item, index) => renderer(path, index)).join('')
      }
    </div>
  `;
};

const renderWeapon = (path: NestedListPath, index: number): string => `
  <details class="list-item nested-item" data-drop-path="${path}" data-drop-index="${index}" open>
    <summary class="list-item-header">
      <div class="list-item-title">${renderDragHandle(path, index, 'weapon')}<strong>${escapeHtml(itemName(path, index, 'New weapon'))}</strong></div>
      ${renderItemActions(path, index)}
    </summary>
    <div class="item-content">
      <div class="field-grid">
        ${field('Name', `${path}.${index}.name`)}
        ${selectField('Weapon type', `${path}.${index}.weaponType`, weaponTypeOptions)}
        ${field('Attacks', `${path}.${index}.attacks`)}
        ${field('Skill', `${path}.${index}.skill`)}
        ${field('Damage', `${path}.${index}.damage`)}
        ${field('Critical damage', `${path}.${index}.criticalDamage`)}
        ${field('Rules text', `${path}.${index}.rulesText`, { multiline: true, fullWidth: true })}
      </div>
    </div>
  </details>
`;

const renderOperative = (path: AnyListPath, index: number): string => {
  const operative = valueAtPath(`operatives.${index}`) as Operative;
  return `
  <details class="list-item operative-item" data-drop-path="${path}" data-drop-index="${index}" open>
    <summary class="list-item-header">
      <div class="list-item-title">${renderDragHandle(path, index, 'operative')}<strong>${escapeHtml(itemName(path, index, 'New operative'))}</strong></div>
      ${renderItemActions(path, index)}
    </summary>
    <div class="item-content">
      <div class="field-grid">
        ${field('Name', `${path}.${index}.name`)}
        ${field('Type / role', `${path}.${index}.role`)}
        <label class="field field-wide"><span>Portrait</span><input data-portrait-upload data-operative-index="${index}" type="file" accept="image/*" /></label>
        ${operative.portrait ? `<div class="portrait-editor-preview"><img src="${escapeHtml(operative.portrait)}" alt="Portrait for ${escapeHtml(operative.name || 'operative')}" /><button class="button button-subtle" data-action="remove-portrait" data-operative-index="${index}" type="button">Remove portrait</button></div>` : ''}
        ${field('Action Point Limit', `${path}.${index}.actionPointLimit`)}
        ${field('Movement', `${path}.${index}.movement`)}
        ${field('Save', `${path}.${index}.save`)}
        ${field('Wounds', `${path}.${index}.wounds`)}
        ${field('Keywords', `${path}.${index}.keywords`, { array: true })}
      </div>
      ${renderNestedList(`operatives.${index}.weapons` as NestedListPath, 'Weapons', 'Add this operative’s ranged and melee weapons.', renderWeapon)}
      ${renderNestedRules(`operatives.${index}.abilities` as NestedListPath, 'Abilities', 'Add abilities available to this operative.', true)}
      ${renderNestedRules(`operatives.${index}.uniqueActions` as NestedListPath, 'Unique actions', 'Add actions unique to this operative.', true)}
      ${renderNestedRules(`operatives.${index}.equipmentOptions` as NestedListPath, 'Equipment options', 'Add equipment choices for this operative.')}
    </div>
  </details>
`;
};

const renderNestedList = (
  path: NestedListPath,
  title: string,
  description: string,
  renderer: (path: NestedListPath, index: number) => string,
): string => {
  const items = getList(path);
  return `
    <div class="nested-list" data-list-container="${path}">
      <div class="subsection-heading compact">
        <h4>${title}</h4>
        <p>${description}</p>
        <button class="button button-subtle" data-action="add-item" data-list-path="${path}" type="button">Add</button>
      </div>
      ${
        items.length === 0
          ? '<p class="empty-list">No entries yet.</p>'
          : items.map((_item, index) => renderer(path, index)).join('')
      }
    </div>
  `;
};

const renderNestedRules = (
  path: NestedListPath,
  title: string,
  description: string,
  operativeRule = false,
): string =>
  renderNestedList(path, title, description, (listPath, index) =>
    operativeRule
      ? renderRuleEntry(listPath, index, title)
      : renderSimpleRuleEntry(listPath, index, title),
  );

const hasText = (value: string): boolean => value.trim().length > 0;

const hasRuleEntryContent = (entry: RuleEntry): boolean =>
  hasText(entry.name) ||
  hasText(entry.cost) ||
  hasText(entry.timing) ||
  hasText(entry.restrictions) ||
  hasText(entry.rulesText);

const hasSimpleRuleContent = (entry: SimpleRuleEntry): boolean =>
  hasText(entry.name) || hasText(entry.rulesText);

const hasTacOpContent = (entry: TacOp): boolean =>
  hasText(entry.name) ||
  hasText(entry.archetype) ||
  hasText(entry.revealCondition) ||
  hasText(entry.scoringCondition) ||
  hasText(entry.rulesText);

const hasOperativeRuleContent = (entry: OperativeRuleEntry): boolean =>
  hasText(entry.name) ||
  hasText(entry.cost) ||
  hasText(entry.timing) ||
  hasText(entry.restrictions) ||
  hasText(entry.rulesText);

const hasWeaponContent = (weapon: Weapon): boolean =>
  hasText(weapon.name) ||
  hasText(weapon.weaponType) ||
  hasText(weapon.attacks) ||
  hasText(weapon.skill) ||
  hasText(weapon.damage) ||
  hasText(weapon.criticalDamage) ||
  hasText(weapon.rulesText);

const hasOperativeContent = (operative: Operative): boolean =>
  hasText(operative.name) ||
  hasText(operative.role) ||
  hasText(operative.portrait) ||
  operative.keywords.some(hasText) ||
  hasText(operative.movement) ||
  hasText(operative.actionPointLimit) ||
  hasText(operative.wounds) ||
  hasText(operative.save) ||
  operative.weapons.some(hasWeaponContent) ||
  operative.abilities.some(hasOperativeRuleContent) ||
  operative.uniqueActions.some(hasOperativeRuleContent) ||
  operative.equipmentOptions.some(hasSimpleRuleContent);

const hasPloyContent = (ploy: Ploy): boolean =>
  hasText(ploy.name) ||
  hasText(ploy.cost) ||
  hasText(ploy.timing) ||
  hasText(ploy.restrictions) ||
  hasText(ploy.rulesText);

const hasEquipmentContent = (equipment: Equipment): boolean =>
  hasText(equipment.name) || hasText(equipment.rulesText);

const previewText = (label: string, value: string): string =>
  hasText(value)
    ? `<div class="preview-field"><dt>${label}</dt><dd>${previewValue(value)}</dd></div>`
    : '';

const previewRuleEntry = (
  entry: RuleEntry | OperativeRuleEntry,
  operativeRule = false,
): string => {
  const hasContent = operativeRule
    ? hasOperativeRuleContent(entry as OperativeRuleEntry)
    : hasRuleEntryContent(entry as RuleEntry);
  if (!hasContent) {
    return '';
  }
  return `
    <article class="preview-card">
      <div class="preview-item-heading">
        ${hasText(entry.name) ? `<h3>${previewValue(entry.name)}</h3>` : ''}
        <div class="preview-cost-column">
          ${hasText(entry.cost) ? `<span class="preview-cost">${previewValue(entry.cost)}</span>` : ''}
          ${!operativeRule && hasText(entry.restrictions) ? `<p class="preview-restrictions">${previewValue(entry.restrictions)}</p>` : ''}
        </div>
      </div>
      ${operativeRule ? `<div class="preview-ploy-meta"><p class="preview-timing">${previewValue(entry.timing)}</p><p class="preview-restrictions">${previewValue(entry.restrictions)}</p></div>` : ''}
      ${hasText(entry.rulesText) ? `<p class="preview-text">${previewValue(entry.rulesText)}</p>` : ''}
    </article>
  `;
};

const previewSimpleRuleEntry = (entry: SimpleRuleEntry): string =>
  hasSimpleRuleContent(entry)
    ? `<article class="preview-card">${hasText(entry.name) ? `<h3>${previewValue(entry.name)}</h3>` : ''}${hasText(entry.rulesText) ? `<p class="preview-text">${previewValue(entry.rulesText)}</p>` : ''}</article>`
    : '';

const previewTacOp = (entry: TacOp): string =>
  hasTacOpContent(entry)
    ? `<article class="preview-card">
        ${hasText(entry.name) ? `<h3>${previewValue(entry.name)}</h3>` : ''}
        <dl>${previewText('Archetype', entry.archetype)}${previewText('Reveal condition', entry.revealCondition)}${previewText('Scoring condition', entry.scoringCondition)}</dl>
        ${hasText(entry.rulesText) ? `<p class="preview-text">${previewValue(entry.rulesText)}</p>` : ''}
      </article>`
    : '';

const previewSimpleRuleList = (
  title: string,
  entries: SimpleRuleEntry[],
): string => {
  const content = entries
    .filter(hasSimpleRuleContent)
    .map(previewSimpleRuleEntry)
    .join('');
  return content
    ? `<div class="preview-subsection"><h3>${title}</h3>${content}</div>`
    : '';
};

const previewTacOpList = (entries: TacOp[]): string => {
  const content = entries.filter(hasTacOpContent).map(previewTacOp).join('');
  return content
    ? `<div class="preview-subsection"><h3>Tac Ops</h3>${content}</div>`
    : '';
};

const previewWeapon = (weapon: Weapon): string => {
  if (!hasWeaponContent(weapon)) {
    return '';
  }
  return `
    <article class="preview-weapon">
      <div class="preview-item-heading">
        ${hasText(weapon.name) ? `<h4>${previewValue(weapon.name)}</h4>` : ''}
        ${weaponTypeIcon(weapon.weaponType)}
      </div>
      <div class="weapon-detail-row">
        <div class="stat-grid">
          ${previewStat('attacks', 'Attacks', weapon.attacks)}
          ${previewStat('skill', 'Skill', weapon.skill)}
          ${weapon.damage || weapon.criticalDamage ? previewStat('damage', 'Damage / critical damage', `${weapon.damage || '—'} / ${weapon.criticalDamage || '—'}`) : ''}
        </div>
        ${hasText(weapon.rulesText) ? `<p class="preview-text weapon-rules">${previewValue(weapon.rulesText)}</p>` : ''}
      </div>
    </article>
  `;
};

const previewRuleList = (
  title: string,
  entries: (RuleEntry | OperativeRuleEntry)[],
  operativeRule = false,
): string => {
  const content = entries
    .filter((entry) =>
      operativeRule
        ? hasOperativeRuleContent(entry as OperativeRuleEntry)
        : hasRuleEntryContent(entry as RuleEntry),
    )
    .map((entry) => previewRuleEntry(entry, operativeRule))
    .join('');
  return content
    ? `<div class="preview-subsection"><h3>${title}</h3>${content}</div>`
    : '';
};

const previewPloyList = (title: string, ploys: Ploy[]): string => {
  const content = ploys
    .filter(hasPloyContent)
    .map(
      (ploy) => `
        <article class="preview-card">
          <div class="preview-item-heading">
            ${hasText(ploy.name) ? `<h3>${previewValue(ploy.name)}</h3>` : ''}
            <div class="preview-cost-column">
              ${hasText(ploy.cost) ? `<span class="preview-cost">${previewValue(ploy.cost)}</span>` : ''}
            </div>
          </div>
          <div class="preview-ploy-meta">
            ${hasText(ploy.timing) ? `<p class="preview-timing">${previewValue(ploy.timing)}</p>` : '<span></span>'}
            ${hasText(ploy.restrictions) ? `<p class="preview-restrictions">${previewValue(ploy.restrictions)}</p>` : '<span></span>'}
          </div>
          ${hasText(ploy.rulesText) ? `<p class="preview-text">${previewValue(ploy.rulesText)}</p>` : ''}
        </article>
      `,
    )
    .join('');
  return content
    ? `<div class="preview-subsection"><h3>${title}</h3>${content}</div>`
    : '';
};

const previewOperatives = (operatives: Operative[]): string => {
  const content = operatives
    .filter(hasOperativeContent)
    .map(
      (operative) => `
        <article class="preview-operative">
          <div class="preview-operative-top">
            <div class="operative-portrait-column">
              ${operative.portrait ? `<img class="operative-portrait" src="${escapeHtml(operative.portrait)}" alt="Portrait of ${escapeHtml(operative.name || 'operative')}" />` : ''}

            </div>
            <div class="operative-heading">
                <div>
                  ${hasText(operative.name) ? `<h3>${previewValue(operative.name)}</h3>` : ''}
                  ${hasText(operative.role) ? `<p class="preview-subtitle">${previewValue(operative.role)}</p>` : ''}
                </div>
                <div class="stat-grid operative-stat-grid">
                  ${previewStat('apl', 'Action Point Limit', operative.actionPointLimit)}
                  ${previewStat('movement', 'Movement', operative.movement)}
                  ${previewStat('save', 'Save', operative.save)}
                  ${previewStat('wounds', 'Wounds', operative.wounds)}
                </div>
                ${operative.weapons.some(hasWeaponContent) ? `<div class="operative-weapons"><div class="weapon-table-header" aria-hidden="true"><span>Weapon</span><span>Attacks</span><span>Skill</span><span>Damage</span><span>Rules</span></div>${operative.weapons.filter(hasWeaponContent).map(previewWeapon).join('')}</div>` : ''}
              </div>
          </div>
          ${previewRuleList('Abilities', operative.abilities, true)}
          ${previewRuleList('Unique Actions', operative.uniqueActions, true)}
          ${operative.keywords.some(hasText) ? `<p class="preview-keywords operative-keywords">${previewValue(operative.keywords.filter(hasText).join(', '))}</p>` : ''}
          ${previewSimpleRuleList('Equipment options', operative.equipmentOptions)}
        </article>
      `,
    )
    .join('');
  return content
    ? `<section class="preview-section"><h2>Operatives</h2>${content}</section>`
    : '';
};

const previewEquipment = (equipment: Equipment[]): string => {
  const content = equipment
    .filter(hasEquipmentContent)
    .map(
      (item) => `
        <article class="preview-card">
          ${hasText(item.name) ? `<h3>${previewValue(item.name)}</h3>` : ''}
          ${hasText(item.rulesText) ? `<p class="preview-text">${previewValue(item.rulesText)}</p>` : ''}
        </article>
      `,
    )
    .join('');
  return content
    ? `<section class="preview-section"><h2>Equipment</h2>${content}</section>`
    : '';
};

const renderPreview = (): void => {
  const paper = app.querySelector<HTMLElement>('[data-preview-paper]');
  if (!paper) {
    return;
  }

  const theme = killTeamDocument.presentation.theme;
  const coverContent =
    hasText(killTeamDocument.identity.name) ||
    hasText(killTeamDocument.identity.teamKeyword) ||
    killTeamDocument.identity.symbol
      ? `<section class="preview-cover">
        ${killTeamDocument.identity.symbol ? '<div class="preview-symbol" role="img" aria-label="Kill Team symbol"></div>' : ''}
        ${hasText(killTeamDocument.identity.name) ? `<h1>${previewValue(killTeamDocument.identity.name)}</h1>` : ''}
        ${hasText(killTeamDocument.identity.teamKeyword) ? `<p class="preview-team-keyword">${previewValue(killTeamDocument.identity.teamKeyword)}</p>` : ''}
      </section>`
      : '';
  const narrativeContent = hasText(killTeamDocument.narrative)
    ? `<section class="preview-section preview-narrative"><h2>Narrative / background</h2><p class="preview-text">${previewValue(killTeamDocument.narrative)}</p></section>`
    : '';
  const compositionContent = hasText(killTeamDocument.teamComposition)
    ? `<section class="preview-section"><h2>Team composition</h2><p class="preview-text">${previewValue(killTeamDocument.teamComposition)}</p></section>`
    : '';
  const factionContent = [
    previewRuleList('Faction abilities', killTeamDocument.factionRules.rules),
    previewSimpleRuleList(
      'Chapter tactics',
      killTeamDocument.factionRules.chapterTactics,
    ),
    previewTacOpList(killTeamDocument.factionRules.tacOps),
  ].join('');
  const factionSection = factionContent
    ? `<section class="preview-section"><h2>Faction rules</h2>${factionContent}</section>`
    : '';
  const strategyContent = previewPloyList(
    'Strategy ploys',
    killTeamDocument.strategyPloys,
  );
  const firefightContent = previewPloyList(
    'Firefight ploys',
    killTeamDocument.firefightPloys,
  );
  const ploySection =
    strategyContent || firefightContent
      ? `<section class="preview-section"><h2>Ploys</h2>${strategyContent}${firefightContent}</section>`
      : '';

  const practicalContent = `${coverContent}${narrativeContent}${compositionContent}${previewOperatives(killTeamDocument.operatives)}${factionSection}${ploySection}${previewEquipment(killTeamDocument.equipment)}`;
  const layout = killTeamDocument.presentation.layout;
  paper.dataset.layout = layout;
  paper.innerHTML = `${layout === 'operatives-datacards' ? `<div class="datacards-layout">${previewOperatives(killTeamDocument.operatives)}</div>` : practicalContent}<footer class="print-footer">Page <span class="page-number"></span></footer>`;
  const primaryColor = theme.primary || '#30475e';
  app.style.setProperty('--team-primary', primaryColor);
  app.style.setProperty(
    '--team-symbol-image',
    killTeamDocument.identity.symbol
      ? `url("${killTeamDocument.identity.symbol}")`
      : 'none',
  );
  paper.style.setProperty('--preview-dark-text', theme.darkText || '#20242b');
  paper.style.setProperty('--preview-light-text', theme.lightText || '#f5f7fa');
  paper.style.setProperty(
    '--preview-dark-background',
    theme.darkBackground || '#20242b',
  );
  paper.style.setProperty(
    '--preview-light-background',
    theme.lightBackground || '#f5f7fa',
  );
  paper.style.setProperty('--preview-primary', primaryColor);
  paper.style.setProperty('--preview-secondary', theme.secondary || '#526b82');
  paper.style.setProperty('--preview-accent', theme.accent || '#d97745');
  paper.style.setProperty(
    '--preview-alternative-accent',
    theme.alternativeAccent || '#7b9e87',
  );
};

const renderSectionContent = (id: string): string => {
  switch (id) {
    case 'identity':
      return `
        <div class="field-grid identity-grid">
          ${field('Kill Team name', 'identity.name', { placeholder: 'For example, The Ashen Guard' })}
          ${field('Team keyword', 'identity.teamKeyword', { placeholder: 'For example, ASHEN GUARD' })}
          <label class="field"><span>Team symbol (SVG)</span><input data-symbol-upload type="file" accept=".svg,image/svg+xml" /></label>
        </div>
        <p class="field-help">The symbol must be an SVG and is stored in this document as image data; it is never uploaded.</p>
        ${killTeamDocument.identity.symbol ? `<div class="symbol-preview"><div class="symbol-preview-image" role="img" aria-label="Uploaded Kill Team symbol"></div><button class="button button-subtle" data-action="remove-symbol" type="button">Remove symbol</button></div>` : ''}
        <div class="subsection-heading"><div><h3>Theme colors</h3><p>These colors are used by the printable preview.</p></div></div>
        <div class="field-grid color-grid">${themeFields.map(([key, label]) => colorField(key, label)).join('')}</div>
        <div class="subsection-heading"><div><h3>Preview layout</h3><p>Choose how the generated document is arranged.</p></div></div>
        ${selectField('Layout', 'presentation.layout', layoutOptions)}
      `;
    case 'narrative':
      return field('Narrative / background', 'narrative', {
        multiline: true,
        placeholder: 'Tell the story of this Kill Team.',
      });
    case 'composition':
      return field('Team composition rules', 'teamComposition', {
        multiline: true,
        placeholder: 'Describe how a playable team is formed.',
      });
    case 'operatives':
      return renderList(
        'operatives',
        'Operatives',
        'Define the profiles that make up the Kill Team.',
        renderOperative,
      );
    case 'faction-rules':
      return `${renderList('factionRules.rules', 'Faction abilities', 'Add the general rules of the faction.', (path, index) => renderRuleEntry(path, index, 'Faction ability'))}${renderList('factionRules.chapterTactics', 'Chapter tactics', 'Add chapter tactics inside the faction rules.', (path, index) => renderSimpleRuleEntry(path, index, 'Chapter tactic'))}${renderList('factionRules.tacOps', 'Tac Ops', 'Add the faction’s Tac Ops.', renderTacOp)}`;
    case 'strategy-ploys':
      return renderList(
        'strategyPloys',
        'Strategy ploys',
        'Add ploys used during the Strategy phase.',
        renderPloy,
      );
    case 'firefight-ploys':
      return renderList(
        'firefightPloys',
        'Firefight ploys',
        'Add ploys used during the firefight.',
        renderPloy,
      );
    case 'equipment':
      return renderList(
        'equipment',
        'Equipment',
        'Add special equipment for the Kill Team.',
        renderEquipment,
      );
    default:
      return '';
  }
};

const renderSectionShell = (id: string, title: string): string => `
  <details class="editor-section" data-section="${id}" open>
    <summary>${title}</summary>
    <div class="section-content">${renderSectionContent(id)}</div>
  </details>
`;

const render = (): void => {
  app.innerHTML = `
    <header class="app-header">
      <div>
        <p class="eyebrow">Homebrew rules workshop</p>
        <h1>Kill Team Rule Generator</h1>
        <p class="app-intro">Build a printable rules document for your custom Kill Team.</p>
      </div>
      <div class="document-actions" aria-label="Document actions">
        <span class="save-status" role="status" aria-live="polite" data-save-status>${storage ? 'Saved locally' : 'Local storage unavailable'}</span>
        <button class="button button-secondary" data-action="import" type="button">Import JSON</button>
        <button class="button button-primary" data-action="export" type="button">Export JSON</button>
        <input data-import-input type="file" accept="application/json,.json" hidden />
      </div>
    </header>
    <main class="workspace">
      <section class="editor-panel" aria-labelledby="editor-heading">
        <div class="panel-heading"><p class="eyebrow">Editor</p><h2 id="editor-heading">Kill Team document</h2><p>Complete each section in order. Empty sections will stay out of the printed document.</p></div>
        <div class="accordion">${sections.map(([id, title]) => renderSectionShell(id, title)).join('')}</div>
      </section>
      <section class="preview-panel" aria-labelledby="preview-heading">
        <div class="panel-heading preview-heading"><div><p class="eyebrow">Live preview</p><h2 id="preview-heading">Printable document</h2></div><span class="paper-label">A4</span></div>
        <article class="paper-preview" data-preview-paper aria-label="A4 document preview"></article>
      </section>
    </main>
    <p class="app-error" data-error role="alert" hidden></p>
  `;
  bindEvents();
  renderPreview();
  renderColorSwatches();
};

const renderPreservingViewport = (
  targetPath?: AnyListPath,
  targetIndex?: number,
): void => {
  const editorPanel = app.querySelector<HTMLElement>('.editor-panel');
  const previewPanel = app.querySelector<HTMLElement>('.preview-panel');
  const editorScrollTop = editorPanel?.scrollTop ?? 0;
  const previewScrollTop = previewPanel?.scrollTop ?? 0;

  render();

  const newEditorPanel = app.querySelector<HTMLElement>('.editor-panel');
  const newPreviewPanel = app.querySelector<HTMLElement>('.preview-panel');
  if (newEditorPanel) {
    newEditorPanel.scrollTop = editorScrollTop;
  }
  if (newPreviewPanel) {
    newPreviewPanel.scrollTop = previewScrollTop;
  }

  if (targetPath !== undefined && targetIndex !== undefined) {
    const target = app.querySelector<HTMLElement>(
      `[data-drop-path="${targetPath}"][data-drop-index="${targetIndex}"]`,
    );
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest' });
    }
  }
};

const setError = (message: string): void => {
  const error = app.querySelector<HTMLElement>('[data-error]');
  if (error) {
    error.textContent = message;
    error.hidden = message.length === 0;
  }
};

const setSaveStatus = (message: string): void => {
  const status = app.querySelector<HTMLElement>('[data-save-status]');
  if (status) {
    status.textContent = message;
  }
};

const renderColorSwatches = (): void => {
  app.querySelectorAll<HTMLElement>('[data-color-swatch]').forEach((swatch) => {
    const path = swatch.dataset.colorSwatch ?? '';
    const key = path.split('.').at(-1) as keyof typeof defaultTheme;
    swatch.style.backgroundColor = valueAt(path) || defaultTheme[key];
  });
};

const moveItem = (
  path: AnyListPath,
  fromIndex: number,
  toIndex: number,
): void => {
  const items = getList(path);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return;
  }
  const [item] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, item);
  setList(path, items);
  scheduleSave();
  renderPreservingViewport();
};

const updateField = (path: string, value: string, isArray: boolean): void => {
  if (isArray) {
    setValueAt(
      path,
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
  } else {
    setValueAt(path, value);
  }

  const nameMatch = path.match(/^(.*)\.(\d+)\.name$/);
  if (nameMatch && value.trim()) {
    const item = app.querySelector<HTMLElement>(
      `[data-drop-path="${nameMatch[1]}"][data-drop-index="${nameMatch[2]}"]`,
    );
    item
      ?.querySelector<HTMLElement>('.list-item-title strong')
      ?.replaceChildren(value);
  }

  scheduleSave();
  renderPreview();
  renderColorSwatches();
};

const addItem = (path: AnyListPath): void => {
  const items = getList(path);
  items.push(emptyItem(path));
  setList(path, items);
  scheduleSave();
  renderPreservingViewport(path, items.length - 1);
};

const deleteItem = (path: AnyListPath, index: number): void => {
  const items = getList(path);
  items.splice(index, 1);
  setList(path, items);
  scheduleSave();
  renderPreservingViewport();
};

const handleImageUpload = async (
  input: HTMLInputElement,
  target: 'symbol' | { operativeIndex: number },
): Promise<void> => {
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  const isSymbol = target === 'symbol';
  if (
    isSymbol &&
    file.type !== 'image/svg+xml' &&
    !file.name.toLowerCase().endsWith('.svg')
  ) {
    setError('Only SVG files can be uploaded as the team symbol.');
    input.value = '';
    return;
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (
          typeof reader.result === 'string' &&
          reader.result.startsWith('data:image/') &&
          (!isSymbol || reader.result.startsWith('data:image/svg+xml'))
        ) {
          resolve(reader.result);
        } else {
          reject(
            new Error(
              isSymbol
                ? 'The SVG could not be read.'
                : 'The image could not be read.',
            ),
          );
        }
      });
      reader.addEventListener('error', () => reject(reader.error));
      reader.readAsDataURL(file);
    });

    if (target === 'symbol') {
      killTeamDocument.identity.symbol = dataUrl;
    } else {
      killTeamDocument.operatives[target.operativeIndex].portrait = dataUrl;
    }
    scheduleSave();
    setError('');
    renderPreservingViewport(
      target === 'symbol' ? undefined : 'operatives',
      target === 'symbol' ? undefined : target.operativeIndex,
    );
  } catch {
    setError(
      isSymbol
        ? 'The SVG could not be read. Please choose another file.'
        : 'The image could not be read. Please choose another file.',
    );
  }
};

const bindEvents = (): void => {
  app
    .querySelectorAll<HTMLButtonElement>('.list-item-header button')
    .forEach((button) => {
      button.addEventListener('click', (event) => event.stopPropagation());
    });

  app
    .querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >('[data-path]')
    .forEach((control) => {
      const update = (): void => {
        updateField(
          control.dataset.path ?? '',
          control.value,
          control.dataset.array === 'true',
        );
      };
      control.addEventListener(
        control instanceof HTMLSelectElement ? 'change' : 'input',
        update,
      );
    });

  app
    .querySelector<HTMLInputElement>('[data-symbol-upload]')
    ?.addEventListener('change', (event) => {
      void handleImageUpload(event.currentTarget as HTMLInputElement, 'symbol');
    });

  app
    .querySelectorAll<HTMLButtonElement>('[data-action="add-item"]')
    .forEach((button) => {
      button.addEventListener('click', () =>
        addItem(button.dataset.listPath as AnyListPath),
      );
    });

  app
    .querySelectorAll<HTMLButtonElement>('[data-action="delete-item"]')
    .forEach((button) => {
      button.addEventListener('click', () =>
        deleteItem(
          button.dataset.listPath as AnyListPath,
          Number(button.dataset.index),
        ),
      );
    });

  app
    .querySelectorAll<HTMLButtonElement>('[data-action="move-up"]')
    .forEach((button) => {
      button.addEventListener('click', () =>
        moveItem(
          button.dataset.listPath as AnyListPath,
          Number(button.dataset.index),
          Number(button.dataset.index) - 1,
        ),
      );
    });

  app
    .querySelectorAll<HTMLButtonElement>('[data-action="move-down"]')
    .forEach((button) => {
      button.addEventListener('click', () =>
        moveItem(
          button.dataset.listPath as AnyListPath,
          Number(button.dataset.index),
          Number(button.dataset.index) + 1,
        ),
      );
    });

  app
    .querySelectorAll<HTMLInputElement>('[data-portrait-upload]')
    .forEach((input) => {
      input.addEventListener('change', (event) => {
        void handleImageUpload(event.currentTarget as HTMLInputElement, {
          operativeIndex: Number(input.dataset.operativeIndex),
        });
      });
    });

  app
    .querySelectorAll<HTMLButtonElement>('[data-action="remove-portrait"]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        killTeamDocument.operatives[
          Number(button.dataset.operativeIndex)
        ].portrait = '';
        scheduleSave();
        renderPreservingViewport(
          'operatives',
          Number(button.dataset.operativeIndex),
        );
      });
    });

  app.querySelectorAll<HTMLElement>('[data-drag-path]').forEach((handle) => {
    handle.addEventListener('dragstart', () => {
      draggedItem = {
        path: handle.dataset.dragPath as AnyListPath,
        index: Number(handle.dataset.dragIndex),
      };
      handle.closest('.list-item')?.classList.add('is-dragging');
    });
    handle.addEventListener('dragend', () => {
      draggedItem = undefined;
      handle.closest('.list-item')?.classList.remove('is-dragging');
    });
  });

  app.querySelectorAll<HTMLElement>('[data-drop-path]').forEach((item) => {
    item.addEventListener('dragover', (event) => event.preventDefault());
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      const targetPath = item.dataset.dropPath as AnyListPath;
      const targetIndex = Number(item.dataset.dropIndex);
      if (
        draggedItem?.path === targetPath &&
        draggedItem.index !== targetIndex
      ) {
        moveItem(targetPath, draggedItem.index, targetIndex);
      }
      draggedItem = undefined;
    });
  });

  app
    .querySelector<HTMLButtonElement>('[data-action="remove-symbol"]')
    ?.addEventListener('click', () => {
      killTeamDocument.identity.symbol = '';
      scheduleSave();
      renderPreservingViewport();
    });

  app
    .querySelector<HTMLButtonElement>('[data-action="export"]')
    ?.addEventListener('click', () =>
      downloadKillTeamDocument(
        killTeamDocument,
        createKillTeamExportFilename(killTeamDocument.identity.name),
      ),
    );

  const importInput = app.querySelector<HTMLInputElement>(
    '[data-import-input]',
  );
  app
    .querySelector<HTMLButtonElement>('[data-action="import"]')
    ?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) {
      return;
    }
    try {
      killTeamDocument = deserializeKillTeamDocument(await file.text());
      autosave?.cancel();
      scheduleSave();
      setError('');
      render();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'The document could not be imported.',
      );
    } finally {
      importInput.value = '';
    }
  });
};

window.addEventListener('beforeunload', () => autosave?.flush());

render();
