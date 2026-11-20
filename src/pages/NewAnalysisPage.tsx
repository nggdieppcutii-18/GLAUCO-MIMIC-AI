import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FilePlus,
  FolderOpen,
  Info,
  Microscope,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';
import { ModalityUploadCard } from '../components/ModalityUploadCard';
import { FundusInferenceCard } from '../components/FundusInferenceCard';
import { ClinicalInfo } from '../components/ClinicalInfo';
import {
  DISEASE_GROUP_LIST,
  EMPTY_HISTORY_FLAGS,
  EMPTY_METRICS,
  MODALITY_CONFIGS,
  MODALITY_ORDER,
} from '../data/cohortDefinitions';
import {
  getActiveDraftId,
  getAllSavedCases,
  getCaseById,
  getSessionPreviewsForCase,
  removeSessionPreview,
  saveCaseRecord,
  setActiveDraftId,
  setSessionPreview,
} from '../services/caseStorageService';
import {
  ClinicalCaseRecord,
  ClinicalHistoryFlags,
  ClinicalMetrics,
  DiseaseGroupId,
  EyeLaterality,
  ImageModalityMetadata,
  ModalityType,
  RuntimeModalityPreview,
} from '../types/clinical';
import {
  evaluateCaseCompleteness,
  validateCaseForm,
} from '../utils/clinicalValidation';

