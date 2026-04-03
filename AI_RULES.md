# AI Development Rules - EDR Laudos

This document outlines the technical stack and architectural rules for maintaining and expanding the EDR Laudos application.

## Tech Stack

- **Framework**: React 18 with TypeScript for type-safe component development.
- **Build Tool**: Vite for fast development and optimized production builds.
- **Styling**: Tailwind CSS for utility-first styling and responsive design.
- **UI Components**: shadcn/ui (Radix UI primitives) for accessible, consistent interface elements.
- **Icons**: Lucide React for a comprehensive and consistent icon set.
- **Routing**: React Router DOM (v6) for client-side navigation.
- **State Management**: React Context API for local domain state (e.g., `LaudoContext`) and TanStack Query for server-side state.
- **Forms & Validation**: React Hook Form integrated with Zod for schema-based validation.
- **PDF Generation**: jsPDF and jsPDF-AutoTable for generating technical reports.
- **Utilities**: date-fns for date manipulation and tailwind-merge for dynamic class handling.

## Library Usage Rules

### 1. UI & Styling
- **Components**: Always check `src/components/ui/` before creating new basic components. Use shadcn/ui patterns.
- **Tailwind**: Use Tailwind classes for all layouts and spacing. Avoid writing raw CSS in `.css` files unless defining global variables or complex animations in `src/index.css`.
- **Icons**: Exclusively use `lucide-react`. Do not install other icon libraries.

### 2. State & Data
- **Global State**: Use React Context for complex, multi-step processes like the Laudo creation flow.
- **API Calls**: Use TanStack Query (`@tanstack/react-query`) for all asynchronous data fetching and mutations.
- **Forms**: Use `react-hook-form`. Define validation schemas using `zod` to ensure data integrity before submission or PDF generation.

### 3. File Structure
- **Pages**: Keep top-level views in `src/pages/`.
- **Components**: Domain-specific components go in `src/components/[domain]/` (e.g., `src/components/laudo/`).
- **Utilities**: Pure functions and complex logic (like PDF generation) should reside in `src/utils/`.
- **Types**: Define shared interfaces in `src/types/`.

### 4. PDF Generation
- All PDF logic must stay in `src/utils/generateLaudoPDF.ts`.
- Maintain the established visual identity (Navy/Blue theme) using the constants defined in that file.

### 5. Best Practices
- **TypeScript**: Avoid `any`. Always define interfaces for props and state.
- **Responsiveness**: Every new UI element must be mobile-friendly using Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`).
- **Performance**: Use `URL.createObjectURL` for image previews and remember to revoke them to prevent memory leaks.