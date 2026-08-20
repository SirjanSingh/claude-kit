---
name: human-writing
description: Write outbound text that does not read as AI-generated — LinkedIn posts, cold emails, WhatsApp messages, hackathon/Devpost copy, README intros, application answers. Enforces no em dashes, no LLM tics, and a character budget. Use whenever drafting anything another human will read outside this repo, or when the user says text sounds AI-written or asks to remove em dashes.
---

# Human writing

Outbound copy gets rewritten when it reads as machine-made. This is the checklist that stops
that happening on the first draft.

## Hard rules

1. **No em dashes.** Not one. Use a comma, a full stop, a colon, or brackets. This is the single
   most reliable tell and the most-repeated complaint. Also avoid the en dash used as punctuation.
2. **No "not just X, but Y"** and its family: "isn't just", "more than just", "it's not about X,
   it's about Y".
3. **No throat-clearing openers**: "In today's fast-paced world", "In an era where",
   "Let's dive in", "I'm excited to share", "Thrilled to announce".
4. **No rule-of-three padding.** "fast, reliable, and scalable" is three adjectives doing the work
   of one honest sentence.
5. **No hollow intensifiers**: seamless, robust, cutting-edge, leverage, delve, elevate, unlock,
   game-changing, revolutionise, journey, landscape, realm, testament, tapestry.
6. **No emoji bullet spam.** One emoji at most, and only where the platform expects it.
7. **Contractions are fine.** "I've", "don't", "it's" — people write that way.

## Shape

- **First line is the hook.** On LinkedIn and in email subject lines it is most of what gets
  read. Lead with the concrete result or the surprising fact, not context.
- **Short sentences beat balanced ones.** Vary length deliberately; two short then one longer
  reads human, five identical-length clauses do not.
- **Specifics over adjectives.** "cut the p95 from 1.8s to 240ms" beats "significantly improved
  performance". Numbers, names, versions.
- **Say the awkward part.** A limitation stated plainly buys more credibility than any claim.
- **End on one thing.** One ask, one link, one next step.

## Character limits

Application portals and forms truncate silently. When a limit is given:

- Draft, then **count** — do not eyeball it.
  `python -c "s=open('draft.txt',encoding='utf-8').read().strip(); print(len(s))"`
- Show the count next to each answer: `(213/255)`.
- Common caps worth remembering: 200, 255, 300, 500, 2000. Ask if unstated.
- Cut adjectives and connectives first; never cut the concrete number or the outcome.

## Register

Match what the user asked for. If they want Hinglish, or blunt WhatsApp-style, or formal
academic, write that — these rules are about removing machine tells, not flattening voice into
one house style. When writing to a specific person (a senior, a mentor, a recruiter), keep it
short and direct; long is not respectful, it is work for the reader.

## Always include, where relevant

GitHub link, live URL, and what the reader is meant to do next.

## Before handing it over

Re-read the draft once against the list above. The most common misses on a first pass are an
em dash that slipped in, one hollow intensifier, and an opener that says nothing. If the user
gave a character limit, state the count.
