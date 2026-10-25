import {
  CURRENT_SCHEMA_VERSION,
  createDefaultKillTeamDocument,
  LOCAL_STORAGE_KEY,
  parseKillTeamDocument,
  type KillTeamDocument,
} from './kill-team';

export const DEFAULT_AUTOSAVE_DELAY_MS = 400;
export const DEFAULT_EXPORT_FILENAME = 'Kill Team Rules.json';

export class KillTeamDocumentImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KillTeamDocumentImportError';
  }
}

export class KillTeamStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KillTeamStorageError';
  }
}

export const createKillTeamExportFilename = (teamName: string): string => {
  const safeName = teamName
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/[\n\r\t]/g, '')
    .replace(/\s+/g, ' ');
  return `${safeName || 'Kill Team'} Rules.json`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getSchemaVersion = (value: unknown): unknown =>
  isRecord(value) ? value.schemaVersion : undefined;

export const serializeKillTeamDocument = (document: KillTeamDocument): string =>
  `${JSON.stringify(parseKillTeamDocument(document), null, 2)}\n`;

export const deserializeKillTeamDocument = (json: string): KillTeamDocument => {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(json);
  } catch {
    throw new KillTeamDocumentImportError(
      'The selected file is not valid JSON.',
    );
  }

  const schemaVersion = getSchemaVersion(parsedJson);
  if (
    typeof schemaVersion === 'number' &&
    schemaVersion > CURRENT_SCHEMA_VERSION
  ) {
    throw new KillTeamDocumentImportError(
      `This document uses schema version ${schemaVersion}, but this version of the application supports version ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  try {
    return parseKillTeamDocument(parsedJson);
  } catch {
    throw new KillTeamDocumentImportError(
      'The selected JSON does not contain a valid Kill Team document.',
    );
  }
};

export const loadKillTeamDocument = (
  storage: Storage,
  storageKey = LOCAL_STORAGE_KEY,
): KillTeamDocument => {
  let storedDocument: string | null;

  try {
    storedDocument = storage.getItem(storageKey);
  } catch {
    return createDefaultKillTeamDocument();
  }

  if (storedDocument === null) {
    return createDefaultKillTeamDocument();
  }

  try {
    return deserializeKillTeamDocument(storedDocument);
  } catch {
    return createDefaultKillTeamDocument();
  }
};

export const saveKillTeamDocument = (
  document: KillTeamDocument,
  storage: Storage,
  storageKey = LOCAL_STORAGE_KEY,
): void => {
  try {
    storage.setItem(storageKey, serializeKillTeamDocument(document));
  } catch {
    throw new KillTeamStorageError(
      'The document could not be saved in local storage. Your browser may have disabled storage or its storage limit may have been reached.',
    );
  }
};

export type Autosave = {
  schedule: (document: KillTeamDocument) => void;
  flush: () => void;
  cancel: () => void;
};

export const createAutosave = (
  storage: Storage,
  storageKey = LOCAL_STORAGE_KEY,
  delayMs = DEFAULT_AUTOSAVE_DELAY_MS,
  setTimeoutFunction: typeof setTimeout = setTimeout,
  clearTimeoutFunction: typeof clearTimeout = clearTimeout,
  onError: (error: unknown) => void = () => undefined,
): Autosave => {
  let pendingDocument: KillTeamDocument | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const cancel = (): void => {
    if (timeoutId !== undefined) {
      clearTimeoutFunction(timeoutId);
      timeoutId = undefined;
    }
    pendingDocument = undefined;
  };

  const flush = (): void => {
    if (timeoutId !== undefined) {
      clearTimeoutFunction(timeoutId);
      timeoutId = undefined;
    }

    if (pendingDocument !== undefined) {
      const document = pendingDocument;
      pendingDocument = undefined;
      try {
        saveKillTeamDocument(document, storage, storageKey);
      } catch (error) {
        onError(error);
      }
    }
  };

  const schedule = (document: KillTeamDocument): void => {
    pendingDocument = document;

    if (timeoutId !== undefined) {
      clearTimeoutFunction(timeoutId);
    }

    timeoutId = setTimeoutFunction(flush, delayMs);
  };

  return { schedule, flush, cancel };
};

export const downloadKillTeamDocument = (
  killTeamDocument: KillTeamDocument,
  filename = DEFAULT_EXPORT_FILENAME,
): void => {
  const blob = new Blob([serializeKillTeamDocument(killTeamDocument)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = globalThis.document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const readKillTeamDocumentFile = async (
  file: File,
): Promise<KillTeamDocument> => deserializeKillTeamDocument(await file.text());
