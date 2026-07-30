# 📰 ClonerNews — Hacker News Reader

> *A lightweight, modern Hacker News client built with Vanilla JavaScript.*

ClonerNews is a browser-based Hacker News reader that consumes the official **Hacker News Firebase API** and presents Stories, Jobs, Polls and nested discussions through a clean, responsive interface.

The project focuses on clean architecture, modularity and performance while using only native browser APIs and ES Modules.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📰 Stories | Browse the latest Hacker News stories |
| 💼 Jobs | View Hacker News job posts |
| 📊 Polls | Display polls and poll options |
| 💬 Nested Comments | Expand replies lazily without loading the entire discussion |
| 🔄 Live Updates | Detect and display newly published stories |
| ⚡ Incremental Loading | Load content progressively for faster interaction |
| 📱 Responsive UI | Optimized for desktop and mobile devices |

---

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES Modules)
- **API:** Hacker News Firebase API
- **Architecture:** Modular Layered Architecture
- **Browser APIs:** Fetch API, IntersectionObserver, AbortController, HTML Dialog Element

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://platform.zone01.gr/git/ltzokas/clonernews.git
cd clonernews
```

### Run locally

Since this is a static web application, serve the project using any local web server.

Example using Python:

```bash
python3 -m http.server 8080
```

or using Node:

```bash
npx serve
```

Then open:

```
http://localhost:8080
```

---

## 📂 Project Structure

```text
clonernews/
│
├── css/                # Application styles
├── docs/               # Project documentation
├── js/
│   ├── api/            # Hacker News API communication
│   ├── features/       # Business logic
│   ├── services/       # Shared services (cache, requests, etc.)
│   ├── ui/             # Rendering components
│   ├── utils/          # Reusable helper functions
│   ├── app.js          # Application entry point
│   ├── config.js       # Configuration
│   └── state.js        # Shared application state
│
├── tests/              # Test suite
├── index.html
├── tests.html
└── package.json
```

---

## ⚙️ How It Works

1. Fetches the latest content from the Hacker News API.
2. Renders the initial feed.
3. Opens stories in a detailed view.
4. Loads comments on demand.
5. Expands nested replies lazily.
6. Periodically checks for new stories.

---

## 🧩 Architecture

```
Browser
   │
   ▼
 index.html
   │
   ▼
 app.js
   │
   ▼
 Features
   │
   ▼
 Services
   │
   ▼
 API
   │
   ▼
Hacker News Firebase API
```

---

## ⚡ Engineering Highlights

- Modular architecture
- Separation of concerns
- Lazy loading for nested comments
- Request queue
- Request deduplication
- Item caching
- Incremental rendering
- HTML sanitization
- Responsive design

---

## 🧪 Testing

The project includes tests covering:

- API
- Feed
- Comments
- Polls
- Live Updates
- Shared utilities
- State management

---

## 📄 License

Educational project developed as part of the **Zone01**.