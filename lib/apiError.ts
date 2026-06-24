import { AppError, ErrorCodes } from "./errors";
import type { ApiErrorBody } from "./types";

const STATUS_BY_CODE: Record<string, number> = {
  [ErrorCodes.INVALID_URL]: 400,
  [ErrorCodes.NO_TRANSCRIPT]: 422,
  [ErrorCodes.VIDEO_UNAVAILABLE]: 404,
  [ErrorCodes.TRANSCRIPT_FETCH_FAILED]: 502,
  [ErrorCodes.METADATA_FAILED]: 502,
  [ErrorCodes.SUMMARIZE_FAILED]: 502,
};

/** 將錯誤轉成統一的 { status, body } 供路由回應 */
export function toErrorResponse(err: unknown): {
  status: number;
  body: ApiErrorBody;
} {
  if (err instanceof AppError) {
    return {
      status: STATUS_BY_CODE[err.code] ?? 500,
      body: { error: { code: err.code, message: err.message } },
    };
  }
  return {
    status: 500,
    body: { error: { code: "INTERNAL", message: "伺服器發生未預期的錯誤" } },
  };
}
