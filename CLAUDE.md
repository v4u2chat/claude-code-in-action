# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language, Claude generates them via tool calls, and they render in a sandboxed iframe — all without writing to disk.

## Commands

```bash
npm run setup        # First-time: install deps + generate Prisma client + run migrations
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run db:reset     # Reset SQLite database
```

**Environment:** Copy `.env` and set `ANTHROPIC_API_KEY`. Without it, the app falls back to a mock provider returning static component code.

## Architecture

### Request Flow

```
User message → POST /api/chat → Claude (streamText, maxSteps: 40)
                                    ↓ tool calls
                              str_replace_editor / file_manager
                                    ↓ tool results
                              VirtualFileSystem (in-memory Map)
                                    ↓ onFinish
                              Prisma (if authenticated)
                                    ↓
                        FileSystemContext → PreviewFrame + CodeEditor
```

### Virtual File System

All file operations happen in memory — no disk writes. `src/lib/file-system.ts` provides a Map-based FS with `createFile`, `updateFile`, `deleteFile`, `rename`, `serialize`, and `deserialize`. Projects persist the serialized FS as JSON in Prisma's `data` field.

### AI Tools

Two tools operate on the virtual FS:
- **`str_replace_editor`** (`src/lib/tools/str-replace.ts`): view, create, str_replace, insert operations
- **`file_manager`** (`src/lib/tools/file-manager.ts`): rename and delete files/directories

The system prompt lives in `src/lib/prompts/generation.tsx`.

### Preview System

`PreviewFrame.tsx` uses Babel standalone (client-side) to transform JSX, generates an ESM import map pointing to `esm.sh` CDN for React/DOM, and renders in a sandboxed iframe. Hot reload triggers on `refreshTrigger` prop changes.

### State Management

Two React contexts wrap the app:
- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`): file tree, selected file, CRUD ops
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`): messages, AI submission state

`handleToolCall()` in ChatContext bridges tool results to FileSystemContext updates.

### Authentication

JWT sessions (7-day) stored in HTTP-only cookies. `src/lib/auth.ts` handles token creation/verification. Middleware at `src/middleware.ts` protects routes. Anonymous work is tracked via localStorage (`src/lib/anon-work-tracker.ts`) and can be claimed on sign-up.

### Database

Prisma + SQLite with two models:
- **User**: id, email, passwordHash
- **Project**: id, name, userId, messages (JSON string), data (JSON string — serialized FS)

## Key Conventions

- `"use client"` / `"use server"` directives are used throughout — server actions live in `src/actions/`
- Path alias `@/*` → `src/*`
- shadcn/ui components in `src/components/ui/`; feature components in `src/components/{chat,editor,preview,auth}/`
- Tests co-located in `__tests__/` folders alongside components, using Vitest + React Testing Library
- Tailwind CSS v4 with CSS variables for theming — no hardcoded styles
