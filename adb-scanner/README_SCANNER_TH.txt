ADB Uninstall Manager + ScannerForm.vb integration

เพิ่มปุ่มสแกนตามตรรกะหลักใน ScannerForm.vb:
- สแกนแอปทั้งหมด (pm list packages -3 หรือรวม system)
- ตรวจสอบ Overlay ด้วย dumpsys package และ appops get SYSTEM_ALERT_WINDOW
- Malware/Trojan heuristic: ชื่อแพ็กเกจและ permission indicators
- เทียบ watchlist targetPackages ที่ฝังมาจาก ScannerForm.vb
- สแกนพิเศษ JSON + heuristic โดยเลือกไฟล์ฐานข้อมูล JSON จากเครื่อง

รูปแบบ JSON ที่รองรับ:
{
  "packages": [
    {"packageName":"com.example.app","appName":"Example","category":"MALWARE","riskLevel":"HIGH_SUSPICIOUS","source":"...","evidence":"..."}
  ],
  "allowlist": ["com.example.allowed"]
}

ความปลอดภัย: เว็บรุ่นนี้จะไม่ถอนแอปโดยอัตโนมัติระหว่างสแกน แม้ JSON ระบุ CONFIRMED_MALWARE/TROJAN; จะทำเครื่องหมายให้ตรวจสอบและให้ผู้ใช้เลือกและยืนยันเองก่อนถอน เพื่อป้องกันการลบผิดพลาด. Heuristic/permission ที่พบเป็นสัญญาณคัดกรอง ไม่ใช่ข้อพิสูจน์ว่าเป็นมัลแวร์.

วิธีเปิด: npm install แล้ว npm run dev หรือดับเบิลคลิกไฟล์ START_ADB_Uninstall_Web_Fixed.bat (ต้องติดตั้ง Node.js LTS ก่อน).

ปุ่มและสีผลตรวจในรุ่น V5:
- ตรวจสอบ Overlay SYSTEM_ALERT_WINDOW: สีเหลืองเมื่อพบสิทธิ์และ AppOps เป็น allow/foreground; สีเขียวเข้มสำหรับ allowlist
- Malware / Trojan: สีม่วงอ่อนสำหรับรายการที่เข้าเงื่อนไข heuristic ตาม ScannerForm.vb
- ตรวจฐานข้อมูล Package 1: สีส้มเข้มเมื่อพบ package ตรงกับ targetPackages จำนวน 677 รายการ
- สแกนพิเศษ JSON + Heuristic: รวมผลฐานข้อมูล JSON และ heuristic ในรอบเดียว
- SPECIAL KEYWORD SCAN: ตรวจเฉพาะ package ที่ตรงกับไฟล์ JSON ที่เลือก โดยใช้สีตาม category/riskLevel

การถอนแอปยังคงเป็นขั้นตอนแยก: เลือกแถวแล้วกดถอนแอปที่เลือก พร้อมยืนยันอีกครั้ง ไม่มีการถอนอัตโนมัติระหว่างสแกน.


V6 แก้ไขการแสดงแถบสีผลสแกน: กำหนด data-scan-level ให้แต่ละแถวโดยตรง และใช้ CSS selector ที่เจาะจงพร้อม !important เพื่อให้สีพื้นหลังและแถบด้านซ้ายแสดงชัดเจนในตารางรายการแอป

V8 ตาม ScannerForm.vb:
- แอปธนาคารและโซเชียลที่ชื่อ package ตรงกับ bankTokens/socialTokens ใน ClassifyPackage จะใช้แถบสีเขียว (ทั้ง SCAN APPS และผล Overlay ที่ไม่พบสิทธิ์ Overlay)
- เพิ่มคำค้นธนาคารภาษาไทย และ x.android / pinterest ให้ตรงกับ ScannerForm.vb
- SPECIAL KEYWORD SCAN โหลด BMB_Package_Threat_Database.json อัตโนมัติจากโฟลเดอร์เดียวกับ index.html ไม่ต้องกดอัปโหลดไฟล์
- allowlist ถูกโหลดจาก JSON อัตโนมัติด้วย
- ต้องวางไฟล์ BMB_Package_Threat_Database.json ไว้ที่ ADB_Uninstall_Web_Fixed/BMB_Package_Threat_Database.json ก่อนเปิดเว็บ
- ไฟล์ JSON ต้นฉบับไม่ได้อยู่ในไฟล์ ScannerForm.vb หรือ ZIP V7 ที่ได้รับ จึงไม่ได้สร้างฐานข้อมูลปลอมขึ้นมาให้; หากไม่มีไฟล์จริง ระบบจะแจ้งว่าไม่พบและไม่ทำการสแกน JSON


V9 - เงื่อนไข SCAN + REMOVE RISK APPS ตามคำขอ:
- ปุ่มนี้จะตรวจ OVERLAY, AUTO REVIEW, MALWARE/TROJAN, OUTSIDE SYSTEM, PACKAGE DATABASE 1, JSON ทุกระเบียนที่โหลดได้ และ CLEANER/BOOSTER
- ถอนอัตโนมัติเฉพาะแพ็กเกจที่ตรงกับ JSON, PACKAGE DATABASE 1 หรือ CLEANER/BOOSTER ตาม SUSPICIOUS_PATTERNS ในโค้ด
- Heuristic/permission ใช้ประกอบการประเมินและแสดง [HEURISTIC - REVIEW ONLY] เท่านั้น ไม่ถูกเพิ่มเข้าคิวถอน
- OUTSIDE SYSTEM และ OVERLAY เป็นข้อมูลประกอบ ไม่ใช่เงื่อนไขถอนโดยลำพัง
- ไม่แสดงหน้าต่างยืนยันซ้ำเมื่อกด SCAN + REMOVE RISK APPS; การกดปุ่มนี้ถือเป็นคำสั่งให้เริ่มถอนรายการที่เข้าเงื่อนไข
- แพ็กเกจใน allowlist และกลุ่มสีเขียวที่ระบบจำแนกเป็นธนาคาร/โซเชียลจะถูกข้าม ไม่ถอน แม้มีสัญญาณจากกลุ่มอัตโนมัติ
- ปุ่ม UNINSTALL SELECTED ปกติยังคงถามยืนยันก่อนถอน
- ถ้าไม่มีไฟล์ BMB_Package_Threat_Database.json จะข้ามเฉพาะการตรวจ JSON และยังตรวจ Package Database 1 / Cleaner-Booster ต่อได้

คำเตือน: การถอนด้วย ADB อาจทำให้แอปหรือฟังก์ชันที่ต้องการใช้งานหายไป ควรสำรองข้อมูลก่อนใช้
