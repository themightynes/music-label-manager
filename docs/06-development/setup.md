# Development Setup Guide

**Music Label Manager - Local Development Environment**  
*Version: 1.0 (MVP Complete)*

---

## 🚀 Quick Start (5 minutes)

### **Prerequisites**
- **Node.js 18+** (with npm)
- **PostgreSQL** database (local or hosted)
- **Git** for version control

### **One-Command Setup**
```bash
# Clone and setup everything
git clone <repository-url>
cd music-label-manager
npm install
cp .env.example .env
# Edit .env with your database URL
npm run dev
```

**Result**: Application running at `http://localhost:5173` with hot reload

---

## 📋 Detailed Setup Instructions

### **1. Repository Setup**
```bash
# Clone the repository
git clone <repository-url>
cd music-label-manager

# Install all dependencies (client + server)
npm install

# Verify installation
npm run --silent check:deps
```

### **2. Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env  # or your preferred editor
```

**Required Environment Variables**:
```bash
# .env file configuration
DATABASE_URL="postgresql://username:password@localhost:5432/music_label_manager"
SESSION_SECRET="your-session-secret-change-in-production"
NODE_ENV="development"
PORT=5000
```

### **3. Database Setup**

#### **Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb music_label_manager

# Set database URL in .env
DATABASE_URL="postgresql://localhost:5432/music_label_manager"
```

#### **Option B: Hosted Database (Neon, Supabase, etc.)**
```bash
# Get connection string from your provider
# Example Neon URL format:
DATABASE_URL="postgresql://username:password@hostname/dbname?sslmode=require"
```

### **4. Database Migration**
```bash
# Run database migrations to create tables
npm run db:migrate

# Verify tables created
npm run db:studio  # Opens Drizzle Studio for database inspection
```

### **5. Start Development Server**
```bash
# Start both client and server in development mode
npm run dev

# Or start separately:
npm run dev:client  # Frontend only (port 5173)
npm run dev:server  # Backend only (port 5000)
```

**Development URLs**:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Database Studio**: http://localhost:4983 (when running `npm run db:studio`)

---

## 🏗️ Project Structure

```
music-label-manager/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Shared UI components
│   │   ├── pages/          # Route components
│   │   ├── store/          # Zustand state management
│   │   ├── contexts/       # React contexts
│   │   └── lib/           # Utilities and helpers
│   ├── index.html         # HTML entry point
│   └── vite.config.ts     # Vite configuration
├── server/                 # Node.js backend application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route handlers
│   ├── auth.ts            # Authentication system
│   ├── db.ts              # Database connection
│   ├── storage.ts         # Data access layer
│   └── data/             # Game content interface
├── shared/                 # Shared code between client/server
│   ├── engine/            # Game engine logic
│   ├── api/               # API contracts and client
│   ├── schema.ts          # Database schema and validation
│   └── types/             # TypeScript type definitions
├── data/                   # Game content (JSON files)
│   ├── balance.json       # Economic balance configuration
│   ├── roles.json         # Industry role definitions
│   ├── dialogue.json      # Conversation content
│   ├── artists.json       # Available artist pool
│   └── events.json        # Random events (future)
├── docs/                   # Technical documentation
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── .env                   # Environment variables (you create this)
```

---

## 🛠️ Development Scripts

### **Primary Commands**
```bash
# Development
npm run dev                 # Start both client and server with hot reload
npm run dev:client         # Start frontend only (Vite dev server)
npm run dev:server         # Start backend only (with nodemon)

# Building
npm run build              # Build both client and server for production
npm run build:client      # Build frontend only
npm run build:server      # Build backend only

# Database
npm run db:migrate         # Run database migrations
npm run db:generate        # Generate new migration files
npm run db:studio          # Open Drizzle Studio (database GUI)
npm run db:seed            # Seed database with sample data (if available)

# Code Quality
npm run lint               # Run ESLint on all TypeScript files
npm run lint:fix           # Fix auto-fixable linting issues
npm run type-check         # Run TypeScript type checking
npm run format             # Format code with Prettier

# Testing
npm run test               # Run all tests
npm run test:client        # Run frontend tests
npm run test:server        # Run backend tests
npm run test:watch         # Run tests in watch mode

# Production
npm start                  # Start production server
npm run preview            # Preview production build locally
```

### **Utility Commands**
```bash
# Dependency Management
npm run check:deps         # Check for outdated dependencies
npm run update:deps        # Update dependencies safely
npm run clean              # Clean build artifacts and node_modules

# Development Tools
npm run storybook          # Start Storybook for component development
npm run analyze           # Analyze bundle size
npm run debug             # Start server with debugger attached
```

---

## 🔧 Development Configuration

### **TypeScript Configuration**
The project uses strict TypeScript settings for maximum type safety:

