import { Hono } from "hono";
import { WebSocketServer } from "ws";
import http from "http";
import http2 from "http2";
import protobuf from "protobufjs";
import path from "path";

const app = new Hono();
// const server = http.createServer(); // 新しいサーバーの作成を削除

// プレイヤー情報をプレイヤー名（または一意なID）をキーとして保存するオブジェクト
const players: Record<string, any> = {};

// 最新の初期ロードアウト装備を保持する変数
let currentStartingLoadoutEquipment: any[] = [];

// 現在のオブザーバー情報を保持する変数
let currentObserverState: any = {};

// サーバーインスタンスを引数として受け取る (http.Serverまたはhttp2.Http2Server)
export async function main(server: http.Server | http2.Http2Server) {
  // protoファイルの絶対パスを解決
  const protoPath = path.resolve(process.cwd(), "./src/proto/events.proto");
  const root = await protobuf.load(protoPath); // パスを修正

  const LiveAPIEvent = root.lookupType("rtech.liveapi.LiveAPIEvent");

  const Any = root.lookupType("google.protobuf.Any");

  const types: Record<string, protobuf.Type> = {
    "type.googleapis.com/rtech.liveapi.Init":
      root.lookupType("rtech.liveapi.Init"),
    "type.googleapis.com/rtech.liveapi.CustomMatch_LobbyPlayers":
      root.lookupType("rtech.liveapi.CustomMatch_LobbyPlayers"),
    "type.googleapis.com/rtech.liveapi.CustomMatch_LegendBanStatus":
      root.lookupType("rtech.liveapi.CustomMatch_LegendBanStatus"),
    "type.googleapis.com/rtech.liveapi.PlayerConnected": root.lookupType(
      "rtech.liveapi.PlayerConnected"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerDisconnected": root.lookupType(
      "rtech.liveapi.PlayerDisconnected"
    ),
    "type.googleapis.com/rtech.liveapi.GameStateChanged": root.lookupType(
      "rtech.liveapi.GameStateChanged"
    ),
    "type.googleapis.com/rtech.liveapi.MatchSetup": root.lookupType(
      "rtech.liveapi.MatchSetup"
    ),
    "type.googleapis.com/rtech.liveapi.MatchStateEnd": root.lookupType(
      "rtech.liveapi.MatchStateEnd"
    ),
    "type.googleapis.com/rtech.liveapi.RingStartClosing": root.lookupType(
      "rtech.liveapi.RingStartClosing"
    ),
    "type.googleapis.com/rtech.liveapi.RingFinishedClosing": root.lookupType(
      "rtech.liveapi.RingFinishedClosing"
    ),
    "type.googleapis.com/rtech.liveapi.ObserverSwitched": root.lookupType(
      "rtech.liveapi.ObserverSwitched"
    ),
    "type.googleapis.com/rtech.liveapi.ObserverAnnotation": root.lookupType(
      "rtech.liveapi.ObserverAnnotation"
    ),
    "type.googleapis.com/rtech.liveapi.WeaponSwitched": root.lookupType(
      "rtech.liveapi.WeaponSwitched"
    ),
    "type.googleapis.com/rtech.liveapi.InventoryPickUp": root.lookupType(
      "rtech.liveapi.InventoryPickUp"
    ),
    "type.googleapis.com/rtech.liveapi.InventoryDrop": root.lookupType(
      "rtech.liveapi.InventoryDrop"
    ),
    "type.googleapis.com/rtech.liveapi.InventoryUse": root.lookupType(
      "rtech.liveapi.InventoryUse"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerDamaged": root.lookupType(
      "rtech.liveapi.PlayerDamaged"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerKilled": root.lookupType(
      "rtech.liveapi.PlayerKilled"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerDowned": root.lookupType(
      "rtech.liveapi.PlayerDowned"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerAssist": root.lookupType(
      "rtech.liveapi.PlayerAssist"
    ),
    "type.googleapis.com/rtech.liveapi.SquadEliminated": root.lookupType(
      "rtech.liveapi.SquadEliminated"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerStatChanged": root.lookupType(
      "rtech.liveapi.PlayerStatChanged"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerRespawnTeam": root.lookupType(
      "rtech.liveapi.PlayerRespawnTeam"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerRevive": root.lookupType(
      "rtech.liveapi.PlayerRevive"
    ),
    "type.googleapis.com/rtech.liveapi.AmmoUsed": root.lookupType(
      "rtech.liveapi.AmmoUsed"
    ),
    "type.googleapis.com/rtech.liveapi.CharacterSelected": root.lookupType(
      "rtech.liveapi.CharacterSelected"
    ),
    "type.googleapis.com/rtech.liveapi.ZiplineUsed": root.lookupType(
      "rtech.liveapi.ZiplineUsed"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerUltimateCharged": root.lookupType(
      "rtech.liveapi.PlayerUltimateCharged"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerAbilityUsed": root.lookupType(
      "rtech.liveapi.PlayerAbilityUsed"
    ),
    "type.googleapis.com/rtech.liveapi.PlayerUpgradeTierChanged":
      root.lookupType("rtech.liveapi.PlayerUpgradeTierChanged"),
    "type.googleapis.com/rtech.liveapi.LegendUpgradeSelected": root.lookupType(
      "rtech.liveapi.LegendUpgradeSelected"
    ),
    "type.googleapis.com/rtech.liveapi.GrenadeThrown": root.lookupType(
      "rtech.liveapi.GrenadeThrown"
    ),
    "type.googleapis.com/rtech.liveapi.GibraltarShieldAbsorbed":
      root.lookupType("rtech.liveapi.GibraltarShieldAbsorbed"),
    "type.googleapis.com/rtech.liveapi.RevenantForgedShadowDamaged":
      root.lookupType("rtech.liveapi.RevenantForgedShadowDamaged"),
    "type.googleapis.com/rtech.liveapi.ArenasItemSelected": root.lookupType(
      "rtech.liveapi.ArenasItemSelected"
    ),
    "type.googleapis.com/rtech.liveapi.ArenasItemDeselected": root.lookupType(
      "rtech.liveapi.ArenasItemDeselected"
    ),
    "type.googleapis.com/rtech.liveapi.BannerCollected": root.lookupType(
      "rtech.liveapi.BannerCollected"
    ),
    "type.googleapis.com/rtech.liveapi.BlackMarketAction": root.lookupType(
      "rtech.liveapi.BlackMarketAction"
    ),
    "type.googleapis.com/rtech.liveapi.WraithPortal": root.lookupType(
      "rtech.liveapi.WraithPortal"
    ),
    "type.googleapis.com/rtech.liveapi.WarpGateUsed": root.lookupType(
      "rtech.liveapi.WarpGateUsed"
    ),
    "type.googleapis.com/rtech.liveapi.PauseStateChangeNotification":
      root.lookupType("rtech.liveapi.PauseStateChangeNotification"),
    "type.googleapis.com/rtech.liveapi.Response": root.lookupType(
      "rtech.liveapi.Response"
    ),
  };

  // 渡されたサーバーインスタンスにWebSocketサーバーをアタッチ
  // wsライブラリの型定義に合わせるため、http.Serverにキャスト
  const wss = new WebSocketServer({ server: server as http.Server });

  wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`🔌 WebSocket接続 from ${ip}`);

    ws.on("message", (message: Buffer) => {
      if (!(message instanceof Buffer)) return;

      try {
        const event = LiveAPIEvent.decode(message) as protobuf.Message & {
          [k: string]: any;
        };

        const anyMessage = Any.decode(
          event["gameMessage"]
        ) as protobuf.Message & { [k: string]: any };

        const typeUrl = anyMessage["type_url"];
        const payload = anyMessage["value"];

        if (typeUrl && types[typeUrl]) {
          const decodedMessage = types[typeUrl].decode(payload);
          const object = types[typeUrl].toObject(decodedMessage, {
            longs: String,
            enums: String,
            bytes: String,
            defaults: true,
            arrays: true,
            objects: true,
          });
          console.log("📦 デコード結果:", JSON.stringify(object, null, 2));

          // デコード結果を基にプレイヤー情報を更新
          updatePlayers(object);
        } else {
          console.warn("⚠️ 未知のメッセージタイプ:", typeUrl);
        }
      } catch (err) {
        console.error("デコード失敗:", err);
        console.log("受信バイナリ（文字列化）:", message.toString("utf-8"));
      }
    });

    ws.on("close", () => {
      console.log(`❌ 接続終了 from ${ip}`);
    });
  });

  // Honoのルートはindex.tsで処理されるため不要
  // app.get("/", (c) => c.text("WebSocketサーバー稼働中"));

  // サーバーのリスニングはindex.tsで行われるため不要
  // server.on("request", app.fetch);
  // server.listen(3100, () => {
  //   console.log("🚀 WebSocketサーバー起動: ws://localhost:3100");
  // });

  console.log("🚀 WebSocketサーバー初期化完了"); // 初期化完了メッセージを追加
}

