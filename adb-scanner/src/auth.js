
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

// Firebase configuration
const firebaseConfig = {
  // คง API Key จริงตัวเดิมจาก app.js ของคุณ
  apiKey: "ใส่ API Key เดิมของคุณ",
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

// แสดงข้อความ
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

  return memberSnapshot.exists() &&
    memberSnapshot.data().active === true;
}

// สร้างปุ่มออกจากระบบ
function createLogoutButton() {
  const heading = document.querySelector(
    "#app header h1"
  );

  if (!heading) {
    console.error("ไม่พบหัวข้อ ADB Scanner");
    return;
  }

  // ป้องกันสร้างปุ่มซ้ำ
  if (document.getElementById("scannerLogout")) {
    return;
  }

  const button = document.createElement("button");

  button.id = "scannerLogout";
  button.type = "button";
  button.textContent = "ออกจากระบบ";

  button.style.cssText = `
    display: inline-block;
    margin-left: 14px;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    background: #dc3545;
    color: white;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    vertical-align: middle;
  `;

  button.addEventListener("click", async () => {
    const confirmed = confirm(
      "ต้องการออกจากระบบทั้งเว็บไซต์หลักและ ADB Scanner ใช่หรือไม่?"
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "กำลังออกจากระบบ...";

    try {
      await signOut(auth);

      showMessage("ออกจากระบบเรียบร้อยแล้ว");

      // onAuthStateChanged จะพากลับหน้าล็อกอิน

    } catch (error) {
      console.error("Logout Error:", error);

      button.disabled = false;
      button.textContent = "ออกจากระบบ";

      alert("ออกจากระบบไม่สำเร็จ: " + error.message);
    }
  });

  // วางปุ่มถัดจากชื่อ ADB Scanner
  heading.insertAdjacentElement("afterend", button);
}

// เปิด Scanner
async function openScanner() {
  if (scannerStarted) return;

  scannerStarted = true;

  authGate.hidden = true;
  app.hidden = false;

  // สร้างปุ่มหลังเปิดหน้า Scanner
  createLogoutButton();

  try {
    await import("./main.js");

    // สร้างซ้ำอีกครั้งเพื่อรองรับกรณีหน้า Scanner โหลดช้า
    createLogoutButton();

  } catch (error) {
    console.error(error);

    showMessage("โหลด ADB Scanner ไม่สำเร็จ", true);

    app.hidden = true;
    authGate.hidden = false;
    scannerStarted = false;
  }
}

// ตรวจสอบบัญชี
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
      error.message || "ตรวจสอบสมาชิกไม่สำเร็จ",
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
if (loginButton) {
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
}

// ตรวจสอบสถานะ Login
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await verifyUser(user);

  } else {
    scannerStarted = false;

    app.hidden = true;
    authGate.hidden = false;

    const oldButton = document.getElementById(
      "scannerLogout"
    );

    if (oldButton) {
      oldButton.remove();
    }

    showMessage("กรุณาเข้าสู่ระบบด้วย Google");
  }
});