```typescript
// tsconfig.json highlights
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### **ESLint Configuration**
Configured for TypeScript, React, and Node.js best practices:

```javascript
// .eslintrc.js highlights
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'react-hooks/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'prefer-const': 'error'
  }
};
```

### **Vite Configuration**
Optimized for development speed and production builds:

```typescript
// vite.config.ts highlights
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5000'  // Proxy API calls to backend
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['date-fns', 'clsx']
        }
      }
    }
  }
});
```

---

## 🗄️ Database Development

### **Schema Management**
The project uses Drizzle ORM for type-safe database operations:

```bash
# Create new migration
npm run db:generate

# Apply migrations
npm run db:migrate

# View database in browser
npm run db:studio
```

### **Schema Changes Workflow**
1. **Modify schema**: Edit `/shared/schema.ts`
2. **Generate migration**: `npm run db:generate`
3. **Review migration**: Check generated SQL in `drizzle/` folder
4. **Apply migration**: `npm run db:migrate`
5. **Verify changes**: Use `npm run db:studio` to inspect

### **Sample Data**
```bash
# Create sample game data for development
npm run db:seed

# Reset database to clean state
npm run db:reset
```

---

## 🧪 Testing Setup

### **Testing Framework**
- **Frontend**: Vitest + React Testing Library
- **Backend**: Jest + Supertest
- **E2E**: Playwright (future)

### **Running Tests**
```bash
# All tests
npm run test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm run test -- artists.test.ts
```

### **Test Structure**
```
tests/
├── client/
│   ├── components/        # Component unit tests
│   ├── hooks/            # Custom hook tests
│   └── integration/      # Integration tests
├── server/
│   ├── routes/           # API endpoint tests
│   ├── engine/           # Game engine tests
│   └── utils/            # Utility function tests
└── e2e/                  # End-to-end tests
```

---

## 🔄 Hot Reload Development

### **Frontend Hot Reload**
Vite provides instant hot module replacement:
- **Component changes**: Instant updates without losing state
- **Style changes**: Immediate CSS updates
- **Type errors**: Displayed in browser overlay

### **Backend Hot Reload**
Nodemon restarts server on file changes:
- **Route changes**: Server restarts automatically
- **Schema changes**: Manual migration required
- **Environment changes**: Manual restart required

### **Full-Stack Development**
```bash
# Terminal 1: Start full development environment
npm run dev

# Terminal 2: Watch database changes
npm run db:studio

# Terminal 3: Run tests in watch mode
npm run test:watch
```

---

## 🐛 Debugging Setup

### **VS Code Configuration**
Recommended `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/index.ts",
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests",
      "type": "node", 
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

### **Chrome DevTools**
```bash
# Start server with inspector
npm run debug

# Connect Chrome DevTools
# Open chrome://inspect in Chrome browser
```

### **Debugging Frontend**
- **React DevTools**: Browser extension for component inspection
- **Zustand DevTools**: Redux DevTools for state management
- **React Query DevTools**: Query cache inspection

---

## 📦 Production Build

### **Build Process**
```bash
# Clean previous builds
npm run clean

# Build for production
npm run build

# Preview production build locally
npm run preview

# Start production server
npm start
```

### **Build Outputs**
```
dist/
├── client/               # Frontend build (served by server)
│   ├── index.html       # Entry point
│   ├── assets/          # Bundled CSS/JS with hashes
│   └── ...              
└── server/               # Backend build
    ├── index.js         # Server entry point
    └── ...              # Compiled server files
```

### **Deployment Checklist**
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build completed successfully
- [ ] Health check endpoint responding
- [ ] Static assets served correctly

---

## 🚨 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 npm run dev:server
```

#### **Database Connection Error**
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Verify database exists
psql -l | grep music_label_manager

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### **Module Not Found**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
rm -rf node_modules/.cache
```

#### **Build Errors**
```bash
# Check TypeScript errors
npm run type-check

# Check linting errors
npm run lint

# Clean and rebuild
npm run clean && npm run build
```

### **Development Tips**

#### **Fast Development Cycle**
1. **Keep tests running**: `npm run test:watch`
2. **Use database studio**: Monitor data changes in real-time
3. **Enable React DevTools**: Inspect component state and props
4. **Use TypeScript strict mode**: Catch errors early

#### **Performance Optimization**
1. **Profile bundle size**: `npm run analyze`
2. **Monitor hot reload speed**: Large files slow down HMR
3. **Use lazy loading**: Import heavy components dynamically
4. **Optimize database queries**: Use Drizzle Studio to inspect

---

## 📚 Additional Resources

### **Documentation Links**
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Express.js Guide](https://expressjs.com/en/guide/)

### **Project-Specific Docs**
- [System Architecture](../architecture/system-architecture.md)
- [Database Design](../architecture/database-design.md)
- [API Documentation](../architecture/api-design.md)
- [Game Mechanics](../workflows/game-mechanics.md)

### **Community & Support**
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Contributing**: See CONTRIBUTING.md for contribution guidelines

---

This setup guide provides everything needed to get the Music Label Manager running locally and start contributing to the project. The development environment is optimized for productivity with hot reload, type safety, and comprehensive tooling.