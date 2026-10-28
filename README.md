# finanx web

Next.js 15 front end for `../ledger-backend`. Route handlers under `src/app/api/*` add the `X-API-Key` header and forward to the Go backend, so the secret never reaches the browser.

## Run locally

```
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

- `API_BASE_URL`: the backend including its prefix, e.g. `http://localhost:8081/finance/api`. `API_SECRET`: the backend's `API_SECRET`.
- Sign in with `AUTH_PASSPHRASE`. `SESSION_SECRET` signs the cookie (any long random string).

Pages: Dashboard, Accounts, Cards, Transactions, Categories, Vendors.
