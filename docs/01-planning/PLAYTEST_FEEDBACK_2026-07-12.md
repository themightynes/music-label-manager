# Playtest Feedback — Round 2: Volatility & Crisis, 2026-07-12

**Who this is for:** Nes (product owner), after real play on merged `main` (round-2 arc: #159, #160, #161, #162).
**Why it exists:** Round 1 (`PLAYTEST_FEEDBACK_2026-07-11.md`) produced a clear verdict — the build was stable to a fault: flop penalty, mood variance, and energy effects never fired; reputation maxed halfway through the campaign; Creative Capital was starved; meeting relevance and the flop sting were "too weak"; and you asked, in your own words, for side events to be **mandatory** and cost a focus slot so a crisis feels like an "OH MY!". A four-PR arc shipped in direct response. This form playtests the *results*: every section below is a follow-through on a round-1 answer. The three mechanics you never saw fire in round 1 should now be **encounterable** — each gets an explicit re-test.
**What changed since round 1:** energy lifecycle (recording/touring drain, idle recovery) · mood reacts to flops/breakthroughs + livelier drift · flop drama (harder sting + a notable week-summary beat) · reputation gains damped everywhere · Creative Capital grants boosted · meeting why-now weighting raised · **mandatory crisis events** (next-week crisis card, one focus slot, advance blocked until resolved) · hype legibility (attach preview, anticipation line, named pools) · The Board previews waiting briefs.

**How to fill it out (~15 min):**
- Tick the boxes with `- [x]`. One tick per question unless noted.
- The **Feel** scale is the same everywhere: `dead` (didn't register) · `flat` (registered, no reaction) · `works` (landed as intended) · `sings` (better than intended). Pick the closest.
- The free-text lines are for the *one thing that felt off*. Don't write essays — a phrase is fine. Blank = nothing to report.
- The **designer questions** are the real payload. Answer those even if you skip everything else.
- ⚠️ Reminder: restart the dev server before playing — `tsx` has no watch, server-side engine code does not hot-reload. Restart-then-verify if a mechanic seems dead.

---

## 1. Crisis on the Desk — mandatory side events (#162)

*A side event that fires no longer resolves inside the weekly results — it lands on your desk the following week as a mandatory crisis card that takes over one focus slot. You cannot advance the week until you decide how to handle it, and the week summary then reports the week you spent handling it. This was your round-one ask, near verbatim.*

**Did you encounter it?** (tick all you saw)
- [ ] A crisis card occupying a focus slot
- [ ] The advance blocked until I resolved it
- [ ] The "spent the week handling it" beat in the week summary
- [ ] More than one crisis across the run
- [ ] Never had one fire since the merge

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Round one: resolving a crisis inside the weekly results "makes it feel less like an OH MY!" — your words. Is this the OH MY now? Does a crisis landing on your desk carry real dramatic weight, or has it already become a chore card you click through?
2. The slot cost is the teeth — a crisis week is a week where you do one less thing. Does that price create the right tension, or does losing the slot read as punishment stacked on bad luck?
3. Crises still land roughly one week in five — same rhythm as before, but now each one costs real bandwidth. Does that frequency feel right lived-in, or should they be rarer-and-bigger? And did the choices on the card ever feel like a real decision under pressure, or an obvious pick?

---

## 2. Energy lifecycle — work drains, rest recovers (#159/#161)

*Energy now moves: recording weeks drain it, every tour city drains it, and an artist with nothing on their plate recovers. Round one you rated energy effects "never saw it" and asked for energy tied to everything an artist actively does — this is that request, shipped.*

**Did you encounter it?** (tick all you saw)
- [ ] Watched energy dip while an artist was recording
- [ ] Watched energy dip across a tour
- [ ] Watched an idle artist recover
- [ ] Deliberately scheduled a rest week
- [ ] Still could not see energy move

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Round-one follow-through: energy was invisible then. Does it now visibly breathe — down when they work, up when they rest — across a normal campaign?
2. Did the lifecycle ever change a real decision (delayed a tour, forced a rest week, staggered recordings), or does the number move without ever mattering?

---

## 3. Mood reacts to outcomes — flops hurt, breakthroughs lift, drift livelier (#161)

*A flop now dents the release artist's mood, a breakthrough lifts the song artist's mood, and weekly natural drift is stronger. Round one: "mood was generally stable" across a twenty-week run — this aims squarely at that.*

**Did you encounter it?** (tick all you saw)
- [ ] Saw a flop knock an artist's mood down
- [ ] Saw a breakthrough lift an artist's mood
- [ ] Noticed livelier week-to-week drift
- [ ] Mood still felt flat all run

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Round-one follow-through: you said mood never got volatile enough to matter. Does mood now tell a story across the campaign — rough patches, hot streaks — or is it still close to a flat line?
2. When mood moved off an outcome, was the cause legible in the moment (you knew the flop did it), or did the needle just wiggle?

---

## 4. Re-test: low mood widens recording variance

*Mechanically unchanged since round one — but round one you never reached low mood, so it never had a chance to fire. With mood now actually swinging, this should finally be encounterable.*

**Did you encounter it?**
- [ ] Recorded with a genuinely low-mood artist this run
- [ ] Went looking for it (tanked a mood on purpose)
- [ ] Still never got an artist's mood low enough

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. You marked this "too weak" in round one without ever seeing it fire. Now that low mood is reachable: could you feel the swing this time — takes landing worse or better than the artist's usual?
2. Is "get their head right before the studio" now a lever you actually pull, or still noise you cannot plan around?

---

## 5. Flops are a moment — harder sting, louder beat (#161)

*A flop now costs more reputation, dents the artist's mood, and lands as its own notable beat in the week summary instead of a quiet ledger line. Round-one verdict: "didn't feel dramatic enough," knob marked too weak.*

**Did you encounter it?**
- [ ] Had a flop land in natural play
- [ ] Engineered one to see the drama
- [ ] Never flopped this run

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Round-one follow-through: does a flop now read as an event — you see it, you feel it, you know what it cost — or is it still something you discover later in the numbers?
2. Does flop risk now genuinely enter the greenlight decision on an expensive release, or is the fear still theoretical?

---

## 6. Reputation pacing — the climb is a career now (#161)

*Positive reputation gains are damped across every source; losses are not. Round one: "reputation gain feels aggressive and quick" — you were at the ceiling barely halfway through the campaign.*

**Did you encounter it?**
- [ ] Played deep enough into a campaign to feel the new pacing
- [ ] Watched reputation across a shorter stretch
- [ ] Didn't track reputation this run

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. The direct question: does a full campaign now have a reputation arc — still climbing, still earning in the late game, with the ceiling out of reach until the end (if ever)?
2. Slower gains plus harsher flop losses: does reputation now feel like something you protect and spend, or just the same number rising slower?

---

## 7. Creative Capital income — the studio meeting pays better (#161)

*The recording meeting's Creative Capital grants got a real boost. Round one: "gaining CC is a bit of a struggle."*

**Did you encounter it?**
- [ ] Took the recording meeting's Creative Capital choices this run
- [ ] Noticed the Creative Capital economy loosen in general play
- [ ] Still felt starved for Creative Capital

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Round-one follow-through: can you now bank toward the creative moves you want at a livable clip — or is Creative Capital still the resource that stalls your plans?
2. Where should the scarcity sit: is Creative Capital currently doing good work (forcing real trade-offs) or just throttling the fun parts of the game?

---

## 8. Meeting relevance — why-now pushes harder (#161)

*Meetings that are reacting to your label's current situation now push to the front of the weekly slate more aggressively. Round-one knob verdict: too weak.*

**Did you encounter it?**
- [ ] Noticed the slate visibly reacting to my situation
- [ ] Watched for it but couldn't tell
- [ ] Didn't watch for it

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Round-one follow-through: does the weekly slate now chase your situation — the right meeting showing up the week it matters — or does selection still read as generic rotation?
2. When a why-now meeting surfaced, did its line convince you it was reacting to something real you did — or did it feel like flavor text stapled to a random pick?

---

## 9. Hype legibility — attach preview, anticipation line, named pools (#160)

*Release planning now previews which banked pools will pour into the release before you confirm; a weekly anticipation line tracks hype building toward upcoming releases; and the dashboard hype section names what is building and draining instead of the generic readout you flagged in round one.*

**Did you encounter it?** (tick all you saw)
- [ ] Saw the banked-hype preview while planning a release
- [ ] Read the weekly anticipation line
- [ ] Noticed the dashboard hype section got specific
- [ ] Saw none of them

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Round one asked for exactly this pair (attach visibility at planning, plus a de-generalized dashboard). Can you now read hype end-to-end — bank it, see it attach, watch it convert — or are there still blind spots?
2. Honesty check: did any of the new hype copy overpromise — a "strong" read that converted into a launch that felt ordinary?

---

## 10. The Board — waiting briefs show their hand (#160)

*The open-channel strip now previews the waiting meeting's name plus a one-line snippet, with a hint when more briefs are stacked behind it — the exact preview you asked for in round one.*

**Did you encounter it?**
- [ ] Used the previews to decide who to spend a slot on
- [ ] Saw them but chose the same way I always did
- [ ] Haven't spent time in The Board since

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Round-one follow-through: does knowing what is waiting actually change how you spend focus slots on The Board, or is it nice-to-have flavor?
2. Is the snippet the right length — enough to triage, not so much it spoils the meeting?

---

## 11. Knob check — did the tuning land?

*Round one's table was about untouched knobs; every row here was just tuned (or newly created) in direct response to it. This is the second-pass read that tells me whether the tuning landed, undershot, or overshot. Tick a strength read per system; leave blank if no opinion.*

| System | Too weak | About right | Too strong |
|---|---|---|---|
| Energy drain (recording + touring) | [ ] | [ ] | [ ] |
| Idle-week energy recovery | [ ] | [ ] | [ ] |
| Mood swing size (outcomes + drift) | [ ] | [ ] | [ ] |
| Flop sting (reputation + mood) | [ ] | [ ] | [ ] |
| Reputation gain pacing | [ ] | [ ] | [ ] |
| Creative Capital income | [ ] | [ ] | [ ] |
| Crisis frequency | [ ] | [ ] | [ ] |
| Crisis slot cost | [ ] | [ ] | [ ] |

**One knob you'd change *today* if you could, and which way:** ______________________________

---

## 12. Top-3 priority — what do I fix/tune next?

*Rank the three things most worth my time after this round. A bug, a tuning pass, a legibility fix, or "make X louder." Be specific — round one left this section blank and it was missed.*

**Already queued from live play this session (rank them against your own finds, or strike them):**
- **Buzz hidden-at-zero is ambiguous during the building window.** A release with no banked-hype seed shows NO Buzz section in its first post-release week — indistinguishable from a dead release. This misled you in real play (Glass Houses read as "never generated buzz" when it simply hadn't had its first building tick). Candidate fix: during the building weeks, always show the bar — even empty — labeled "building"; absence then genuinely means faded out.
- **Stale label on the Admin index:** the tools list still links "Playtest Feedback (2026-07-11)" — should read Round 2 / 2026-07-12.
- *(For context, not a bug: the campaign verdict on a fresh release is a week-one snapshot — Glass Houses flipped from "Underperformed" to "Strong Success" as week-two streams landed. If that flip felt confusing rather than dramatic, note it here.)*

1. ____________________________________________________________________
2. ____________________________________________________________________
3. ____________________________________________________________________

**Anything from this tuning arc that overshot and you'd rather I *pull back* or reconsider?** ____________________

**One-line gut check — round one's build felt stable to a fault; does round two have the drama?** ____________
