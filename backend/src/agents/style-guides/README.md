# Style Guides

This directory contains the style guides for the response generation agent. These guides are used to build the prompt that is sent to the LLM, and they control the style, tone, and content of the generated responses.

## How It Works

The `StyleGuideService` in `index.ts` is the main entry point for using the style guides. It loads all the available guides and combines them into a single prompt.

Each style guide is a class that implements the `StyleGuide` interface. The `buildPrompt` method of each guide is called with the context of the conversation, and it should return a string with the specific instructions for that guide.

### Adding a New Guide

1.  Create a new file in this directory (e.g., `myNewGuide.ts`).
2.  Create a class that implements the `StyleGuide` interface.
3.  Implement the `buildPrompt` method.
4.  Add the new guide to the `guides` array in `StyleGuideService`.

## Missing Features and Future Improvements

The current implementation is a good starting point, but it's not complete. Here are some of the missing features and ideas for future improvements:

### 1. Comprehensive Style and Conversation Guide

The current style guides are very basic. We need to create a more comprehensive guide that covers all aspects of the conversation, including:

-   **Tone and Personality:** Define the desired tone and personality of the characters. We can get inspiration from the existing instructions in the frontend, such as in `frontend/src/components/features/content-guidelines` and `frontend/src/pages/(chat)/shared/components/ConversationSettingsModal.tsx`.
-   **Dos and Don'ts:** Provide clear examples of what the characters can and cannot say.
-   **Formatting:** Define the formatting rules for the generated text (e.g., use of markdown, emojis, etc.).

### 2. More Granular Guides

We can create more granular guides for specific scenarios, such as:
-   A guide for handling sensitive topics.
-   A guide for different roleplaying scenarios (e.g., fantasy, sci-fi).
-   A guide for different languages and cultures.

### 3. Dynamic Guide Loading

The `StyleGuideService` currently loads all the guides for every request. We can improve this by loading the guides dynamically based on the context of the conversation.

## Directory Structure

The user has raised a valid point about the location of this directory. Since these style guides are specific to text generation, it might be better to move this directory to a more specific location, such as `backend/src/agents/text-generation/style-guides`.

This would make the project structure more organized and easier to understand, especially when we add style guides for other types of generation (e.g., image, audio).

We should consider this refactoring in the future.
