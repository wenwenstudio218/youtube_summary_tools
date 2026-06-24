/** 帶有錯誤碼的應用層錯誤，供 API 路由轉成統一格式 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  INVALID_URL: "INVALID_URL",
  NO_TRANSCRIPT: "NO_TRANSCRIPT",
  VIDEO_UNAVAILABLE: "VIDEO_UNAVAILABLE",
  TRANSCRIPT_FETCH_FAILED: "TRANSCRIPT_FETCH_FAILED",
  METADATA_FAILED: "METADATA_FAILED",
  SUMMARIZE_FAILED: "SUMMARIZE_FAILED",
} as const;
