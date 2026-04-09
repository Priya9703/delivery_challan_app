🤖 API Integration

📌 Overview

The application integrates Gemini AI to extract structured data from delivery challan images.

---

🔍 AI Processing Flow

1. User selects image (Camera / Gallery)
2. Image is sent to Gemini API
3. AI analyzes image and extracts text
4. Structured data returned:

- from
- to
- item
- quantity
- notes
- status

5. Data is automatically filled into form fields

---

⚙️ Implementation

- Image is converted to suitable format
- Sent to Gemini API endpoint
- Response parsed into usable JSON format
- Fields updated in UI

---

⚠️ Error Handling

- If no text found → Show alert
- If API fails → Show error message
- If partial data → Fill available fields only

---

🚀 Benefits

- Reduces manual data entry
- Improves accuracy
- Enhances user experience
