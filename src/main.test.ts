// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadApplication = async (): Promise<void> => {
  vi.resetModules();
  document.body.innerHTML = '<main id="app"></main>';
  await import('./main');
};

const click = (selector: string): void => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  element.click();
};

const input = (selector: string, value: string): void => {
  const element = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

const previewText = (): string =>
  document.querySelector<HTMLElement>('[data-preview-paper]')?.textContent ??
  '';

describe('editor application', () => {
  beforeEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('renders all fixed editor sections and omits empty preview sections', async () => {
    await loadApplication();

    expect(document.querySelectorAll('.editor-section')).toHaveLength(8);
    expect(document.querySelectorAll('.preview-section')).toHaveLength(0);
  });

  it('updates the live preview when narrative text changes', async () => {
    await loadApplication();

    input(
      '[data-path="narrative"]',
      'The Ashen Guard patrol the ruined frontier.',
    );

    expect(previewText()).toContain(
      'The Ashen Guard patrol the ruined frontier.',
    );
    expect(previewText()).toContain('Narrative / background');
  });

  it('creates an operative with a nested weapon and renders both', async () => {
    await loadApplication();

    click('[data-action="add-item"][data-list-path="operatives"]');
    input('[data-path="operatives.0.name"]', 'Ashen Sergeant');
    click('[data-action="add-item"][data-list-path="operatives.0.weapons"]');
    input('[data-path="operatives.0.weapons.0.name"]', 'Ash rifle');
    input('[data-path="operatives.0.weapons.0.weaponType"]', 'Ranged');

    expect(previewText()).toContain('Ashen Sergeant');
    expect(previewText()).toContain('Ash rifle');
    expect(previewText()).toContain('Ash rifle');
    expect(previewText()).not.toContain('Weapons');
  });

  it('stores and renders an operative SVG portrait without making the card draggable', async () => {
    await loadApplication();

    click('[data-action="add-item"][data-list-path="operatives"]');
    const portraitInput = document.querySelector<HTMLInputElement>(
      '[data-portrait-upload]',
    );
    if (!portraitInput) {
      throw new Error('Portrait upload input not found.');
    }

    const portrait = new File(['portrait'], 'portrait.png', {
      type: 'image/png',
    });
    Object.defineProperty(portraitInput, 'files', { value: [portrait] });
    portraitInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 500));

    expect(document.querySelector('.preview-portrait')).not.toBeNull();
    expect(
      document.querySelector('.operative-item')?.hasAttribute('draggable'),
    ).toBe(false);
    expect(
      document.querySelector('.operative-item .drag-handle'),
    ).not.toBeNull();
  });

  it('collapses named items and renders rule cost and field order', async () => {
    await loadApplication();

    click('[data-action="add-item"][data-list-path="factionRules.rules"]');
    input('[data-path="factionRules.rules.0.name"]', 'Frontier discipline');
    input('[data-path="factionRules.rules.0.cost"]', '1AP');
    input('[data-path="factionRules.rules.0.restrictions"]', 'Leader only');
    input(
      '[data-path="factionRules.rules.0.rulesText"]',
      'Reroll one attack die.',
    );
    input('[data-path="factionRules.rules.0.keywords"]', 'Faction, Tactical');

    const item = document.querySelector<HTMLDetailsElement>(
      '[data-drop-path="factionRules.rules"]',
    );
    expect(item?.open).toBe(true);
    expect(item?.querySelector('.list-item-title strong')?.textContent).toBe(
      'Frontier discipline',
    );
    expect(previewText().indexOf('1AP')).toBeLessThan(
      previewText().indexOf('Leader only'),
    );
    expect(previewText().indexOf('Leader only')).toBeLessThan(
      previewText().indexOf('Reroll one attack die.'),
    );
    expect(previewText().indexOf('Reroll one attack die.')).toBeLessThan(
      previewText().indexOf('Faction · Tactical'),
    );

    item?.querySelector<HTMLElement>('summary')?.click();
    expect(item?.open).toBe(false);
  });

  it('supports all top-level reorderable content sections', async () => {
    await loadApplication();

    const lists = [
      'factionRules.rules',
      'factionRules.chapterTactics',
      'factionRules.tacOps',
      'strategyPloys',
      'firefightPloys',
      'equipment',
    ];

    for (const listPath of lists) {
      click(`[data-action="add-item"][data-list-path="${listPath}"]`);
    }

    expect(document.querySelectorAll('.list-item')).toHaveLength(6);
    expect(previewText()).not.toContain('Faction rules');
  });

  it('preserves item order when moving ploys', async () => {
    await loadApplication();

    click('[data-action="add-item"][data-list-path="strategyPloys"]');
    input('[data-path="strategyPloys.0.name"]', 'First ploy');
    click('[data-action="add-item"][data-list-path="strategyPloys"]');
    input('[data-path="strategyPloys.1.name"]', 'Second ploy');
    click(
      '[data-action="move-down"][data-list-path="strategyPloys"][data-index="0"]',
    );

    const rendered = previewText();
    expect(rendered.indexOf('Second ploy')).toBeLessThan(
      rendered.indexOf('First ploy'),
    );
  });

  it('removes list items and hides the empty section from the preview', async () => {
    await loadApplication();

    click('[data-action="add-item"][data-list-path="equipment"]');
    input('[data-path="equipment.0.name"]', 'Field kit');
    expect(previewText()).toContain('Field kit');

    click(
      '[data-action="delete-item"][data-list-path="equipment"][data-index="0"]',
    );

    expect(previewText()).not.toContain('Field kit');
    expect(previewText()).not.toContain('Equipment');
  });

  it('stores and removes an uploaded symbol', async () => {
    await loadApplication();

    const fileInput = document.querySelector<HTMLInputElement>(
      '[data-symbol-upload]',
    );
    if (!fileInput) {
      throw new Error('Symbol upload input not found.');
    }

    const symbol = new File(['symbol'], 'symbol.svg', {
      type: 'image/svg+xml',
    });
    Object.defineProperty(fileInput, 'files', { value: [symbol] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 500));

    expect(
      window.localStorage.getItem('kill-team-rules-generator.document'),
    ).toContain('data:image/svg+xml');
    expect(document.querySelector('.symbol-preview-image')).not.toBeNull();

    click('[data-action="remove-symbol"]');

    expect(document.querySelector('.symbol-preview')).toBeNull();
  });

  it('persists theme edits through the application autosave', async () => {
    vi.useFakeTimers();
    await loadApplication();

    input('[data-path="presentation.theme.primary"]', '#123456');
    vi.advanceTimersByTime(500);

    const stored = window.localStorage.getItem(
      'kill-team-rules-generator.document',
    );
    expect(stored).toContain('#123456');
    expect(document.querySelector('[data-save-status]')?.textContent).toBe(
      'Saved locally',
    );
    vi.useRealTimers();
  });
});
