
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
git clone <repository-url>
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