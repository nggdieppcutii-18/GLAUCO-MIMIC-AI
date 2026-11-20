import type {
  ClinicalCaseRecord,
  ClinicalHistoryFlags,
  ClinicalMetrics,
  DiseaseGroupDefinition,
  DiseaseGroupId,
  ModalityType,
} from '../types/clinical';

export const DISEASE_GROUPS: Record<DiseaseGroupId, DiseaseGroupDefinition> = {
  GLAUCOMA: {
    id: 'GLAUCOMA',
    code: 'GRP-01',
    nameEn: 'Glaucoma',
    nameVi: 'Bệnh Glocom (Tổn thương đầu thị thần kinh do nhãn áp/cơ học)',
    shortName: 'Glaucoma',
    folderName: 'GLOCOM',
    colorClass: 'text-teal-700',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    borderColor: 'border-teal-200',
    description:
      'Bệnh lý thần kinh thị giác tiến triển mạn tính đặc trưng bởi lõm đĩa thị rộng theo trục dọc, mỏng lớp sợi thần kinh võng mạc (RNFL) ưu thế cực trên/dưới và khuyết thị trường tương ứng.',
    keyFundusFeatures: [
      'Tăng tỷ lệ C/D dọc (Vertical CDR thường ≥ 0.6) hoặc bất đối xứng C/D hai mắt > 0.2',
      'Mỏng viền thần kinh (neuroretinal rim) khu trú cực dưới hoặc cực trên (vi phạm quy tắc ISNT)',
      'Viền thần kinh còn lại thường giữ màu hồng, ít bạc màu lan tỏa ở giai đoạn sớm-trung bình',
      'Khuyết lớp sợi thần kinh hình chêm (RNFL wedge defect) hoặc xuất huyết cạnh đĩa (Drance hemorrhage)',
    ],
    keyOctFeatures: [
      'OCT RNFL: Mỏng ưu thế ở góc phần tư Trên (Superior) và Dưới (Inferior)',
      'OCT GCC/GCIPL: Mỏng phức hợp tế bào hạch tôn trọng đường ngang (horizontal raphe)',
      'Tương quan cấu trúc - chức năng chặt chẽ với tổn thương thị trường dạng cung (arcuate scotoma)',
    ],
    keyClinicalClues: [
      'Tiến triển âm thầm, thị lực trung tâm (BCVA) và sắc giác thường bảo tồn đến giai đoạn muộn',
      'Nhãn áp (IOP) có thể cao hoặc bình thường (Normal-Tension Glaucoma - NTG cần phân biệt kỹ với CON)',
    ],
    repoFundusCount: 50,
    repoOctCount: 49,
    repoUniqueFundusCount: 49,
    repoUniqueOctCount: 22,
  },
  CON: {
    id: 'CON',
    code: 'GRP-02',
    nameEn: 'Compressive Optic Neuropathy (CON)',
    nameVi: 'Bệnh thần kinh thị giác do chèn ép',
    shortName: 'CON',
    folderName: 'CHÈN ÉP THẦN KINH THỊ GIÁC',
    colorClass: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderColor: 'border-amber-200',
    description:
      'Tổn thương đường dẫn truyền thị giác trước giao thoa hoặc tại giao thoa thị giác do khối choán chỗ (u tuyến yên, u màng não, phình mạch), dễ gây giả lõm đĩa giống Glocom nhãn áp bình thường.',
    keyFundusFeatures: [
      'Bạc màu đĩa thị (optic disc pallor) nổi trội hơn mức độ lõm đĩa (pallor > cupping)',
      'Viền thần kinh còn lại nhạt màu rõ rệt (khác với viền hồng trong Glocom)',
      'Có thể biểu hiện teo gai dạng dải ngang (band/bow-tie optic atrophy) khi tổn thương giao thoa',
    ],
    keyOctFeatures: [
      'OCT RNFL: Mỏng ưu thế vùng Thái dương (Temporal) và Phía mũi (Nasal) — mẫu "bow-tie"',
      'OCT GCC/GCIPL: Mỏng tôn trọng đường dọc qua hoàng điểm (vertical meridian / binasal hoặc bitemporal pattern) — dấu hiệu chỉ điểm quan trọng nhất phân biệt với Glocom',
    ],
    keyClinicalClues: [
      'Giảm thị lực trung tâm tiến triển từ từ, rối loạn sắc giác sớm và rõ',
      'Khuyết thị trường tôn trọng đường dọc (bán manh thái dương hai bên hoặc bán manh đồng danh)',
      'Cần chỉ định chụp cộng hưởng từ (MRI) sọ não - hốc mắt khi nghi ngờ',
    ],
    repoFundusCount: 1,
    repoOctCount: 1,
    repoUniqueFundusCount: 1,
    repoUniqueOctCount: 1,
  },
  NAION: {
    id: 'NAION',
    code: 'GRP-03',
    nameEn: 'Non-Arteritic Anterior Ischemic Optic Neuropathy (NAION)',
    nameVi: 'Thiếu máu cục bộ đầu thị thần kinh trước không do viêm động mạch',
    shortName: 'NAION',
    folderName: 'THIẾU MÁU CỤC BỘ THỊ GIÁC',
    colorClass: 'text-rose-700',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    borderColor: 'border-rose-200',
    description:
      'Nhồi máu cấp tính vùng đầu dây thần kinh thị giác (do hệ mạch mi ngắn sau), ở giai đoạn mạn tính có thể để lại teo gai kèm lõm đĩa hoặc khuyết thị trường theo chiều ngang dễ nhầm với Glocom.',
    keyFundusFeatures: [
      'Giai đoạn cấp: Phù đĩa thị toàn bộ hoặc khu trú (sectoral disc edema) kèm xuất huyết hình ngọn lửa cạnh đĩa',
      'Giai đoạn mạn (>6-8 tuần): Bạc màu đĩa thị khu trú (thường nửa trên) hoặc lan tỏa, ít tăng lõm đĩa trừ một số ca thiếu máu nặng',
      'Mắt bên kia thường có đĩa thị nhỏ, tỷ lệ C/D rất nhỏ ("disc at risk", CDR < 0.2)',
    ],
    keyOctFeatures: [
      'OCT RNFL: Dày lên rõ ở giai đoạn cấp; mỏng nặng khu trú nửa trên/dưới ở giai đoạn teo gai mạn tính',
      'OCT GCC/GCIPL: Mỏng sớm theo ranh giới ngang (altitudinal GCIPL loss) xuất hiện trước cả khi hết phù RNFL',
    ],
    keyClinicalClues: [
      'Khởi phát giảm thị lực đột ngột, không đau, thường phát hiện khi thức dậy buổi sáng',
      'Khuyết thị trường theo chiều ngang (altitudinal visual field defect, thường ở nửa dưới)',
      'Yếu tố nguy cơ mạch máu: Tăng huyết áp, đái tháo đường, ngưng thở khi ngủ',
    ],
    repoFundusCount: 8,
    repoOctCount: 2,
    repoUniqueFundusCount: 8,
    repoUniqueOctCount: 2,
  },
  ON: {
    id: 'ON',
    code: 'GRP-04',
    nameEn: 'Optic Neuritis (ON)',
    nameVi: 'Viêm dây thần kinh thị giác',
    shortName: 'Optic Neuritis',
    folderName: 'VIÊM DÂY THẦN KINH THỊ GIÁC',
    colorClass: 'text-indigo-700',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    borderColor: 'border-indigo-200',
    description:
      'Tình trạng viêm mất myelin hoặc tự miễn của dây thần kinh thị giác (điển hình hoặc liên quan NMOSD/MOGAD). Sau đợt cấp để lại bạc màu đĩa thị phía thái dương và mỏng RNFL/GCC.',
    keyFundusFeatures: [
      'Giai đoạn cấp: 2/3 trường hợp đáy mắt bình thường (viêm hậu nhãn cầu - retrobulbar), 1/3 có phù đĩa thị nhẹ (papillitis)',
      'Giai đoạn di chứng: Bạc màu đĩa thị ưu thế vùng thái dương (temporal pallor), không có lõm đĩa sâu kiểu Glocom',
    ],
    keyOctFeatures: [
      'OCT RNFL: Mỏng rõ bó gai-hoàng điểm (papillomacular bundle / vùng Temporal) ở giai đoạn sau cấp',
      'OCT GCC/GCIPL: Mỏng lan tỏa đồng tâm quanh hoàng điểm xuất hiện sớm sau 2-4 tuần',
    ],
    keyClinicalClues: [
      'Khởi phát cấp/bán cấp ở người trẻ, đặc trưng bởi đau hốc mắt tăng khi vận nhãn',
      'Rối loạn sắc giác (đặc biệt màu đỏ - red desaturation) và RAPD (+) rất rõ',
      'Khuyết thị trường trung tâm hoặc cạnh trung tâm (central/ceco-central scotoma)',
    ],
    repoFundusCount: 1,
    repoOctCount: 2,
    repoUniqueFundusCount: 1,
    repoUniqueOctCount: 2,
  },
  HEALTHY: {
    id: 'HEALTHY',
    code: 'GRP-05',
    nameEn: 'Healthy Control',
    nameVi: 'Mắt bình thường (Nhóm chứng khỏe mạnh)',
    shortName: 'Healthy Control',
    folderName: 'MẮT BÌNH THƯỜNG',
    colorClass: 'text-emerald-700',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    description:
      'Nhóm đối chứng sinh lý không có bệnh lý đầu thị thần kinh hay tổn thương đường dẫn truyền thị giác, dùng làm chuẩn tham chiếu hình thái đĩa thị và độ dày lớp sợi thần kinh.',
    keyFundusFeatures: [
      'Đĩa thị bờ rõ, viền thần kinh hồng hào, tuân thủ quy tắc ISNT (Inferior ≥ Superior ≥ Nasal ≥ Temporal)',
      'Tỷ lệ C/D dọc sinh lý (thường ≤ 0.4, hoặc lõm đĩa sinh lý cân xứng trên đĩa thị kích thước lớn - macrodisc)',
      'Không có xuất huyết cạnh đĩa, không có khuyết lớp sợi thần kinh võng mạc',
    ],
    keyOctFeatures: [
      'OCT RNFL: Đường biểu diễn TSNIT dạng hai đỉnh ("double-hump") nằm trong giới hạn chuẩn theo tuổi (vùng xanh lá)',
      'OCT GCC/GCIPL: Độ dày phức hợp tế bào hạch hoàng điểm đều đặn, đối xứng hai mắt',
    ],
    keyClinicalClues: [
      'Thị lực chỉnh kính tối đa (BCVA) bình thường, sắc giác bình thường, RAPD (-)',
      'Nhãn áp trong giới hạn sinh lý (10–21 mmHg), thị trường hoàn toàn bình thường',
    ],
    repoFundusCount: 2,
    repoOctCount: 3,
    repoUniqueFundusCount: 2,
    repoUniqueOctCount: 3,
  },
};

