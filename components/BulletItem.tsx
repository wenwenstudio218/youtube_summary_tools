"use client";

import { formatTimestamp } from "@/lib/time";
import type { Bullet } from "@/lib/types";

type Props = {
  bullet: Bullet;
  index: number;
  active: boolean;
  onSeek: (seconds: number) => void;
};

/** 時間軸尺規上的單一重點：左為 mono 時間戳刻度，右為襯線本文 */
export function BulletItem({ bullet, index, active, onSeek }: Props) {
  return (
    <li
      className="group bullet-in grid grid-cols-[3.25rem_1fr] gap-4"
      style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
    >
      <button
        type="button"
        onClick={() => onSeek(bullet.timestamp)}
        aria-label={`跳轉到 ${formatTimestamp(bullet.timestamp)}`}
        className={`cursor-pointer pt-[0.15rem] text-right font-data text-xs tracking-tight transition-colors duration-200 hover:text-seek focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seek ${
          active ? "text-seek" : "text-muted"
        }`}
      >
        {formatTimestamp(bullet.timestamp)}
      </button>

      <div className="relative border-l border-hairline pb-7 pl-5">
        <span
          className={`absolute -left-[5.5px] top-[0.5rem] h-2.5 w-2.5 rounded-full border-2 transition-colors duration-200 ${
            active
              ? "border-seek bg-seek"
              : "border-hairline bg-paper group-hover:border-pine"
          }`}
          aria-hidden
        />
        <p className="font-reading text-[1.05rem] leading-relaxed text-ink">
          {bullet.point}
        </p>
      </div>
    </li>
  );
}
