# Playtest Feedback — Round 3: Delegation & Trust, 2026-07-12

**Who this is for:** Nes (product owner), after real play on `feat/exec-delegation-trust` (Tiers 1+2 of the Executive Delegation & Trust arc).
**Why it exists:** the arc formally reverses "executives are tools to optimize" into "executives are people you manage." Every exec meeting now resolves every week — if you spend a focus slot, you make the call; if you don't, the exec resolves it themselves, spending real money per their loyalty and mood. A low-loyalty exec who ignores an urgent meeting can trigger a mandatory crisis the following week. This form asks the central question: does delegation feel like your team running the label, or like losing money to bugs?
**What shipped this arc:** never-lapse autonomous resolution (loyalty bands as direction: loyal → AUTO-safe, committed → own reasonable call, disloyal → in-character self-serving pick; mood as risk appetite) · AUTO-endorse vs. neglect distinction (AUTO costs a slot and endorses the safe pick; neglect is free but hands over the wheel) · escalation (an urgent meeting ignored by a disloyal exec can land a mandatory crisis next week) · "While you were out" WeekSummary digest (quiet, grouped, collapsed by default) · CEO structural changes (the fired-dancers crisis migrated to the crisis pipeline; the CEO pool's inaction penalty removed) · every hardcoded exec constant (loyalty gain/decay, mood drift, band thresholds, escalation ceiling) is now a config knob. **Not built:** Level/XP (Tier 3) and Portfolios (Tier 4) — those are future arcs, not part of this round.

**How to fill it out (~15 min):**
- Tick the boxes with `- [x]`. One tick per question unless noted.
- The **Feel** scale is the same everywhere: `dead` (didn't register) · `flat` (registered, no reaction) · `works` (landed as intended) · `sings` (better than intended). Pick the closest.
- The free-text lines are for the *one thing that felt off*. Don't write essays — a phrase is fine. Blank = nothing to report.
- The **designer questions** are the real payload. Answer those even if you skip everything else.
- ⚠️ Reminder: restart the dev server before playing — `tsx` has no watch, server-side engine code does not hot-reload.

---

## 1. Autonomous spend — your team running the label, or losing money to bugs?

*Every executive meeting now resolves every week. If you spend a focus slot, you make the call. If you don't, the executive resolves it themselves — spending real money, with no cap, per their loyalty and mood.*

**Did you encounter it?** (tick all you saw)
- [ ] Watched an exec spend real money on their own call
- [ ] Noticed the "While you were out" group in the week summary
- [ ] Was surprised by how much an exec spent unsupervised
- [ ] Every exec I had was always personally staffed

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Does an autonomous exec spend read as your team running the label while you're focused elsewhere, or does it feel like money leaking out for no reason you authorized?
2. Did the size of an autonomous spend ever feel wrong — too big for a decision you never saw coming?

---

## 2. AUTO vs. neglect — is the trade legible?

*AUTO costs a focus slot and endorses the safe pick. Neglect is free but hands the exec the wheel — at low loyalty, they may serve themselves. This is the central trade the arc creates.*

**Did you encounter it?**
- [ ] Used AUTO deliberately, understanding the trade
- [ ] Let an exec go unstaffed on purpose to save a slot
- [ ] Realized only afterward that an exec had gone unstaffed
- [ ] Couldn't tell the difference between AUTO and neglect from the results

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Could you tell, from what you saw, whether an exec had been AUTO-endorsed (cost you a slot) or had neglected-resolved (free, but their call)? What told you, if anything?
2. Did neglecting a low-loyalty exec ever feel like a real, informed gamble — or did it just feel random?

---

## 3. Disloyal picks — in character, or random? (ask per exec)

*A disloyal exec picks a self-serving choice in character for their archetype: Mac chases risky signings, Sam overspends on the story that makes her the story, Dante indulges creative bets, Pat caps the upside on a safe guaranteed win.*

**Which execs did you see make a self-serving call?** (tick all you saw)
- [ ] Mac (A&R) — a risky, gut-driven pick
- [ ] Sam (CMO) — a flashy, expensive campaign
- [ ] Dante (CCO) — an indulgent creative bet
- [ ] Pat (Distribution) — a safe, upside-capped deal
- [ ] Never got an exec disloyal enough to see it

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. For whichever exec you saw go disloyal: did the pick feel like THAT person acting in character, or like a random weird choice with no personality behind it?
2. Did a loyal or committed exec ever feel indistinguishable from a disloyal one, or were the three bands genuinely readable apart?

---

## 4. WeekSummary readability with the "While you were out" digest

*Autonomous resolutions are grouped into a quiet, collapsed-by-default "While you were out" section, separate from the decisions you made yourself.*

**Did you encounter it?**
- [ ] Read the digest every week it appeared
- [ ] Usually skipped past it
- [ ] Never noticed it was there

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. With 3-4 autonomous resolutions in a busy week, was the digest readable, or did it drown the decisions that actually mattered to you?
2. Should ordinary autonomous resolutions stay a quiet grouped digest, or do they deserve their own staged reveal beat like a player decision would get?

---

## 5. Escalation — did a crisis land, and did the loyalty connection read?

*Ignore an urgent meeting with a low-loyalty exec and the crisis is not free — it can land on your desk the following week as a mandatory crisis, the same "Crisis on the Desk" pipeline from round 2.*

**Did you encounter it?** (tick all you saw)
- [ ] A crisis landed the week after I ignored an urgent meeting
- [ ] Understood why it happened without checking a wiki
- [ ] A crisis landed and I could not connect it to anything I did
- [ ] Never saw an escalation fire

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. When an escalation crisis landed, did you connect it to ignoring an urgent meeting with a disaffected exec — or did it feel disconnected from your own choices?
2. Does escalation make you think twice before neglecting an urgent (pulse-dot) meeting, or does it still feel like background weather?

---

## 6. Three-lane clarity — exec, CEO, and crisis lapse differently

*Exec meetings never lapse (your exec resolves them their way). CEO meetings genuinely lapse if unspent — the moment is just gone. Crisis events cannot lapse at all — they block the week until resolved.*

**Did you encounter it?**
- [ ] The three felt clearly different from each other
- [ ] CEO and exec meetings felt like the same kind of thing
- [ ] Never thought about the difference

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Did skipping a CEO meeting feel different from skipping an exec meeting — a forfeited opportunity versus handing over the wheel — or did both just feel like "nothing happened"?
2. Is it clear that a crisis is not something you can simply let slide, unlike the other two lanes?

---

## 7. Economy feel — reputation and awareness after never-lapse

*Every eligible exec now resolves every week — roughly doubling weekly effect volume, including unapproved autonomous spend. This can inflate reputation and awareness gains beyond what round 2 tuned.*

**Did you encounter it?**
- [ ] Reputation or awareness climbed noticeably faster than round 2
- [ ] Pacing still felt like round 2
- [ ] Didn't track it closely enough to say

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Round 2 slowed the reputation climb into a career-length arc. Did this arc's autonomous spend quietly undo that pacing work, or does the climb still feel earned?
2. Focus slots are the counterweight — only 3-4 of the weekly offerings can be YOUR call, the rest run autonomously by design. Did which-to-control ever feel like a genuine dilemma?

---

## 8. Freeform + priorities

**Anything from this arc worth flagging that the sections above missed?** _______________________________________________

**Designer questions:**
1. Round-2 carryover, still open: a fresh release with no banked hype shows no Buzz section at all in its first post-release week, indistinguishable from a dead release — did you run into this again, or has later play made it a non-issue?
2. Anything about Level/XP or Portfolios (both explicitly NOT built this arc) that you want flagged before they become the next arc?

**Top-3 priority — what do I fix/tune next?** *Rank the three things most worth my time after this round. Be specific.*

**Carried forward from round 2 (rank against your own finds, or strike if resolved):**
- **Buzz hidden-at-zero is still ambiguous during the building window** — a release with no banked-hype seed shows no Buzz section at all in its first post-release week, indistinguishable from a dead release. (Round 2's other carryover — the stale Admin-index label — was fixed in this session.)

1. ____________________________________________________________________
2. ____________________________________________________________________
3. ____________________________________________________________________

**One knob you'd change *today* if you could, and which way:** ______________________________

## Knob check — did delegation land?

| System | Too weak | About right | Too strong |
|---|---|---|---|
| Loyalty band thresholds (loyal / committed / disloyal) | [ ] | [ ] | [ ] |
| Autonomous spend magnitude | [ ] | [ ] | [ ] |
| Escalation loyalty ceiling | [ ] | [ ] | [ ] |
| Escalation frequency | [ ] | [ ] | [ ] |
| "While you were out" digest grouping | [ ] | [ ] | [ ] |
| AUTO-endorse vs. neglect loyalty gap | [ ] | [ ] | [ ] |

**Anything from this tuning arc that overshot and you'd rather I *pull back* or reconsider?** ____________________

**One-line gut check — does the label finally feel like a team you manage, or still like a set of dials you turn?** ____________
