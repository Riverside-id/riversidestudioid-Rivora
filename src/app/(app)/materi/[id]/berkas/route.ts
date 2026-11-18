import { NextResponse, type NextRequest } from "next/server";
import { getDataAccess } from "@/lib/data";
import { DataError } from "@/lib/data/errors";
import { idSchema } from "@/lib/validation/settings";

/**
 * Buka file materi: periksa sesi & kepemilikan di server, lalu alihkan ke signed URL Storage
 * berdurasi pendek. PDF terbuka di browser; Word/PowerPoint diunduh dengan nama aslinya.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/materi/[id]/berkas">) {
  const { id } = await ctx.params;
  const materiUrl = new URL("/materi", request.nextUrl.origin);

  const access = await getDataAccess();
  if (access.source === "fixture") {
    materiUrl.searchParams.set("berkas", "demo");
    return NextResponse.redirect(materiUrl);
  }
  if (!access.mutations) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    materiUrl.searchParams.set("berkas", "hilang");
    return NextResponse.redirect(materiUrl);
  }

  try {
    const signedUrl = await access.mutations.getMaterialFileUrl(parsed.data);
    const response = NextResponse.redirect(signedUrl);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    materiUrl.searchParams.set("berkas", error instanceof DataError && error.code === "NOT_FOUND" ? "hilang" : "gagal");
    return NextResponse.redirect(materiUrl);
  }
}
