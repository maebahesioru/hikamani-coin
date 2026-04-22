import { getAuthUser, unauthorized, ok } from "@/lib/api-utils";
import { signUserId } from "@/lib/user-token";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  return ok({ token: signUserId(user.id) });
}