// 受信したメッセージを基にプレイヤー情報を更新する関数
function updatePlayers(message: any) {
  const category = message.category;
  const playerName = message.player?.name; // 多くのイベントにplayerが含まれる

  // プレイヤーが存在しない場合は初期化
  if (playerName && !players[playerName]) {
    // 新しいプレイヤーのインベントリを現在の初期ロードアウトで初期化
    const initialInventory: Record<string, number> = {};
    currentStartingLoadoutEquipment
      .filter((item) => item.item !== "Shield Battery") // シールドバッテリーを除外
      .forEach((item) => {
        if (item.item && item.quantity !== undefined) {
          initialInventory[item.item] = item.quantity;
        }
      });

    players[playerName] = {
      name: playerName,
      teamId: message.player.teamId,
      teamName: message.player.teamName,
      squadIndex: message.player.squadIndex,
      character: message.player.character,
      skin: message.player.skin,
      pos: message.player.pos,
      angles: message.player.angles,
      currentHealth: message.player.currentHealth,
      maxHealth: message.player.maxHealth,
      shieldHealth: message.player.shieldHealth,
      shieldMaxHealth: message.player.shieldMaxHealth,
      nucleusHash: message.player.nucleusHash,
      hardwareName: message.player.hardwareName,
      // インベントリ情報を保持するオブジェクトを追加
      inventory: initialInventory, // 初期ロードアウトで初期化
      // その他の統計情報などを初期化（必要に応じて）
      stats: {
        damageDealt: 0,
        damageTaken: 0,
        kills: 0,
        assists: 0,
        revivesGiven: 0,
        // ...dその他の統計
      },
      state: "Alive", // プレイヤーの状態（生存、ダウン、死亡など）
      lastUpdateTime: message.timestamp,
    };
  }

  // プレイヤー状態を自動判定する関数
  function autoUpdatePlayerState(playerObj: any) {
    if (!playerObj) return;
    // 既にEliminatedやWinnerなら変更しない
    if (playerObj.state === "Eliminated" || playerObj.state === "Winner")
      return;
    // currentHealth, maxHealth, shieldHealth, shieldMaxHealth から判定
    if (
      typeof playerObj.currentHealth === "number" &&
      typeof playerObj.maxHealth === "number"
    ) {
      // 体力が0以下ならDowned
      const health = playerObj.currentHealth ?? 0;
      if (health <= 0) {
        playerObj.state = "Downed";
      } else {
        playerObj.state = "Alive";
      }
    }
    // 追加で、もしcurrentHealth/maxHealth両方0ならEliminatedにしたい場合はここで判定
    // ただし、EliminatedはplayerKilled等のイベントでのみ設定するのが安全
  }

  // イベントカテゴリに応じた処理
  switch (category) {
    case "playerConnected":
    case "characterSelected":
    case "playerStatChanged":
    case "playerUltimateCharged":
    case "playerAbilityUsed":
    case "playerUpgradeTierChanged":
    case "legendUpgradeSelected":
    case "grenadeThrown":
    case "gibraltarShieldAbsorbed":
    case "revenantForgedShadowDamaged":
    case "arenasItemSelected":
    case "arenasItemDeselected":
    case "bannerCollected":
    case "blackMarketAction":
    case "wraithPortal":
    case "warpGateUsed":
      if (playerName && players[playerName]) {
        players[playerName] = {
          ...players[playerName],
          ...message.player,
          lastUpdateTime: message.timestamp,
        };
        // grenadeThrownイベントでインベントリを更新
        if (category === "grenadeThrown" && message.linkedEntity) {
          const grenadeName = message.linkedEntity;
          if (
            players[playerName].inventory &&
            players[playerName].inventory[grenadeName]
          ) {
            players[playerName].inventory[grenadeName] -= 1;
            if (players[playerName].inventory[grenadeName] <= 0) {
              delete players[playerName].inventory[grenadeName];
            }
          }
        }

        // playerStatChangedイベントで統計情報を更新
        if (
          category === "playerStatChanged" &&
          message.statName &&
          message.newValue !== undefined
        ) {
          if (!players[playerName].stats) {
            players[playerName].stats = {};
          }
          players[playerName].stats[message.statName] = message.newValue;
        }
        // 生存状態自動判定
        autoUpdatePlayerState(players[playerName]);
      }
      break;

    case "playerRespawnTeam":
      // リスポーンさせたプレイヤーの情報を更新
      if (playerName && players[playerName]) {
        players[playerName] = {
          ...players[playerName],
          ...message.player,
          lastUpdateTime: message.timestamp,
        };
        autoUpdatePlayerState(players[playerName]);
      }

      // リスポーンされたチームメイトの情報を更新
      if (
        message.respawnedTeammates &&
        Array.isArray(message.respawnedTeammates)
      ) {
        message.respawnedTeammates.forEach((respawnedPlayer: any) => {
          const respawnedPlayerName = respawnedPlayer.name;
          if (respawnedPlayerName) {
            const existingPlayer = players[respawnedPlayerName];

            // 初期ロードアウトを準備
            const initialInventory: Record<string, number> = {};
            currentStartingLoadoutEquipment.forEach((item) => {
              if (item.item && item.quantity !== undefined) {
                initialInventory[item.item] = item.quantity;
              }
            });

            // プレイヤー情報を更新
            players[respawnedPlayerName] = {
              ...(existingPlayer || {
                stats: {
                  damageDealt: 0,
                  damageTaken: 0,
                  kills: 0,
                  assists: 0,
                  revivesGiven: 0,
                },
              }), // 既存の統計情報などを保持、なければ初期化
              ...respawnedPlayer,
              state: "Alive", // 状態を生存に更新
              lastUpdateTime: message.timestamp,
              currentHealth: 100, // リスポーン時はヘルス100
              maxHealth: 100,
              shieldHealth: 0,
              inventory: initialInventory, // 初期ロードアウトを適用
            };

            autoUpdatePlayerState(players[respawnedPlayerName]);
          }
        });
      }
      break;

    case "playerDisconnected":
      if (playerName && players[playerName]) {
        delete players[playerName];
      }
      break;

    case "playerDamaged":
      // 攻撃者と被害者の両方の情報を更新
      if (
        message.attacker &&
        message.attacker.name &&
        message.attacker.name !== "World"
      ) {
        const attackerName = message.attacker.name;
        if (!players[attackerName]) {
          // 攻撃者がまだリストにない場合（稀だが念のため）
          players[attackerName] = {
            name: attackerName,
            inventory: {},
            stats: {},
          };
        }
        players[attackerName] = {
          ...players[attackerName],
          ...message.attacker,
          lastUpdateTime: message.timestamp,
        };
        // 攻撃者のダメージ統計を加算（例: stats.damageDealt）
        if (!players[attackerName].stats) players[attackerName].stats = {};
        players[attackerName].stats.damageDealt =
          (players[attackerName].stats.damageDealt || 0) +
          message.damageInflicted;
        autoUpdatePlayerState(players[attackerName]);
      }
      if (message.victim && message.victim.name) {
        const victimName = message.victim.name;
        if (!players[victimName]) {
          // 被害者がまだリストにない場合（稀だが念のため）
          players[victimName] = { name: victimName, inventory: {}, stats: {} };
        }

        // LiveAPIのplayerDamagedイベントのvictim healthはダメージ適用前の値であると仮定し、
        // ダメージを適用した後のヘルスを計算して更新する
        const oldHealth =
          players[victimName].currentHealth ?? message.victim.currentHealth;
        const oldShield =
          players[victimName].shieldHealth ?? message.victim.shieldHealth;
        const damage = message.damageInflicted;

        const damageToShield = Math.min(oldShield, damage);
        const newShield = oldShield - damageToShield;
        const remainingDamage = damage - damageToShield;
        const newHealth = oldHealth - remainingDamage;

        players[victimName] = {
          ...players[victimName],
          ...message.victim,
          currentHealth: newHealth,
          shieldHealth: newShield,
          lastUpdateTime: message.timestamp,
        };
        // 被害者のダメージ統計を加算（例: stats.damageTaken）
        if (!players[victimName].stats) players[victimName].stats = {};
        players[victimName].stats.damageTaken =
          (players[victimName].stats.damageTaken || 0) +
          message.damageInflicted;
        autoUpdatePlayerState(players[victimName]);
      }
      break;

    case "playerKilled":
      // 攻撃者、被害者、awardedToの情報を更新
      if (
        message.attacker &&
        message.attacker.name &&
        message.attacker.name !== "World"
      ) {
        const attackerName = message.attacker.name;
        if (!players[attackerName]) {
          players[attackerName] = {
            name: attackerName,
            inventory: {},
            stats: {},
          };
        }
        players[attackerName] = {
          ...players[attackerName],
          ...message.attacker,
          lastUpdateTime: message.timestamp,
        };
        autoUpdatePlayerState(players[attackerName]);
      }
      if (message.victim && message.victim.name) {
        const victimName = message.victim.name;
        if (!players[victimName]) {
          players[victimName] = { name: victimName, inventory: {}, stats: {} };
        }
        players[victimName] = {
          ...players[victimName],
          ...message.victim,
          lastUpdateTime: message.timestamp,
        };
        // 被害者の状態を死亡に更新（例）
        players[victimName].state = "Eliminated";
        // ここで自動判定は不要
      }
      if (
        message.awardedTo &&
        message.awardedTo.name &&
        message.awardedTo.name !== "World"
      ) {
        const awardedToName = message.awardedTo.name;
        if (!players[awardedToName]) {
          players[awardedToName] = {
            name: awardedToName,
            inventory: {},
            stats: {},
          };
        }
        players[awardedToName] = {
          ...players[awardedToName],
          ...message.awardedTo,
          lastUpdateTime: message.timestamp,
        };
        // awardedToのキル統計を加算
        if (!players[awardedToName].stats) players[awardedToName].stats = {};
        players[awardedToName].stats.kills =
          (players[awardedToName].stats.kills || 0) + 1;
        autoUpdatePlayerState(players[awardedToName]);
      }
      break;

    case "playerDowned":
      if (playerName && players[playerName]) {
        players[playerName] = {
          ...players[playerName],
          ...message.player,
          lastUpdateTime: message.timestamp,
        };
        players[playerName].state = "Downed"; // 状態をダウンに更新
        // ここで自動判定は不要
      }
      // 攻撃者情報も含まれる場合がある
      if (
        message.attacker &&
        message.attacker.name &&
        message.attacker.name !== "World"
      ) {
        const attackerName = message.attacker.name;
        if (!players[attackerName]) {
          players[attackerName] = {
            name: attackerName,
            inventory: {},
            stats: {},
          };
        }
        players[attackerName] = {
          ...players[attackerName],
          ...message.attacker,
          lastUpdateTime: message.timestamp,
        };
        autoUpdatePlayerState(players[attackerName]);
      }
      break;

    case "playerRevive":
      // 蘇生したプレイヤーと蘇生されたプレイヤーの両方を更新
      if (playerName && players[playerName]) {
        // 蘇生したプレイヤー
        players[playerName] = {
          ...players[playerName],
          ...message.player,
          lastUpdateTime: message.timestamp,
        };
        // 蘇生したプレイヤーの統計を加算
        if (!players[playerName].stats) players[playerName].stats = {};
        players[playerName].stats.revivesGiven =
          (players[playerName].stats.revivesGiven || 0) + 1;
        autoUpdatePlayerState(players[playerName]);
      }
      if (message.revived && message.revived.name) {
        // 蘇生されたプレイヤー
        const revivedName = message.revived.name;
        if (!players[revivedName]) {
          players[revivedName] = {
            name: revivedName,
            inventory: {},
            stats: {},
          };
        }
        players[revivedName] = {
          ...players[revivedName],
          ...message.revived,
          lastUpdateTime: message.timestamp,
        };
        players[revivedName].state = "Alive"; // 状態を生存に更新
        autoUpdatePlayerState(players[revivedName]);
      }
      break;

    case "playerAssist":
      if (playerName && players[playerName]) {
        // アシストしたプレイヤー
        players[playerName] = {
          ...players[playerName],
          ...message.player,
          lastUpdateTime: message.timestamp,
        };
        // アシストしたプレイヤーの統計を加算
        if (!players[playerName].stats) players[playerName].stats = {};
        players[playerName].stats.assists =
          (players[playerName].stats.assists || 0) + 1;
        autoUpdatePlayerState(players[playerName]);
      }
      // 被害者の情報も含まれる場合がある
      if (message.victim && message.victim.name) {
        const victimName = message.victim.name;
        if (!players[victimName]) {
          players[victimName] = { name: victimName, inventory: {}, stats: {} };
        }
        players[victimName] = {
          ...players[victimName],
          ...message.victim,
          lastUpdateTime: message.timestamp,
        };
        autoUpdatePlayerState(players[victimName]);
      }
      break;

    case "squadEliminated":
      if (message.players && Array.isArray(message.players)) {
        message.players.forEach((p: any) => {
          if (p.name && players[p.name]) {
            // 排除されたプレイヤーの状態を更新
            players[p.name] = {
              ...players[p.name],
              ...p,
              lastUpdateTime: message.timestamp,
            };
            players[p.name].state = "Eliminated"; // 状態を排除に更新
            // ここで自動判定は不要
          }
        });
      }
      break;

    case "observerSwitched":
      // 現在のオブザーバー情報を更新
      currentObserverState = {
        observer: message.observer,
        target: message.target,
        timestamp: message.timestamp,
      };
      // オブザーバーとターゲットの情報を更新
      if (message.observer && message.observer.name) {
        const observerName = message.observer.name;
        if (!players[observerName]) {
          players[observerName] = {
            name: observerName,
            inventory: {},
            stats: {},
          };
        }
        players[observerName] = {
          ...players[observerName],
          ...message.observer,
          lastUpdateTime: message.timestamp,
        };
        autoUpdatePlayerState(players[observerName]);
      }
      if (message.target && message.target.name) {
        const targetName = message.target.name;
        if (!players[targetName]) {
          players[targetName] = { name: targetName, inventory: {}, stats: {} };
        }
        players[targetName] = {
          ...players[targetName],
          ...message.target,
          lastUpdateTime: message.timestamp,
        };
        autoUpdatePlayerState(players[targetName]);
      }
      if (message.targetTeam && Array.isArray(message.targetTeam)) {
        message.targetTeam.forEach((p: any) => {
          if (p.name) {
            const teamPlayerName = p.name;
            if (!players[teamPlayerName]) {
              players[teamPlayerName] = {
                name: teamPlayerName,
                inventory: {},
                stats: {},
              };
            }
            players[teamPlayerName] = {
              ...players[teamPlayerName],
              ...p,
              lastUpdateTime: message.timestamp,
            };
            autoUpdatePlayerState(players[teamPlayerName]);
          }
        });
      }
      break;

    case "inventoryPickUp":
      if (
        playerName &&
        players[playerName] &&
        message.item &&
        message.quantity !== undefined
      ) {
        // インベントリにアイテムを追加
        if (!players[playerName].inventory) {
          players[playerName].inventory = {};
        }

        // サバイバルアイテム（Evac Tower, Heat Shield, Mobile Respawn Beacon）は1つしか持てないための処理
        const survivalItems = [
          "Evac Tower",
          "Heat Shield",
          "Mobile Respawn Beacon",
        ];
        const pickedUpItemBaseName = message.item.replace(/\s\(.*\)$/, "");

        if (survivalItems.includes(pickedUpItemBaseName)) {
          // インベントリ内の他のサバイバルアイテムを削除
          Object.keys(players[playerName].inventory).forEach((key) => {
            const existingItemBaseName = key.replace(/\s\(.*\)$/, "");
            if (
              survivalItems.includes(existingItemBaseName) &&
              existingItemBaseName !== pickedUpItemBaseName
            ) {
              delete players[playerName].inventory[key];
            }
          });
        }

        // バックパックはレベル違いで1つしか持てないための処理
        if (pickedUpItemBaseName === "Backpack") {
          Object.keys(players[playerName].inventory).forEach((key) => {
            if (key.startsWith("Backpack") && key !== message.item) {
              delete players[playerName].inventory[key];
            }
          });
        }

        const currentQuantity =
          players[playerName].inventory[message.item] || 0;
        players[playerName].inventory[message.item] =
          currentQuantity + message.quantity;

        // プレイヤーの基本情報も更新（体力など）
        players[playerName] = {
          ...players[playerName],
          ...message.player,
          lastUpdateTime: message.timestamp,
        };
        autoUpdatePlayerState(players[playerName]);
      }
      break;

    case "inventoryDrop":
      if (
        playerName &&
        players[playerName] &&
        message.item &&
        message.quantity !== undefined
      ) {
        // インベントリからアイテムを削除
        if (
          players[playerName].inventory &&
          players[playerName].inventory[message.item]
        ) {
          // 上位レベルアイテムが存在する場合は削除をスキップ
          const itemBaseName = message.item.replace(/\s\(Level \d+\)$/, ""); // アイテム名からレベル情報を除去
          const higherLevelItemExists = Object.keys(
            players[playerName].inventory
          ).some(
            (key) =>
              key.startsWith(itemBaseName) &&
              key !== message.item &&
              /\(Level \d+\)$/.test(key)
          );

          if (!higherLevelItemExists) {
            players[playerName].inventory[message.item] -= message.quantity;
            if (players[playerName].inventory[message.item] <= 0) {
              delete players[playerName].inventory[message.item];
            }
          }
        }
        // プレイヤーの基本情報も更新（体力など）
        players[playerName] = {
          ...players[playerName],
          ...message.player,
          lastUpdateTime: message.timestamp,
        };
        autoUpdatePlayerState(players[playerName]);
      }
      break;

    case "inventoryUse":
      if (
        playerName &&
        players[playerName] &&
        message.item &&
        message.quantity !== undefined
      ) {
        // インベントリからアイテムを使用
        if (
          players[playerName].inventory &&
          players[playerName].inventory[message.item]
        ) {
          players[playerName].inventory[message.item] -= message.quantity;
          if (players[playerName].inventory[message.item] <= 0) {
            delete players[playerName].inventory[message.item];
          }
        }
        // プレイヤーの基本情報も更新（体力など）
        players[playerName] = {
          ...players[playerName],
          ...message.player,
          lastUpdateTime: message.timestamp,
        };
        autoUpdatePlayerState(players[playerName]);
      }
      break;

    case "ammoUsed":
      if (
        playerName &&
        players[playerName] &&
        message.ammoType &&
        message.oldAmmoCount !== undefined &&
        message.newAmmoCount !== undefined
      ) {
        players[playerName] = {
          ...players[playerName],
          ...message.player,
          lastUpdateTime: message.timestamp,
        };

        // oldAmmoCountに一致するインベントリアイテムを探す
        let foundItemKey: string | null = null;
        if (players[playerName].inventory) {
          for (const itemKey in players[playerName].inventory) {
            // 数量がoldAmmoCountと一致し、かつ弾薬タイプである可能性が高いアイテムを探す
            // ここでは単純に数量のみで判断していますが、より正確にはアイテム名のマッピングが必要です
            // 例: "Light Rounds", "Heavy Rounds", "Energy Ammo", "Shotgun Shells", "Sniper Rounds", "Arrows"
            // "special"というammoTypeが来た場合、どのアイテムか特定するためにoldAmmoCountを使う
            if (
              players[playerName].inventory[itemKey] === message.oldAmmoCount
            ) {
              // 弾薬っぽい名前かどうかで絞り込む（簡易的なチェック）
              if (
                itemKey.includes("Rounds") ||
                itemKey.includes("Ammo") ||
                itemKey.includes("Shells") ||
                itemKey.includes("Arrows") ||
                itemKey === "special" || // "special"も弾薬として扱う
                itemKey === "bullet" || // "bullet"も弾薬として扱う
                itemKey === "highcal" // "highcal"も弾薬として扱う
              ) {
                foundItemKey = itemKey;
                break; // 一致するものが見つかったらループを抜ける
              }
              // もし厳密なマッピングが必要なら、ここでammoTypeとitemKeyのマッピングを行う
              // 例: if (message.ammoType === "light" && itemKey === "Light Rounds") { ... }
            }
          }
        }

        if (foundItemKey) {
          // 見つかったアイテムの数量をnewAmmoCountで更新
          players[playerName].inventory[foundItemKey] = message.newAmmoCount;

          // もしnewAmmoCountが0以下になったらインベントリから削除する
          if (players[playerName].inventory[foundItemKey] <= 0) {
            delete players[playerName].inventory[foundItemKey];
          }
        } else {
          // oldAmmoCountに一致するアイテムが見つからなかった場合
          console.warn(
            `⚠️ ${playerName} のインベントリで oldAmmoCount ${message.oldAmmoCount} に一致する弾薬アイテムが見つかりませんでした。ammoType: ${message.ammoType}`
          );
          // 見つからなかった場合でも、ammoTypeをキーとしてnewAmmoCountを直接設定するフォールバック処理（任意）
          // これを行うと、"special"のような汎用名でインベントリが更新される可能性がある
          // players[playerName].inventory[message.ammoType] = message.newAmmoCount;
          // if (players[playerName].inventory[message.ammoType] <= 0) {
          //      delete players[playerName].inventory[message.ammoType];
          // }
        }
        autoUpdatePlayerState(players[playerName]);
      }
      break;

    case "matchSetup":
      // マッチセットアップ時に初期ロードアウトを保存し、既存プレイヤーに設定
      if (
        message.startingLoadout &&
        Array.isArray(message.startingLoadout.equipment)
      ) {
        // シールドバッテリーを除外して保存
        currentStartingLoadoutEquipment =
          message.startingLoadout.equipment.filter(
            (item: any) => item.item !== "Shield Battery"
          );
        const initialEquipment = currentStartingLoadoutEquipment;
        // 現在存在するすべてのプレイヤーのインベントリを初期化
        for (const name in players) {
          if (players[name]) {
            players[name].inventory = {};
            initialEquipment.forEach((item: any) => {
              if (item.item && item.quantity !== undefined) {
                players[name].inventory[item.item] = item.quantity;
              }
            });
            players[name].lastUpdateTime = message.timestamp;
          }
        }
        console.log("初期ロードアウトをプレイヤーに設定しました。");
      }
      // マップ情報なども必要に応じて保存可能
      // players.map = message.map; // 例
      break;

    case "gameStateChanged":
      if (
        message.state === "WaitingForPlayers" ||
        message.state === "Resolution"
      ) {
        // "Resolution"状態を追加
        // 新しいゲームが始まる際、またはゲーム終了時にプレイヤーリストをクリア
        console.log(
          `ゲーム状態が${message.state}になりました。プレイヤーリストをクリアします。`
        );
        for (const playerName in players) {
          delete players[playerName];
        }
        // ゲーム終了時に初期ロードアウトもリセットする（次のゲームのために）
        if (message.state === "Resolution") {
          currentStartingLoadoutEquipment = [];
          console.log("初期ロードアウト情報をクリアしました。");
        }
      }
      // 他の状態変化に対する処理が必要であればここに追加
      break;

    case "matchStateEnd":
      // ゲーム終了時の処理（必要に応じて）
      // 例: 勝利チームの情報をplayersオブジェクトに反映するなど
      if (message.winners && Array.isArray(message.winners)) {
        message.winners.forEach((p: any) => {
          if (p.name && players[p.name]) {
            players[p.name] = {
              ...players[p.name],
              ...p,
              lastUpdateTime: message.timestamp,
            };
            players[p.name].state = "Winner"; // 状態を勝利に更新（例）
          }
        });
      }
      break;

    // 他のカテゴリのイベントは、必要に応じてプレイヤー情報の更新ロジックを追加
    default:
      // プレイヤー情報を含まないイベントは無視するか、必要に応じて処理
      break;
  }
}

// 保存されたメッセージを取得する関数をエクスポート
export function getReceivedMessages() {
  // プレイヤー情報オブジェクトとオブザーバー情報を返す
  return {
    players,
    observer: currentObserverState,
  };
}

// main(); // 直接実行しない
// main(); // 直接実行しない
