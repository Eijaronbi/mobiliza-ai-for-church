# Page inventory

There are now 17 distinct content views. The earlier browser audit covered 16 views before Prayer Chain was added; /app shell is a layout, not an extra feature page. Only demo behavior was verified. **More than backend wiring remains**: some buttons are simulated/toast-only, dates/trends are fixed, workflows lack full event coverage and real request/auth screens are absent.

| Page | URL | Built | Still required |
|---|---|---|---|
| Landing | / | Images/navigation | Correct real brand/content/privacy before launch |
| Command Centre | /app | Demo statistics/charts | Authenticated aggregates, actual trend data and current tenant dates |
| Members | /app/members | Search/filter/add/import/export | Durable CRUD, consent import, pagination, CSV safety and registered import events |
| Member profile | /app/members/$memberId | Profile/edit/history tabs | Scoped reads/writes and actual communications/timeline |
| Church Structure | /app/structure | Hierarchy/create/leader/group moves | Durable hierarchy, scope/FKs/cycle prevention |
| Mobilization | /app/mobilization | Stages/response edits/simulated contacts | Scheduled jobs, actual delivery, consent/timezone, reminders/events |
| Attendance | /app/attendance | Mark present and demo analytics | Persistent records, real service-period metrics and visibility scopes |
| Transportation | /app/transport | Register buses, fleet/requests/status, map fallback | Storage, authorized driver GPS, true coords, capacity, member request entry/disbursement semantics |
| First Timers & Follow-up | /app/followup | Record/assign/schedule/simulated call/escalate | Persistent outcomes, actual provider, correct escalation subject ID and consent |
| Evangelism & Reports | /app/reports | Template/edit/submit/approve/reminders | Validation/versioned templates, live jobs, approval events and period rollups |
| AI Agents | /app/agents | Six simulated configurations/history | Authenticated real runtime, tool limits/status/execution records |
| AI Command Centre | /app/assistant | Rule-based demo answers/confirmation | Gateway server integration, streaming, ground truth and permissions |
| Leadership & Escalations | /app/leadership | Create/start/resolve/reopen | Durable authorized transitions/owner notification and audit |
| Services & Events | /app/services | Create/edit service; SMS/WhatsApp broadcast dialog for members, units, contacts and WhatsApp groups | Persistence, server recipient/consent validation, queued sending, provider callbacks, broadcast history; verify group capability |
| Prayer Chain | /app/prayer | Configurable watches, assignments, demo sign-in/status, reminders, points and simulated call actions | Persist settings/occurrences/assignments; verified inbound WhatsApp sign-in; timezone scheduler; live status; call callbacks/fallback and consent |
| Integration Hub | /app/integrations | Configure/test/logs/contracts tabs | Secure server tests/send/retry/callbacks, move direct calls into hooks |
| Settings | /app/settings | Navigation, profile/toggle toasts and role matrix | Real settings save/readback, invitations, security configuration; current toasts do not save |

## Not yet built as a production experience
Sign-in/invitation/password-reset screens and protected routing; member self-service transport request; real driver assignment/tracking session and stop-sharing; durable notifications/settings; complete loading/failure states; current-time aggregation and AI stream states. Do not describe these as merely flipping a switch.

## Evidence
In the earlier 16-view audit, every view rendered an h1, a unique title and one main landmark without a page-load error. A member-profile link was followed with an actual demo ID. This is a page smoke test, not exhaustive workflow/role verification.
