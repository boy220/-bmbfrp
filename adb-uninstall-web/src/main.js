import { Adb, AdbDaemonTransport } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import "./style.css";

const $ = (id) => document.getElementById(id);
const credentials = new AdbWebCredentialStore("ADBUninstallManager");
let adb = null, selectedBackend = null, packages = [], busy = false;

function log(message, type = "INFO") {
  const time = new Date().toLocaleTimeString();
  $("log").textContent += `\n[${time}] [${type}] ${message}`;
  $("log").scrollTop = $("log").scrollHeight;
}
function setProgress(value, message) {
  $("bar").style.width = `${Math.max(0, Math.min(100, value))}%`;
  $("percent").textContent = `${Math.round(value)}%`;
  $("status").textContent = message;
}
function setConnected(yes, model = "Android device") {
  $("badge").textContent = yes ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ";
  $("badge").className = `badge ${yes ? "on" : "off"}`;
  $("deviceName").textContent = yes ? model : "ยังไม่มีอุปกรณ์";
  $("deviceInfo").textContent = yes ? "ADB Authorized • WebUSB" : "เปิด USB debugging แล้วเชื่อมต่อสาย USB";
  $("connect").disabled = yes; $("disconnect").disabled = !yes;
  $("refresh").disabled = !yes; $("search").disabled = !yes; $("system").disabled = !yes;
}
function decodeOutput(value) {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  if (value instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(value));
  return String(value ?? "");
}
async function runShell(command) {
  if (!adb) throw new Error("ยังไม่ได้เชื่อมต่ออุปกรณ์");

  // Tango ADB 2.x ไม่มี adb.subprocess.spawnAndWait()
  // ใช้ Shell Protocol API ที่ถูกต้อง และ fallback เป็น None Protocol
  // สำหรับอุปกรณ์ที่ไม่รองรับ Shell Protocol
  const shellProtocol = adb.subprocess.shellProtocol;
  if (shellProtocol && typeof shellProtocol.spawnWaitText === "function") {
    const result = await shellProtocol.spawnWaitText(command);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `คำสั่งจบด้วย exit code ${result.exitCode}`);
    }
    return result.stdout || "";
  }

  const noneProtocol = adb.subprocess.noneProtocol;
  if (noneProtocol && typeof noneProtocol.spawnWaitText === "function") {
    return await noneProtocol.spawnWaitText(command);
  }

  throw new Error("ไม่พบ ADB Subprocess API ที่รองรับ กรุณาตรวจสอบเวอร์ชันแพ็กเกจ");
}
function updateSelection() {
  const q = $("search").value.trim().toLowerCase();
  const visible = packages.filter(p => p.name.toLowerCase().includes(q));
  const n = packages.filter(p => p.selected).length;
  $("selected").textContent = `เลือก ${n}`;
  $("uninstall").disabled = !adb || !n || busy;
  $("clear").disabled = !n || busy;
  $("selectAll").disabled = !visible.length;
  $("selectAll").checked = visible.length > 0 && visible.every(p => p.selected);
}
function render() {
  const q = $("search").value.trim().toLowerCase();
  const visible = packages.filter(p => p.name.toLowerCase().includes(q));
  const list = $("list"); list.replaceChildren(); list.className = "app-list";
  if (!visible.length) { list.className = "app-list empty"; list.textContent = "ไม่พบรายการแอป"; }
  for (const p of visible) {
    const row = document.createElement("label"); row.className = "app-item";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = p.selected;
    cb.addEventListener("change", () => { p.selected = cb.checked; updateSelection(); });
    const name = document.createElement("span"); name.className = "pkg"; name.textContent = p.name;
    row.append(cb, name);
    if (p.system) { const tag = document.createElement("span"); tag.className = "system"; tag.textContent = "SYSTEM"; row.append(tag); }
    list.append(row);
  }
  $("count").textContent = `${packages.length} แอป`; updateSelection();
}
async function loadPackages() {
  if (!adb || busy) return;
  try {
    setProgress(10, "กำลังอ่านรายการแอป...");
    const command = $("system").checked ? "pm list packages" : "pm list packages -3";
    const output = await runShell(command);
    const names = output.split(/\r?\n/).map(x => x.trim().replace(/^package:/, ""))
      .filter(x => /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/.test(x));
    const previous = new Map(packages.map(p => [p.name, p.selected]));
    packages = [...new Set(names)].sort().map(name => ({ name, selected: previous.get(name) || false, system: $("system").checked }));
    render(); setProgress(100, `โหลดสำเร็จ ${packages.length} แอป`);
    log(`อ่านรายการแอปสำเร็จ ${packages.length} รายการ`, "OK");
  } catch (error) { setProgress(0, "อ่านรายการแอปไม่สำเร็จ"); log(error.message, "ERROR"); }
}

