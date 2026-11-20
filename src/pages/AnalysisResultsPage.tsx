import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileEdit,
  FilePlus2,
  HelpCircle,
  Info,
  Layers,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { ClinicalInfo } from '../components/ClinicalInfo';
import { FundusInferenceCard } from '../components/FundusInferenceCard';
import {
  DISEASE_GROUP_LIST,
  MODALITY_CONFIGS,
  MODALITY_ORDER,
} from '../data/cohortDefinitions';
import {
  getAllSavedCases,
  getCaseById,
  getSessionPreviewsForCase,
  saveCaseRecord,
  setActiveDraftId,
} from '../services/caseStorageService';
import { DiseaseGroupId, FundusInferenceRecord } from '../types/clinical';
import { evaluateCaseCompleteness, formatBytes } from '../utils/clinicalValidation';

/**
 * Clearly labeled UI Schema Preview values ONLY shown when the user explicitly toggles
 * "Xem Bố cục Minh họa Schema Đầu ra (Illustrative UI Layout Only)".
 * By default, showIllustrativeSchema is FALSE and all 5 cohorts display Pending AI status.
 */
const ILLUSTRATIVE_SCHEMA_EXAMPLE: Record<
  DiseaseGroupId,
  { illustrativeBarWidth: number; schemaNote: string }
> = {
  GLAUCOMA: {
    illustrativeBarWidth: 20,
    schemaNote: '[Minh họa bố cục] Thanh hiển thị xác suất hậu nghiệm P(y=Glaucoma | X) từ FastAPI',
  },
  CON: {
    illustrativeBarWidth: 20,
    schemaNote: '[Minh họa bố cục] Thanh hiển thị xác suất hậu nghiệm P(y=CON | X) từ FastAPI',
  },
  NAION: {
    illustrativeBarWidth: 20,
    schemaNote: '[Minh họa bố cục] Thanh hiển thị xác suất hậu nghiệm P(y=NAION | X) từ FastAPI',
  },
  ON: {
    illustrativeBarWidth: 20,
    schemaNote: '[Minh họa bố cục] Thanh hiển thị xác suất hậu nghiệm P(y=ON | X) từ FastAPI',
  },
  HEALTHY: {
    illustrativeBarWidth: 20,
    schemaNote: '[Minh họa bố cục] Thanh hiển thị xác suất hậu nghiệm P(y=Healthy | X) từ FastAPI',
  },
};

