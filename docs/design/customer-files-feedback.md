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
- A deliberate `?devFeedback=1` URL enables the toggle. Ordinary customer-facing visits do not show it. The URL parameter is a UI gate, **not authorization or confidential access**. The toggle opens a lightweight drawer without changing ROI inputs or navigation.
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


## Adversarial hardening (2026-11-24)

This phase challenges the earlier happy-path proof. Specific failure hypotheses and mitigations:

| Failure hypothesis | Mitigation / regression |
| --- | --- |
| Start typing on Compare, navigate to Present, then Add | Pin metadata to the screen where the first text input or voice recording began; explicit checkbox removes context for overall feedback |
| Export while text or an unadded recording remains in the composer | Refuse export and explain how to complete or clear the draft |
| Add/remove a note while an audio file's arrayBuffer is loading for ZIP | Snapshot notes at export start; track revisions and never mark concurrent changes exported |
| Start a second voice recording while the first is pending review | Block replacement until Add or Remove |
| Forgot-to-stop microphone capture consumes memory | Maximum 2 minutes, 15 MB per recording, stop immediately when an incoming chunk crosses the cap |
| Unlimited recordings and notes create unsafe archive size | Limit notes to 40, total pending/captured audio to 48 MB, ZIP to 50 MB; reject duplicate file names and malformed archive entries |
| Microphone permission resolves after drawer close | Invalidate pending request, immediately stop late-acquired tracks, and never start a hidden recorder |
| A fresh unexported recording follows an earlier ZIP download | Keep before-unload warnings and dirty state independent of the previous export |
| Feedback includes customer financial fields without consent | Only stage/panel/scenario metadata is read; no form scraping or analytics. **User-typed or spoken** information may still be sensitive and must be reviewed before sharing |

**Intended verification:** Node lifecycle/ZIP tests, real headless Chromium with a fake microphone, standard app regression and Pages preflight, CodeQL and independent PR review. Physical microphone/permissions on Windows Chrome/Edge remain unverified unless manually completed; do not treat simulation as equivalent.

**Preserved boundaries:** No backend, no cloud upload, no automatic persistence, no invisible recording, no CRM capture, no formula changes, no permission bypass. An ordinary URL still hides development feedback. Users must export before refresh or tab close; a browser unload prompt is a safeguard, not guaranteed recovery on mobile or forced shutdown.
