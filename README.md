# CalX Backend

<div align="center">

[![Website](https://img.shields.io/badge/Website-calxio.vercel.app-blue?style=for-the-badge)](https://calxio.vercel.app/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue)](LICENSE)

**Production-ready backend for CalX IoT device and web dashboard.**

🌐 **[CalX Website](https://calxio.vercel.app/)**

![CalX Dashboard](https://github.com/Saijayaranjan/CalX-Frontend/blob/main/public/images/Website.png?raw=true)

</div>

---

## Features

- **REST API** for device and web dashboard communication
- **Multi-provider AI integration**: OpenAI, Anthropic (Claude), Gemini, DeepSeek, Perplexity, Groq, OpenRouter
- **Device binding** with secure token authentication
- **Real-time chat** between device and web dashboard
- **File sync** (TXT files up to 4000 characters)
- **OTA updates** with battery gating (>30%)
- **AI response sanitization** (markdown stripping, math symbol conversion, safe chunking)

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (web) + Device Tokens
- **Deployment**: Docker, Vercel, or any Node.js hosting

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Docker)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Saijayaranjan/calx-backend.git
cd calx-backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your database URL and secrets
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/calx
JWT_SECRET=your-jwt-secret
PORT=3001
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Device
- `POST /device/bind/request` - Get bind code
- `GET /device/bind/status` - Check binding status
- `POST /device/heartbeat` - Send device status

### Chat & Files
- `GET /device/chat` - Fetch messages
- `POST /device/chat/send` - Send message
- `GET /device/file` - Get synced file

### AI
- `POST /device/ai/query` - Send AI prompt

### OTA
- `GET /device/update/check` - Check for updates
- `GET /device/update/download` - Download firmware

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repo to Vercel
2. Add environment variables
3. Deploy!

### Docker

```bash
docker build -t calx-backend .
docker run -p 3001:3001 calx-backend
```

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Part of the CalX Ecosystem**

🌐 [CalX Website](https://calxio.vercel.app/) • [Frontend](https://github.com/Saijayaranjan/CalX-Frontend) • [Firmware](https://github.com/Saijayaranjan/CalX-Fireware)

</div>
