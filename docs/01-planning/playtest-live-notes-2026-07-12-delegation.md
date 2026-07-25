# Playtest Live Notes — Executive Delegation & Trust (2026-07-12)

Branch: `feat/exec-delegation-trust` (PR #167, unmerged). Scribe notes only — no fixes, no commits.
Structured questionnaire filed separately at `/admin/playtest-feedback` (round-3 form).

---

## Entry 5 — Week 13 (Mar 22–28, 2026), screenshot supplied by player, no verbal commentary attached
Full Executive Console state at this moment, all 4 execs "Inspired +20%": Marcus Rodriguez (A&R) loy 65 / mood 100. Samara Chen (CMO) loy 100 / mood 100. Dante Washington (CCO) loy 70 / mood 100. Patricia Williams (Distribution) loy 55 / mood 91. Balance $286,810. 1/3 focus slots used.
Tag: **BALANCE** — data point continuing Entry 4's thread: three of four execs sit at mood 100 (cap) simultaneously despite the player reporting they've been neglecting/avoiding meetings with several of them; loyalty varies (55–100) but mood appears to trend toward ceiling regardless of engagement. Reinforces the "auto-pick still generates full benefits" concern from Entry 4.

---

## Entry 4 — Week 13→14 (following on from Entry 3)
"Again, I just played. Now we're in the next week, and their loyalty and mood are actually up. I'm wondering if there's a bug because since they're auto-picking, they're still generating the benefits."
Screenshot verification (While You Were Out digest, this week): Dante Washington (CCO) auto-resolved "Insist on a polished, professional sound" → -2 Mood, +9 Exec Mood shown on the digest line. Patricia Williams (Head of Distribution) auto-resolved "Stick to organic growth only" → -2 Exec Mood shown. Patricia's exec card now reads loyalty 55 (unchanged from Entry 3), mood 91 (up from 70), "Inspired +20%" badge. Dante's card not visible in this shot.
Tag: **BUG?** / **BALANCE** — player's concern is that autonomous/neglected meetings still grant positive mood/loyalty outcomes with no real downside for being ignored, undercutting the "escalation for neglect" premise. Maps to plan §4 (autonomous resolution) / §5 (escalation). Note the digest itself mixes "Mood" and "Exec Mood" as separately-labeled deltas on the same line — worth clarifying whether those are two distinct stats or a copy inconsistency (relates to Entry 1's copy concern).

---

## Entry 3 — Week 12→13 (screen showed Week 13, Mar 15–21 at time of screenshot; user reported Week 12 loyalty numbers)
"I'm on Week 12, and I've been avoiding Dante and Patricia. Their mood is high, and their loyalty is at 65 and 55."
Screenshot verification (Executive Console, Week 13 Mar 15–21): Dante Washington — loyalty 65, mood "Content" (-10% costs badge). Patricia Williams — loyalty 55, mood 70 (no badge shown). Both match the loyalty figures reported; mood reads high/positive for both, consistent with "avoiding them" not yet tanking mood.
Tag: **BALANCE** (data point re: does avoiding/neglecting an exec meaningfully erode loyalty or mood over multiple weeks, or does it stay flat/high absent an urgent-meeting escalation?). Maps to plan §3 (stat model) / §5 (escalation).

---

## Entry 2 — Week not stated
"The other thing I find a little hard initially: when you do A&R scouting, you can't choose Marcus. When I advanced the week, I did some A&R scouting, but Marcus had a potential meeting that he needed to do. One of the results was that he ran that choice, which I think is as intended, but something about that doesn't sit right — how could Marcus do that other thing plus scout? In the real world, if I'm sending him off to scout, he's not going to have a meeting choice. I think that's an edge case we need to discuss."
Tag: **BALANCE** (edge case: exec assigned to A&R scouting still gets an autonomous meeting resolution the same week — no mutual-exclusivity between an exec's non-meeting weekly assignment and their meeting slot). Maps to plan §2 (three-lane rule) / §4 (autonomous resolution).

---

## Entry 1 — Week not stated
"In the weekly results under meetings, the drop down is 'While You Were Out: Your team made one call without you', but I don't think that's the right story angle. It's not that I was out. It's just a list of other decisions made without my involvement. Then when I click the drop-down, it says 'Accept their terms, worth the risk.' Is that the choice that they chose, or is that telling me that I need to accept their terms? It's a little bit confusing because I have to accept whatever they did, so if that's what that is, then that would be incorrect. It almost feels like, for all of the meeting choices, we need a new field in the way that we build them that shows the outcome in a summary — whatever the problem was and the choice, but rewritten for after the fact."
Tag: **CONFUSION** (also **COPY**, **IDEA**). Maps to plan §4 (autonomous resolution) / Week Summary digest. Likely cause: `choiceLabel` shown verbatim is the in-dialogue choice text (e.g. raw option label like "Accept their terms, worth the risk"), not a post-hoc outcome summary — no reframing field exists yet.

---

