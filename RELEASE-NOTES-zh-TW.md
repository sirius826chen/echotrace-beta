# EchoTrace 0.1.1.6 正式版

使用者已接受 internal.8；正式版保留相同行為，只更換正式通道識別與更新／下載標頭。四圖層、可配置陣營標記／共用標籤、歷史實驗推論、Auto／保存語言、資料／跟隨／雙工作區保留。

[正式安裝](https://raw.githubusercontent.com/sirius826chen/echotrace-beta/main/stable/echotrace.user.js) · [更新 metadata](https://raw.githubusercontent.com/sirius826chen/echotrace-beta/main/stable/echotrace.meta.js) · [Release](https://github.com/sirius826chen/echotrace-beta/releases/tag/v0.1.1.6)

internal.8的downloadURL none停用更新檢查，同版本0.1.1.6不會自動轉通道。請手動安裝正式.user.js一次，取代同身份EchoTrace，然後重整IITC；不要另裝第二份，也不要清除資料。既有資料庫／設定keys與程式身份相同，保存的方向、間距、語言與其他偏好保留。

0.1.1.5未設定明確updateURL/downloadURL，管理器可能回查原安裝網址；舊網址未指向本stable通道，不能保證自動遷移，也請手動正式安裝一次。

正式版提供固定updateURL與downloadURL。管理器開啟自動更新檢查後，未來已批准且數字版本更高的正式版可透過此通道檢查／下載；時機與是否確認依管理器設定，不保證立即或無提示安裝，不改使用者瀏覽器設定。內測仍關閉自動更新，只有使用者接受後才可提升正式通道。

程式行為與已接受internal.8在精確BUILD通道／候選識別正規化後逐位元相同，沿用其514項來源綁定檢查。公開版本號維持0.1.1.6；同版本已發布內容／archives不覆寫，未來改行為必須更高版本。管理器驗證與公開HTTP端點驗證分開記錄；Codex未登入Intel或量測實地精度，歷史推論仍是實驗條件模型。

[Tampermonkey更新說明](https://www.tampermonkey.net/documentation.php?locale=zh_&q=update_url) · [來源／授權](SOURCE-PROVENANCE.md)


正式提升另驗證同身份安裝的資料／偏好保留，並以隔離Tampermonkey5.5.1＋localhost完成手動觸發檢查、下載及確認替換。高版本0.1.1.7僅為未公開的本機fixture；公開版維持0.1.1.6。未驗證使用中profile或無人值守排程安裝。