export const DISEASE_GROUP_LIST: DiseaseGroupDefinition[] = [
  DISEASE_GROUPS.GLAUCOMA,
  DISEASE_GROUPS.CON,
  DISEASE_GROUPS.NAION,
  DISEASE_GROUPS.ON,
  DISEASE_GROUPS.HEALTHY,
];

export interface ModalityConfig {
  id: ModalityType;
  labelVi: string;
  labelEn: string;
  shortCode: string;
  requiredForCoreMultimodal: boolean;
  description: string;
  recommendedFormat: string;
}

export const MODALITY_CONFIGS: Record<ModalityType, ModalityConfig> = {
  fundus: {
    id: 'fundus',
    labelVi: 'Ảnh chụp Đáy mắt (Color Fundus Photography)',
    labelEn: 'Color Fundus / Optic Disc Photo',
    shortCode: 'CFP',
    requiredForCoreMultimodal: true,
    description:
      'Đánh giá hình thái đĩa thị, tỷ lệ C/D, quy tắc ISNT, mức độ bạc màu viền thần kinh, phù gai và xuất huyết cạnh đĩa.',
    recommendedFormat: 'JPG, PNG (Tập trung vùng gai thị - hoàng điểm)',
  },
  oct_rnfl: {
    id: 'oct_rnfl',
    labelVi: 'OCT Lớp sợi thần kinh quanh gai (Peripapillary RNFL)',
    labelEn: 'OCT Peripapillary RNFL Report',
    shortCode: 'OCT-RNFL',
    requiredForCoreMultimodal: true,
    description:
      'Bản đồ độ dày RNFL quanh đĩa thị (biểu đồ TSNIT và 4 góc phần tư Superior, Inferior, Nasal, Temporal).',
    recommendedFormat: 'JPG, PNG (Báo cáo cắt lớp quanh đĩa thị)',
  },
  oct_gcc: {
    id: 'oct_gcc',
    labelVi: 'OCT Phức hợp Tế bào hạch Hoàng điểm (Macular GCC / GCIPL)',
    labelEn: 'OCT Macular GCC / GCIPL Map',
    shortCode: 'OCT-GCC',
    requiredForCoreMultimodal: true,
    description:
      'Bản đồ tế bào hạch hoàng điểm giúp phân biệt ranh giới ngang (Glocom/NAION) với ranh giới dọc qua hoàng điểm (CON).',
    recommendedFormat: 'JPG, PNG (Bản đồ GCC/GCIPL vùng hoàng điểm)',
  },
  visual_field: {
    id: 'visual_field',
    labelVi: 'Báo cáo Thị trường Tự động (Standard Automated Perimetry)',
    labelEn: 'Visual Field (SAP 24-2 / 30-2 / 10-2)',
    shortCode: 'VF-SAP',
    requiredForCoreMultimodal: false,
    description:
      'Báo cáo thị trường (nếu có) hỗ trợ đối chiếu tổn thương hình cung, bán manh dọc hoặc khuyết thị trường trung tâm.',
    recommendedFormat: 'JPG, PNG (Báo cáo Humphrey / Octopus nếu có)',
  },
};

