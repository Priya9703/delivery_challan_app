📦 Delivery Challan App

🚀 Overview

This is a mobile application built using React Native (Expo) and Supabase to manage Delivery Challans efficiently.

The app allows users to create, update, delete, and track delivery challans. It also includes an AI-powered feature to scan or upload images and automatically extract challan details.

---

✨ Features

- ✅ Create Delivery Challan
- ✏️ Edit and Update Challan
- 🗑️ Delete Challan
- 📋 View Active / Returned / Pending Challans
- 🤖 AI-based Image Scanning (Gemini API)
- 📷 Camera & Gallery Upload Support
- ⚡ Autofill form fields from scanned image

---

🛠️ Tech Stack

- React Native (Expo)
- Supabase (Database & Backend)
- Gemini AI (Image text extraction)

---

🗄️ Database Design

delivery_challans

- id (Primary Key)
- dc_number
- date
- from_details
- to_details
- is_returnable
- side_status (pending / partial / returned / non-returnable)

items

- id (Primary Key)
- dc_id (Foreign Key)
- part_name
- quantity
- notes

---

🔄 Application Flow

1. User opens Dashboard
2. Clicks "+" to create a new DC
3. User can:
   - Enter data manually
   - OR scan/upload an image
4. AI extracts details and autofills form
5. User clicks "Create DC"
6. Data stored in database
7. Dashboard updates automatically
8. User can Edit or Delete DC

---

🤖 AI Integration

The app uses Gemini AI to:

- Extract text from delivery challan images
- Identify key fields (from, to, item, quantity, notes, status)
- Autofill form fields automatically

---

▶️ How to Run

npm install
npx expo start

Open in:

- Expo Go (Mobile)
- Android Emulator
- Web Browser

---

👩‍💻 Author

Mohanapriya
