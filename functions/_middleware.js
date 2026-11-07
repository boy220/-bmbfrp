```javascript
const FIREBASE_API_KEY = "AIzaSyBAEP9K6mZll3h4J4eIgjy4I9RsZbas";
const FIREBASE_PROJECT_ID = "bypassgsm-member";
const ADMIN_EMAIL = "bypassgsm71@gmail.com";
const COOKIE_NAME = "__Host-bmb_session";

// ตรวจสอบ Firebase ID Token
async function verifyFirebaseToken(idToken) {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idToken })
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const user = data.users?.[0];

    if (!user?.email || user.emailVerified !== true) {
      return null;
    }

    return {
      email: user.email.toLowerCase()
    };
  } catch {
    return null;
  }
}

// ตรวจสอบสมาชิกใน Firestore
async function isActiveMember(email, idToken) {
  if (email === ADMIN_EMAIL) return true;

  try {
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
  } catch {
    return false;
  }
}

// อ่าน Session Cookie
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

// ส่งกลับหน้า Login
function redirectToLogin(request, clearCookie = false) {
  const loginUrl = new URL("/login", request.url);

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

// ระบบตรวจสอบสิทธิ์สมาชิก
export async function onRequest(context) {
  const request = context.request;
  const pathname = new URL(request.url).pathname;

  // ตรวจสอบ Session ชั่วคราว
  if (pathname === "/__session-check") {
    const idToken = getSessionCookie(request);

    if (!idToken) {
      return Response.json(
        {
          cookiePresent: false,
          tokenValid: false,
          memberAllowed: false
        },
        {
          headers: { "Cache-Control": "no-store" }
        }
      );
    }

    const user = await verifyFirebaseToken(idToken);
    const allowed = user
      ? await isActiveMember(user.email, idToken)
      : false;

    return Response.json(
      {
        cookiePresent: true,
        tokenValid: !!user,
        memberAllowed: allowed
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  // อนุญาตหน้า Login
  if (
    pathname === "/login" ||
    pathname === "/login.html" ||
    pathname === "/login/"
  ) {
    return context.next();
  }

  // อนุญาต API
  if (
    pathname === "/api" ||
    pathname.startsWith("/api/")
  ) {
    return context.next();
  }

  // อนุญาตไฟล์ประกอบเว็บไซต์
  const publicAsset =
    /\.(css|js|mjs|map|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i;

  if (publicAsset.test(pathname)) {
    return context.next();
  }

  // อ่าน Session Cookie
  const idToken = getSessionCookie(request);

  if (!idToken) {
    return redirectToLogin(request);
  }

  // ตรวจสอบ Firebase Token
  const user = await verifyFirebaseToken(idToken);

  if (!user) {
    return redirectToLogin(request, true);
  }

  // ตรวจสอบสิทธิ์สมาชิก
  const allowed = await isActiveMember(user.email, idToken);

  if (!allowed) {
    return redirectToLogin(request, true);
  }

  // อนุญาตให้เข้าสู่เว็บไซต์
  const response = await context.next();
  const headers = new Headers(response.headers);

  headers.set("Cache-Control", "private, no-store");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
```
