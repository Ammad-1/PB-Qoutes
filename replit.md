# Overview

Printberry Quote App is a full-stack quoting and inventory management system for a printing business. The application allows users to manage customers, products, suppliers, print methods, and generate detailed quotes with PDF export functionality. It features a simplified quote builder interface for easy data entry and professional PDF generation with direct download capability.

## Recent Changes (October 2025)

- **Simplified Quote Builder**: Streamlined interface with essential fields only (product, print method, quantity, unit price, description)
- **Manual Entry Support**: Users can enter custom product names and print methods without selecting from dropdowns
- **PDF Download**: Clients can download quote PDFs directly to their computer from the History page
- **Professional PDF Layout**: Modern design with blue header, alternating row colors, and clear sections
- **Express v5 Compatibility**: Fixed wildcard route syntax for production deployment ('/*splat')
- **Database Migration**: Made product_id and print_method_id nullable to support manual entry
- **Fixed Pricing Mode**: Corrected manual_unit pricing mode to prevent 500 errors when using manual entries

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 18 with Vite as the build tool

**Routing**: React Router DOM v6 for client-side navigation

**Styling**: Tailwind CSS with PostCSS for utility-first styling

**HTTP Client**: Axios for API communication

**Development Server**: Vite dev server running on port 5000 with proxy configuration to backend API (proxies `/api` requests to `http://localhost:5001`)

**Build Output**: Static files that can be served from the backend in production

## Backend Architecture

**Framework**: Express.js v5

**Runtime**: Node.js with CommonJS module system

**API Structure**: RESTful API with modular route handlers organized by resource type:
- `/api/customers` - Customer CRUD operations
- `/api/products` - Product and supplier management
- `/api/print-methods` - Print method configuration with tiered pricing
- `/api/quotes` - Quote creation, management, and calculations
- `/api/pdf` - PDF generation for quotes
- `/api/settings` - Application-wide settings

**Middleware**:
- CORS enabled for cross-origin requests
- JSON body parser with 5MB limit
- URL-encoded body parser
- Custom database middleware (attaches `db` and `paths` to request object)

**Port Configuration**: 
- Development: 5001
- Production: 5000

**File Upload**: Multer for handling CSV/Excel imports

## Data Storage

**Database**: SQLite3 with file-based storage (`backend/db/printberry.sqlite`)

**Schema Management**: SQL schema file (`backend/db/schema.sql`) executed on startup with migration support for adding columns dynamically

**Key Tables**:
- `customers` - Customer information
- `products` - Product catalog
- `suppliers` - Product suppliers with pricing tiers
- `print_methods` - Available print methods with base costs
- `print_method_tiers` - Quantity-based pricing tiers for print methods
- `quotes` - Quote headers with customer reference and metadata
- `quote_lines` - Individual line items in quotes
- `settings` - Application-wide configuration (VAT, markup, quote prefix, etc.)

**Database Utilities**:
- `reset.js` - Drops database and clears quote files
- `seed.js` - Initializes schema (minimal seeding for clean start)

**JSON Aggregation**: Uses SQLite's `json_group_array` for embedding related records (suppliers, tiers) in single queries to reduce round-trips

## File Storage

**Quote PDFs**: Generated PDFs stored in `/Quotes` directory, named by quote number

**Directory Creation**: Automatic creation of required directories (`db/`, `Quotes/`) on startup if missing

## Business Logic

**Quote Number Generation**: Auto-generated with format `{prefix}-{year}-{sequence}` (e.g., "Q-2024-001")

**Pricing Calculations**:
- Product unit cost from selected supplier
- Print method costs: per-colour or per-unit based
- Tiered pricing support (applies lowest tier >= quantity)
- Markup percentage applied to total cost
- VAT calculation on marked-up price
- Delivery costs (flat or per-pack based)
- Dual pricing modes: "auto" (calculated) or "manual" (user override)

**PDF Generation**: PDFKit library creates formatted quote documents with:
- Company header and customer details
- Itemized line items table
- Cost breakdowns (subtotal, delivery, VAT, total)
- Two-column layout for professional appearance

**Data Import**: CSV/Excel parsing support using PapaParse and node-xlsx for bulk product/customer imports

## Development Workflow

**Concurrent Development**: Uses `concurrently` package to run frontend and backend servers simultaneously with single `npm run dev` command

**Hot Reload**: 
- Frontend: Vite HMR
- Backend: Nodemon watches for changes

**Environment Variables**: Dotenv for configuration management

**Build Process**: Frontend builds to static files, backend serves them in production mode

# External Dependencies

## Core Runtime
- **Node.js**: JavaScript runtime for backend
- **SQLite3**: Embedded relational database (no external database server required)

## Backend Libraries
- **Express**: Web framework for API routing and middleware
- **CORS**: Cross-origin resource sharing middleware
- **Multer**: Multipart form data handling for file uploads
- **PDFKit**: PDF document generation
- **PapaParse**: CSV parsing
- **node-xlsx**: Excel file parsing
- **dotenv**: Environment variable management

## Frontend Libraries
- **React**: UI component library
- **React Router DOM**: Client-side routing
- **Axios**: Promise-based HTTP client
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Build tool and dev server

## Development Tools
- **Nodemon**: Auto-restart backend on file changes
- **Concurrently**: Run multiple npm scripts simultaneously
- **Autoprefixer/PostCSS**: CSS processing for Tailwind

## Notes
- No external authentication service (appears to be internal tool)
- No external API integrations for payments or third-party services
- All data persists locally in SQLite file
- No cloud storage dependencies