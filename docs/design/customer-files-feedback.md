# Customer files and development feedback: implementation notes (2026-11-24)

## Scope and rationale
John needs a nontechnical **save/open customer** flow and a development-only way to capture feedback throughout Discover, Model, Compare and Present. Neither needs a server or changes to the financial engine. Keep training-specific simplification (#12) and broader comparison/hiring exploration (#13) out of this implementation.

## Customer work
- Separate **Saved customer work** (customer folder, JSON backup) from **Data exchange** (CSV mapping/template/export) and **Customer report** (print).
- Use the browser File System Access API only from a **user click**, with a user-selected directory and read/write permission. No automatic folder access. A new browser session requires reconnecting.
- Name files `sandler-roi-{customer-slug}.json` and list only files with that format and a recognized `sandler-roi/1` or `sandler-roi/2` schema. Skip malformed files, cap catalog size at 200 files, cap payload at 2 MB.
- Save asks before overwriting an existing customer. Reject filename collisions across distinct customer names. Delete requires explicit confirmation.
- Open asks before discarding current unsaved work and uses the same model loading/normalization as manual JSON backup import, not the serialized `calculated` field. Return to Discover → Engagement when opening a saved customer.
- The UI is honest when the browser does not support folder access: manual JSON download/open remain usable. No invisible database, auto-save, cloud account, or promised recovery.

## Feedback mode
- A persistent toggle opens a lightweight drawer without changing ROI inputs or navigation.
- Categories: improvement, working well, issue/confusion. Notes are explicitly added, editable only by removal/reentry in this iteration.
- Attach only explicit context: workflow stage, Discover subtab, or Present scenario. Do not scrape form content, customer names, URL parameters, or sensitive financial results.
- Voice recording requires explicit `getUserMedia` permission and `MediaRecorder`. Local audio playback uses `media-src 'self' blob:` while `connect-src 'none'` remains.
- Export a ZIP with one manifest (`sandler-roi-feedback/1`) and raw audio, if captured. No transcription or uploading. Clear that unsaved notes disappear on tab close and offer a browser unload warning.
- Do not allow the recording or any captured information to enter customer-facing print output.

## Acceptance
- [ ] Native Node tests, including ZIP integrity and prior financial regressions.
- [ ] GitHub Pages relative import/preflight, restrictive local server routes and CSP.
- [ ] Real Chromium: save to mock permission-granted folder, list and reopen customer, verify Discover reset, download backup.
- [ ] Real Chromium: feedback through stage navigation, capture note, export ZIP, verify context is present and customer values absent.
- [ ] Manual Chrome/Edge OS-folder permission and microphone acceptance, plus denied permission, unsupported browser, cancellation, overwrite/delete, accessibility and narrow viewport.
- [ ] Existing staging, financial and print flows remain intact.
- [ ] PR CI, security review, and owner acceptance before merging/deploying.

## Limitations / follow-ups
- No central/customer CRM, encryption or sync. File System Access API is browser-dependent; unsupported environments need manual downloads.
- Repeated saves overwrite with confirmation; no revision history or atomic multi-file transactions.
- Feedback mode does not submit to a remote collector; users download and share a package deliberately.
- Full-window/screen recordings, screenshots, transcription and attachment to GitHub issues are future considerations, not shipped features.
- Never advertise this public prototype as approved for confidential client storage or Sandler corporate deployment.
