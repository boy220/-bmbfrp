
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

export async function getAppIcon(adb, packageName) {
  if (iconCache.has(packageName)) {
    return iconCache.get(packageName);
  }

  let sync;

  try {
    const AppInfoParser = await loadParser();

    const shellResult = await adb.subprocess.shellProtocol
      .spawnWaitText(`pm path '${packageName}'`);

    // อ่าน stdout จากผลลัพธ์ ADB
    const output = typeof shellResult === "string"
      ? shellResult
      : shellResult?.stdout || "";

    if (shellResult?.exitCode !== undefined &&
        shellResult.exitCode !== 0) {
      throw new Error(shellResult.stderr || "คำสั่ง pm path ล้มเหลว");
    }

    const paths = String(output)
      .split(/\r?\n/)
      .map(line => line.trim().replace(/^package:/, ""))
      .filter(path => path.endsWith(".apk"));

    if (!paths.length) {
      console.warn("ไม่พบเส้นทาง APK:", packageName, shellResult);
      return null;
    }

    const apkPath =
      paths.find(path => path.endsWith("/base.apk")) || paths[0];

    // เปิดบริการ ADB Sync
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

    if (!result?.icon) {
      console.warn("APK ไม่มีข้อมูลไอคอน:", packageName);
      return null;
    }

    let icon = result.icon;

    if (typeof icon !== "string") return null;

    if (!icon.startsWith("data:image/")) {
      icon = `data:image/png;base64,${icon}`;
    }

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
