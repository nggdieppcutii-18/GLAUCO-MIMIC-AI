import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

export interface InfoTooltipProps {
  title: string;
  brief: string;
  detail?: string;
  reference?: string;
  className?: string;
}

export const ClinicalInfo: React.FC<InfoTooltipProps> = ({
  title,
  brief,
  detail,
  reference,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHover, setShowHover] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setShowHover(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowHover(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <span
        className={`inline-flex items-center relative align-middle ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowHover(false);
            setIsOpen(true);
          }}
          className="p-0.5 rounded-full text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
          title={`Xem chú thích: ${title}`}
          aria-label={`Chú thích lâm sàng về ${title}`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {/* Desktop Quick Hover Tooltip */}
        {showHover && !isOpen && (
          <span
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-40 hidden sm:block w-56 p-2 rounded-md bg-slate-900 text-slate-100 text-[11px] leading-tight shadow-md border border-slate-700 pointer-events-none animate-fadeIn"
          >
            <span className="font-semibold block text-teal-300 mb-0.5">{title}</span>
            <span className="text-slate-300 block">{brief}</span>
            {detail && (
              <span className="block mt-1 text-[10px] text-teal-400 font-medium">
                (Bấm ⓘ để xem chi tiết)
              </span>
            )}
          </span>
        )}
      </span>

      {/* Detail Modal / Sheet for Click (Desktop & Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center text-xs">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <h3 id="modal-title" className="text-sm font-semibold text-slate-900">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-100 text-teal-900 font-medium">
                {brief}
              </div>

              {detail && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                    Ý nghĩa lâm sàng & chẩn đoán
                  </div>
                  <p className="text-slate-600 whitespace-pre-line">{detail}</p>
                </div>
              )}

              {reference && (
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-500">Tiêu chuẩn đối chiếu:</span>{' '}
                  {reference}
                </div>
              )}
            </div>

            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
