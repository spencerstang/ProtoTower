# One-question starter

A signed-in person can answer "What would you like to accomplish?" and get a tower
immediately.

- Sleep language pins the published Huberman and Johnson routines, shows their overlap,
  quotes Huberman's first step, and attaches the outcome label "Wake-time variance".
- "Work out 3x/week" pins only the published Attia routine. The second protocol stays
  blank.
- The same training sentence adds the published sauna routine, with its cautions, only
  when it also mentions heat or sauna.
- Any other sentence creates the tower and says that no reviewed pair exists. No
  protocol or first action is invented.
- This week has two forms: practice, then the outcome note. A blank outcome is a skip.
  Neither form writes the other record.
- Weekly reminder email is implemented behind `weeklyCheckInReminders`, default off,
  with an opt-out link. The sender refuses addresses that do not end in `.invalid`.
  The job does not send, because there is no product email transport yet.

The previous setup form remains at `/towers/new/detailed`.

## Browser gate repair prepared on 2026-11-18

The browser scenarios now use a shared, complete synthetic detailed-tower setup,
including one custom protocol and the required final outcome. Role-based exact
textbox locators distinguish the first custom fields from the second and third
fields, and the starter input from its identically named page region. Isolation,
keyboard practice/undo, private caching, and performance assertions are retained.
The starter-flow account is reset and removed with the other synthetic test users.

The proposed CI browser job runs database lint and pgTAP after a clean reset before
browser acceptance. These changes add no dependency or application behavior.

Local lint, strict types, 118 unit tests, thirteen package builds, and static checks
passed with cached dependencies. Cached Next.js 16.3.6 and Zod 4.4.3 differ from the
target branch's 16.4.2 and 4.6.6; these results are supplementary evidence only.
The full application build, real browser/database checks, current dependency audit,
and protected staging acceptance remain unverified. The session blocks local server
ports, Docker access, registry access, and GitHub writes. No release or deployment
acceptance is implied.
