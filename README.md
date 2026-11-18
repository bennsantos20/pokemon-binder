# Pokémon Binder

A personal Pokémon card collection manager and binder planner. Track owned cards separately from binder placements, plan pages with cards you do not own yet, and organize your virtual binder on desktop or mobile.

Phase 1 features are implemented and regression tested. This repository is being prepared for its first Azure Static Web Apps deployment; it does not imply an existing public deployment.

## Phase 1 features

- Submit-driven TCGdex search with Grid/List results, loading/error feedback, request cancellation, and protection against outdated responses.
- Runtime API validation and named fallbacks for missing or broken artwork.
- My Collection inventory with quantities, Grid/List views, remembered expansion state, and links to binder locations.
- Detailed printing selection and deliberately selected **Printing Unspecified** when usable printing metadata is unavailable.
- Placement from collection or search results, ownership indicators, page naming, page selection, and desktop/mobile last-viewed-page persistence.
- Native desktop moves and swaps within the visible spread, plus an accessible **Move / Swap Card** action across pages.
- Mobile Browse Mode, Rearrange Mode touch dragging, floating previews, and cross-page edge navigation.
- Preview Mode, header Settings, JSON backups, validation, and import recovery safeguards.
- Keyboard controls, dialog focus management, action announcements, visible focus indicators, and reduced-motion support.

## Technology

