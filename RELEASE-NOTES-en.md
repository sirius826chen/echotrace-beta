# EchoTrace 0.1.1.7 official stable

2026-10-20. Owner accepted the final color-corrected dev.4. This release aggregates dev.1–dev.4 relative to stable 0.1.1.6. Development remains private; this repository contains distribution artifacts only.

**[Install/update 0.1.1.7](https://raw.githubusercontent.com/sirius826chen/echotrace-beta/main/stable/echotrace.user.js) · [Official Release](https://github.com/sirius826chen/echotrace-beta/releases/tag/v0.1.1.7) · [Update metadata](https://raw.githubusercontent.com/sirius826chen/echotrace-beta/main/stable/echotrace.meta.js)**

[English changelog](CHANGELOG-en.md) · [繁中改版內容](CHANGELOG-zh-TW.md) · [English release notes](RELEASE-NOTES-en.md) · [繁中 Release 說明](RELEASE-NOTES-zh-TW.md) · [Credits and rights](SOURCE-PROVENANCE.md)

## Installation and updating

Back up RAW. Existing stable 0.1.1.6 users can receive the higher 0.1.1.7 through their manager's unchanged fixed updateURL/downloadURL. Timing, checks and confirmation depend on manager settings; silent/immediate installation is not promised.

Internal dev.4 disables checks (downloadURL none, no updateURL). Manually install this official version ONCE to replace the same EchoTrace identity, then reload IITC and join stable updates. Keep one script, without clearing data. Older installations without the stable contract should also enroll manually. Name/id/namespace/database/settings keys remain; data, saving/language/marker orientation/gap and workspace preferences migrate through existing behavior.

## Controls and accepted cumulative changes

Five primary entries are Player overview, Activity records (Live acquisition / Historical backtracking / Record download), Map display, Data management and Settings. Player Activity/Inference pages retain one expandable complete-source list. Shared inference settings exist once; three historical outputs have independent saved choices and default OFF when absent. Auto/en/zh-TW/zh-CN/ja and legacy navigation/layout migration remain.

Independently resized player/Portal rows share a time-first responsive layout and retain GUID/viewport-offset reading, focus and expanded details during ticks/insertion/resizing. Created-Link summaries/hover show exact origin → destination and length even from destination context; both lookups remain. Unknown direction/coordinates are explicit, and icons remain origin-only. Clicking an action temporarily highlights exactly its event Link for ~3 seconds, with replacement/clear/master-OFF cleanup, without changing native Links or permanent switches. Destroyed object endpoints do not establish player position.

Final colors: ONLY interaction-position dashed paths use RES bright purple #d45cff / ENL bright yellow #ffed32 with black outlines. Actual created-Link lines/arrows retain RES blue #75c8ff / ENL green #80ef98 and #102132 backing. Destroyed objects retain reliable original-object faction colors and their independent default-OFF switch. Faction emblems/names/regions/native IITC Links remain unchanged.

Ordinary eligible interaction paths span six-minute gaps, while historical inference still splits at >=6 minutes. Activity directly shows the existing 40m evidence model's required-speed lower bound/minimum distance, separately labelled center/witness reference speed, actual source interval/category and sources, independently of inference/Worker availability. Same-Portal/overlap is not proof of stationary presence.

Portal headers summarize ALL loaded records within current time/player/faction scope, independently of row pagination. Canonical human faction counts, other accounts, system rows, raw/folded totals, raw categories and incoming/outgoing/uncertain relations remain distinct. Incoming relation does not prove direct presence. Conservative positive evidence alone folds flip cascades; every raw child remains and unknown human operators are never guessed. Fading uses existing source-time/lookback formulas. Closing/hiding the LAST player/group context releases selection restrictions; inactive/minimized open contexts still count, without clearing watches/RAW or stopping persistent following.

## Map time versus archival download

Map lookback/backtracking is <=24h across UI/player-add-hour/manual/auto/API paths; the week option is removed and legacy oversized preferences visibly migrate. Older RAW/backups remain. Actual earliest/latest acquired timestamps include milliseconds and empty states; no arbitrary map-history start calendar or Date.now pretending to be a record.

History pauses EchoTrace live, freezes the acquired right endpoint and extends left with older pages. Native/other-plugin COMM can continue normally; newer RAW remains stored without advancing history cutoff. Step completion/stop/error/limit/clear/area/task switch restores the prior ON/OFF, preserving explicit user OFF. Reload restores the live choice but leaves history paused for manual continuation. Inference inspection time is separate.

Record download adapts the COMM Capture 0.1.0-dev.2 IITC preview, public all only, fixed bounds and shared coordination/backoff. Explicit archival periods MAY exceed 24h without expanding/inserting map/native data. Default sequential delay1200ms, minimum800ms, default100 pages (1–500), at most two retries. ingress-comm-capture/schema1.0.0 retains full page responses, duplicate/conflicting GUID occurrences, unknown/out-of-range fields, queries/timing/errors and completion state. Cancelled partial bundles remain downloadable; summary never rewrites RAW. Cookies/credentials/headers are not collected. Complete means requested boundary/empty result, not guaranteed server history. Existing import formats remain; no new Capture-bundle-to-map importer is claimed.

## Validation and limits

Promotion changes version/release metadata only; normalized runtime equals accepted corrected dev.4 byte-for-byte. New release regressions, real isolated Edge/IITC/Leaflet/Worker/IndexedDB/manager/schema checks and public HTTP/asset hashes are recorded separately from old historical383 results. Full source/tests/evidence remain private. Manager checks/confirmation are manually triggered in an isolated profile, not a guarantee of unattended behavior in every manager.

No owner authenticated Intel/active browser profile, field accuracy or Anomaly stress test is claimed. COMM is not GPS; conditional straight routes are not roads/journeys or global-optimum proofs. Existing projection/numerical/branch/server-retention/capacity/1000-history-page limits remain. Existing RES+NIA/mixed-account marker white fallback remains unchanged. No global flip/immunity monitor or separately discussed performance feature was added.
