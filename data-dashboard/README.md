# DataBridge UI

React 18 + Vite + Ant Design front end for the DataBridge server
([DataBridge-Java](https://github.com/Mwakisaghu/DataBridge-Java)). The server does all the work and keeps
no client data; this UI only shows results and sends uploads straight through.

## Run

```bash
npm install
# Server on its default port 8085
node node_modules/vite/bin/vite.js                   # same as: npm run dev
# Server on another port
DATABRIDGE_API=http://127.0.0.1:8086 node node_modules/vite/bin/vite.js
```

Open http://localhost:5173. The dev server forwards `/api` and `/health` to the DataBridge server, so the
browser sees one origin and the sign-in cookie just works.

On a new database the server prints a temporary `admin` password once in its console. Sign in with
it, choose your own, and add people under **Users**. If the server runs with `DATABRIDGE_AUTH=none`
(development, no sign-in), the top bar asks for your name instead.

## Check

```bash
node node_modules/vitest/vitest.mjs run     # tests (npm test)
npx eslint . --max-warnings 0               # lint
node node_modules/vite/bin/vite.js build    # production build into dist/
```

`npm run dev` fails on some Windows Git Bash set-ups with "Cannot read properties of undefined
(reading 'stdin')"; the `node node_modules/...` forms above avoid it.

## Layout

- `src/api/` — `client.js` (axios, error messages, session headers) and `databridge.js` (one function per endpoint)
- `src/pages/` — one file per screen; `src/components/` — shared pieces, including `AuthGate`
- `src/redux/sessionSlice.js` — who is signed in and their roles
