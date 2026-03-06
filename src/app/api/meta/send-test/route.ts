import { NextResponse } from "next/server";
import { getMetaConfig, sendMetaWhatsAppTextMessage } from "@/lib/meta";

export async function POST(request: Request) {
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

  const body = await request.json();

  if (!body.to || !body.body) {
    return NextResponse.json(
      { error: "Fields 'to' and 'body' are required" },
      { status: 400 }
    );
  }

  try {
    const result = await sendMetaWhatsAppTextMessage({
      to: body.to,
      body: body.body,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to send WhatsApp test message: ${error}` },
      { status: 500 }
    );
  }
}
