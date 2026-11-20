import type {
  ClinicalCaseRecord,
  DiseaseGroupId,
  FastApiServiceHealth,
  ModalityType,
} from '../types/clinical';

/**
 * FastAPI Service Layer (Connected to PVTv2-B2 V4 Five-Fold Ensemble).
 * Configured via VITE_FASTAPI_BASE_URL environment variable.
 * Restricted to the local research inference server.
 */
const DEFAULT_FASTAPI_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_FASTAPI_BASE_URL ||
  'http://127.0.0.1:8001/api/v1';

export interface FastApiMultimodalSubmissionPayload {
  caseId: string;
  anonymousPatientId: string;
  eye: 'OD' | 'OS';
  examDate: string;
  captureDate: string;
  patientAge: number | null;
  patientSex: string;
  metrics: ClinicalCaseRecord['metrics'];
  historyFlags: ClinicalCaseRecord['historyFlags'];
  modalityFilenames: Partial<Record<ModalityType, string>>;
}

export interface FastApiInferenceStatusResponse {
  caseId: string;
  status: 'PENDING_MODEL_VERIFICATION' | 'QUEUED' | 'COMPLETED';
  modelCheckpointVerified: boolean;
  message: string;
  probabilities: Record<DiseaseGroupId, number | null>;
}

export interface FundusPredictionResult {
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
}

class GlaucoMimicFastApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_FASTAPI_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Probes local FastAPI backend health. Returns structured offline/awaiting-model status
   * without throwing unhandled exceptions when running Frontend V1 standalone.
   */
  public async checkHealth(): Promise<FastApiServiceHealth> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as Partial<FastApiServiceHealth> & {
          modelName?: string;
          targetClasses?: string[];
        };
        return {
          endpointUrl: this.baseUrl,
          connected: true,
          modelVerified: Boolean(data.modelVerified),
          engineState: (data.engineState as any) || (data.modelVerified ? 'INFERENCE_READY' : 'AWAITING_MODEL_WEIGHTS'),
          apiVersion: data.apiVersion || '2.0.0-v4',
          lastCheckedAt: new Date().toISOString(),
          message:
  data.message ||
  'Kết nối FastAPI thành công. PVTv2-B2 V4 Five-Fold Ensemble đã sẵn sàng suy luận (INFERENCE_READY).',
        };
      }
    } catch {
      // Expected when running Frontend V1 without local FastAPI server running
    } finally {
      window.clearTimeout(timeoutId);
    }

    return {
      endpointUrl: this.baseUrl,
      connected: false,
      modelVerified: false,
      engineState: 'AWAITING_MODEL_WEIGHTS',
      apiVersion: '2.0.0-v4-offline',
      lastCheckedAt: new Date().toISOString(),
      message:
        'Chưa kết nối FastAPI V4 (http://127.0.0.1:8001). Vui lòng khởi động PVTv2-B2 V4 backend để sử dụng chức năng suy luận AI.',
    };
  }

  /**
   * Sends a single Fundus photograph to FastAPI `/api/v1/predict/fundus`.
   * Includes 20-second timeout and robust offline/network error handling.
   * Returns binary classification softmax scores (Glaucoma / Non-Glaucoma) and Grad-CAM heatmap.
   */
  public async predictFundus(file: File): Promise<FundusPredictionResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${this.baseUrl}/predict/fundus`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errMsg = `Lỗi suy luận (Mã HTTP ${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson.detail) errMsg = errJson.detail;
        } catch {
          // fallback
        }
        throw new Error(errMsg);
      }

      return (await response.json()) as FundusPredictionResult;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(
          'Quá thời gian chờ phản hồi từ máy chủ (Timeout sau 60s). Vui lòng kiểm tra tải CPU của backend và thử lại.'
        );
      }
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        throw new Error(
          `Không thể kết nối đến máy chủ suy luận (Backend Offline). Vui lòng kiểm tra backend đang chạy tại ${this.baseUrl}.`
        );
      }
      throw err;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  /**
   * Prepares FormData payload for multipart upload to FastAPI `/api/v1/cases/analyze`
   * when the local backend is deployed.
   */
  public buildMultipartFormData(
    record: ClinicalCaseRecord,
    files: Partial<Record<ModalityType, File>>
  ): FormData {
    const formData = new FormData();
    const metadataPayload: FastApiMultimodalSubmissionPayload = {
      caseId: record.id,
      anonymousPatientId: record.anonymousPatientId,
      eye: record.eye,
      examDate: record.examDate,
      captureDate: record.captureDate,
      patientAge: record.patientAge,
      patientSex: record.patientSex,
      metrics: record.metrics,
      historyFlags: record.historyFlags,
      modalityFilenames: {
        fundus: record.modalities.fundus?.fileName,
        oct_rnfl: record.modalities.oct_rnfl?.fileName,
        oct_gcc: record.modalities.oct_gcc?.fileName,
        visual_field: record.modalities.visual_field?.fileName,
      },
    };

    formData.append('metadata', JSON.stringify(metadataPayload));

    (Object.keys(files) as ModalityType[]).forEach((modality) => {
      const file = files[modality];
      if (file) {
        formData.append(`file_${modality}`, file, file.name);
      }
    });

    return formData;
  }
}

export const fastApiClient = new GlaucoMimicFastApiClient();
