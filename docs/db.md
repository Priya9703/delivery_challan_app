🗄️ Database Design

📌 Overview

The application uses Supabase as the backend database to store delivery challans and related item details.

---

🧾 Table: delivery_challans

Column Name| Type| Description
id| UUID| Primary Key
dc_number| Text| Unique challan number
date| Timestamp| Creation date
from_details| Text| Sender information
to_details| Text| Receiver information
is_returnable| Boolean| Returnable status
side_status| Text| pending / partial / returned / non-returnable
user_id|UUID

---

📦 Table: items

Column Name| Type| Description
id | UUID| Primary Key
dc_id| UUID| Foreign Key (delivery\*challans.id)
part_name| Text| Item name
quantity| Number| Quantity
notes| Text| Additional notes
user_id|UUID

---

🔗 Relationship

- Delivery Challan → Items
  Linked using "dc_id"
- Delivery Challan → User
  Linked using "user_id"(references auth.users.id)
- Items → User
  Linked using "user_id"(references auth.users.id)

⚙️ Data Flow

1. Create DC → Insert into delivery_challans
2. Insert item → Linked using dc_id
3. Fetch DCs → Join with items table
