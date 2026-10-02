# Marketing decisions

One line for each decision. The date is when it was decided. Where a marketing decision differs from a product or architecture record, the last column names the record that tech must update.

| Date | Decision | Differs from |
|---|---|---|
| 2026-10-02 | Launch on Sunday 11 October. The fallback is Sunday 18 October. | PD11 (12 Oct, fallback 14 Oct) |
| 2026-10-02 | Launch in all of Mumbai, not three areas. Target: 500 form sign-ups and 300 profiles by 11 October. | PD2, PD11 (3 areas, 150 profiles) |
| 2026-10-02 | Devashish owns content, community, PR, ads and email. Ritvij owns analytics, SEO and partnerships. Both own social media. | — |
| 2026-10-02 | Seeding: Devashish uses own networks, social and flat groups. Ritvij uses colleges, co-working spaces and companies. | — |
| 2026-10-02 | The seeding form is a Google Form, live on 5 October, with Niruv's consent text and 8 fields. | — |
| 2026-10-02 | All 10 priority articles go live by launch, in English. AI drafts from interview transcripts, then a heavy human edit. 5 each; Ritvij does SEO on all 10. | corpus-plan.md (no AI drafts) |
| 2026-10-02 | v0 social channels: Instagram, Facebook and WhatsApp only, in Hinglish. No team member appears on camera. | — |
| 2026-10-02 | v0 budget: ₹10,000–20,000 on Meta ads for Mumbai. A fixed amount per ad set. Yash or Niruv approves each spend over ₹2,000. Each rupee goes in the spend log with the sign-ups it brought. | — |
| 2026-10-02 | Paid micro-creators and referrals move to v1. | — |
| 2026-10-02 | Tech adds Google Analytics and Vercel Analytics beside the roomsie events. | ADR-0012 (no third-party analytics) |
| 2026-10-02 | Marketing analyses the data in Looker Studio, with full access, every day. | — |
| 2026-10-02 | v0 SEO: blog, Search Console, article meta tags and schema, Google Business Profile, Justdial and Sulekha. | — |
| 2026-10-02 | Standup: daily at 7 pm on the team Google Meet, every day. Marketing is a section of that call. | how-to-work.md (written, 10 am) |
| 2026-10-02 | Tech helps marketing only when marketing asks about a specific task (`/ask-tech`). | — |
| 2026-10-02 | Interview transcripts are committed to `transcripts/` on the `marketing` branch. Audio stays on the laptop. | — |
| 2026-10-02 | Each person's roomsie Obsidian vault shows a `Marketing/` folder, linked by the plugin to a second copy of `marketing`. Devashish, Ritvij, Yash and Niruv can edit it; it is read-only for the others. | — |
| 2026-10-02 | Yash or Niruv approves each merge into `marketing`, including tick merge requests. The plugin closes a task's issue when its last item is ticked. | — |
| 2026-10-02 | The plan generator is in the agentic-marketing plugin, not in roomsie. | — |

## Open

| Question | Who decides |
|---|---|
| The Meta Pixel and Conversions API (another ADR-0012 exception) | Yash |
| Who appears in Reels and ads | Marketing |
| The partner offer for colleges, co-working spaces and companies | Marketing |
| GitHub usernames of Devashish, Ritvij and Holkar | Each person |
