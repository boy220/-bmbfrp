
const FIREBASE_API_KEY = "AIzaSyBAEP9K6mZll3h4Jk4e1IOgjy4I9RsZbas";
const FIREBASE_PROJECT_ID = "bypassgsm-member";
const ADMIN_EMAIL = "bypassgsm71@gmail.com";

const COOKIE_NAME = "__Host-bmb_session";
const ALLOWED_ORIGIN = "https://bmbfrp.pages.dev";

async function verifyFirebaseToken(idToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  const user = data.users?.[0];

  if (!user?.email || user.emailVerified !== true) {
    return null;
  }

  return user.email.toLowerCase();
}

async function isActiveMember(email, idToken) {
  if (email === ADMIN_EMAIL) return true;

  const url =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
    `/databases/(default)/documents/members/${encodeURIComponent(email)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  if (!response.ok) return false;

  const data = await response.json();
  return data.fields?.active?.booleanValue === true;
}

export async function onRequest(context) {
  const request = context.request;

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (request.headers.get("Origin") !== ALLOWED_ORIGIN) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const body = await request.json();
    const idToken = body.idToken;

    if (
      typeof idToken !== "string" ||
      idToken.length < 100 ||
      idToken.length > 10000
    ) {
      return Response.json(
        { ok: false, message: "Invalid token" },
        { status: 400 }
      );
    }

    const email = await verifyFirebaseToken(idToken);

    if (!email) {
      return Response.json(
        { ok: false, message: "บัญชี Google ไม่ผ่านการยืนยัน" },
        { status: 401 }
      );
    }

    const allowed = await isActiveMember(email, idToken);

    if (!allowed) {
      return Response.json(
        { ok: false, message: "บัญชีนี้ไม่ได้รับอนุญาต" },
        { status: 403 }
      );
    }

    return Response.json(
      {
        ok: true,
        email
      },
      {
        headers: {
          "Set-Cookie":
            `${COOKIE_NAME}=${idToken}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return Response.json(
      { ok: false, message: "ไม่สามารถตรวจสอบสิทธิ์ได้" },
      { status: 500 }
    );
  }
}

