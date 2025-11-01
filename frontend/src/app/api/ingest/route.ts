import { createClient } from "@supabase/supabase-js";
import { NextResponse, NextRequest } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  console.log("Ingest API called");

  const { text } = await request.json();

  if (!text || text.trim() === "") {
    return NextResponse.json(
      { error: "Text input is required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("jobs")
    .insert([
      {
        status: "pending",
        input_text: text,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Supabase Error: ", error.message);
    return NextResponse.json(
      { error: "Failed to create job." },
      { status: 500 }
    );
  }

  return NextResponse.json({ jobId: data.id });
}
