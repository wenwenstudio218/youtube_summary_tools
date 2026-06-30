"use client";

import { formatTimestamp } from "@/lib/time";
import type { VideoCard as VideoCardType } from "@/lib/types";

type Props = {
  card: VideoCardType;
  onSummarize: (videoId: string) => void;
};

/** 搜尋結果單張卡片：縮圖（疊時長）、標題、頻道、立即摘要 */
export function VideoCard({ card, onSummarize }: Props) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface transition-colors duration-200 hover:border-pine">
      <div className="relative aspect-video bg-ink/5">
        {card.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.thumbnail}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-data text-xs text-muted">
            無縮圖
          </div>
        )}
        {card.duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 font-data text-[0.7rem] text-white">
            {formatTimestamp(card.duration)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-ink">
          {card.title}
        </h3>
        <p className="mt-1 font-data text-xs text-muted">{card.channel}</p>
        <button
          type="button"
          onClick={() => onSummarize(card.videoId)}
          className="mt-3 cursor-pointer self-start rounded-lg bg-pine px-3 py-1.5 font-display text-xs font-medium text-oncolor transition-colors duration-200 hover:bg-pine-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          ✨ 立即摘要
        </button>
      </div>
    </div>
  );
}
