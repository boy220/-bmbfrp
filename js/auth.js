
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  getIdToken
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// =====================================
// FIREBASE CONFIGURATION
// =====================================

const firebaseConfig = {
  apiKey: "AIzaSyBAEP9K6mZll3h4Jk4e1IOgjy4I9RsZbas",
  authDomain: "bypassgsm-member.firebaseapp.com",
  projectId: "bypassgsm-member",
  appId: "1:101151629691:web:fb59a413f205bc5e51ddde"
};

// =====================================
// INITIALIZE FIREBASE
// =====================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: "select_account"
});

// =====================================
// ADMIN ACCOUNT
// =====================================

const ADMIN_EMAIL = "bypassgsm71@gmail.com";

// =====================================
// HTML ELEMENTS
// =====================================

const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const statusText = document.getElementById("status");

const memberArea = document.getElementById("memberArea");
const adminArea = document.getElementById("adminArea");

const memberEmail = document.getElementById("memberEmail");

const addForm = document.getElementById("addForm");
const newEmail = document.getElementById("newEmail");
const membersList = document.getElementById("membersList");

// =====================================
// STATUS MESSAGE
// =====================================

function showStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

// =====================================
// HIDE MEMBER AND ADMIN AREAS
// =====================================

function hideAreas() {
  if (memberArea) {
    memberArea.style.display = "none";
  }

  if (adminArea) {
    adminArea.style.display = "none";
  }

  if (loginBtn) {
    loginBtn.style.display = "inline-block";
  }

  if (logoutBtn) {
    logoutBtn.style.display = "none";
  }
}

// =====================================
// CREATE CLOUDFLARE SESSION
// =====================================

async function createServerSession(user) {
  const idToken = await getIdToken(user, true);

  const response = await fetch("/api/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      idToken
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.ok !== true) {
    throw new Error(
      result.message || "Cloudflare ไม่อนุญาตให้เข้าสู่ระบบ"
    );
  }

  return result;
}

// =====================================
// CLEAR CLOUDFLARE SESSION
// =====================================

async function clearServerSession() {
  const response = await fetch("/api/logout", {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("ไม่สามารถยกเลิก Session บนเซิร์ฟเวอร์ได้");
  }
}

// =====================================
// GOOGLE LOGIN
// =====================================

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      showStatus("กำลังเข้าสู่ระบบ Google...");

      await signInWithPopup(auth, provider);

    } catch (error) {
      console.error(error);

      showStatus(
        "เข้าสู่ระบบไม่สำเร็จ: " + error.message
      );
    }
  });
}

// =====================================
// LOGOUT
// =====================================

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      showStatus("กำลังออกจากระบบ...");

      await clearServerSession();
      await signOut(auth);

      hideAreas();
      showStatus("ออกจากระบบแล้ว");

    } catch (error) {
      console.error(error);

      // ออกจาก Firebase ด้วย แม้เซิร์ฟเวอร์มีปัญหา
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error(signOutError);
      }

      hideAreas();

      showStatus(
        "ออกจากระบบแล้ว แต่การยกเลิก Session บนเซิร์ฟเวอร์ไม่สำเร็จ กรุณาโหลดหน้าเว็บใหม่"
      );
    }
  });
}

// =====================================
// ADMIN: LOAD MEMBER LIST
// =====================================

async function refreshMembers() {
  if (!membersList) return;

  membersList.textContent = "กำลังโหลดรายชื่อสมาชิก...";

  try {
    const snapshot = await getDocs(
      collection(db, "members")
    );

    membersList.innerHTML = "";

    if (snapshot.empty) {
      membersList.textContent = "ยังไม่มีสมาชิก";
      return;
    }

    snapshot.forEach((memberDoc) => {
      const email = memberDoc.id;
      const data = memberDoc.data();

      const active = data.active === true;

      const item = document.createElement("div");

      item.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px;border-bottom:1px solid #ddd;";

      const info = document.createElement("span");

      info.textContent =
        email + (active ? " — อนุญาต" : " — ระงับ");

      item.appendChild(info);

      if (email !== ADMIN_EMAIL) {
        const button = document.createElement("button");

        button.type = "button";

        button.textContent =
          active ? "ระงับ" : "เปิดใช้งาน";

        button.addEventListener("click", async () => {
          try {
            await setDoc(
              doc(db, "members", email),
              {
                active: !active
              },
              {
                merge: true
              }
            );

            showStatus("ปรับสถานะสมาชิกแล้ว");

            await refreshMembers();

          } catch (error) {
            console.error(error);

            showStatus(
              "ไม่สามารถเปลี่ยนสถานะสมาชิกได้"
            );
          }
        });

        item.appendChild(button);
      }

      membersList.appendChild(item);
    });

  } catch (error) {
    console.error(error);

    membersList.textContent =
      "โหลดรายชื่อสมาชิกไม่สำเร็จ";
  }
}

