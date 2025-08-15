# Music Label Manager

## Overview

Music Label Manager is a browser-based turn-based simulation game where players run their own record label through 12 monthly turns. Players sign and develop artists, manage industry relationships, create music projects, and make strategic decisions to build their label's reputation and success. The game features a monthly action system where players select up to 3 focus areas per turn, manage resources (money, reputation, creative capital), and navigate industry relationships through dialogue-driven meetings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Component-based UI using modern React patterns with TypeScript for type safety
- **Vite Build System**: Fast development and optimized production builds with hot module replacement
- **ShadCN UI Components**: Comprehensive design system built on Radix UI primitives with Tailwind CSS styling
- **Zustand State Management**: Lightweight state management with persistence middleware for game state
- **React Query**: Server state management for API communications and caching
- **Wouter Router**: Minimal client-side routing solution

### Backend Architecture
- **Express.js Server**: RESTful API server with middleware for request logging and error handling
- **Node.js Runtime**: Modern ESM modules with TypeScript compilation via TSX
- **Drizzle ORM**: Type-safe database interactions with PostgreSQL dialect
- **Session-based Storage**: Game state persistence with multiple save slots

### Game Engine Design
- **Turn-based Progression**: Monthly advancement system with 3-action slots per turn
- **Resource Management**: Money, reputation, and creative capital as core currencies
- **Dialogue System**: Role-based meetings with branching choices and immediate/delayed effects
- **Project Lifecycle**: Singles, EPs, and tours with quality, budget, and timeline tracking
- **Market Simulation**: Seeded RNG for consistent outcomes based on quality, access tiers, and marketing

### Database Schema
- **Game States**: Core game progression with monthly statistics tracking
- **Artists**: Three archetypes (Visionary, Workhorse, Trendsetter) with mood, loyalty, and popularity metrics
- **Projects**: Music releases and tours with budget allocation and quality scoring
- **Roles**: Eight industry relationships (Manager, A&R, Producer, PR, Digital, Streaming, Booking, Operations) with access levels
- **Monthly Actions**: Player choice tracking with focus slot management

### UI/UX Patterns
- **Dashboard Layout**: Modular card-based interface showing KPIs, projects, and artists
- **Modal Dialogues**: Immersive conversation system with choice consequences display
- **Progress Tracking**: Visual indicators for project completion and monthly advancement
- **Toast Notifications**: Real-time feedback for resource changes and game events

## External Dependencies

### Database
- **PostgreSQL**: Primary data persistence via Neon serverless connection
- **Drizzle Kit**: Database migrations and schema management

### Frontend Libraries
- **Radix UI**: Accessible component primitives for modals, dropdowns, and form controls
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Font Awesome**: Icon library for UI consistency
- **TanStack React Query**: Server state synchronization and caching
- **React Hook Form**: Form validation and submission handling

### Development Tools
- **TypeScript**: Static typing across client and server code
- **Vite**: Development server with HMR and production bundling
- **ESBuild**: Fast TypeScript compilation for server deployment
- **Replit Integration**: Development environment compatibility with runtime error overlay

### Game Data
- **Seedrandom**: Deterministic random number generation for consistent game outcomes
- **Date-fns**: Date manipulation for monthly progression calculations
- **Zod**: Runtime schema validation for API requests and database operations

The application uses a monorepo structure with shared schema definitions between client and server, enabling type-safe communication and consistent data validation across the full stack.