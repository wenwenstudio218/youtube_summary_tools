"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type VideoPlayerHandle = {
  seekTo: (seconds: number) => void;
};

type YTPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** 載入 YouTube IFrame API（全頁僅載入一次） */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT as YTNamespace);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

/** 內嵌 YouTube 播放器，對外提供 seekTo 以便點擊時間戳跳轉 */
export const VideoPlayer = forwardRef<VideoPlayerHandle, { videoId: string }>(
  function VideoPlayer({ videoId }, ref) {
    const mountRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        playerRef.current?.seekTo(Math.max(0, Math.floor(seconds)), true);
        playerRef.current?.playVideo();
      },
    }));

    useEffect(() => {
      let cancelled = false;
      const host = mountRef.current;
      if (!host) return;

      loadYouTubeApi().then((YT) => {
        if (cancelled || !host) return;
        const inner = document.createElement("div");
        host.appendChild(inner);
        playerRef.current = new YT.Player(inner, {
          videoId,
          playerVars: { rel: 0, modestbranding: 1 },
        });
      });

      return () => {
        cancelled = true;
        playerRef.current?.destroy();
        playerRef.current = null;
        if (host) host.innerHTML = "";
      };
    }, [videoId]);

    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-hairline bg-ink/5 [&_iframe]:h-full [&_iframe]:w-full">
        <div ref={mountRef} className="h-full w-full" />
      </div>
    );
  },
);
