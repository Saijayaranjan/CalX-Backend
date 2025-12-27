# CalX Backend

Production-ready backend for CalX IoT device and web dashboard.

![CalX Dashboard](https://raw.githubusercontent.com/Saijayaranjan/CalX-Frontend/main/public/images/Website.png)

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
git clone https://github.com/yourusername/calx-backend.git
cd calx-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values
```

### Configure Environment

Edit `.env` with your configuration:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/calx
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
DEVICE_TOKEN_SECRET=your-device-token-secret-min-32-characters

# AI Providers (configure the ones you use)
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_AI_API_KEY=xxx
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### Using Docker

```bash
# Start all services (PostgreSQL + Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## API Documentation

- **OpenAPI Spec**: `docs/openapi.yaml`
- **Health Check**: `GET /health`

### Authentication

**Web Routes** (`/web/*`)
```bash
# Include JWT token in header
Authorization: Bearer <jwt_token>
```

**Device Routes** (`/device/*`)
```bash
# Include device token in header
Authorization: Bearer dev_tok_<token>
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/web/auth/register` | POST | Register user |
| `/web/auth/login` | POST | Login user |
| `/device/bind/request` | POST | Request bind code |
| `/web/bind/confirm` | POST | Confirm device binding |
| `/device/heartbeat` | POST | Device status update |
| `/device/chat` | GET | Fetch messages |
| `/device/ai/query` | POST | AI query |
| `/device/update/check` | GET | Check for updates |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=bind
```

## Project Structure

```
src/
├── config/          # Environment configuration
├── lib/             # Prisma client
├── middleware/      # Auth, error handling, validation
├── routes/
│   ├── device/      # Device endpoints
│   └── web/         # Web dashboard endpoints
├── services/        # Business logic
├── types/           # TypeScript types
└── utils/           # Helpers (logger, crypto, validators)
```

## Constraints

| Limit | Value |
|-------|-------|
| Chat message | ≤ 2500 chars |
| AI input | ≤ 2500 chars |
| AI output chunk | ≤ 2500 chars |
| File content | ≤ 4000 chars |
| Bind code TTL | 300 seconds |
| OTA minimum battery | > 30% |

## AI Sanitization Pipeline

AI responses are processed through:

1. **Strip code blocks** - Remove fenced code blocks and inline code
2. **Strip markdown** - Remove headers, bold, italic, links
3. **Convert math symbols**:
   - `√` → `sqrt()`
   - `∫` → `Integral of`
   - `∑` → `Sum of`
   - `π` → `pi`
   - `∞` → `infinity`
4. **Safe chunking** - Split at sentence boundaries, never inside parentheses

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Use Supabase for PostgreSQL database

### Docker

```bash
# Build image
docker build -t calx-backend .

# Run container
docker run -p 3000:3000 --env-file .env calx-backend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT
