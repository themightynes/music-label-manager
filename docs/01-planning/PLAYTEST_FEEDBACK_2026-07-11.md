# Playtest Feedback — Merged Mechanics, 2026-07-11

**Who this is for:** Nes (product owner), after real play on merged `main` (arcs #149, #151, #152, #156, #158 + Phase 4 feel).
**Why it exists:** A pile of systems shipped over the last week and none of them has had *structured* feedback yet — only ad-hoc "played it, liked it" notes. You've already put hours into this build, so this form is about **capturing what you already felt**, not prescribing a fresh test run. If a section covers something you genuinely never bumped into, say so — "never saw it" is a real, useful answer here (half of these systems are invisible-until-they-fire).

**How to fill it out (~15 min):**
- Tick the boxes with `- [x]`. One tick per question unless noted.
- The **Feel** scale is the same everywhere: `dead` (didn't register) · `flat` (registered, no reaction) · `works` (landed as intended) · `sings` (better than intended). Pick the closest.
- The free-text lines are for the *one thing that felt off*. Don't write essays — a phrase is fine. Blank = nothing to report.
- The **designer questions** are the real payload. Answer those even if you skip everything else.
- ⚠️ Reminder: if any of this felt stale, the dev server may have been running pre-merge engine code — `tsx` has no watch. Restart-then-verify if a mechanic seemed dead.

---

## 1. Flop penalty — reputation finally bites back (#156)

*A big-budget release that earns almost nothing on release week costs you reputation, shown in the Achievements card.*

**Did you encounter it?**
- [ ] Happened to me in natural play
- [ ] Went looking for it (deliberately floated a big release)
- [ ] Never saw it fire

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. When the penalty hit, did you connect it to *the flop* — or did your reputation just quietly drop and you had to go hunting for why? Was the Achievements card the right place for it to surface?
2. Does a two-way reputation (rep can now fall, not just climb) change how you feel about greenlighting an expensive risky release — or is the sting too small to enter the decision?

---

## 2. Low mood widens recording variance (#156)

*A low-mood artist records less predictably — you can get a worse-than-usual or better-than-usual take.*

**Did you encounter it?**
- [ ] Recorded with a visibly low-mood artist
- [ ] Went looking for it (tanked a mood on purpose)
- [ ] Never saw it / couldn't tell

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Could you actually *feel* the extra swing, or is variance too invisible to read across a couple of sessions? What would make "this take was volatile because they're miserable" legible without me putting a number on screen?
2. Does managing mood-before-recording feel like a lever you'd choose to pull, or just noise you can't plan around?

---

## 3. Artist energy drives tour sell-through (#156)

*A tired artist draws a thinner house on tour; a fresh one sells through better. First time energy has ever driven the economy.*

**Did you encounter it?**
- [ ] Toured with artists at different energy levels
- [ ] Went looking for it (toured someone exhausted)
- [ ] Never saw it / couldn't tell

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Energy used to be a display-only stat. Now that it does something — did you notice it mattered *before* the tour underperformed, or only in hindsight?
2. Note (C87): touring doesn't yet *drain* energy back. Did the one-directional relationship feel incomplete in play — like energy should be a resource tours burn?

---

## 4. Tour popularity saturation (#156)

*Popularity gains from a tour taper as an artist gets bigger — a megastar gains less pop per show than an unknown.*

**Did you encounter it?**
- [ ] Toured both small and large artists and compared
- [ ] Went looking for it
- [ ] Never saw it / couldn't tell

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Do diminishing pop-gains from touring read as *fair* (big stars have less to prove) or as *punishing* (why tour my headliner at all)?

---

## 5. Loss-leader marketing note + ROI tooltip (PlanReleasePage, #156)

*The release-planning page now surfaces marketing economics — a loss-leader note and an ROI tooltip. (Never rendered in-session at merge — the save had no signed artist, so this may be your first look.)*

**Did you encounter it?**
- [ ] Saw the note/tooltip while planning a release
- [ ] Went looking for it
- [ ] Never got a release-planning screen with a signed artist

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Did the loss-leader framing change how you thought about marketing spend — or read as a wall of text you skipped past?
2. The economics are deliberately *untouched* (this is a view onto existing math). After seeing it laid out, does the underlying marketing ROI feel like it needs tuning, or just needed to be visible?

---

## 6. Hype pools + pre-marketing (Buzz v2, #152)

*Artists (and the label) bank hype; pre-marketing gets attached at release planning; banked hype expires if unused; cancelling a release kills the pre-buzz you built for it.*

**Did you encounter it?**
- [ ] Banked and spent hype across releases
- [ ] Attached pre-marketing at planning time
- [ ] Cancelled a release and lost built pre-buzz
- [ ] Let banked hype expire
- [ ] Never engaged with hype at all

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Two hype pools exist (per-artist and label-wide). Was that distinction ever legible in play, or did they blur into one "hype number"?
2. Hype expiring, and pre-buzz dying on cancel — did those feel like *fair consequences you understood*, or like the game silently eating value you thought you had?

---

## 7. Awareness surfacing — breakthroughs, weekly buzz, release buzz, hottest track (#151)

*Breakthrough moments now show as a notable line; a single weekly buzz line aggregates rising/fading songs; release cards carry a buzz section; there's a Hottest Track stat. All qualitative — no numbers.*

**Did you encounter it?** (tick all you saw)
- [ ] A 🔥 breakthrough line in a week summary
- [ ] The aggregated weekly buzz line ("N songs building · M fading")
- [ ] The buzz section on a release card
- [ ] The Hottest Track stat
- [ ] Never noticed any of it

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. The breakthrough was *100% invisible* before this arc — deliberately demoted from a hero card to a notable line. Now that it shows: does it land as a *moment*, or did it slide past in the noise? Should it be louder?
2. Everything here is qualitative on purpose (no ×N numbers). Did the word-only language give you enough to act on, or did you find yourself wishing you could see the actual magnitude?

---

## 8. Reactive meetings + side events (#133–#145)

*Meetings now carry a "why now" line and an urgency dot when they're reacting to your label state; side events fire as a choice beat in the week summary; AUTO-select routes through a review panel before committing.*

**Did you encounter it?** (tick all you saw)
- [ ] A "why now" line explaining a meeting's relevance
- [ ] An urgency dot on an exec card
- [ ] A side-event choice beat in the week summary
- [ ] The AUTO review panel (proposals before commit)
- [ ] Never noticed the reactive layer

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Do the meetings now feel *connected to your label's actual situation* — or is it still "hit AUTO because it doesn't matter"? (That was the original root problem this arc targeted.)
2. Side events fire roughly one week in five. Did they feel like a *welcome interruption* ("and then THIS happened") or like a random tax on your turn? And did the three choices ever feel like a real decision vs. an obvious pick?

---

## 9. Tour Tier 1 — no phantom week, city cards, foreshadow, live strip (#149)

*A tour now completes without a dangling empty week; city results show as cards in the week summary; the planning week shows a foreshadow line; there's a live TourStatusStrip in Active Tours.*

**Did you encounter it?** (tick all you saw)
- [ ] Booked a tour and it finished cleanly (no empty final week)
- [ ] City result cards in the week summary
- [ ] The planning-week foreshadow line
- [ ] The live TourStatusStrip ("on tour — city 2 of 4")
- [ ] Haven't toured since this merged

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. When a tour *underperformed*, could you tell **why** from what the game showed you (venue, attendance, energy) — or did it just feel like the numbers came in low with no story?
2. The foreshadow line is a pre-variance estimate shown at planning. Did it set the right expectation, or did the real result diverge enough that the foreshadow felt like a lie?

---

## 10. The Board — Exec Console reskin (#158)

*The Executive Suite is reskinned as "The Board," a mixing-console layout. Presentation-only — no mechanics changed.*

**Did you encounter it?**
- [ ] Spent real time in the reskinned Executive Suite
- [ ] Glanced at it
- [ ] Haven't opened it since the reskin

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Does the mixing-console framing *help you read* the exec team (roles, availability, state at a glance) — or is it style over legibility?
2. Anything the old layout did better that got lost in the reskin?

---

## 11. Phase 4 game feel — staged reveal, transitions, sound

*The week summary reveals in stages; there are week transitions; sound stings play on events. (Audio audition is still formally owed — this is your chance to log it.)*

**Did you encounter it?**
- [ ] Played enough weeks to feel the staged reveal rhythm
- [ ] Noticed the week transitions
- [ ] Had sound on and heard the stings
- [ ] Played muted / can't speak to audio

**Feel:** `dead` / `flat` / `works` / `sings` → ______

**Anything off / confusing / invisible?** _______________________________________________

**Designer questions:**
1. Does the staged reveal build *anticipation*, or has it started to feel *slow* now that you've seen it many times? Would you want a way to speed/skip it?
2. Audio audition (owed): do the stings land on the *right* moments, and is anything either missing a sound it deserves or making noise it shouldn't?

---

## 12. Feel-knob tuning appetite

*Which systems feel mis-weighted? These knobs are all deliberately untouched so far — this section tells me where to reach first. Tick a strength read per system; leave blank if no opinion.*

| System | Too weak | About right | Too strong |
|---|---|---|---|
| Flop reputation penalty | [ ] | [ ] | [ ] |
| Low-mood recording variance | [ ] | [ ] | [ ] |
| Energy → tour sell-through | [ ] | [ ] | [ ] |
| Tour popularity saturation | [ ] | [ ] | [ ] |
| Hype pools / pre-marketing | [ ] | [ ] | [ ] |
| Side-event frequency | [ ] | [ ] | [ ] |
| Meeting relevance (why-now) | [ ] | [ ] | [ ] |
| Staged-reveal pacing | [ ] | [ ] | [ ] |

**One knob you'd change *today* if you could, and which way:** ______________________________

---

## 13. Top-3 priority — what do I fix/tune next?

*Rank the three things most worth my time. Can be a bug, a tuning pass, a legibility fix, or "make X louder." Be specific.*

1. ____________________________________________________________________
2. ____________________________________________________________________
3. ____________________________________________________________________

**Anything that shipped that you'd rather I *pull back* or reconsider?** ____________________

**One-line gut check — does the label sim feel more alive than it did a week ago?** ____________
