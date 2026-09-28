const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { once } = require("node:events");
const test = require("node:test");
const { io } = require("socket.io-client");

const port = 33000 + Math.floor(Math.random() * 1000);
const serverUrl = `http://127.0.0.1:${port}`;
let serverProcess;
const clients = [];

const waitForServer = async () => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(
        `${serverUrl}/socket.io/?EIO=4&transport=polling`,
      );
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Test server did not start in time.");
};

const waitForEvent = (socket, eventName, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, listener);
      reject(new Error(`Timed out waiting for ${eventName} on ${socket.id}.`));
    }, timeoutMs);
    const listener = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(eventName, listener);
  });

const waitForMatchingEvent = (socket, eventName, predicate, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, listener);
      reject(new Error(`Timed out waiting for matching ${eventName}.`));
    }, timeoutMs);
    const listener = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(eventName, listener);
      resolve(payload);
    };
    socket.on(eventName, listener);
  });

const connectPlayer = async (name) => {
  const socket = io(serverUrl, {
    autoConnect: false,
    reconnection: false,
    transports: ["websocket"],
  });
  clients.push(socket);
  const connected = once(socket, "connect");
  socket.connect();
  await connected;
  socket.data = { name };
  return socket;
};

const queuePlayers = async (players, mode) => {
  const matchEvents = players.map((player) =>
    waitForEvent(player, "match_found"),
  );
  players.forEach((player) =>
    player.emit("tim_doi_thu", { name: player.data.name, mode }),
  );
  return Promise.all(matchEvents);
};

const makeBoard = (shops, gridSize) => {
  const board = Array(gridSize * gridSize).fill(null);
  shops.forEach((shop, row) => {
    for (let col = 0; col < shop.size; col++) {
      board[row * gridSize + col] = { shopId: shop.id };
    }
  });
  return board;
};

const setUpMatch = async (players, match) => {
  const starts = players.map((player) =>
    waitForEvent(player, "start_coin_flip"),
  );
  players.forEach((player) =>
    player.emit("ready_place_shops", {
      roomId: match.roomId,
      playerBoard: makeBoard(match.shops, match.gridSize),
    }),
  );
  const results = await Promise.all(starts);
  return results[0];
};

