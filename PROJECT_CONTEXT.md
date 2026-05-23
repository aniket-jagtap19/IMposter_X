# PROJECT CONTEXT

Realtime multiplayer social deduction party game.

Core gameplay:

* 4-8 players
* One imposter does not know secret topic
* Other players know topic
* Players give clues
* Timer-based discussion
* Voting phase
* Reveal phase
* Score tracking
* Multiple rounds

Tech stack:

* Next.js App Router
* TypeScript
* Tailwind CSS
* Zustand
* Framer Motion
* Express
* Socket.IO

Architecture rules:

* Server authoritative multiplayer state
* Mobile-first UI
* Keep components modular
* Keep files small
* Avoid unnecessary abstraction
* Shared types between frontend/backend
* Websocket events centralized
* Clean scalable architecture
* Minimal but polished UI
* Realtime synchronization reliability is critical

Code style:

* Strict TypeScript
* Functional components only
* Reusable hooks preferred
* Tailwind only
* Avoid large monolithic components

Main priorities:

1. Smooth realtime multiplayer
2. Polished UX
3. Mobile responsiveness
4. Fast gameplay feel
5. Reliable synchronization
6. Contest-quality presentation
