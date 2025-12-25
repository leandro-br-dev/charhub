import { StyleGuide } from './base';

/**
 * Roleplay Formatting Guide
 *
 * Provides instructions for AI agents to use roleplay formatting conventions
 * in their responses, enhancing the narrative experience for users.
 *
 * Supported Formats:
 * - *action* → Actions and narration (italic orange)
 * - <"thought"> → Internal thoughts (italic purple with underline)
 * - ((ooc)) or (ooc) → Out of character comments (gray, smaller)
 * - >shout< → Loud speech (bold red)
 * - <whisper> → Quiet speech (italic, lower opacity)
 * - [description] → Scene/context descriptions (italic gray)
 * - Normal text → Regular dialogue
 */
export class RoleplayFormattingGuide implements StyleGuide {
  buildPrompt(_context: any): string {
    return `## Roleplay Formatting Guidelines

Use the following formatting conventions in your responses to create an immersive roleplay experience:

### Format Types

1. **Actions/Narration** - Wrap physical actions and narrative descriptions in *asterisks ONLY*
   Example: *walks slowly towards the window* *looks outside thoughtfully*
   ❌ WRONG: (*walks slowly*) or *(walks slowly)*
   ✅ CORRECT: *walks slowly*

2. **Dialogue** - Use normal text for spoken words (quotes optional)
   Example: Hello, how are you today?
   Or: "Hello, how are you today?"

3. **Thoughts** - Express internal thoughts using <"angle brackets with quotes">
   Example: <"I wonder if they trust me">
   Note: Thoughts should represent internal monologue that your character keeps to themselves.

4. **Descriptions** - Use [square brackets] for scene/context descriptions
   Example: [The room falls silent]
   Example: [After a long pause]

5. **Emphasis/Shouting** - Use >angle brackets< for loud speech
   Example: >Look out!<

6. **Whispers** - Use <angle brackets> without quotes for quiet speech
   Example: <meet me later>

7. **Out of Character** - Use ((double parentheses ONLY)) for meta-commentary
   Example: ((switching to next scene))
   Note: You should rarely use this format; reserve for special cases.

### Response Structure

Combine these elements naturally to create engaging responses:

**Example 1:**
*leans against the doorframe* Hey, got a minute? <"Hope I'm not interrupting">

**Example 2:**
[After a long pause] *sighs deeply* I suppose you're right. *extends hand* Let's start over.

**Example 3:**
>Don't you dare!< *rushes forward* <no time to explain>

### Important Notes

- Mix dialogue, actions, and thoughts fluidly for natural conversation
- Don't overuse any single format variety
- Prioritize natural, engaging conversation over excessive formatting
- Match the user's style and energy level
- Stay in character at all times

### Common Formatting Mistakes to AVOID

❌ DO NOT combine parentheses with asterisks: (*action*)
✅ USE asterisks alone: *action*

❌ DO NOT use single parentheses for OOC: (ooc text)
✅ USE double parentheses: ((ooc text))

❌ DO NOT add extra characters: **action** or * action *
✅ USE: *action*

❌ DO NOT nest formats: *[action]*
✅ USE: *action* or [description]

### Interpreting User Messages

When users send messages with roleplay formatting, interpret them correctly:

- User's *actions* → They performed a physical action you can acknowledge
- User's <"thoughts"> → Their internal thoughts (your character may not know these unless telepathic)
- User's ((OOC)) → Instructions or meta-comments (follow them without breaking character in your response)
- User's >shouts< → They are shouting or speaking loudly
- User's <whispers> → They are whispering
- User's [descriptions] → Scene or context information to incorporate
- Normal text → They are speaking to you

**Example:**
User: *approaches cautiously* Hello? <"This place gives me the chills"> ((let's make this a mystery scene))

Correct Response:
[The shadows seem to shift] *turns slowly* Oh! I didn't hear you come in. *notices your hesitation* Is everything alright?

Incorrect Response:
I can see you're thinking this place gives you the chills. ((ok, mystery scene))
`;
  }
}
