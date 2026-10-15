# 📚 BookBridge – Digital Public Library and Book Exchange System

A modern, full-stack web application designed for students, educators, and community members to discover, donate, borrow, return, and exchange physical and digital books.

---

## 🌟 Highlights & Key Features

### 1. 🔐 Authentication & Role-Based Access Control (RBAC)
- Secure user registration and login with **Flask-Login** and **Werkzeug password hashing**.
- Distinct permissions for **Community Members** and **Head Librarians (Admins)**.
- User profile management with personal reading bio, contact info, and security controls.

### 2. 🏛️ Digital Library Catalog
- Curated collection of books with high-resolution covers, publication details, ISBNs, and genre classification.
- Real-time inventory tracking: counts available copies vs. checked-out copies.
- Advanced multi-filter search (by title, author, genre, or ISBN) and sorting (newest, alphabetical).
- Paginated catalog navigation.
- Dedicated book detail view displaying individual physical copies (`BK-0001-C1`), shelf locations, and condition ratings.

### 3. 🎁 Book Donation Pipeline
- Members can donate books by submitting title, author, category, condition (`New`, `Like New`, `Good`, `Fair`), and optional cover artwork.
- **Admin review workflow**: Librarians approve or reject donations.
- Upon approval, the book is automatically registered in the public library catalog with an active barcode for circulation.
- Donors receive real-time notifications with librarian feedback notes.

### 4. 📖 Book Borrowing & Return Workflow
- Readers can request available book copies for custom durations (7, 14, 21, or 28 days).
- **Collision prevention**: Prevents double-booking or simultaneous duplicate loans of the same copy.
- Librarian approval step transforms requests into active borrowing transactions.
- Automated due date calculation and overdue status tracking.
- **Return verification**: Members submit return requests with condition notes; librarians inspect and confirm the return, immediately returning the copy to `available` status for other readers.

### 5. 🔄 Peer-to-Peer Book Exchange Market
- Direct member-to-member book swapping platform.
- Users list books they own along with a wishlist of books they are looking for.
- Other readers propose swaps with their offered book, condition, and personal message.
- Listing owners can accept or decline offers.
- **Conflict prevention**: Accepting one swap automatically marks the listing as `exchanged` and safely closes all conflicting pending requests.

### 6. 📊 Admin Control Center & Analytics
- Comprehensive KPI cards: Total Cataloged Titles, Available Copies, Active Loans, Overdue Books, Pending Reviews, Registered Readers.
- **Interactive Recharts**:
  - Monthly circulation trends (borrowings vs. donations vs. exchanges).
  - Category breakdown distribution.
- Catalog CRUD: Add new books with initial batch copies, edit metadata, delete records, or add extra physical copies.
- Overdue books tracker highlighting delinquent loans and days overdue.
- User permission management (promote/demote user roles).

### 7. 🔔 In-App Notification Center
- Reactive notification bell with unread counter.
- Automatic alerts triggered by loan approvals, return confirmations, overdue warnings, exchange proposals, and donation status updates.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, Lucide React Icons |
| **Data Visualization** | Recharts (Responsive Bar, Area, and Pie charts) |
| **Backend** | Python 3.14 / 3.x, Flask 3.1 |
| **Database & ORM** | SQLite 3, Flask-SQLAlchemy (SQLAlchemy 2.x) |
| **Authentication** | Flask-Login, Werkzeug Security, HTTP-only SameSite session cookies |
| **API Architecture** | RESTful JSON APIs with Vite dev-server reverse proxying |

---

## 📁 Project Structure

