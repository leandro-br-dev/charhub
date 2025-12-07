# Story Generation Feature Roadmap

This document outlines the development plan for the new Story Generation feature in CharHub.

## Phase 1: Backend Foundation (Complete)

- [x] **Data Model:** Create the `Story` model in `prisma/schema.prisma` with all necessary fields (title, synopsis, initialText, coverImage, objectives, etc.) and relations to `User`, `Character`, and `Tag`.
- [x] **Database Migration:** Create and apply the database migration to add the `Story` table.
- [x_] **API Endpoints:** Create the initial API endpoints for CRUD operations on stories (`/api/v1/stories`).
- [x] **Services:** Implement the `storyService` to handle the business logic for stories.
- [x] **Validation:** Add input validation for the story creation endpoint.
- [x] **Authentication:** Secure the story creation endpoint to ensure only authenticated users can create stories.

## Phase 2: Frontend - Story Creation UI

- [ ] **New Page:** Create a new page for story creation at `/stories/create`.
- [ ] **Story Form:** Design and implement a comprehensive form for creating and editing stories. The form will include fields for:
    - Title
    - Synopsis
    - Cover Image (upload or URL)
    - Initial Text (a rich text editor would be ideal)
    - Objectives (a dynamic list of text inputs)
    - Character Selection (a multi-select component to link existing characters)
    - Tag Selection (a multi-select component for content classification tags).
- [ ] **API Integration:** Connect the story creation form to the backend API to save and update stories.
- [ ] **My Stories Page:** Create a page where users can see a list of the stories they have created.

## Phase 3: Frontend - Story Gameplay

- [ ] **Story Browser:** Create a page to browse and search for public stories.
- [ ] **Story Detail Page:** A page that displays the story's synopsis, cover image, characters, and tags before starting the game.
- [ ] **Character Selection:** Before starting a story, the user should be able to choose if they want to play as themselves or as one of the story's characters.
- [ ] **Chat Integration:**
    - When a story is started, a new conversation is created.
    - The `initialText` of the story is loaded as the first message in the chat.
    - The characters linked to the story are added as participants in the conversation.
    - The user's chosen character (or the user themselves) is also added as a participant.
- [ ] **Gameplay:** The story progresses through chat messages, with the AI controlling the characters based on the story's context.

## Phase 4: Improvements and Future Features

- [ ] **Objectives Tracking:** Implement a system to track the completion of story objectives.
- [ ] **Branching Narratives:** Allow story creators to define branching paths and multiple endings.
-   **AI Story Generation:** Use a large language model (LLM) to assist users in generating story ideas, synopses, and initial text.
- [ ] **Collaborative Storytelling:** Allow multiple users to participate in the same story.
- [ ] **Story Sharing:** Implement social sharing features for stories.
- [ ] **Reviews and Ratings:** Allow users to rate and review stories.
