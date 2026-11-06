

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAEP9K6mZll3h4Jk4e1IOgjy4I9RsZbas",
  authDomain: "bypassgsm-member.firebaseapp.com",
  projectId: "bypassgsm-member",
  appId: "1:101151629691:web:fb59a413f205bc5e51ddde"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: "select_account"
});

// Admin Gmail
const ADMIN_EMAIL = "bypassgsm71@gmail.com";

// HTML Elements
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const statusText = document.getElementById("status");
const memberArea = document.getElementById("memberArea");
const adminArea = document.getElementById("adminArea");
const memberEmail = document.getElementById("memberEmail");
const addForm = document.getElementById("addForm");
const newEmail = document.getElementById("newEmail");
const membersList = document.getElementById("membersList");

// Status message
function showStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

// Hide member and admin areas
function hideAreas() {
  if (memberArea) memberArea.style.display = "none";
  if (adminArea) adminArea.style.display = "none";
  if (loginBtn) loginBtn.style.display = "inline-block";
  if (logoutBtn) logoutBtn.style.display = "none";
}

// Google Login
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      showStatus("กำลังเข้าสู่ระบบ Google...");
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      showStatus("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    }
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      showStatus("ออกจากระบบแล้ว");
      hideAreas();
    } catch (error) {
      showStatus("ออกจากระบบไม่สำเร็จ");
      console.error(error);
    }
  });
}

// Admin: Load member list
async function refreshMembers() {
  if (!membersList) return;

  membersList.innerHTML = "กำลังโหลดรายชื่อสมาชิก...";

  try {
    const snapshot = await getDocs(collection(db, "members"));

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
      info.textContent = email + (active ? " — อนุญาต" : " — ระงับ");
      item.appendChild(info);

      if (email !== ADMIN_EMAIL) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = active ? "ระงับ" : "เปิดใช้งาน";

        button.addEventListener("click", async () => {
          try {
            await setDoc(
              doc(db, "members", email),
              {
                active: !active
              },
              { merge: true }
            );

            showStatus("ปรับสถานะสมาชิกแล้ว");
            await refreshMembers();
          } catch (error) {
            console.error(error);
            showStatus("ไม่สามารถเปลี่ยนสถานะสมาชิกได้");
          }
        });

        item.appendChild(button);
      }

      membersList.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    membersList.textContent = "โหลดรายชื่อสมาชิกไม่สำเร็จ";
  }
}

// Admin: Add member
if (addForm) {
  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = newEmail?.value?.trim().toLowerCase();

    if (!email || !/^[a-z0-9._%+-]+@gmail\.com$/.test(email)) {
      showStatus("กรุณากรอก Gmail ให้ถูกต้อง");
      return;
    }

    try {
      await setDoc(doc(db, "members", email), {
        active: true,
        addedAt: new Date().toISOString()
      });

      newEmail.value = "";
      showStatus("เพิ่มสมาชิกสำเร็จ: " + email);

      await refreshMembers();
    } catch (error) {
      console.error(error);
      showStatus("เพิ่มสมาชิกไม่สำเร็จ: " + error.message);
    }
  });
}

// Check login and membership
onAuthStateChanged(auth, async (user) => {
  hideAreas();

  if (!user) {
    showStatus("กรุณาเข้าสู่ระบบด้วย Google");
    return;
  }

  const email = user.email?.toLowerCase();

  if (!email || user.emailVerified !== true) {
    showStatus("บัญชี Google นี้ไม่ผ่านการยืนยันอีเมล");
    await signOut(auth);
    return;
  }

  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-block";

  if (memberEmail) {
    memberEmail.textContent = email;
  }

  // Admin access
  if (email === ADMIN_EMAIL) {
    if (adminArea) adminArea.style.display = "block";
    if (memberArea) memberArea.style.display = "block";

    showStatus("เข้าสู่ระบบผู้ดูแลสำเร็จ");
    await refreshMembers();
    return;
  }

  // Check approved member
  try {
    const memberRef = doc(db, "members", email);
    const memberSnapshot = await getDoc(memberRef);

    if (!memberSnapshot.exists() ||
        memberSnapshot.data().active !== true) {

      showStatus("บัญชีนี้ยังไม่ได้รับอนุญาตให้ใช้งาน");

      await signOut(auth);
      hideAreas();
      return;
    }

    if (memberArea) memberArea.style.display = "block";

    showStatus("เข้าสู่ระบบสำเร็จ");
  } catch (error) {
    console.error(error);
    showStatus("ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองใหม่");
    await signOut(auth);
    hideAreas();
  }
});
