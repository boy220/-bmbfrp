# BMB Virus Scanner — Web Edition (Preview 0.1)

เว็บไซต์ต้นแบบแบบ Static สำหรับเผยแพร่บน GitHub Pages

## สิ่งที่ทำงานได้ในรุ่นนี้
- Cyber Security Dashboard แบบ Responsive
- เลือก/ลากไฟล์หลายไฟล์เพื่อวิเคราะห์ในเบราว์เซอร์
- คำนวณ SHA-256 ด้วย Web Crypto API
- ตรวจสอบชนิดไฟล์จาก magic bytes เบื้องต้น
- แสดงคำเตือนจากนามสกุล/ลักษณะไฟล์ที่ควรตรวจสอบ
- ค้นหา Android package name จาก `data/BMB_Package_Threat_Database.json`
- Live activity log, session history และ export JSON report
- ไฟล์ที่เลือกจะไม่ถูกอัปโหลดไปยังเซิร์ฟเวอร์ในรุ่นนี้

## ข้อจำกัดด้านความปลอดภัย (สำคัญ)
รุ่นนี้เป็น **file triage / prototype ไม่ใช่ Antivirus Engine** ไม่มีการสแกน signature malware จริง, ไม่มีการตรวจพฤติกรรม, ไม่มีการแตก APK เพื่ออ่าน manifest/dex และไม่สามารถยืนยันว่าไฟล์สะอาดได้ การไม่พบ indicator ไม่ได้แปลว่าปลอดภัย

Package database เป็น advisory list ตามข้อมูลเดิมของ BMB เท่านั้น การพบชื่อ package ไม่ใช่หลักฐานว่าแอปทุกเวอร์ชันเป็นมัลแวร์

## วิธีทดสอบในเครื่อง
แนะนำเปิดผ่าน local web server หรือ HTTPS เพื่อให้ `crypto.subtle` ทำงาน:

```bash
python -m http.server 8000
```

จากนั้นเปิด `http://localhost:8000/BMB_Web_Edition/` หากสั่งจากโฟลเดอร์ที่มี `BMB_Web_Edition` อยู่

## วิธีนำขึ้น GitHub Pages
1. สำรอง repository เดิมก่อนแก้ไข
2. แตก ZIP นี้ในเครื่อง
3. อัปโหลดเนื้อหาภายในโฟลเดอร์ `BMB_Web_Edition` ไปยัง repository ที่ต้องการ (แนะนำสร้าง branch ใหม่ เช่น `bmb-web-preview` ก่อน)
4. ถ้าจะเผยแพร่ใน URL เดิม `https://boy220.github.io/-bmbfrp/` ให้วาง `index.html`, `assets/`, `js/`, `data/` ที่ root ของ repository เดิม โดยสำรองไฟล์เดิมไว้ก่อน
5. ตรวจสอบ Settings → Pages ให้เลือก branch/folder ที่ถูกต้อง
6. รอ deployment แล้วเปิด URL ทดสอบ

GitHub Pages เป็น static hosting จึงรัน VB.NET/ASP.NET Core ไม่ได้ หากต้องการ antivirus scanning จริงในอนาคต ต้องเพิ่ม backend/API บน VPS หรือ cloud service และส่งไฟล์ผ่าน HTTPS ไปยังระบบวิเคราะห์ที่แยกสิทธิ์/จำกัดขนาดไฟล์อย่างปลอดภัย

## โครงสร้าง
- `index.html` — หน้าเว็บ
- `assets/style.css` — ธีมและ responsive layout
- `js/app.js` — file triage, hash, lookup, log, report
- `data/BMB_Package_Threat_Database.json` — ฐานข้อมูล package advisory จากโปรเจกต์เดิม
