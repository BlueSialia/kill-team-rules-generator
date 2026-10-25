import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CURRENT_SCHEMA_VERSION,
  createDefaultKillTeamDocument,
  LOCAL_STORAGE_KEY,
} from './kill-team';
import {
  createAutosave,
  createKillTeamExportFilename,
  deserializeKillTeamDocument,
  KillTeamDocumentImportError,
  KillTeamStorageError,
  loadKillTeamDocument,
  saveKillTeamDocument,
  serializeKillTeamDocument,
} from './persistence';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('Kill Team document serialization', () => {
  it('creates a safe rules filename from the team name', () => {
    expect(createKillTeamExportFilename('The Ashen Guard')).toBe(
      'The Ashen Guard Rules.json',
    );
    expect(createKillTeamExportFilename('  /Ashen:Guard?  ')).toBe(
      'AshenGuard Rules.json',
    );
  });

  it('round-trips a document as readable JSON', () => {
    const document = createDefaultKillTeamDocument();
    document.identity.name = 'The Ashen Guard';
    document.operatives.push({
      name: 'Ashen Sergeant',
      role: 'Leader',
      portrait: '',
      keywords: ['ASHEN GUARD', 'LEADER'],
      movement: '6',
      actionPointLimit: '2',
      wounds: '10',
      save: '3+',
      weapons: [],
      abilities: [],
      uniqueActions: [],
      equipmentOptions: [],
    });

    const serialized = serializeKillTeamDocument(document);
    const restored = deserializeKillTeamDocument(serialized);

    expect(serialized).toContain(
      `\n  "schemaVersion": ${CURRENT_SCHEMA_VERSION}`,
    );
    expect(restored).toEqual(document);
  });

  it('rejects malformed JSON with an import error', () => {
    expect(() => deserializeKillTeamDocument('{not json')).toThrow(
      KillTeamDocumentImportError,
    );
  });

  it('rejects invalid documents without partially importing them', () => {
    expect(() =>
      deserializeKillTeamDocument(
        JSON.stringify({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          kind: 'not-a-kill-team',
        }),
      ),
    ).toThrow(KillTeamDocumentImportError);
  });

  it('reports unsupported future schema versions clearly', () => {
    expect(() =>
      deserializeKillTeamDocument(
        JSON.stringify({ schemaVersion: 2, kind: 'kill-team' }),
      ),
    ).toThrow('supports version 1');
  });
});

class UnavailableStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('Storage unavailable');
  }

  override setItem(): void {
    throw new Error('Storage unavailable');
  }
}

describe('Kill Team document local storage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('saves and loads the current document', () => {
    const document = createDefaultKillTeamDocument();
    document.identity.name = 'Stored Team';

    saveKillTeamDocument(document, storage);

    expect(storage.getItem(LOCAL_STORAGE_KEY)).toContain('Stored Team');
    expect(loadKillTeamDocument(storage)).toEqual(document);
  });

  it('starts with a default document when storage is empty', () => {
    expect(loadKillTeamDocument(storage)).toEqual(
      createDefaultKillTeamDocument(),
    );
  });

  it('starts with a default document when stored data is corrupt', () => {
    storage.setItem(LOCAL_STORAGE_KEY, '{not json');

    expect(loadKillTeamDocument(storage)).toEqual(
      createDefaultKillTeamDocument(),
    );
  });

  it('handles unavailable storage without crashing the editor', () => {
    const unavailableStorage = new UnavailableStorage();
    const document = createDefaultKillTeamDocument();

    expect(loadKillTeamDocument(unavailableStorage)).toEqual(
      createDefaultKillTeamDocument(),
    );
    expect(() => saveKillTeamDocument(document, unavailableStorage)).toThrow(
      KillTeamStorageError,
    );
  });

  it('reports autosave storage failures without throwing from the timer', () => {
    vi.useFakeTimers();
    const failingStorage = new UnavailableStorage();
    const onError = vi.fn();
    const autosave = createAutosave(
      failingStorage,
      LOCAL_STORAGE_KEY,
      400,
      setTimeout,
      clearTimeout,
      onError,
    );

    autosave.schedule(createDefaultKillTeamDocument());
    expect(() => vi.advanceTimersByTime(400)).not.toThrow();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(KillTeamStorageError);
    vi.useRealTimers();
  });

  it('debounces saves and writes the latest document', () => {
    vi.useFakeTimers();
    const autosave = createAutosave(storage, LOCAL_STORAGE_KEY, 400);
    const firstDocument = createDefaultKillTeamDocument();
    const latestDocument = createDefaultKillTeamDocument();
    latestDocument.identity.name = 'Latest Team';

    autosave.schedule(firstDocument);
    autosave.schedule(latestDocument);
    vi.advanceTimersByTime(399);
    expect(storage.getItem(LOCAL_STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(1);

    expect(loadKillTeamDocument(storage)).toEqual(latestDocument);
    autosave.cancel();
    vi.useRealTimers();
  });
});
