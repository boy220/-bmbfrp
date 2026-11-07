

import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  getFirestore,
  doc,
  getDoc
} from "firebase/firestore";

// Firebase project เดียวกับเว็บไซต์หลัก
const firebaseConfig = {
  apiKey: "AIzaSyBAEP9K6mZll3h4J4eIgjy4I9RsZbas",
  authDomain: "bypassgsm-member.firebaseapp.com",
  projectId: "bypassgsm-member",
  appId: "1:101151629691:web:fb59a413f205bc5e51ddde"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const ADMIN_EMAIL = "bypassgsm71@gmail.com";

const loginButton = document.getElementById("googleLogin");
const loginMessage = document.getElementById("loginMessage");
const authGate = document.getElementById("authGate");
const app = document.getElementById("app");

let scannerStarted = false;
let checking = false;

function showMessage(message, error = false) {
  loginMessage.textContent = message;
  loginMessage.style.color = error ? "#ff9aab" : "#91a2ba";
}

async function checkMember(user) {
  const email = (user.email || "").toLowerCase().trim();

  if (!user.emailVerified) {
    throw new Error("กรุณายืนยันอีเมล Google ก่อนเข้าใช้งาน");
  }

  if (email === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  const memberRef = doc(db, "members", email);
  const memberSnapshot = await getDoc(memberRef);

  if (!memberSnapshot.exists()) {
    return false;
  }

  const memberData = memberSnapshot.data();

  return memberData.active === true;
}

async function openScanner() {
  if (scannerStarted) return;

  scannerStarted = true;

  authGate.hidden = true;
  app.hidden = false;

  showMessage("เข้าสู่ระบบสำเร็จ");

  try {
    await import("./main.js");
  } catch (error) {
    console.error(error);
    showMessage("โหลด ADB Scanner ไม่สำเร็จ", true);
    app.hidden = true;
    authGate.hidden = false;
    scannerStarted = false;
  }
}

async function verifyUser(user) {
  if (!user || checking || scannerStarted) return;

  checking = true;
  loginButton.disabled = true;

  showMessage("กำลังตรวจสอบสิทธิ์สมาชิก...");

  try {
    const allowed = await checkMember(user);

    if (!allowed) {
      await signOut(auth);
      showMessage("บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ", true);
      return;
    }

    await openScanner();

  } catch (error) {
    console.error(error);

    await signOut(auth).catch(() => {});

    showMessage(
      error.message || "ตรวจสอบสมาชิกไม่สำเร็จ กรุณาลองใหม่",
      true
    );

  } finally {
    checking = false;
    loginButton.disabled = false;
  }
}

loginButton.addEventListener("click", async () => {
  loginButton.disabled = true;
  showMessage("กำลังเปิด Google Login...");

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });

    await signInWithPopup(auth, provider);

  } catch (error) {
    console.error(error);

    showMessage(
      error.code === "auth/popup-closed-by-user"
        ? "คุณปิดหน้าต่างเข้าสู่ระบบ"
        : "เข้าสู่ระบบไม่สำเร็จ: " + error.message,
      true
    );

  } finally {
    loginButton.disabled = false;
  }
});

// ตรวจสอบสถานะ Login เมื่อเปิดหรือรีเฟรชหน้าเว็บ
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await verifyUser(user);
  } else {
    scannerStarted = false;
    app.hidden = true;
    authGate.hidden = false;
    showMessage("กรุณาเข้าสู่ระบบด้วย Google");
  }
});