export const AnalysisResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const cases = useMemo(() => getAllSavedCases(), []);
  const requestedCaseId = searchParams.get('caseId');

  const selectedCase = useMemo(() => {
    if (requestedCaseId) {
      const found = getCaseById(requestedCaseId);
      if (found) return found;
    }
    return cases[0] ?? null;
  }, [cases, requestedCaseId]);

  const [showIllustrativeSchema, setShowIllustrativeSchema] = useState(false);
  const [showSafetyPrinciples, setShowSafetyPrinciples] = useState(false);

  const completeness = useMemo(
    () => (selectedCase ? evaluateCaseCompleteness(selectedCase) : null),
    [selectedCase]
  );

  const runtimePreviews = useMemo(
    () => (selectedCase ? getSessionPreviewsForCase(selectedCase.id) : {}),
    [selectedCase]
  );

  const handleSelectCase = (caseId: string) => {
    setSearchParams({ caseId });
  };

  const handleEditCurrentCase = () => {
    if (!selectedCase) return;
    setActiveDraftId(selectedCase.id);
    navigate(`/new-analysis?caseId=${encodeURIComponent(selectedCase.id)}`);
  };

  const handleInferenceSuccess = (result: FundusInferenceRecord) => {
    if (!selectedCase) return;
    const updated = {
      ...selectedCase,
      fundusInference: result,
      updatedAt: new Date().toISOString(),
    };
    saveCaseRecord(updated);
  };

  if (!selectedCase || !completeness) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Chưa có Hồ sơ Ca bệnh</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Vui lòng tạo hồ sơ phân tích mới hoặc tải dữ liệu hình ảnh đa phương thức để xem giao diện kết quả và đối chiếu 5 nhóm bệnh.
        </p>
        <button
          type="button"
          onClick={() => navigate('/new-analysis')}
          className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>Tạo Ca phân tích Mới</span>
        </button>
      </div>
    );
  }

  const m = selectedCase.metrics;
  const f = selectedCase.historyFlags;

  return (
    <div className="space-y-6">
      {/* Case Selector & Action Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
              {selectedCase.anonymousPatientId}
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
              Mắt: {selectedCase.eye}
            </span>
            <span className="text-xs text-slate-500">
              Ngày khám: <strong>{selectedCase.examDate}</strong> • Ngày chụp:{' '}
              <strong>{selectedCase.captureDate}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Đối chiếu Đa phương thức 5 Nhóm Bệnh lý Thần kinh Thị giác
            </h2>
            <ClinicalInfo
              title="Khung Đối chiếu Đa phương thức"
              brief="Glocom vs CON vs NAION vs ON vs Mắt bình thường"
              detail="Hệ thống tổng hợp đồng thời hình thái đáy mắt, độ dày lớp sợi thần kinh quanh gai (OCT RNFL), phức hợp tế bào hạch hoàng điểm (OCT GCC/GCIPL) và thị trường (SAP) để hỗ trợ chẩn đoán phân biệt chính xác."
              reference="Protocol nghiên cứu GLAUCO-MIMIC AI"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Chọn hồ sơ ca bệnh"
            value={selectedCase.id}
            onChange={(e) => handleSelectCase(e.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.anonymousPatientId} ({c.eye}) — {c.examDate}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleEditCurrentCase}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Chỉnh sửa hồ sơ</span>
          </button>
        </div>
      </div>

      {/* CRITICAL NOTICE: Pending Validated AI Model */}
      <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-200/80 text-amber-950">
                  TRẠNG THÁI: ĐANG CHỜ PHÂN TÍCH (PENDING MODEL)
                </span>
                <ClinicalInfo
                  title="Trạng thái Mô hình AI"
                  brief="Chưa kích hoạt mô hình AI chưa được kiểm chứng y khoa"
                  detail="Hệ thống tuân thủ nghiêm ngặt nguyên tắc y đức: Không suy diễn xác suất giả hoặc chẩn đoán tự động khi mô hình chưa hoàn thành kiểm định lâm sàng độc lập."
                  reference="Good Machine Learning Practice (GMLP) for Medical Device Development"
                />
              </div>
              <h3 className="text-sm font-bold text-amber-950 mt-1">
                Chưa có mô hình AI kiểm định lâm sàng — Không tạo xác suất dự đoán giả
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSafetyPrinciples((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-xs font-semibold text-amber-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{showSafetyPrinciples ? 'Thu gọn nguyên tắc' : 'Xem nguyên tắc an toàn'}</span>
              {showSafetyPrinciples ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowIllustrativeSchema((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                showIllustrativeSchema
                  ? 'bg-amber-900 text-white border-amber-900'
                  : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showIllustrativeSchema ? 'Khung minh họa (Bật)' : 'Xem khung minh họa'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Safety Principles & Regulatory Details */}
        {showSafetyPrinciples && (
          <div className="pt-2 border-t border-amber-200/80 text-xs text-amber-900 space-y-2 leading-relaxed animate-fadeIn">
            <p>
              Theo nguyên tắc an toàn y tế và hướng dẫn đạo đức AI nghiên cứu lâm sàng, giao diện <strong>Analysis Results</strong> hiện hiển thị trạng thái chờ suy luận từ FastAPI Backend, kết hợp báo cáo kiểm tra độ tin cậy dữ liệu đầu vào, cảnh báo thiếu dữ liệu và bảng giải thích dấu hiệu sinh học (biomarkers) đối chiếu cho 5 nhóm bệnh.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded bg-amber-100/60 border border-amber-200">
                • <strong>Nguyên tắc 1:</strong> Tuyệt đối không sinh điểm phần trăm ngẫu nhiên mô phỏng AI.
              </div>
              <div className="p-2 rounded bg-amber-100/60 border border-amber-200">
                • <strong>Nguyên tắc 2:</strong> Mọi hiển thị minh họa schema phải được gắn nhãn rõ ràng.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verified ResNet-18 Baseline Fundus Inference */}
      <FundusInferenceCard
        fundusFile={runtimePreviews.fundus?.file}
        fundusFileName={selectedCase.modalities.fundus?.fileName}
        originalImageUri={runtimePreviews.fundus?.objectUrl}
        savedInference={selectedCase.fundusInference}
        onInferenceSuccess={handleInferenceSuccess}
      />

      {/* Section 1: 5 Disease Groups & Confidence / Data Reliability Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: 5 Disease Groups Differential Interface */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Giao diện Phân tích 5 Nhóm Bệnh lý Mục tiêu</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hiển thị trạng thái suy luận của từng nhóm bệnh và đối chiếu tiêu chuẩn lâm sàng
              </p>
            </div>
            {showIllustrativeSchema ? (
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded bg-rose-100 text-rose-800 border border-rose-300">
                DỮ LIỆU MINH HỌA GIAO DIỆN (KHÔNG PHẢI CHẨN ĐOÁN)
              </span>
            ) : (
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                XÁC SUẤT AI: ĐANG CHỜ MÔ HÌNH (— %)
              </span>
            )}
          </div>

          <div className="space-y-3.5">
            {DISEASE_GROUP_LIST.map((group) => {
              const isReferenceCohort = selectedCase.referringCohort === group.id;
              const schemaInfo = ILLUSTRATIVE_SCHEMA_EXAMPLE[group.id];

              return (
                <div
                  key={group.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isReferenceCohort
                      ? 'border-teal-400 bg-teal-50/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${group.badgeBg} ${group.badgeText} ${group.borderColor}`}
                      >
                        {group.code} • {group.shortName}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{group.nameEn}</h4>
                      <ClinicalInfo
                        title={`${group.nameVi} (${group.shortName})`}
                        brief={group.description}
                        detail={`Đặc điểm Đáy mắt: ${group.keyFundusFeatures.join('; ')}. Đặc điểm OCT: ${group.keyOctFeatures.join('; ')}. Dấu hiệu lâm sàng: ${group.keyClinicalClues.join('; ')}.`}
                        reference={`Mã bệnh: ${group.code} • Thư mục: ${group.folderName}`}
                      />
                      {isReferenceCohort && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                          Nhãn ban đầu của ca
                        </span>
                      )}
                    </div>

                    <div className="text-right font-mono text-xs">
                      {showIllustrativeSchema ? (
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                          [Minh họa UI: Đồng nhất 0.20]
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                          Đang chờ phân tích (— %)
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">{group.nameVi}</p>

                  {/* Probability Bar Slot */}
                  <div className="mt-3">
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/70">
                      {showIllustrativeSchema ? (
                        <div
                          className="h-full bg-slate-400/70 transition-all"
                          style={{ width: `${schemaInfo.illustrativeBarWidth}%` }}
                        />
                      ) : (
                        <div className="h-full w-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>
                        {showIllustrativeSchema
                          ? schemaInfo.schemaNote
                          : 'Chưa nạp trọng số mô hình AI — Không hiển thị điểm xác suất'}
                      </span>
                      <span className="font-mono">
                        Độ tin cậy AI: {showIllustrativeSchema ? '[Minh họa]' : 'Chưa kích hoạt'}
                      </span>
                    </div>
                  </div>

                  {/* Clinical Criteria Reference for this Group */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-600">
                      <strong className="text-slate-800">Tiêu chuẩn Đáy mắt:</strong>{' '}
                      {group.keyFundusFeatures[0]}
                    </div>
                    <div className="text-slate-600">
                      <strong className="text-slate-800">Tiêu chuẩn OCT:</strong>{' '}
                      {group.keyOctFeatures[0]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Column: Data Reliability, Confidence Readiness & Missing Data Warnings */}
        <div className="space-y-5">
          {/* Reliability & Completeness Score Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-teal-600" />
                  <span>Độ Tin cậy Dữ liệu & Cảnh báo</span>
                </h3>
                <ClinicalInfo
                  title="Kiểm tra Độ Tin cậy Đầu vào"
                  brief="Chất lượng và tính đầy đủ của dữ liệu trước khi nạp vào AI"
                  detail="Đánh giá tính sẵn sàng của 4 kênh hình ảnh và chỉ số sinh lý. Khi dữ liệu thiếu hụt hoặc vượt ngưỡng, hệ thống phát cảnh báo để nghiên cứu viên bổ sung."
                />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Đánh giá mức độ sẵn sàng của hồ sơ trước khi đưa vào mô hình
              </p>
            </div>

            {/* Score Gauge */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Điểm Đầy đủ Dữ liệu (Completeness)
                </span>
                <span className="text-lg font-bold font-mono text-teal-700">
                  {completeness.overallScore}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    completeness.overallScore >= 75
                      ? 'bg-emerald-500'
                      : completeness.overallScore >= 50
                        ? 'bg-teal-500'
                        : 'bg-amber-500'
                  }`}
                  style={{ width: `${completeness.overallScore}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>{completeness.readinessLabel}</span>
                <span className="font-mono">
                  {completeness.modalityCount}/4 ảnh • {completeness.metricsEnteredCount}/
                  {completeness.totalMetricsCount} chỉ số
                </span>
              </div>
            </div>

            {/* AI Confidence Slot Explanation */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-semibold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="text-[11px]">Độ tin cậy Mô hình (Model Confidence):</span>
                </div>
                <ClinicalInfo
                  title="Độ Tin cậy Mô hình (Calibration & Uncertainty)"
                  brief="Đo lường độ bất định nhận thức (Epistemic Uncertainty)"
                  detail="Trong hệ thống lâm sàng hoàn thiện, độ tin cậy được tính sau hiệu chuẩn nhiệt độ (Temperature Scaling). Nếu thiếu các lát cắt OCT quan trọng, mô hình sẽ gán độ bất định cao và khuyến nghị bác sĩ đánh giá bổ sung."
                  reference="Medical AI Calibration Standards"
                />
              </div>
              <p className="text-[10px] text-amber-900 leading-relaxed">
                Trạng thái: <strong className="font-mono">N/A (Pending Model)</strong>. Khi tích hợp FastAPI, hệ thống sẽ tính điểm hiệu chuẩn nhiệt độ và độ bất định nhận thức.
              </p>
            </div>

            {/* Missing Data Warnings */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Cảnh báo Thiếu Dữ liệu ({completeness.warnings.length})
              </div>

              {completeness.warnings.length === 0 ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Hồ sơ đã có đầy đủ cả 4 phương thức hình ảnh và thông số lâm sàng!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {completeness.warnings.map((w) => (
                    <div
                      key={w.id}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        w.severity === 'critical'
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                          : w.severity === 'warning'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            w.severity === 'critical'
                              ? 'text-rose-600'
                              : w.severity === 'warning'
                                ? 'text-amber-600'
                                : 'text-slate-500'
                          }`}
                        />
                        <span>{w.title}</span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed pl-5">{w.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleEditCurrentCase}
                className="w-full mt-2 py-2 px-3 rounded-lg border border-teal-600 bg-white hover:bg-teal-50 text-teal-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Bổ sung Dữ liệu còn thiếu cho Ca này</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Multimodal Explanation & Clinical Parameter Synthesis */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Giải thích Kết quả & Tổng hợp Dấu hiệu Lâm sàng Đã Ghi nhận
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng hợp khách quan các thông số định lượng và hình ảnh đã nhập của ca bệnh{' '}
              <strong className="font-mono">{selectedCase.anonymousPatientId}</strong> ({selectedCase.eye}) để hỗ trợ bác sĩ phân tích
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Cập nhật lần cuối: {new Date(selectedCase.updatedAt).toLocaleString('vi-VN')}
          </span>
        </div>

        {/* Attached Modalities Summary Row */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            A. Phương thức Hình ảnh Đã Đính kèm ({completeness.modalityCount}/4)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {MODALITY_ORDER.map((modKey) => {
              const cfg = MODALITY_CONFIGS[modKey];
              const meta = selectedCase.modalities[modKey];
              const preview = runtimePreviews[modKey];

              return (
                <div
                  key={modKey}
                  className="rounded-lg border border-slate-200 p-3 bg-slate-50/60 flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {cfg.shortCode}
                      </span>
                      {preview?.objectUrl ? (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                          Xem trước hoạt động
                        </span>
                      ) : meta ? (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-medium">
                          Chỉ có Metadata (Sau reload)
                        </span>
                      ) : (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                          Chưa tải lên
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-700 mt-1">{cfg.labelVi}</div>
                  </div>

                  {preview?.objectUrl ? (
                    <div className="space-y-1.5">
                      <div className="rounded bg-slate-900 aspect-16/10 flex items-center justify-center overflow-hidden border border-slate-300">
                        <img
                          src={preview.objectUrl}
                          alt={cfg.labelVi}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      {meta && (
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 px-1">
                          <span className="truncate" title={meta.fileName}>
                            {meta.fileName}
                          </span>
                          <span className="shrink-0 ml-1">{formatBytes(meta.fileSize)}</span>
                        </div>
                      )}
                    </div>
                  ) : meta ? (
                    <div className="p-2.5 rounded bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 space-y-1.5">
                      <div className="font-mono font-semibold truncate" title={meta.fileName}>
                        {meta.fileName} ({formatBytes(meta.fileSize)})
                      </div>
                      <p className="text-[10px] text-amber-800 leading-relaxed">
                        ObjectURL xem trước chỉ tồn tại trong phiên bộ nhớ tạm. Sau khi tải lại trang (F5), ảnh gốc không lưu trong localStorage để bảo mật.
                      </p>
                      <button
                        type="button"
                        onClick={handleEditCurrentCase}
                        className="w-full py-1 px-2 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold text-[11px] cursor-pointer"
                      >
                        Nạp lại tệp ảnh xem trước &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded border border-dashed border-slate-300 text-[11px] text-slate-400 text-center">
                      Thiếu dữ liệu ảnh {cfg.shortCode}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quantitative Metrics & Rule-Based Anatomical Interpretation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
          {/* Quantitative Table */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                B. Bảng Đối chiếu Thông số Định lượng
              </h4>
              <ClinicalInfo
                title="Bảng Đối chiếu Thông số Định lượng"
                brief="So sánh giá trị đo được của ca bệnh với ngưỡng sinh lý chuẩn"
                detail="Đối chiếu đa thông số: Nhãn áp, tỷ lệ C/D, độ dày RNFL quanh gai 4 góc, phức hợp tế bào hạch hoàng điểm (GCC) và chỉ số thị trường (MD/PSD)."
              />
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="py-2 px-3">Thông số Lâm sàng / OCT</th>
                    <th className="py-2 px-3">Giá trị Ca bệnh</th>
                    <th className="py-2 px-3">Ngưỡng Tham chiếu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        Nhãn áp (IOP)
                        <ClinicalInfo title="Nhãn áp (IOP)" brief="Ngưỡng sinh lý: 10 – 21 mmHg" />
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                      {m.iopMmHg !== null ? `${m.iopMmHg} mmHg` : 'Chưa nhập'}
                    </td>
                    <td className="py-2 px-3 text-slate-500">10 – 21 mmHg</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        Tỷ lệ C/D Dọc
                        <ClinicalInfo title="Tỷ lệ Lõm Gai Dọc (Vertical CDR)" brief="Sinh lý thường ≤ 0.40 – 0.50" />
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                      {m.cdrVertical !== null ? m.cdrVertical.toFixed(2) : 'Chưa nhập'}
                    </td>
                    <td className="py-2 px-3 text-slate-500">Thường &le; 0.40 – 0.50</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        OCT RNFL Trung bình
                        <ClinicalInfo title="Độ dày RNFL Trung bình 360°" brief="Ngưỡng sinh lý: ~85 – 105 µm" />
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                      {m.rnflAvgUm !== null ? `${m.rnflAvgUm} µm` : 'Chưa nhập'}
                    </td>
                    <td className="py-2 px-3 text-slate-500">~ 85 – 105 µm</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        OCT RNFL 4 Góc (S/I/T/N)
                        <ClinicalInfo title="Phân bố RNFL 4 Góc" brief="Quy luật ISNT: Dưới ≥ Trên ≥ Mũi ≥ Thái dương" />
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                      {[m.rnflSuperiorUm, m.rnflInferiorUm, m.rnflTemporalUm, m.rnflNasalUm].some(
                        (v) => v !== null
                      )
                        ? `S:${m.rnflSuperiorUm ?? '-'} | I:${m.rnflInferiorUm ?? '-'} | T:${
                            m.rnflTemporalUm ?? '-'
                          } | N:${m.rnflNasalUm ?? '-'}`
                        : 'Chưa nhập'}
                    </td>
                    <td className="py-2 px-3 text-slate-500">Quy tắc ISNT (I &ge; S &ge; N &ge; T)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        OCT GCC/GCIPL (TB / Min)
                        <ClinicalInfo title="GCC Hoàng điểm" brief="Tế bào hạch võng mạc (~75 – 90 µm)" />
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                      {m.gccAvgUm !== null || m.gccMinimumUm !== null
                        ? `${m.gccAvgUm ?? '-'} / ${m.gccMinimumUm ?? '-'} µm`
                        : 'Chưa nhập'}
                    </td>
                    <td className="py-2 px-3 text-slate-500">~ 75 – 90 µm</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        Thị trường SAP (MD / PSD)
                        <ClinicalInfo title="Thị trường SAP" brief="MD: Suy giảm chung; PSD: Khuyết cục bộ" />
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                      {m.vfMdDb !== null || m.vfPsdDb !== null
                        ? `MD: ${m.vfMdDb ?? '-'} dB | PSD: ${m.vfPsdDb ?? '-'} dB`
                        : 'Chưa nhập'}
                    </td>
                    <td className="py-2 px-3 text-slate-500">MD &ge; -2.0 dB</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinical Reasoning & Differential Guidelines Box */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                C. Cơ sở Phân biệt Đa phương thức
              </h4>
              <ClinicalInfo
                title="Cơ sở Chẩn đoán Phân biệt Đa phương thức"
                brief="Nguyên tắc phân biệt 5 nhóm bệnh lý thần kinh thị giác"
                detail="Kết hợp giải phẫu bệnh học đĩa thị, kiểu hình tổn thương lớp sợi thần kinh và tế bào hạch hoàng điểm cùng các triệu chứng cơ năng."
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">
                    1. Tương quan Lõm đĩa (Cupping) và Bạc màu (Pallor) trên Ảnh Đáy mắt:
                  </strong>{' '}
                  Trong <strong>Glaucoma</strong>, mức độ lõm đĩa dọc lớn nhưng viền thần kinh còn lại giữ màu hồng; ngược lại ở <strong>CON</strong> hoặc di chứng <strong>ON / NAION</strong>, mức độ bạc màu viền thần kinh vượt trội so với độ sâu lõm đĩa.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">
                    2. Mẫu tổn thương OCT RNFL & Hoàng điểm GCC/GCIPL:
                  </strong>{' '}
                  Mỏng RNFL cực Trên/Dưới kèm GCC tôn trọng đường ngang gợi ý <strong>Glaucoma</strong>. Mỏng RNFL vùng Thái dương/Mũi (dải ngang bow-tie) kèm GCC tôn trọng <strong>đường dọc qua hoàng điểm (vertical meridian)</strong> là dấu hiệu chỉ điểm đặc hiệu của <strong>Chèn ép thần kinh thị giác (CON)</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">
                    3. Dấu hiệu Lâm sàng Đã Ghi nhận ở Hồ sơ này:
                  </strong>{' '}
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                    {f.acuteVisionLoss && (
                      <li>Có ghi nhận giảm thị lực khởi phát cấp/bán cấp (cần lưu ý NAION / ON).</li>
                    )}
                    {f.painOnEyeMovement && (
                      <li>Có đau hốc mắt khi vận nhãn (dấu hiệu lâm sàng điển hình của Optic Neuritis).</li>
                    )}
                    {f.dyschromatopsia && (
                      <li>Có rối loạn sắc giác (thường gặp trong ON và CON sớm hơn Glaucoma).</li>
                    )}
                    {f.rapdPresent && <li>Có phản xạ đồng tử hướng tâm tương đối RAPD (+).</li>}
                    {f.neurologicalSymptoms && (
                      <li>Có triệu chứng thần kinh khu trú/đau đầu (cần loại trừ khối choán chỗ CON).</li>
                    )}
                    {f.familyHistoryGlaucoma && (
                      <li>Có tiền sử gia đình mắc Glocom.</li>
                    )}
                    {!Object.values(f).some(Boolean) && (
                      <li>Chưa đánh dấu triệu chứng cơ năng đặc hiệu nào trong bảng kiểm bệnh sử.</li>
                    )}
                  </ul>
                </div>
              </div>

              {selectedCase.clinicalNotes && (
                <div className="p-2.5 rounded bg-white border border-slate-200 text-slate-800">
                  <strong>Ghi chú của bác sĩ/nghiên cứu viên:</strong> {selectedCase.clinicalNotes}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
