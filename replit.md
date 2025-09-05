# SKU Store - Product Information Management Platform

## Overview

SKU Store is a centralized product information management (PIM) platform that serves as the single source of truth for all product and brand-related data, content, and assets. Built as a full-stack web application, it enables brand owners and retailers to register brands, manage product catalogs, store media assets, and syndicate content across multiple channels. The platform supports brand ownership governance, retailer-specific content layering, and scalable product data management for DTC, marketplaces, and retail partners.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Custom component library built with Radix UI primitives and styled with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming, following shadcn/ui design system patterns
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Build System**: esbuild for production bundling, tsx for development
- **File Uploads**: Multer for handling multipart form data and media assets
- **Session Management**: Express sessions with PostgreSQL session store

### Authentication & Authorization
- **Provider**: Replit Auth using OpenID Connect (OIDC)
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Strategy**: Passport.js with OpenID Connect strategy
- **User Management**: Role-based access control (brand_owner, retailer, content_team)

### Database Schema Design
- **Users**: Central user management with roles and profile information
- **Brands**: Brand registry with ownership, metadata, and categorization
- **Products**: Product catalog with SKU management, variants, and status tracking
- **Media Assets**: Centralized asset storage with product/brand associations
- **Product Relationships**: Support for product families, bundles, and associations
- **Brand-Retailer Relations**: Licensed seller permissions and scoped access

### Data Architecture Patterns
- **Shared Schema**: Common TypeScript types and Zod schemas shared between client and server
- **Type Safety**: End-to-end type safety from database to UI components
- **Validation**: Centralized validation using Zod schemas for both client and server
- **Migrations**: Drizzle-kit for database schema migrations and version control

## External Dependencies

### Database & Infrastructure
- **Primary Database**: PostgreSQL via Neon Database (@neondatabase/serverless)
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Store**: PostgreSQL session storage via connect-pg-simple

### Authentication Services
- **Identity Provider**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with secure cookie configuration
- **Authentication Flow**: OAuth 2.0/OIDC with Passport.js integration

### UI & Design System
- **Component Library**: Radix UI primitives for accessible, unstyled components
- **Styling Framework**: Tailwind CSS with custom design tokens
- **Icon Library**: Lucide React for consistent iconography
- **Form Validation**: Zod for runtime type validation and schema definition

### Development & Build Tools
- **Package Manager**: npm with lockfile version 3
- **Build System**: Vite for frontend, esbuild for backend production builds
- **Development Server**: Vite dev server with hot module replacement
- **TypeScript**: Strict mode with comprehensive type checking
- **Linting & Formatting**: TSConfig with strict compiler options

### File & Media Handling
- **File Uploads**: Multer middleware for handling multipart form data
- **Media Storage**: Local file system storage (uploads directory)
- **File Validation**: MIME type validation for images and videos

### Development Environment Integration
- **Replit Integration**: Vite plugins for Replit development environment
- **Error Handling**: Runtime error overlay for development
- **Hot Reloading**: Development server with file watching and automatic rebuilds