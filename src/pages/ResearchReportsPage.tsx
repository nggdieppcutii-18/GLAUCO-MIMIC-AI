import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Code2,
  Database,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { DISEASE_GROUP_LIST } from '../data/cohortDefinitions';
import { fastApiClient } from '../services/fastApiClient';
import { DiseaseGroupId } from '../types/clinical';
import { ClinicalInfo } from '../components/ClinicalInfo';

export const ResearchReportsPage: React.FC = () => {
  const [selectedCohortTab, setSelectedCohortTab] = useState<DiseaseGroupId | 'ALL'>('ALL');

  const filteredGroups =
    selectedCohortTab === 'ALL'
      ? DISEASE_GROUP_LIST
      : DISEASE_GROUP_LIST.filter((g) => g.id === selectedCohortTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <span>Báo cáo Nghiên cứu & Tiêu chuẩn Phân biệt</span>
              </h2>
              <ClinicalInfo
                title="Tài liệu Nghiên cứu & Phân tích Đa phương thức"
                brief="Quy chuẩn dấu hiệu sinh học và cấu trúc tích hợp hệ thống"
                detail="Tài liệu y khoa tổng hợp các đặc trưng then chốt của 5 nhóm bệnh, kết quả kiểm toán tập dữ liệu hình ảnh tại chỗ và đặc tả kết nối FastAPI backend."
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chuẩn hóa triệu chứng học đa phương thức (Fundus + OCT + SAP) & Kiểm toán tập dữ liệu
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 self-start lg:self-center">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Protocol v1.0</span>
          </div>
        </div>
      </div>

      {/* Section 1: Repository Dataset Audit & Class Imbalance Report */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>1. Kiểm toán Tập dữ liệu Hình ảnh Nội bộ</span>
              </h3>
              <ClinicalInfo
                title="Kiểm toán Dữ liệu Y tế Nội bộ"
                brief="Thống kê thực tế số lượng ảnh trong 5 thư mục"
                detail="Dữ liệu gồm 119 tệp tổng cộng (91 tệp duy nhất, 28 tệp trùng lặp hậu tố). Phân bố chênh lệch cần được cân bằng trọng số và phân tách ở cấp độ bệnh nhân (Patient-Level Split) trước khi huấn luyện."
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Thống kê ảnh y khoa thực tế trong repository (D:\GLAUCO-MIMIC AI)
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">
            Tổng cộng: 62 ảnh Đáy mắt • 57 ảnh OCT
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {DISEASE_GROUP_LIST.map((g) => {
            const total = g.repoFundusCount + g.repoOctCount;
            return (
              <div
                key={g.id}
                className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60 flex flex-col justify-between space-y-2"
              >
                <div>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${g.badgeBg} ${g.badgeText} ${g.borderColor}`}
                  >
                    {g.shortName}
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-1.5">{g.nameEn}</div>
                  <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                    {g.folderName}/
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500">Đáy mắt (Gốc/Tổng)</div>
                    <div className="font-mono font-bold text-slate-900">
                      {g.repoUniqueFundusCount} / {g.repoFundusCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Ảnh OCT (Gốc/Tổng)</div>
                    <div className="font-mono font-bold text-slate-900">
                      {g.repoUniqueOctCount} / {g.repoOctCount}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Ảnh gốc duy nhất: <strong>{g.repoUniqueFundusCount + g.repoUniqueOctCount}</strong> (Tổng tệp: {total})
                </div>
              </div>
            );
          })}
        </div>

        {/* Methodological Note on Dataset */}
        <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3.5 text-xs text-amber-950 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Khuyến nghị Tiền xử lý Dữ liệu trước khi Huấn luyện Mô hình AI:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-900 leading-relaxed">
            <li>
              <strong>Mất cân bằng lớp (Class Imbalance):</strong> Nhóm <code className="font-mono">GLOCOM</code> hiện chiếm đa số (50 ảnh đáy mắt, 49 ảnh OCT), trong khi các nhóm bệnh hiếm hơn như <code className="font-mono">CON</code>, <code className="font-mono">ON</code>, <code className="font-mono">NAION</code> và <code className="font-mono">MẮT BÌNH THƯỜNG</code> cần được thu thập bổ sung qua trang <strong>New Analysis</strong> trước khi huấn luyện phân loại 5 lớp.
            </li>
            <li>
              <strong>Kiểm tra trùng lặp tệp (Deduplication):</strong> Thư mục <code className="font-mono">GLOCOM/Ảnh OCT</code> có các bản sao hậu tố <code className="font-mono">(1).JPG</code>, <code className="font-mono">(2).JPG</code> cần được lọc theo mã bệnh nhân ẩn danh (Patient-Level Split) để tránh rò rỉ dữ liệu (data leakage) giữa tập Train và Test.
            </li>
          </ul>
        </div>
      </div>

      {/* Section 2: Detailed 5-Cohort Differential Biomarker Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>2. Khung Tiêu chuẩn Phân biệt Lâm sàng & Hình ảnh học 5 Nhóm Bệnh</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cơ sở tri thức y khoa dùng để thiết kế đặc trưng (feature engineering) và giải thích kết quả đa phương thức
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCohortTab('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                selectedCohortTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả (5)
            </button>
            {DISEASE_GROUP_LIST.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedCohortTab(g.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  selectedCohortTab === g.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {g.shortName}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${group.badgeBg} ${group.badgeText} ${group.borderColor}`}
                  >
                    {group.code} • {group.shortName}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {group.nameEn} — {group.nameVi}
                  </h4>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{group.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">
                    Đặc điểm Ảnh Đáy mắt (Fundus)
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 leading-relaxed">
                    {group.keyFundusFeatures.map((feat, idx) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">
                    Đặc điểm OCT (RNFL & GCC/GCIPL)
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 leading-relaxed">
                    {group.keyOctFeatures.map((feat, idx) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">
                    Bệnh sử, Thị trường & Lâm sàng
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 leading-relaxed">
                    {group.keyClinicalClues.map((clue, idx) => (
                      <li key={idx}>{clue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: FastAPI Service Layer Specification */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-teal-600" />
              <span>3. Đặc tả Tầng Dịch vụ API (FastAPI Integration Readiness)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Frontend V1 đã chuẩn bị sẵn client tại{' '}
              <code className="font-mono text-slate-700">src/services/fastApiClient.ts</code> kết nối tới máy chủ nội bộ:{' '}
              <code className="font-mono text-teal-700">{fastApiClient.getBaseUrl()}</code>
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
            REST / Multipart FormData
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-slate-200 p-4 space-y-2 bg-slate-50/50">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Các Endpoint Dự kiến trên FastAPI Backend</span>
            </div>
            <ul className="space-y-2 font-mono text-[11px] text-slate-700">
              <li className="p-2 rounded bg-white border border-slate-200">
                <span className="font-bold text-emerald-700">GET</span> /api/v1/health — Kiểm tra trạng thái máy chủ và xác nhận trọng số mô hình đã kiểm định (<code className="text-teal-700">modelVerified: boolean</code>).
              </li>
              <li className="p-2 rounded bg-white border border-slate-200">
                <span className="font-bold text-teal-700">POST</span> /api/v1/cases/analyze — Nhận <code className="text-teal-700">FormData</code> gồm JSON metadata ẩn danh và 4 luồng ảnh (<code className="text-teal-700">file_fundus</code>, <code className="text-teal-700">file_oct_rnfl</code>, <code className="text-teal-700">file_oct_gcc</code>, <code className="text-teal-700">file_visual_field</code>).
              </li>
              <li className="p-2 rounded bg-white border border-slate-200">
                <span className="font-bold text-indigo-700">GET</span> /api/v1/cases/{'{case_id}'} — Truy xuất hồ sơ và kết quả suy luận lưu trữ trên máy chủ nội bộ bệnh viện/phòng lab.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 space-y-2 bg-slate-900 text-slate-100">
            <div className="text-xs font-semibold text-teal-400">
              Cấu trúc Payload Chuẩn hóa Gửi từ Frontend V1:
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`{
  "anonymousPatientId": "GM-2026-0042",
  "eye": "OD",
  "examDate": "2026-11-11",
  "captureDate": "2026-11-11",
  "metrics": {
    "iopMmHg": 18,
    "cdrVertical": 0.68,
    "rnflAvgUm": 72,
    "gccAvgUm": 69
  },
  "modalityFilenames": {
    "fundus": "fundus_od.jpg",
    "oct_rnfl": "oct_rnfl_od.jpg",
    "oct_gcc": "oct_gcc_od.jpg"
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

