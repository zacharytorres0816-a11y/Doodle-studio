

# Doodle Studio System -- Complete Rebuild Plan

## Overview

This is a major restructure transforming the current simple template-based photo editor into a full order management system with two main tabs: **Projects** and **Cashier**, connected by an automated order-to-project pipeline.

---

## Phase 1: Database Schema Migration

Create new tables and modify existing ones to support the full workflow.

### New Tables

**orders** -- Central order record created by cashier
- `id` (UUID, PK)
- `customer_name` (text, required)
- `grade` (text, required)
- `section` (text, required)
- `package_type` (integer: 2 or 4)
- `design_type` (text: 'standard' or 'custom')
- `standard_design_id` (text, nullable)
- `included_raffles` (integer, default 1)
- `additional_raffles` (integer, default 0)
- `total_raffles` (integer, computed)
- `raffle_cost` (numeric)
- `package_base_cost` (numeric)
- `total_amount` (numeric)
- `payment_method` (text: 'cash' or 'gcash')
- `gcash_reference` (text, nullable)
- `order_status` (text: 'pending_photo' | 'photo_uploaded' | 'editing' | 'completed' | 'packed' | 'delivered')
- `photo_status` (text: 'awaiting' | 'uploaded' | 'editing' | 'completed')
- `order_date` (timestamptz, default now())
- `photo_uploaded_date` (timestamptz, nullable)
- `project_completed_date` (timestamptz, nullable)
- `packed_date` (timestamptz, nullable)
- `delivery_date` (timestamptz, nullable)
- `delivery_recipient` (text, nullable)
- `delivery_notes` (text, nullable)
- `created_at` / `updated_at` (timestamptz)

**raffle_entries** -- One row per raffle ticket
- `id` (UUID, PK)
- `order_id` (UUID, FK to orders)
- `customer_name`, `grade`, `section` (denormalized for display)
- `raffle_number` (integer)
- `is_winner` (boolean, default false)
- `won_at` (timestamptz, nullable)
- `created_at` (timestamptz)

**raffle_winners** -- Winner log
- `id` (UUID, PK)
- `entry_id` (UUID, FK to raffle_entries)
- `order_id` (UUID, FK to orders)
- `customer_name`, `grade`, `section`
- `won_at` (timestamptz)
- `prize_details` (text, nullable)

### Modify Existing `projects` Table

Add columns:
- `order_id` (UUID, FK to orders, nullable)
- `customer_name` (text)
- `grade` (text)
- `section` (text)
- `package_type` (integer)
- `design_type` (text)
- `status` (text: 'awaiting_photo' | 'in_progress' | 'completed', default 'awaiting_photo')
- `thumbnail_url` (text, nullable)
- `photo_uploaded_at` (timestamptz, nullable)
- `last_edited_at` (timestamptz, nullable)
- `completed_at` (timestamptz, nullable)

All new tables get RLS policies allowing full access (prototype mode, no Supabase Auth).

---

## Phase 2: Application Architecture -- Two Main Tabs

### New Route Structure

```text
/                  --> Login
/projects          --> Projects Tab (gallery organized by grade/section)
/projects/upload/:projectId  --> Upload image for a pending project
/editor/:projectId --> Editor (loads project data from DB)
/cashier           --> Cashier Tab with 4 sub-tabs
/cashier/new-order
/cashier/raffle
/cashier/order-progress
/cashier/delivery
```

### Navigation Layout

After login, users see a top-level tab bar:
- **Projects** tab
- **Cashier** tab

Within Cashier, a secondary tab bar with 4 sub-tabs.

---

## Phase 3: Projects Tab

### Projects Gallery (`src/pages/Projects.tsx`)

- Fetches all projects from DB, grouped by `grade` + `section`
- Collapsible section headers showing count
- Two card types:
  - **Pending card** (status = 'awaiting_photo'): Shows "+" icon, customer name, grade/section, package type, order time, "Awaiting Photo" badge
  - **Active/Completed card**: Shows thumbnail, customer info, status badge, Edit and Mark Complete buttons
- Sorted within groups: Awaiting Photo first, then In Progress, then Completed; chronological within each status
- Color-coded borders (red = awaiting, yellow = in progress, green = completed)
- Filter bar: by grade, section, status, package type, design type, date range
- Search by customer name or order ID

### Upload Flow (`src/pages/Upload.tsx` -- modified)

- Clicking a pending card navigates to `/projects/upload/:projectId`
- Shows customer info summary alongside upload area
- After upload, image stored via Lovable Cloud storage bucket
- "Continue to Editor" navigates to `/editor/:projectId`

### Editor Enhancements (`src/pages/Editor.tsx` + `PhotoFrame.tsx`)

