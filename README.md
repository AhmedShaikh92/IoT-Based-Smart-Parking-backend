# IoT Smart Parking System - Backend

A clean, minimal, and scalable Node.js + Express backend for managing smart parking spaces using Firebase Firestore.

## 📋 Features

- **Authentication System**: User signup/login with JWT tokens and role-based access
- **Parking Slot Management**: Create, update, and manage parking slots
- **Booking System**: Users can book available parking slots
- **Admin Dashboard**: Admin-only endpoints for managing slots and viewing statistics
- **Transactional Bookings**: Firestore transactions prevent double booking
- **Security**: Password hashing with bcrypt, JWT authentication, role-based authorization

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **CORS**: Enabled for cross-origin requests

## 📦 Installation

### Prerequisites

1. Node.js (v14 or higher)
2. Firebase project with Firestore database
3. Firebase service account credentials

### Setup Steps

1. **Clone or download the backend**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase credentials**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `serviceAccountKey.json` in the backend root directory
   - **⚠️ IMPORTANT**: Never commit `serviceAccountKey.json` to version control

4. **Create `.env` file** (copy from `.env.example`)
   ```bash
   cp .env.example .env
   ```

5. **Update `.env` with your values**
   ```
   PORT=5000
   JWT_SECRET=your-super-secret-key-here
   ADMIN_EMAIL=admin@smartparking.com  # Change to your admin email
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   ```

### Admin Configuration
   - The `ADMIN_EMAIL` environment variable defines which email receives automatic admin privileges on signup
   - Any user registering with this email will be automatically assigned the "admin" role
   - Other users register as regular "user" role
   - Admins can promote other users to admin status using the promote endpoint

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server will run on `http://localhost:5000`

## 📚 API Endpoints

### Authentication

#### POST `/auth/signup`
Register a new user. Role is automatically assigned based on email:
- If email matches `ADMIN_EMAIL` env variable → auto-promoted to admin
- Otherwise → registered as user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password"
}
```

#### POST `/auth/login`
Login and get JWT token
```json
{
  "email": "john@example.com",
  "password": "secure_password"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userId": "doc_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

### User Endpoints (Requires Authentication)

Add `Authorization: Bearer <token>` header to all requests

#### GET `/slots`
Get all parking slots
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/slots
```

#### GET `/slots/free`
Get only free parking slots
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/slots/free
```

#### POST `/slots/book`
Book a parking slot
```json
{
  "slotId": "slot_document_id"
}
```

### Admin Endpoints (Requires Authentication + Admin Role)

#### POST `/admin/promote-user`
Promote a user to admin status
```json
{
  "email": "user@example.com"
}
```
Response:
```json
{
  "success": true,
  "message": "User user@example.com has been promoted to admin.",
  "data": {
    "userId": "doc_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

#### GET `/admin/users`
Get all users in the system
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/admin/users
```
Response includes: userId, name, email, role, createdAt

#### POST `/admin/slot`
Create a new parking slot
```json
{
  "slotNumber": "A-101"
}
```

#### PATCH `/admin/slot/:id`
Update slot status (simulating IoT sensor update)
```json
{
  "status": "occupied",  // or "free"
  "bookedBy": "user_id"  // optional
}
```

#### DELETE `/admin/slot/:id`
Delete a parking slot

#### GET `/admin/bookings`
Get all parking bookings

#### GET `/admin/stats`
Get parking system statistics
```json
{
  "success": true,
  "message": "Parking statistics retrieved successfully.",
  "data": {
    "totalSlots": 50,
    "occupiedSlots": 35,
    "freeSlots": 15,
    "occupancyRate": "70.00%",
    "totalBookings": 35
  }
}
```

## 📊 Database Schema

### Collections

#### `users`
```
- id (auto-generated)
- name (string)
- email (string, unique)
- password (string, hashed)
- role (string: "user" | "admin")
- createdAt (timestamp)
```

#### `parkingSlots`
```
- id (auto-generated)
- slotNumber (string, unique)
- status (string: "free" | "occupied")
- bookedBy (string, nullable - userId)
- updatedAt (timestamp)
```

#### `bookings`
```
- id (auto-generated)
- slotId (string)
- userId (string)
- userName (string)
- bookingTime (timestamp)
- status (string: "active" | "completed")
```

## 🔒 Security Features

- ✅ Password hashing with bcryptjs (10 rounds)
- ✅ JWT authentication with 7-day expiration
- ✅ Role-based access control (RBAC)
- ✅ Firestore transaction for atomic bookings
- ✅ Input validation on all endpoints
- ✅ Duplicate booking prevention
- ✅ CORS enabled for safe cross-origin requests

## 🧪 Testing API Calls

### Using cURL

1. **Signup**
   ```bash
   curl -X POST http://localhost:5000/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "name": "John Doe",
       "email": "john@example.com",
       "password": "password123",
       "role": "user"
     }'
   ```

2. **Login**
   ```bash
   curl -X POST http://localhost:5000/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "john@example.com",
       "password": "password123"
     }'
   ```

3. **Get Slots** (use token from login response)
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/slots
   ```

### Using Postman

1. Import the API endpoints
2. Set up environment variable `{{token}}` from login response
3. Add `Authorization: Bearer {{token}}` header to protected endpoints

## 📁 Project Structure

```
backend/
├── config/
│   └── firebase.js          # Firebase initialization
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── slotController.js    # User slot operations
│   └── adminController.js   # Admin slot management
├── routes/
│   ├── auth.js              # Auth endpoints
│   ├── slots.js             # Slot endpoints
│   └── admin.js             # Admin endpoints
├── middleware/
│   └── auth.js              # JWT verification & RBAC
├── server.js                # Express app setup
├── package.json             # Dependencies
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

## 🐛 Common Issues

### "Firebase service account key not found"
- Ensure `serviceAccountKey.json` is in the backend root directory
- Check the `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`

### "Invalid token" error
- Verify JWT_SECRET in `.env` matches the one used for signing
- Check token expiration (7 days)
- Ensure token is in format: `Authorization: Bearer <token>`

### "Email already registered"
- Use a different email for signup
- Check Firestore for duplicate email entries

## 📖 Next Steps

1. Set up a frontend to consume these APIs
2. Add email verification
3. Implement logout/token blacklisting
4. Add rate limiting
5. Set up monitoring and logging
6. Deploy to production (Heroku, Firebase Functions, etc.)

## 📝 License

MIT

## 👨‍💻 Support

For issues or questions, please refer to the API documentation or check your Firestore database for data consistency.
