export type DiseaseGroupId = 'GLAUCOMA' | 'CON' | 'NAION' | 'ON' | 'HEALTHY';

export type EyeLaterality = 'OD' | 'OS';

export type ModalityType = 'fundus' | 'oct_rnfl' | 'oct_gcc' | 'visual_field';

export type CaseRecordStatus = 'DRAFT' | 'READY_FOR_ANALYSIS' | 'PENDING_AI_INFERENCE';

export interface DiseaseGroupDefinition {
  id: DiseaseGroupId;
  code: string;
  nameEn: string;
  nameVi: string;
  shortName: string;
  folderName: string;
  colorClass: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  description: string;
  keyFundusFeatures: string[];
  keyOctFeatures: string[];
  keyClinicalClues: string[];
  repoFundusCount: number;
  repoOctCount: number;
  repoUniqueFundusCount: number;
  repoUniqueOctCount: number;
}

export interface ImageModalityMetadata {
  modality: ModalityType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  lastModified: number;
  uploadedAt: string;
  notes?: string;
}

export interface RuntimeModalityPreview {
  modality: ModalityType;
  objectUrl: string;
  file: File;
}

export interface ClinicalMetrics {
  iopMmHg: number | null;
  bcvaLogMAR: number | null;
  cdrVertical: number | null;
  cdrArea: number | null;
  rnflAvgUm: number | null;
  rnflSuperiorUm: number | null;
  rnflInferiorUm: number | null;
  rnflTemporalUm: number | null;
  rnflNasalUm: number | null;
  gccAvgUm: number | null;
  gccMinimumUm: number | null;
  vfMdDb: number | null;
  vfPsdDb: number | null;
  octSignalStrength: number | null;
}

export interface ClinicalHistoryFlags {
  acuteVisionLoss: boolean;
  painOnEyeMovement: boolean;
  dyschromatopsia: boolean;
  rapdPresent: boolean;
  neurologicalSymptoms: boolean;
  familyHistoryGlaucoma: boolean;
}

export interface FundusInferenceRecord {
  status: 'SUCCESS' | 'ERROR';
  model: string;
  targetModality: string;
  predictedClass: 'Glaucoma' | 'Non-Glaucoma';
  predictionCode: 'GLAUCOMA' | 'NON_GLAUCOMA';
  softmaxScores?: {
    Glaucoma: number;
    'Non-Glaucoma': number;
  };
  probabilities: {
    Glaucoma: number;
    'Non-Glaucoma': number;
  };
  confidenceScore: number;
  inferenceTimeMs: number;
  imageMetadata: {
    filename: string;
    originalWidth: number;
    originalHeight: number;
    processedSize: [number, number];
  };
  gradcamOverlayUri: string;
  disclaimer: string;
  fiveClassScaffoldNotice: string;
  executedAt: string;
}

export interface ClinicalCaseRecord {
  id: string;
  anonymousPatientId: string;
  eye: EyeLaterality;
  examDate: string;
  captureDate: string;
  patientAge: number | null;
  patientSex: 'M' | 'F' | 'OTHER' | '';
  referringCohort: DiseaseGroupId | 'UNCLASSIFIED';
  clinicalNotes: string;
  modalities: Partial<Record<ModalityType, ImageModalityMetadata>>;
  metrics: ClinicalMetrics;
  historyFlags: ClinicalHistoryFlags;
  status: CaseRecordStatus;
  createdAt: string;
  updatedAt: string;
  isSeedCase?: boolean;
  fundusInference?: FundusInferenceRecord;
}

export interface DataCompletenessWarning {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  field: string;
  title: string;
  detail: string;
}

export interface CompletenessReport {
  overallScore: number;
  modalityCount: number;
  requiredModalitiesPresent: boolean;
  metricsEnteredCount: number;
  totalMetricsCount: number;
  warnings: DataCompletenessWarning[];
  readinessLabel: string;
}

export interface FastApiServiceHealth {
  endpointUrl: string;
  connected: boolean;
  modelVerified: boolean;
  engineState: 'AWAITING_MODEL_WEIGHTS' | 'OFFLINE' | 'INFERENCE_READY' | 'MODEL_LOADED' | 'ONLINE_VERIFIED';
  apiVersion: string;
  lastCheckedAt: string;
  message: string;
}

