# finanx web

Next.js 15 front end for `../ledger-backend`. Route handlers under `src/app/api/*` add the `X-API-Key` header and forward to the Go backend, so the secret never reaches the browser.

## Run locally

```
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

- `API_BASE_URL`: the backend including its prefix, e.g. `http://localhost:8081/finance/api`.
- Sign in with username + PIN from `USERS`, a JSON list of `{"name","pin","api_secret"}` (`api_secret` is that person's `<NAME>_SECRET` on the backend). `SESSION_SECRET` signs the cookie (any long random string).

Pages: Dashboard, Accounts, Cards, Transactions, Categories, Vendors.
