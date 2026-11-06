
export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (context.request.headers.get("Origin") !== "https://bmbfrp.pages.dev") {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(
    JSON.stringify({ ok: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie":
          "__Host-bmb_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
        "Cache-Control": "no-store"
      }
    }
  );
}

