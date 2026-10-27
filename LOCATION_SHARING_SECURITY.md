# Location-sharing security release gate (NOT LIVE)

Current Firebase Console rules must remain deny-all. The checked-in firestore.rules is a DRAFT, not deployed or verified; do not paste it into production without emulator tests.

## Required before activation

1. Invitation identifies the actual signed-in viewer by immutable Firebase UID (not merely a user-editable email query parameter). Recipient must authenticate and explicitly accept that viewer. The URL is informational and does not itself authorize access.
2. Only the consenting participant can create, update and revoke their own sharing session. Only the approved viewer UID can read it. Do not allow collection-wide listing or unauthenticated reads.
3. Enforce one-hour expiry server-side. Stop must revoke read access immediately, not just stop GPS. Consider removing location coordinates on revocation. Avoid location history and sensitive data in logs.
4. Enforce maximum 50 active participants per viewer atomically, with a trustworthy server-side or rules-validated counter. Client-side checks alone are insufficient.
5. Use geolocation permission only after explicit Start Sharing; transmit at most every ~30 seconds while foreground browser runs. Stop on sign-out, expiry, page exit, or user Stop. Browser background GPS cannot be guaranteed.
6. Test denied access for strangers, non-viewers, expired sessions, forged viewer emails, UID changes, revoked sessions, concurrent limit bypass, and updates after expiry. Test both owner and viewer sign-ins on separate devices.
7. Only deploy tested Firestore rules and activate sharing after user approval. Never store Firebase service-account credentials in GitHub Pages.

## Current safe state

Google authentication works. Invitation and consent review are previews only. No remote location upload is implemented. Firebase database stays deny-all.
