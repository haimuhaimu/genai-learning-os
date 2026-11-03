# One complete learning journey with Algorithm Playground

The routes page includes a first end-to-end example, **model-learning**:

1. View F05 gradient descent in GenAI OS.
2. Complete the existing three-station `learn.html` route in Algorithm Playground: classification, one real gradient update, then held-out evaluation.
3. Explicitly bring the operation receipt back, inspect recomputed results, confirm personal practice, and answer two recap questions.

Other course catalogs and experiments remain available. This does not make every curriculum a guided journey or certify mastery.

## Optional AI coaching task package

The same journey now provides a versioned `genai-learning-os/model-coach-task` JSON package plus a plain-language copy prompt. It is an explicit handoff to a learner's own AI, not an embedded chatbot or paid API integration. The course-only default includes goals, fixed conditions, station tasks, public tool locations and a coaching policy. It contains no saved practice, recap or precomputed hidden numerical answers.

The learner may explicitly include the current saved fixed-case practice and submitted recap. Generation then freshly replays the receipt and uses the Playground's separate `inspectLearningRouteTrials` view to inspect actual same-start attempts. The original v1 receipt is unchanged. Export projects allowed actions and observed evidence rather than copying browser storage or arbitrary receipt extensions. The receiving AI can pass `record.runRequest` to the existing `runLearningTool` interface, inspect its real output and replay the returned receipt. It must not claim independent verification unless it actually ran the tool. The exported local-check statement is not a signature or identity proof; an AI run cannot count as the learner's personal progress.

At the gradient station, retry preserves prior actual attempts for comparison. Each starts from the same six examples and parameters `[1, -1, 0]`; only the model's step size changes. The two most recent trials are shown together, while the task package keeps the current journal's full trial history. A full route reset clears that history. The held-out station remains an independent fixed 120-step model, not an extension of either trial.

Copy and JSON download are explicit actions. No content is automatically sent to an AI or written into course progress. Changing sharing options, saved practice, submitted recap or pending import context invalidates in-flight exports and copy feedback. Failure leaves saved practice intact. Local observation hints and the original recap remain usable without any AI service.

## Records and privacy

- Journey data uses `genai-model-learning-journey-v1`, separate from original course progress and capability coverage. Viewing is called viewing; personal practice is explicitly self-declared, not authenticated.
- `producer: agent` receipts are reference-only and cannot complete personal practice. A browser-session producer is not identity proof either.
- No drawing drafts, notes, credentials or unrelated browser storage are read. Only the fixed learning-route receipt is accepted for this first journey.
- The receiver dynamically loads the owner's public `learning-tool.mjs` and, for optional coach evidence, `learning-route-trials.mjs`, calling their pure functions locally. Receipt data is not included in module requests and is not sent to an AI service. Network access is needed to load the modules; failure/timeout leaves prior records intact. The existing local preview setting may select only an explicit loopback HTTP root on a non-privileged port. The Playground development server permits read-only CORS for allowlisted modules from exact supported origins; no credentials or CSP relaxation is added.
- Playground is a separately licensed project. Its algorithm implementation is not copied into this Apache-2.0 repository. The local fixture is portable generated example data, not an implementation of the engine.
- A small saved-record fingerprint detects accidental data changes; it is not a cryptographic signature or authentication.

## Explicit return protocol, version 1

GenAI opens the Playground route with `genaiReturn`, `genaiRequest` and `genaiJourney=model-learning`. Return targets are limited to the owned public GenAI root or a loopback HTTP root on a non-privileged port. Query and fragment fields on the supplied destination are discarded; the destination is canonicalized to `?page=routes&section=journey`.

After the learner explicitly chooses **带回 GenAI OS 复盘**, the unchanged replayable receipt is wrapped:

```ts
type GenaiHandoff = {
  format: 'genai-learning-os/playground-handoff'
  schemaVersion: 1
  journeyId: 'model-learning'
  requestId: string
  receipt: LearningRunReceipt // unchanged object from learning-tool.mjs
}
```

The UTF-8 JSON is base64url encoded in `#playground=...`, with a 65,536-byte decoded limit. It is not part of the initial HTTP request; it is removed from the visible URL when captured. The original receipt's exact v1 boundary strings and results are not rewritten. A stale request is rejected. Manual import accepts the raw original receipt and requires the same replay and explicit confirmation.

This transport does not authenticate a human, encrypt browser history, or provide cloud sync. Only fixed non-private teaching data belongs in it. Keep JSON export/copy available as the explicit fallback.

## Local verification

Run the normal `pnpm ci:check` and `pnpm test:browser`. The journey browser regression isolates the remote replay-service boundary to test UI navigation, confirmation, focus and cross-tab state deterministically; it is not an external algorithm verification. Real cross-project acceptance must also complete a real Playground route and return it through the public replay engine. Test on separate local origins to avoid mixing test operations with a learner's saved data.

For a local paired preview, build GenAI with `VITE_PLAYGROUND_BASE_URL=http://127.0.0.1:3103/` and run its preview on3102; run the Playground static server on3103. The production default remains the public Playground URL. Do not commit generated builds or private acceptance screenshots.
