import type {
  ClinicalCaseRecord,
  ClinicalMetrics,
  CompletenessReport,
  DataCompletenessWarning,
  ModalityType,
} from '../types/clinical';

export interface FormValidationErrors {
  anonymousPatientId?: string;
  examDate?: string;
  captureDate?: string;
  patientAge?: string;
  metrics: Partial<Record<keyof ClinicalMetrics, string>>;
}

export function validateCaseForm(
  anonymousPatientId: string,
  examDate: string,
  captureDate: string,
  patientAge: number | null,
  metrics: ClinicalMetrics
): { isValid: boolean; errors: FormValidationErrors } {
  const errors: FormValidationErrors = { metrics: {} };

  const trimmedId = anonymousPatientId.trim();
  if (!trimmedId) {
    errors.anonymousPatientId = 'Vui lòng nhập Mã bệnh nhân ẩn danh (ví dụ: GM-2026-0042).';
  } else if (trimmedId.length < 3 || trimmedId.length > 36) {
    errors.anonymousPatientId = 'Mã bệnh nhân ẩn danh cần từ 3 đến 36 ký tự.';
  } else if (!/^[A-Za-z0-9_-]+$/.test(trimmedId)) {
    errors.anonymousPatientId =
      'Mã ẩn danh chỉ được chứa chữ cái không dấu, chữ số, dấu gạch ngang (-) hoặc gạch dưới (_). Không nhập họ tên thật.';
  }

  if (!examDate) {
    errors.examDate = 'Vui lòng chọn ngày khám lâm sàng.';
  }

  if (!captureDate) {
    errors.captureDate = 'Vui lòng chọn ngày chụp hình ảnh.';
  }

  if (patientAge !== null && (patientAge < 1 || patientAge > 120 || !Number.isInteger(patientAge))) {
    errors.patientAge = 'Tuổi bệnh nhân phải là số nguyên từ 1 đến 120.';
  }

  if (metrics.iopMmHg !== null && (metrics.iopMmHg < 2 || metrics.iopMmHg > 80)) {
    errors.metrics.iopMmHg = 'Nhãn áp (IOP) hợp lệ nằm trong khoảng 2 – 80 mmHg.';
  }

  if (metrics.bcvaLogMAR !== null && (metrics.bcvaLogMAR < -0.3 || metrics.bcvaLogMAR > 3.0)) {
    errors.metrics.bcvaLogMAR = 'Thị lực LogMAR hợp lệ từ -0.3 đến 3.0.';
  }

  if (metrics.cdrVertical !== null && (metrics.cdrVertical < 0.0 || metrics.cdrVertical > 1.0)) {
    errors.metrics.cdrVertical = 'Tỷ lệ C/D dọc phải nằm trong khoảng 0.00 – 1.00.';
  }

  if (metrics.cdrArea !== null && (metrics.cdrArea < 0.0 || metrics.cdrArea > 1.0)) {
    errors.metrics.cdrArea = 'Tỷ lệ diện tích C/D phải nằm trong khoảng 0.00 – 1.00.';
  }

  const rnflFields: Array<keyof ClinicalMetrics> = [
    'rnflAvgUm',
    'rnflSuperiorUm',
    'rnflInferiorUm',
    'rnflTemporalUm',
    'rnflNasalUm',
  ];

  for (const field of rnflFields) {
    const val = metrics[field];
    if (val !== null && (val < 10 || val > 350)) {
      errors.metrics[field] = 'Độ dày RNFL hợp lệ nằm trong khoảng 10 – 350 µm.';
    }
  }

  if (metrics.gccAvgUm !== null && (metrics.gccAvgUm < 15 || metrics.gccAvgUm > 200)) {
    errors.metrics.gccAvgUm = 'Độ dày GCC/GCIPL trung bình hợp lệ từ 15 – 200 µm.';
  }

  if (metrics.gccMinimumUm !== null && (metrics.gccMinimumUm < 10 || metrics.gccMinimumUm > 200)) {
    errors.metrics.gccMinimumUm = 'Độ dày GCC/GCIPL tối thiểu hợp lệ từ 10 – 200 µm.';
  }

  if (metrics.vfMdDb !== null && (metrics.vfMdDb < -35 || metrics.vfMdDb > 10)) {
    errors.metrics.vfMdDb = 'Chỉ số MD thị trường hợp lệ từ -35.0 đến +10.0 dB.';
  }

  if (metrics.vfPsdDb !== null && (metrics.vfPsdDb < 0 || metrics.vfPsdDb > 25)) {
    errors.metrics.vfPsdDb = 'Chỉ số PSD thị trường hợp lệ từ 0.0 đến 25.0 dB.';
  }

  if (
    metrics.octSignalStrength !== null &&
    (metrics.octSignalStrength < 1 || metrics.octSignalStrength > 10)
  ) {
    errors.metrics.octSignalStrength = 'Chất lượng tín hiệu OCT (Signal Strength) từ 1 đến 10.';
  }

  const hasTopLevelErrors = Boolean(
    errors.anonymousPatientId || errors.examDate || errors.captureDate || errors.patientAge
  );
  const hasMetricErrors = Object.keys(errors.metrics).length > 0;

  return {
    isValid: !hasTopLevelErrors && !hasMetricErrors,
    errors,
  };
}

