import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Eye,
  FileEdit,
  FilePlus2,
  FolderKanban,
  Layers,
  Microscope,
  ShieldAlert,
} from 'lucide-react';
import { DISEASE_GROUP_LIST, DISEASE_GROUPS } from '../data/cohortDefinitions';
import { getAllSavedCases, setActiveDraftId } from '../services/caseStorageService';
import { evaluateCaseCompleteness } from '../utils/clinicalValidation';
import { ClinicalInfo } from '../components/ClinicalInfo';
import { DiseaseGroupDefinition } from '../types/clinical';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const cases = useMemo(() => getAllSavedCases(), []);
  const [expandedCohortId, setExpandedCohortId] = useState<string | null>(null);
  const [safetyBannerExpanded, setSafetyBannerExpanded] = useState(false);

  const stats = useMemo(() => {
    const totalCases = cases.length;
    const draftCount = cases.filter((c) => c.status === 'DRAFT').length;
    const pendingInferenceCount = cases.filter(
      (c) => c.status === 'PENDING_AI_INFERENCE' || c.status === 'READY_FOR_ANALYSIS'
    ).length;

    const totalRepoFundus = DISEASE_GROUP_LIST.reduce((acc, g) => acc + g.repoFundusCount, 0);
    const totalRepoOct = DISEASE_GROUP_LIST.reduce((acc, g) => acc + g.repoOctCount, 0);
    const uniqueRepoFundus = DISEASE_GROUP_LIST.reduce(
      (acc, g) => acc + g.repoUniqueFundusCount,
      0
    );
    const uniqueRepoOct = DISEASE_GROUP_LIST.reduce((acc, g) => acc + g.repoUniqueOctCount, 0);

    return {
      totalCases,
      draftCount,
      pendingInferenceCount,
      totalRepoFundus,
      totalRepoOct,
      totalRepoImages: totalRepoFundus + totalRepoOct,
      uniqueRepoImages: uniqueRepoFundus + uniqueRepoOct,
      uniqueRepoFundus,
      uniqueRepoOct,
    };
  }, [cases]);

  const handleOpenCaseForEdit = (caseId: string) => {
    setActiveDraftId(caseId);
    navigate(`/new-analysis?caseId=${encodeURIComponent(caseId)}`);
  };

  const handleOpenCaseResult = (caseId: string) => {
    navigate(`/analysis-results?caseId=${encodeURIComponent(caseId)}`);
  };

  const toggleCohortAccordion = (id: string) => {
    setExpandedCohortId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5">
      {/* Top Clinical Header - Clean & Minimal */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold">
                <Activity className="w-3 h-3 text-teal-600" />
                <span>Multimodal Neuro-Ophthalmology AI</span>
              </span>
              <ClinicalInfo
                title="GLAUCO-MIMIC AI"
                brief="Nền tảng AI đa phương thức hỗ trợ phân biệt Glocom với các bệnh lý thần kinh thị giác có biểu hiện tương tự."
                detail="Tích hợp 4 luồng dữ liệu hình ảnh (Fundus, OCT RNFL, OCT GCC/GCIPL, Thị trường SAP) và các chỉ số nhãn khoa định lượng để chuẩn hóa hồ sơ lâm sàng."
                reference="Mục tiêu nghiên cứu: Phân biệt 5 nhóm (Glocom, CON, NAION, ON, Healthy Control)."
              />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Hệ thống Phân biệt Glocom & Bệnh lý Thần kinh Thị giác
            </h2>
            <p className="text-xs text-slate-500">
              Phân tích đa phương thức: Ảnh Đáy mắt, OCT RNFL, OCT GCC hoàng điểm & Thị trường SAP.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveDraftId(null);
                navigate('/new-analysis', { state: { resetTs: Date.now() } });
              }}
              className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Tạo ca mới</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/case-library')}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
              <span>Thư viện ({stats.totalCases})</span>
            </button>
          </div>
        </div>

        {/* AI Safety Notice - Compact with Progressive Disclosure (not hidden behind tooltip) */}
        <div className="mt-3.5 pt-3 border-t border-slate-100">
          <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 px-3.5 py-2 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold text-amber-900 text-xs">
                Pending Model Verification:
              </span>
              <span className="text-amber-800 text-xs">
                Chưa nạp mô hình kiểm định — Tuyệt đối không sinh xác suất hay chẩn đoán giả lập.
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSafetyBannerExpanded((prev) => !prev)}
                className="text-[11px] font-semibold text-amber-900 underline hover:text-amber-700 cursor-pointer flex items-center gap-0.5"
              >
                <span>{safetyBannerExpanded ? 'Thu gọn' : 'Xem nguyên tắc'}</span>
                {safetyBannerExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/analysis-results')}
                className="text-[11px] font-semibold text-teal-800 hover:text-teal-900 cursor-pointer"
              >
                Giao diện Kết quả &rarr;
              </button>
            </div>
          </div>

          {safetyBannerExpanded && (
            <div className="mt-2 p-3 rounded-lg bg-white border border-amber-200 text-xs text-slate-600 leading-relaxed animate-fadeIn space-y-1">
              <div className="font-semibold text-slate-800">
                Nguyên tắc An toàn Dữ liệu Y khoa & Nghiên cứu:
              </div>
              <p>
                1. <strong>Không sinh kết quả dự đoán giả:</strong> Ở giai đoạn Frontend V1, toàn bộ giao diện kết quả hiển thị trạng thái chờ suy luận từ FastAPI backend.
              </p>
              <p>
                2. <strong>Bảo mật thông tin:</strong> Tệp ảnh gốc của bệnh nhân chỉ lưu trong phiên bộ nhớ (RAM), không lưu vào localStorage hay bất kỳ dịch vụ đám mây bên ngoài.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Grid - Large Numbers, Airy Layout, Concise Labels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              Tổng hồ sơ
              <ClinicalInfo
                title="Tổng hồ sơ"
                brief="Số lượng hồ sơ ca bệnh ẩn danh đã lưu trữ trong phiên làm việc cục bộ."
                detail="Metadata được lưu bền vững trong localStorage. Người dùng có thể xuất JSON hoặc mở lại để chỉnh sửa bất kỳ lúc nào."
              />
            </span>
            <FolderKanban className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900">{stats.totalCases}</span>
            <span className="text-xs text-slate-400">hồ sơ</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Đã lưu trữ cục bộ</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              Chờ phân tích
              <ClinicalInfo
                title="Hồ sơ chờ phân tích"
                brief="Các ca bệnh đã sẵn sàng hoặc đang lưu nháp chờ gửi tới mô hình AI."
                detail="Bao gồm các ca có trạng thái READY_FOR_ANALYSIS hoặc PENDING_AI_INFERENCE, cộng thêm các bản nháp đang hoàn thiện."
              />
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {stats.pendingInferenceCount}
            </span>
            <span className="text-xs text-amber-700 font-medium">
              +{stats.draftCount} nháp
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Sẵn sàng chờ FastAPI</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              Kho ảnh nội bộ
              <ClinicalInfo
                title="Kho dữ liệu hình ảnh"
                brief="Thống kê tệp ảnh y khoa thực tế trong 5 thư mục gốc tại ổ đĩa D:\GLAUCO-MIMIC AI."
                detail="Gồm 91 ảnh gốc duy nhất (61 ảnh Đáy mắt, 30 ảnh OCT). Có 28 bản sao trùng hậu tố (1)/(2) trong thư mục GLOCOM."
                reference="Dữ liệu gốc được bảo toàn 100% không chỉnh sửa."
              />
            </span>
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {stats.uniqueRepoImages}
            </span>
            <span className="text-xs text-slate-400">/ {stats.totalRepoImages} tệp</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {stats.uniqueRepoFundus} Đáy mắt • {stats.uniqueRepoOct} OCT
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              Nhóm bệnh mục tiêu
              <ClinicalInfo
                title="5 Nhóm bệnh lý"
                brief="Năm nhóm lâm sàng được thiết kế trong bài toán phân loại đa lớp của GLAUCO-MIMIC AI."
                detail="1. Glocom (Glaucoma)&#10;2. Chèn ép TK thị giác (CON)&#10;3. Thiếu máu cục bộ trước (NAION)&#10;4. Viêm dây TK thị giác (ON)&#10;5. Mắt bình thường (Healthy Control)"
              />
            </span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900">5</span>
            <span className="text-xs text-slate-400">nhóm bệnh</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Glocom • CON • NAION • ON • Healthy</div>
        </div>
      </div>

      {/* 5 Disease Groups Overview - Minimal Table with Progressive Disclosure */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              5 Nhóm Bệnh lý & Hiện trạng Dữ liệu
            </h3>
            <ClinicalInfo
              title="Phân loại 5 nhóm bệnh lý thần kinh thị giác"
              brief="Bảng đối chiếu số lượng hình ảnh y khoa và trạng thái mẫu của từng nhóm bệnh."
              detail="Bấm vào từng nhóm để mở rộng xem các đặc trưng phân biệt cốt lõi trên Fundus, OCT và triệu chứng lâm sàng."
            />
          </div>
          <button
            type="button"
            onClick={() => navigate('/research-reports')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tiêu chuẩn chi tiết</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4">Nhóm Bệnh</th>
                <th className="py-2.5 px-3 text-center">Ảnh Fundus</th>
                <th className="py-2.5 px-3 text-center">Ảnh OCT</th>
                <th className="py-2.5 px-3">Trạng thái Mẫu</th>
                <th className="py-2.5 px-4 text-right">Chi tiết Lâm sàng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {DISEASE_GROUP_LIST.map((group) => {
                const isExpanded = expandedCohortId === group.id;
                const totalSamples = group.repoUniqueFundusCount + group.repoUniqueOctCount;
                const statusBadge =
                  totalSamples >= 50 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đầy đủ ({totalSamples})</span>
                    </span>
                  ) : totalSamples >= 10 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[11px]">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Mẫu hạn chế ({totalSamples})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>Cần bổ sung ({totalSamples})</span>
                    </span>
                  );

                return (
                  <React.Fragment key={group.id}>
                    <tr
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-teal-50/30' : ''
                      }`}
                      onClick={() => toggleCohortAccordion(group.id)}
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${group.badgeBg} ${group.badgeText} ${group.borderColor}`}
                          >
                            {group.shortName}
                          </span>
                          <span className="font-semibold text-slate-900">{group.nameEn}</span>
                          <ClinicalInfo
                            title={`${group.nameEn} — ${group.nameVi}`}
                            brief={group.description}
                            detail={`• Dấu hiệu Fundus: ${group.keyFundusFeatures[0]}&#10;• Dấu hiệu OCT: ${group.keyOctFeatures[0]}&#10;• Triệu chứng lâm sàng: ${group.keyClinicalClues[0]}`}
                            reference={`Mã: ${group.code} • Thư mục: ${group.folderName}`}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{group.nameVi}</div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                        {group.repoUniqueFundusCount}
                        {group.repoFundusCount !== group.repoUniqueFundusCount && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({group.repoFundusCount})
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                        {group.repoUniqueOctCount}
                        {group.repoOctCount !== group.repoUniqueOctCount && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({group.repoOctCount})
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">{statusBadge}</td>

                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCohortAccordion(group.id);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Đóng' : 'Đặc trưng'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Progressive Disclosure: Accordion Row (Default Closed) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={5} className="p-4 animate-fadeIn">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-teal-600" />
                                <span>Đặc trưng Đáy mắt (Fundus)</span>
                              </div>
                              <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                                {group.keyFundusFeatures.map((f, i) => (
                                  <li key={i}>{f}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Đặc trưng OCT (RNFL & GCC)</span>
                              </div>
                              <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                                {group.keyOctFeatures.map((f, i) => (
                                  <li key={i}>{f}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-amber-600" />
                                <span>Bệnh sử & Chỉ điểm lâm sàng</span>
                              </div>
                              <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                                {group.keyClinicalClues.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Saved Cases - Clean & Compact */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Hồ sơ Ca bệnh Gần đây
            </h3>
            <ClinicalInfo
              title="Danh sách hồ sơ gần đây"
              brief="Các ca bệnh được mở hoặc cập nhật gần nhất trong thư viện."
              detail="Người dùng có thể bấm 'Mở / Sửa' để nạp hồ sơ vào form New Analysis hoặc bấm 'Kết quả' để chuyển sang màn hình đối chiếu 5 nhóm."
            />
          </div>
          <button
            type="button"
            onClick={() => navigate('/case-library')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Tất cả ({cases.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4">Mã BN</th>
                <th className="py-2.5 px-3">Mắt / Ngày</th>
                <th className="py-2.5 px-3">Nhóm Tham chiếu</th>
                <th className="py-2.5 px-3">Đầy đủ</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {cases.slice(0, 5).map((item) => {
                const completeness = evaluateCaseCompleteness(item);
                const cohort: DiseaseGroupDefinition | null =
                  item.referringCohort !== 'UNCLASSIFIED'
                    ? DISEASE_GROUPS[item.referringCohort]
                    : null;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 text-xs">
                      {item.anonymousPatientId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 mr-1 text-[11px]">
                        {item.eye}
                      </span>
                      <span className="text-[11px]">{item.examDate}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {cohort ? (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${cohort.badgeBg} ${cohort.badgeText} ${cohort.borderColor}`}
                        >
                          {cohort.shortName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa phân nhóm</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              completeness.overallScore >= 75
                                ? 'bg-emerald-500'
                                : completeness.overallScore >= 50
                                  ? 'bg-teal-500'
                                  : 'bg-amber-500'
                            }`}
                            style={{ width: `${completeness.overallScore}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-600 text-[11px]">
                          {completeness.overallScore}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {item.status === 'DRAFT' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                          Bản nháp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-medium">
                          Chờ AI
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCaseForEdit(item.id)}
                          className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileEdit className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCaseResult(item.id)}
                          className="px-2 py-1 rounded border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[11px] font-medium text-teal-800 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Microscope className="w-3 h-3" />
                          <span>Kết quả</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
