# Hisab Tasks

A clean, responsive to-do application built with React. Tasks persist in browser local storage, so they remain available after refreshing the page on the same device and browser.

## Features
- Add tasks with optional notes, due dates, and priority
- Mark tasks complete and remove tasks
- Filter by all, active, or completed
- Search task titles and notes
- Progress summary and overdue / due-today indicators
- Responsive dark glass UI with keyboard-friendly forms
- No account or backend required

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

Create a production build with:

```sh
npm run build
```

Tasks are stored under the `hisab-todo-tasks-v1` key in local storage. Browser storage is limited to the current browser profile and device; clearing site data removes saved tasks.
