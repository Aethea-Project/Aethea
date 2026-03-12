# Aethea — Doctor Reservations Feature Plan
> Created: March 12, 2026  
> Status: **PLANNING COMPLETE — READY TO EXECUTE**  
> Branch: `feature/doctor-reservations`

---

## Table of Contents
1. [Full Conversation Summary & Decisions](#1-full-conversation-summary--decisions)
2. [Test Accounts](#2-test-accounts)
3. [Architecture Decisions](#3-architecture-decisions)
4. [New Data Models](#4-new-data-models)
5. [Mock Data Inventory](#5-mock-data-inventory)
6. [Files to Edit — Complete List](#6-files-to-edit--complete-list)
7. [Execution Plan — Phased Subtasks](#7-execution-plan--phased-subtasks)
8. [Progress Tracker](#8-progress-tracker)

---

## 1. Full Conversation Summary & Decisions

### What Is the Doctor Reservations Feature?
The goal is to eliminate waiting in queues for patients and elderly people accessing medical care buildings. The feature lets doctors post their availability and lets patients book specific time slots in advance.

### Who Sees What?

| Role | Access |
|---|---|
| **Patient** | Browse doctors list (search by name + filter by specialty), book a slot, view own appointments ("My Appointments"), cancel within 6-hour window, toggle health data sharing |
| **Doctor** | Post a daily/future schedule, view their own dashboard of booked slots, see anonymized patient info (Patient 1, Patient 2...) including age, gender, and shared health data if patient opted in |
| **Admin** | View all schedules and all reservations with same anonymization rules applied |
| **Pharmacist** | Nothing yet — account exists for future features |

### Privacy Rules (CONFIRMED — MUST BE ENFORCED SERVER-SIDE)
- Doctor **never** sees patient's real name — only "Patient 1", "Patient 2", etc. ordered by slot time
- Doctor sees: patient's age, gender, and health data **only if patient explicitly opted in**
- Anonymization must happen in the **backend query/response**, never just hidden on the frontend

### How the Booking Flow Works
1. Doctor creates a **DoctorSchedule post** specifying:
   - Date (can be a future date — not just today)
   - Starting time (e.g., 10:00 AM)
   - Max number of patients (e.g., 5)
   - Duration per patient (e.g., 30 minutes)
   - The system auto-calculates end time (e.g., 11:30 AM) and individual slot times
2. Patient browses the doctor list → picks a doctor → sees available slots
3. Patient books a slot → reservation is created linked to that specific slot and doctor
4. If schedule is full → patient sees "Fully Booked" + "Notify Me" button
5. If a patient cancels → notify-me list gets notified via in-app notification

### Doctor Schedule — "Post" Model
- A doctor can post a schedule for **any future date** (not just today)
- They pick: date, start time, number of patients, minutes per patient
- The backend calculates: end time, and individual slot start/end times
- Each slot becomes a bookable unit

### Cancellation Rules (CONFIRMED)
- Patient can cancel a reservation only within **6 hours of booking**
- After 6 hours the cancellation window closes — no cancellations allowed
- This prevents slot-holding abuse
- When a cancellation happens within the window, patients who clicked "Notify Me" receive an in-app notification

### Health Data Sharing (CONFIRMED)
- When booking, patient has a toggle: "Allow doctor to see my health records"
- What the doctor can see if patient opts in: lab test results + scan results saved on the platform
- Nutrition plans and AI feedback: patient chooses what our site saves (privacy-by-design)
- The AI model for analyzing results is still in development — we build the **sharing mechanism now** and leave a clear extension point for AI feedback later
- Use case example: Patient had a bone fracture, has old scans on Aethea, is booking a doctor for related pain — enables sharing so doctor sees past context before the appointment

### Notifications (CONFIRMED)
- **Phase 1 (now)**: In-app notifications only — a `notifications` DB table
- **Phase 2 (later)**: Supabase Postgres Changes → live badge update if user is online
- **Phase 3 (future)**: Email via Resend, mobile push via Novu
- No Twilio, no Firebase, no WebSockets in this session

### Doctor Photo Storage (CONFIRMED)
- **Test seed**: Use a placeholder image path from existing `/public/images/` assets
- **Production**: Upload via Supabase Storage — backend receives file, uploads to `doctor-profiles` bucket, stores public URL string in `DoctorProfile.photoUrl`
- Never store files inside Docker containers (stateless — files lost on restart)

### Old Reservation Page Fate (CONFIRMED)
- The existing patient Reservations page (which let patients type a free-text doctor name) is **replaced entirely**
- New patient experience: Doctor discovery page (search + filter) → book a slot
- "My Appointments" sub-view in the reservations page shows the patient's booked slots
- Old `doctorName` text field goes away — replaced by FK to real doctor account

### Old Reservation Records (CONFIRMED)
- Wipe the `reservations` table clean during migration — it has no real patient data, only test/mock records
- The schema change is too significant to migrate old rows

### Mock Data — What Gets Replaced vs Kept (CONFIRMED)

| File | Page | Action |
|---|---|---|
| `web/src/data/mocks/doctors.ts` | DoctorFinder | **REPLACE** with real API — we're building the backend now |
| `web/src/data/mocks/chat.ts` | DoctorChat | **KEEP** — no backend for chat yet (future feature) |
| `web/src/data/mocks/medicines.ts` | MedicineGuide | **KEEP** — no backend yet (future feature) |
| `web/src/data/mocks/nutrition.ts` | NutritionPlanner | **KEEP** — no backend yet (future feature) |
| `web/src/data/mocks/recovery.ts` | RecoveryAssistant | **KEEP** — no backend yet (future feature) |

Lab Tests, Scans, and Reservations pages already read from the real API — no mock data to remove there.

---

## 2. Test Accounts

These are the 4 accounts used for end-to-end testing. **All are real Supabase auth users.**

| Role | UUID | Email |
|---|---|---|
| Admin | `980035ac-6e2b-46cd-adb6-1eb3dc170233` | admin@aethea.com |
| Patient | `60185e1c-88c3-4ef1-8d19-cb60dfd3d643` | patient@aethea.com |
| Doctor | `26df25b3-a9ca-47c6-8df5-f52841d55682` | doctor@aethea.com |
| Pharmacist | `25bdbbcd-abaa-4467-a386-1f7033cbb745` | pharmacist@aethea.com |

### What We Seed Per Account
- **Admin**: Already configured — no new seed needed
- **Patient**: User profile row + sample lab tests + sample scans + a booking (after doctor schedule is seeded)
- **Doctor**: User profile row + DoctorProfile (name, specialty, bio, location, photo placeholder) + a DoctorSchedule
- **Pharmacist**: User profile row only (no feature data yet — future)

---

## 3. Architecture Decisions

### Backend 3-Layer (existing pattern — must follow)
```
Controllers  (HTTP only: parse params, call one service fn, return response)
  → Services  (business logic, orchestrate repos, enforce rules)
    → Repositories  (all SQL via Prisma — parameterized queries only)
      → Prisma / PostgreSQL
```

### Frontend 4-Layer (existing pattern — must follow)
```
Pages (UI state, JSX only)
  → Domain Hooks  (loading/error/data lifecycle, mutations)
    → Repository  medicalApi.ts  (raw→domain normalization)
      → Infrastructure  apiClient.ts  (the ONLY file that calls fetch)
```

### New Routes Follow DI Factory Pattern
```ts
export const createDoctorRoutes = (authMiddleware: RequestHandler): Router => { ... }
```
Mounted in `app.ts` under both `/api/v1/` and `/api/` (backward-compat alias).

### Anonymization is Server-Side
The endpoint `GET /doctor-schedules/:scheduleId/slots` (doctor's view) must:
1. Return slot positions numbered 1, 2, 3... (not patient names or IDs)
2. Return age and gender only
3. Return health data only if `shareHealthData === true` on the reservation
4. Never return `userId`, `email`, `firstName`, `lastName`

---

## 4. New Data Models

### New Enums to Add to `schema.prisma`
```prisma
enum AccountType {
  patient
  doctor
  pharmacist
  admin
}

enum NotificationType {
  slot_available
  reservation_confirmed
  reservation_cancelled
}
```

### New Models to Add to `schema.prisma`

#### DoctorProfile
```prisma
model DoctorProfile {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @unique @db.Uuid
  specialty   String   @db.VarChar(120)
  bio         String?
  clinicName  String?  @db.VarChar(200)
  address     String?  @db.VarChar(300)
  city        String?  @db.VarChar(100)
  photoUrl    String?  @db.Text
  consultFee  Int?
  languages   String[] @db.Text
  verified    Boolean  @default(false)
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  schedules   DoctorSchedule[]

  @@map("doctor_profiles")
}
```

#### DoctorSchedule
```prisma
model DoctorSchedule {
  id               String   @id @default(uuid()) @db.Uuid
  doctorProfileId  String   @db.Uuid
  scheduleDate     DateTime @db.Date
  startAt          DateTime @db.Timestamptz(6)
  endAt            DateTime @db.Timestamptz(6)
  slotDurationMins Int
  maxPatients      Int
  isPublished      Boolean  @default(true)
  createdAt        DateTime @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime @updatedAt @db.Timestamptz(6)
  doctorProfile    DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Cascade)
  reservations     Reservation[]

  @@index([scheduleDate])
  @@map("doctor_schedules")
}
```

#### Updated Reservation Model
The existing `Reservation` model needs these changes:
- Remove: `doctorName`, `specialty`, `location` (moved to DoctorProfile)
- Add: `doctorScheduleId` (FK to DoctorSchedule), `slotIndex` (which slot 1..N), `shareHealthData` (toggle), `notifyOnCancel` (list flag), `cancelDeadlineAt` (6h after booking)
- Keep: `reason`, `status`, `notes`, `startAt`, `endAt`, `userId`

```prisma
model Reservation {
  id               String            @id @default(uuid()) @db.Uuid
  userId           String            @db.Uuid
  doctorScheduleId String            @db.Uuid
  slotIndex        Int               // 1-based position within the schedule
  startAt          DateTime          @db.Timestamptz(6)
  endAt            DateTime          @db.Timestamptz(6)
  reason           String
  status           ReservationStatus @default(scheduled)
  notes            String?
  shareHealthData  Boolean           @default(false)
  notifyOnCancel   Boolean           @default(false)
  cancelDeadlineAt DateTime          @db.Timestamptz(6) // bookingTime + 6h
  createdAt        DateTime          @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime          @updatedAt @db.Timestamptz(6)
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  doctorSchedule   DoctorSchedule    @relation(fields: [doctorScheduleId], references: [id], onDelete: Cascade)

  @@unique([doctorScheduleId, slotIndex])
  @@index([userId, startAt])
  @@map("reservations")
}
```

#### Notification Model
```prisma
model Notification {
  id         String           @id @default(uuid()) @db.Uuid
  userId     String           @db.Uuid
  type       NotificationType
  title      String           @db.VarChar(200)
  body       String
  isRead     Boolean          @default(false)
  metadata   Json?
  createdAt  DateTime         @default(now()) @db.Timestamptz(6)
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@map("notifications")
}
```

#### User Model — Add relation fields
```prisma
// Add to existing User model:
  doctorProfile  DoctorProfile?
  notifications  Notification[]
  accountType    AccountType    @default(patient)
```

---

## 5. Mock Data Inventory

### Files Using Mock Data in Pages

| Page | Mock Import | Real API Exists? | Action This Session |
|---|---|---|---|
| `DoctorFinder/index.tsx` | `mockDoctors`, `SPECIALTIES` from `doctors.ts` | ❌ Building now | Replace with `useDoctors` hook → real API |
| `DoctorFinder/DoctorCard.tsx` | `Doctor` type from `doctors.ts` | ❌ Building now | Update type import |
| `NutritionPlanner/index.tsx` | `mockMealPlans`, `defaultPatientProfile` | ❌ Future | Keep — leave comment |
| `MedicineGuide/index.tsx` | `mockMedicines`, `defaultPatientConditions` | ❌ Future | Keep — leave comment |
| `DoctorChat/index.tsx` | `mockDoctor`, `mockMessages` | ❌ Future | Keep — leave comment |
| `RecoveryAssistant/index.tsx` | `mockRecoveryProgram` | ❌ Future | Keep — leave comment |

### Pages Already Using Real API (No Mock Data)
- `LabResults/index.tsx` → `useLabTests` hook → real backend ✅
- `Scans/index.tsx` → `useScans` hook → real backend ✅
- `Reservations/index.tsx` → `useReservations` hook → real backend (being reworked) ✅

---

## 6. Files to Edit — Complete List

### Phase 0 — Git
| Action | Detail |
|---|---|
| Create branch | `git checkout -b feature/doctor-reservations` from `develop` |

### Phase 1 — Database Schema
| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Add `AccountType`, `NotificationType` enums; add `DoctorProfile`, `DoctorSchedule`, `Notification` models; update `Reservation` model; update `User` model |
| New migration file (auto-generated) | `prisma migrate dev --name doctor_reservations` |
| `backend/prisma/seed.ts` | Seed all 4 accounts with profile + sample data |

### Phase 2 — Backend Schemas (Validation)
| File | Change |
|---|---|
| `backend/src/schemas/index.ts` | Add `createDoctorProfileSchema`, `createDoctorScheduleSchema`, `createReservationSchema` (new version), `updateReservationSchema` (new version), `notifyOnCancelSchema` |

### Phase 3 — Backend Repositories
| File | Change |
|---|---|
| `backend/src/repositories/doctorRepository.ts` | **NEW** — `findAllDoctorProfiles`, `findDoctorProfileById`, `findDoctorProfileByUserId`, `createDoctorProfile` |
| `backend/src/repositories/scheduleRepository.ts` | **NEW** — `createSchedule`, `findSchedulesByDoctor`, `findScheduleById`, `findPublishedSchedulesByDate` |
| `backend/src/repositories/reservationRepository.ts` | **NEW** — replace old inline Prisma calls from controller. `createReservation`, `findReservationsByUser`, `findReservationsBySchedule`, `cancelReservation`, `findNotifyOnCancelList` |
| `backend/src/repositories/notificationRepository.ts` | **NEW** — `createNotification`, `findUnreadByUser`, `markAsRead` |

### Phase 4 — Backend Services
| File | Change |
|---|---|
| `backend/src/services/doctorService.ts` | **NEW** — `getDoctors`, `getDoctorById`, `createDoctorProfile`, `getDoctorSchedules`, `createSchedule` (computes slots, validates no overlap) |
| `backend/src/services/reservationService.ts` | **NEW** — `bookSlot` (validates slot not taken, sets cancelDeadlineAt, enforces max capacity), `cancelReservation` (validates 6h window, triggers notifications), `getMyReservations`, `getDoctorView` (anonymized) |
| `backend/src/services/notificationService.ts` | **NEW** — `notifyWaitlist` (called after cancellation), `getUnreadNotifications`, `markNotificationsRead` |

### Phase 5 — Backend Controllers
| File | Change |
|---|---|
| `backend/src/controllers/doctors.controller.ts` | **NEW** — `listDoctors`, `getDoctorProfile`, `createDoctorProfile`, `listSchedules`, `createSchedule` |
| `backend/src/controllers/reservations.controller.ts` | **REWORK** — Replace existing free-text logic with new slot-based booking. Add `bookSlot`, `cancelReservation`, `listMyReservations`, `getDoctorDashboard` |
| `backend/src/controllers/notifications.controller.ts` | **NEW** — `listNotifications`, `markRead` |

### Phase 6 — Backend Routes
| File | Change |
|---|---|
| `backend/src/routes/doctors.routes.ts` | **NEW** — `GET /doctors`, `GET /doctors/:id`, `POST /doctors/profile` (doctor only), `GET /doctors/:id/schedules`, `POST /doctors/schedules` (doctor only) |
| `backend/src/routes/reservations.routes.ts` | **REWORK** — New endpoints replacing old ones |
| `backend/src/routes/notifications.routes.ts` | **NEW** — `GET /notifications`, `PATCH /notifications/read` |
| `backend/src/app.ts` | Mount new routes (`/api/v1/doctors`, `/api/v1/notifications` and backward-compat aliases) |

### Phase 7 — Frontend Services / Hooks
| File | Change |
|---|---|
| `web/src/services/medicalApi.ts` | Update `Reservation` type + `toReservation` normalizer; add `fetchDoctors`, `fetchDoctorSchedules`, `bookSlot`, `cancelReservation`, `fetchNotifications`, `markNotificationsRead` |
| `web/src/hooks/useReservations.ts` | Rework to new slot-based payload; add `cancelReservation`, `bookSlot` |
| `web/src/hooks/useDoctors.ts` | **NEW** — `doctors`, `loading`, `error` + search/filter helpers |
| `web/src/hooks/useNotifications.ts` | **NEW** — unread count, notification list, markRead |

### Phase 8 — Frontend Pages
| File | Change |
|---|---|
| `web/src/pages/DoctorFinder/index.tsx` | Replace `mockDoctors` with `useDoctors` hook; update booking flow to use real slot selection |
| `web/src/pages/DoctorFinder/DoctorCard.tsx` | Update `Doctor` type import (from new domain type, not mock) |
| `web/src/pages/DoctorFinder/BookingModal.tsx` | Rework to show real slots from API; add health data sharing toggle; add reason field |
| `web/src/pages/Reservations/index.tsx` | Full rework — "My Appointments" view with cancellation (within 6h window only) |
| `web/src/pages/DoctorReservations/index.tsx` | **NEW PAGE** — Doctor's dashboard: create schedule form + anonymized patient list |
| `web/src/pages/DoctorReservations/styles.css` | **NEW** — Styles for doctor dashboard |

### Phase 9 — Frontend Routing & Nav
| File | Change |
|---|---|
| `web/src/App.tsx` | Add lazy import + route for `DoctorReservations` page; protect with doctor-role guard |

### Phase 10 — Seed Script
| File | Change |
|---|---|
| `backend/prisma/seed.ts` | Full rewrite — seed all 4 test accounts, doctor profile, one schedule, sample patient booking, lab tests + scans for patient |

---

## 7. Execution Plan — Phased Subtasks

### ✅ PHASE 0 — Git Setup
- [ ] **0.1** Ensure we are on `develop` branch: `git checkout develop`
- [ ] **0.2** Pull latest: `git pull origin develop`
- [ ] **0.3** Create feature branch: `git checkout -b feature/doctor-reservations`

---

### ✅ PHASE 1 — Codebase Audit & Cleanup
> Goal: Read every file we will edit before touching anything. No changes yet.

- [ ] **1.1** Read `backend/prisma/schema.prisma` in full — confirm existing model shapes
- [ ] **1.2** Read `backend/prisma/seed.ts` — understand existing seed structure
- [ ] **1.3** Read `backend/src/schemas/index.ts` — understand existing validation patterns
- [ ] **1.4** Read `backend/src/controllers/reservations.controller.ts` in full
- [ ] **1.5** Read `backend/src/routes/reservations.routes.ts` in full
- [ ] **1.6** Read `backend/src/app.ts` in full — confirm route mounting pattern
- [ ] **1.7** Read `web/src/pages/DoctorFinder/index.tsx` in full
- [ ] **1.8** Read `web/src/pages/DoctorFinder/BookingModal.tsx` in full
- [ ] **1.9** Read `web/src/pages/Reservations/index.tsx` in full
- [ ] **1.10** Read `web/src/services/medicalApi.ts` in full
- [ ] **1.11** Read `web/src/hooks/useReservations.ts` in full
- [ ] **1.12** Read `web/src/App.tsx` — understand routing structure

---

### ✅ PHASE 2 — Database Schema
> One migration, done clean. Wipe reservations table.

- [ ] **2.1** Update `backend/prisma/schema.prisma`:
  - Add `AccountType` enum
  - Add `NotificationType` enum
  - Add `accountType` field to `User` model
  - Add `DoctorProfile?` and `Notification[]` relations to `User` model
  - Add `DoctorProfile` model
  - Add `DoctorSchedule` model
  - Rewrite `Reservation` model (drop old fields, add new FK + slot fields)
  - Add `Notification` model
- [ ] **2.2** Run `npm run docker:prisma:migrate` (or equivalent) with name `doctor_reservations`
- [ ] **2.3** Verify migration succeeded — check `backend/prisma/migrations/` for new folder
- [ ] **2.4** Run `npx prisma generate` to regenerate client types

---

### ✅ PHASE 3 — Seed Data
> All 4 accounts get realistic test data

- [ ] **3.1** Rewrite `backend/prisma/seed.ts`:
  - Upsert `User` row for all 4 UUIDs / emails
  - Set `accountType` for each
  - Create `DoctorProfile` for doctor account (specialty: "Orthopedic Surgeon", city: "Cairo", placeholder photo)
  - Create one `DoctorSchedule` for tomorrow at 10:00 AM, 5 patients, 30 min each
  - Create sample `LabTest` records for patient account (3–5 entries)
  - Create sample `Scan` records for patient account (2 entries)
  - Create one `Reservation` for patient (slot 1 in the doctor's schedule, shareHealthData: true)
- [ ] **3.2** Run seed: `npx prisma db seed`
- [ ] **3.3** Verify data in Prisma Studio or pgAdmin

---

### ✅ PHASE 4 — Backend Validation Schemas
- [ ] **4.1** Add to `backend/src/schemas/index.ts`:
  - `createDoctorProfileSchema`
  - `createDoctorScheduleSchema`
  - New `createReservationSchema` (with `doctorScheduleId`, `slotIndex`, `reason`, `shareHealthData`, `notifyOnCancel`)
  - `notifyOnCancelSchema`
  - `markNotificationsReadSchema`

---

### ✅ PHASE 5 — Backend Repositories
- [ ] **5.1** Create `backend/src/repositories/doctorRepository.ts`
- [ ] **5.2** Create `backend/src/repositories/scheduleRepository.ts`
- [ ] **5.3** Create `backend/src/repositories/reservationRepository.ts` (replaces old inline controller logic)
- [ ] **5.4** Create `backend/src/repositories/notificationRepository.ts`

---

### ✅ PHASE 6 — Backend Services
- [ ] **6.1** Create `backend/src/services/doctorService.ts`
  - `getDoctors(filters)` — list + search by name, filter by specialty
  - `getDoctorById(id)` — profile + upcoming schedules
  - `createDoctorProfile(userId, data)` — for doctor account type only
  - `createSchedule(doctorProfileId, data)` — computes slots, validates no date overlap
- [ ] **6.2** Create `backend/src/services/reservationService.ts`
  - `bookSlot(userId, data)` — validates capacity, sets `cancelDeadlineAt = now + 6h`, creates reservation
  - `cancelReservation(userId, reservationId)` — validates within 6h window, cancels, triggers notification service
  - `getMyReservations(userId)` — patient view
  - `getDoctorDashboard(doctorUserId, scheduleId)` — anonymized list
  - `getHealthDataForSlot(reservationId)` — returns patient's lab tests + scans if `shareHealthData === true`
- [ ] **6.3** Create `backend/src/services/notificationService.ts`
  - `notifyWaitlist(scheduleId, freedSlotIndex)` — finds all reservations on schedule with `notifyOnCancel: true` and status `cancelled`... actually finds users who called `POST /notify-me` endpoint — creates notification rows
  - `getUnreadNotifications(userId)`
  - `markNotificationsRead(userId, ids)`

---

### ✅ PHASE 7 — Backend Controllers
- [ ] **7.1** Create `backend/src/controllers/doctors.controller.ts`
  - `listDoctors` — calls `doctorService.getDoctors()`
  - `getDoctorProfile` — calls `doctorService.getDoctorById()`
  - `createDoctorProfile` — doctor-only endpoint
  - `listDoctorSchedules`
  - `createDoctorSchedule` — doctor-only endpoint
- [ ] **7.2** Rework `backend/src/controllers/reservations.controller.ts`
  - Remove: `listReservations` (old), `createReservation` (old), `updateReservation` (old)
  - Add: `bookSlot`, `cancelReservation`, `listMyReservations`, `getDoctorDashboard`, `notifyOnCancel`
- [ ] **7.3** Create `backend/src/controllers/notifications.controller.ts`
  - `listNotifications`
  - `markRead`

---

### ✅ PHASE 8 — Backend Routes
- [ ] **8.1** Create `backend/src/routes/doctors.routes.ts`
  - `GET /` → `listDoctors` (authenticated — any role)
  - `GET /:id` → `getDoctorProfile` (authenticated — any role)
  - `POST /profile` → `createDoctorProfile` (doctor role only)
  - `GET /:id/schedules` → `listDoctorSchedules` (authenticated — any role)
  - `POST /schedules` → `createDoctorSchedule` (doctor role only)
- [ ] **8.2** Rework `backend/src/routes/reservations.routes.ts`
  - `POST /` → `bookSlot` (patient role)
  - `DELETE /:id` → `cancelReservation` (patient role — within 6h window)
  - `GET /my` → `listMyReservations` (patient role)
  - `GET /doctor-dashboard/:scheduleId` → `getDoctorDashboard` (doctor/admin role)
  - `POST /:id/notify-cancel` → `notifyOnCancel` (patient role)
- [ ] **8.3** Create `backend/src/routes/notifications.routes.ts`
  - `GET /` → `listNotifications` (any authenticated)
  - `PATCH /read` → `markRead` (any authenticated)
- [ ] **8.4** Update `backend/src/app.ts` — mount new routes

---

### ✅ PHASE 9 — Frontend Services Layer
- [ ] **9.1** Update `web/src/services/medicalApi.ts`:
  - Update `RawReservation` type (new fields: `doctorScheduleId`, `slotIndex`, `shareHealthData`, `notifyOnCancel`, `cancelDeadlineAt`)
  - Update `toReservation` normalizer
  - Update `Reservation` domain type
  - Update `ReservationPayload` type
  - Add `RawDoctorProfile` type + `toDoctorProfile` normalizer
  - Add `RawDoctorSchedule` type + `toDoctorSchedule` normalizer
  - Add `RawNotification` type + `toNotification` normalizer
  - Add `fetchDoctors(filters?)`, `fetchDoctorSchedules(doctorId)`, `bookSlot(payload)`, `cancelReservation(id)`, `requestNotifyOnCancel(reservationId)`
  - Add `fetchNotifications()`, `markNotificationsRead(ids)`

---

### ✅ PHASE 10 — Frontend Hooks
- [ ] **10.1** Rework `web/src/hooks/useReservations.ts`
  - Update to new `bookSlot` mutation instead of `createReservation`
  - Add `cancelReservation` mutation (checks deadline client-side for UX, enforced server-side for security)
  - Add `requestNotifyOnCancel` mutation
- [ ] **10.2** Create `web/src/hooks/useDoctors.ts`
  - `doctors`, `loading`, `error`
  - `searchQuery` state, `specialty` filter state
  - Filtered/sorted list computed with `useMemo`
- [ ] **10.3** Create `web/src/hooks/useNotifications.ts`
  - `notifications`, `unreadCount`, `loading`
  - `markRead(ids)` mutation

---

### ✅ PHASE 11 — Frontend Pages (Patient Side)
- [ ] **11.1** Rework `web/src/pages/DoctorFinder/index.tsx`
  - Replace `mockDoctors` import with `useDoctors` hook
  - Keep search by name (now calls real API filter)
  - Keep specialty filter (now calls real API filter)
  - Keep map view (uses doctor's real `address` / `city`)
- [ ] **11.2** Update `web/src/pages/DoctorFinder/DoctorCard.tsx`
  - Update `Doctor` type import to use domain type from `medicalApi.ts` instead of mock
- [ ] **11.3** Rework `web/src/pages/DoctorFinder/BookingModal.tsx`
  - Show real available slots from `fetchDoctorSchedules(doctorId)`
  - Slot picker UI (buttons for each slot — grayed out if taken)
  - "Fully Booked" state with "Notify Me When a Slot Opens" button
  - Health data sharing toggle (checkbox + brief explanation)
  - Reason for visit text field
  - Confirm booking → calls `bookSlot()`
- [ ] **11.4** Rework `web/src/pages/Reservations/index.tsx`
  - Remove: old free-text booking form
  - Add: "My Appointments" view showing patient's booked slots
  - Show: doctor name, specialty, date/time, slot position, status badge
  - Show: "Cancel Appointment" button — visible only if `cancelDeadlineAt > now`; disabled with tooltip after deadline
  - Show: "Enable Slot Change Notifications" toggle per appointment

---

### ✅ PHASE 12 — Frontend Pages (Doctor Side)
- [ ] **12.1** Create `web/src/pages/DoctorReservations/index.tsx`
  - **Top section**: Create Schedule form
    - Date picker (today or future)
    - Start time picker
    - Number of patients input
    - Minutes per patient input
    - Preview: computed end time, list of slot times (e.g., 10:00–10:30, 10:35–11:05...)
    - "Post Schedule" button
  - **Bottom section**: Dashboard of published schedules
    - Tabbed by date
    - Per schedule: slot grid — each slot shows "Patient N", age, gender, status badge
    - Expand slot → see shared health data (if `shareHealthData: true`) — lab tests + scans
    - Empty slot shows "Available"
- [ ] **12.2** Create `web/src/pages/DoctorReservations/styles.css`

---

### ✅ PHASE 13 — Routing & Navigation
- [ ] **13.1** Update `web/src/App.tsx`
  - Add lazy import for `DoctorReservations`
  - Add route `/doctor-reservations` protected to doctor role
  - Ensure `Reservations` route still works for patients

---

### ✅ PHASE 14 — Type-Check & Build Validation
- [ ] **14.1** `cd web && npm run type-check` — fix all errors
- [ ] **14.2** `cd backend && npm run type-check` — fix all errors
- [ ] **14.3** `cd backend && npx jest` — all 7 suites must still pass
- [ ] **14.4** `cd web && npm run build` — production build must succeed
- [ ] **14.5** `cd backend && npm run build` — production build must succeed

---

### ✅ PHASE 15 — Manual End-to-End Test
Using the 4 test accounts:
- [ ] **15.1** Login as **doctor@aethea.com** → navigate to Doctor Reservations → verify seeded schedule appears
- [ ] **15.2** Login as **patient@aethea.com** → navigate to Doctor Finder → find the test doctor → book a slot → enable health sharing
- [ ] **15.3** Login back as **doctor@aethea.com** → verify patient appears as "Patient 1" with age/gender and shared health data
- [ ] **15.4** Login as **patient@aethea.com** → go to My Appointments → cancel within 6h window → confirm cancellation works
- [ ] **15.5** Login as **admin@aethea.com** → verify admin can see all schedules/reservations

---

### ✅ PHASE 16 — Git Push & Merge
- [ ] **16.1** `git add -A`
- [ ] **16.2** `git commit -m "feat: doctor reservations — full feature (schema, backend, frontend)"`
- [ ] **16.3** `git push origin feature/doctor-reservations`
- [ ] **16.4** Merge `feature/doctor-reservations` → `develop` (PR or direct merge)
- [ ] **16.5** Merge `develop` → `main`
- [ ] **16.6** Delete `feature/doctor-reservations` branch: `git branch -d feature/doctor-reservations` + `git push origin --delete feature/doctor-reservations`

---

## 8. Progress Tracker

| Phase | Description | Status |
|---|---|---|
| 0 | Git Setup | ⬜ Not Started |
| 1 | Codebase Audit & Cleanup | ⬜ Not Started |
| 2 | Database Schema | ⬜ Not Started |
| 3 | Seed Data | ⬜ Not Started |
| 4 | Backend Validation Schemas | ⬜ Not Started |
| 5 | Backend Repositories | ⬜ Not Started |
| 6 | Backend Services | ⬜ Not Started |
| 7 | Backend Controllers | ⬜ Not Started |
| 8 | Backend Routes | ⬜ Not Started |
| 9 | Frontend Services Layer | ⬜ Not Started |
| 10 | Frontend Hooks | ⬜ Not Started |
| 11 | Frontend Pages (Patient) | ⬜ Not Started |
| 12 | Frontend Pages (Doctor) | ⬜ Not Started |
| 13 | Routing & Navigation | ⬜ Not Started |
| 14 | Type-Check & Build | ⬜ Not Started |
| 15 | Manual E2E Test | ⬜ Not Started |
| 16 | Git Push & Merge | ⬜ Not Started |

> **Update this table as phases complete. Change ⬜ to ✅ when done.**

---

## Notes for Next Session

1. **Start here**: Read this file first. Check the Progress Tracker. Continue from the first ⬜ phase.
2. **Branch must be** `feature/doctor-reservations` before writing any code.
3. **Never** put anonymization logic only on the frontend — enforce in the backend service response.
4. **Slot timing formula**: `slotStartAt = scheduleStartAt + (slotIndex - 1) * slotDurationMins` — computed at booking time, stored in the `Reservation` row.
5. **Cancel deadline formula**: `cancelDeadlineAt = reservation.createdAt + 6 hours` — computed at booking time, stored in the `Reservation` row. Server validates on cancel request.
6. **Doctor role check**: Use `requireAccountType('doctor')` middleware on doctor-only routes. This needs to read `accountType` from the `User` row (the new field we're adding).
7. The `DoctorFinder` page already has a `BookingModal.tsx` and `DoctorMap.tsx` — do not recreate them, rework them.
8. Supabase Realtime notifications are **Phase 2 (future)** — do not build WebSocket infrastructure now. Just write to the `notifications` DB table.
