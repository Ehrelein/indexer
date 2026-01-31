import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get("q") ?? ""
    if (q.trim() === "") return NextResponse.json({ results: [] })
    return NextResponse.json({ results: [] })
}
