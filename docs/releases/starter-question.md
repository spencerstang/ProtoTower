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
