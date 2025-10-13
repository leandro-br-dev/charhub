# Gemini Project Context: CharHub

This document provides an overview of the CharHub project, its architecture, and key operational commands to be used as a reference for Gemini.

## Project Overview

CharHub is a full-stack web application designed to connect users with various generative AI providers. It's built as a Dockerized stack featuring a Node.js/Express backend and a React frontend. The platform handles user authentication via OAuth (Google and Facebook), provides a proxy for interacting with multiple Large Language Models (LLMs) like Gemini, OpenAI, and Grok, and includes a localization system for serving content in different languages. A migration from an older Python/FastAPI project is in progress to incorporate features like a real-time chat system, character management, and story generation.

### Core Technologies

*   **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, i18next
*   **Backend:** Node.js 20, Express.js, TypeScript, Passport.js, Prisma
*   **Database:** PostgreSQL 16
*   **LLM Integrations:** Gemini, OpenAI, XAI Grok
*   **Infrastructure:** Docker Compose, Nginx, Cloudflare Tunnel

## Building and Running

The primary method for running the project is through Docker Compose.

*   **Build and run all services:**
    ```bash
    docker compose up --build
    ```
*   **Accessing the application:**
    *   **Frontend:** `http://localhost`
    *   **API:** `http://localhost/api/v1`
*   **Viewing logs:**
    ```bash
    docker compose logs -f backend
    docker compose logs -f frontend
    ```

### Manual Development

For more granular control during development:

1.  **Start the database:**
    ```bash
    docker compose up postgres
    ```
2.  **Run the backend (from the `backend/` directory):**
    ```bash
    npm install
    npm run dev
    ```
3.  **Run the frontend (from the `frontend/` directory):**
    ```bash
    npm install
    npm run dev
    ```

## Development Conventions

*   **Commit Messages:** Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification (e.g., `feat:`, `fix:`, `docs:`).
*   **Code Style:** The project uses Prettier and ESLint for code formatting and linting.
*   **Translations:** The backend manages localization files. To update or add translations, use the following command from the `backend/` directory:
    ```bash
    npm run build:translations
    ```
*   **Testing:** Automated tests are not yet implemented.

## Project Structure

*   `backend/`: Contains the Node.js/Express API.
    *   `src/`: Main source code.
        *   `config/`: Database, Passport, and other configurations.
        *   `routes/`: API route definitions.
        *   `services/`: Business logic for different parts of the application.
        *   `websocket/`: Real-time chat implementation.
    *   `prisma/`: Database schema and migrations.
*   `frontend/`: Contains the React single-page application.
    *   `src/`: Main source code.
        *   `components/`: Reusable UI components.
        *   `pages/`: Top-level page components.
        *   `services/`: API client and other services.
*   `docs/`: Contains detailed project documentation.
*   `docker-compose.yml`: Defines the services, networks, and volumes for the Dockerized environment.
*   `nginx/`: Nginx configuration for the reverse proxy.
*   `cloudflared/`: Configuration for Cloudflare Tunnels.
