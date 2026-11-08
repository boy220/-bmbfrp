
const PARSER_URL =
  "https://cdn.jsdelivr.net/npm/app-info-parser@1.1.6/dist/app-info-parser.min.js";

// Cache ในหน่วยความจำ
const iconCache = new Map();
const pendingIcons = new Map();

// จำกัดจำนวนงานพร้อมกัน
const MAX_CONCURRENT_READS = 3;
let activeReads = 0;
const readQueue = [];

// IndexedDB สำหรับเก็บไอคอนถาวร
let dbPromise = null;

function openIconDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }

    const request = indexedDB.open("ADBAppIconCache", 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("icons")) {
        db.createObjectStore("icons");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });

  return dbPromise;
}

async function getStoredIcon(key) {
  try {
    const db = await openIconDB();
    if (!db) return null;

    return await new Promise((resolve) => {
      const request = db
        .transaction("icons", "readonly")
        .objectStore("icons")
        .get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveStoredIcon(key, icon) {
  try {
    const db = await openIconDB();
    if (!db) return;

    await new Promise((resolve) => {
      const transaction = db.transaction("icons", "readwrite");

      transaction.objectStore("icons").put(icon, key);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    });
  } catch {
    // หากบันทึก Cache ไม่ได้ ยังแสดงไอคอนได้ตามปกติ
  }
}

// ควบคุมจำนวนแอปที่อ่านพร้อมกัน
function runWithLimit(task) {
  return new Promise((resolve, reject) => {
    readQueue.push({ task, resolve, reject });
    processQueue();
  });
}

function processQueue() {
  while (
    activeReads < MAX_CONCURRENT_READS &&
    readQueue.length > 0
  ) {
    const item = readQueue.shift();
    activeReads++;

    Promise.resolve()
      .then(item.task)
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        activeReads--;
        processQueue();
      });
  }
}

// โหลด AppInfoParser
let parserPromise = null;

function loadParser() {
  if (window.AppInfoParser) {
    return Promise.resolve(window.AppInfoParser);
  }

  if (parserPromise) return parserPromise;

  parserPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src = PARSER_URL;
    script.async = true;

    script.onload = () => {
      if (window.AppInfoParser) {
        resolve(window.AppInfoParser);
      } else {
        parserPromise = null;
        reject(new Error("ไม่พบ AppInfoParser"));
      }
    };

    script.onerror = () => {
      parserPromise = null;
      reject(new Error("โหลดตัวอ่าน APK ไม่สำเร็จ"));
    };

    document.head.appendChild(script);
  });

  return parserPromise;
}

// อ่านไอคอนจาก APK
async function readApkIcon(adb, packageName) {
  let sync;

  try {
    const AppInfoParser = await loadParser();

    const shellResult =
      await adb.subprocess.shellProtocol.spawnWaitText(
        `pm path '${packageName}'`
      );

    const output =
      typeof shellResult === "string"
        ? shellResult
        : shellResult?.stdout || "";

    if (
      shellResult?.exitCode !== undefined &&
      shellResult.exitCode !== 0
    ) {
      throw new Error(
        shellResult.stderr || "คำสั่ง pm path ล้มเหลว"
      );
    }

    const paths = String(output)
      .split(/\r?\n/)
      .map(line => line.trim().replace(/^package:/, ""))
      .filter(path => path.endsWith(".apk"));

    if (!paths.length) {
      console.warn("ไม่พบ APK:", packageName);
      return null;
    }

    const apkPath =
      paths.find(path => path.endsWith("/base.apk")) ||
      paths[0];

    // ใช้ชื่อแพ็กเกจและเส้นทาง APK เป็นกุญแจ Cache
    const cacheKey = `${packageName}|${apkPath}`;

    // ตรวจ Cache ถาวรก่อนอ่าน APK
    const storedIcon = await getStoredIcon(cacheKey);

    if (storedIcon) {
      iconCache.set(cacheKey, storedIcon);
      return storedIcon;
    }

    sync = await adb.sync();

    const chunks = [];

    for await (const chunk of sync.read(apkPath)) {
      chunks.push(chunk);
    }

    const apkFile = new File(
      chunks,
      `${packageName}.apk`,
      {
        type: "application/vnd.android.package-archive"
      }
    );

    const parser = new AppInfoParser(apkFile);
    const result = await parser.parse();

    if (!result?.icon) {
      console.warn("APK ไม่มีไอคอน:", packageName);
      return null;
    }

    let icon = result.icon;

    if (typeof icon !== "string") {
      console.warn("รูปแบบไอคอนไม่ถูกต้อง:", packageName);
      return null;
    }

    if (!icon.startsWith("data:image/")) {
      icon = `data:image/png;base64,${icon}`;
    }

    // เก็บใน Cache ทั้งหน่วยความจำและ IndexedDB
    iconCache.set(cacheKey, icon);
    await saveStoredIcon(cacheKey, icon);

    return icon;

  } catch (error) {
    console.warn(
      "ดึงไอคอนไม่สำเร็จ:",
      packageName,
      error
    );

    return null;

  } finally {
    if (sync) {
      try {
        await sync.dispose();
      } catch (error) {
        console.warn("ปิด ADB Sync ไม่สำเร็จ:", error);
      }
    }
  }
}

// ฟังก์ชันหลักที่ main.js เรียกใช้
export async function getAppIcon(adb, packageName) {
  if (!adb || !packageName) return null;

  // ตรวจ Cache ในหน่วยความจำก่อน
  for (const [key, icon] of iconCache) {
    if (key.startsWith(`${packageName}|`)) {
      return icon;
    }
  }

  // ป้องกันการอ่านแพ็กเกจเดียวกันซ้ำพร้อมกัน
  if (pendingIcons.has(packageName)) {
    return pendingIcons.get(packageName);
  }

  const task = runWithLimit(async () => {
    try {
      return await readApkIcon(adb, packageName);
    } catch (error) {
      console.warn("อ่านไอคอนไม่สำเร็จ:", packageName, error);
      return null;
    }
  });

  pendingIcons.set(packageName, task);

  try {
    return await task;
  } finally {
    pendingIcons.delete(packageName);
  }
}
