# Aethea Medical Platform 🏥

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Educational-orange)](LICENSE)
[![Status](https://img.shields.io/badge/status-Active%20Development-yellow)](https://github.com/Aethea-Project/Aethea)

A comprehensive healthcare platform that revolutionizes medical data management for patients and healthcare providers. Aethea delivers secure, centralized access to medical records, laboratory results, and diagnostic imaging through an intuitive, unified interface.

## 📋 Overview

Aethea is a graduation project that demonstrates enterprise-grade healthcare technology by combining modern web and mobile development with advanced security practices. The platform empowers patients to take control of their health data while providing healthcare professionals with instant access to critical medical information. By centralizing medical profiles, laboratory results, diagnostic imaging, and emergency contacts, Aethea eliminates the fragmentation that often plagues healthcare data management.

## ✨ Features

### User Management
- 🔐 **Secure Authentication** - Enterprise-grade email/password authentication protected by Cloudflare Turnstile CAPTCHA to prevent automated attacks and ensure only legitimate users access the system
- 👤 **Comprehensive Profile Management** - Maintain complete medical profiles with personal information, health metrics, and medical history, enabling informed healthcare decisions
- 🚪 **Real-Time Security** - Automatic sign-out when profiles are deleted or compromised, protecting patient data through active session monitoring

### Medical Information Management
- 💉 **Complete Medical Profile**
  - Blood type tracking for emergency situations
  - Comprehensive allergen database (18 common allergens) to prevent adverse reactions
  - Chronic condition monitoring (20 common conditions) for ongoing care management
  - Height and weight tracking for health trend analysis
  
- 🧪 **Lab Results** - Centralized access to laboratory test results, enabling patients and providers to track health metrics over time
- 🩻 **Medical Imaging** - Secure viewing and storage of X-rays and diagnostic scans, eliminating the need for physical records
- 🚨 **Emergency Contacts** - Quick access to emergency contact information when every second counts

### AI-Powered Insights (In Development)
- 🤖 **Intelligent Analysis** - AI-powered capabilities to help interpret medical data and provide actionable health insights

## 🏗️ Architecture

### Monorepo Structure
```
├── backend/          # Express.js REST API (TypeScript)
├── web/             # React web application (Vite + TypeScript)
├── mobile/          # React Native Expo app
├── shared/          # Shared authentication layer
└── supabase/        # Database migrations
```

### Technology Stack & Design Decisions

**Frontend (Web)**
- ⚛️ **React 18 with TypeScript** - Type safety and modern React features for maintainable code
- ⚡ **Vite** - Lightning-fast development builds and hot module replacement
- 🎨 **Custom CSS with Design System** - Consistent UI without framework overhead
- 🔀 **React Router v6** - Modern, type-safe client-side routing

**Frontend (Mobile)**
- 📱 **Expo SDK 54** - Rapid cross-platform development with native capabilities
- ⚛️ **React Native 0.81** - Code sharing between web and mobile frontends
- 🧭 **Expo Router** - File-based routing for intuitive navigation structure
- 🔐 **Expo SecureStore** - Hardware-backed encrypted storage for authentication tokens

**Backend**
- 🚀 **Express.js with TypeScript** - Proven, flexible REST API framework with type safety
- 🔥 **Supabase** - Managed PostgreSQL with built-in authentication and real-time capabilities
- 🏛️ **Repository Pattern + Service Layer** - Clean architecture for testable, maintainable code
- ✅ **Input Validation & Sanitization** - Protection against injection attacks and data corruption

**Database**
- 🐘 **PostgreSQL (via Supabase)** - Industry-standard relational database for complex medical data
- 🔒 **Row-Level Security (RLS)** - Database-enforced access control for HIPAA-style privacy
- 📡 **Real-time Subscriptions** - Instant updates without polling overhead
- 🔄 **Database Triggers** - Automatic profile creation and data consistency enforcement

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Supabase account (free tier available)
- Cloudflare Turnstile keys (optional, for CAPTCHA protection)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Aethea-Project/Aethea.git
   cd Aethea
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` in the root directory and fill in your credentials:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Mobile (Expo)
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Backend
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=3000
   ```

4. **Run database migrations**
   
   Execute the SQL migration in your Supabase SQL Editor:
   ```bash
   supabase/migrations/001_profiles_with_medical_fields.sql
   ```

### Running the Application

**Web Application**
```bash
cd web
npm run dev
```
The web app will be available at `http://localhost:5173`

**Backend API**
```bash
cd backend
npm run dev
```
The API will run on `http://localhost:3000`

**Mobile App**
```bash
cd mobile
npm start
```
Use the Expo Go app to scan the QR code

## 📦 Project Structure

### Shared Authentication Layer
The `shared/` package provides reusable authentication logic across web and mobile platforms:
- **Repository Pattern** - Abstracted data access layer (`AuthRepository`) isolating database operations
- **Service Pattern** - Business logic encapsulation (`AuthService`) for authentication workflows
- **Observer Pattern** - Reactive auth state management for real-time UI updates
- **Singleton Pattern** - Single Supabase client instance ensuring consistent state

### Key Files
```
shared/
├── auth/
│   ├── auth-types.ts          # TypeScript type definitions
│   ├── auth-service.ts         # Core authentication logic
│   └── auth-repository.ts      # Database operations
supabase/
└── migrations/
    └── 001_profiles_with_medical_fields.sql  # Database schema
```

## 🔒 Security Features

Healthcare data demands the highest security standards. Aethea implements multiple layers of protection:

### 1. Authentication Security
- **Password Security** - Bcrypt hashing via Supabase with configurable work factors
- **JWT Token Management** - Secure, short-lived tokens with automatic refresh
- **Session Management** - Server-side session validation and refresh handling
- **CAPTCHA Protection** - Cloudflare Turnstile integration preventing automated attacks

### 2. Database Security
- **Row-Level Security (RLS)** - PostgreSQL policies ensuring users only access their own data
- **Service Role Isolation** - Separated privileges for application vs. administrative access
- **Input Validation** - Database constraints and type checking at the schema level
- **SQL Injection Prevention** - Parameterized queries through Supabase client

### 3. Application Security
- **XSS Protection** - Input sanitization preventing malicious script injection
- **CSRF Protection** - Token-based validation for state-changing operations
- **Secure Storage** - localStorage for web, hardware-backed SecureStore for mobile
- **Auto-Logout** - Automatic sign-out on security events or profile deletion

## 📱 Roadmap

### Completed ✅
- User authentication and profile management
- Medical information tracking
- Lab results viewing
- Profile dropdown with real-time updates
- Comprehensive security implementation

### In Progress ⏳
- Medical scans viewer with advanced imaging support
- AI-powered health insights and data analysis
- Enhanced mobile application features

### Planned 📋
- Appointment scheduling system
- Secure doctor-patient messaging
- Prescription management and tracking
- Multi-language support
- Healthcare provider dashboard

## 👥 Team

**Aethea Development Team**  
*Graduation Project - Computer Science Department*  
*Academic Term 10*

This project represents the culmination of our academic journey, demonstrating proficiency in:
- Full-stack web and mobile development
- Secure healthcare data management
- Modern software architecture patterns
- Database design and security
- Cross-platform application development

---

## 📄 License

This project is developed as a graduation project for educational purposes. All rights reserved by the Aethea Development Team.

## 🤝 Contributing

This is an academic graduation project. Contributions are limited to team members and academic advisors.

## 📞 Support

For questions, feedback, or collaboration inquiries, please contact the development team through the university faculty.

---

**Version:** 1.2.0  
**Last Updated:** February 10, 2026  
**Status:** Active Development 🚧
