# EchoTrace 0.1.1.7 正式版

2026-10-20。使用者已接受最終配色修正後的 dev.4，正式整合 dev.1–dev.4 的功能與修正；開發庫保持 private，這裡只提供公開配送。

**[安裝／更新至 0.1.1.7](https://raw.githubusercontent.com/sirius826chen/echotrace-beta/main/stable/echotrace.user.js) · [正式 Release](https://github.com/sirius826chen/echotrace-beta/releases/tag/v0.1.1.7) · [更新 metadata](https://raw.githubusercontent.com/sirius826chen/echotrace-beta/main/stable/echotrace.meta.js)**

[完整繁中改版內容](CHANGELOG-zh-TW.md) · [English changelog](CHANGELOG-en.md) · [繁中 Release 說明](RELEASE-NOTES-zh-TW.md) · [English release notes](RELEASE-NOTES-en.md) · [來源與授權](SOURCE-PROVENANCE.md)

## 安裝與更新

先備份資料。已在正式 stable 0.1.1.6 的使用者，可由 userscript 管理器依原固定 updateURL／downloadURL 檢查較高版本 0.1.1.7；時機、是否確認及安裝由管理器設定決定，不保證立即或靜默更新。

內測 dev.4 使用 downloadURL none、無 updateURL；請**手動安裝本正式版本一次**，取代同身份 EchoTrace，再重整 IITC，加入 stable 更新通道。只保留一份腳本，不清除原始資料。舊未設定 stable 通道版本也建議手動安裝一次。名稱、id、namespace、DB／設定鍵保持；資料、保存偏好、語言、陣營標記方向／間距與工作區依既有遷移保留。

## 操作入口

| 主入口 | 內容 |
|---|---|
| 玩家總覽 | 搜尋／帳號／陣營篩選、選取、玩家與去重陣營統計，進階圖表收合。 |
| 活動紀錄 | 即時擷取、歷史回溯、紀錄下載三頁。 |
| 地圖顯示 | 一般互動位置線、活動圖示、獨立破壞 Link，以及分開保存且首次 OFF 的三項實驗歷史推論。 |
| 資料管理 | 保存、容量、手動修剪／清除、匯入、原始 JSON／CSV／完整備份等。 |
| 設定 | Auto／英／繁中／簡中／日、時間與列表／速度偏好、唯一共用推論設定、關於。 |

玩家只有活動／推論頁，完整來源可逐列展開。窗口可拆分／排序／縮放；事件列依各自容器寬度展開或堆疊，保留閱讀 GUID／畫面偏移、展開及焦點。關閉最後玩家或群組情境會解除選取限制；非作用中／最小化仍算開啟，不自行停止跟隨或清除 watch／RAW。

## 地圖、Link 與速度

已確認建立 Link 的玩家列、Portal 列及被動滑過提示直接顯示發起端 → 接收端、兩端名稱與距離；從接收端查看仍維持真正方向，圖示只放發起端。未知方向明示，缺座標不補零；破壞物件兩端不代表玩家位置。點事件動作會沿用 Portal 定位並只暫時高亮該 GUID 的實際 Link，約三秒或換目標／清除／總開關 OFF 後清理，不改原生 Link 或永久圖層選擇。

**最終配色：只有互動位置虛線採 RES #d45cff 亮紫／ENL #ffed32 亮黃加黑邊；實際建立 Link 的事件線與箭頭維持 RES #75c8ff 藍／ENL #80ef98 綠，背線 #102132。**破壞 Link 仍依可靠原物件陣營色，獨立預設 OFF。標記、姓名、推論區域與原生 IITC Link 不改色。

一般互動位置線跨六分鐘缺口仍連接；歷史位置推論仍於 ≥6 分鐘分段。玩家活動直接顯示既有 40m 證據模型的必要速度下限、最短必要位移、分開標示的中心／見證參考速度、實際區間與來源；推論 OFF 或 Worker 不可用仍能顯示。相同 Portal／重疊區域不宣稱靜止，參考速度不當實測速度。

Portal 頂部按全部已載入、目前時間／玩家／陣營範圍統計，與目前五列分頁分開；去重真人陣營、其他帳號、系統、原始／合併後筆數與原始分類可核對。接收關聯不是在場證據。翻轉僅在保守正面證據足夠時合併呈現，所有 RAW／子列保留，不猜系統背後的人類操作者。淡化沿用來源時間／回看長度原公式。

## 地圖時間與封存下載分開

地圖回看／回溯最多 24 小時，移除一週選項並明示遷移舊超界設定；玩家加一小時、手動、自動與 API 共用上限。較早 RAW／備份仍保留，不是刪除或保存期限。時間區間顯示實際已取得最早 ~ 最新紀錄（含毫秒），空資料明示；歷史頁不再提供任意舊日期作起始 T。

回溯啟動會暫停 EchoTrace live、固定已取得的右端，較早頁面延伸左端；原生／其他插件正常 COMM 可繼續，新增 RAW 仍保存但不推進歷史右端。單批／停止／錯誤／上限／清除／切區域或任務後恢復原 ON／OFF，期間明確 OFF 不被改回 ON。重整會恢復原即時選擇，歷史保持暫停並明示，需手動繼續。推論檢視時刻仍獨立。

「紀錄下載」是從 COMM Capture 0.1.0-dev.2 IITC 開發預覽移植的獨立公開 all 封存任務：下載期間可超過 24 小時，啟動時固定地圖範圍，使用同一共用鎖／退避；逐頁預設 1200ms、最少 800ms，預設 100 頁、可設 1–500，最多兩次重試。完整 ingress-comm-capture / schemaVersion 1.0.0 bundle 保留頁面回應、重複／衝突 GUID、未知及超界欄位、查詢／時間／錯誤與完成狀態。取消部分結果仍可「下載 RAW log」；summary 不改 RAW，不收集 cookies、登入憑證或 headers。

封存下載不會自動擴大地圖或插入地圖／原生 COMM；匯入與保存另依既有資料管理格式。本版未新增 Capture bundle 地圖匯入器。短非空頁不代表伺服器完整歷史；complete 只指請求邊界／空頁。

## 驗證與已知界線

正式提升僅改版本及發布 metadata；與已接受修正版正規化後逐位元一致。新正式安裝檔有實際回歸、隔離 Edge／IITC／Leaflet／Worker／IndexedDB、管理器及 schema 檢查；完整原始碼／測試／證據包留在私人開發庫。管理器測試是隔離環境手動檢查／確認，HTTP 公開 feed 與資產雜湊另外驗證，不保證所有管理器無人值守安裝。

沒有登入使用者 Intel、使用其活躍 profile、現地精度或 Anomaly 壓測宣稱。COMM 不是 GPS；條件軌跡不是道路或實際旅程，長序列近似不是全域最短證明。既有投影／數值／分支／伺服器保留／容量／歷史 1000 頁等限制仍在。RES＋NIA 等混合帳號標記仍可能使用原白色 fallback，此次未改標記規則。未加入全球翻轉免疫監控或另窗效能研究功能。

---

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
