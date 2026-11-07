

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
  deleteDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  // ใส่ API Key เดิมของคุณในเครื่องหมายคำพูดตรงนี้
  apiKey: "ใส่_API_KEY_เดิมของคุณ",
  authDomain: "bypassgsm-member.firebaseapp.com",
  projectId: "bypassgsm-member",
  appId: "1:101151629691:web:fb59a413f205bc5e51ddde"
};

// Admin email
const ADMIN_EMAIL = "bypassgsm71@gmail.com";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Google Provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account"
});

// DOM elements
const $ = selector => document.querySelector(selector);

const loginBtn = $("#login");
const logoutBtn = $("#logout");
const statusBox = $("#status");
const memberArea = $("#memberArea");
const adminArea = $("#adminArea");
const emailInput = $("#newEmail");
const membersList = $("#membersList");
const addForm = $("#addForm");

const showStatus = message => {
  if (statusBox) statusBox.textContent = message;
};

// Admin check
const isAdmin = user =>
  user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

// Check required elements
if (
  !loginBtn || !logoutBtn || !statusBox ||
  !memberArea || !adminArea || !emailInput ||
  !membersList || !addForm
) {
  console.error("BMB: ไม่พบ HTML element ที่ระบบต้องใช้");
  throw new Error("กรุณาตรวจสอบ ID ใน index.html");
}

// Google Popup Login
loginBtn.addEventListener("click", async () => {
  try {
    showStatus("กำลังเปิด Google Login...");

    const result = await signInWithPopup(auth, provider);

    console.log("Google Login สำเร็จ:", result.user.email);

    showStatus("เข้าสู่ระบบ Google สำเร็จ กำลังตรวจสอบสมาชิก...");

  } catch (error) {
    console.error("Google Login Error:", error.code, error.message);

    if (error.code === "auth/popup-closed-by-user") {
      showStatus("คุณปิดหน้าต่าง Google Login ก่อนเข้าสู่ระบบ");
    } else if (error.code === "auth/popup-blocked") {
      showStatus("เบราว์เซอร์บล็อก Popup กรุณาอนุญาต Popup");
    } else if (error.code === "auth/unauthorized-domain") {
      showStatus("เว็บไซต์นี้ยังไม่ได้รับอนุญาตใน Firebase Authorized domains");
    } else {
      showStatus("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    }
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showStatus("ออกจากระบบแล้ว");
  } catch (error) {
    console.error("Logout Error:", error);
    showStatus("ออกจากระบบไม่สำเร็จ: " + error.message);
  }
});

// Refresh member list
async function refreshMembers() {
  membersList.textContent = "กำลังโหลดรายชื่อสมาชิก...";

  try {
    const snapshot = await getDocs(collection(db, "members"));

    membersList.replaceChildren();

    if (snapshot.empty) {
      membersList.textContent = "ยังไม่มีสมาชิก";
      return;
    }

    snapshot.forEach(memberDoc => {
      const row = document.createElement("div");
      row.className = "member";

      const label = document.createElement("span");
      label.textContent =
        memberDoc.id +
        (memberDoc.data().active === true
          ? " — เปิดใช้งาน"
          : " — ปิดใช้งาน");

      const button = document.createElement("button");
      button.className = "remove";
      button.textContent = "ถอนสิทธิ์";

      button.addEventListener("click", async () => {
        if (!confirm("ยืนยันถอนสิทธิ์ " + memberDoc.id + " ?")) {
          return;
        }

        try {
          await deleteDoc(doc(db, "members", memberDoc.id));
          await refreshMembers();
          showStatus("ถอนสิทธิ์สมาชิกแล้ว");
        } catch (error) {
          console.error("Remove Member Error:", error);
          showStatus("ถอนสิทธิ์ไม่สำเร็จ: " + error.message);
        }
      });

      row.append(label, button);
      membersList.append(row);
    });

  } catch (error) {
    console.error("Refresh Members Error:", error);
    membersList.textContent =
      "โหลดรายชื่อไม่ได้: " + error.message;
  }
}

// Add member
addForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = emailInput.value.trim().toLowerCase();

  if (!/^[^\s@]+@gmail\.com$/.test(email)) {
    showStatus("กรุณากรอก Gmail ที่ถูกต้อง");
    return;
  }

  try {
    await setDoc(doc(db, "members", email), {
      active: true,
      addedAt: new Date().toISOString()
    });

    emailInput.value = "";

    showStatus("เพิ่มสมาชิก " + email + " สำเร็จ");

    await refreshMembers();

  } catch (error) {
    console.error("Add Member Error:", error);
    showStatus("เพิ่มสมาชิกไม่สำเร็จ: " + error.message);
  }
});

// Authentication state
onAuthStateChanged(auth, async user => {
  console.log("AUTH STATE:", user ? user.email : "NO USER");

  memberArea.classList.add("hidden");
  adminArea.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  loginBtn.classList.remove("hidden");

  if (!user) {
    showStatus("กรุณาเข้าสู่ระบบด้วย Gmail ที่ได้รับอนุญาต");
    return;
  }

  console.log("LOGIN EMAIL:", user.email);
  console.log("EMAIL VERIFIED:", user.emailVerified);
  console.log("IS ADMIN:", isAdmin(user));

  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");

  if (!user.email) {
    showStatus("ไม่สามารถอ่านอีเมลจากบัญชี Google ได้");
    await signOut(auth);
    return;
  }

  // Admin access
  if (isAdmin(user)) {
    showStatus("เข้าสู่ระบบในฐานะผู้ดูแลเว็บไซต์");

    memberArea.classList.remove("hidden");
    adminArea.classList.remove("hidden");

    $("#memberEmail").textContent = "Admin: " + user.email;

    await refreshMembers();
    return;
  }

  // Member access
  try {
    const memberSnap = await getDoc(
      doc(db, "members", user.email.toLowerCase())
    );

    if (
      !memberSnap.exists() ||
      memberSnap.data().active !== true
    ) {
      showStatus(
        "ไม่อนุญาตให้เข้าใช้งาน Gmail นี้ไม่ได้อยู่ในรายชื่อสมาชิก"
      );

      await signOut(auth);
      return;
    }

    showStatus("ยืนยันสมาชิกสำเร็จ");

    $("#memberEmail").textContent = "สมาชิก: " + user.email;

    memberArea.classList.remove("hidden");

  } catch (error) {
    console.error("Member Check Error:", error);

    showStatus(
      "ตรวจสอบสิทธิ์ไม่ได้ กรุณาตรวจสอบ Firebase Rules: " +
      error.message
    );

    await signOut(auth);
  }
});