```
bookbridge/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory, CORS, blueprints, error handlers
│   │   ├── models.py            # SQLAlchemy models (User, Book, Copy, Loan, Exchange, etc.)
│   │   ├── utils.py             # Admin decorators, notification dispatchers
│   │   └── routes/
│   │       ├── auth.py          # Register, login, logout, me, profile, password
│   │       ├── books.py         # Catalog search, filter, CRUD, copy management
│   │       ├── categories.py    # Genre taxonomies
│   │       ├── borrowings.py    # Loan requests, approval, transactions
│   │       ├── returns.py       # Return submission and librarian confirmation
│   │       ├── donations.py     # Community book drive submissions and approvals
│   │       ├── exchanges.py     # Peer swap listings, proposals, accept/decline
│   │       ├── admin.py         # Admin overview KPIs, user management, charts
│   │       ├── notifications.py # User notification center
│   │       └── stats.py         # Public library statistics and featured picks
│   ├── config.py                # Application configuration & session settings
│   ├── run.py                   # Backend entry point with auto-seeding
│   ├── seed_data.py             # Rich realistic public library database seeder
│   ├── requirements.txt         # Python package dependencies
│   └── .env.example             # Environment variable template
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Responsive header with branding and notifications
│   │   │   ├── Footer.jsx           # Library footer with categories & mission
│   │   │   ├── BookCard.jsx         # Book presentation card with spine glow
│   │   │   ├── NotificationBell.jsx # Notification drawer with unread counter
│   │   │   ├── StatusBadge.jsx      # Color-coded status pills
│   │   │   ├── Modal.jsx            # Accessible animated dialogs
│   │   │   ├── Pagination.jsx       # Catalog page navigation
│   │   │   └── ProtectedRoute.jsx   # Role and auth router guard
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Hero, live stats, popular books, genres, how it works
│   │   │   ├── DigitalLibrary.jsx   # Catalog search, genre filters, availability toggle
│   │   │   ├── BookDetail.jsx       # Full book metadata, copies inventory, borrow action
│   │   │   ├── DonateBook.jsx       # Book donation form, librarian review explanation
│   │   │   ├── ExchangeMarket.jsx   # Peer-to-peer exchange listings & proposal modals
│   │   │   ├── AdminDashboard.jsx   # KPI overview, charts, catalog CRUD, approvals
│   │   │   ├── UserProfile.jsx      # Loans, return actions, donation history, swap offers
│   │   │   ├── Login.jsx            # Sign in with 1-click demo credentials
│   │   │   └── Register.jsx         # New member registration
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Auth state and methods
│   │   │   └── NotificationContext.jsx # Toast messages and in-app alerts
│   │   ├── services/
│   │   │   └── api.js               # Centralized REST API client
│   │   ├── App.jsx                  # Main router and layout
│   │   ├── main.jsx                 # Client entry point
│   │   └── index.css                # Tailwind directives and custom scrollbars
│   ├── index.html                   # HTML template with Google Fonts (Newsreader & Sans)
│   ├── vite.config.js               # Vite config with /api reverse proxy
│   ├── tailwind.config.js           # Library theme (cream, forest green, parchment)
│   ├── postcss.config.js
│   └── package.json
└── README.md                        # Documentation
```

---

## 🚀 Quickstart & Installation Instructions

### Prerequisites
- **Python 3.10+** (Tested on Python 3.14)
- **Node.js v18+** & **npm** (Tested on Node.js v24)

---

### Step 1: Start the Backend (Flask API)

1. Open a terminal and navigate to the backend directory:
   ```powershell
   cd C:\Users\ayush\.gemini\antigravity\scratch\bookbridge\backend
   ```

2. Ensure dependencies are installed (already verified):
   ```powershell
   python -m pip install -r requirements.txt
   ```

3. Launch the server:
   ```powershell
   python run.py
   ```
   > **Note**: On first startup, the database `bookbridge.db` will be created automatically and populated with realistic sample data (books, copies, categories, active loans, and exchanges).
   > The backend will be live at: **`http://127.0.0.1:5000`**

---

### Step 2: Start the Frontend (Vite + React)

1. Open a second terminal window and navigate to the frontend directory:
   ```powershell
   cd C:\Users\ayush\.gemini\antigravity\scratch\bookbridge\frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```

