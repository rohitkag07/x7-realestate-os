import { FileText, ImageIcon, Video } from 'lucide-react';
import type { InteractiveReplyButton, KeywordReplyMediaType } from '@/types/database';

export function WhatsAppMessagePreview({
  body,
  buttons,
  mediaType,
  mediaName,
}: {
  body: string;
  buttons: InteractiveReplyButton[];
  mediaType?: KeywordReplyMediaType;
  mediaName?: string;
}) {
  const MediaIcon = mediaType === 'video' ? Video : mediaType === 'image' ? ImageIcon : FileText;
  return (
    <div className="overflow-hidden rounded-[28px] border-[7px] border-[#111b21] bg-[#efeae2] shadow-lg">
      <div className="flex items-center gap-2 bg-[#075e54] px-4 py-3 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9fdd3] text-xs font-bold text-[#075e54]">WA</div>
        <div><div className="text-xs font-semibold">Your business</div><div className="text-[9px] text-white/70">WhatsAI Assistant</div></div>
      </div>
      <div className="min-h-56 p-4">
        <div className="ml-auto max-w-[92%] overflow-hidden rounded-2xl rounded-tr-sm bg-[#d9fdd3] text-xs text-[#111b21] shadow-sm">
          {mediaType ? (
            <div className="flex min-h-24 items-center justify-center gap-2 bg-[#c6eebf] px-3 text-[#075e54]">
              <MediaIcon className="h-5 w-5" /><span className="max-w-[150px] truncate">{mediaName || mediaType}</span>
            </div>
          ) : null}
          <div className="px-3 py-2.5">
            <p className="whitespace-pre-wrap leading-5">{body || 'Your approved reply appears here.'}</p>
            <div className="mt-1 text-right text-[9px] text-[#667781]">10:32 AM ✓✓</div>
          </div>
          {buttons.length ? (
            <div className="border-t border-[#b8dfb2] bg-white/55">
              {buttons.map((button) => (
                <div key={button.id} className="border-b border-[#b8dfb2] px-3 py-2 text-center font-semibold text-[#008069] last:border-b-0">
                  {button.title || 'Button label'}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
