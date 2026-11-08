
const PARSER_URL =
  "https://cdn.jsdelivr.net/npm/app-info-parser@1.1.6/dist/app-info-parser.min.js";

let parserPromise = null;
const iconCache = new Map();

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
        reject(new Error("ไม่พบตัวอ่าน APK"));
      }
    };

    script.onerror = () => {
      parserPromise = null;
      reject(new Error("โหลดตัวอ่าน APK จาก CDN ไม่สำเร็จ"));
    };

    document.head.appendChild(script);
  });

  return parserPromise;
}

export async function getAppIcon(adb, packageName) {
  if (iconCache.has(packageName)) {
    return iconCache.get(packageName);
  }

  let sync;

  try {
    const AppInfoParser = await loadParser();

    const output = await adb.subprocess.shellProtocol
      .spawnWaitText(`pm path ${packageName}`);

    const paths = String(output)
      .split(/\r?\n/)
      .map(line => line.trim().replace(/^package:/, ""))
      .filter(path => path.endsWith(".apk"));

    if (!paths.length) {
      console.warn("ไม่พบไฟล์ APK:", packageName);
      return null;
    }

    const apkPath =
      paths.find(path => path.endsWith("/base.apk")) || paths[0];

    // เปิด ADB Sync ให้ถูกต้องก่อนอ่านไฟล์
    sync = await adb.sync();

    const chunks = [];

    for await (const chunk of sync.read(apkPath)) {
      chunks.push(chunk);
    }

    const apkBlob = new Blob(chunks, {
      type: "application/vnd.android.package-archive"
    });

    const parser = new AppInfoParser(apkBlob);
    const result = await parser.parse();

    if (!result || !result.icon) {
      console.warn("ไม่พบไอคอนใน APK:", packageName);
      return null;
    }

    let icon = result.icon;

    if (
      typeof icon === "string" &&
      !icon.startsWith("data:image/")
    ) {
      icon = `data:image/png;base64,${icon}`;
    }

    if (typeof icon !== "string") return null;

    iconCache.set(packageName, icon);
    return icon;

  } catch (error) {
    console.warn("ดึงไอคอนไม่สำเร็จ:", packageName, error);
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
