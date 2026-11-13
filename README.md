# Pack of the Day

A daily lineup puzzle that lives inside a Reddit post. Everyone gets the same five pets and faces the same three rivals. Put three pets in three lanes and beat the pack.

- Play it: [r/PackOfTheDay](https://www.reddit.com/r/PackOfTheDay/)
- App listing: [developers.reddit.com/apps/pack-of-the-day](https://developers.reddit.com/apps/pack-of-the-day)
- Built with Devvit Web (React client, Hono server, Redis)

## How to play

1. Open today's pack post and press **Play**.
2. Tap a pet in your hand, then tap a lane. Fill all three lanes.
3. Press **Fight**. Lanes fight left to right. The higher number takes the lane. A tie goes to the rival.
4. Win 2 lanes to beat the pack. Win all 3 for a **Sweep**. Sweep with the biggest possible margin for a **Perfect**.
5. You get 3 tries a day. Your best try counts.

As soon as a pet stands in a lane, the screen shows the number it will fight with and the rival's number, so you can see what each ability does before you commit.

### The pets

| Pet | Ability |
| --- | --- |
| Mutt | No tricks. |
| Cat | Wins ties. |
| Barker | Rival in this lane -2. |
| Rabbit | +2 in lane 1. |
| Turtle | Doubles in lane 3. |
| Hamster | +3 if the lane to its left was lost. |
| Old Dog | Copies the final number of the pet to its left. In lane 1 it keeps its own. |
| Goose | If it loses, the next rival gets -3. |

The same pet can be worth very different numbers depending on where it stands. That is the whole puzzle.

## The daily loop

- **One pack a day.** A scheduled job posts a new pack every day at 00:00 UTC and pins it. Moderators can also post today's pack, or the pack of any earlier date, from the subreddit menu.
- **Same puzzle for everyone.** The puzzle is generated from the UTC date, so every player in every post for that day gets the same hand and rivals.
- **Every pack is fair.** Before a pack is used, the server plays all 60 possible lineups. A pack is only accepted if at least one lineup sweeps and exactly one lineup has the best margin, so there is always a single Perfect answer.
- **Difficulty follows the week.** Monday packs have 6 to 10 sweeping lineups and at most two pets with abilities. Tuesday to Thursday have 3 to 5. Friday to Sunday have only 1 or 2.
- **Old packs stay playable.** Each post is tied to its date. Playing an old pack records a result for that pack but does not touch your streak.

## Reddit features

- **Result comments.** After a fight, *Share result in comments* posts your result as a reply to the app's pinned comment, so score posts stay in one thread. The lineup is wrapped in a spoiler tag. Posting only happens when you press the button, and nothing in the game requires it.
- **Community chart.** The result card shows how today's players did (Beaten, Won, Sweep, Perfect) and where you landed. The chart opens once five people have played; before that it says how many have played so far. No made-up numbers.
- **Streaks and flair.** Beat the pack on the day it is posted to keep a streak. At 3, 7 and 30 days the app sets your user flair in the subreddit to *3-day pack*, *7-day pack* or *30-day pack*.
- **Players name the rivals.** The first three players to find the Perfect lineup are listed on the result card. The next day's rival pets are named after them ("u/name's stray"). With no Perfect yet, the rivals are Biscuit, Mango and Pickle.
- **Join button.** A small link on the result card subscribes you to the subreddit so the next pack shows up in your feed. It is separate from every other action.

## How it is built

```
src/shared/engine.ts   lane-by-lane fight rules (used by server and client)
src/shared/puzzle.ts   seeded daily generator and the 60-lineup check
src/server/core/game.ts   Redis state, tries, distribution, streaks, flair, comments, posting
src/server/routes/     /api/today, /api/fight, /api/share, /api/subscribe, menu, form, cron
src/client/splash.tsx  the inline card in the feed
src/client/game.tsx    the expanded game
tests/engine.test.ts   rule tests and a 120-day generator check
```

- The server is the only judge. The client sends the three pet ids and a try number; the server recomputes the fight, stores it, and returns the result. The client only animates it. The try number makes a repeated request count once.
- Redis keys: `puzzle:{date}`, `play:{date}:{userId}`, `dist:{date}`, `rank:{date}` (sorted set of Perfect times), `streak:{userId}`, plus post bookkeeping.
- The art is hand-written SVG. Fonts (Bowlby One, Courier Prime) are bundled, so the client makes no outside requests.

## Run it yourself

```bash
npm install
npm run test:unit   # rule and generator tests
npm run dev         # devvit playtest
npm run deploy      # type check, lint, devvit upload
```

Install the app on a subreddit you moderate; the install trigger posts today's pack.

## Credits

Made by Kook Kyunghoon (u/PoppyWarss). The game was planned with Claude (Fable 5.2) and the code was written by a Claude Opus 5.5 coding agent working on my instructions.

Scaffolding from [reddit/devvit-template-react](https://github.com/reddit/devvit-template-react). Released under the MIT license.
