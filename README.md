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
