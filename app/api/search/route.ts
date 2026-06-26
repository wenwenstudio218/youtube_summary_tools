import { NextResponse } from "next/server";
import { searchVideos } from "@/lib/search";
import { AppError, ErrorCodes } from "@/lib/errors";
import { toErrorResponse } from "@/lib/apiError";
import type { SearchFilters } from "@/lib/types";

export const maxDuration = 30;

const ORDERS = new Set(["relevance", "date", "viewCount", "rating"]);
const UPLOADED = new Set(["any", "today", "week", "month", "year"]);
const LENGTHS = new Set(["any", "short", "medium", "long"]);

function parseFilters(sp: URLSearchParams): SearchFilters {
  const order = sp.get("order") ?? "relevance";
  const uploaded = sp.get("uploaded") ?? "any";
  const length = sp.get("length") ?? "any";
  return {
    order: (ORDERS.has(order) ? order : "relevance") as SearchFilters["order"],
    uploaded: (UPLOADED.has(uploaded) ? uploaded : "any") as SearchFilters["uploaded"],
    length: (LENGTHS.has(length) ? length : "any") as SearchFilters["length"],
  };
}

/** GET /api/search?q=&order=&uploaded=&length=&pageToken= */
export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const query = (sp.get("q") ?? "").trim();
    if (!query) {
      throw new AppError(ErrorCodes.SEARCH_FAILED, "請輸入搜尋關鍵字");
    }
    const filters = parseFilters(sp);
    const pageToken = sp.get("pageToken") ?? undefined;

    const result = await searchVideos(query, filters, pageToken);
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
