# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 4 application called "statuszen-app" built with Nuxt UI Pro components and Supabase authentication. It's a modern full-stack Vue.js application with TypeScript support.

## Development Commands

### Core Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run generate` - Generate static site
- `npm run preview` - Preview production build

### Code Quality
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking with Nuxt
- `npm run postinstall` - Prepare Nuxt (runs automatically after install)

### Testing
No test framework is currently configured.

## Architecture

### Technology Stack
- **Framework**: Nuxt 4 (Vue 3 + TypeScript)
- **UI Library**: Nuxt UI Pro with custom styling
- **Authentication**: Supabase Auth with GitHub OAuth
- **Styling**: Tailwind CSS via Nuxt UI
- **Icons**: Iconify with Lucide and Simple Icons

### Project Structure
- `app/` - Main application directory (Nuxt 4 structure)
  - `app.vue` - Root layout with header/footer and auth logic
  - `app.config.ts` - UI configuration and design tokens
  - `pages/` - File-based routing
  - `components/` - Vue components (LogoPro, TemplateMenu)
  - `assets/css/` - Global styles

### Key Configuration Files
- `nuxt.config.ts` - Main Nuxt configuration with modules and routing
- `eslint.config.mjs` - ESLint configuration using Nuxt's built-in setup
- `tsconfig.json` - TypeScript configuration with Nuxt references

## Authentication Architecture

The app uses Supabase for authentication with the following flow:
- **Login/Signup**: `/auth/login` page with email/password and GitHub OAuth
- **Auth State**: Managed via `useSupabaseClient()` and `useSupabaseUser()` composables
- **Route Protection**: User redirects handled in auth pages via `watchEffect`
- **Logout**: Available in header component

## UI System

### Design Tokens
- Primary color: Blue
- Secondary color: Orange  
- Neutral color: Slate
- Components use rounded styling (rounded-full buttons)

### Component Architecture
- Built on Nuxt UI Pro components (UApp, UHeader, UMain, UFooter, etc.)
- Custom styling via `app.config.ts` slots system
- Icon system using Iconify with Lucide and Simple Icons

## Database & Tools

### Supabase Integration
This project has a **Supabase MCP (Model Context Protocol) server** available. When working with database operations:
- **ALWAYS prefer the Supabase MCP** for database queries, table management, and data operations
- Use MCP functions like `mcp__supabase__execute_sql`, `mcp__supabase__list_tables`, etc.
- The database includes tables: `monitors`, `organizations`, `user_profiles`, `organization_members`, `organization_invitations`
- Job scheduler system uses the `monitors` table for scheduling and tracking

### Database Schema
The `monitors` table includes all necessary fields for the job scheduler:
- `id`, `organization_id`, `name`, `url`, `type`, `config`
- `check_interval_minutes`, `preferred_region`, `is_active`
- `last_scheduled_at`, `next_check_at` (scheduler timestamps)
- `created_at`, `updated_at`

## Development Notes

### Module Configuration
The app uses these Nuxt modules:
- `@nuxt/eslint` - Built-in ESLint integration
- `@nuxt/ui-pro` - Premium UI components  
- `@nuxtjs/supabase` - Supabase integration

### Styling Configuration
- ESLint configured with stylistic rules (no trailing commas, 1tbs brace style)
- Route rules set for homepage prerendering
- Supabase redirect disabled in config

### Dependencies
Uses resolution override for `unimport: "4.1.1"` to address compatibility issues.