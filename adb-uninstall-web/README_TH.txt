ADB UNINSTALL MANAGER — รุ่นแก้ไข WebADB
========================================
รุ่นนี้เปลี่ยนจาก webadb.js รุ่นเก่าที่ถูก archive ไปใช้ Tango / ya-webadb packages ของ yume-chan:
- @yume-chan/adb
- @yume-chan/adb-credential-web
- @yume-chan/adb-daemon-webusb

ติดตั้งและเปิดบน Windows:
1) ติดตั้ง Node.js รุ่น LTS (18 ขึ้นไป)
2) แตก ZIP
3) เปิด CMD ในโฟลเดอร์ ADB_Uninstall_Web_Fixed
4) รัน: npm install
5) รัน: npm run dev
6) เปิด URL ที่แสดง (ปกติ http://127.0.0.1:5173) ด้วย Chrome
7) มือถือ Samsung: Settings > Developer options > USB debugging = ON
8) ต่อสายข้อมูล, ปลดล็อกมือถือ, เลือก USB mode เป็น File transfer หากมีตัวเลือก
9) กด Connect ในหน้าเว็บ, เลือกอุปกรณ์ใน Chrome USB picker และกด Allow บนมือถือ

แก้ปัญหา Samsung / Unable to claim interface:
- ปิด Samsung Smart Switch, Android Studio, scrcpy, โปรแกรมจัดการมือถือ และ WebADB tab อื่น
- ถ้ามี Android Platform Tools ให้เปิด CMD แล้วรัน adb kill-server
- ปิดแท็บเว็บทั้งหมดที่เคยขอสิทธิ์อุปกรณ์ แล้วถอด/เสียบ USB ใหม่
- ลองพอร์ต USB อื่นหรือสายที่รองรับข้อมูล
- หากยังพบ Access denied ให้ตรวจสอบ Samsung USB driver และ USB mode

ข้อสำคัญ:
- ต้องเปิดผ่าน localhost หรือ HTTPS; ห้ามดับเบิลคลิก index.html
- ใช้ Chrome/Edge บน Windows desktop
- ต้องมีอินเทอร์เน็ตครั้งแรกเพื่อ npm install
- ADB ทำงานในเบราว์เซอร์; ไม่ใช้ server กลาง
- ถอนแอปด้วย pm uninstall --user 0 ซึ่งถอนเฉพาะ user ปัจจุบัน; แอประบบอาจกลับมาได้หลัง factory reset/OTA
- อย่าถอนแพ็กเกจระบบที่ไม่รู้จัก


บันทึกการแก้ไขรุ่นนี้:
- แก้การเรียก adb.subprocess.spawnAndWait ที่ไม่มีใน Tango ADB 2.x
- ใช้ adb.subprocess.shellProtocol.spawnWaitText และ fallback ไป noneProtocol.spawnWaitText
- หากอุปกรณ์ไม่รองรับ Shell Protocol จะลองใช้ None Protocol แทน


หากต้องการเปิดเป็นเว็บไซต์ออนไลน์โดยไม่ใช้ CMD ทุกครั้ง ให้อ่านไฟล์ README_NETLIFY_TH.txt และใช้ netlify.toml ที่แนบมา
