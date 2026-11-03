ADB Uninstall Manager — เตรียมขึ้น Netlify

จุดประสงค์
- เปิดใช้งานผ่าน URL HTTPS บน Netlify
- ไม่ต้องเปิด CMD หรือเปิด Vite ค้างไว้ทุกครั้ง
- เว็บทำงานในเบราว์เซอร์ของคอมพิวเตอร์ และเชื่อมมือถือผ่าน WebUSB
- ไม่มีการส่งคำสั่ง ADB ผ่านเซิร์ฟเวอร์ Netlify

วิธีเผยแพร่ (แนะนำ: GitHub + Netlify)
1. แตกไฟล์ ZIP นี้
2. เข้า https://github.com แล้วเข้าสู่ระบบ
3. กด New repository ตั้งชื่อ เช่น adb-uninstall-web แล้วสร้างเป็น Public หรือ Private ก็ได้
4. ในหน้า repository เลือก Add file > Upload files
5. อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดจากในโฟลเดอร์ ADB_Uninstall_Web_Netlify
   (ต้องเห็น package.json, netlify.toml, index.html และโฟลเดอร์ src อยู่ที่ root ของ repository)
6. กด Commit changes
7. เข้า https://app.netlify.com แล้วเข้าสู่ระบบ
8. เลือก Add new project > Import an existing project
9. เลือก GitHub และอนุญาตการเชื่อมต่อ จากนั้นเลือก repository adb-uninstall-web
10. ตรวจค่าการ build:
    Build command: npm run build
    Publish directory: dist
11. กด Deploy
12. เมื่อ Deploy สำเร็จ Netlify จะแสดง URL เช่น https://ชื่อเว็บของคุณ.netlify.app

การใช้งานครั้งต่อไป
- เปิด URL Netlify เดิมใน Chrome หรือ Edge บน Windows
- ไม่ต้องเปิด CMD และไม่ต้องเปิดโปรแกรม Vite
- เสียบมือถือ Samsung ด้วยสาย USB และปลดล็อกหน้าจอ
- เปิด Developer options และ USB debugging
- กดเชื่อมต่ออุปกรณ์บนเว็บ แล้วเลือกมือถือในหน้าต่าง USB
- ยืนยัน Allow USB debugging บนมือถือ

ข้อกำหนดสำคัญ
- ใช้ Chrome หรือ Microsoft Edge รุ่นปัจจุบันบนคอมพิวเตอร์
- ต้องเป็น HTTPS (Netlify ให้ HTTPS อัตโนมัติ)
- ต้องอนุญาต USB ในหน้าต่างเลือกอุปกรณ์ของเบราว์เซอร์
- หากมีหน้าต่างหรือโปรแกรมอื่นจับ ADB/USB อยู่ ให้ปิดก่อนเชื่อมต่อ
- การถอนใช้คำสั่ง pm uninstall --user 0 จึงเป็นการถอนสำหรับผู้ใช้ Android ปัจจุบัน
- อย่าถอนแอประบบที่ไม่ทราบหน้าที่ เพราะอาจทำให้เครื่องทำงานผิดปกติ

การอัปเดตเว็บ
- แก้ไฟล์ใน GitHub แล้ว Commit changes
- Netlify จะ build และเผยแพร่เวอร์ชันใหม่ให้อัตโนมัติ

หมายเหตุ
- โปรเจกต์นี้ใช้ WebUSB จึงต้องเปิด URL บนคอมพิวเตอร์ที่เสียบมือถืออยู่
- เปิด URL จากคอมพิวเตอร์เครื่องอื่นได้ แต่ต้องเสียบมือถือกับเครื่องนั้นและอนุญาต USB ใหม่
- ยังต้องตรวจสอบการ Deploy จริงในบัญชี Netlify ของคุณ เพราะผู้ช่วยไม่สามารถเข้าสู่บัญชีหรือกดเผยแพร่แทนได้
