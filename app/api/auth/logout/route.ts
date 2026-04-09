import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/auth/session";

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (accessToken) {
      try {
        await deleteSession(accessToken);
      } catch {
        // Session may already be deleted
      }
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("accessToken", "", { maxAge: 0, path: "/" });
    response.cookies.set("httpOnlyToken", "", { maxAge: 0, path: "/" });
    return response;
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
