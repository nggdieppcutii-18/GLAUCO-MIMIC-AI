import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Eye,
  Info,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { fastApiClient } from '../services/fastApiClient';
import { FundusInferenceRecord } from '../types/clinical';
import { ClinicalInfo } from './ClinicalInfo';

interface FundusInferenceCardProps {
  fundusFile?: File | null;
  fundusFileName?: string;
  originalImageUri?: string | null;
  savedInference?: FundusInferenceRecord | null;
  onInferenceSuccess?: (result: FundusInferenceRecord) => void;
  className?: string;
}

export const FundusInferenceCard: React.FC<FundusInferenceCardProps> = ({
  fundusFile,
  fundusFileName,
  originalImageUri,
  savedInference,
  onInferenceSuccess,
  className = '',
}) => {
  const [inference, setInference] = useState<FundusInferenceRecord | null>(savedInference || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gradcam' | 'original' | 'split'>('gradcam');
  const [manualFile, setManualFile] = useState<File | null>(null);

  const activeFile = fundusFile || manualFile;

  const handleRunInference = async (fileToUse?: File) => {
    if (loading) return; // Prevent double-click / rapid spamming
    const file = fileToUse || activeFile;
    if (!file) {
      setError('Vui lòng chọn hoặc tải lên tệp ảnh đáy mắt trước khi phân tích.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fastApiClient.predictFundus(file);
      const record: FundusInferenceRecord = {
        ...response,
        executedAt: new Date().toISOString(),
      };
      setInference(record);
      if (onInferenceSuccess) {
        onInferenceSuccess(record);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi kết nối với máy chủ suy luận AI.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setManualFile(file);
    void handleRunInference(file);
    e.target.value = '';
  };

  const isGlaucoma = inference?.predictionCode === 'GLAUCOMA';
  const probGlaucoma = inference?.probabilities?.Glaucoma ?? 0;
  const probNonGlaucoma = inference?.probabilities?.['Non-Glaucoma'] ?? 0;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-900/5 to-slate-50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300">
              PVTv2-B2 V4 ENSEMBLE
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
              NHỊ PHÂN: GLOCOM vs ĐỐI CHỨNG
            </span>
            
	
<ClinicalInfo
  title="PVTv2-B2 V4 Ensemble"
  brief="Mô hình phân loại nhị phân Glaucoma và Normal."
  detail="Kiến trúc Pyramid Vision Transformer V2-B2 sử dụng ensemble gồm 5 checkpoint độc lập. Đầu vào ảnh Fundus RGB được resize 224x224 và chuẩn hóa theo ImageNet. Kết quả là trung bình xác suất Softmax của 5 mô hình. Grad-CAM được tổng hợp từ gradient của từng checkpoint."
  reference="PVTv2-B2 V4 | Five-fold ensemble"
/>


          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Cpu className="w-4.5 h-4.5 text-teal-600" />
            <span>Phân tích Điểm số Softmax Đáy mắt AI (PVTv2-B2)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Suy luận thời gian thực qua FastAPI backend (	PVTv2-B2 Five-Fold Ensemble (CPU)) &bull; Trả về Điểm số Softmax
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {activeFile ? (
            <button
              type="button"
              onClick={() => void handleRunInference()}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang suy luận AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{inference ? 'Chạy lại Phân tích' : 'Chạy Suy luận AI'}</span>
                </>
              )}
            </button>
          ) : (
            <label className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-2xs cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Tải ảnh đáy mắt để suy luận</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.bmp,image/jpeg,image/png,image/webp,image/bmp"
                onChange={handleDirectFileUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Không thể hoàn tất suy luận</div>
            <p>{error}</p>
            <p className="text-[11px] text-rose-700">
              Hãy đảm bảo backend FastAPI đang chạy tại <code>http://127.0.0.1:8001</code> và tệp ảnh có dung lượng &le; 25MB.
            </p>
          </div>
        </div>
      )}

      {/* Body Area */}
      <div className="p-4 sm:p-5 space-y-5">
        {!inference && !loading && (
          <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Sẵn sàng Thực hiện Suy luận</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {activeFile
                  ? `Đã chọn tệp: "${activeFile.name}". Nhấn nút "Chạy Suy luận AI" để nạp ảnh vào mô hình PVTv2-B2 V4 và nhận điểm số Softmax kèm bản đồ nhiệt Grad-CAM.`
                  : 'Hãy tải lên ảnh đáy mắt (Fundus) trong hồ sơ hoặc bấm nút tải ảnh trực tiếp ở trên để phân tích điểm số Softmax Glocom.'}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="p-8 rounded-xl bg-teal-50/40 border border-teal-200 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-teal-950">Đang thực hiện Suy luận PVTv2-B2 V4</h4>
              <p className="text-xs text-teal-800 mt-1">
                Tiền xử lý ảnh (Resize 224x224, Chuẩn hóa ImageNet) &bull; Trích xuất đặc trưng &bull; Tính đạo hàm Grad-CAM
              </p>
            </div>
          </div>
        )}

        {inference && !loading && (
          <div className="space-y-5">
            {/* Top Stat Row: Result Badge, Probability, Confidence, Latency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Predicted Class Card */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isGlaucoma
                    ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                    : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                  Dự đoán Phân loại
                </div>
                <div className="text-lg font-bold mt-1 flex items-center gap-1.5">
                  {isGlaucoma ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <span>{isGlaucoma ? 'Glocom (Glaucoma)' : 'Không Glocom (Non-Glaucoma)'}</span>
                </div>
                <div className="text-[11px] mt-1 font-mono">
                  Mã lớp: {inference.predictionCode}
                </div>
              </div>

              {/* Glaucoma Softmax Score */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Điểm Softmax Glocom
                </div>
                <div className="text-xl font-bold font-mono text-rose-600 mt-1">
                  {(probGlaucoma * 100).toFixed(2)}%
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${probGlaucoma * 100}%` }}
                  />
                </div>
              </div>

              {/* Non-Glaucoma Softmax Score */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Điểm Softmax Đối chứng
                </div>
                <div className="text-xl font-bold font-mono text-teal-700 mt-1">
                  {(probNonGlaucoma * 100).toFixed(2)}%
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
                  <div
                    className="h-full bg-teal-600 rounded-full"
                    style={{ width: `${probNonGlaucoma * 100}%` }}
                  />
                </div>
              </div>

              {/* Confidence & Speed */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Điểm Softmax cao nhất & Tốc độ
                </div>
                <div className="text-base font-bold font-mono text-slate-800 mt-1">
                  {(inference.confidenceScore * 100).toFixed(1)}% Softmax
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  Suy luận: {inference.inferenceTimeMs} ms (CPU)
                </div>
              </div>
            </div>

            {/* Grad-CAM Heatmap Visualizer */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Bản đồ Kích hoạt Grad-CAM (Giải thích Vùng Thị giác)
                  </span>
                  <ClinicalInfo
                    title="Bản đồ Nhiệt Grad-CAM"
                    brief="Gradient-weighted Class Activation Mapping"
                    detail="Grad-CAM sử dụng gradient của điểm số dự đoán truyền ngược về lớp tích chập cuối cùng để đánh dấu các vùng pixel mà mô hình dựa vào khi phân loại (thường tập trung tại bờ gai thị và tỷ lệ lõm đĩa)."
                    reference="Selvaraju et al., Grad-CAM"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setViewMode('gradcam')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'gradcam' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bản đồ Nhiệt
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('original')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'original' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ảnh Gốc
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'split' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    So sánh Song song
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[300px]">
                {viewMode === 'gradcam' && (
                  <div className="text-center space-y-2">
                    <img
                      src={inference.gradcamOverlayUri}
                      alt="Grad-CAM Heatmap"
                      className="max-h-[380px] max-w-full rounded-lg mx-auto object-contain border border-slate-700 shadow-md"
                    />
                    <div className="text-[11px] font-mono text-slate-400">
                      Vùng đỏ/vàng: Mức độ kích hoạt đặc trưng cao &bull; Vùng xanh: Mức độ kích hoạt thấp
                    </div>
                    <div className="text-[10px] text-amber-300/90 max-w-lg mx-auto">
                      Lưu ý giải thích AI: Vùng kích hoạt Grad-CAM thể hiện sự tập trung toán học của mạng nơ-ron, KHÔNG PHẢI vùng tổn thương bệnh học hay viền tổn thương mô đã được bác sĩ xác thực.
                    </div>
                  </div>
                )}

                {viewMode === 'original' && (
                  <div className="text-center space-y-2">
                    {originalImageUri || activeFile ? (
                      <img
                        src={originalImageUri || (activeFile ? URL.createObjectURL(activeFile) : '')}
                        alt="Original Fundus"
                        className="max-h-[380px] max-w-full rounded-lg mx-auto object-contain border border-slate-700 shadow-md"
                      />
                    ) : (
                      <div className="text-xs text-slate-400">Ảnh gốc không có sẵn trong phiên</div>
                    )}
                    <div className="text-[11px] font-mono text-slate-400">
                      Tệp: {inference.imageMetadata.filename || fundusFileName || 'Fundus'} ({inference.imageMetadata.originalWidth}x{inference.imageMetadata.originalHeight}px)
                    </div>
                  </div>
                )}

                {viewMode === 'split' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                    <div className="space-y-1 text-center">
                      <div className="text-xs font-semibold text-slate-300">Ảnh Đáy Mắt Gốc</div>
                      <img
                        src={originalImageUri || (activeFile ? URL.createObjectURL(activeFile) : '')}
                        alt="Original Fundus"
                        className="h-[260px] w-full rounded-lg object-contain bg-black/60 border border-slate-800"
                      />
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="text-xs font-semibold text-teal-300">Phủ Nhiệt Grad-CAM</div>
                      <img
                        src={inference.gradcamOverlayUri}
                        alt="Grad-CAM Heatmap"
                        className="h-[260px] w-full rounded-lg object-contain bg-black/60 border border-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Regulatory Disclaimers & Model Bounds */}
            <div className="space-y-2.5 pt-1">
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>CẢNH BÁO MÔ HÌNH NGHIÊN CỨU (EXPERIMENTAL ONLY)</span>
                </div>
                <p className="leading-relaxed text-amber-900/90 text-[11px]">
                  {inference.disclaimer}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-slate-800">
                  <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Phạm vi Kiến trúc & Giới hạn Thử nghiệm</span>
                </div>
                <p className="leading-relaxed text-slate-600 text-[11px]">
                  {inference.fiveClassScaffoldNotice}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
