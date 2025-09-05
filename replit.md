# Overview

This is a full-stack web application for file submission management, built with a modern tech stack including React frontend, Express.js backend, and PostgreSQL database. The application appears to be designed for healthcare institutions (hospitals) to submit and track file submissions across different categories and locations. The interface is in Korean, suggesting it's tailored for Korean healthcare organizations.

The application features a clean, responsive UI built with shadcn/ui components and Tailwind CSS, providing functionality for file uploads, categorization by hospital locations (안양, 구로, 안산, 기타), and real-time submission tracking with status management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Routing**: Wouter for lightweight client-side routing instead of React Router
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives for accessibility and consistency
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Runtime**: Node.js with TypeScript and ES modules
- **Framework**: Express.js with middleware for JSON parsing, URL encoding, and request logging
- **Database ORM**: Drizzle ORM for type-safe database operations with PostgreSQL
- **File Handling**: Multer middleware for file uploads with disk storage and file type validation
- **Development Server**: Vite integration for hot module replacement and development builds

## Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle migrations with schema defined in TypeScript
- **Storage Strategy**: Dual storage approach - in-memory storage for development/testing and PostgreSQL for production
- **Tables**: 
  - Users table with authentication support
  - File submissions table with hospital, category, content, file metadata, and status tracking

## File Upload System
- **Storage**: Local disk storage in uploads directory with unique filename generation
- **Validation**: File type restrictions (JPEG, PNG, GIF, PDF) and 10MB size limit
- **Metadata**: Tracks original filename, file path, and file size for each submission

## Authentication & Session Management
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **User Management**: Basic user creation and retrieval with username/password authentication

## Development Environment
- **Build System**: Vite for frontend bundling with React plugin and runtime error overlay
- **TypeScript**: Strict configuration with path mapping for clean imports
- **Development Tools**: tsx for TypeScript execution, esbuild for production builds
- **Code Quality**: ESM modules throughout the stack for modern JavaScript practices

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Environment Configuration**: DATABASE_URL environment variable for database connectivity

## UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **shadcn/ui**: Pre-built component library based on Radix UI with consistent styling
- **Lucide React**: Icon library for consistent iconography throughout the application

## Development and Build Tools
- **Vite**: Fast build tool and development server with HMR support
- **Replit Integration**: Custom Vite plugins for Replit environment compatibility
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer plugins

## File Processing
- **Multer**: Multipart form data handling for file uploads
- **Date-fns**: Date manipulation and formatting with Korean locale support

## Validation and Type Safety
- **Zod**: Runtime type validation for API endpoints and form data
- **Drizzle-Zod**: Integration between Drizzle ORM and Zod for schema validation

## Styling and Theming
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Class Variance Authority**: Type-safe variant handling for component styling
- **clsx**: Conditional className utility for dynamic styling

## Fonts and Typography
- **Google Fonts**: Noto Sans KR for Korean text support, plus additional font families for varied typography needs