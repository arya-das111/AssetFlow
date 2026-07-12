# 🛡️ AssetFlow — Enterprise Asset & Resource Management System

AssetFlow is a high-fidelity, production-grade **Asset Lifecycle & Booking Scheduler** designed for modern corporate offices. Styled in a bespoke, premium **dark-mode wireframe/sketchbook aesthetic** (using Kalam and Outfit typography), the application combines bulletproof backend transaction-safety with a sleek, real-time frontend workspace.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgray.svg?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.12-16a34a.svg?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?style=flat-square&logo=mysql)](https://www.mysql.com/)
[![Jest](https://img.shields.io/badge/Jest-29.0-red?style=flat-square&logo=jest)](https://jestjs.io/)

---

## 🏗️ Architectural Overview

AssetFlow splits its operations into two distinct service boundaries unified under a single workspace concurrently executable dev script:

```
                  ┌───────────────────────────────────────────┐
                  │           Concurrent Dev Server           │
                  │              (npm run dev)                │
                  └─────────────────────┬─────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
       ┌────────────────────────┐              ┌────────────────────────┐
       │   React SPA (Vite)     │              │ Express REST API       │
       │   Port: 5173           │              │ Port: 4000             │
       └──────────┬─────────────┘              └────────────┬───────────┘
                  │                                         │
                  │   HTTP requests / JWT Auth headers      │
                  └─────────────────────────────────────────┼────────────────┐
                                                            ▼                │
                                               ┌────────────────────────┐    │
                                               │ Prisma Client / Engine │    │
                                               └────────────┬───────────┘    │
                                                            │                │
                                                            ▼                │
                                               ┌────────────────────────┐    │
                                               │ MySQL Local Instance   │    │
                                               │ Port: 3306             │◀───┘
                                               └────────────────────────┘
```

- **Frontend**: A React SPA bootstrapped with Vite, TypeScript, and Tailwind CSS. State synchronization is managed using custom react hooks and contextual authentication providers. It includes a custom **7-Day Scheduler Grid** aligning local browser timezone dates dynamically and rendering absolute-positioned bookings.
- **Backend**: An Express.js micro-framework parsing validation layers through **Zod**, authorizing roles via JWT middleware, and querying a MySQL relational database via **Prisma ORM**. It handles double allocations and calendar overlap blocks using database-level transactional locks (`$transaction`).

---

## 💎 Engineering Flagships (In-Depth Technical Walkthrough)

### 1. Handover Conflict Blocker (Double Allocation Guard)
* **Problem**: In physical asset logistics, assigning a device (e.g., a specific laptop) to an employee while it is already active elsewhere leads to ledger desynchronization.
* **Solution**: Implemented a transaction-level guard in [allocations.js](file:///d:/ARYA/Codes/HTML%20Programming/AssetFlow/backend/src/routes/allocations.js). When a handover request is made, a database transaction lock checks the target asset's status:
  ```javascript
  const asset = await tx.asset.findUnique({ where: { id: assetId } });
  if (asset.status === 'Allocated') {
    // Queries the active allocation to retrieve the current holder's name and department details
    const activeAlloc = await tx.allocation.findFirst({
      where: { assetId, status: 'active' },
      include: { employee: { include: { department: true } } }
    });
    throw new Error(`CONFLICT: Asset is currently allocated to ${activeAlloc.employee.name} (${activeAlloc.employee.role}) (${activeAlloc.employee.department.name}).`);
  }
  ```
* **Frontend Presentation**: Selecting an allocated asset instantly displays a **red warning card** showing who currently holds the asset and their department, disabling allocation submission and redirecting the workflow to an optional **Transfer Authorization Form**.

---

### 2. Time-Slot Overlap Blocker (Resource Scheduler)
* **Problem**: Standard calendar reservations must strictly block overlapping hours on the same physical room or projector.
* **Solution**: Handled at the database transaction layer in [bookings.js](file:///d:/ARYA/Codes/HTML%20Programming/AssetFlow/backend/src/routes/bookings.js). A booking interval $[NewStart, NewEnd)$ conflicts with an existing interval $[Start, End)$ if:
  $$\text{NewStart} < \text{End} \quad \land \quad \text{NewEnd} > \text{Start}$$
  Prisma handles this with:
  ```javascript
  const overlap = await tx.booking.findFirst({
    where: {
      resourceId: data.resourceId,
      status: 'confirmed',
      startTime: { lt: newEnd },
      endTime: { gt: newStart }
    }
  });
  ```
* **Timezone Safety**: MySQL `DATETIME` columns store timestamps literally without timezone metadata. To prevent timezone drift:
  - **Backend**: Fetches bookings on a 3-day window (`date` $\pm$ 24h) to catch early-morning and late-night bookings across all timezone offsets.
  - **Frontend**: Maps and filters dates strictly using browser-local date constructors (`new Date("YYYY-MM-DDTHH:mm:ss")` without `Z`) and formats them manually using `.getHours()` and `.getMinutes()`, ensuring card dimensions are pixel-perfect relative to the timezone-neutral timeline labels.

---

### 3. Maintenance Kanban Sync side-effects
* **Problem**: Assets undergoing repair must be flagged to automatically reject incoming booking schedules.
* **Solution**: Implemented lifecycle hooks inside [maintenance.js](file:///d:/ARYA/Codes/HTML%20Programming/AssetFlow/backend/src/routes/maintenance.js). When a maintenance ticket's state transitions:
  - `Pending` $\rightarrow$ `In Progress`: The asset's status updates to `UnderMaintenance`, blocking resource booking and physical handover.
  - `In Progress` $\rightarrow$ `Completed`: The asset is restored to `Available` (or `Allocated` if it has active handovers), releasing schedule blocks.

---

### 4. Custom Checklist Auditing
* **Problem**: Internal audits require physical inventory validation.
* **Solution**: The audit view in [Audit.tsx](file:///d:/ARYA/Codes/HTML%20Programming/AssetFlow/frontend/src/pages/Audit.tsx) registers checklist rows with outcomes: `Verified` (green), `Missing` (red), or `Damaged` (amber).
* **Discrepancy Banner**: If any item is marked `Missing` or `Damaged`, the screen triggers an **auto-generated warning banner** calculating discrepancies instantly and warning that closing the audit cycle will flag the issues in system activity logs.

---

## 🗄️ Database Architecture (Prisma Schema)

The database layers are configured to support fast, locked queries. Key relationships are illustrated in this Entity-Relationship diagram:

```mermaid
erDiagram
    DEPARTMENT ||--o{ USER : "has employees"
    DEPARTMENT ||--o{ ASSET : "cost center"
    CATEGORY ||--o{ ASSET : "classifies"
    USER ||--o{ ALLOCATION : "allocated to"
    USER ||--o{ TRANSFER : "requested by / approved by"
    USER ||--o{ BOOKING : "booked by"
    ASSET ||--o{ ALLOCATION : "allocation history"
    ASSET ||--o{ BOOKING : "schedules (if bookable)"
    ASSET ||--o{ MAINTENANCE : "repair tickets"

    USER {
        Int id PK
        String email UK
        String name
        Enum role "Admin | Manager | Head | Employee | Tech"
        Int departmentId FK
    }
    ASSET {
        Int id PK
        String assetCode UK "AF-XXXX"
        String name
        Boolean bookable
        Enum status "Available | Allocated | UnderMaintenance | Retired"
        Int categoryId FK
    }
    ALLOCATION {
        Int id PK
        Int assetId FK
        Int employeeId FK
        Enum status "active | returned"
        DateTime allocatedDate
        DateTime returnedDate
    }
    BOOKING {
        Int id PK
        Int resourceId FK
        Int bookedById FK
        DateTime startTime
        DateTime endTime
        Enum status "confirmed | cancelled"
    }
```

### composite indexes for Query Optimization
To handle concurrency and speed up lock checks on high-traffic tables, we declared composite lookup indexes on [schema.prisma](file:///d:/ARYA/Codes/HTML%20Programming/AssetFlow/backend/prisma/schema.prisma):
* `@@index([assetId, status])` on **Allocation**: Accelerates row-locking checks for double allocations.
* `@@index([resourceId, startTime, endTime])` on **Booking**: Speeds up range queries in overlap checks.

---

## 📂 Project Repository Tree

```
AssetFlow/
├── backend/
│   ├── prisma/
│   │   ├── migrations/       # SQL Migrations logs
│   │   └── schema.prisma     # Prisma Models & Composite Indexes
│   ├── src/
│   │   ├── middleware/       # JWT Auth Guards & Roles Validator
│   │   ├── routes/           # REST APIs (allocations, bookings, etc.)
│   │   ├── utils/            # DB Client instance
│   │   └── server.js         # Express App Entry & Main Router
│   ├── tests/
│   │   └── conflict.test.js  # Jest Integration Conflict/Overlap Tests
│   └── package.json
├── frontend/
│   ├── public/               # Favicon & icons
│   ├── src/
│   │   ├── components/       # ProtectedRoute, Sidebar layouts
│   │   ├── context/          # AuthSession handler
│   │   ├── pages/            # 10 Dashboard Views (Assets, Scheduler, Reports...)
│   │   ├── App.tsx           # Router mappings
│   │   └── index.css         # Styling, custom fonts, dark theme variables
│   ├── vite.config.ts
│   └── package.json
├── package.json              # Workspace script (npm run dev)
└── .gitignore                # Root workspace ignore list
```

---

## ⚡ Setup & Installation

### Prerequisites
- Node.js (v18+)
- MySQL database instance running on port `3306`

### 1. Database Setup
1. Create a local MySQL database named `assetflow`.
2. Configure credentials inside `backend/.env` (reusing user-specified password `2006`):
   ```env
   DATABASE_URL="mysql://root:2006@localhost:3306/assetflow"
   JWT_SECRET="super-secret-auth-key-key-key"
   PORT=4000
   ```
3. Run database pushes and seeds inside the `backend/` folder:
   ```bash
   cd backend
   npx prisma db push
   npx prisma db seed
   ```
   *Note: Seeding script also executes raw SQL checks to register the `chk_time_order` database table check constraint (`start_time < end_time`).*

### 2. Booting the Application
You can launch both development servers concurrently from the root directory:
```bash
# From workspace root
npm install
npm run dev
```
- **React Frontend**: http://localhost:5173/
- **Express Backend**: http://localhost:4000/

### 3. Login Cheat-Sheet (Demo Seeds)
All seeded users share the password `2006`:
* **Admin**: `admin@assetflow.com`
* **Asset Manager**: `manager@assetflow.com`
* **Department Head**: `head@assetflow.com`
* **Employee**: `employee@assetflow.com`

---

## 🧪 Automated Testing

We verify conflict validations using Jest and `supertest` inside `backend/tests/conflict.test.js`:
```bash
# Run tests inside backend
cd backend
npm test
```
The test suite validates:
1. Double-allocation request blocking (returns 409 Conflict).
2. Time slot overlap requests on bookable resources (returns 409 Conflict).
