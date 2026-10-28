# ADR 0041 — Admin supplier verification: the queue, the application screen and the decision

## Context
Admins verify supplier applications by hand in Phase 1 (no ABN lookup). Three screens need an API: the
verification table (tabs, search, paging), the application screen opened with Review (pending) or View
(decided), and the Approve and Reject modals. A seller who is rejected may resubmit, which puts the same
application back to pending (ADR 0032).

## Decision
- **Routes**, all admin-only (the role is checked as well as the audience, so a token for this app that
  is not an admin's gets 403): `GET /suppliers`, `GET /suppliers/summary`, `GET /suppliers/:supplierId`,
  `POST /suppliers/:supplierId/approve` and `POST /suppliers/:supplierId/reject`.
- **The queue.** The default order is pending first, oldest submission first (the longest wait), then the
  decided ones, latest decision first. Other sorts are an allow-list (`business_name`, `submitted_at`);
  the sort field never reaches SQL as written. Search matches the business name, and the ABN only when the
  whole term is digits and spaces, so a wildcard or a name with a digit cannot match ABNs. Paging is 10,
  20 or 30.
- **The tab counts come from `/suppliers/summary`**, not the list, so they and the sidebar badge do not
  change with a filter or a page.
- **One detail response for Review and View.** It carries `status`; the frontend turns the Reject and
  Approve buttons off whenever it is not `pending_review`. The server enforces the same rule, so a stale
  page or a second admin cannot decide twice.
- **A decision is one conditional UPDATE** `WHERE id AND status = 'pending_review'`; zero rows affected is
  409. That is the only check, so of two simultaneous decisions (two approves, or an approve and a reject)
  exactly one wins, with no lock and no read-then-write gap. The email is sent only after the update
  succeeded.
- **Approve** sets status, `approved_at`, `reviewed_at` and the deciding admin, and clears any stale reason.
  Approval is the switch that makes the seller's published listings visible to buyers; there is no
  separate publish step.
- **Reject** takes a reason from a fixed list plus an optional detail (at most 1000 characters; required
  when the reason is "other"). It is stored in the existing `rejection_reason` text as the reason's label,
  then ". " and the detail, which is exactly what the applicant reads on their Rejected screen, so the
  seller app needed no change. It records the deciding admin in `approved_by_user_id` as well, which is
  what the seed does and what a resubmission clears.
- **The decider and the time are the server's.** They come from the token and the clock, never the body.
- **Both decisions email the contact** through the mock `MailService` (it logs; there is no SMTP in
  Phase 1).
- **The detail has no password or hash**, and "Role / title" is not in it (ADR 0031). Product categories
  are derived (ADR 0040).

## Consequences
- **Column name.** `approved_by_user_id` now means "decided by", for rejections too. Renaming it is a
  migration for little gain; the response calls it `reviewedByName`.
- **No history.** A resubmitted application overwrites the earlier rejection (ADR 0032), so an earlier
  reason is not kept. A decisions table is Phase 3 audit logging.
- **No way back from approved.** Suspension and offboarding are out of Phase 1.
- **The reason labels are English text stored as written.** Changing a label later does not change reasons
  already stored.
- **The verification checklist on the screen is the frontend's.** It does not gate approval on the server.
