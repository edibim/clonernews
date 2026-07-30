
<p align="center">

# ClonerNews

A lightweight, modular Hacker News client built with Vanilla JavaScript.

Designed around clean architecture, maintainability, performance and progressive feature implementation.

</p>

<p align="center">

![Status](https://img.shields.io/badge/status-completed-success)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![HTML5](https://img.shields.io/badge/HTML-5-orange)
![CSS3](https://img.shields.io/badge/CSS-3-blue)
![License](https://img.shields.io/badge/license-ISC-lightgrey)

</p>

---

# Table of Contents

- Project Overview
- Goals
- Features
- Screenshots
- Technology Stack
- Requirements
- Installation
- Running the Project
- Project Structure
- Architecture
- Application Lifecycle
- Data Flow
- Engineering Decisions
- Performance
- Error Handling
- Accessibility
- Security
- Testing
- Development Notes
- Future Improvements
- Audit Notes
- License

---

# Project Overview

ClonerNews is a browser-based Hacker News reader that consumes the official Hacker News Firebase API and presents stories, jobs, polls and discussion threads through a modern and responsive interface.

Unlike many simple Hacker News clones, the project focuses not only on functionality but also on software engineering principles including:

- modular architecture
- reusable components
- separation of concerns
- maintainability
- performance optimization
- incremental rendering
- clean code

The project was implemented without frontend frameworks.

Everything is written using modern ES Modules, native browser APIs and a layered architecture.

---

# Project Goals

The primary objectives of the project are:

- consume the official Hacker News API
- present stories in a clean interface
- support jobs and polls
- display complete story information
- render nested comments
- progressively load large discussions
- provide responsive user experience
- minimize unnecessary network traffic
- keep the codebase modular and maintainable

From an engineering perspective, the project also aims to demonstrate:

- scalable folder organization
- reusable utilities
- service abstraction
- UI separation
- feature isolation
- clean asynchronous programming

---

# Features

## Feed

- Top Stories feed
- Jobs feed
- Polls feed
- Progressive loading
- Automatic loading
- Manual "Load More" support
- Relative timestamps
- Story metadata

---

## Story Details

Every story contains:

- title
- author
- score
- publication time
- external link
- comment count
- text content (when available)

---

## Comments

The application supports:

- top level comments
- nested replies
- recursive rendering
- progressive reply loading
- comment collapsing
- lazy expansion

Nested discussions are loaded only when requested by the user instead of downloading the entire discussion tree immediately.

---

## Poll Support

Poll posts include:

- poll information
- available options
- vote counts
- progressive loading of poll options

---

## Live Updates

The application periodically checks for new stories and informs the user when updates become available.

Instead of forcing a refresh, new content can be merged into the current feed while preserving the current browsing state.

---

## Responsive Interface

The application is designed to remain usable across different screen sizes including desktop and mobile devices.

---

## Modular Codebase

The application separates responsibilities into dedicated modules including:

- API
- Services
- Features
- UI
- Utilities

This makes every module easier to maintain, extend and test.

---

# Technology Stack

| Category | Technology |
|-----------|------------|
| Language | JavaScript (ES Modules) |
| Markup | HTML5 |
| Styling | CSS3 |
| Runtime | Browser |
| Package Manager | npm |
| Data Source | Hacker News Firebase API |
| Architecture | Modular Layered Architecture |

---

# Browser APIs Used

The project relies only on native browser functionality.

Examples include:

- Fetch API
- DOM API
- HTML Dialog Element
- IntersectionObserver
- AbortController
- Event Listeners
- requestAnimationFrame

No frontend framework is used.

---

# Requirements

Before running the project make sure the following tools are available.

## Required

- Modern web browser
- Node.js (only for development utilities if needed)
- npm

The application itself is a static frontend and does not require a backend server.

---

# Installation

Clone the repository.

```bash
git clone https://platform.zone01.gr/git/ltzokas/clonernews
```

Enter the project.

```bash
cd clonernews
```

If the project includes development dependencies, install them with:

```bash
npm install
```

---

# Running the Project

Since ClonerNews is a browser application, the project should be served through a local web server rather than opening `index.html` directly from the filesystem.

Examples include:

```bash
python3 -m http.server 8000
```

or

```bash
npx serve
```

or any equivalent static file server.

After starting the server, open the provided local URL in your browser.

The application loads its JavaScript entry point from:

```
js/app.js
```

which initializes the application and coordinates the remaining modules.

---

# Project Structure

The project follows a layered architecture where every directory has a single responsibility.

```
clonernews/
│
├── css/
│
├── docs/
│
├── js/
│   ├── api/
│   ├── features/
│   ├── services/
│   ├── ui/
│   ├── utils/
│   ├── app.js
│   ├── config.js
│   └── state.js
│
├── tests/
│
├── index.html
├── tests.html
└── package.json
```

The separation between folders intentionally avoids mixing responsibilities and keeps the application maintainable as new features are added.

---

# Folder Responsibilities

## css/

Contains all application styling.

Responsibilities include:

- Layout
- Responsive design
- Typography
- Components
- Utility classes
- Visual states

The styling layer is completely independent from the application logic.

---

## docs/

Contains project documentation used during development.

Examples may include:

- development notes
- engineering decisions
- implementation phases

Documentation is intentionally separated from source code.

---

## js/

The `js` directory contains the entire application logic.

Instead of placing every file together, the project separates code into multiple layers.

---

# api/

The API layer is responsible for communication with the Hacker News Firebase API.

Responsibilities include:

- building requests
- calling endpoints
- fetching items
- fetching users
- retrieving stories
- retrieving jobs
- retrieving polls

The API layer never manipulates the user interface.

Its only responsibility is data retrieval.

---

# services/

The service layer provides reusable infrastructure shared by multiple features.

Current services include components such as:

- request queue
- request deduplication
- item cache

These services are intentionally generic and reusable.

They do not know anything about stories, comments or polls.

Their only responsibility is improving data access.

---

## Request Queue

Instead of sending unlimited simultaneous requests, requests are coordinated through a queue.

Benefits:

- avoids API flooding
- smoother loading
- predictable concurrency
- better browser performance

---

## Request Deduplication

If several parts of the application request the same resource simultaneously, only one network request is executed.

The remaining consumers reuse the same Promise.

Benefits:

- reduced bandwidth
- fewer duplicate requests
- improved responsiveness

---

## Item Cache

Previously downloaded resources remain cached.

Benefits:

- faster navigation
- fewer network requests
- reduced latency
- improved user experience

---

# features/

Feature modules contain application business logic.

Each feature owns its workflow.

Examples include:

- feed loading
- comments
- polls
- live updates

Features coordinate:

- services
- api
- ui

without directly mixing responsibilities.

---

## Feed Feature

Responsible for:

- loading stories
- pagination
- incremental loading
- automatic loading
- feed state

---

## Comments Feature

Responsible for:

- loading comments
- recursive replies
- lazy loading
- reply expansion
- comment hierarchy

---

## Poll Feature

Responsible for:

- poll data
- poll options
- vote information

---

## Live Updates Feature

Responsible for:

- checking for new stories
- update notifications
- merging new content into the feed

---

# ui/

The UI layer contains rendering logic.

Its responsibility is presenting already processed data.

Examples include:

- feed rendering
- story rendering
- comments rendering
- dialog rendering
- live update banner
- reusable UI helpers

The UI never communicates directly with the Hacker News API.

---

# utils/

Utility modules contain small reusable helper functions.

Examples include:

- time formatting
- HTML sanitization
- throttling
- helper functions

Utilities contain no application state.

They remain reusable throughout the project.

---

# app.js

Application entry point.

Responsibilities include:

- application startup
- initialization
- feature coordination
- startup sequence

Every major module originates from this file.

---

# config.js

Centralizes application configuration.

Examples include:

- API configuration
- pagination values
- timing constants
- application limits

Keeping configuration centralized avoids duplicated constants throughout the codebase.

---

# state.js

Contains shared application state.

Instead of spreading state across unrelated modules, common information is managed centrally where appropriate.

---

# Architecture

The project follows a layered architecture.

```
                 Browser

                    │

                    ▼

                index.html

                    │

                    ▼

                 app.js

                    │

        ┌───────────┼───────────┐
        ▼           ▼           ▼

    Features      State      Configuration

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

Each layer depends only on the layer below it.

Responsibilities remain isolated.

---

# Why This Architecture?

The architecture was chosen to achieve:

- maintainability
- readability
- modularity
- scalability
- easier debugging
- feature isolation
- reusable infrastructure

As the application grows, new functionality can usually be added inside an existing layer without affecting unrelated modules.

---

# Application Lifecycle

```
Browser

↓

Load index.html

↓

Load app.js

↓

Initialize configuration

↓

Initialize shared state

↓

Load initial feed

↓

Render UI

↓

Wait for user interaction

↓

Load additional data on demand

↓

Continue updating application state
```

The startup sequence keeps initialization predictable and minimizes unnecessary work before the first render.

---

# Feed Loading Lifecycle

```
Application starts

↓

Request top stories

↓

Receive story IDs

↓

Request story data

↓

Cache items

↓

Render first page

↓

Wait for user interaction

↓

Load additional items when requested
```

Feed rendering is incremental, allowing users to begin interacting with the application without waiting for every available story to load.