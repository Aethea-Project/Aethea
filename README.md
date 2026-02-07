# Aethea Medical Platform 🏥

A comprehensive medical platform designed to streamline healthcare management for patients and medical professionals. Aethea provides secure access to medical records, lab results, and medical scans in one unified platform.

## 📋 Overview

Aethea is a graduation project that combines modern web and mobile technologies to deliver a seamless healthcare experience. The platform enables users to manage their medical profiles, view lab results, access medical scans, and maintain emergency contact information.

## ✨ Features

### User Management
- 🔐 **Secure Authentication** - Email/password authentication with Cloudflare Turnstile CAPTCHA
- 👤 **Profile Management** - Complete medical profile with personal and health information
- 🚪 **Auto-Logout on Profile Deletion** - Real-time monitoring with automatic sign-out

### Medical Information
- 💉 **Medical Profile**
  - Blood type tracking
  - Selectable allergies (18 common allergens)
  - Selectable chronic conditions (20 common conditions)
  - Height and weight tracking
  
- 🧪 **Lab Results** - View and track laboratory test results
- 🩻 **Medical Scans** - Access X-rays and imaging records
- 🚨 **Emergency Contact** - Store emergency contact information

### Security & Privacy
- 🔒 Row-Level Security (RLS) policies
- 🛡️ Input sanitization and XSS protection
- 🔑 Secure password requirements (lowercase, number, special chars)
- 🎫 CAPTCHA protection against bots

## 🏗️ Architecture

### Monorepo Structure
```
├── backend/          # Express.js REST API (TypeScript)
├── web/             # React web application (Vite + TypeScript)
├── mobile/          # React Native Expo app
├── shared/          # Shared authentication layer
└── supabase/        # Database migrations
```

### Tech Stack

**Frontend (Web)**
- ⚛️ React 18 with TypeScript
- ⚡ Vite for fast development
- 🎨 Custom CSS with design system
- 🔀 React Router v6

**Frontend (Mobile)**
- 📱 Expo SDK 54
- ⚛️ React Native 0.81
- 🧭 Expo Router for navigation
- 🔐 Expo SecureStore for tokens

**Backend**
- 🚀 Express.js with TypeScript
- 🔥 Supabase for authentication & database
- 🏛️ Repository Pattern + Service Layer
- ✅ Input validation & sanitization

**Database**
- 🐘 PostgreSQL (via Supabase)
- 🔒 Row-Level Security (RLS)
- 📡 Real-time subscriptions
- 🔄 Auto-profile creation triggers

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Cloudflare Turnstile keys (optional, for CAPTCHA)

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
Use Expo Go app to scan the QR code

## 📦 Project Structure

### Shared Authentication Layer
The `shared/` package contains reusable authentication logic:
- **Repository Pattern** - Data access layer (`AuthRepository`)
- **Service Pattern** - Business logic (`AuthService`)
- **Observer Pattern** - Auth state management
- **Singleton Pattern** - Supabase client

### Key Files
- `shared/auth/auth-types.ts` - TypeScript type definitions
- `shared/auth/auth-service.ts` - Core authentication logic
- `shared/auth/auth-repository.ts` - Database operations
- `supabase/migrations/` - Database schema and migrations

## 🔒 Security Features

1. **Authentication**
   - Secure password hashing (bcrypt via Supabase)
   - JWT token management
   - Session refresh handling
   - CAPTCHA protection

2. **Database Security**
   - Row-Level Security (RLS) policies
   - Service role isolation
   - Input validation and constraints
   - SQL injection prevention

3. **Application Security**
   - XSS protection via input sanitization
   - CSRF protection
   - Secure token storage (localStorage for web, SecureStore for mobile)
   - Auto-logout on security events

## 📱 Features Roadmap

- ✅ User authentication and profile management
- ✅ Medical information tracking
- ✅ Lab results viewing
- ✅ Profile dropdown with real-time updates
- ⏳ Medical scans viewer
- ⏳ Appointment scheduling
- ⏳ Doctor-patient messaging
- ⏳ Prescription management

## 👥 Team

**Aethea Development Team**
- Graduation Project - Term 10

## 📄 License

This project is developed as a graduation project for educational purposes.

## 🤝 Contributing

This is a graduation project, and contributions are currently limited to team members.

## 📞 Support

For questions or issues, please contact the development team.

---

**Version:** 1.1.1  
**Last Updated:** February 7, 2026  
**Status:** Active Development 🚧
