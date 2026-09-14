> เอกสารนี้แปลจากต้นฉบับภาษาญี่ปุ่น `capture-tasks.md` หากเนื้อหาไม่ตรงกัน ให้ถือต้นฉบับภาษาญี่ปุ่นเป็นหลัก

## ขอบเขตการพัฒนา

- `/` … หน้าหลัก (มีเพียงปุ่มถ่ายภาพ) = route แยกอิสระ
- `/capture` … จัดการ ถ่ายภาพ → ครอบตัด → ยืนยัน ภายใน route เดียว

## ไลบรารีสำหรับแต่ละการใช้งาน

| การใช้งาน | ไลบรารี | หมายเหตุ |
| --- | --- | --- |
| ถ่ายภาพ | `<input capture>` มาตรฐานของเบราว์เซอร์ | คอมโพเนนต์ที่เกี่ยวกับกล้องทั้งหมดเป็น `"use client"` ส่วน `react-easy-crop` อ้างอิง `window` จึงโหลดด้วย `next/dynamic` + `ssr: false` ตามความจำเป็น |
| ครอบตัด | `react-cropper` | |
| บีบอัด・ปรับขนาดรูปภาพ | `browser-image-compression` | |
| จัดการสถานะระหว่างขั้นตอน | `zustand` | |
| หลายภาษา (อังกฤษ/ไทย/ญี่ปุ่น) | `i18next & react-i18next` | พัฒนาแล้ว (`web/i18n.ts`) เนื่องจากรองรับ 3 ภาษา อังกฤษ/ไทย/ญี่ปุ่น จึงรวม routing ไว้ใต้ `[lang]` |
| ไอคอน | `lucide-react` | |
| แปลง HEIC (รองรับ iOS) | `heic2any` | |

## ข้อสมมติฐาน・ปัญหาที่ทราบแล้ว

- repository เป็น monorepo ประกอบด้วย `web` (Next.js 16.3.3 / React 19) และ `ai` (FastAPI, `POST /documents` สำหรับนำเข้าข้อมูลด้วย OCR) **ครั้งนี้การเชื่อมต่อกับ AI backend อยู่นอกขอบเขต (เฉพาะฝั่ง frontend)** เพื่อเตรียมจุดเชื่อมต่อในอนาคต ให้แยกการประมวลผลการยืนยันออกเป็นฟังก์ชันเดียวชื่อ `submitPhoto(finalImage)`
- `web/app/[lang]/layout.tsx` และ `page.tsx` เตรียมไว้เป็นไฟล์ว่างแล้ว **รวม routing ไว้ใต้ `[lang]`** (ใช้ `/[lang]`, `/[lang]/capture` แทน `/`, `/capture`)
- `web/i18n.ts` มีบั๊กอยู่เดิม: เขียนว่า `th: { common: jaCommon }` ทำให้ locale ภาษาไทยโหลดทรัพยากรภาษาญี่ปุ่น (ที่ถูกต้องคือ `thCommon`) เนื่องจากจะใช้ `[lang]=th` จริง จึงแก้ไข 1 บรรทัดนี้ตอนพัฒนา
- Next.js เวอร์ชันนี้มีการเปลี่ยนแปลงที่ไม่เข้ากันกับเวอร์ชันเดิม (breaking changes) ซึ่งต่างจากข้อมูลที่ใช้ฝึก (ให้ตรวจสอบ `node_modules/next/dist/docs` ตามคำแนะนำใน `web/AGENTS.md`) โดยเฉพาะ **`middleware.ts` ถูกยกเลิกใน Next.js 16 และแทนที่ด้วย `proxy.ts` (`export function proxy(request: NextRequest)`)** ตอนพัฒนาให้ใช้ชื่อและ signature นี้
- `react-cropper` / `browser-image-compression` / `zustand` / `lucide-react` / `heic2any` ยังไม่ได้เพิ่มใน package.json

## 1. ขอบเขต / โครงสร้าง routing