// =====================================
// ADMIN: ADD MEMBER
// =====================================

if (addForm) {
  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = newEmail?.value?.trim().toLowerCase();

    if (
      !email ||
      !/^[a-z0-9._%+-]+@gmail\.com$/.test(email)
    ) {
      showStatus("กรุณากรอก Gmail ให้ถูกต้อง");
      return;
    }

    try {
      await setDoc(
        doc(db, "members", email),
        {
          active: true,
          addedAt: new Date().toISOString()
        }
      );

      newEmail.value = "";

      showStatus("เพิ่มสมาชิกสำเร็จ: " + email);

      await refreshMembers();

    } catch (error) {
      console.error(error);

      showStatus(
        "เพิ่มสมาชิกไม่สำเร็จ: " + error.message
      );
    }
  });
}

// =====================================
// LOGIN ACCESS CONTROL
// =====================================

let accessDenied = false;
let authCheckId = 0;

onAuthStateChanged(auth, async (user) => {
  const currentCheckId = ++authCheckId;

  hideAreas();

  // -----------------------------
  // NOT LOGGED IN
  // -----------------------------

  if (!user) {
    if (accessDenied) {
      showStatus(
        "บัญชีนี้ยังไม่ได้รับอนุญาตให้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
      );

      accessDenied = false;

    } else {
      showStatus("กรุณาเข้าสู่ระบบด้วย Google");
    }

    return;
  }

  try {
    showStatus("กำลังตรวจสอบสิทธิ์บัญชี...");

    const email = user.email?.toLowerCase();

    // -----------------------------
    // VERIFY EMAIL
    // -----------------------------

    if (!email || user.emailVerified !== true) {
      accessDenied = true;

      await signOut(auth);

      return;
    }

    // -----------------------------
    // CHECK MEMBER PERMISSION
    // -----------------------------

    if (email !== ADMIN_EMAIL) {
      const memberRef = doc(db, "members", email);
      const memberSnapshot = await getDoc(memberRef);

      if (currentCheckId !== authCheckId) return;

      if (
        !memberSnapshot.exists() ||
        memberSnapshot.data().active !== true
      ) {
        accessDenied = true;

        await signOut(auth);

        return;
      }
    }

    // -----------------------------
    // CREATE SERVER SESSION
    // -----------------------------

    showStatus("กำลังตรวจสอบสิทธิ์กับเซิร์ฟเวอร์...");

    await createServerSession(user);

    if (currentCheckId !== authCheckId) return;

    // -----------------------------
    // APPROVED ACCOUNT
    // -----------------------------

    accessDenied = false;

    if (loginBtn) {
      loginBtn.style.display = "none";
    }

    if (logoutBtn) {
      logoutBtn.style.display = "inline-block";
    }

    if (memberEmail) {
      memberEmail.textContent = email;
    }

    if (memberArea) {
      memberArea.style.display = "block";
    }

    // -----------------------------
    // ADMIN ACCESS
    // -----------------------------

    if (email === ADMIN_EMAIL) {
      if (adminArea) {
        adminArea.style.display = "block";
      }

      showStatus("เข้าสู่ระบบผู้ดูแลสำเร็จ");

      await refreshMembers();

      return;
    }

    // -----------------------------
    // MEMBER ACCESS
    // -----------------------------

    showStatus("เข้าสู่ระบบสำเร็จ");

  } catch (error) {
    console.error("Authentication error:", error);

    if (currentCheckId !== authCheckId) return;

    accessDenied = true;

    try {
      await clearServerSession();
    } catch (sessionError) {
      console.error(sessionError);
    }

    if (auth.currentUser) {
      await signOut(auth);
    }

    hideAreas();

    showStatus(
      "ตรวจสอบสิทธิ์ไม่สำเร็จ: " + error.message
    );
  }
});
