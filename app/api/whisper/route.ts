import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // SAFE: Load API key from env file
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  try {
    const form = await req.formData();
    const file = form.get("audio") as File;
    const target = (form.get("target") as string)?.toLowerCase();

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Invalid or missing audio file" },
        { status: 400 }
      );
    }

    if (!target) {
      return NextResponse.json({ error: "Missing target string" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const temp = `/tmp/audio_${Date.now()}.webm`;
    fs.writeFileSync(temp, buffer);

    const resp = await client.audio.transcriptions.create({
      file: fs.createReadStream(temp),
      model: "whisper-1",
    });

    fs.unlinkSync(temp);

    const transcript = resp.text.toLowerCase();

    return NextResponse.json({
      transcript,
      match: transcript.includes(target),
    });
  } catch (e: unknown) {
    console.error("WHISPER ERROR:", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
