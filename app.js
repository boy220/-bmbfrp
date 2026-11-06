import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ตั้งค่า Firebase Web App ของคุณตรงนี้
const firebaseConfig = {
  apiKey: "AIzaSyBAEP9K6mZll3h4Jk4e1IOgjy4I9RsZbas",
  authDomain: "bypassgsm-member.firebaseapp.com",
  projectId: "bypassgsm-member",
  appId: "1:101151629691:web:fb59a413f205bc5e51ddde"
};

// บัญชี Admin ที่กำหนดไว้
const ADMIN_EMAIL = "bypassgsm71@gmail.com".toLowerCase();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const $ = s => document.querySelector(s);
const loginBtn = $("#login"), logoutBtn = $("#logout");
const statusBox = $("#status"), memberArea = $("#memberArea"), adminArea = $("#adminArea");
const emailInput = $("#newEmail"), membersList = $("#membersList");
const showStatus = msg => statusBox.textContent = msg;
const isAdmin = user => user?.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL;

loginBtn.addEventListener("click", async () => {
  try { showStatus("กำลังเปิด Google Login…"); await signInWithRedirect(auth, provider); }
  catch(e) { showStatus("เข้าสู่ระบบไม่สำเร็จ: " + e.message); }
});
logoutBtn.addEventListener("click", () => signOut(auth).catch(e => showStatus(e.message)));
getRedirectResult(auth).catch(e => showStatus("Google Login มีปัญหา: " + e.message));

async function refreshMembers() {
  membersList.textContent = "กำลังโหลด…";
  try {
    const snap = await getDocs(collection(db, "members"));
    membersList.replaceChildren();
    if (snap.empty) { membersList.textContent = "ยังไม่มีสมาชิก"; return; }
    snap.forEach(memberDoc => {
      const row = document.createElement("div"); row.className = "member";
      const label = document.createElement("span");
      label.textContent = memberDoc.id + (memberDoc.data().active === true ? " — เปิดใช้งาน" : " — ปิดใช้งาน");
      const button = document.createElement("button"); button.className = "remove"; button.textContent = "ถอนสิทธิ์";
      button.addEventListener("click", async () => {
        if (!confirm("ยืนยันถอนสิทธิ์ " + memberDoc.id + " ?")) return;
        try { await deleteDoc(doc(db, "members", memberDoc.id)); await refreshMembers(); showStatus("ถอนสิทธิ์แล้ว"); }
        catch(e) { showStatus("ถอนสิทธิ์ไม่สำเร็จ: " + e.message); }
      });
      row.append(label, button); membersList.append(row);
    });
  } catch(e) {
    membersList.textContent = "โหลดรายชื่อไม่ได้: " + e.message;
  }
}

$("#addForm").addEventListener("submit", async event => {
  event.preventDefault();
  const email = emailInput.value.trim().toLowerCase();
  if (!/^[^\s@]+@gmail\.com$/.test(email)) { showStatus("กรุณากรอก Gmail ที่ถูกต้อง"); return; }
  try {
    await setDoc(doc(db, "members", email), { active: true, addedAt: new Date().toISOString() });
    emailInput.value = ""; showStatus("เพิ่มสมาชิก " + email + " สำเร็จ"); await refreshMembers();
  } catch(e) { showStatus("เพิ่มสมาชิกไม่สำเร็จ: " + e.message); }
});

onAuthStateChanged(auth, async user => {
  memberArea.classList.add("hidden"); adminArea.classList.add("hidden");
  logoutBtn.classList.add("hidden"); loginBtn.classList.remove("hidden");
  if (!user) { showStatus("กรุณาเข้าสู่ระบบด้วย Gmail ที่ได้รับอนุญาต"); return; }

  loginBtn.classList.add("hidden"); logoutBtn.classList.remove("hidden");
  if (!user.emailVerified || !user.email) {
    showStatus("บัญชีนี้ยังไม่ผ่านการยืนยันอีเมล"); await signOut(auth); return;
  }

  if (isAdmin(user)) {
    showStatus("เข้าสู่ระบบในฐานะผู้ดูแลเว็บไซต์");
    memberArea.classList.remove("hidden"); adminArea.classList.remove("hidden");
    $("#memberEmail").textContent = "Admin: " + user.email;
    await refreshMembers();
    return;
  }

  try {
    const memberSnap = await getDoc(doc(db, "members", user.email.toLowerCase()));
    if (!memberSnap.exists() || memberSnap.data().active !== true) {
      showStatus("ไม่อนุญาตให้เข้าใช้งาน Gmail นี้ไม่ได้อยู่ในรายชื่อสมาชิก");
      await signOut(auth); return;
    }
    showStatus("ยืนยันสมาชิกสำเร็จ");
    $("#memberEmail").textContent = "สมาชิก: " + user.email;
    memberArea.classList.remove("hidden");
  } catch(e) {
    showStatus("ตรวจสอบสิทธิ์ไม่ได้ กรุณาตรวจสอบ Firebase/Rules: " + e.message);
    await signOut(auth);
  }
});