export const MODALITY_ORDER: ModalityType[] = ['fundus', 'oct_rnfl', 'oct_gcc', 'visual_field'];

export const EMPTY_METRICS: ClinicalMetrics = {
  iopMmHg: null,
  bcvaLogMAR: null,
  cdrVertical: null,
  cdrArea: null,
  rnflAvgUm: null,
  rnflSuperiorUm: null,
  rnflInferiorUm: null,
  rnflTemporalUm: null,
  rnflNasalUm: null,
  gccAvgUm: null,
  gccMinimumUm: null,
  vfMdDb: null,
  vfPsdDb: null,
  octSignalStrength: null,
};

export const EMPTY_HISTORY_FLAGS: ClinicalHistoryFlags = {
  acuteVisionLoss: false,
  painOnEyeMovement: false,
  dyschromatopsia: false,
  rapdPresent: false,
  neurologicalSymptoms: false,
  familyHistoryGlaucoma: false,
};

/**
 * Khung hồ sơ tham chiếu khởi tạo từ các tệp ảnh có thật trong kho dữ liệu nội bộ (D:\GLAUCO-MIMIC AI).
 * QUAN TRỌNG: Chỉ lưu tên tệp và kích thước byte thực tế trên ổ đĩa; toàn bộ chỉ số lâm sàng (IOP, RNFL, C/D, tuổi...)
 * để trống (null) vì kho ảnh gốc chưa đính kèm bệnh án định lượng. Không tự tạo thông số lâm sàng giả.
 */
