
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
  // ให้นำ API Key เดิมจาก app.js มาใส่ตรงนี้
  apiKey: "ใส่ API Key เดิมของคุณ",
  authDomain: "bypassgsm-member.firebaseapp.com",
  projectId: "bypassgsm-member",
  appId: "1:101151629691:web:fb59a413f205bc5e51ddde"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const ADMIN_EMAIL = "bypassgsm71@gmail.com";

// DOM elements
const loginButton = document.getElementById("googleLogin");
const loginMessage = document.getElementById("loginMessage");
const authGate = document.getElementById("authGate");
const app = document.getElementById("app");

let scannerStarted = false;
let checking = false;
let logoutButton = null;

function showMessage(message, error = false) {
  if (!loginMessage) return;

  loginMessage.textContent = message;
  loginMessage.style.color = error ? "#ff9aab" : "#91a2ba";
}

// ตรวจสอบสิทธิ์สมาชิก
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

  return memberSnapshot.data().active === true;
}

// สร้างปุ่มออกจากระบบข้างชื่อ Scanner
function createLogoutButton() {
  if (logoutButton) return;

  const heading = document.querySelector("#app header h1");

  if (!heading) {
    console.error("ไม่พบหัวข้อ ADB Scanner");
    return;
  }

  logoutButton = document.createElement("button");
  logoutButton.id = "scannerLogout";
  logoutButton.textContent = "ออกจากระบบ";

  logoutButton.style.cssText = `
    margin-left: 12px;
    padding: 9px 15px;
    border: 0;
    border-radius: 8px;
    background: #dc3545;
    color: white;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    vertical-align: middle;
  `;

  logoutButton.addEventListener("click", async () => {
    const confirmed = confirm(
      "ยืนยันออกจากระบบทั้งเว็บไซต์หลักและ ADB Scanner หรือไม่?"
    );

    if (!confirmed) return;

    logoutButton.disabled = true;
    logoutButton.textContent = "กำลังออกจากระบบ...";

    try {
      await signOut(auth);

      // Firebase จะส่งสถานะออกจากระบบไปยังหน้าเว็บหลักด้วย
      showMessage("ออกจากระบบเรียบร้อยแล้ว");

    } catch (error) {
      console.error("Logout Error:", error);

      logoutButton.disabled = false;
      logoutButton.textContent = "ออกจากระบบ";

      alert("ออกจากระบบไม่สำเร็จ: " + error.message);
    }
  });

  heading.insertAdjacentElement("afterend", logoutButton);
}

// เปิด Scanner หลังตรวจสอบสมาชิกผ่าน
async function openScanner() {
  if (scannerStarted) return;

  scannerStarted = true;

  authGate.hidden = true;
  app.hidden = false;

  createLogoutButton();

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

// ตรวจสอบบัญชี Google
async function verifyUser(user) {
  if (!user || checking || scannerStarted) return;

  checking = true;

  if (loginButton) {
    loginButton.disabled = true;
  }

  showMessage("กำลังตรวจสอบสิทธิ์สมาชิก...");

  try {
    const allowed = await checkMember(user);

    if (!allowed) {
      await signOut(auth);

      showMessage(
        "บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
        true
      );

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

    if (loginButton) {
      loginButton.disabled = false;
    }
  }
}

// Google Login
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

// ตรวจสอบสถานะ Login เมื่อเปิดหรือรีเฟรชหน้า
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await verifyUser(user);

  } else {
    scannerStarted = false;

    app.hidden = true;
    authGate.hidden = false;

    if (logoutButton) {
      logoutButton.remove();
      logoutButton = null;
    }

    showMessage("กรุณาเข้าสู่ระบบด้วย Google");
  }
});
