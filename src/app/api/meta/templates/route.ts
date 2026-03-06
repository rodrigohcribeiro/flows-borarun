import { NextResponse } from "next/server";
import { fetchMetaMessageTemplates, getMetaConfig } from "@/lib/meta";

export async function GET() {
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
    const templates = await fetchMetaMessageTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch templates: ${error}` },
      { status: 500 }
    );
  }
}
