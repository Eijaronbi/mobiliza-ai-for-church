# Accessibility review and verification

Skill used: Accessibility Review. Audit began with preview screenshots and source checks, then browser tests and axe-core WCAG A/AA checks. Automated checks are not a certification or a substitute for manual assistive-technology testing.

## Critical — 4 issue categories found and repaired
1. Unnamed form inputs/selects and icon tools across members, services, follow-up, reports, integrations, structure, settings and Topbar. Keyboard/screen-reader users could not reliably identify field purpose. Added explicit accessible names; named report reminder/delete-field/profile controls.
2. Non-keyboard selectable records in app.agents.tsx, app.followup.tsx and app.transport.tsx. Replaced clickable div Cards with native design-system buttons and exposed selected states. Decorative fallback map markers now use keyboard-operable named vehicle/pickup selection controls rather than inaccessible SVG clicks.
3. Nested interactive controls in settings and duplicate main landmarks (SidebarInset plus app main) caused hydration/landmark problems. Settings uses semantic navigation with buttons; SidebarInset is a wrapper div and content owns the single main landmark.
4. Attendance period tabs referenced panels that did not exist. Replaced with a named pressed-button period selector; no dangling aria-controls.

## Warning — repaired
- Hint text and landing supporting copy contrast failed; removed opacity reductions. Applied warm background/red/dark palette using semantic tokens and retained teal/green/yellow status distinctions.
- Mobile tap areas were too small; enlarged coarse-pointer controls/labels, carousel selectors and modal close control to 44px. Carousel has pause/play and respects reduced motion.
- Viewport-height assistant could put composer behind bottom navigation; uses dynamic viewport height and scrollable conversation with responsive constraints.
- Heading skip for vehicle passengers and follow-up communication history repaired. Added focus-visible outlines, skip-to-content link and single main landmark on landing/app pages.
- Mobile map GPS button no longer overlays legend. Modal max height/scrolling prevents narrow-screen clipping. Landing carousel wraps controls to avoid horizontal clipping.

## Info — repaired/positive
Conversation has polite live log; GPS messages have polite updates; decorative imagery uses empty alt; document lang=en; dialogs use Radix focus/escape. Pie chart has textual submitted/pending/overdue totals, not unlabeled sectors. Leaf pages have individual titles/descriptions/social metadata; bundled images do not get placeholder social URLs.

## Ask AI defect
Preview logs reported React "destroy is not a function" in Assistant. Its concise useEffect returned scrollIntoView's return value as cleanup; changed to a void effect body. Added regression test with non-void scrolling return and verified repeated navigate-away/back plus questions and cancellation. Guarded missing upcoming service and avoided success text when action dispatch fails. This repairs demo use; it does not implement real AI.

## Verification scope
16 content views were browser-opened with titles and headings. Dashboard → Ask AI → typed confirmations returned 56/120 from demo records; proposed workflow → Cancel produced no dispatch; leaving and returning rendered normally; 360×614 mobile Ask AI flow completed without horizontal overflow. Existing integration/bus tests plus new assistant regression tests pass (15 tests). Latest build signal checked.

See verification.json and accessibility-results.json for final observations. Real auth, Cloud persistence, provider calls, hosted Maps rendering and cross-device GPS remain unverified because those systems are not connected. Manual screen-reader announcements, all role scopes, every tab/dialog, full contrast coverage and 200–400% zoom still need a final production accessibility pass.

## Final automated result
Zero axe WCAG A/AA violations were reported on all 15 top-level pages and five opened creation dialogs after animations settled. The 16th view (member profile) was smoke-tested, not axe-scanned. All 16 views showed one main landmark and no browser page errors. This does not establish full WCAG conformance or real backend readiness.
