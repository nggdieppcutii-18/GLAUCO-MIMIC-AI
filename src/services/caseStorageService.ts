import { INITIAL_SEED_CASES } from '../data/cohortDefinitions.ts';
import type {
  ClinicalCaseRecord,
  ModalityType,
  RuntimeModalityPreview,
} from '../types/clinical';

const LEGACY_STORAGE_KEY = 'glauco_mimic_ai_cases_v1';
const STORAGE_KEY = 'glauco_mimic_ai_cases_v1_clean';
const ACTIVE_DRAFT_ID_KEY = 'glauco_mimic_ai_active_draft_id_v1';

/**
 * In-memory runtime store for File & blob ObjectURLs during the current browser tab session.
 * IMPORTANT: Patient images are NEVER converted to Base64 or saved into localStorage.
 */
const sessionPreviewsStore = new Map<
  string,
  Partial<Record<ModalityType, RuntimeModalityPreview>>
>();

export function getAllSavedCases(): ClinicalCaseRecord[] {
  try {
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_CASES));
      return [...INITIAL_SEED_CASES];
    }
    const parsed = JSON.parse(raw) as ClinicalCaseRecord[];
    if (!Array.isArray(parsed)) {
      return [...INITIAL_SEED_CASES];
    }
    return parsed.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    return [...INITIAL_SEED_CASES];
  }
}

export function getCaseById(caseId: string): ClinicalCaseRecord | null {
  const cases = getAllSavedCases();
  return cases.find((c) => c.id === caseId) ?? null;
}

export function saveCaseRecord(record: ClinicalCaseRecord): ClinicalCaseRecord {
  const cases = getAllSavedCases();
  const nowIso = new Date().toISOString();
  const updatedRecord: ClinicalCaseRecord = {
    ...record,
    updatedAt: nowIso,
  };

  const existingIndex = cases.findIndex((c) => c.id === record.id);
  if (existingIndex >= 0) {
    cases[existingIndex] = updatedRecord;
  } else {
    cases.unshift(updatedRecord);
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  return updatedRecord;
}

export function deleteCaseRecord(caseId: string): ClinicalCaseRecord[] {
  const cases = getAllSavedCases().filter((c) => c.id !== caseId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  clearSessionPreviewsForCase(caseId);
  const activeId = getActiveDraftId();
  if (activeId === caseId) {
    setActiveDraftId(null);
  }
  return cases;
}

export function resetSeedCases(): ClinicalCaseRecord[] {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_CASES));
  return [...INITIAL_SEED_CASES];
}

export function cloneFellowEyeCase(sourceCaseId: string): ClinicalCaseRecord | null {
  const source = getCaseById(sourceCaseId);
  if (!source) return null;

  const nowIso = new Date().toISOString();
  const fellowEye = source.eye === 'OD' ? 'OS' : 'OD';
  const clonedRecord: ClinicalCaseRecord = {
    ...source,
    id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eye: fellowEye,
    modalities: {},
    clinicalNotes: source.clinicalNotes
      ? `[Mắt đối diện ${fellowEye} của ${source.anonymousPatientId}] ${source.clinicalNotes}`
      : `Hồ sơ mắt đối diện (${fellowEye}) của bệnh nhân ${source.anonymousPatientId}.`,
    status: 'DRAFT',
    createdAt: nowIso,
    updatedAt: nowIso,
    isSeedCase: false,
  };

  return saveCaseRecord(clonedRecord);
}

export function importCasesFromJson(jsonString: string): {
  importedCount: number;
  cases: ClinicalCaseRecord[];
} {
  const parsed = JSON.parse(jsonString) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Tệp JSON không đúng định dạng mảng hồ sơ (ClinicalCaseRecord[]).');
  }

  const currentCases = getAllSavedCases();
  const byId = new Map<string, ClinicalCaseRecord>();
  currentCases.forEach((c) => byId.set(c.id, c));

  let importedCount = 0;
  for (const item of parsed) {
    if (
      item &&
      typeof item === 'object' &&
      'id' in item &&
      'anonymousPatientId' in item &&
      'eye' in item
    ) {
      byId.set((item as ClinicalCaseRecord).id, item as ClinicalCaseRecord);
      importedCount += 1;
    }
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return { importedCount, cases: merged };
}

export function getActiveDraftId(): string | null {
  return window.localStorage.getItem(ACTIVE_DRAFT_ID_KEY);
}

export function setActiveDraftId(caseId: string | null): void {
  if (!caseId) {
    window.localStorage.removeItem(ACTIVE_DRAFT_ID_KEY);
  } else {
    window.localStorage.setItem(ACTIVE_DRAFT_ID_KEY, caseId);
  }
}

export function setSessionPreview(
  caseId: string,
  modality: ModalityType,
  file: File
): RuntimeModalityPreview {
  const existingMap = sessionPreviewsStore.get(caseId) ?? {};
  const previous = existingMap[modality];
  if (previous?.objectUrl) {
    URL.revokeObjectURL(previous.objectUrl);
  }
  const objectUrl = URL.createObjectURL(file);
  const preview: RuntimeModalityPreview = {
    modality,
    objectUrl,
    file,
  };
  existingMap[modality] = preview;
  sessionPreviewsStore.set(caseId, existingMap);
  return preview;
}

export function removeSessionPreview(caseId: string, modality: ModalityType): void {
  const existingMap = sessionPreviewsStore.get(caseId);
  if (!existingMap) return;
  const previous = existingMap[modality];
  if (previous?.objectUrl) {
    URL.revokeObjectURL(previous.objectUrl);
  }
  delete existingMap[modality];
  sessionPreviewsStore.set(caseId, existingMap);
}

export function getSessionPreviewsForCase(
  caseId: string
): Partial<Record<ModalityType, RuntimeModalityPreview>> {
  return sessionPreviewsStore.get(caseId) ?? {};
}

export function clearSessionPreviewsForCase(caseId: string): void {
  const existingMap = sessionPreviewsStore.get(caseId);
  if (existingMap) {
    Object.values(existingMap).forEach((item) => {
      if (item?.objectUrl) {
        URL.revokeObjectURL(item.objectUrl);
      }
    });
    sessionPreviewsStore.delete(caseId);
  }
}