| route | บทบาท |
| --- | --- |
| `web/proxy.ts` | ตัดสิน locale เมื่อเข้าถึง (`Accept-Language` ฯลฯ) และ redirect `/` ไปยัง `/{lang}` ยกเว้น static asset・`_next` ฯลฯ ด้วย matcher |
| `web/app/[lang]/layout.tsx` | ตรวจสอบว่าพารามิเตอร์ `lang` เป็น `en/ja/th` อย่างใดอย่างหนึ่ง (ค่าไม่ถูกต้องใช้ `notFound()`) และครอบด้วย Provider ฝั่ง client ที่เรียก `changeLanguage(lang)` ของ i18next |
| `web/app/[lang]/page.tsx` | หน้าหลัก route แยกอิสระที่แสดงเพียงปุ่มถ่ายภาพ |
| `web/app/[lang]/capture/page.tsx` | orchestrator ที่จัดการ ถ่ายภาพ → ครอบตัด → ยืนยัน เป็นการเปลี่ยนสถานะภายใน route เดียว (`"use client"`) |
| `web/app/page.tsx` (มีอยู่เดิม) | ลดให้เหลือน้อยที่สุดเพื่อใช้เป็น fallback เพียงแค่ส่งต่อไปยัง locale เริ่มต้นด้วย `redirect()` |

### การจัดการสถานะ

สร้าง store เฉพาะด้วย `zustand` เพื่อจัดการข้อมูลต่อไปนี้ (ตัวอย่าง `web/lib/store/useCaptureStore.ts`)

```
step: 'capture' | 'crop' | 'confirm'
rawImage: Blob | null       // ทันทีหลังถ่าย (แปลง HEIC แล้ว)
croppedImage: Blob | null   // หลังครอบตัด
finalImage: Blob | null     // รูปภาพสุดท้ายหลังบีบอัด
```

เนื่องจาก Blob ไม่สามารถ serialize ได้ จึงคาดว่าสถานะจะถูกรีเซ็ตเมื่อโหลดหน้าใหม่ (การเก็บถาวรอยู่นอกข้อกำหนด ให้ระบุไว้อย่างชัดเจนว่าเป็นข้อจำกัดที่ทราบแล้วว่า การโหลดหน้าใหม่จะต้องเริ่มต้นใหม่ตั้งแต่แรก)

## 2. ข้อกำหนดของแต่ละฟังก์ชัน

### 2-1. Take Photo Button (หน้าหลัก `/[lang]`)

- วางปุ่มหลักเพียงปุ่มเดียว (ไอคอนกล้องจาก `lucide-react` + ข้อความ i18n) ไว้ตรงกลาง
- เมื่อคลิก: รีเซ็ต `useCaptureStore` เป็นสถานะเริ่มต้น แล้วจึงไปยัง `/[lang]/capture` (ป้องกันสถานะค้างจากเซสชันก่อนหน้า)
- UI สำหรับสลับภาษาอยู่นอกข้อกำหนดนี้ (งานแยก) รองรับหลายภาษาเฉพาะการแสดงผล เช่น `siteTitle` ใน `common.json`

### 2-2. Taking Photo Page / Take Photo (`step: 'capture'` ของ `/capture`)

- เมื่อ mount ให้เรียก `<input type="file" accept="image/*" capture="environment">` ที่ซ่อนอยู่โดยอัตโนมัติ เพื่อเปิดกล้องของอุปกรณ์ (เลือกกล้องหลังก่อน)
- เผื่อกรณีที่ผู้ใช้ยกเลิก (ไม่เกิดเหตุการณ์ `change`) ให้มีปุ่ม "ถ่ายภาพ" ที่เปิดกล้องซ้ำด้วยตนเองได้ตลอดเวลา (หลีกเลี่ยงการโหลดไม่รู้จบ)
- การตรวจสอบหลังได้ไฟล์:
  - ปฏิเสธไฟล์ที่ไม่ใช่ MIME ของรูปภาพ และแสดงข้อความแจ้งข้อผิดพลาด
  - HEIC/HEIF (รูปแบบเริ่มต้นของกล้อง iOS) ให้แปลงเป็น JPEG ด้วย `heic2any` ก่อนส่งต่อไปยังขั้นตอนถัดไป หากแปลงไม่สำเร็จ ให้แสดงข้อผิดพลาดพร้อมทางไปถ่ายใหม่
- เมื่อสำเร็จ: เก็บรูปภาพที่แปลงแล้วไว้ใน `rawImage` และเปลี่ยน `step` เป็น `'crop'`
- ยกเลิกได้ด้วยทาง "กลับหน้าหลัก" (รีเซ็ต store แล้วไปยังหน้าหลัก)
- ในสภาพแวดล้อมที่ไม่มีกล้อง เช่น เดสก์ท็อป ยอมรับพฤติกรรมที่ `<input capture>` จะกลายเป็นการเลือกไฟล์ปกติ (ในข้อกำหนดไม่ถือว่าเป็นข้อบกพร่อง)

### 2-3. Cropping Photo Page / Cropping image (`step: 'crop'`)