export function evaluateCaseCompleteness(record: ClinicalCaseRecord): CompletenessReport {
  const warnings: DataCompletenessWarning[] = [];
  const modalityKeys: ModalityType[] = ['fundus', 'oct_rnfl', 'oct_gcc', 'visual_field'];
  const presentModalities = modalityKeys.filter((k) => Boolean(record.modalities[k]));

  const hasFundus = Boolean(record.modalities.fundus);
  const hasOctRnfl = Boolean(record.modalities.oct_rnfl);
  const hasOctGcc = Boolean(record.modalities.oct_gcc);
  const hasVisualField = Boolean(record.modalities.visual_field);

  if (!hasFundus) {
    warnings.push({
      id: 'missing-fundus',
      severity: 'critical',
      field: 'fundus',
      title: 'Thiếu ảnh chụp Đáy mắt (Color Fundus)',
      detail:
        'Cần ảnh gai thị để đánh giá mức độ bạc màu viền thần kinh (pallor) so với mức độ lõm đĩa (cupping) và xuất huyết cạnh đĩa.',
    });
  }

  if (!hasOctRnfl) {
    warnings.push({
      id: 'missing-oct-rnfl',
      severity: 'critical',
      field: 'oct_rnfl',
      title: 'Thiếu báo cáo OCT RNFL quanh gai',
      detail:
        'Bản đồ RNFL 4 góc phần tư (S/I/T/N) là dữ liệu cốt lõi để phân biệt mỏng cực trên/dưới (Glaucoma) với mỏng bó thái dương/dải ngang (CON, ON).',
    });
  }

  if (!hasOctGcc) {
    warnings.push({
      id: 'missing-oct-gcc',
      severity: 'warning',
      field: 'oct_gcc',
      title: 'Chưa có bản đồ OCT GCC/GCIPL Hoàng điểm',
      detail:
        'Thiếu bản đồ GCC/GCIPL làm giảm khả năng phát hiện dấu hiệu tôn trọng đường dọc hoàng điểm (vertical meridian) đặc trưng của Chèn ép thần kinh thị giác (CON).',
    });
  }

  if (!hasVisualField) {
    warnings.push({
      id: 'missing-vf',
      severity: 'info',
      field: 'visual_field',
      title: 'Chưa đính kèm báo cáo Thị trường (SAP)',
      detail:
        'Báo cáo thị trường là tùy chọn nhưng được khuyến nghị để đối chiếu tương quan cấu trúc - chức năng (tổn thương hình cung vs bán manh dọc/ngang).',
    });
  }

  if (record.metrics.iopMmHg === null) {
    warnings.push({
      id: 'missing-iop',
      severity: 'warning',
      field: 'iopMmHg',
      title: 'Chưa nhập chỉ số Nhãn áp (IOP)',
      detail:
        'Thiếu thông tin nhãn áp gây hạn chế khi phân tầng giữa Glocom nhãn áp cao (POAG), Glocom nhãn áp bình thường (NTG) và các bệnh lý giả Glocom.',
    });
  }

  if (record.metrics.rnflAvgUm === null && record.metrics.cdrVertical === null) {
    warnings.push({
      id: 'missing-quant-oct',
      severity: 'warning',
      field: 'metrics',
      title: 'Thiếu các chỉ số định lượng OCT / C/D',
      detail:
        'Hồ sơ vẫn được lưu hợp lệ, nhưng việc nhập các thông số định lượng (µm, C/D) sẽ giúp đối chiếu ngưỡng tham chiếu lâm sàng chính xác hơn.',
    });
  }

  if (
    record.metrics.octSignalStrength !== null &&
    record.metrics.octSignalStrength < 6
  ) {
    warnings.push({
      id: 'low-oct-signal',
      severity: 'warning',
      field: 'octSignalStrength',
      title: `Chất lượng tín hiệu OCT thấp (${record.metrics.octSignalStrength}/10)`,
      detail:
        'Signal Strength < 6/10 có thể gây sai lệch thuật toán phân đoạn lớp sợi thần kinh (segmentation artifact).',
    });
  }

  if (record.examDate && record.captureDate && record.examDate !== record.captureDate) {
    const diffMs = Math.abs(
      new Date(record.examDate).getTime() - new Date(record.captureDate).getTime()
    );
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      warnings.push({
        id: 'date-gap',
        severity: 'info',
        field: 'captureDate',
        title: `Khoảng cách giữa ngày khám và ngày chụp là ${diffDays} ngày`,
        detail:
          'Lưu ý diễn tiến theo thời gian (đặc biệt giai đoạn cấp sang teo gai mạn trong NAION hoặc ON).',
      });
    }
  }

  const metricKeys = Object.keys(record.metrics) as Array<keyof ClinicalMetrics>;
  const metricsEnteredCount = metricKeys.filter((k) => record.metrics[k] !== null).length;

  const modalityScore =
    (hasFundus ? 30 : 0) +
    (hasOctRnfl ? 25 : 0) +
    (hasOctGcc ? 15 : 0) +
    (hasVisualField ? 5 : 0);
  const metricScore = Math.min(25, Math.round((metricsEnteredCount / 8) * 25));
  const overallScore = Math.min(100, modalityScore + metricScore);

  const requiredModalitiesPresent = hasFundus && hasOctRnfl;

  let readinessLabel = 'Bản nháp sơ bộ (Thiếu ảnh cốt lõi)';
  if (requiredModalitiesPresent && hasOctGcc && metricsEnteredCount >= 4) {
    readinessLabel = 'Đầy đủ đa phương thức (Sẵn sàng chờ AI)';
  } else if (requiredModalitiesPresent) {
    readinessLabel = 'Đạt chuẩn tối thiểu (Đủ CFP + OCT RNFL)';
  }

  return {
    overallScore,
    modalityCount: presentModalities.length,
    requiredModalitiesPresent,
    metricsEnteredCount,
    totalMetricsCount: metricKeys.length,
    warnings,
    readinessLabel,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
