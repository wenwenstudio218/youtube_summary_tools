// 共用型別定義

/** 影片基本資訊（來自 YouTube oEmbed） */
export type VideoMetadata = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
};

/** 單一字幕片段，start 一律以「秒」為單位 */
export type TranscriptSegment = {
  text: string;
  start: number;
};

/** 摘要中的單一重點，timestamp 以「秒」為單位 */
export type Bullet = {
  point: string;
  timestamp: number;
};

export type SummaryLength = "short" | "long";

/** 一次生成的完整摘要，含長短兩版 */
export type Summary = {
  videoId: string;
  metadata: VideoMetadata;
  short: Bullet[];
  long: Bullet[];
};

/** API 統一錯誤格式 */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};