$("connect").addEventListener("click", async () => {
  if (!window.isSecureContext || !navigator.usb) {
    log("WebUSB ใช้ไม่ได้ในหน้านี้ ต้องเปิด http://localhost หรือ HTTPS ด้วย Chrome/Edge", "ERROR"); return;
  }
  if (!AdbDaemonWebUsbDeviceManager.BROWSER) {
    log("เบราว์เซอร์ไม่รองรับ WebUSB", "ERROR"); return;
  }
  $("connect").disabled = true;
  try {
    log("เปิดหน้าต่างเลือกอุปกรณ์ USB...");
    selectedBackend = await AdbDaemonWebUsbDeviceManager.BROWSER.requestDevice();
    if (!selectedBackend) { $("connect").disabled = false; log("ยกเลิกการเลือกอุปกรณ์"); return; }
    log("กำลังเปิด USB connection...");
    const connection = await selectedBackend.connect();
    log("กำลังทำ ADB authentication — โปรดดูหน้าจอ Samsung และกด Allow หากมีคำถาม");
    const transport = await AdbDaemonTransport.authenticate({
      serial: selectedBackend.serial, connection, credentialStore: credentials
    });
    adb = new Adb(transport);
    const model = await runShell("getprop ro.product.model");
    setConnected(true, model.trim() || "Samsung Android");
    log(`ADB authentication สำเร็จ: ${model.trim() || selectedBackend.serial}`, "OK");
    await loadPackages();
  } catch (error) {
    adb = null; selectedBackend = null; setConnected(false); $("connect").disabled = false;
    const message = error?.message || String(error);
    log(`เชื่อมต่อไม่สำเร็จ: ${message}`, "ERROR");
    if (/claim interface|already open|in progress/i.test(message)) {
      log("USB interface ยังถูกโปรแกรม/แท็บอื่นจับอยู่: ปิด Android Studio, Smart Switch, scrcpy, แท็บ WebADB อื่น และ adb server จากนั้นถอด-เสียบสายใหม่", "HELP");
    }
    if (/access denied|permission/i.test(message)) log("ตรวจสอบไดรเวอร์ Samsung USB, โหมด USB File transfer และลองเปลี่ยนพอร์ต/สาย", "HELP");
  }
});
$("disconnect").addEventListener("click", async () => {
  try { if (adb?.close) await adb.close(); else if (selectedBackend?.disconnect) await selectedBackend.disconnect(); } catch {}
  adb = null; selectedBackend = null; packages = []; setConnected(false); render();
  setProgress(0, "ตัดการเชื่อมต่อแล้ว"); log("ตัดการเชื่อมต่อแล้ว");
});
$("refresh").addEventListener("click", loadPackages);
$("system").addEventListener("change", loadPackages);
$("search").addEventListener("input", render);
$("selectAll").addEventListener("change", e => {
  const q = $("search").value.trim().toLowerCase();
  packages.filter(p => p.name.toLowerCase().includes(q)).forEach(p => p.selected = e.target.checked); render();
});
$("clear").addEventListener("click", () => { packages.forEach(p => p.selected = false); render(); });
$("clearLog").addEventListener("click", () => { $("log").textContent = "[INFO] ล้าง LOG แล้ว"; });
$("uninstall").addEventListener("click", async () => {
  const targets = packages.filter(p => p.selected);
  if (!targets.length || busy) return;
  if (!confirm(`ยืนยันถอน ${targets.length} แอป?\nคำสั่งจะถอนสำหรับผู้ใช้ Android ปัจจุบัน (user 0)`)) return;
  busy = true; updateSelection(); let done = 0, success = 0, failed = 0;
  for (const p of targets) {
    setProgress(done / targets.length * 100, `กำลังถอน ${p.name} (${done + 1}/${targets.length})`);
    log(`เริ่มถอน ${p.name}`);
    try {
      // Strict package-name validation prevents shell metacharacters entering the command.
      if (!/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/.test(p.name)) throw new Error("รูปแบบ Package Name ไม่ถูกต้อง");
      const output = await runShell(`pm uninstall --user 0 ${p.name}`);
      if (/Success/i.test(output)) { success++; packages = packages.filter(x => x.name !== p.name); log(`ถอนสำเร็จ ${p.name}`, "OK"); }
      else { failed++; log(`ถอนล้มเหลว ${p.name}: ${output.trim()}`, "ERROR"); }
    } catch (error) { failed++; log(`${p.name}: ${error.message}`, "ERROR"); }
    done++; render(); setProgress(done / targets.length * 100, `ดำเนินการ ${done}/${targets.length} • สำเร็จ ${success} • ล้มเหลว ${failed}`);
  }
  busy = false; render(); setProgress(100, `เสร็จแล้ว • สำเร็จ ${success} • ล้มเหลว ${failed}`);
  log(`สรุป: สำเร็จ ${success}, ล้มเหลว ${failed}`);
});
