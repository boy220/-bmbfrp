

const PARSER_URL =
  "https://unpkg.com/app-info-parser@1.1.6/dist/app-info-parser.min.js";

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

  try {
    const AppInfoParser = await loadParser();

    const output = await adb.subprocess.shellProtocol
      .spawnWaitText(`pm path ${packageName}`);

    const paths = String(output)
      .split(/\r?\n/)
      .map(line => line.trim().replace(/^package:/, ""))
      .filter(path => path.endsWith(".apk"));

    if (!paths.length) return null;

    const apkPath =
      paths.find(path => path.endsWith("/base.apk")) || paths[0];

    const chunks = [];

    for await (const chunk of adb.sync.read(apkPath)) {
      chunks.push(chunk);
    }

    const apkBlob = new Blob(chunks, {
      type: "application/vnd.android.package-archive"
    });

    const parser = new AppInfoParser(apkBlob);
    const result = await parser.parse();

    if (!result || !result.icon) return null;

    let icon = result.icon;

    if (typeof icon === "string" &&
        !icon.startsWith("data:image/")) {
      icon = `data:image/png;base64,${icon}`;
    }

    if (typeof icon !== "string") return null;

    iconCache.set(packageName, icon);
    return icon;

  } catch (error) {
    console.warn(
      "ไม่สามารถดึงไอคอน:",
      packageName,
      error
    );

    return null;
  }
}
