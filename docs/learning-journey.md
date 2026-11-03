# Complete learning journeys with Algorithm Playground

The routes page includes a first end-to-end example, **model-learning**:

1. View F05 gradient descent in GenAI OS.
2. Complete the existing three-station `learn.html` route in Algorithm Playground: classification, one real gradient update, then held-out evaluation.
3. Explicitly bring the operation receipt back, inspect recomputed results, confirm personal practice, and answer two recap questions.

Other course catalogs and experiments remain available. This does not make every curriculum a guided journey or certify mastery.

## Resume the chosen journey

The homepage journey card, learning-desk entry and foundation return bar follow the same explicit model/Bayes journey choice. Selecting an entry or taking an action inside a journey remembers that choice separately in `genai-current-learning-journey-v1`; opening a link, rendering a page or automatically inspecting a receipt does not overwrite it. Choosing a route does not add learning progress.

Without this preference, one existing active journey can be resumed directly. If both old journeys are active, the homepage asks which to continue rather than guessing from scores or timestamps. A completed chosen journey stays available as a review. Existing course, practice and recap records are not migrated or rewritten. If saving the choice is blocked, this visit still follows it and explains that refreshing may restore the old choice. Cross-tab preference changes update both homepage entries.

## Second journey: evidence and Bayesian updating

Choose **贝叶斯更新** on the routes page (`?page=routes&section=bayes-journey`). Start with the existing F01 probability foundation, then try the separate fixed Bayesian lesson in `mining.html#bayes-lesson`, bring back its real operation record and explain the two before/after comparisons. The foundation lesson is not renamed or claimed to be a full Bayesian course.

The lesson uses the same Beta(1,1) prior for two authored logs, 3/5 and18/30 successes. It adds one failure to each log. The unknown probability is assumed fixed, with observations conditionally independent given it. This is not the original mining game's hidden generator. The receipt preserves original guesses and incorrect explanation attempts, not only the final correct option. A partial wrong answer remains an answered-but-unfinished attempt.

The pure `bayes-update` tool in the Playground supports the same list/describe/run/replay interface. Its engine version is `bayes-update-v1`. `genaiJourney=bayes-learning` returns only to `?page=routes&section=bayes-journey`; it cannot return a model-learning receipt. Request binding and explicit manual-import fallback follow the same safety boundaries as the model journey. The model receipt format remains unchanged.

Bayesian journey state uses `genai-bayes-learning-journey-v1`, separate from the model route and original course progress. Only a completed browser receipt, freshly replayed and self-declared by the learner, may count as practice. The recap distinguishes a change in our evidence-based judgment from a change in the world, and finite failures from proof of zero probability. Route completion still does not certify mastery.

The `genai-learning-os/bayes-coach-task` package defaults to course-only, with no personal record or recap. Explicit evidence opt-in freshly replays the selected receipt and projects only supported actions, observed results and the submitted recap. It does not include drawing drafts, free mining history, other learning records or hidden future results. No AI service is connected or called automatically. The shared copy/download panel retains the same cancellation and source-specific consent protections as the model task package.

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
