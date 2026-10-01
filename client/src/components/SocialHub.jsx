import { useEffect, useState } from "react";
import { apiUrl } from "../utils/api";

const SECTIONS = [
  ["profile", "Hồ sơ"],
  ["history", "Lịch sử đấu"],
  ["friends", "Bạn bè & hẹn đấu"],
  ["messages", "Tin nhắn riêng"],
];
const REACTIONS = [
  ["heart", "💖", "Dễ thương"],
  ["respect", "🫡", "Nể phục"],
  ["spicy", "🌶️", "Cay nha"],
  ["gg", "🎮", "GG"],
];
const AVATARS = { scooter: "🛵", tea: "🧋", noodles: "🍜" };
const THEMES = {
  alley: "from-emerald-950 via-zinc-900 to-zinc-950",
  night: "from-indigo-950 via-zinc-900 to-zinc-950",
  market: "from-amber-950 via-zinc-900 to-zinc-950",
};

async function socialRequest(path, token, options = {}) {
  const response = await fetch(apiUrl(`/api/social${path}`), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.message || "Yêu cầu không thành công.");
  return body;
}

function MatchBoard({ player, size }) {
  const cells = new Map((player.board || []).map((cell) => [cell.index, cell]));
  return (
    <div
      className="grid aspect-square w-full max-w-60 overflow-hidden border border-orange-400/60 bg-slate-950"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: size * size }, (_, index) => {
        const cell = cells.get(index);
        return (
          <div
            key={index}
            title={`${String.fromCharCode(65 + Math.floor(index / size))}/${(index % size) + 1}${cell?.shopId ? ` · ${cell.shopId}` : ""}${cell?.shot ? ` · ${cell.shot}` : ""}`}
            className={`border border-orange-500/20 ${cell?.shopId ? "bg-emerald-500/50" : ""} ${cell?.shot === "HIT" ? "!bg-rose-500" : ""} ${cell?.shot === "MISS" ? "!bg-sky-950" : ""}`}
          />
        );
      })}
    </div>
  );
}

