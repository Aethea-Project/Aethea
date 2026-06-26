# Aethea

**An AI-powered centralized healthcare platform transforming clinical noise into actionable insights, designed to connect patients, doctors, and data seamlessly.**

*Aligning with Egypt Vision 2030 and multiple UN Sustainable Development Goals (SDGs 3, 9, 10, 17) to digitize and democratize medical services.*

## 🌟 Platform Features

### 🧑‍⚕️ For Patients
- **Medical Scans Analysis:** Automated fracture detection using specialized AI models with GradCAM explainability.
- **Lab Results Analysis:** AI-powered extraction and simplification of complex lab reports.
- **Medical Myth Buster:** Dual-AI engine that validates medical claims against scientific literature.
- **Medicine Guidance:** Integrated database of over 174 therapeutic medicines for intelligent guidance.
- **Booking Marketplace & Care Locator:** Find nearby hospitals, pharmacies, and verified doctors with live routing.

### 🩺 For Doctors
- **Schedule Maker & Live Queue Tracker:** Streamline clinic operations and manage patient flow in real-time.
- **Patient History Viewer (Shared Folders):** Secure, appointment-based access to verified patient medical histories.
- **Online Prescriptions:** Issue and track prescriptions digitally.

### 🛡️ For Administrators
- **Global Overview Dashboard:** Monitor platform usage, user activity, and system health.
- **Medical License Verification:** Automated queue for verifying healthcare professionals before platform access.
- **Security Audit Logs:** Comprehensive tracking of all actions to ensure accountability.

## 🛠 Tech Stack & Architecture

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion
- **Backend Services:** Node.js, Express, BullMQ (Background Processing)
- **Database & Auth:** Supabase (PostgreSQL), Redis, TanStack React Query
- **AI & OCR Engines:** Python, PyTorch, Ultralytics (YOLO), FastAPI, Gemini 2.5 Flash, LlamaParse, Gemma 4
- **Tooling:** Docker, Playwright

## 👥 Team & Load Distribution

Aethea was brought to life by a team of 7 dedicated engineers.

- **Kirolos Maurice William:** Designed the website UX/UI (including logos, animations, and color palettes) and spearheaded the full-stack development of the web platform. Collaborated closely with the team to co-develop the Authentication, Notifications, and Care Locator systems. Additionally, engineered the AI data extraction model for Lab Results using LlamaParse and Gemini, and seamlessly integrated the complex Medical AI pipelines into the platform.
- **Mohamed Safwat:** Architected and developed the core **Medical AI Pipeline**. Built the end-to-end system orchestrating X-ray routing, bounding-box detection ensembles, fracture classification via advanced architectures, GradCAM explainability, and Gemini-powered automated medical report generation. Additionally, developed and trained the localized AI bone/fracture detection models specifically for the **Hand, Wrist, and Forearm**.
- **Mostafa Abdallah:** Co-developed the secure Login & Registration systems, real-time Notifications architecture, Care Locator, and User Profiles. For the Lab Results feature, independently trained and developed the AI model responsible for lab image-type classification.
- **Mohamed Saadeldin & Omar Mahmoud Atwa:** Collaborated on developing the "Router AI Models" responsible for initially classifying the specific body part present in an uploaded X-ray scan.
- **Andrew Wageh:** Developed and trained the localized AI bone/fracture detection models specifically for the **Arms, Shoulders, Hips, and Pelvis**.
- **Sherif Diaa Elsayed:** Developed and trained the localized AI bone/fracture detection model specifically for the **Elbow**.
