
const FIREBASE_API_KEY = "AIzaSyBAEP9K6mZll3h4J4e1Ogjy4I9RsZbas";
const FIREBASE_PROJECT_ID = "bypassgsm-member";
const ADMIN_EMAIL = "bypassgsm71@gmail.com";
const COOKIE_NAME = "__Host-bmb_session";

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

  return { email: user.email.toLowerCase() };
}

async function isActiveMember(email, idToken) {
  if (email === ADMIN_EMAIL) return true;

  const url =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
    `/databases/(default)/documents/members/${encodeURIComponent(email)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` }
  });

  if (!response.ok) return false;

  const data = await response.json();
  return data.fields?.active?.booleanValue === true;
}

function getSessionCookie(request) {
  const cookies = request.headers.get("Cookie") || "";

  const item = cookies
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(COOKIE_NAME + "="));

  return item
    ? item.substring(COOKIE_NAME.length + 1)
    : null;
}

function redirectToLogin(request, clearCookie = false) {
  const loginUrl = new URL("/login.html", request.url);

  const headers = new Headers({
    Location: loginUrl.toString(),
    "Cache-Control": "no-store"
  });

  if (clearCookie) {
    headers.append(
      "Set-Cookie",
      `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
    );
  }

  return new Response(null, {
    status: 302,
    headers
  });
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // ตรวจสอบผลลัพธ์หน้า Login ชั่วคราว
  if (pathname === "/login.html") {
    const response = await context.next();

    return new Response(
      JSON.stringify({
        test: "LOGIN_NEXT_RESULT",
        status: response.status,
        location: response.headers.get("Location"),
        contentType: response.headers.get("Content-Type")
      }, null, 2),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      }
    );
  }

  // อนุญาต API
  if (pathname === "/login.html" || pathname === "/login") {
  ) {
    return context.next();
  }

  // อนุญาตไฟล์ประกอบเว็บไซต์
  const publicAsset =
    /\.(css|js|mjs|map|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i;

  if (publicAsset.test(pathname)) {
    return context.next();
  }

  // ตรวจสอบ Session
  const idToken = getSessionCookie(request);

  if (!idToken) {
    return redirectToLogin(request);
  }

  try {
    const user = await verifyFirebaseToken(idToken);

    if (!user) {
      return redirectToLogin(request, true);
    }

    const allowed = await isActiveMember(user.email, idToken);

    if (!allowed) {
      return redirectToLogin(request, true);
    }

    const response = await context.next();
    const headers = new Headers(response.headers);

    headers.set("Cache-Control", "private, no-store");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

  } catch (error) {
    return redirectToLogin(request, true);
  }
}
