import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY server environment variable" },
        { status: 500 }
      );
    }

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
      return NextResponse.json(
        { error: "Missing target string" },
        { status: 400 }
      );
    }

    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let transcript = "";
    let occurrences = 0;

    try {
      const resp = await client.audio.transcriptions.create({
        file: await toFile(buffer, "audio.webm"),
        model: "whisper-1",
      });

      transcript = (resp.text ?? "").toLowerCase();

      const words = transcript.split(/\W+/).filter(Boolean);
      const targetWord = target.toLowerCase();
      occurrences = words.filter((w) => w === targetWord).length;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? "Unknown error");

      if (msg.toLowerCase().includes("invalid file format")) {
        console.warn("Skipping chunk: invalid audio format from Whisper:", msg);

        return NextResponse.json({
          transcript: "",
          occurrences: 0,
          match: false,
        });
      }

      throw err;
    }

    return NextResponse.json({
      transcript,
      occurrences,
      match: occurrences > 0,
    });
  } catch (e: unknown) {
    console.error("WHISPER ERROR:", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
