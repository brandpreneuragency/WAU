# Uniform Manager

A B2B SaaS application for managing staff uniforms, inventory, and orders. Built for hotels and restaurants.

## Features

- **Multi-tenant Architecture**: Data isolation between different businesses
- **Inventory Management**: Track stock levels with low stock alerts
- **Staff Management**: Manage employees and uniform assignments
- **Manage Departments/Positions**: Admins can preview and bulk-update department or position values across staff and inventory via a tenant-scoped server-side action (Edge Function) to safely reassign or mark values as unassigned
- **Smart Cart with MOQ**: Minimum Order Quantity (3 units) enforcement
- **One-Click Restock**: Quickly reorder low-stock items
- **Responsive Design**: Works on desktop and mobile with Soft UI design system

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **UI Library**: Lucide React (icons)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **State Management**: React Context (Cart)
- **Deployment**: Hostinger (Shared Hosting/VPS)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd wau
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
```bash
copy .env.example .env
```

4. Add your Supabase credentials to `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

To create a production build:

```bash
npm run build
```

This will create a `dist/` folder with all static files ready for deployment.

## Deployment to Hostinger

### Step 1: Build the Project
```bash
npm run build
```

### Step 2: Upload to Hostinger

1. Log in to your Hostinger control panel
2. Navigate to **File Manager** or use FTP
3. Go to the `public_html` folder (or your subdomain folder)
4. **Delete** any existing files in the folder (backup first if needed)
5. **Upload** all contents from the `dist/` folder to `public_html/`

**Important**: Upload the *contents* of `dist/`, not the `dist` folder itself.

### Step 3: Configure SPA Routing (.htaccess)

Create or edit the `.htaccess` file in your `public_html` folder with the contents from `public/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

This ensures that all routes (like `/inventory`, `/shop`) work correctly as a Single Page Application.

### Step 4: Set Environment Variables

For Hostinger deployment, you need to handle environment variables differently since Vite embeds them at build time:

1. Before building, update `.env` with production values
2. Build the project
3. The values are now embedded in the static files

For better security, consider:
- Using a backend proxy for sensitive operations
- Implementing proper RLS policies in Supabase

---

## Deployment — GitHub Pages (recommended for frontend)

This repository is configured to build and deploy the static frontend to **GitHub Pages** via GitHub Actions. The workflow will run on `main` by default and publish the `dist/` output.

Key notes:
- The build requires the Vite environment variables listed under **Repository secrets** below. Add them to the repository before enabling the workflow.
- Supabase Edge Functions (in `supabase/functions/`) are not deployed to GitHub Pages — deploy them separately to your Supabase project using the `supabase` CLI or Supabase dashboard.

How to enable:
1. Create a GitHub repository and push this project to `main`.
2. Add the required repository Secrets (see below).
3. The workflow `.github/workflows/pages.yml` will automatically build and deploy when you push to `main`.

### Repository secrets (Actions → Secrets & variables)
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

> Note: `.env` has been removed from source control for safety. Provide runtime/build values via GitHub repository Variables/Secrets.

---


## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx      # App shell with navigation
│   ├── Card.jsx        # Soft UI card component
│   ├── StatWidget.jsx  # Dashboard stat cards
│   ├── Badge.jsx       # Status badges
│   └── CartDrawer.jsx  # Shopping cart panel
├── contexts/
│   └── CartContext.jsx # Cart state management
├── lib/
│   └── supabaseClient.js # Supabase configuration
├── pages/
│   ├── DashboardPage.jsx
│   ├── InventoryPage.jsx
│   ├── ShopPage.jsx

├── App.jsx
├── main.jsx
└── index.css           # Tailwind + Soft UI styles
```

## Database Schema

The application uses the following Supabase tables:

- `tenants` - Business accounts
- `profiles` - User accounts with role assignments
- `inventory` - Stock items
- `staff` - Employee records
- `assignments` - Uniform assignments to staff
- `orders` - Purchase orders
- `order_items` - Individual order lines

Row Level Security (RLS) policies ensure data isolation between tenants.

## Design System

**Soft UI Principles:**
- Background: `bg-gray-50` (#F9FAFB)
- Cards: White with `rounded-3xl` (24-30px radius)
- Shadows: Soft diffuse shadows (`shadow-soft`, `shadow-soft-md`)
- Buttons: Full pill shape (`rounded-full`)
- Inputs: Light gray background (`bg-gray-100`), no borders
- Typography: Inter or Plus Jakarta Sans

## License

MIT
