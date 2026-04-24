# 🏥 Centralized Instruction File: Lab Results Feature

## 🌐 General Rules
* The assistant must communicate with the user **in Arabic only**.
* All **code, technical implementation, and documentation must be written in English**.
* Before implementing **any feature, update, or modification**, the assistant must:
  * Explain the plan clearly.
  * Ask for user approval.
  * Proceed only after confirmation.

---

## 🎯 Feature Overview
The **Lab Results Feature** is a centralized system responsible for:
* Receiving medical lab inputs (images or PDFs).
* Processing and analyzing lab results using AI.
* Generating structured outputs for:
  * Doctors (detailed reasoning and analysis).
  * Patients (simple, understandable results).
* Integrating results with other system features (especially Medicines).

---

## 📂 Input Handling
The Lab Results page must:
* Accept:
  * 📸 Image uploads (تحاليل مصورة)
  * 📄 PDF files
* Upload files to:
  * Kaggle environment for processing

---

## ⚙️ Processing Pipeline
1. Upload file → Kaggle
2. Run AI Model (latest SOTA vision-language models)
3. Extract:
  * Medical values (e.g., CBC – Complete Blood Count)
  * Abnormal indicators
4. Generate:
  * 🧠 Doctor Output:
    * Detailed reasoning
    * Clinical insights
  * 👤 Patient Output:
    * Simplified explanation
    * Clear health status

---

## 🤖 Recommended Technologies (Always Use Latest)
* Vision-Language Models:
  * Qwen2-VL
  * Gemma 4
* OCR:
  * Tesseract OCR
  * DeepSeek-OCR
* Backend:
  * FastAPI
* Realtime:
  * WebSockets
* Deployment/Processing:
  * Kaggle

---

## 🧩 System Architecture

### 🔹 Backend Components
* `/upload-lab`
  * Handles file upload
* `/process-lab`
  * Sends file to Kaggle
  * Runs AI model
* `/results`
  * Returns structured results
* `/feedback`
  * Stores generated feedback

---

### 🔹 Frontend Components
* Lab Upload Page:
  * Upload image/PDF
  * Show loading/progress
* Results Page:
  * Doctor View (advanced)
  * Patient View (simplified)
* Medicines Page:
  * Displays warnings based on feedback

---

## 🧠 Feedback Sub-Feature

### 📌 Types of Feedback
1. Nutrition Feedback
2. Medicines Feedback ✅ (Focus)

---

## 💊 Medicines Feedback System

### 🎯 Purpose
To analyze lab results and generate **medical safety insights** that:
* Help detect risks
* Prevent harmful medication usage

---

### ⚙️ Behavior
* After lab analysis:
  * Detect conditions (e.g., diabetes, anemia)
  * Generate feedback entry

#### Example:
```json
{
  "condition": "Diabetes",
  "risk": "High blood sugar",
  "medication_warning": [
    "Steroids",
    "Certain diuretics"
  ]
}
```

---

### 🔗 Integration with Medicines Feature
* When user views medicines:
  * System checks feedback
  * Flags risky medications
  * Displays warnings like:
⚠️ "This medication may increase blood sugar levels"

---

### 🧱 Backend Logic
* Condition Detection Engine
* Rule-Based + AI Hybrid System
* Feedback Storage (Database)

---

### 🗄️ Database Structure Example
```json
Feedback {
  user_id,
  condition,
  risk_level,
  related_medicines,
  created_at
}
```

---

## 🔄 Update Policy (VERY IMPORTANT)
This file is the **single source of truth**.

Whenever ANY of the following changes:
* New feature added
* Logic updated
* API changed
* Model upgraded

👉 This file MUST be updated with:
* Clear explanation
* Updated structure
* Versioning if needed

---

## 🧪 Performance & Optimization
* Use:
  * Quantized models
  * Streaming responses
  * GPU acceleration (Kaggle)
* Avoid:
  * Duplicate processing
  * Redundant outputs

---

## 📌 Development Workflow
1. Explain idea
2. Get approval
3. Implement
4. Update this file
5. Test
6. Optimize

---

## 🚨 Critical Notes
* Medical outputs must be:
  * Accurate
  * Non-duplicated
  * Clearly separated (Doctor vs Patient)
* Feedback must:
  * Be actionable
  * Be linked to medicines system
* Always use **latest AI models and best practices**

---
