# CharHub

**AI-Powered Roleplay Platform**

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](https://github.com/leandro-br-dev/charhub)
[![Backend](https://img.shields.io/badge/node-20.x-green.svg)](https://nodejs.org/)
[![Frontend](https://img.shields.io/badge/react-19.x-blue.svg)](https://react.dev/)

---

## Overview

**CharHub** is a comprehensive AI-powered roleplay platform that enables users to create, customize, and interact with AI characters through real-time conversations. The platform serves as a centralized hub for AI-driven roleplay content, offering an immersive chat experience with fully customizable characters.

### What is CharHub?

CharHub allows users to:
- **Create AI Characters**: Build unique personalities with detailed descriptions, visual styles, and backstories
- **Chat in Real-Time**: Have immersive conversations with AI characters using advanced language models
- **Tell Stories**: Create narrative stories featuring multiple characters in collaborative scenarios
- **Manage Visual Assets**: Organize and use visual assets (clothing, accessories, hairstyles, etc.)
- **Build Scenes**: Create detailed environments with furniture, vehicles, and props for roleplay scenarios

### Unique Value Proposition

| Aspect | Description |
|---------|-------------|
| **Unlimited Creativity** | AI-powered automatic character and story generation from text descriptions or images |
| **Total Immersion** | Real-time chat with deeply personalized characters and rich contexts |
| **Advanced Customization** | From visual appearance to personality, history, and communication style |
| **Content Ecosystem** | Robust visual assets, stories, and scenes for creating complex worlds |
| **Universal Access** | Freemium model allowing free experimentation with premium options for dedicated users |
| **Cutting-Edge AI** | Integration with the best AI models in the market (Gemini, OpenAI, Grok) |
| **Safety & Moderation** | Advanced content classification system for different age groups |

---

## Features

### Characters System
- Manual character creation
- AI-powered automatic generation (description + image)
- Multiple image types (avatar, cover, sample, stickers)
- Content classification (age rating, warning tags)
- Favorites system
- Full character editing
- Multiple visual styles (anime, realistic, cartoon, etc.)

### Chat System
- Real-time WebSocket chat
- Conversation history
- Multi-member conversations
- Rich chat interface with multimedia support
- Advanced "prompt engineering" system

### Stories System
- Story creation with characters
- AI-powered automatic story generation
- Character roles in stories (main/secondary)
- Story favorites
- Story editing

### Assets System
- Complete visual asset management
- Categories: clothing, accessory, scar, hairstyle, object, weapon, vehicle, furniture
- Tag-based organization
- Asset favorites
- LoRA integration (Learning Rate Adapters)

### Scenes System
- Scene creation and management
- Scene-specific assets (furniture, vehicles, props)
- Scene favorites
- Scene visual styles

### Subscription System
- 3 plans: Free, Plus, Premium
- Monthly credit system
- Daily login bonuses
- Resources per plan tier
- Stripe and PayPal integration

### Internationalization
- Complete translation system
- Build-time translation file generation
- Multi-language support
- Automatic translation middleware

### Admin System
- Analytics dashboard
- Administrative scripts
- System configuration
- LLM catalog
- Translation management

### AI System
- Proxy for multiple LLM providers
- Model catalog with different performance profiles
- Content classification system
- Autocomplete agents for characters
- AI response style guides

### Authentication & Security
- OAuth (Google, Facebook)
- JWT sessions
- Role system (BASIC, PREMIUM, ADMIN, BOT)
- Authentication middleware
- Premium endpoint protection

---

## Tech Stack

### Backend
```
Node.js 20
├── Express.js (Web Framework)
├── NestJS (Application Framework)
├── Prisma (ORM)
├── PostgreSQL 16 (Database)
├── Redis (Cache & Sessions)
├── BullMQ (Job Queue)
├── Socket.io (Real-time Communication)
├── Passport.js (Authentication)
├── Pino (Logging)
├── Sharp (Image Processing)
├── Zod (Validation)
└── Stripe + PayPal (Payments)
```

### Frontend
```
React 19
├── TypeScript
├── Vite (Build Tool)
├── Tailwind CSS (Styling)
├── React Router DOM (Routing)
├── TanStack Query (Data Fetching)
├── i18next + react-i18next (i18n)
├── Headless UI + Lucide React (UI Components)
├── React Hook Form (Forms)
├── Socket.io Client (Real-time)
└── Country Flag Icons (Icons)
```

### Infrastructure
```
Docker + Docker Compose
├── Nginx (Reverse Proxy)
├── Cloudflare Tunnel (Secure Access)
├── PostgreSQL 16 (Database)
└── Redis 7 (Cache)
```

### LLM Providers
- Google Gemini (multiple versions)
- OpenAI (GPT-4 variants)
- XAI Grok

---

## Project Structure

```
charhub-agent-01/
├── backend/                 # TypeScript API (NestJS, Prisma)
│   ├── prisma/            # Database schema and migrations
│   ├── src/
│   │   ├── agents/        # AI agents for autocomplete
│   │   ├── controllers/    # Route controllers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   └── translations/    # i18n source files
│   └── package.json
│
├── frontend/               # React SPA (Vite, Tailwind)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages with colocation
│   │   ├── services/       # API clients
│   │   ├── types/         # TypeScript types
│   │   └── i18n.ts        # i18n configuration
│   └── package.json
│
├── nginx/                  # Reverse proxy configuration
├── docker-compose.yml       # Full stack orchestration
└── README.md              # This file
```

---

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/leandro-br-dev/charhub.git
cd charhub

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start services
docker compose up --build

# The application will be available at:
# - Frontend (Nginx): http://localhost:8401
# - Backend API: http://localhost:8001
```

### Development

```bash
# Backend development
cd backend
npm install
npm run dev

# Frontend development
cd frontend
npm install
npm run dev

# Generate translations (after modifying source files)
cd backend
npm run build:translations
```

---

## Documentation

Comprehensive documentation is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [Agent Overview](docs/01-getting-started/agent-overview.md) | Multi-agent system guide |
| [System Overview](docs/04-architecture/system-overview.md) | Architecture and system design |
| [How-To Guides](docs/02-guides/README.md) | Development and deployment guides |
| [Roadmap](docs/05-business/roadmap/README.md) | Strategic plan and feature priorities |

---

## Competitive Advantages

1. **Visual Styles System**: Sophisticated management of checkpoints and LoRAs for image generation in different styles
2. **Content Moderation**: Robust age rating and content tagging system for safe content
3. **Modular Architecture**: Designed for expansion as a modular game universe
4. **Scalable Infrastructure**: Docker-based with support for multiple environments
5. **User Experience**: Modern, responsive interface with component colocation
6. **Native Internationalization**: Built-in translation system for global scale

---

## License

Proprietary - All rights reserved

---

**CharHub** - The definitive platform for AI-powered roleplay creativity.
