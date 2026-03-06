import { NextResponse } from "next/server";
import { fetchMetaHealth, getMetaConfig } from "@/lib/meta";

export async function GET() {
  const { configured, missing } = getMetaConfig();

  if (!configured) {
    return NextResponse.json(
      {
        configured: false,
        missing,
      },
      { status: 400 }
    );
  }

  try {
    const health = await fetchMetaHealth();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