test(
  "supports random 1v1, 2v2 turns, team swaps, and private mode selection",
  { timeout: 45_000 },
  async (t) => {
    serverProcess = spawn(process.execPath, ["index.js"], {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        PORT: String(port),
        MONGO_URI: "mongodb://127.0.0.1:27099/san_quan_hem_test",
        JWT_SECRET: "integration-test-secret-long-enough-for-hmac",
        SMTP_HOST: "",
        SMTP_USER: "",
        SMTP_PASS: "",
        SMTP_FROM: "",
      },
      stdio: "ignore",
    });
    t.after(() => {
      clients.forEach((client) => client.disconnect());
      if (serverProcess && !serverProcess.killed) serverProcess.kill();
    });

    await waitForServer();

    const [one, two] = await Promise.all([
      connectPlayer("one"),
      connectPlayer("two"),
    ]);
    const [oneMatch, twoMatch] = await queuePlayers([one, two], "1v1");
    assert.equal(oneMatch.mode, "1v1");
    assert.equal(oneMatch.gridSize, 8);
    assert.deepEqual(
      oneMatch.shops.map((shop) => shop.size),
      [2, 3, 4],
    );
    assert.equal(twoMatch.roomId, oneMatch.roomId);

    const firstGame = await setUpMatch([one, two], oneMatch);
    const shooter = firstGame.firstTurnId === one.id ? one : two;
    const defender = shooter === one ? two : one;
    const hitEvents = [
      waitForEvent(one, "shot_result"),
      waitForEvent(two, "shot_result"),
    ];
    shooter.emit("fire_shot", {
      roomId: oneMatch.roomId,
      targetSocketId: defender.id,
      targetIndex: 0,
    });
    const hitResult = await hitEvents[0];
    assert.equal(hitResult.isHit, true);
    assert.equal(hitResult.nextTurnId, shooter.id);

    const missEvents = [
      waitForEvent(one, "shot_result"),
      waitForEvent(two, "shot_result"),
    ];
    shooter.emit("fire_shot", {
      roomId: oneMatch.roomId,
      targetSocketId: defender.id,
      targetIndex: 63,
    });
    const missResult = await missEvents[0];
    assert.equal(missResult.isHit, false);
    assert.equal(missResult.nextTurnId, defender.id);

    const teamPlayers = await Promise.all([
      connectPlayer("red-one"),
      connectPlayer("blue-one"),
      connectPlayer("red-two"),
      connectPlayer("blue-two"),
    ]);
    const teamMatches = await queuePlayers(teamPlayers, "2v2");
    const teamMatch = teamMatches[0];
    assert.equal(teamMatch.mode, "2v2");
    assert.equal(teamMatch.gridSize, 10);
    assert.deepEqual(
      teamMatch.shops.map((shop) => shop.size),
      [2, 3, 4, 5],
    );
    assert.equal(
      teamMatch.players.filter((player) => player.team === "red").length,
      2,
    );
    assert.equal(
      teamMatch.players.filter((player) => player.team === "blue").length,
      2,
    );

    const redPlayer = teamPlayers.find((player) =>
      teamMatch.players.some(
        (entry) => entry.socketId === player.id && entry.team === "red",
      ),
    );
    const bluePlayer = teamPlayers.find((player) =>
      teamMatch.players.some(
        (entry) => entry.socketId === player.id && entry.team === "blue",
      ),
    );
    const swapped = waitForEvent(redPlayer, "teams_updated");
    redPlayer.emit("swap_teams", {
      roomId: teamMatch.roomId,
      targetSocketId: bluePlayer.id,
    });
    const updatedTeams = await swapped;
    assert.ok(Array.isArray(updatedTeams.players));
    assert.equal(
      updatedTeams.players.find((player) => player.socketId === redPlayer.id)
        .team,
      "blue",
    );

    const teamStart = await setUpMatch(teamPlayers, teamMatch);
    const teamShooter = teamPlayers.find(
      (player) => player.id === teamStart.firstTurnId,
    );
    const teamEnemy = teamStart.turnOrder
      .map((id) => teamPlayers.find((player) => player.id === id))
      .find((player) => player.id !== teamShooter.id);
    const teamShotEvents = teamPlayers.map((player) =>
      waitForEvent(player, "shot_result"),
    );
    teamShooter.emit("fire_shot", {
      roomId: teamMatch.roomId,
      targetSocketId: teamEnemy.id,
      targetIndex: 0,
    });
    const teamHit = await teamShotEvents[0];
    assert.equal(teamHit.isHit, true);
    assert.equal(teamHit.nextTurnId, teamShooter.id);

    const roomHost = await connectPlayer("room-host");
    const roomCodeEvent = waitForEvent(roomHost, "private_room_created");
    roomHost.emit("create_private_room", { name: "room-host", mode: "1v1" });
    const roomCreated = await roomCodeEvent;
    const modeChanged = waitForMatchingEvent(
      roomHost,
      "room_lobby_update",
      (update) => update.mode === "2v2",
    );
    roomHost.emit("set_private_mode", {
      roomId: roomCreated.roomId,
      mode: "2v2",
    });
    const privateMode = await modeChanged;
    assert.equal(privateMode.playerCount, 4);
    assert.equal(privateMode.gridSize, 10);

    const guests = await Promise.all([
      connectPlayer("guest-one"),
      connectPlayer("guest-two"),
      connectPlayer("guest-three"),
    ]);
    for (const guest of guests.slice(0, 2)) {
      const update = waitForEvent(roomHost, "room_lobby_update");
      guest.emit("join_private_room", {
        roomCode: roomCreated.roomCode,
        name: guest.data.name,
      });
      await update;
    }
    const privateMatches = [roomHost, ...guests].map((player) =>
      waitForEvent(player, "match_found"),
    );
    guests[2].emit("join_private_room", {
      roomCode: roomCreated.roomCode,
      name: guests[2].data.name,
    });
    const privateMatchResults = await Promise.all(privateMatches);
    assert.ok(privateMatchResults.every((match) => match.mode === "2v2"));
    assert.ok(privateMatchResults.every((match) => match.gridSize === 10));
  },
);
