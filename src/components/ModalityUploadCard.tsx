import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  ImagePlus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { ModalityConfig } from '../data/cohortDefinitions';
import { ImageModalityMetadata, RuntimeModalityPreview } from '../types/clinical';
import { formatBytes } from '../utils/clinicalValidation';

interface ModalityUploadCardProps {
  config: ModalityConfig;
  metadata?: ImageModalityMetadata;
  runtimePreview?: RuntimeModalityPreview;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];

export const ModalityUploadCard: React.FC<ModalityUploadCardProps> = ({
  config,
  metadata,
  runtimePreview,
  onSelectFile,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleFileValidationAndSelect = (file: File | undefined) => {
    if (!file) return;
    setFileError(null);

    if (!ACCEPTED_MIME_TYPES.includes(file.type) && !/\.(jpe?g|png|webp|bmp)$/i.test(file.name)) {
      setFileError('Định dạng tệp không hợp lệ. Vui lòng chọn ảnh JPG, PNG, WebP hoặc BMP.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setFileError('Dung lượng ảnh vượt quá giới hạn 25MB.');
      return;
    }

    onSelectFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileValidationAndSelect(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFileValidationAndSelect(file);
  };

  const hasMetadata = Boolean(metadata);
  const hasLiveImage = Boolean(runtimePreview?.objectUrl);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {config.shortCode}
            </span>
            {config.requiredForCoreMultimodal ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                Dữ liệu cốt lõi
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Bổ trợ (Nếu có)
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mt-1.5">{config.labelVi}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{config.description}</p>
        </div>
      </div>

      {/* Body / Preview or Dropzone */}
      <div className="p-4 flex-1 flex flex-col justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.bmp,image/jpeg,image/png,image/webp,image/bmp"
          onChange={handleInputChange}
          className="hidden"
        />

        {hasLiveImage && runtimePreview ? (
          <div className="space-y-3">
            <div className="relative group rounded-lg overflow-hidden bg-slate-900 border border-slate-200 aspect-16/10 flex items-center justify-center">
              <img
                src={runtimePreview.objectUrl}
                alt={config.labelVi}
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-medium inline-flex items-center gap-1.5 shadow-sm hover:bg-slate-100 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Phóng to</span>
                </button>
              </div>
            </div>

            {metadata && (
              <div className="flex items-center justify-between text-xs bg-emerald-50/70 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-900">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-mono truncate" title={metadata.fileName}>
                    {metadata.fileName}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-emerald-700 shrink-0 ml-2">
                  {formatBytes(metadata.fileSize)}
                </span>
              </div>
            )}
          </div>
        ) : hasMetadata && metadata ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <div className="font-semibold">
                  Đã lưu metadata tệp: <span className="font-mono">{metadata.fileName}</span> (
                  {formatBytes(metadata.fileSize)})
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Vì lý do bảo mật dữ liệu y khoa và giới hạn bộ nhớ trình duyệt, tệp ảnh gốc không lưu vào{' '}
                  <code className="font-mono bg-amber-100 px-1 rounded">localStorage</code>. Vui lòng chọn lại tệp ảnh từ máy nếu cần xem trước trực quan trong phiên làm việc này.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-900 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Nạp lại tệp ảnh để xem trước</span>
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-40 ${
              dragActive
                ? 'border-teal-500 bg-teal-50/50'
                : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-2.5">
              <ImagePlus className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-700">
              Nhấn để chọn ảnh hoặc kéo thả vào đây
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{config.recommendedFormat}</p>
          </div>
        )}

        {fileError && (
          <div className="mt-2.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">
          {hasLiveImage
            ? 'Đang hiển thị bản xem trước trong phiên'
            : hasMetadata
              ? 'Chỉ có metadata (chưa nạp blob)'
              : 'Chưa tải ảnh lên'}
        </span>

        <div className="flex items-center gap-1.5">
          {(hasLiveImage || hasMetadata) && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Thay thế</span>
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="px-2.5 py-1 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-medium text-rose-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && runtimePreview && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-slate-200">
              <div>
                <span className="font-semibold text-sm">{config.labelVi}</span>
                {metadata && (
                  <span className="ml-2 font-mono text-xs text-slate-400">
                    ({metadata.fileName})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-black">
              <img
                src={runtimePreview.objectUrl}
                alt={config.labelVi}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

