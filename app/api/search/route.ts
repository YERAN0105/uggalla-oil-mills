import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/products";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json([]);
  }
  const products = await searchProducts(q, 5);
  return NextResponse.json(products);
}
