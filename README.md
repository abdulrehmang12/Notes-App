# Lumina Notes

Lumina Notes is a full-stack collaborative notes app inspired by lightweight document tools like Notion and Google Docs. It is built to demonstrate real-time data flow, role-based access control, rich text editing, and workspace-style organization in a MERN application.

## Purpose

The project is a portfolio-ready "Google Docs Lite" implementation. Users can sign up, create notebooks, write rich text documents, invite collaborators, and edit notes together in real time with live cursor presence.

## Features

- JWT authentication with signup, login, profile updates, password changes, and account deletion
- Notebook workspaces for organizing documents
- Notebook owner controls: rename notebooks, delete notebooks, and invite members
- Role-based access for viewers, editors, and owners
- Rich text editor powered by Quill with headings, bold, italic, lists, quotes, links, and clean formatting
- Real-time collaborative editing with Socket.io rooms
- Live remote cursor labels for connected collaborators
- Owner-managed document share links with private, read-only, and edit modes
- Document owner controls, including title editing and document deletion
- MongoDB/Mongoose persistence for users, notebooks, and Quill Delta document JSON
- Optional in-process dev store for quick demos without MongoDB installed
- Responsive Tailwind CSS interface with a clean workspace layout

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Quill, Socket.io Client
- Backend: Node.js, Express, Socket.io, JWT, bcrypt
- Database: MongoDB with Mongoose
- Validation: Zod
- Tooling: npm workspaces

## Project Structure

```text
.
├── client/          # React + Vite frontend
├── server/          # Express API + Socket.io backend
├── package.json     # npm workspace scripts
└── README.md
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

For persistent development, start MongoDB locally or set `MONGO_URI` in `server/.env`.

For a quick demo without MongoDB, add this to `server/.env`:

```env
MEMORY_STORE=true
```

The in-process store is only for demos. Data resets when the backend restarts.

Run both apps:

```bash
npm run dev
```

Open the app:

```text
http://localhost:5173
```

## Environment Variables

Server variables:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/lumina-notes
JWT_SECRET=change-me-to-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
```

Client variables:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Scripts

```bash
npm run dev                 # Run client and server together
npm run build               # Build the frontend
npm run start               # Start the server
npm run dev --workspace client
npm run dev --workspace server
```

## Default Local URLs

- Client: `http://localhost:5173`
- API: `http://localhost:5000/api`
- Socket.io: `http://localhost:5000`

## Collaboration Model

Quill emits Delta operations for local edits. The client sends each Delta and the latest full document contents to the server. Socket.io broadcasts incremental changes to other users in the same document room and persists the full document JSON. Cursor ranges are broadcast separately for presence and are not stored.

## Security Notes

- `.env` files are ignored and should not be committed.
- `JWT_SECRET` must be changed before production use.
- The demo `MEMORY_STORE` mode is not persistent and should not be used in production.
- Share links are role-limited, but production deployments should also add rate limiting and HTTPS-only cookies or hardened token storage.

## Verification

The app was checked with:

```bash
npm run build --workspace client
npm audit --audit-level=low
```

Server source files were also syntax-checked with `node --check`, and the live API was smoke-tested for auth, notebook, document, account, and Socket.io join flows.
