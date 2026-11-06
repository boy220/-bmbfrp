

const FIREBASE_API_KEY = "AIzaSyBAEP9K6mZll3h4Jk4e1IOgjy4I9RsZbas";
const FIREBASE_PROJECT_ID = "bypassgsm-member";
const ADMIN_EMAIL = "bypassgsm71@gmail.com";
const COOKIE_NAME = "__Host-bmb_session";

// ตรวจสอบ Firebase ID Token
async function verifyFirebaseToken(idToken) {
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

  if (!user || !user.email || user.emailVerified !== true) {
    return null;
  }

  return {
    email: user.email.toLowerCase()
  };
}

// ตรวจสอบว่าสมาชิกได้รับอนุญาตหรือไม่
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

// อ่าน Cookie
function getSessionCookie(request) {
  const cookies = request.headers.get("Cookie") || "";

  const item = cookies
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(COOKIE_NAME + "="));

  return item ? item.substring(COOKIE_NAME.length + 1) : null;
}

function redirectToLogin(request) {
  const url = new URL("/login.html", request.url);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Cache-Control": "private, no-store"
    }
  });
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // อนุญาตหน้าเข้าสู่ระบบและ API
  if (
    pathname === "/login.html" ||
    pathname.startsWith("/api/")
  ) {
    return context.next();
  }

  // อนุญาตไฟล์ประกอบเว็บไซต์ เช่น CSS, JS และรูปภาพ
  const publicAsset =
    /\.(css|js|mjs|map|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i;

  if (publicAsset.test(pathname)) {
    return context.next();
  }

  // ตรวจสอบ Cookie สำหรับหน้าเว็บไซต์
  const idToken = getSessionCookie(request);

  if (!idToken) {
    return redirectToLogin(request);
  }

  try {
    // ตรวจสอบ Token กับ Firebase
    const user = await verifyFirebaseToken(idToken);

    if (!user) {
      return redirectToLogin(request);
    }

    // ตรวจสอบสิทธิ์สมาชิกจาก Firestore
    const allowed = await isActiveMember(user.email, idToken);

    if (!allowed) {
      return redirectToLogin(request);
    }

    // ผ่านการตรวจสอบแล้ว จึงอนุญาตให้เปิดหน้าเว็บ
    const response = await context.next();
    const headers = new Headers(response.headers);

    headers.set("Cache-Control", "private, no-store");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

  } catch (error) {
    // หากตรวจสอบผิดพลาด ให้ปฏิเสธการเข้าถึง
    return redirectToLogin(request);
  }
}