- Loads project data from DB (not sessionStorage)
- Header shows customer name, grade/section, package type, order ID
- **Zoom**: `zoomLevel` state (25%-400%), zoom controls (+/-/reset), Ctrl+scroll support, CSS `transform: scale()` with coordinate adjustment
- **Brush-style eraser**: Uses `globalCompositeOperation = 'destination-out'`; records eraser strokes as elements; adjustable tip size via brush size slider
- **Undo/Redo**: Element history stack
- Save updates project status and order status in DB; generates thumbnail

---

## Phase 4: Cashier Tab

### Sub-tab 1: Add New Order (`src/pages/cashier/NewOrder.tsx`)

Order form with sections:
- **Customer Info**: Name, Grade, Section
- **Package Selection**: Package 2 or Package 4 (radio/card UI)
- **Design Selection**: Standard (with design picker) or Custom
- **Raffle Add-on**: Shows included raffle (1), additional raffle selector with limits based on package, price calculation
- **Payment Method**: Cash or GCash (with optional reference number)
- **Order Summary**: Calculated totals

On submit:
1. Insert into `orders` table
2. Auto-create pending project in `projects` table
3. Auto-create raffle entries in `raffle_entries` table
4. Show success message
5. Clear form

### Sub-tab 2: Raffle (`src/pages/cashier/Raffle.tsx`)

- **Raffle Wheel**: Animated spinning wheel with customer names as segments (CSS/canvas animation)
- **Participants List**: Table of all raffle entries with filters
- **Controls**: Spin, Reset, Export Winners, View History
- Winner selection writes to `raffle_winners` and updates `raffle_entries`

### Sub-tab 3: Order Progress (`src/pages/cashier/OrderProgress.tsx`)

- Orders grouped by grade/section (collapsible)
- Each order card shows: ID, customer, package, design, date, amount, payment method, raffle count, photo status
- Actions: View Details, Edit Info, Check Project Status (link), Mark as Packed (enabled only when project completed)
- "Mark as Packed" moves order to Delivery tab (updates `order_status` to 'packed', sets `packed_date`)
- Filter/search/sort controls

### Sub-tab 4: Delivery (`src/pages/cashier/Delivery.tsx`)

- Shows only packed orders, grouped by grade/section
- Each card: Order ID, customer, package, dates, payment method
- "Delivery Complete" button with confirmation modal (recipient name, notes, timestamp)
- Marks order as 'delivered', sets `delivery_date`, removes from active view

---

## Phase 5: File Storage

Create a Lovable Cloud storage bucket `project-images` for:
- Uploaded photos (referenced by URL in `projects.photo_url`)
- Generated thumbnails (referenced by URL in `projects.thumbnail_url`)

This replaces the current `sessionStorage` + base64 approach.

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Projects.tsx` | Projects gallery with grouping, filtering, search |
| `src/pages/cashier/CashierLayout.tsx` | Cashier tab layout with 4 sub-tabs |
| `src/pages/cashier/NewOrder.tsx` | Order creation form |
| `src/pages/cashier/Raffle.tsx` | Raffle wheel and participant management |
| `src/pages/cashier/OrderProgress.tsx` | Order tracking with Mark as Packed |
| `src/pages/cashier/Delivery.tsx` | Delivery queue with completion marking |
| `src/components/projects/ProjectCard.tsx` | Reusable project card (pending + active states) |
| `src/components/projects/ProjectFilters.tsx` | Filter/search bar for projects |
| `src/components/cashier/OrderForm.tsx` | Order form component |
| `src/components/cashier/OrderSummary.tsx` | Order summary display |
| `src/components/cashier/RaffleWheel.tsx` | Animated spinning wheel |
| `src/components/cashier/OrderCard.tsx` | Order card for progress/delivery |
| `src/components/layout/MainLayout.tsx` | Top-level layout with Projects/Cashier tabs |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | New route structure with MainLayout, remove template routes |
| `src/pages/Editor.tsx` | Load from DB, add zoom controls, show customer info |
| `src/pages/Upload.tsx` | Load project from DB, upload to storage bucket, remove templateId |
| `src/components/editor/PhotoFrame.tsx` | Accept zoom prop, brush-style eraser, coordinate scaling |
| `src/index.css` | Additional styles for status colors, raffle wheel |

### Files to Remove/Replace

| File | Reason |
|------|--------|
| `src/pages/Gallery.tsx` | Replaced by `Projects.tsx` |

### Database Migration

Single SQL migration covering:
1. Create `orders` table with all fields
2. Create `raffle_entries` table
3. Create `raffle_winners` table
4. Alter `projects` table to add new columns
5. RLS policies for all new tables (open access for prototype)
6. Create `project-images` storage bucket

### Implementation Order

1. Database migration (schema + storage bucket)
2. Main layout with tab navigation
3. Cashier -- New Order form (this drives everything)
4. Projects gallery (reads orders/projects)
5. Upload flow (storage-backed)
6. Editor enhancements (zoom, eraser, DB persistence)
7. Order Progress sub-tab
8. Delivery sub-tab
9. Raffle system (wheel + management)

