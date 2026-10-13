# ShopSphere — Full-stack e-commerce project

ShopSphere is a React/Vite frontend with a FastAPI/SQLAlchemy backend. This version also includes the **ShopSphere AI Analyst**, a floating chatbot mounted only inside the administrator workspace.

## AI Analyst features

- A floating circular launcher in the bottom-right corner of the admin panel, styled to match the supplied reference.
- Admin-only access enforced twice: the widget is mounted inside the protected admin layout, and every chatbot request uses the backend `require_admin` guard.
- Natural-language tool calling through an OpenAI-compatible chat-completions endpoint (Groq is the default configuration; base URL, model and key are configurable).
- Read-only analytics functions for sales/revenue estimates, order statuses, daily trends, top products, category performance, live inventory/low stock, customer aggregates/repeat buyers, payment attempts, refunds, cancellations/returns, and reviews.
- Results are calculated by fixed SQLAlchemy ORM functions. The model cannot execute arbitrary SQL and the chatbot has no mutation tools.
- Tables, key metric cards and small sales-trend bars are rendered alongside the explanation.
- If `AI_API_KEY` is blank, supported analytics still work in rules-based analytics mode. The UI clearly discloses this and does not claim that an LLM was used.
- Chat conversation state stays in the current admin page session. No new database table or migration is required.

### Metric cautions

“Estimated recognized revenue” sums order totals for orders created in the chosen period, excluding `cancelled`, `returned`, and `refunded` statuses at analysis time. It is **not** a bank/Cashfree-reconciled cash ledger, and order status filters describe the current status rather than a historical event snapshot. Payment-attempt amount is not proof of captured/settled money. Refund metrics reflect refund records stored in ShopSphere. The current schema has no dependable cost-of-goods field, so the analyst must not invent profit/margin figures.

## Run locally

Use Python 3.11+ and Node.js 20+.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
python -m pip install -r requirements.txt
copy .env.example .env  # Windows PowerShell; use cp on macOS/Linux
uvicorn app.main:app --reload
```

The example config uses a local SQLite database for a basic local run. If you use PostgreSQL or another database, update `DATABASE_URL` accordingly. Keep using the project's existing migration procedure when you need to upgrade an established database. API docs are available at `http://127.0.0.1:8000/docs`.

### 2. Enable natural-language AI

In `backend/.env`, set:

```env
AI_PROVIDER=groq
AI_API_KEY=your-provider-api-key
AI_API_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-20b
AI_REQUEST_TIMEOUT_SECONDS=45
```

Restart the backend after changing environment variables. The default model ID is configurable; check your provider account for currently enabled models and limits. To use another OpenAI-compatible provider, set `AI_API_BASE_URL`, `AI_MODEL`, and `AI_API_KEY` to that provider's values. Never set provider keys in `frontend/.env`.

Without an API key, the analytics-only fallback answers common business questions using the same live database functions, but open-ended AI reasoning is unavailable. Configure a key to use the tool-calling agent.

### 3. Frontend

```bash
cd frontend
npm ci
npm run dev
```

The default API base URL is `http://127.0.0.1:8000/api/v1`. Override it in `frontend/.env` only if your backend runs elsewhere. Sign in using an account whose database role is `admin`; customers do not see the launcher and direct API calls from non-admin users receive HTTP 403.

## Validation

```bash
# backend (from backend/)
python -m compileall app
python -m pytest -q

# frontend (from frontend/)
npm run lint
npm run build
```

Automated tests and frontend builds need their declared dependencies installed first. A successful static compilation alone is not a complete runtime/integration test.

## Existing project behavior

Existing endpoints and business features are left in place. The AI adds `POST /api/v1/admin/ai-chat` and new internal analytics service functions; it does not change existing order, payment, refund, inventory or customer API contracts.

## Security and packaging

- Never commit `.env`, API keys, database credentials, Cashfree keys, JWT secrets or customer data.
- Replace development JWT/admin settings before deployment, use HTTPS, and apply normal database access controls/backups.
- Analytics queries are read-only, date ranges are bounded, returned item limits are capped, and the backend controls which function names can be invoked.
