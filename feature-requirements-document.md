# Event Registration System – Project Requirements

## Goal
Build a lightweight and secure event registration system for youth in Sierra Leone.  
Participants purchase access codes offline and use them to unlock the online registration form.  
After registration, a unique QR code is generated for event entry and sent by email.  
An admin page tracks code usage and participant details.

---

## Key Features

### 1. Participant Flow
- **Access Code Validation**
  - User goes to the website and clicks **Register**.
  - Registration form is visible but cannot be submitted until a valid access code is entered.
  - Only unused codes are accepted.

- **Registration Form**
  - Fields:
    - Full Name  
    - Phone Number  
    - Email Address  
    - Age  
    - Occupation  
    - Primary Track of Interest (dropdown: *Innovation & Entrepreneurship, Leadership Development, Networking*)  
    - Access Code  
    - Checkbox: *I agree to the Terms & Conditions and Privacy Policy* (required)  

- **Form Submission**
  - Once form is submitted with a valid code:
    - Code is marked as **used**.
    - User info is saved in the database.
    - A one-time **QR code** is generated.
    - Confirmation email is sent with:
      - Thank-you note
      - Event details
      - Attached/linked QR code

- **QR Code**
  - Unique to each participant.
  - Used for check-in at the event gate.
  - Can be re-downloaded from the admin page if lost.

---

### 2. Admin Flow
- **Admin Page (No Authentication)**
  - Displays a table of all access codes.
  - Columns:
    - Name
    - Phone
    - Email
    - Age
    - Occupation
    - Track of Interest
    - Access Code
    - Status: `Not Registered` / `Registered`
    - Download QR (only visible when registered)
  - Ability to download participant’s QR code in case they lose it.

---

### 3. Security
- Access codes:
  - Must be **randomly generated**, unique, and difficult to guess.
  - Example: `8-12 character alphanumeric string (e.g., X9F4-AB72-QJ3L)`
- Codes can only be used once (marked as used after registration).
- QR codes are one-time and tied to participant records.

---

### 4. Notifications
- **Email Notifications**
  - Sent automatically after successful registration.
  - Includes:
    - Participant’s name
    - Event details (date, venue, time)
    - QR code (as attachment or link)
  - Sent using a lightweight mail service (e.g., Nodemailer with Gmail/SMTP).

---

## Tech Stack
- **Frontend:** HTML, CSS, Vanilla JS (simple, fast, lightweight)
- **Backend:** Node.js + Express
- **Database:** MongoDB (stores codes and participant data)
- **QR Code Generation:** `qrcode` npm package
- **Email Sending:** mailgun 

---

## Deliverables
1. **Participant Registration Flow**
   - Code-gated registration form
   - QR code generation and download
   - Email confirmation with QR code

2. **Admin Page**
   - Real-time list of code usage and participant info
   - Status updates after registration
   - Download button for QR codes

3. **Access Code Management**
   - Securely pre-generated codes stored in DB
   - Codes marked as used upon registration

---

## Out of Scope
- Online payment integration
- Authentication system for admin
- SMS notifications

---

## Success Criteria
- Participants can only register with a valid, unused code.
- Registration form captures all required participant details.
- QR codes are unique, delivered by email, and scannable at the event gate.
- Admin can view and export participant details + QR codes easily.
- System remains simple, fast, and secure.
```

Do you want me to also draft a **sample confirmation email template** in Cole Schafer’s style (short, warm, and human) so it feels less robotic?
