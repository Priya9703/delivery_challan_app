🔄 Application Flow

📱 User Flow

1. User opens the app → Dashboard screen
2. Dashboard displays list of delivery challans
3. User clicks "+" button
4. Navigates to Create DC screen

---

🧾 Create Delivery Challan

User has two options:

🔹 Manual Entry

- Enter From, To, Item, Quantity, Notes
- Select returnable/non-returnable
- Click "Create DC"

🔹 AI Scan / Upload

- Tap "Scan / Upload Challan"
- Choose:
  - Camera
  - Gallery
- AI extracts:
  - From
  - To
  - Item
  - Quantity
  - Notes
  - Status
- Fields are auto-filled

---

🔁 After Creation

- Data is stored in database
- User redirected to Dashboard
- DC appears under correct status tab

---

✏️ Edit Flow

- User selects a DC
- Clicks Edit
- Data is pre-filled
- User updates and saves

---

🗑️ Delete Flow

- User deletes a DC
- Record removed from database