export const INITIAL_SEED_CASES: ClinicalCaseRecord[] = [
  {
    id: 'case-seed-glaucoma-001',
    anonymousPatientId: 'GM-REPO-GLC01',
    eye: 'OD',
    examDate: '2026-11-11',
    captureDate: '2026-11-11',
    patientAge: null,
    patientSex: '',
    referringCohort: 'GLAUCOMA',
    clinicalNotes:
      '[Hồ sơ khung từ kho ảnh nội bộ] Tham chiếu tệp thực tế trong thư mục GLOCOM (IMG_6150.JPG & IMG_6040.JPG). Chưa nhập thông số lâm sàng định lượng.',
    modalities: {
      fundus: {
        modality: 'fundus',
        fileName: 'GLOCOM/Ảnh đáy mắt/IMG_6150.JPG',
        fileSize: 214648,
        mimeType: 'image/jpeg',
        lastModified: 1760400000000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
        notes: 'Tệp ảnh thực tế trong thư mục GLOCOM/Ảnh đáy mắt',
      },
      oct_rnfl: {
        modality: 'oct_rnfl',
        fileName: 'GLOCOM/Ảnh OCT/IMG_6040.JPG',
        fileSize: 285929,
        mimeType: 'image/jpeg',
        lastModified: 1760400000000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
        notes: 'Tệp ảnh thực tế trong thư mục GLOCOM/Ảnh OCT',
      },
    },
    metrics: {
      ...EMPTY_METRICS,
    },
    historyFlags: {
      ...EMPTY_HISTORY_FLAGS,
    },
    status: 'DRAFT',
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: '2026-11-11T00:00:00.000Z',
    isSeedCase: true,
  },
  {
    id: 'case-seed-con-002',
    anonymousPatientId: 'GM-REPO-CON01',
    eye: 'OS',
    examDate: '2026-11-11',
    captureDate: '2026-11-11',
    patientAge: null,
    patientSex: '',
    referringCohort: 'CON',
    clinicalNotes:
      '[Hồ sơ khung từ kho ảnh nội bộ] Tham chiếu tệp thực tế trong thư mục CHÈN ÉP THẦN KINH THỊ GIÁC (IMG_6195.JPG & IMG_6196.JPG). Chưa nhập thông số lâm sàng định lượng.',
    modalities: {
      fundus: {
        modality: 'fundus',
        fileName: 'CHÈN ÉP THẦN KINH THỊ GIÁC/Ảnh đáy mắt/IMG_6195.JPG',
        fileSize: 260351,
        mimeType: 'image/jpeg',
        lastModified: 1760745600000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
      },
      oct_rnfl: {
        modality: 'oct_rnfl',
        fileName: 'CHÈN ÉP THẦN KINH THỊ GIÁC/ảnh OCT/IMG_6196.JPG',
        fileSize: 533534,
        mimeType: 'image/jpeg',
        lastModified: 1760745600000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
      },
    },
    metrics: {
      ...EMPTY_METRICS,
    },
    historyFlags: {
      ...EMPTY_HISTORY_FLAGS,
    },
    status: 'DRAFT',
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: '2026-11-11T00:00:00.000Z',
    isSeedCase: true,
  },
  {
    id: 'case-seed-naion-003',
    anonymousPatientId: 'GM-REPO-NAI01',
    eye: 'OD',
    examDate: '2026-11-11',
    captureDate: '2026-11-11',
    patientAge: null,
    patientSex: '',
    referringCohort: 'NAION',
    clinicalNotes:
      '[Hồ sơ khung từ kho ảnh nội bộ] Tham chiếu tệp thực tế trong thư mục THIẾU MÁU CỤC BỘ THỊ GIÁC (IMG_6192.JPG & IMG_6193.JPG). Chưa nhập thông số lâm sàng định lượng.',
    modalities: {
      fundus: {
        modality: 'fundus',
        fileName: 'THIẾU MÁU CỤC BỘ THỊ GIÁC/Ảnh đáy mắt/IMG_6192.JPG',
        fileSize: 177896,
        mimeType: 'image/jpeg',
        lastModified: 1761091200000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
      },
      oct_rnfl: {
        modality: 'oct_rnfl',
        fileName: 'THIẾU MÁU CỤC BỘ THỊ GIÁC/ảnh OCT/IMG_6193.JPG',
        fileSize: 351720,
        mimeType: 'image/jpeg',
        lastModified: 1761091200000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
      },
    },
    metrics: {
      ...EMPTY_METRICS,
    },
    historyFlags: {
      ...EMPTY_HISTORY_FLAGS,
    },
    status: 'DRAFT',
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: '2026-11-11T00:00:00.000Z',
    isSeedCase: true,
  },
  {
    id: 'case-seed-on-004',
    anonymousPatientId: 'GM-REPO-ON01',
    eye: 'OS',
    examDate: '2026-11-11',
    captureDate: '2026-11-11',
    patientAge: null,
    patientSex: '',
    referringCohort: 'ON',
    clinicalNotes:
      '[Hồ sơ khung từ kho ảnh nội bộ] Tham chiếu tệp thực tế trong thư mục VIÊM DÂY THẦN KINH THỊ GIÁC (IMG_6199.JPG & IMG_6198.JPG). Chưa nhập thông số lâm sàng định lượng.',
    modalities: {
      fundus: {
        modality: 'fundus',
        fileName: 'VIÊM DÂY THẦN KINH THỊ GIÁC/Ảnh đáy mắt/IMG_6199.JPG',
        fileSize: 163410,
        mimeType: 'image/jpeg',
        lastModified: 1761609600000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
      },
      oct_rnfl: {
        modality: 'oct_rnfl',
        fileName: 'VIÊM DÂY THẦN KINH THỊ GIÁC/ảnh OCT/IMG_6198.JPG',
        fileSize: 671810,
        mimeType: 'image/jpeg',
        lastModified: 1761609600000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
      },
    },
    metrics: {
      ...EMPTY_METRICS,
    },
    historyFlags: {
      ...EMPTY_HISTORY_FLAGS,
    },
    status: 'DRAFT',
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: '2026-11-11T00:00:00.000Z',
    isSeedCase: true,
  },
  {
    id: 'case-seed-healthy-005',
    anonymousPatientId: 'GM-REPO-HC01',
    eye: 'OD',
    examDate: '2026-11-11',
    captureDate: '2026-11-11',
    patientAge: null,
    patientSex: '',
    referringCohort: 'HEALTHY',
    clinicalNotes:
      '[Hồ sơ khung từ kho ảnh nội bộ] Tham chiếu tệp thực tế trong thư mục MẮT BÌNH THƯỜNG (IMG_6230.JPG & IMG_6228.JPG). Chưa nhập thông số lâm sàng định lượng.',
    modalities: {
      fundus: {
        modality: 'fundus',
        fileName: 'MẮT BÌNH THƯỜNG/Ảnh đáy mắt/IMG_6230.JPG',
        fileSize: 62045,
        mimeType: 'image/jpeg',
        lastModified: 1762041600000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
      },
      oct_rnfl: {
        modality: 'oct_rnfl',
        fileName: 'MẮT BÌNH THƯỜNG/Ảnh OCT/IMG_6228.JPG',
        fileSize: 197879,
        mimeType: 'image/jpeg',
        lastModified: 1762041600000,
        uploadedAt: '2026-11-11T00:00:00.000Z',
      },
    },
    metrics: {
      ...EMPTY_METRICS,
    },
    historyFlags: {
      ...EMPTY_HISTORY_FLAGS,
    },
    status: 'DRAFT',
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: '2026-11-11T00:00:00.000Z',
    isSeedCase: true,
  },
];
