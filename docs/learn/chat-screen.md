# The chat screen and the sign-in wall

**In one line:** `/chat` starts each goal. A guest types with no sign-in, and a tap that needs an account opens the sign-in wall.

## What it is

- The **chat screen** is at `/chat`. The empty chat shows "What are we looking for?" of flow 02. The landing page of T-23a keeps `/`.
- The **chat input** is a text box with a Send button. Enter sends, and Shift+Enter makes a new line. A blank message never sends.
- The **sign-in wall** is "Sign in to continue", with "Sign in with Google" and the legal line. It is a modal on a desktop and a sheet at the bottom of a phone. The user can close it.
- The **app shell** is the sidebar on a desktop and the bar at the bottom of a phone. For a guest, the sidebar shows "Sign in with Google" in place of the account card.

## How it fits our project

| Part | Where |
|---|---|
| The page | `apps/web/app/chat/page.tsx`: `<AppShell fixed><ChatScreen /></AppShell>` |
| The screen and the input | `apps/web/components/chat/chat-screen.tsx` |
| The send rule and the stored chat | `apps/web/lib/chat.ts`: `keyAction`, `canSend`, `readStored` and `forgetChat`, with unit tests |
| The wall | `apps/web/components/shell/sign-in-wall.tsx`: `<SignInWall onClose />` |
| The sign-in button and the legal line of D-02 | `apps/web/components/shell/google-sign-in.tsx`: `<GoogleSignIn />` and `<LegalLine />`, also on the full-page sign-in |
| The shell | `apps/web/components/shell/app-shell.tsx` |

- **Each message goes to the assistant** ([the assistant turn](assistant-turn.md)). The first message starts a goal. The thread shows the message at once, and the reply when it comes. TanStack Query holds the goal, and a mutation sends each turn.
- **A reload opens the same chat.** Local storage keeps the id of the open goal and the visitor key, never a sign-in token. A sign-out removes both, so the next person on the browser cannot open the chat.
- **The shell gates the taps of a guest.** New Listing, New Goal, Messages, Saved, My listings, Profile and the phone "+" open the wall. After the sign-in, the shell opens the page that the guest tapped. A tap while the sign-in state loads waits for it. For a signed-in user, each one is a plain link.
- **A link from outside** to a page that needs an account still opens the full-page sign-in of `SignInGate`.
- **`AppShell fixed`** makes the page one screen high. The page scrolls inside, and it keeps the space of the phone bar itself, so the glow of the empty chat goes under the bar.

## The choice we made

- The phone pattern of the designs: [PD6a](../decisions/pd-06a-mobile-split-view.md).
- Where the login gate sits, and why the chat is open to a guest: [PD6b](../decisions/pd-06b-login-gate-and-search.md).
- The address, the send line and the guest taps: the spec of T-10 ([#172](https://github.com/magentawood/roomsie/pull/172)).

## Gotchas

- **The layout never changes while the user types** (PD6a). The input sits in a box of one line, and it grows to four lines out of the box, over the screen. In the empty chat it grows down. In a thread it grows up, over the end of the thread.
- **An Enter that ends a word is not a send.** A Hindi or Marathi keyboard uses Enter to pick a word, so `keyAction` checks `isComposing`.
- **The thread grows upward.** Its list is in a `flex-col-reverse` box, so a scroll of 0 shows the newest message.
- **The Google mark keeps its own colours.** It is the file `public/icons/google.svg`, not a component, because components use theme tokens only.
- **The legal line links to `/terms` and `/privacy`.** T-23b makes those pages.
- **Local storage can throw** in a private window. Then the chat works until a reload.

## Tickets

- T-10: [#172](https://github.com/magentawood/roomsie/pull/172), 2026-10-27. The chat screen, the input, the sign-in wall, the shell of a guest, and "Start looking" on the home stub.
- T-12: [#189](https://github.com/magentawood/roomsie/pull/189), 2026-11-02. Each message goes to the assistant, and a reload opens the same goal.
- T-15: the results panel and the split view. [The results panel](results-panel.md) tells how they work.
