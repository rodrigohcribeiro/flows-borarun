import { NextResponse } from "next/server";
import { getMetaConfig, subscribeMetaAppToWaba } from "@/lib/meta";

export async function POST() {
  const { configured, missing } = getMetaConfig();

  if (!configured) {
    return NextResponse.json(
      {
        error: "Meta Cloud API credentials not configured",
        missing,
      },
      { status: 400 }
    );
  }

  try {
    const result = await subscribeMetaAppToWaba();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to subscribe app to WABA: ${error}` },
      { status: 500 }
    );
  }
}
