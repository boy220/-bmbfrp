# BMB Virus Scanner — Web Edition (Preview 0.3)

เว็บไซต์ Static สำหรับ GitHub Pages โดยต่อยอดจากรุ่น 0.2 และคงโครงสร้างภายใน `BMB_Web_Edition` เพื่อไม่กระทบหน้าเว็บหลักของ repository

## ความสามารถในรุ่น 0.3
- เลือกหรือลากไฟล์หลายไฟล์ได้สูงสุด 30 ไฟล์ต่อชุด
- วิเคราะห์ไฟล์ใน browser พร้อม progress, SHA-256 (สูงสุด 100 MB), file signature, extension, MIME และ Shannon entropy จาก sample สูงสุด 64 KB
- Package Threat Lookup จาก `data/BMB_Package_Threat_Database.json`
- **Scan History:** บันทึกประวัติสูงสุด 200 รายการใน localStorage ของ browser และส่งออกเป็น JSON ได้
- **Quarantine Manager:** เพิ่มสำเนาไฟล์เข้า logical quarantine ใน IndexedDB, export สำเนากลับออกมา หรือเอาสำเนาออกจากพื้นที่ quarantine
- โหลดฐานข้อมูลด้วย URL แบบ relative ที่อิง `document.baseURI` และแสดงสาเหตุเมื่อโหลดไม่ได้
- ไม่มีการอัปโหลดไฟล์ไปยัง server

## คำเตือนเกี่ยวกับ Quarantine
Quarantine ในรุ่นนี้เป็น **Logical Quarantine** เท่านั้น: ระบบเก็บสำเนาไฟล์ไว้ใน IndexedDB ของ browser ไม่ได้ย้ายไฟล์ต้นฉบับออกจาก Windows, ไม่ได้ป้องกันโปรแกรมอื่นเข้าถึงไฟล์ต้นฉบับ และไม่ใช่ secure OS-level quarantine การลบรายการ quarantine ลบเฉพาะสำเนาใน browser เท่านั้น ข้อมูลอาจหายได้เมื่อ browser ล้าง site data หรือพื้นที่จัดเก็บเต็ม โปรดอย่าเปิดไฟล์ที่น่าสงสัยจาก quarantine

## ข้อจำกัดด้านการตรวจจับ
นี่เป็น **static file triage tool ไม่ใช่ antivirus engine** ไม่มี malware signature database, behavioral analysis, sandbox, cloud reputation, APK manifest/DEX inspection หรือ recursive archive scanning ค่า entropy สูงอาจเกิดจากไฟล์บีบอัดหรือเข้ารหัสตามปกติ การไม่พบ indicator ไม่ได้แปลว่าปลอดภัย และ indicator ไม่ใช่หลักฐานยืนยันว่าเป็นมัลแวร์

## ทดสอบในเครื่อง (สำคัญ)
อย่าเปิด `index.html` ด้วยการดับเบิลคลิก (`file://`) เพราะ browser จะบล็อกการ fetch ฐานข้อมูล JSON ในหลายกรณี ให้เปิด local server แทน:

```bash
cd <โฟลเดอร์ที่มี BMB_Web_Edition>
python -m http.server 8000
```

จากนั้นเปิด `http://localhost:8000/BMB_Web_Edition/` หากเปิดจากโฟลเดอร์แม่ หรือ `http://localhost:8000/` หากสั่ง server จากในโฟลเดอร์ `BMB_Web_Edition` โดยตรง

## อัปเดต GitHub Pages แบบปลอดภัย
1. สำรอง repository เดิมก่อน
2. แตก ZIP รุ่น 0.3
3. อัปโหลดไฟล์ **ภายใน** โฟลเดอร์ `BMB_Web_Edition` ไปทับเฉพาะโฟลเดอร์ `BMB_Web_Edition` ใน repository
4. อย่าแก้หรือลบ `index.html` ที่ root ของ repository เพราะเป็นหน้า BMB UnlockTool เดิม
5. Commit changes แล้วรอ GitHub Pages deploy
6. เปิด `https://boy220.github.io/-bmbfrp/BMB_Web_Edition/` แล้วกด Ctrl+F5

GitHub Pages เป็น static hosting จึงรัน VB.NET/ASP.NET Core ไม่ได้ หากต้องการตรวจมัลแวร์จริง ต้องเชื่อมต่อ backend ที่มี engine, sandbox และแหล่ง threat intelligence ที่เชื่อถือได้ ผ่าน API ที่ออกแบบความปลอดภัยอย่างเหมาะสม