4. Open your browser and visit:
   ```
   http://localhost:5173
   ```
   *(Requests to `/api/*` are automatically forwarded to `http://127.0.0.1:5000` via the Vite proxy with full session credentials).*

---

## 🔑 Pre-Configured Demo Accounts

For instant testing and presentation, you can use the **1-Click Fill** buttons on the login page or enter these credentials:

| Role | Email | Password | Description |
|---|---|---|---|
| **Head Librarian (Admin)** | `admin@bookbridge.org` | `admin123` | Full access to Admin Console, Catalog CRUD, Approvals, Charts |
| **Member (Sarah)** | `sarah@example.com` | `user123` | Has active loans, overdue notice, and active book exchange listing |
| **Member (Marcus)** | `marcus@example.com` | `user123` | Has active loans, approved donation, and pending return request |
| **Member (Priya)** | `priya@example.com` | `user123` | High school educator with completed exchanges |

---

## 📡 API Reference Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new member account | No |
| `POST` | `/api/auth/login` | Login with email and password | No |
| `POST` | `/api/auth/logout` | End session | Yes |
| `GET` | `/api/auth/me` | Current authenticated user profile | Optional |
| `GET` | `/api/stats/public` | Public stats and featured books for Home | No |
| `GET` | `/api/books` | Search, filter, and paginate catalog | No |
| `GET` | `/api/books/<id>` | Full book details with copy inventory | No |
| `POST` | `/api/books` | Add a book with initial copies | Admin |
| `PUT` | `/api/books/<id>` | Update catalog record | Admin |
| `DELETE` | `/api/books/<id>` | Remove book record | Admin |
| `POST` | `/api/donations` | Submit book donation | Yes |
| `PATCH` | `/api/donations/<id>/status` | Approve or reject donation | Admin |
| `POST` | `/api/borrowings/request` | Request available book copy | Yes |
| `PATCH` | `/api/borrowings/requests/<id>/review` | Approve/reject loan request | Admin |
| `POST` | `/api/returns/request` | Submit book return | Yes |
| `POST` | `/api/returns/confirm/<id>` | Confirm returned book copy | Admin |
| `GET` | `/api/exchanges/listings` | Community book exchange market | No |
| `POST` | `/api/exchanges/listings` | Post book for trade | Yes |
| `POST` | `/api/exchanges/requests` | Propose book swap | Yes |
| `POST` | `/api/exchanges/requests/<id>/respond` | Accept or reject swap offer | Yes (Owner) |
| `GET` | `/api/admin/overview` | Admin KPI statistics | Admin |
| `GET` | `/api/admin/charts` | Recharts time-series & genre data | Admin |

---

## 🎨 Design System & Philosophy

- **Warm Cream Background**: `#FDFBF7` and `#FAF6EE` provide the tactile warmth of physical library reading rooms and reduce eye strain.
- **Deep Forest Green Accents**: `#1B4332` and `#2D6A4F` convey wisdom, trust, and academic heritage.
- **Parchment Cards & Subtle Shadows**: White and cream cards with book spine shadows (`box-shadow: 2px 0 8px rgba(0,0,0,0.15) inset`).
- **Typography Pairing**: Newsreader serif font for editorial elegance combined with Plus Jakarta Sans for UI readability.
- **Accessible & Responsive**: Fully responsive across mobile smartphones, tablets, and large desktop monitors.

---

## 🛡️ Security & Integrity

- Passwords hashed using PBKDF2 with SHA-256 via Werkzeug.
- Role-based `@admin_required` decorators guarding sensitive library management operations.
- Prevention of duplicate borrowings or multiple simultaneous claims on the same book copy.
- Conflict resolution on peer book exchanges (safely closing competing offers once one is accepted).
- Clean JSON error responses without leaking internal stack traces.

---

Developed with ❤️ for community literacy and public knowledge sharing.
