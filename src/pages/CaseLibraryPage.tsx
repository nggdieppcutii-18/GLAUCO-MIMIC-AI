import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CopyPlus,
  Download,
  FileEdit,
  FilePlus2,
  Filter,
  FolderKanban,
  Microscope,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  DISEASE_GROUP_LIST,
  DISEASE_GROUPS,
  MODALITY_CONFIGS,
  MODALITY_ORDER,
} from '../data/cohortDefinitions';
import {
  cloneFellowEyeCase,
  deleteCaseRecord,
  getAllSavedCases,
  resetSeedCases,
  setActiveDraftId,
} from '../services/caseStorageService';
import { ClinicalCaseRecord, DiseaseGroupId } from '../types/clinical';
import { evaluateCaseCompleteness } from '../utils/clinicalValidation';
import { ClinicalInfo } from '../components/ClinicalInfo';

export const CaseLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<ClinicalCaseRecord[]>(() => getAllSavedCases());
  const [searchQuery, setSearchQuery] = useState('');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [eyeFilter, setEyeFilter] = useState<string>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesId = item.anonymousPatientId.toLowerCase().includes(q);
        const matchesNotes = item.clinicalNotes.toLowerCase().includes(q);
        if (!matchesId && !matchesNotes) return false;
      }

      if (cohortFilter !== 'ALL' && item.referringCohort !== cohortFilter) {
        return false;
      }

      if (statusFilter === 'DRAFT' && item.status !== 'DRAFT') {
        return false;
      }
      if (statusFilter === 'PENDING_AI' && item.status === 'DRAFT') {
        return false;
      }

      if (eyeFilter !== 'ALL' && item.eye !== eyeFilter) {
        return false;
      }

      return true;
    });
  }, [cases, searchQuery, cohortFilter, statusFilter, eyeFilter]);

  const handleReopenToEdit = (caseId: string) => {
    setActiveDraftId(caseId);
    navigate(`/new-analysis?caseId=${encodeURIComponent(caseId)}`);
  };

  const handleOpenAnalysisResults = (caseId: string) => {
    navigate(`/analysis-results?caseId=${encodeURIComponent(caseId)}`);
  };

  const handleDeleteCase = (caseId: string) => {
    const updated = deleteCaseRecord(caseId);
    setCases(updated);
    setConfirmDeleteId(null);
  };

  const handleResetSeed = () => {
    const restored = resetSeedCases();
    setCases(restored);
  };

  const handleCloneFellowEye = (caseId: string) => {
    const cloned = cloneFellowEyeCase(caseId);
    if (cloned) {
      setCases(getAllSavedCases());
    }
  };

  const handleExportMetadataJson = () => {
    const blob = new Blob([JSON.stringify(cases, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glauco-mimic-cases-metadata-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-teal-600" />
              <span>Thư viện Hồ sơ Ca bệnh</span>
            </h2>
            <ClinicalInfo
              title="Quản lý Hồ sơ Ca bệnh"
              brief="Lưu trữ bản nháp và hồ sơ đối chiếu đa phương thức"
              detail="Tất cả ca bệnh được định danh bằng mã ẩn danh. Cho phép mở lại chỉnh sửa bất kỳ lúc nào, sao chép sang mắt đối bên hoặc trích xuất JSON metadata để lưu trữ."
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý hồ sơ nghiên cứu ẩn danh • Kiểm tra tính đầy đủ đa phương thức và mở lại chỉnh sửa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportMetadataJson}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất JSON</span>
          </button>

          <button
            type="button"
            onClick={handleResetSeed}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            title="Khôi phục 5 hồ sơ tham chiếu mặc định từ kho dữ liệu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục Mẫu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveDraftId(null);
              navigate('/new-analysis');
            }}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Tạo Ca Mới</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Mã BN ẩn danh hoặc ghi chú..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-teal-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            aria-label="Lọc theo nhóm bệnh"
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-teal-600"
          >
            <option value="ALL">Tất cả Nhóm bệnh ({cases.length})</option>
            <option value="UNCLASSIFIED">Chưa phân nhóm</option>
            {DISEASE_GROUP_LIST.map((g) => (
              <option key={g.id} value={g.id}>
                {g.shortName} — {g.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            aria-label="Lọc theo trạng thái hồ sơ"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-teal-600"
          >
            <option value="ALL">Tất cả Trạng thái</option>
            <option value="DRAFT">Bản nháp (Draft)</option>
            <option value="PENDING_AI">Chờ AI phân tích (Pending Inference)</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Lọc theo mắt OD/OS"
            value={eyeFilter}
            onChange={(e) => setEyeFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-teal-600"
          >
            <option value="ALL">Cả hai mắt (OD & OS)</option>
            <option value="OD">OD (Mắt Phải)</option>
            <option value="OS">OS (Mắt Trái)</option>
          </select>
        </div>
      </div>

      {/* Cases List / Empty State */}
      {filteredCases.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Không tìm thấy hồ sơ ca bệnh phù hợp
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Thử thay đổi bộ lọc tìm kiếm, tạo hồ sơ phân tích mới hoặc khôi phục bộ hồ sơ mẫu từ kho dữ liệu.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCohortFilter('ALL');
                setStatusFilter('ALL');
                setEyeFilter('ALL');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Xóa bộ lọc
            </button>
            <button
              type="button"
              onClick={handleResetSeed}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 cursor-pointer"
            >
              Khôi phục 5 Hồ sơ Mẫu
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((item) => {
            const completeness = evaluateCaseCompleteness(item);
            const cohort =
              item.referringCohort !== 'UNCLASSIFIED'
                ? DISEASE_GROUPS[item.referringCohort as DiseaseGroupId]
                : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {item.anonymousPatientId}
                      </span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {item.eye}
                      </span>

                      {item.status === 'DRAFT' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Bản nháp</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Chờ AI phân tích</span>
                        </span>
                      )}

                      {cohort ? (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded border ${cohort.badgeBg} ${cohort.badgeText} ${cohort.borderColor}`}
                        >
                          Nhóm tham chiếu: {cohort.shortName}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Chưa phân nhóm
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Ngày khám: <strong className="text-slate-700">{item.examDate}</strong>
                      </span>
                      <span>
                        Ngày chụp: <strong className="text-slate-700">{item.captureDate}</strong>
                      </span>
                      {item.patientAge !== null && (
                        <span>
                          Tuổi: <strong className="text-slate-700">{item.patientAge}</strong>
                        </span>
                      )}
                      <span>
                        IOP:{' '}
                        <strong className="text-slate-700 font-mono">
                          {item.metrics.iopMmHg !== null ? `${item.metrics.iopMmHg} mmHg` : '—'}
                        </strong>
                      </span>
                      <span>
                        RNFL TB:{' '}
                        <strong className="text-slate-700 font-mono">
                          {item.metrics.rnflAvgUm !== null ? `${item.metrics.rnflAvgUm} µm` : '—'}
                        </strong>
                      </span>
                      <span>
                        C/D dọc:{' '}
                        <strong className="text-slate-700 font-mono">
                          {item.metrics.cdrVertical !== null
                            ? item.metrics.cdrVertical.toFixed(2)
                            : '—'}
                        </strong>
                      </span>
                    </div>

                    {item.clinicalNotes && (
                      <p className="text-xs text-slate-600 line-clamp-2">{item.clinicalNotes}</p>
                    )}

                    {/* Modality Badges Row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {MODALITY_ORDER.map((modKey) => {
                        const hasMod = Boolean(item.modalities[modKey]);
                        const cfg = MODALITY_CONFIGS[modKey];
                        return (
                          <span
                            key={modKey}
                            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                              hasMod
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            {cfg.shortCode}: {hasMod ? 'Đã có' : 'Thiếu'}
                          </span>
                        );
                      })}
                      <span className="text-[11px] text-slate-500 ml-1">
                        • Độ đầy đủ: <strong className="font-mono">{completeness.overallScore}%</strong> (
                        {completeness.readinessLabel})
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleReopenToEdit(item.id)}
                      className="px-3.5 py-2 rounded-lg border border-teal-600 bg-white hover:bg-teal-50 text-xs font-semibold text-teal-700 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Mở lại để Chỉnh sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCloneFellowEye(item.id)}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                      title={`Tạo nhanh bản nháp mắt đối diện (${item.eye === 'OD' ? 'OS' : 'OD'}) cùng mã bệnh nhân`}
                    >
                      <CopyPlus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Mắt {item.eye === 'OD' ? 'OS' : 'OD'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAnalysisResults(item.id)}
                      className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Microscope className="w-3.5 h-3.5" />
                      <span>Xem Kết quả</span>
                    </button>

                    {confirmDeleteId === item.id ? (
                      <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                        <span className="text-[11px] text-rose-800 font-medium px-1">Xóa?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCase(item.id)}
                          className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 cursor-pointer"
                        >
                          Có
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded bg-white text-slate-600 border border-slate-200 text-[11px] hover:bg-slate-100 cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa hồ sơ này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

