# Architecture Documentation

**Last Updated**: 2025-12-05

---

## 📋 Overview

This section contains architectural decisions, system design, and technical explanations for CharHub.

---

## 📂 Contents

- **[System Overview](./system-overview.md)** - High-level architecture and components
- **[Database Schema](./database-schema.md)** - Prisma schema organization and design
- **[Architecture Decisions](./architecture-decisions.md)** - ADRs and technical decisions

---

## 🏛️ System Architecture

CharHub is built as a full-stack application with the following components:

### Frontend
- React 18 + TypeScript
- Vite build system
- TanStack Query for data fetching
- Zustand for state management

### Backend
- Node.js + Express
- Prisma ORM (PostgreSQL)
- OpenAI API integration
- PayPal API integration
- WebSocket for real-time features

### Infrastructure
- Docker Compose for local development
- Google Cloud Platform (production)
- Cloudflare Tunnel (CDN + HTTPS)
- GitHub Actions (CI/CD)

---

## 🎯 Key Design Principles

1. **Multi-Agent Architecture** - Separate agents for development and operations
2. **Type Safety** - TypeScript everywhere
3. **Database-First** - Prisma schema as source of truth
4. **API-Driven** - RESTful API with clear contracts
5. **Real-Time** - WebSocket for live updates

---

## 📖 Related Documentation

- [Getting Started](../01-getting-started/)
- [Deployment Guide](../02-guides/deployment/)
- [API Reference](../03-reference/api/)

---

[← Back to Documentation Home](../README.md)