React 19, TypeScript 6, and Vite 8 power the application. Card metadata and artwork come from [TCGdex](https://www.tcgdex.net/). Icons use Lucide React; linting uses Oxlint. Tests use Node.js's built-in test runner.

## Local installation

Use **Node.js 24** and npm to match the tested environment. Vite requires Node.js `^20.19.0 || >=22.12.0`, but this project's TypeScript test commands are verified on Node 24.

```sh
git clone https://github.com/bennsantos20/pokemon-binder.git
cd pokemon-binder
npm ci
npm run dev
```

Open the local URL printed by Vite. No application API key or environment variable is required for the current public TCGdex integration. Uncached searches, details, and artwork require internet access.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run the automated regression suite |
| `npx tsc -b` | Check TypeScript project types |
| `npm run lint` | Run Oxlint |
| `npm run build` | Type-check and build the static site in `dist/` |
| `npm run preview` | Serve the production build locally after building |
| `npm audit` | Audit all dependencies, including development tooling |
| `npm audit --omit=dev` | Audit production dependencies |

Development and preview servers are local tools, not production hosting services. Azure build/workflow configuration is separate from these commands; the production artifact is `dist/`.

## Desktop and mobile interactions

On desktop, click an empty pocket to choose from your collection or search all cards. Click an occupied pocket for its actions. Native dragging moves a card into an empty pocket or swaps occupied pockets in the visible spread. Escape or dropping outside the binder cancels the drag; unrelated external drag payloads are rejected.

To move across any pages without dragging, choose **Move / Swap Card**, select a destination page and pocket, review the operation, and explicitly confirm. This supports clicks, taps, and keyboard controls. Desktop drag-triggered cross-page navigation is not implemented in Phase 1.

On mobile, Browse Mode permits vertical scrolling and horizontal page swipes. Enable **Rearrange Mode** to start dragging by touching an occupied pocket. Hold near a visible binder edge for approximately 500 ms to turn a page while keeping the card active. Release over a pocket to move or swap; release outside a valid pocket to cancel. Move / Swap Card is also available without dragging.

Preview Mode presents the binder without pocket editing. Page names and navigation preferences are retained locally.

## Collection and printings

Collection quantities describe owned copies. Placing, moving, swapping, or removing binder placements does not consume or change those quantities. Ownership matching distinguishes printing identities.

Select a printing when adding or placing cards. Missing detailed metadata does not mean a card is unavailable: **Printing Unspecified** requires deliberate selection, stays separate from confirmed printings, and is never automatically converted when TCGdex later supplies metadata. The app does not infer foil or printing from artwork or rarity. Cards missing usable set identity remain viewable but cannot be added or placed until set information is available.

## Backups and recovery

Use **Settings → Export Backup** to download a versioned JSON backup of current in-memory collection data, binder pages and names, quantities, printings, and relevant display/navigation preferences.

**Import Backup** validates the entire selected file before writing, previews current versus incoming counts, offers a current backup download, and requires explicit confirmation. Importing **replaces** existing data; it does not merge collections or binders. Empty collections are valid, so review the preview carefully.

A temporary import journal preserves previous raw storage values. Imports compare storage before replacement, verify writes, and attempt verified rollback on failure. Startup checks unfinished imports before normal initialization. If recovery cannot complete, affected editing and saving remain blocked with recovery instructions rather than silently replacing data.

Invalid or unreadable saves are preserved and reported. Where offered, **Download Raw Recovery Data** saves raw storage for investigation; this is not a normal importable backup. Download it before attempting manual recovery. A complete regular backup is unavailable when saved data could not be loaded safely. Keep multiple known-good backups, verify downloads, and do not clear browser storage while recovering.

## Browser-local storage and privacy

Collections, layouts, and preferences use `localStorage`. There are no application accounts, cloud collection storage, or automatic synchronization. Browsers, browser profiles, devices, and website origins have separate data. Localhost data does **not** automatically appear on an Azure domain; changing domains does not transfer saves. Export from the original location and import at the destination.

Clearing site data, private browsing sessions, browser eviction, device loss, and storage restrictions can make local data unavailable. Safeguards cannot replace an independent backup. Storage failures are reported; export unsaved in-memory changes before closing the page when possible.

The app does not upload your collection or binder to an application backend. Searches and detail requests contact TCGdex; external artwork contacts its image hosts. Those services receive normal network request information. Backups and raw recovery files can contain your complete collection and personalized page names: share them deliberately. Anyone with access to your browser profile or site storage may be able to access local data.

## Browser compatibility and security limitations

Chrome desktop and Chrome mobile emulation have received automated browser smoke tests, alongside manual regression testing. Full coverage across Safari, Firefox, every mobile browser, and assistive technology combination has not been established. Check native drag previews, touch gestures, focus behavior, downloads, and the native backup dialog on target devices. Missing artwork remains interactive; failed images retry after remount/reload or an image URL change.

The dependency tree locks Vite to **8.3.3**, addressing six direct Vite advisories. A known inherited development-tool advisory remains: [picomatch ReDoS, GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), propagated through fdir, tinyglobby, Vite, and the React plugin. The last upgrade review found no compatible upstream fix. Reassess current advisories before deployment and maintenance; do not use forced fixes or overrides merely to suppress the report. The production-only audit was clear at that review; a clean audit is not a security guarantee.

Keep development servers private, use trusted build configuration, and deploy only static production output. Review CI permissions and secrets when adding an Azure/GitHub workflow.

## Phase 2 follow-ups — not implemented

- Revisit reliable desktop cross-page dragging. `phase2/desktop-cross-page-dragging.patch` is a preserved experimental reference, not active application code or a production-ready implementation.
- Broaden real-device, browser, and assistive-technology verification; revisit deferred accessibility refinements.
- Reassess upstream dependency security fixes as they become available.

These follow-ups are separate from implemented Phase 1 features. Accounts and cloud synchronization are not currently provided.

## Attribution

Pokémon and Pokémon Trading Card Game names, characters, card designs, and artwork belong to their respective rights holders, including Nintendo, Creatures Inc., and GAME FREAK inc. Card metadata and externally loaded artwork are provided through [TCGdex](https://www.tcgdex.net/) and its [API](https://tcgdex.dev/).

This is an **unofficial fan project**, not affiliated with, endorsed by, or sponsored by The Pokémon Company, Nintendo, Creatures, GAME FREAK, or TCGdex. The favicon is original, locally hosted SVG artwork inspired by the binder concept; it uses no externally hosted artwork.