function generateAnonymousId(): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `GM-2026-${randomDigits}`;
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function createBlankCaseRecord(): ClinicalCaseRecord {
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();
  return {
    id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    anonymousPatientId: generateAnonymousId(),
    eye: 'OD',
    examDate: today,
    captureDate: today,
    patientAge: null,
    patientSex: '',
    referringCohort: 'UNCLASSIFIED',
    clinicalNotes: '',
    modalities: {},
    metrics: { ...EMPTY_METRICS },
    historyFlags: { ...EMPTY_HISTORY_FLAGS },
    status: 'DRAFT',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export const NewAnalysisPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryCaseId = searchParams.get('caseId');
  const resetTs = (location.state as { resetTs?: number } | null)?.resetTs;

  const [savedCases, setSavedCases] = useState<ClinicalCaseRecord[]>(() =>
    getAllSavedCases()
  );

  const [currentRecord, setCurrentRecord] = useState<ClinicalCaseRecord>(() => {
    const targetId = queryCaseId || getActiveDraftId();
    if (targetId) {
      const found = getCaseById(targetId);
      if (found) return found;
    }
    return createBlankCaseRecord();
  });

  const [runtimePreviews, setRuntimePreviews] = useState<
    Partial<Record<ModalityType, RuntimeModalityPreview>>
  >(() => getSessionPreviewsForCase(currentRecord.id));

  const [saveBanner, setSaveBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (resetTs) {
      const fresh = createBlankCaseRecord();
      setCurrentRecord(fresh);
      setRuntimePreviews({});
      setActiveDraftId(null);
      setSaveBanner({
        type: 'info',
        message: 'Đã khởi tạo biểu mẫu ca bệnh ẩn danh mới.',
      });
      return;
    }
    if (queryCaseId) {
      const found = getCaseById(queryCaseId);
      if (found) {
        setCurrentRecord(found);
        setRuntimePreviews({ ...getSessionPreviewsForCase(found.id) });
        setActiveDraftId(found.id);
      }
    }
  }, [queryCaseId, resetTs]);

  const validation = useMemo(
    () =>
      validateCaseForm(
        currentRecord.anonymousPatientId,
        currentRecord.examDate,
        currentRecord.captureDate,
        currentRecord.patientAge,
        currentRecord.metrics
      ),
    [
      currentRecord.anonymousPatientId,
      currentRecord.examDate,
      currentRecord.captureDate,
      currentRecord.patientAge,
      currentRecord.metrics,
    ]
  );

  const completeness = useMemo(
    () => evaluateCaseCompleteness(currentRecord),
    [currentRecord]
  );

  const handleSelectModalityFile = (modality: ModalityType, file: File) => {
    const preview = setSessionPreview(currentRecord.id, modality, file);
    const meta: ImageModalityMetadata = {
      modality,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'image/jpeg',
      lastModified: file.lastModified,
      uploadedAt: new Date().toISOString(),
    };

    setCurrentRecord((prev) => ({
      ...prev,
      modalities: {
        ...prev.modalities,
        [modality]: meta,
      },
    }));

    setRuntimePreviews((prev) => ({
      ...prev,
      [modality]: preview,
    }));

    setSaveBanner({
      type: 'info',
      message: `Đã nạp ảnh "${file.name}" cho ${MODALITY_CONFIGS[modality].shortCode}. Nhấn "Lưu Bản nháp" để lưu thông tin hồ sơ.`,
    });
  };

  const handleRemoveModalityFile = (modality: ModalityType) => {
    removeSessionPreview(currentRecord.id, modality);
    setCurrentRecord((prev) => {
      const nextModalities = { ...prev.modalities };
      delete nextModalities[modality];
      return {
        ...prev,
        modalities: nextModalities,
      };
    });
    setRuntimePreviews((prev) => {
      const next = { ...prev };
      delete next[modality];
      return next;
    });
  };

  const handleMetricChange = (field: keyof ClinicalMetrics, rawValue: string) => {
    if (rawValue.trim() === '') {
      setCurrentRecord((prev) => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          [field]: null,
        },
      }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isNaN(parsed)) {
      setCurrentRecord((prev) => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          [field]: parsed,
        },
      }));
    }
  };

  const handleHistoryToggle = (flag: keyof ClinicalHistoryFlags) => {
    setCurrentRecord((prev) => ({
      ...prev,
      historyFlags: {
        ...prev.historyFlags,
        [flag]: !prev.historyFlags[flag],
      },
    }));
  };

  const handleSaveDraft = () => {
    if (!validation.isValid) {
      setSaveBanner({
        type: 'error',
        message:
          'Vui lòng kiểm tra lại các trường báo đỏ (Mã BN ẩn danh, ngày khám/chụp hoặc giá trị thông số nằm ngoài ngưỡng sinh lý).',
      });
      return;
    }

    const saved = saveCaseRecord({
      ...currentRecord,
      status: 'DRAFT',
    });
    setCurrentRecord(saved);
    setActiveDraftId(saved.id);
    setSavedCases(getAllSavedCases());
    setSearchParams({ caseId: saved.id }, { replace: true });
    setSaveBanner({
      type: 'success',
      message: `Đã lưu bản nháp hồ sơ "${saved.anonymousPatientId}" (${saved.eye}) vào bộ nhớ trình duyệt. Lưu ý: Metadata được lưu bền vững, còn tệp ảnh gốc chỉ giữ trong phiên làm việc hiện tại để bảo mật dữ liệu bệnh nhân.`,
    });
  };

  const handleProceedToAnalysisView = () => {
    if (!validation.isValid) {
      setSaveBanner({
        type: 'error',
        message:
          'Không thể chuyển sang Kết quả: Vui lòng sửa các trường thông tin không hợp lệ được đánh dấu bên dưới.',
      });
      return;
    }

    const saved = saveCaseRecord({
      ...currentRecord,
      status: 'PENDING_AI_INFERENCE',
    });
    setCurrentRecord(saved);
    setActiveDraftId(saved.id);
    setSavedCases(getAllSavedCases());
    navigate(`/analysis-results?caseId=${encodeURIComponent(saved.id)}`);
  };

  const handleCreateFreshCase = () => {
    const fresh = createBlankCaseRecord();
    setCurrentRecord(fresh);
    setRuntimePreviews({});
    setActiveDraftId(null);
    setSearchParams({}, { replace: true });
    setSaveBanner({
      type: 'info',
      message: 'Đã khởi tạo biểu mẫu ca bệnh ẩn danh mới.',
    });
  };

  const handleLoadExistingDraft = (caseId: string) => {
    if (!caseId) return;
    const found = getCaseById(caseId);
    if (found) {
      setCurrentRecord(found);
      setRuntimePreviews({ ...getSessionPreviewsForCase(found.id) });
      setActiveDraftId(found.id);
      setSearchParams({ caseId: found.id }, { replace: true });
      setSaveBanner({
        type: 'info',
        message: `Đã mở lại hồ sơ "${found.anonymousPatientId}" (${found.eye}).`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Draft Switcher Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Nhập Dữ liệu Ca bệnh Đa phương thức
            </h2>
            <ClinicalInfo
              title="Quy trình Nhập Dữ liệu Ca bệnh"
              brief="Hỗ trợ đầy đủ hoặc một phần ảnh Fundus, OCT và chỉ số lâm sàng"
              detail="Hệ thống cho phép lưu bản nháp ngay cả khi thiếu dữ liệu để tiếp tục bổ sung sau. Dữ liệu ảnh y khoa chỉ nạp vào bộ nhớ phiên trình duyệt (object URL) và không tải lên máy chủ ngoài."
              reference="Bảo mật dữ liệu y tế & Quy trình phân tích đa phương thức"
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Xử lý cục bộ bảo mật trên trình duyệt • Cho phép lưu bản nháp khi chưa đủ thông tin
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Draft Loader Select */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <FolderOpen className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              aria-label="Mở nhanh hồ sơ đã lưu"
              value={savedCases.some((c) => c.id === currentRecord.id) ? currentRecord.id : ''}
              onChange={(e) => handleLoadExistingDraft(e.target.value)}
              className="text-xs bg-transparent text-slate-800 font-medium focus:outline-none pr-2 cursor-pointer"
            >
              <option value="">-- Mở bản nháp ({savedCases.length}) --</option>
              {savedCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.anonymousPatientId} ({c.eye}) • {c.examDate} [{c.status === 'DRAFT' ? 'Nháp' : 'Chờ AI'}]
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCreateFreshCase}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Tạo mới</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3.5 py-2 rounded-lg border border-teal-600 bg-white hover:bg-teal-50 text-xs font-semibold text-teal-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu Nháp</span>
          </button>

          <button
            type="button"
            onClick={handleProceedToAnalysisView}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Microscope className="w-4 h-4" />
            <span>Lưu & Đối chiếu 5 Nhóm</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {saveBanner && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs sm:text-sm flex items-start justify-between gap-3 ${
            saveBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : saveBanner.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-teal-50 border-teal-200 text-teal-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {saveBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : saveBanner.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            )}
            <span>{saveBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveBanner(null)}
            className="text-xs underline opacity-75 hover:opacity-100 shrink-0 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Grid: Left 2 cols (Demographics + Upload + Metrics), Right 1 col (Live Completeness & Storage Notice) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Patient Anonymized ID, OD/OS, Exam & Capture Dates */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  1. Định danh & Thời điểm Thăm khám
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Không sử dụng họ tên thật hoặc mã số cá nhân (CCCD/BHYT)
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 truncate max-w-60" title={currentRecord.id}>
                ID: {currentRecord.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Anonymous Patient ID */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label
                    htmlFor="anonymousPatientId"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Mã bệnh nhân ẩn danh <span className="text-rose-500">*</span>
                  </label>
                  <ClinicalInfo
                    title="Mã Bệnh nhân Ẩn danh"
                    brief="Mã định danh nội bộ không chứa PII"
                    detail="Mã định danh dạng GM-YYYY-XXXX giúp bảo vệ tuyệt đối quyền riêng tư bệnh nhân theo quy chuẩn y tế HIPAA/GDPR, đảm bảo nghiên cứu không làm lộ thông tin cá nhân."
                    reference="Quy chuẩn khử định danh y tế"
                  />
                </div>
                <div className="flex gap-1.5">
                  <input
                    id="anonymousPatientId"
                    type="text"
                    value={currentRecord.anonymousPatientId}
                    onChange={(e) =>
                      setCurrentRecord((prev) => ({
                        ...prev,
                        anonymousPatientId: e.target.value,
                      }))
                    }
                    placeholder="VD: GM-2026-0042"
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${
                      validation.errors.anonymousPatientId
                        ? 'border-rose-400 focus:ring-rose-500/20 bg-rose-50/30'
                        : 'border-slate-300 focus:border-teal-600 focus:ring-teal-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentRecord((prev) => ({
                        ...prev,
                        anonymousPatientId: generateAnonymousId(),
                      }))
                    }
                    title="Tạo mã ngẫu nhiên"
                    className="px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 shrink-0 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Mã mới</span>
                  </button>
                </div>
                {validation.errors.anonymousPatientId && (
                  <p className="text-xs text-rose-600 mt-1">
                    {validation.errors.anonymousPatientId}
                  </p>
                )}
              </div>

              {/* Eye Laterality OD / OS */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="block text-xs font-semibold text-slate-700">
                    Mắt khảo sát (OD / OS) <span className="text-rose-500">*</span>
                  </span>
                  <ClinicalInfo
                    title="Mắt khảo sát (Laterality)"
                    brief="OD: Oculus Dexter (Phải), OS: Oculus Sinister (Trái)"
                    detail="Xác định đúng mắt khảo sát để định hướng đối chiếu tổn thương lớp sợi thần kinh quanh gai và trường nhìn tương ứng (tôn trọng cấu trúc giải phẫu bán phần)."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['OD', 'OS'] as EyeLaterality[]).map((eyeOption) => {
                    const active = currentRecord.eye === eyeOption;
                    return (
                      <button
                        key={eyeOption}
                        type="button"
                        onClick={() =>
                          setCurrentRecord((prev) => ({
                            ...prev,
                            eye: eyeOption,
                          }))
                        }
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                          active
                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-mono text-sm">{eyeOption}</span>
                        <span className="font-normal opacity-90">
                          {eyeOption === 'OD' ? '(Mắt Phải)' : '(Mắt Trái)'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exam Date */}
              <div>
                <label
                  htmlFor="examDate"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Ngày khám lâm sàng <span className="text-rose-500">*</span>
                </label>
                <input
                  id="examDate"
                  type="date"
                  value={currentRecord.examDate}
                  onChange={(e) =>
                    setCurrentRecord((prev) => ({
                      ...prev,
                      examDate: e.target.value,
                    }))
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    validation.errors.examDate
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300 focus:border-teal-600 focus:ring-teal-500/20'
                  }`}
                />
                {validation.errors.examDate && (
                  <p className="text-xs text-rose-600 mt-1">{validation.errors.examDate}</p>
                )}
              </div>

              {/* Capture Date */}
              <div>
                <label
                  htmlFor="captureDate"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Ngày chụp hình ảnh (CFP / OCT) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="captureDate"
                  type="date"
                  value={currentRecord.captureDate}
                  onChange={(e) =>
                    setCurrentRecord((prev) => ({
                      ...prev,
                      captureDate: e.target.value,
                    }))
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    validation.errors.captureDate
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300 focus:border-teal-600 focus:ring-teal-500/20'
                  }`}
                />
                {validation.errors.captureDate && (
                  <p className="text-xs text-rose-600 mt-1">{validation.errors.captureDate}</p>
                )}
              </div>

              {/* Optional Age & Sex */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="patientAge"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Tuổi (Tùy chọn)
                  </label>
                  <input
                    id="patientAge"
                    type="number"
                    min={1}
                    max={120}
                    value={currentRecord.patientAge ?? ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setCurrentRecord((prev) => ({
                        ...prev,
                        patientAge: val === '' ? null : Number(val),
                      }));
                    }}
                    placeholder="VD: 58"
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${
                      validation.errors.patientAge
                        ? 'border-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:border-teal-600 focus:ring-teal-500/20'
                    }`}
                  />
                  {validation.errors.patientAge && (
                    <p className="text-xs text-rose-600 mt-1">{validation.errors.patientAge}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="patientSex"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Giới tính (Tùy chọn)
                  </label>
                  <select
                    id="patientSex"
                    value={currentRecord.patientSex}
                    onChange={(e) =>
                      setCurrentRecord((prev) => ({
                        ...prev,
                        patientSex: e.target.value as 'M' | 'F' | 'OTHER' | '',
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">-- Chọn --</option>
                    <option value="M">Nam (M)</option>
                    <option value="F">Nữ (F)</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              {/* Optional Referring / Reference Cohort Tag for Research Dataset */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label
                    htmlFor="referringCohort"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Nhãn lâm sàng ban đầu (Nếu có)
                  </label>
                  <ClinicalInfo
                    title="Nhãn Lâm sàng Ban đầu"
                    brief="Nhóm chẩn đoán tham chiếu hoặc phân loại ban đầu"
                    detail="Dùng để gắn nhãn ca bệnh phục vụ đối chiếu, kiểm định chéo với kết quả suy luận 5 nhóm của hệ thống. Nếu là ca bệnh mới chưa rõ chẩn đoán, để 'Chưa phân nhóm'."
                  />
                </div>
                <select
                  id="referringCohort"
                  value={currentRecord.referringCohort}
                  onChange={(e) =>
                    setCurrentRecord((prev) => ({
                      ...prev,
                      referringCohort: e.target.value as DiseaseGroupId | 'UNCLASSIFIED',
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="UNCLASSIFIED">
                    Chưa phân nhóm (Cần đối chiếu chẩn đoán phân biệt)
                  </option>
                  {DISEASE_GROUP_LIST.map((g) => (
                    <option key={g.id} value={g.id}>
                      [{g.shortName}] {g.nameVi}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Multimodal Image Uploads */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  2. Hình ảnh Đa phương thức
                </h3>
                <ClinicalInfo
                  title="Hình ảnh Đa phương thức"
                  brief="Fundus, OCT RNFL, OCT GCC/GCIPL, Visual Field"
                  detail="Hỗ trợ ảnh đáy mắt màu chụp gai thị và các lát cắt OCT, kết quả đo thị trường. Ảnh chỉ nạp trong bộ nhớ tạm trình duyệt, bảo vệ quyền riêng tư người bệnh."
                  reference="Chuẩn hóa dữ liệu ảnh y khoa GLAUCO-MIMIC"
                />
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-200/70 text-slate-700 font-semibold self-start sm:self-center">
                Đã đính kèm: {completeness.modalityCount}/4 phương thức
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODALITY_ORDER.map((modKey) => (
                <ModalityUploadCard
                  key={modKey}
                  config={MODALITY_CONFIGS[modKey]}
                  metadata={currentRecord.modalities[modKey]}
                  runtimePreview={runtimePreviews[modKey]}
                  onSelectFile={(file) => handleSelectModalityFile(modKey, file)}
                  onRemove={() => handleRemoveModalityFile(modKey)}
                />
              ))}
            </div>

            {/* AI Fundus Inference with Verified ResNet-18 */}
            <FundusInferenceCard
              fundusFile={runtimePreviews.fundus?.file}
              fundusFileName={currentRecord.modalities.fundus?.fileName}
              originalImageUri={runtimePreviews.fundus?.objectUrl}
              savedInference={currentRecord.fundusInference}
              onInferenceSuccess={(result) => {
                setCurrentRecord((prev) => ({
                  ...prev,
                  fundusInference: result,
                }));
                setSaveBanner({
                  type: 'success',
                  message: `Đã hoàn tất suy luận AI: Dự đoán ${result.predictedClass} (Điểm Softmax Glocom = ${(result.probabilities.Glaucoma * 100).toFixed(1)}%). Nhấn "Lưu Nháp" để lưu kết quả vào hồ sơ.`,
                });
              }}
            />
          </section>

          {/* Section 3: Quantitative OCT, IOP, and Perimetry Metrics */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  3. Chỉ số Định lượng Lâm sàng & Cận lâm sàng
                </h3>
                <ClinicalInfo
                  title="Chỉ số Định lượng Lâm sàng & Cận lâm sàng"
                  brief="Hỗ trợ thông tin chưa đầy đủ, kiểm tra tự động ngưỡng sinh lý"
                  detail="Cho phép để trống các trường chưa đo được. Những chỉ số đã nhập sẽ được kiểm tra tự động xem có vượt ngoài giới hạn sinh lý hay không."
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setCurrentRecord((prev) => ({
                    ...prev,
                    metrics: { ...EMPTY_METRICS },
                  }))
                }
                className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 self-start sm:self-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa trắng thông số</span>
              </button>
            </div>

            {/* Sub-group A: IOP, BCVA, Optic Disc C/D, Signal Strength */}
            <div>
              <h4 className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>A. Nhãn áp, Thị lực & Gai thị</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Nhãn áp IOP (mmHg)
                    </label>
                    <ClinicalInfo
                      title="Nhãn áp (IOP)"
                      brief="Ngưỡng sinh lý: 10 – 21 mmHg"
                      detail="Yếu tố nguy cơ hàng đầu và có thể can thiệp của Glocom. Trong CON và ON, nhãn áp thường bình thường."
                    />
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="10 - 21"
                    value={currentRecord.metrics.iopMmHg ?? ''}
                    onChange={(e) => handleMetricChange('iopMmHg', e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                      validation.errors.metrics.iopMmHg
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {validation.errors.metrics.iopMmHg && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {validation.errors.metrics.iopMmHg}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      BCVA (LogMAR)
                    </label>
                    <ClinicalInfo
                      title="Thị lực Chỉnh kính Tối đa (BCVA)"
                      brief="LogMAR 0.0 tương đương 10/10 Snellen"
                      detail="Glocom thường bảo tồn thị lực trung tâm đến giai đoạn muộn. NAION và ON thường giảm thị lực trung tâm cấp tính."
                    />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={currentRecord.metrics.bcvaLogMAR ?? ''}
                    onChange={(e) => handleMetricChange('bcvaLogMAR', e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                      validation.errors.metrics.bcvaLogMAR
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {validation.errors.metrics.bcvaLogMAR && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {validation.errors.metrics.bcvaLogMAR}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      C/D Dọc (CDR)
                    </label>
                    <ClinicalInfo
                      title="Tỷ lệ Lõm Gai Dọc (Vertical CDR)"
                      brief="Sinh lý bình thường ≤ 0.40 – 0.50"
                      detail="Tỷ lệ > 0.60 hoặc bất đối xứng hai mắt > 0.20 gợi ý tổn thương teo lõm đặc trưng của Glocom."
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.35"
                    value={currentRecord.metrics.cdrVertical ?? ''}
                    onChange={(e) => handleMetricChange('cdrVertical', e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                      validation.errors.metrics.cdrVertical
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {validation.errors.metrics.cdrVertical && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {validation.errors.metrics.cdrVertical}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      C/D Diện tích
                    </label>
                    <ClinicalInfo
                      title="Tỷ lệ Lõm / Đĩa Diện tích"
                      brief="Tỷ lệ diện tích chén lõm trên toàn đĩa thị"
                      detail="Hỗ trợ đánh giá toàn diện hình thái lõm gai khi kết hợp với tỷ lệ đường kính dọc."
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.25"
                    value={currentRecord.metrics.cdrArea ?? ''}
                    onChange={(e) => handleMetricChange('cdrArea', e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                      validation.errors.metrics.cdrArea
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {validation.errors.metrics.cdrArea && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {validation.errors.metrics.cdrArea}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      OCT Signal (1–10)
                    </label>
                    <ClinicalInfo
                      title="Chất lượng Tín hiệu OCT (Signal Strength)"
                      brief="Thang 1 – 10 (khuyến nghị ≥ 6/10)"
                      detail="Chất lượng quét quang học ảnh hưởng trực tiếp tới độ tin cậy phân đoạn tự động các lớp sợi thần kinh."
                    />
                  </div>
                  <input
                    type="number"
                    step="1"
                    placeholder="8"
                    value={currentRecord.metrics.octSignalStrength ?? ''}
                    onChange={(e) => handleMetricChange('octSignalStrength', e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                      validation.errors.metrics.octSignalStrength
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {validation.errors.metrics.octSignalStrength && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {validation.errors.metrics.octSignalStrength}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-group B: Peripapillary RNFL Thickness */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <h4 className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                  B. Độ dày Lớp sợi thần kinh quanh gai — OCT RNFL (µm)
                </h4>
                <ClinicalInfo
                  title="Quy tắc Phân bố RNFL (Quy luật ISNT)"
                  brief="Độ dày sinh lý: Dưới (I) ≥ Trên (S) ≥ Mũi (N) ≥ Thái dương (T)"
                  detail="Ngưỡng RNFL trung bình bình thường khoảng ~85 – 105 µm. Đảo ngược quy luật ISNT hoặc giảm mỏng cực trên/dưới là chỉ điểm điển hình của Glocom."
                  reference="European Glaucoma Guidelines"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {(
                  [
                    ['rnflAvgUm', 'RNFL Trung bình', '95', 'Độ dày 360° trung bình quanh gai thị'],
                    ['rnflSuperiorUm', 'Góc Trên (S)', '120', 'Khu vực cực trên đĩa thị'],
                    ['rnflInferiorUm', 'Góc Dưới (I)', '125', 'Khu vực cực dưới đĩa thị (thường dày nhất theo ISNT)'],
                    ['rnflTemporalUm', 'Thái dương (T)', '70', 'Bó sợi gai thị hoàng điểm (papillomacular bundle)'],
                    ['rnflNasalUm', 'Phía mũi (N)', '72', 'Khu vực phía mũi đĩa thị'],
                  ] as Array<[keyof ClinicalMetrics, string, string, string]>
                ).map(([fieldKey, label, placeholder, tip]) => (
                  <div key={fieldKey}>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="block text-xs font-medium text-slate-700">
                        {label}
                      </label>
                      <ClinicalInfo title={label} brief={tip} />
                    </div>
                    <input
                      type="number"
                      step="1"
                      placeholder={placeholder}
                      value={currentRecord.metrics[fieldKey] ?? ''}
                      onChange={(e) => handleMetricChange(fieldKey, e.target.value)}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                        validation.errors.metrics[fieldKey]
                          ? 'border-rose-400 bg-rose-50/40'
                          : 'border-slate-300'
                      }`}
                    />
                    {validation.errors.metrics[fieldKey] && (
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        {validation.errors.metrics[fieldKey]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sub-group C: Macular GCC/GCIPL & Visual Field */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <h4 className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                  C. Tế bào hạch Hoàng điểm (GCC/GCIPL) & Thị trường (SAP)
                </h4>
                <ClinicalInfo
                  title="GCC Hoàng điểm & Thị trường SAP"
                  brief="Phân tích tổn thương tế bào nơron hạch và độ nhạy ánh sáng"
                  detail="GCC/GCIPL phản ánh tổn thương thân tế bào hạch trước khi mất sợi trục rõ ràng. Thị trường SAP (MD/PSD) đo lường chức năng tổn thương quang học tương ứng."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      GCC/GCIPL TB (µm)
                    </label>
                    <ClinicalInfo
                      title="GCC/GCIPL Trung bình"
                      brief="Ngưỡng sinh lý: ~75 – 90 µm"
                      detail="Độ dày trung bình lớp phức hợp tế bào hạch võng mạc vùng hoàng điểm."
                    />
                  </div>
                  <input
                    type="number"
                    step="1"
                    placeholder="82"
                    value={currentRecord.metrics.gccAvgUm ?? ''}
                    onChange={(e) => handleMetricChange('gccAvgUm', e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                      validation.errors.metrics.gccAvgUm
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {validation.errors.metrics.gccAvgUm && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {validation.errors.metrics.gccAvgUm}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      GCC Tối thiểu (µm)
                    </label>
                    <ClinicalInfo
                      title="GCC/GCIPL Tối thiểu"
                      brief="Giá trị mỏng nhất tại vùng hoàng điểm"
                      detail="Nhạy trong phát hiện khuyết cục bộ tế bào hạch sớm theo kinh tuyến ngang."
                    />
                  </div>
                  <input
                    type="number"
                    step="1"
                    placeholder="78"
                    value={currentRecord.metrics.gccMinimumUm ?? ''}
                    onChange={(e) => handleMetricChange('gccMinimumUm', e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                      validation.errors.metrics.gccMinimumUm
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {validation.errors.metrics.gccMinimumUm && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {validation.errors.metrics.gccMinimumUm}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Thị trường MD (dB)
                    </label>
                    <ClinicalInfo
                      title="Độ lệch Trung bình (Mean Defect - MD)"
                      brief="Độ suy giảm độ nhạy sáng trung bình so với người cùng độ tuổi"
                      detail="Bình thường ≥ -2.0 dB. Càng âm (-6, -12, -20 dB) biểu hiện tổn thương thị trường càng nặng."
                    />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="-1.5"
                    value={currentRecord.metrics.vfMdDb ?? ''}
                    onChange={(e) => handleMetricChange('vfMdDb', e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                      validation.errors.metrics.vfMdDb
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {validation.errors.metrics.vfMdDb && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {validation.errors.metrics.vfMdDb}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Thị trường PSD (dB)
                    </label>
                    <ClinicalInfo
                      title="Độ lệch Chuẩn Mẫu (Pattern Standard Deviation - PSD)"
                      brief="Mức độ tổn thương dạng ám điểm khu trú"
                      detail="Bình thường thấp (< 2.0 dB). Tăng cao trong các tổn thương khuyết cục bộ như khuyết hình cung Glocom hay khuyết nửa dưới NAION."
                    />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="1.8"
                    value={currentRecord.metrics.vfPsdDb ?? ''}
                    onChange={(e) => handleMetricChange('vfPsdDb', e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono ${
                      validation.errors.metrics.vfPsdDb
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {validation.errors.metrics.vfPsdDb && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {validation.errors.metrics.vfPsdDb}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-group D: Clinical History Checkboxes & Free-text Notes */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                  D. Dấu hiệu Lâm sàng Bổ trợ & Bệnh sử
                </h4>
                <ClinicalInfo
                  title="Dấu hiệu Lâm sàng Phân biệt"
                  brief="Các triệu chứng then chốt giúp phân biệt 5 nhóm bệnh lý thần kinh thị giác"
                  detail="RAPD (+), đau khi vận nhãn (Optic Neuritis), đau đầu (CON), và tiền sử gia đình (Glocom) là dữ kiện lâm sàng quyết định chẩn đoán phân biệt khi hình ảnh học chồng lấp."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {(
                  [
                    ['acuteVisionLoss', 'Giảm thị lực khởi phát cấp / bán cấp'],
                    ['painOnEyeMovement', 'Đau hốc mắt tăng khi vận nhãn (gợi ý ON)'],
                    ['dyschromatopsia', 'Rối loạn sắc giác (đặc biệt trục Đỏ-Xanh)'],
                    ['rapdPresent', 'Phản xạ đồng tử hướng tâm tương đối RAPD (+)'],
                    ['neurologicalSymptoms', 'Đau đầu / Dấu hiệu thần kinh khu trú (gợi ý CON)'],
                    ['familyHistoryGlaucoma', 'Tiền sử gia đình có người mắc Glocom'],
                  ] as Array<[keyof ClinicalHistoryFlags, string]>
                ).map(([flagKey, label]) => (
                  <label
                    key={flagKey}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      currentRecord.historyFlags[flagKey]
                        ? 'bg-teal-50/70 border-teal-300 text-teal-950 font-medium'
                        : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={currentRecord.historyFlags[flagKey]}
                      onChange={() => handleHistoryToggle(flagKey)}
                      className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label
                  htmlFor="clinicalNotes"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Ghi chú lâm sàng / Nhận xét hình thái đĩa thị (Tùy chọn)
                </label>
                <textarea
                  id="clinicalNotes"
                  rows={2}
                  value={currentRecord.clinicalNotes}
                  onChange={(e) =>
                    setCurrentRecord((prev) => ({
                      ...prev,
                      clinicalNotes: e.target.value,
                    }))
                  }
                  placeholder="Mô tả viền thần kinh, mức độ bạc màu, xuất huyết cạnh đĩa, kết quả MRI sọ não (nếu có)..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Real-time Completeness & Data Privacy Notice */}
        <div className="space-y-5">
          {/* Completeness Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Độ Đầy đủ Dữ liệu
                  </h3>
                  <ClinicalInfo
                    title="Đánh giá Mức độ Đầy đủ Dữ liệu"
                    brief="Tính toán theo trọng số: 4 phương thức ảnh + chỉ số lâm sàng"
                    detail="Hệ thống chấm điểm tỷ lệ hoàn thiện hồ sơ. Điểm càng cao (>75%), khả năng phân tích đa phương thức và độ tin cậy đối chiếu 5 nhóm bệnh lý càng tối ưu."
                  />
                </div>
                <p className="text-xs text-slate-500">{completeness.readinessLabel}</p>
              </div>
              <span className="text-xl font-bold font-mono text-teal-700">
                {completeness.overallScore}%
              </span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  completeness.overallScore >= 75
                    ? 'bg-emerald-500'
                    : completeness.overallScore >= 50
                      ? 'bg-teal-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${completeness.overallScore}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[11px]">Ảnh Đa phương thức</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {completeness.modalityCount} / 4
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[11px]">Chỉ số Lâm sàng</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {completeness.metricsEnteredCount} / {completeness.totalMetricsCount}
                </div>
              </div>
            </div>

            {/* Warnings List */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">
                Cảnh báo Thiếu Dữ liệu ({completeness.warnings.length})
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {completeness.warnings.map((w) => (
                  <div
                    key={w.id}
                    className={`p-2 rounded-lg border text-xs space-y-0.5 ${
                      w.severity === 'critical'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                        : w.severity === 'warning'
                          ? 'bg-slate-50 border-slate-200 text-slate-800'
                          : 'bg-slate-50/50 border-slate-200/70 text-slate-600'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5 text-[11px]">
                      <AlertTriangle
                        className={`w-3 h-3 shrink-0 ${
                          w.severity === 'critical' ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      />
                      <span>{w.title}</span>
                    </div>
                    <p className="text-[10px] opacity-90 leading-relaxed pl-4.5">{w.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage & Privacy Notice */}
            <div className="p-3 rounded-lg bg-slate-900 text-slate-200 text-xs space-y-1">
              <div className="font-semibold text-teal-400 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px]">Lưu trữ & Bảo mật (Frontend V1)</span>
                </div>
                <ClinicalInfo
                  title="Chính sách Bảo mật & Lưu trữ Dữ liệu"
                  brief="Chỉ lưu metadata trong localStorage, ảnh gốc xử lý cục bộ"
                  detail="Để bảo vệ an toàn thông tin y tế, toàn bộ ảnh bệnh nhân chỉ tồn tại trong bộ nhớ phiên (RAM) của trình duyệt. Không gửi ảnh lên bên thứ ba. Metadata và các chỉ số đo đạc được lưu trong localStorage để tiếp tục chỉnh sửa."
                  reference="Tiêu chuẩn dữ liệu y khoa an toàn"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Metadata & chỉ số lưu trong <code className="text-teal-300">localStorage</code>. Ảnh gốc chỉ nạp tạm trong phiên để bảo mật.
              </p>
            </div>

            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="w-full py-2 px-3 rounded-lg border border-teal-600 bg-white hover:bg-teal-50 text-teal-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Bản nháp</span>
              </button>
              <button
                type="button"
                onClick={handleProceedToAnalysisView}
                className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Microscope className="w-3.5 h-3.5" />
                <span>Xem Kết quả Phân tích</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