export default function SocialHub({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate,
  socket,
}) {
  const [section, setSection] = useState("profile");
  const [selfProfile, setSelfProfile] = useState(null);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    bio: "",
    profileTheme: "alley",
    avatarId: "scooter",
    equippedDecoration: "",
  });
  const [history, setHistory] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [friendships, setFriendships] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [directMessages, setDirectMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const token = () => localStorage.getItem("token");
  const ownProfile = profileData?.profile?._id === selfProfile?.id;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const load = async () => {
      try {
        const [me, friendList, inviteList] = await Promise.all([
          socialRequest("/me", token()),
          socialRequest("/friends", token()),
          socialRequest("/challenges", token()),
        ]);
        if (!active) return;
        setSelfProfile(me);
        setProfileUsername((value) => value || me.username || "");
        setFriendships(friendList);
        setChallenges(inviteList);
        setProfileForm({
          displayName: me.displayName || "",
          bio: me.bio || "",
          profileTheme: me.profileTheme || "alley",
          avatarId: me.avatarId || "scooter",
          equippedDecoration: me.equippedDecoration || "",
        });
      } catch (loadError) {
        if (active) setError(loadError.message);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isOpen, refreshKey]);

  useEffect(() => {
    if (!isOpen || !profileUsername) return;
    let active = true;
    const loadProfile = async () => {
      try {
        const result = await socialRequest(
          `/profiles/${encodeURIComponent(profileUsername)}`,
          token(),
        );
        const reactionState = selfProfile
          ? await socialRequest(
              `/profiles/${result.profile._id}/reactions`,
              token(),
            )
          : { reactions: result.reactions, myReaction: null };
        if (!active) return;
        setProfileData({ ...result, ...reactionState });
        setError("");
      } catch (loadError) {
        if (active) {
          setProfileData(null);
          setError(loadError.message);
        }
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [isOpen, profileUsername, selfProfile, refreshKey]);

  useEffect(() => {
    if (!isOpen || section !== "history") return;
    let active = true;
    socialRequest("/history", token())
      .then((result) => {
        if (active) setHistory(result.matches || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => {
      active = false;
    };
  }, [isOpen, section, refreshKey]);

  useEffect(() => {
    if (!isOpen || section !== "messages" || !selectedFriend) return;
    let active = true;
    const loadMessages = () =>
      socialRequest(`/messages/${selectedFriend._id}`, token())
        .then((messages) => {
          if (active) setDirectMessages(messages);
        })
        .catch((loadError) => {
          if (active) setError(loadError.message);
        });
    loadMessages();
    const interval = setInterval(loadMessages, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOpen, section, selectedFriend, refreshKey]);

  useEffect(() => {
    if (!isOpen || !socket) return;
    const refreshSocial = () => setRefreshKey((value) => value + 1);
    const receiveMessage = (message) => {
      if (
        selectedFriend &&
        (message.senderId === selectedFriend._id ||
          message.recipientId === selectedFriend._id)
      ) {
        setDirectMessages((messages) => [...messages, message]);
      }
      refreshSocial();
    };
    socket.on("friend_request", refreshSocial);
    socket.on("friend_request_updated", refreshSocial);
    socket.on("friend_challenge", refreshSocial);
    socket.on("friend_challenge_updated", refreshSocial);
    socket.on("receive_direct_message", receiveMessage);
    return () => {
      socket.off("friend_request", refreshSocial);
      socket.off("friend_request_updated", refreshSocial);
      socket.off("friend_challenge", refreshSocial);
      socket.off("friend_challenge_updated", refreshSocial);
      socket.off("receive_direct_message", receiveMessage);
    };
  }, [isOpen, socket, selectedFriend]);

  if (!isOpen) return null;

  const changeSection = (nextSection) => {
    setSection(nextSection);
    setError("");
    setStatus("");
  };

  const perform = async (operation, successText) => {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await operation();
      setStatus(successText);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = (event) => {
    event.preventDefault();
    perform(async () => {
      const saved = await socialRequest("/profile", token(), {
        method: "PUT",
        body: JSON.stringify(profileForm),
      });
      setSelfProfile((profile) => ({ ...profile, ...saved }));
      setProfileData((result) =>
        result?.profile?._id === selfProfile?.id
          ? { ...result, profile: { ...result.profile, ...saved } }
          : result,
      );
      onUserUpdate?.({ ...currentUser, ...saved });
      localStorage.setItem(
        "user",
        JSON.stringify({ ...currentUser, ...saved }),
      );
    }, "Đã lưu hồ sơ.");
  };

  const reactToProfile = (reaction) =>
    perform(async () => {
      const result = await socialRequest(
        `/profiles/${profileData.profile._id}/reactions`,
        token(),
        { method: "POST", body: JSON.stringify({ reaction }) },
      );
      setProfileData((profile) => ({ ...profile, ...result }));
    }, "Đã cập nhật reaction.");

  const addFriend = (username) =>
    perform(async () => {
      await socialRequest("/friends", token(), {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      setDirectoryResults([]);
      setDirectoryQuery("");
    }, "Đã gửi lời mời kết bạn.");

  const searchPlayers = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const results = await socialRequest(
        `/directory?search=${encodeURIComponent(directoryQuery)}`,
        token(),
      );
      setDirectoryResults(results);
    } catch (searchError) {
      setError(searchError.message);
    }
  };

  const loadHistoryDetail = async (gameId) => {
    try {
      const match = await socialRequest(
        `/history/${encodeURIComponent(gameId)}`,
        token(),
      );
      setSelectedMatch(match);
    } catch (historyError) {
      setError(historyError.message);
    }
  };

  const submitMessage = (event) => {
    event.preventDefault();
    if (!selectedFriend || !messageDraft.trim()) return;
    perform(async () => {
      const message = await socialRequest(
        `/messages/${selectedFriend._id}`,
        token(),
        {
          method: "POST",
          body: JSON.stringify({ text: messageDraft.trim() }),
        },
      );
      setDirectMessages((messages) => [...messages, message]);
      setMessageDraft("");
    }, "Đã gửi tin nhắn.");
  };

  const viewProfile = (username) => {
    setProfileUsername(username);
    setProfileSearch(username);
    changeSection("profile");
  };

  const acceptedFriends = friendships.filter(
    (entry) => entry.status === "accepted",
  );
  const incomingRequests = friendships.filter(
    (entry) => entry.status === "pending" && entry.direction === "incoming",
  );
  const outgoingRequests = friendships.filter(
    (entry) => entry.status === "pending" && entry.direction === "outgoing",
  );
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-5">
      <section className="flex h-[min(94dvh,54rem)] w-full max-w-5xl flex-col overflow-hidden border-2 border-amber-500/50 bg-slate-950 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-amber-500/20 bg-slate-900/90 px-4 py-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">
              Hẻm kết nối
            </div>
            <h2 className="text-lg font-black">Hồ sơ & bạn bè</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="h-9 w-9 border border-slate-700 text-lg text-slate-300 hover:border-amber-400 hover:text-white"
          >
            ×
          </button>
        </header>

        <nav
          className="flex shrink-0 overflow-x-auto border-b border-slate-800 bg-slate-950 px-2"
          aria-label="Mục xã hội"
        >
          {SECTIONS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => changeSection(id)}
              aria-current={section === id ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-[11px] font-black ${section === id ? "border-amber-400 text-amber-200" : "border-transparent text-slate-500 hover:text-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {status && (
            <div
              role="status"
              className="mb-3 border-l-2 border-emerald-400 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200"
            >
              {status}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mb-3 border-l-2 border-rose-400 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
            >
              {error}
            </div>
          )}

          {section === "profile" && (
            <div className="mx-auto max-w-3xl space-y-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  viewProfile(profileSearch.trim());
                }}
                className="flex gap-2"
              >
                <input
                  value={profileSearch}
                  onChange={(event) => setProfileSearch(event.target.value)}
                  placeholder="Tìm hồ sơ bằng username"
                  className="min-w-0 flex-1 border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                />
                <button className="border border-amber-500/50 px-3 text-xs font-black text-amber-200">
                  Xem hồ sơ
                </button>
              </form>

              {profileData ? (
                <>
                  <article
                    className={`relative overflow-hidden border border-amber-400/40 bg-gradient-to-br ${THEMES[profileData.profile.profileTheme] || THEMES.alley} p-4 sm:p-6`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-16 w-16 place-items-center border border-amber-300/50 bg-black/30 text-3xl">
                          {AVATARS[profileData.profile.avatarId] || "🛵"}
                        </div>
                        <div>
                          <h3 className="text-xl font-black">
                            {profileData.profile.displayName}
                            {profileData.profile.isDonor && (
                              <span
                                className="ml-1 animate-pulse text-amber-300"
                                title="Người ủng hộ"
                              >
                                ✨
                              </span>
                            )}
                          </h3>
                          <div className="mt-1 text-xs text-slate-300">
                            @{profileData.profile.username}
                          </div>
                          {profileData.profile.equippedDecoration && (
                            <div className="mt-1 text-[10px] text-amber-300">
                              ◇ {profileData.profile.equippedDecoration}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-5 text-right text-xs">
                        <div>
                          <b className="block text-lg text-emerald-300">
                            {profileData.profile.wins || 0}
                          </b>
                          <span className="text-slate-400">thắng</span>
                        </div>
                        <div>
                          <b className="block text-lg">
                            {profileData.profile.matches || 0}
                          </b>
                          <span className="text-slate-400">trận</span>
                        </div>
                        <div>
                          <b className="block text-lg text-amber-200">
                            {profileData.friendCount}
                          </b>
                          <span className="text-slate-400">bạn</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                      {profileData.profile.bio || "Chưa có lời giới thiệu."}
                    </p>
                  </article>

                  {ownProfile ? (
                    <form
                      onSubmit={saveProfile}
                      className="border-t border-slate-800 pt-4"
                    >
                      <h3 className="mb-3 text-xs font-black uppercase text-amber-200">
                        Tùy chỉnh hồ sơ
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-[10px] font-bold text-slate-400">
                          Tên hiển thị
                          <input
                            maxLength={32}
                            value={profileForm.displayName}
                            onChange={(event) =>
                              setProfileForm({
                                ...profileForm,
                                displayName: event.target.value,
                              })
                            }
                            className="mt-1 w-full border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-slate-400">
                          Ảnh đại diện
                          <select
                            value={profileForm.avatarId}
                            onChange={(event) =>
                              setProfileForm({
                                ...profileForm,
                                avatarId: event.target.value,
                              })
                            }
                            className="mt-1 w-full border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
                          >
                            <option value="scooter">🛵 Xe máy</option>
                            <option value="tea">🧋 Trà sữa</option>
                            <option value="noodles">🍜 Mì nóng</option>
                          </select>
                        </label>
                        <label className="text-[10px] font-bold text-slate-400">
                          Giao diện
                          <select
                            value={profileForm.profileTheme}
                            onChange={(event) =>
                              setProfileForm({
                                ...profileForm,
                                profileTheme: event.target.value,
                              })
                            }
                            className="mt-1 w-full border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
                          >
                            <option value="alley">Hẻm xanh</option>
                            <option value="night">Đêm phố</option>
                            <option value="market">Chợ khuya</option>
                          </select>
                        </label>
                        <label className="text-[10px] font-bold text-slate-400">
                          Trang trí đang sở hữu
                          <select
                            value={profileForm.equippedDecoration}
                            onChange={(event) =>
                              setProfileForm({
                                ...profileForm,
                                equippedDecoration: event.target.value,
                              })
                            }
                            className="mt-1 w-full border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
                          >
                            <option value="">Không dùng</option>
                            {(selfProfile?.inventory || []).map((item) => (
                              <option key={item.itemId} value={item.itemId}>
                                {item.itemId} × {item.quantity}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="mt-3 block text-[10px] font-bold text-slate-400">
                        Giới thiệu
                        <textarea
                          maxLength={280}
                          rows={3}
                          value={profileForm.bio}
                          onChange={(event) =>
                            setProfileForm({
                              ...profileForm,
                              bio: event.target.value,
                            })
                          }
                          className="mt-1 w-full resize-y border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
                          placeholder="Kể một chút về bạn trong hẻm…"
                        />
                      </label>
                      <button
                        disabled={busy}
                        className="mt-3 bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-50"
                      >
                        Lưu hồ sơ
                      </button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
                      {REACTIONS.map(([reaction, icon, label]) => (
                        <button
                          key={reaction}
                          type="button"
                          onClick={() => reactToProfile(reaction)}
                          aria-pressed={profileData.myReaction === reaction}
                          className={`border px-3 py-2 text-xs font-bold ${profileData.myReaction === reaction ? "border-amber-300 bg-amber-400/20 text-amber-100" : "border-slate-700 text-slate-300"}`}
                        >
                          {icon} {label}{" "}
                          <span className="ml-1 text-slate-500">
                            {profileData.reactions?.[reaction] || 0}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => addFriend(profileData.profile.username)}
                        className="ml-auto border border-emerald-500/50 px-3 py-2 text-xs font-black text-emerald-200"
                      >
                        + Kết bạn
                      </button>
                    </div>
                  )}
                </>
              ) : !error ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Đang tải hồ sơ…
                </div>
              ) : null}
            </div>
          )}

          {section === "history" && (
            <div className="mx-auto max-w-4xl">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h3 className="text-sm font-black">Lịch sử đấu</h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Xem lại cả hai sơ đồ và thứ tự từng phát bắn.
                  </p>
                </div>
                <span className="text-[10px] text-slate-500">
                  {history.length} trận gần nhất
                </span>
              </div>
              {selectedMatch ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(null)}
                    className="mb-3 text-xs font-bold text-amber-300"
                  >
                    ← Tất cả trận
                  </button>
                  <div className="mb-4 border-b border-slate-800 pb-3">
                    <h3 className="font-mono text-sm font-black text-amber-200">
                      {selectedMatch.gameId}
                    </h3>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {selectedMatch.mode} · đội thắng{" "}
                      {selectedMatch.winnerTeam} ·{" "}
                      {new Date(selectedMatch.finishedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedMatch.players.map((player, index) => (
                      <div
                        key={`${player.name}-${index}`}
                        className="border border-slate-800 p-3"
                      >
                        <div className="mb-3 flex justify-between text-xs">
                          <b>{player.name}</b>
                          <span className="text-slate-500">
                            Đội {player.team}
                          </span>
                        </div>
                        <MatchBoard
                          player={player}
                          size={selectedMatch.gridSize}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5">
                    <h4 className="mb-2 text-xs font-black uppercase text-slate-400">
                      Diễn biến lượt bắn
                    </h4>
                    <ol className="max-h-56 space-y-1 overflow-y-auto border-y border-slate-800 py-2">
                      {(selectedMatch.shots || []).map((shot) => (
                        <li
                          key={shot.sequence}
                          className="flex gap-2 py-1 text-[10px]"
                        >
                          <span className="w-7 shrink-0 font-mono text-slate-600">
                            #{shot.sequence}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {shot.shooterName} → {shot.targetName}
                          </span>
                          <span className="font-bold text-amber-200">
                            {String.fromCharCode(
                              65 +
                                Math.floor(
                                  shot.targetIndex / selectedMatch.gridSize,
                                ),
                            )}
                            /{(shot.targetIndex % selectedMatch.gridSize) + 1}
                          </span>
                          <span
                            className={
                              shot.result === "MISS"
                                ? "text-sky-300"
                                : "text-rose-300"
                            }
                          >
                            {shot.result === "MISS"
                              ? "Trượt"
                              : shot.result === "SUNK"
                                ? "Hạ quán"
                                : "Trúng"}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : history.length ? (
                <div className="divide-y divide-slate-800 border-y border-slate-800">
                  {history.map((match) => {
                    const mine = match.players.find(
                      (player) =>
                        String(player.userId) === String(selfProfile?.id),
                    );
                    const won = mine?.team === match.winnerTeam;
                    return (
                      <button
                        key={match.gameId}
                        type="button"
                        onClick={() => loadHistoryDetail(match.gameId)}
                        className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-900/70"
                      >
                        <span>
                          <span className="font-mono text-[11px] text-slate-300">
                            {match.mode} ·{" "}
                            {new Date(match.finishedAt).toLocaleDateString()}
                          </span>
                          <span className="mt-1 block text-[10px] text-slate-500">
                            {match.players
                              .map((player) => player.name)
                              .join(" vs ")}
                          </span>
                        </span>
                        <span
                          className={`text-[10px] font-black ${won ? "text-emerald-300" : "text-rose-300"}`}
                        >
                          {won ? "THẮNG" : "THUA"}{" "}
                          <span className="ml-2 text-amber-300">Xem map →</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-800 py-10 text-center text-xs text-slate-500">
                  Chưa có trận đã lưu. Lịch sử được ghi sau khi ván kết thúc.
                </div>
              )}
            </div>
          )}

          {section === "friends" && (
            <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <h3 className="mb-3 text-sm font-black">Tìm người chơi</h3>
                <form onSubmit={searchPlayers} className="flex gap-2">
                  <input
                    minLength={2}
                    value={directoryQuery}
                    onChange={(event) => setDirectoryQuery(event.target.value)}
                    placeholder="Username hoặc tên hiển thị"
                    className="min-w-0 flex-1 border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
                  />
                  <button className="bg-amber-400 px-3 text-xs font-black text-slate-950">
                    Tìm
                  </button>
                </form>
                <div className="mt-3 divide-y divide-slate-800">
                  {directoryResults.map((person) => (
                    <div
                      key={person._id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => viewProfile(person.username)}
                        className="min-w-0 truncate text-left text-xs font-bold"
                      >
                        {person.displayName}{" "}
                        <span className="text-slate-500">
                          @{person.username}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addFriend(person.username)}
                        className="shrink-0 border border-emerald-600/50 px-2 py-1 text-[10px] text-emerald-200"
                      >
                        Kết bạn
                      </button>
                    </div>
                  ))}
                </div>
                <h3 className="mb-2 mt-6 text-xs font-black uppercase text-amber-200">
                  Bạn bè · {acceptedFriends.length}
                </h3>
                <div className="divide-y divide-slate-800 border-y border-slate-800">
                  {acceptedFriends.map((entry) => (
                    <div
                      key={entry._id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => viewProfile(entry.friend.username)}
                        className="text-left text-xs font-bold"
                      >
                        {entry.friend.displayName}
                        {entry.friend.isDonor && (
                          <span className="ml-1 text-amber-300">✨</span>
                        )}
                        <span className="ml-2 text-[10px] text-slate-500">
                          @{entry.friend.username}
                        </span>
                        <span
                          className={`ml-2 text-[9px] ${entry.friend.inMatch ? "text-amber-300" : entry.friend.isOnline ? "text-emerald-300" : "text-slate-600"}`}
                        >
                          {entry.friend.inMatch
                            ? "Đang đấu"
                            : entry.friend.isOnline
                              ? "Online"
                              : "Offline"}
                        </span>
                      </button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFriend(entry.friend);
                            changeSection("messages");
                          }}
                          className="border border-slate-700 px-2 py-1 text-[10px]"
                        >
                          Nhắn tin
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            perform(
                              () =>
                                socialRequest(
                                  `/challenges/${entry.friend._id}`,
                                  token(),
                                  { method: "POST", body: JSON.stringify({}) },
                                ),
                              "Đã gửi lời hẹn đấu.",
                            )
                          }
                          className="border border-amber-700/50 px-2 py-1 text-[10px] text-amber-200"
                        >
                          Hẹn đấu
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            perform(
                              () =>
                                socialRequest(
                                  `/friends/${entry._id}`,
                                  token(),
                                  { method: "DELETE" },
                                ),
                              "Đã xóa bạn bè.",
                            )
                          }
                          aria-label={`Xóa ${entry.friend.displayName}`}
                          className="border border-slate-700 px-2 py-1 text-[10px] text-slate-400"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {!acceptedFriends.length && (
                  <p className="py-3 text-[10px] text-slate-500">
                    Kết bạn để nhắn tin hoặc hẹn đấu riêng.
                  </p>
                )}
              </div>

              <div className="space-y-6">
                <section>
                  <h3 className="mb-2 text-xs font-black uppercase text-amber-200">
                    Lời mời đã gửi
                  </h3>
                  {outgoingRequests.length ? (
                    outgoingRequests.map((entry) => (
                      <div
                        key={entry._id}
                        className="border-b border-slate-800 py-2 text-xs"
                      >
                        {entry.friend?.displayName || "Người chơi"}
                        <span className="ml-2 text-[10px] text-slate-500">
                          Đang chờ phản hồi
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-500">
                      Không có lời mời đang chờ.
                    </p>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-black uppercase text-amber-200">
                    Lời mời kết bạn
                  </h3>
                  {incomingRequests.length ? (
                    incomingRequests.map((entry) => (
                      <div
                        key={entry._id}
                        className="flex items-center justify-between border-b border-slate-800 py-2 text-xs"
                      >
                        <span>
                          {entry.friend?.displayName ||
                            entry.requesterId?.displayName}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              perform(
                                () =>
                                  socialRequest(
                                    `/friends/${entry._id}`,
                                    token(),
                                    {
                                      method: "PATCH",
                                      body: JSON.stringify({
                                        status: "accepted",
                                      }),
                                    },
                                  ),
                                "Đã kết nối bạn bè.",
                              )
                            }
                            className="bg-emerald-600 px-2 py-1 text-[10px] font-bold"
                          >
                            Chấp nhận
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              perform(
                                () =>
                                  socialRequest(
                                    `/friends/${entry._id}`,
                                    token(),
                                    {
                                      method: "PATCH",
                                      body: JSON.stringify({
                                        status: "declined",
                                      }),
                                    },
                                  ),
                                "Đã bỏ qua lời mời.",
                              )
                            }
                            className="border border-slate-700 px-2 py-1 text-[10px]"
                          >
                            Bỏ qua
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-500">
                      Không có lời mời mới.
                    </p>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-black uppercase text-amber-200">
                    Hẹn đấu
                  </h3>
                  {challenges.length ? (
                    challenges.map((challenge) => {
                      const other =
                        challenge.direction === "incoming"
                          ? challenge.senderId
                          : challenge.recipientId;
                      return (
                        <div
                          key={challenge._id}
                          className="border-b border-slate-800 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold">
                              {other?.displayName || "Bạn bè"}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase ${challenge.status === "scheduled" ? "text-amber-300" : "text-slate-500"}`}
                            >
                              {challenge.status === "scheduled"
                                ? "Sau trận hiện tại"
                                : challenge.status}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-1">
                            {challenge.direction === "incoming" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    perform(
                                      () =>
                                        socialRequest(
                                          `/challenges/${challenge._id}`,
                                          token(),
                                          {
                                            method: "PATCH",
                                            body: JSON.stringify({
                                              action: "accept",
                                            }),
                                          },
                                        ),
                                      "Đã nhận lời hẹn đấu.",
                                    )
                                  }
                                  className="border border-emerald-700/60 px-2 py-1 text-[10px] text-emerald-200"
                                >
                                  Nhận lời
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    perform(
                                      () =>
                                        socialRequest(
                                          `/challenges/${challenge._id}`,
                                          token(),
                                          {
                                            method: "PATCH",
                                            body: JSON.stringify({
                                              action: "decline",
                                            }),
                                          },
                                        ),
                                      "Đã từ chối lời hẹn.",
                                    )
                                  }
                                  className="border border-slate-700 px-2 py-1 text-[10px]"
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                            {["accepted", "scheduled"].includes(
                              challenge.status,
                            ) && (
                              <button
                                type="button"
                                onClick={() =>
                                  perform(async () => {
                                    await socialRequest(
                                      `/challenges/${challenge._id}/start`,
                                      token(),
                                      {
                                        method: "POST",
                                        body: JSON.stringify({}),
                                      },
                                    );
                                    onClose();
                                  }, "Đang mở trận hẹn đấu.")
                                }
                                className="bg-amber-400 px-2 py-1 text-[10px] font-black text-slate-950"
                              >
                                Bắt đầu hẹn đấu
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-slate-500">
                      Chưa có lời hẹn. Nếu bạn đang trong trận, bạn bè có thể
                      gửi lời hẹn để bạn nhận sau.
                    </p>
                  )}
                </section>
              </div>
            </div>
          )}

          {section === "messages" && (
            <div className="mx-auto flex h-full max-w-3xl flex-col">
              <label className="mb-3 text-[10px] font-bold text-slate-500">
                Cuộc trò chuyện
                <select
                  value={selectedFriend?._id || ""}
                  onChange={(event) => {
                    const friend = acceptedFriends.find(
                      (entry) => entry.friend._id === event.target.value,
                    )?.friend;
                    setSelectedFriend(friend || null);
                    setDirectMessages([]);
                  }}
                  className="mt-1 w-full border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
                >
                  <option value="">Chọn bạn bè</option>
                  {acceptedFriends.map((entry) => (
                    <option key={entry.friend._id} value={entry.friend._id}>
                      {entry.friend.displayName}
                    </option>
                  ))}
                </select>
              </label>
              {selectedFriend ? (
                <>
                  <div className="min-h-48 flex-1 space-y-2 overflow-y-auto border-y border-slate-800 py-3">
                    {directMessages.map((message) => {
                      const sent = message.senderId === selfProfile?.id;
                      return (
                        <div
                          key={message._id || message.id}
                          className={`flex ${sent ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 text-xs ${sent ? "bg-emerald-900/70 text-emerald-50" : "bg-slate-800 text-slate-100"}`}
                          >
                            <p>{message.text}</p>
                            <time className="mt-1 block text-right text-[9px] opacity-50">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </time>
                          </div>
                        </div>
                      );
                    })}
                    {!directMessages.length && (
                      <p className="text-center text-[10px] text-slate-600">
                        Chưa có tin nhắn. Bắt đầu cuộc trò chuyện.
                      </p>
                    )}
                  </div>
                  <form onSubmit={submitMessage} className="mt-3 flex gap-2">
                    <input
                      maxLength={1000}
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder={`Nhắn riêng cho ${selectedFriend.displayName}`}
                      className="min-w-0 flex-1 border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                    <button
                      disabled={busy || !messageDraft.trim()}
                      className="bg-emerald-500 px-4 text-xs font-black text-slate-950 disabled:opacity-40"
                    >
                      Gửi
                    </button>
                  </form>
                </>
              ) : (
                <div className="grid flex-1 place-items-center border border-dashed border-slate-800 text-xs text-slate-500">
                  Chọn một người bạn để nhắn tin.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
