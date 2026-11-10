# The chat screen and the sign-in wall

**In one line:** `/chat` is the chat of the goal that the onboarding started. A guest types with no sign-in, and a tap that needs an account opens the sign-in wall.

## What it is

- The **chat screen** is at `/chat`. A goal with no answer shows "What are we looking for?" of flow 02. With no goal on the browser, `/chat` goes to [the onboarding](onboarding.md). The landing page of T-23a keeps `/`.
- The **chat input** is a text box with a Send button. Enter sends, and Shift+Enter makes a new line. A blank message never sends.
- The **sign-in wall** is "Sign in to continue", with "Sign in with Google" and the legal line. It is a modal on a desktop and a sheet at the bottom of a phone. The user can close it.
- The **app shell** is the sidebar on a desktop and the bar at the bottom of a phone. For a guest, the sidebar shows "Sign in with Google" in place of the account card.
- The **goal header** above the chat has the goal title and "I Found a Place". The sidebar lists the goals, and on a phone the title opens the list ([goals](goals.md)).

## How it fits our project

| Part | Where |
|---|---|
| The page | `apps/web/app/chat/page.tsx`: `<AppShell fixed><ChatScreen /></AppShell>` |
| The screen and the input | `apps/web/components/chat/chat-screen.tsx` |
| The send rule and the stored chat | `apps/web/lib/chat.ts`: `keyAction`, `canSend`, `readStored` and `forgetChat`, with unit tests |
| The wall | `apps/web/components/shell/sign-in-wall.tsx`: `<SignInWall onClose />` |
| The sign-in button and the legal line of D-02 | `apps/web/components/shell/google-sign-in.tsx`: `<GoogleSignIn />` and `<LegalLine />`, also on the full-page sign-in |
| The shell | `apps/web/components/shell/app-shell.tsx` |

- **Each message goes to the assistant** ([the assistant turn](assistant-turn.md)). The onboarding or the first message starts the goal. The thread shows the message at once, and the reply when it comes. TanStack Query holds the goal, and a mutation sends each turn.
- **"Same move?"** shows two xs Buttons under the question. "Same move" opens the other goal ([goals](goals.md)).
- **A reply on its way** shows three dots, as a chat app does, and no mascot.
- **The wait for new results** shows the steps of the search, as flow 02 draws it: "Reading what you said", "Looking through places (or people) around <areas>", "Picking the best ones for you". It shows when a reply or a tap brings new results, and lasts at least 2 seconds. The mascot changes with the step (it reads, it searches with a magnifier, it picks at its laptop) and bobs while it waits.
- **Each results card stays under the reply that brought it.** Newer results add a card and leave the older ones, which open their own results. Only the newest card has Roomsie Noticed and its chips. Local storage keeps the cards of each goal.
- **Each new item fades in.** A long reply scrolls into view from its start, not from its end.
- **The logo of the sidebar opens the last chat:** the chat of this tab, else the newest goal, else a new goal.
- **Each other wait** is `Loading` in `components/ui/loading.tsx`, with the mascot of its page (`mascots` in that file). The mascots come from the sticker sheets of the Product file (Additional assets), in `public/mascots` at 320 px. A person who asks for less motion sees them still. The line under a mascot uses Fredoka, a rounded font, only there.
- **A reload opens the same chat.** `/chat?goal=<id>` names the goal. Each other way into the chat starts a new goal, as a new chat of ChatGPT does, and the older goals stay in the list. Session storage keeps the visitor key and the goal of the tab, never a sign-in token, so a guest starts fresh on the next visit. A sign-out removes them.
- **The phone bar** of the designs is a glass bar: Chats, Messages, Listings and Profile, and a "+" whose menu has New goal and New listing. The plus turns into a cross while the menu is open. Chats goes back to the chat of this visit of the tab, else to a new goal. The open tab has a filled icon. The bar goes away while a text field has the focus (the `typing` variant of `globals.css`).
- **The keyboard of a phone makes the page shorter.** The viewport of `app/layout.tsx` has `interactive-widget=resizes-content`, so Chrome on Android makes the page as high as the space above the keyboard. Thus the chat input and the composer of Messages sit on the keyboard.
- **A place from the results fills the phone screen** (PD6a), over the chat input and the phone bar, as the page of a place does.
- **The shell gates the taps of a guest.** New Listing, New Goal, Messages, Listings, Profile and the two items of the "+" menu open the wall. Chats is open to a guest. After the sign-in, the shell opens the page that the guest tapped. A tap while the sign-in state loads waits for it. For a signed-in user, each one is a plain link.
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
- T-48: the onboarding starts each goal, and New Goal and "+" open it ([the onboarding](onboarding.md)).
- T-50: the goal header, the goal list and a closed goal ([goals](goals.md)).
- 2026-11-09: the keyboard of a phone, and a place over the chat input.
- [#243](https://github.com/magentawood/roomsie/pull/243), 2026-11-07. The phone bar and its "+" menu of the designs, the wait with the mascot, the visitor key for the visit of the tab, a message that fits its bubble, and a pointer on each control.
