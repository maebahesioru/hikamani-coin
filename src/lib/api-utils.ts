import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export function ok<T>(data: T) {
  return NextResponse.json(data);
}