- โหลด `react-cropper` ด้วย `next/dynamic(..., { ssr: false })` (อ้างอิง `window` จึงทำ SSR ไม่ได้)
- แสดง `rawImage` ใน Cropper และให้ครอบตัดแบบอิสระ (ไม่ล็อกอัตราส่วน) ซูม หมุน (ซ้าย/ขวา 90 องศา) และรีเซ็ตได้
- ปุ่มการทำงานหลัก:
  - "ถัดไป (ยืนยันการครอบตัด)": `cropper.getCroppedCanvas()` → แปลงเป็น Blob → เก็บใน `croppedImage` → `step: 'confirm'` หากดึงข้อมูลไม่สำเร็จ ให้แสดงข้อผิดพลาดและแนะนำให้ลองใหม่
  - "ถ่ายใหม่": ทิ้ง `rawImage` และกลับไปที่ `step: 'capture'`

### 2-4. Confirming Photo Page / Decide Photo (`step: 'confirm'`)

- เมื่อแสดงหน้าจอ ให้บีบอัด・ปรับขนาด `croppedImage` ด้วย `browser-image-compression` แล้วเก็บใน `finalImage` และแสดงตัวอย่างของรูปนั้น (= ให้ภาพตัวอย่างตรงกับผลลัพธ์สุดท้าย) หากบีบอัดไม่สำเร็จ ให้แสดง `croppedImage` ที่ไม่ได้บีบอัดแทน
- ปุ่มการทำงานหลัก:
  - "ยืนยัน (Decide Photo)": ในขณะนี้ยังไม่ส่งไปยัง backend ให้เก็บ `finalImage` เป็นผลการยืนยันไว้ใน store แล้วไปยังหน้าหลักเพื่อแสดงว่าเสร็จสิ้น (toast ฯลฯ) เพื่อให้สลับไปเชื่อมต่อกับ `POST /documents` ฝั่ง `ai` ได้ในอนาคต ให้แยกการประมวลผลการยืนยันออกเป็นฟังก์ชันเดียวชื่อ `submitPhoto(finalImage)` (ครั้งนี้เป็นการพัฒนาจำลองที่ resolve ทันทีภายในเครื่อง)
  - "ครอบตัดใหม่": กลับไปที่ `step: 'crop'` (เก็บ `rawImage` ไว้)
  - "ถ่ายใหม่": ทิ้ง `rawImage` และ `croppedImage` แล้วกลับไปที่ `step: 'capture'`

## 3. ข้อกำหนดทางเทคนิคที่ใช้ร่วมกัน

- คอมโพเนนต์ที่เกี่ยวกับกล้อง／การครอบตัด／การบีบอัด ทั้งหมดเป็น `"use client"`
- แก้บั๊กทรัพยากร `th` ใน `web/i18n.ts` ให้เป็น `thCommon` (เนื่องจากจะใช้ locale นี้ใน routing จริง)
- พัฒนา `web/proxy.ts` เป็น `proxy.ts` (`export function proxy(request: NextRequest)`) ไม่ใช่ `middleware.ts` (breaking change ของ Next.js 16)
- locale ที่รองรับมี 3 ภาษา `en / ja / th` ค่า `[lang]` ที่ไม่ถูกต้องใช้ `notFound()`

## แผนการพัฒนา (รายการคอมโพเนนต์/ไฟล์)

1. `web/proxy.ts` — ตัดสิน locale และ redirect
2. `web/i18n.ts` — แก้บั๊กทรัพยากร `th`
3. `web/app/[lang]/layout.tsx` — ตรวจสอบ locale + i18n Provider
4. `web/app/[lang]/page.tsx` — หน้าหลัก (Take Photo Button)
5. `web/app/[lang]/capture/page.tsx` — orchestrator ของขั้นตอนถ่ายภาพ
6. `web/lib/store/useCaptureStore.ts` — store ของ zustand
7. `web/components/capture/TakePhotoButton.tsx`
8. `web/components/capture/CaptureStep.tsx`
9. `web/components/capture/CropStep.tsx`
10. `web/components/capture/ConfirmStep.tsx`
11. `web/components/i18n/I18nProvider.tsx`
12. `web/app/page.tsx` — ลดให้เหลือน้อยที่สุดและ `redirect()` ไปยัง locale เริ่มต้น

รายการ 1〜12 ข้างต้นจะเริ่มดำเนินการในงานพัฒนาถัดไปตามข้อกำหนดนี้ (เอกสารนี้ครอบคลุมถึงข้อกำหนด + แผนการพัฒนา)
