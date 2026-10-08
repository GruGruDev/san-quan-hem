import { useEffect, useState } from "react";
import { apiUrl } from "./utils/api";

const NAV_ITEMS = [
  ["overview", "Tổng quan", "▦"],
  ["players", "Người chơi", "♙"],
  ["online", "Người chơi Online", "●"],
  ["rooms", "Phòng chơi", "⌂"],
  ["matches", "Trận đấu", "⚔"],
  ["shops", "Quán / Chiến hạm", "▤"],
  ["items", "Vật phẩm", "◇"],
  ["payments", "Đơn nạp Coin", "¤"],
  ["leaderboard", "BXH", "♜"],
  ["reports", "Báo cáo / Gian lận", "⚑"],
  ["announcements", "Thông báo", "▣"],
  ["analytics", "Thống kê", "▥"],
  ["audit", "Audit Log", "≡"],
  ["settings", "Cấu hình game", "⚙"],
];

const TAB_ENDPOINTS = {
  overview: "/overview",
  players: "/users",
  online: "/online",
  rooms: "/rooms",
  matches: "/matches",
  shops: "/catalog",
  items: "/catalog",
  payments: "/payments",
  leaderboard: "/leaderboard",
  reports: "/reports",
  announcements: "/settings",
  analytics: "/analytics",
  audit: "/audit",
  settings: "/settings",
};

async function request(path, token, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.message || `Yêu cầu thất bại (${response.status}).`,
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

function PanelHeading({ title, detail, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
        {detail && <p className="mt-1 text-xs text-zinc-500">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value, note, tone = "text-zinc-100" }) {
  return (
    <div className="border-l-2 border-emerald-500/70 bg-zinc-900/70 px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-black tabular-nums ${tone}`}>
        {value ?? "—"}
      </div>
      {note && <div className="mt-1 text-[11px] text-zinc-500">{note}</div>}
    </div>
  );
}

function BoardPreview({ board = [], size = 8 }) {
  const byIndex = new Map(board.map((cell) => [cell.index, cell]));
  return (
    <div
      className="grid w-full max-w-56 aspect-square overflow-hidden border border-orange-500/60 bg-zinc-950"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      aria-label={`Bàn cờ ${size} nhân ${size}`}
    >
      {Array.from({ length: size * size }, (_, index) => {
        const cell = byIndex.get(index);
        return (
          <div
            key={index}
            title={`${String.fromCharCode(65 + Math.floor(index / size))}/${(index % size) + 1}${cell?.shopId ? ` · ${cell.shopId}` : ""}${cell?.shot ? ` · ${cell.shot}` : ""}`}
            className={`border border-orange-500/25 ${cell?.shopId ? "bg-emerald-500/50" : ""} ${cell?.shot === "HIT" ? "bg-rose-500!" : ""} ${cell?.shot === "MISS" ? "bg-sky-950!" : ""}`}
          />
        );
      })}
    </div>
  );
}

function EmptyState({ children = "Chưa có dữ liệu." }) {
  return (
    <div className="border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [authStatus, setAuthStatus] = useState(
    token ? "checking" : "signed-out",
  );
  const [admin, setAdmin] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [playerSearch, setPlayerSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [itemTarget, setItemTarget] = useState("");
  const [itemId, setItemId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [roomExpanded, setRoomExpanded] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    request("/api/admin/session", token)
      .then((session) => {
        if (!active) return;
        setAdmin(session);
        setAuthStatus("admin");
        setAuthError("");
      })
      .catch((error) => {
        if (!active) return;
        setAdmin(null);
        setAuthStatus(error.status === 401 ? "signed-out" : "denied");
        setAuthError(error.message);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (authStatus !== "admin") return;
    let active = true;
    const query =
      tab === "players" && appliedSearch
        ? `?search=${encodeURIComponent(appliedSearch)}`
        : "";
    request(`/api/admin${TAB_ENDPOINTS[tab]}${query}`, token)
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoadError("");
        if (tab === "announcements" || tab === "settings") {
          setAnnouncementDraft(result.announcement || "");
        }
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });
    return () => {
      active = false;
    };
  }, [authStatus, tab, token, appliedSearch, reloadKey]);

  useEffect(() => {
    if (
      authStatus !== "admin" ||
      !["overview", "online", "rooms"].includes(tab)
    ) {
      return;
    }
    const interval = setInterval(() => {
      setReloadKey((value) => value + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, [authStatus, tab]);

  const signIn = async (event) => {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const result = await request("/api/login", "", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      setAuthStatus("checking");
      setToken(result.token);
      setPassword("");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthStatus("signed-out");
    setToken("");
    setAdmin(null);
    setData(null);
  };

  const mutate = async (path, method, body, successMessage) => {
    setBusy(true);
    setNotice("");
    setLoadError("");
    try {
      await request(path, token, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setNotice(successMessage);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const title = NAV_ITEMS.find(([id]) => id === tab)?.[1] || "Tổng quan";
  const sectionData = data;

  if (authStatus === "checking") {
    return (
      <div className="grid min-h-dvh place-items-center bg-zinc-950 text-sm text-zinc-400">
        Đang xác minh quyền quản trị…
      </div>
    );
  }

  if (authStatus !== "admin") {
    return (
      <main className="grid min-h-dvh place-items-center bg-zinc-950 p-4 text-zinc-100">
        <div className="w-full max-w-sm border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
          <a href="/" className="text-xs font-bold text-emerald-400">
            ← Săn Quán Hẻm
          </a>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
            Vận hành hệ thống
          </p>
          <h1 className="mt-2 text-2xl font-black">Đăng nhập quản trị</h1>
          {authStatus === "denied" ? (
            <div className="mt-5 border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">
              {authError || "Tài khoản này không nằm trong danh sách quản trị."}
              <button
                type="button"
                onClick={signOut}
                className="mt-3 block text-xs font-bold text-white underline"
              >
                Đổi tài khoản
              </button>
            </div>
          ) : (
            <form onSubmit={signIn} className="mt-5 space-y-3">
              <label className="block text-xs font-bold text-zinc-400">
                Tài khoản
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                  className="mt-1.5 w-full border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-xs font-bold text-zinc-400">
                Mật khẩu
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="mt-1.5 w-full border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </label>
              {authError && (
                <p role="alert" className="text-xs text-rose-300">
                  {authError}
                </p>
              )}
              <button
                disabled={busy}
                className="w-full bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"
              >
                {busy ? "Đang đăng nhập…" : "Đăng nhập"}
              </button>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Quyền quản trị phải được cấp trong cấu hình server
                `ADMIN_USERNAMES`.
              </p>
            </form>
          )}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="border-b border-zinc-800 bg-zinc-900/80 lg:min-h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block lg:px-4 lg:py-5">
          <a href="/" className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
              Săn Quán Hẻm
            </span>
            <span className="mt-1 block text-sm font-black">ADMIN CONSOLE</span>
          </a>
          <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-1 text-[9px] font-bold text-emerald-300 lg:mt-4 lg:inline-block">
            LIVE
          </span>
        </div>
        <nav
          aria-label="Điều hướng quản trị"
          className="flex gap-1 overflow-x-auto px-2 pb-2 lg:block lg:space-y-0.5 lg:px-2"
        >
          {NAV_ITEMS.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setData(null);
                setLoadError("");
              }}
              aria-current={tab === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 border-l-2 px-3 py-2 text-left text-xs font-bold transition lg:w-full ${tab === id ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-transparent text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"}`}
            >
              <span className="w-4 text-center text-sm" aria-hidden="true">
                {icon}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <div className="hidden border-t border-zinc-800 px-4 py-4 lg:block">
          <div className="truncate text-xs font-bold">{admin.displayName}</div>
          <div className="mt-1 truncate text-[10px] text-zinc-500">
            @{admin.username}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 text-[10px] font-bold text-zinc-400 hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Quản trị hệ thống
            </div>
            <h1 className="mt-0.5 text-base font-black">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] text-zinc-500 sm:block">
              {admin.displayName}
            </span>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              title="Tải lại"
              aria-label="Tải lại dữ liệu"
              className="h-9 w-9 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={signOut}
              className="border border-zinc-700 px-3 py-2 text-[10px] font-bold text-zinc-300 lg:hidden"
            >
              Thoát
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-7xl p-4 sm:p-6">
          {notice && (
            <div
              role="status"
              className="mb-4 border-l-2 border-emerald-400 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200"
            >
              {notice}
            </div>
          )}
          {loadError && (
            <div
              role="alert"
              className="mb-4 border-l-2 border-rose-400 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
            >
              {loadError}
            </div>
          )}
          {busy && <div className="mb-3 h-0.5 animate-pulse bg-emerald-500" />}
          {!sectionData && !loadError ? (
            <EmptyState>Đang tải dữ liệu…</EmptyState>
          ) : null}

          {tab === "overview" && sectionData && (
            <>
              <PanelHeading
                title="Tình hình hệ thống"
                detail="Số liệu trực tiếp từ server và MongoDB."
              />
              <div className="grid gap-px bg-zinc-800 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Người chơi"
                  value={sectionData.players}
                  note="Tài khoản đã đăng ký"
                />
                <Metric
                  label="Đang online"
                  value={sectionData.onlinePlayers}
                  note={`${sectionData.onlineConnections} kết nối · ${sectionData.anonymousConnections} khách`}
                  tone="text-emerald-300"
                />
                <Metric
                  label="Phòng / trận live"
                  value={`${sectionData.activeRooms} / ${sectionData.activeMatches}`}
                  note={`${sectionData.queuedPlayers} người đang tìm trận`}
                />
                <Metric
                  label="Trận đã lưu"
                  value={sectionData.completedMatches}
                  note={`${sectionData.pendingReports} báo cáo cần xem`}
                  tone="text-amber-300"
                />
              </div>
              <div className="mt-7 grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-black uppercase text-zinc-400">
                    Trạng thái vận hành
                  </h3>
                  <dl className="divide-y divide-zinc-800 border-y border-zinc-800 text-xs">
                    <div className="flex justify-between py-3">
                      <dt className="text-zinc-500">Kết nối server</dt>
                      <dd className="font-bold text-emerald-300">
                        Đang hoạt động
                      </dd>
                    </div>
                    <div className="flex justify-between py-3">
                      <dt className="text-zinc-500">
                        Người chơi trong hàng chờ
                      </dt>
                      <dd className="font-bold">{sectionData.queuedPlayers}</dd>
                    </div>
                    <div className="flex justify-between py-3">
                      <dt className="text-zinc-500">Báo cáo mở</dt>
                      <dd className="font-bold text-amber-300">
                        {sectionData.pendingReports}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-black uppercase text-zinc-400">
                    Truy cập nhanh
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["players", "Tìm người chơi"],
                      ["online", "Xem online"],
                      ["rooms", "Giám sát phòng"],
                      ["reports", "Duyệt báo cáo"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setTab(id);
                          setData(null);
                        }}
                        className="border border-zinc-800 bg-zinc-900 px-3 py-3 text-left text-xs font-bold text-zinc-300 hover:border-emerald-700"
                      >
                        {label}{" "}
                        <span className="float-right text-emerald-400">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "players" && sectionData && (
            <>
              <PanelHeading
                title="Người chơi"
                detail={`${sectionData.total} tài khoản · thông tin nhạy cảm không hiển thị`}
                action={
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      setAppliedSearch(playerSearch.trim());
                    }}
                    className="flex gap-1"
                  >
                    <input
                      value={playerSearch}
                      onChange={(event) => setPlayerSearch(event.target.value)}
                      placeholder="Tên hoặc username"
                      className="w-44 border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                    <button className="bg-zinc-800 px-3 text-xs font-bold">
                      Tìm
                    </button>
                  </form>
                }
              />
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full min-w-2xl text-left text-xs">
                  <thead className="bg-zinc-900 text-[10px] uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Người chơi</th>
                      <th className="px-3 py-2">Thắng / trận</th>
                      <th className="px-3 py-2">Trạng thái</th>
                      <th className="px-3 py-2">Ví Xu / Hẻm Coin</th>
                      <th className="px-3 py-2">Quản lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {(sectionData.users || []).map((player) => (
                      <tr key={player._id} className="hover:bg-zinc-900/70">
                        <td className="px-3 py-3">
                          <div className="font-bold">
                            {player.displayName}{" "}
                            {player.isDonor && (
                              <span
                                title="Người ủng hộ"
                                className="text-amber-300"
                              >
                                ✨
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[10px] text-zinc-500">
                            @{player.username}
                          </div>
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {player.wins} / {player.matches}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={
                              player.isBanned
                                ? "text-rose-300"
                                : "text-emerald-300"
                            }
                          >
                            {player.isBanned ? "Đã khóa" : "Bình thường"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-zinc-400 font-mono text-[11px]">
                          <div>🪙 {player.xuBalance || 0} Xu</div>
                          <div>💎 {player.hemCoinBalance || 0} Coin</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                mutate(
                                  `/api/admin/users/${player._id}`,
                                  "PATCH",
                                  { isDonor: !player.isDonor },
                                  player.isDonor
                                    ? "Đã gỡ huy hiệu."
                                    : "Đã cấp huy hiệu tri ân.",
                                )
                              }
                              className="border border-zinc-700 px-2 py-1 text-[10px] hover:border-amber-500"
                            >
                              {player.isDonor ? "Gỡ huy hiệu" : "Cấp huy hiệu"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                mutate(
                                  `/api/admin/users/${player._id}`,
                                  "PATCH",
                                  { isBanned: !player.isBanned },
                                  player.isBanned
                                    ? "Đã mở khóa tài khoản."
                                    : "Đã khóa tài khoản.",
                                )
                              }
                              className="border border-zinc-700 px-2 py-1 text-[10px] hover:border-rose-500"
                            >
                              {player.isBanned ? "Mở khóa" : "Khóa"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setItemTarget(player._id);
                                setTab("items");
                                setData(null);
                              }}
                              className="border border-zinc-700 px-2 py-1 text-[10px] hover:border-emerald-500"
                            >
                              Vật phẩm
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!sectionData.users?.length && (
                <EmptyState>Không tìm thấy người chơi phù hợp.</EmptyState>
              )}
            </>
          )}

          {tab === "online" && sectionData && (
            <>
              <PanelHeading
                title="Người chơi Online"
                detail={`${sectionData.total} socket đang kết nối. Tự tải lại bằng nút ↻.`}
              />
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full min-w-xl text-left text-xs">
                  <thead className="bg-zinc-900 text-[10px] uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Tên</th>
                      <th className="px-3 py-2">Tài khoản</th>
                      <th className="px-3 py-2">Socket</th>
                      <th className="px-3 py-2">Phòng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {sectionData.online.map((player) => (
                      <tr key={player.socketId}>
                        <td className="px-3 py-3">
                          <span className="mr-2 text-emerald-400">●</span>
                          {player.name}
                        </td>
                        <td className="px-3 py-3 text-zinc-400">
                          {player.username ? `@${player.username}` : "Khách"}
                        </td>
                        <td className="px-3 py-3 font-mono text-[10px] text-zinc-500">
                          {player.socketId}
                        </td>
                        <td className="px-3 py-3">{player.roomId || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!sectionData.online.length && (
                <EmptyState>Hiện không có kết nối người chơi.</EmptyState>
              )}
            </>
          )}

          {tab === "rooms" && sectionData && (
            <>
              <PanelHeading
                title="Phòng chơi"
                detail={`${sectionData.total} phòng đang tồn tại trong bộ nhớ server.`}
              />
              <div className="space-y-2">
                {sectionData.rooms.map((room) => (
                  <article
                    key={room.roomId}
                    className="border border-zinc-800 bg-zinc-900/50"
                  >
                    <div className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-3 border-b border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() =>
                          setRoomExpanded(
                            roomExpanded === room.roomId ? "" : room.roomId,
                          )
                        }
                        className="flex items-center gap-2 text-left"
                      >
                        <span className="font-mono text-xs font-bold text-emerald-300">
                          {room.roomId}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {room.isPrivate ? "Kín" : "Công khai"} · {room.mode} ·{" "}
                          {room.gridSize}×{room.gridSize}
                        </span>
                      </button>

                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-zinc-400">
                          {room.players.length} người
                        </span>
                        <span className="font-bold text-amber-300">
                          {room.gameState}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            mutate(
                              `/api/admin/rooms/${room.roomId}`,
                              "DELETE",
                              {},
                              `Đã giải tán phòng ${room.roomId}`,
                            )
                          }
                          className="border border-rose-900 bg-rose-950/60 px-2 py-1 font-bold text-rose-300 hover:bg-rose-900"
                        >
                          Giải tán phòng
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRoomExpanded(
                              roomExpanded === room.roomId ? "" : room.roomId,
                            )
                          }
                          className="text-zinc-500 px-1 font-bold"
                        >
                          {roomExpanded === room.roomId ? "−" : "+"}
                        </button>
                      </div>
                    </div>

                    {roomExpanded === room.roomId && (
                      <div className="grid gap-3 p-3 sm:grid-cols-2">
                        {room.players.map((player) => (
                          <div
                            key={player.socketId}
                            className="border border-zinc-800 p-3"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <div>
                                <div className="text-xs font-bold">
                                  {player.name}
                                </div>
                                <div className="mt-1 text-[10px] text-zinc-500">
                                  Đội {player.team} ·{" "}
                                  {player.connected ? "Online" : "Mất kết nối"}{" "}
                                  · {player.eliminated ? "Bị loại" : "Còn trụ"}
                                </div>
                              </div>
                              <span className="font-mono text-[9px] text-zinc-600">
                                {player.socketId.slice(0, 8)}
                              </span>
                            </div>
                            <BoardPreview
                              board={player.board}
                              size={room.gridSize}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
              {!sectionData.rooms.length && (
                <EmptyState>Chưa có phòng chơi đang hoạt động.</EmptyState>
              )}
            </>
          )}

          {tab === "matches" && sectionData && (
            <>
              <PanelHeading
                title="Trận đấu"
                detail={`${sectionData.total} trận đã lưu gần đây; bàn cờ dành cho quản trị.`}
                action={
                  <span className="text-[10px] text-zinc-500">
                    Tối đa 100 trận mới nhất
                  </span>
                }
              />
              <div className="space-y-2">
                {sectionData.matches.map((match) => (
                  <details
                    key={match.gameId}
                    className="border border-zinc-800 bg-zinc-900/40"
                  >
                    <summary className="cursor-pointer list-none px-3 py-3">
                      <span className="font-mono text-[11px] text-emerald-300">
                        {match.gameId}
                      </span>
                      <span className="ml-3 text-[10px] text-zinc-400">
                        {match.mode} · Đội thắng {match.winnerTeam} ·{" "}
                        {new Date(match.finishedAt).toLocaleString()}
                      </span>
                    </summary>
                    <div className="grid gap-3 border-t border-zinc-800 p-3 sm:grid-cols-2">
                      {match.players.map((player, index) => (
                        <div
                          key={`${player.name}-${index}`}
                          className="border border-zinc-800 p-3"
                        >
                          <div className="mb-3 text-xs font-bold">
                            {player.name} · Đội {player.team}
                          </div>
                          <BoardPreview
                            board={player.board}
                            size={
                              match.gridSize || (match.mode === "2v2" ? 12 : 8)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
              {!sectionData.matches.length && (
                <EmptyState>
                  Chưa có lịch sử trận. Trận mới sẽ được lưu khi MongoDB hoạt
                  động.
                </EmptyState>
              )}
            </>
          )}

          {(tab === "shops" || tab === "items") && sectionData && (
            <>
              <PanelHeading
                title={tab === "shops" ? "Quán / Chiến hạm" : "Vật phẩm"}
                detail={
                  tab === "shops"
                    ? "Danh mục hiện dùng trong trận; nội dung này chỉ đọc."
                    : "Cấp vật phẩm vào kho người chơi. Hệ thống item đang mở rộng, mã vật phẩm được ghi audit."
                }
              />
              {tab === "shops" ? (
                <div className="overflow-x-auto border border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 text-[10px] uppercase text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Mã</th>
                        <th className="px-3 py-2">Tên gọi</th>
                        <th className="px-3 py-2">Nhóm</th>
                        <th className="px-3 py-2">Kích thước</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {sectionData.shops.map((shop) => (
                        <tr key={shop.id}>
                          <td className="px-3 py-3 font-mono text-emerald-300">
                            {shop.id}
                          </td>
                          <td className="px-3 py-3 font-bold">{shop.name}</td>
                          <td className="px-3 py-3 text-zinc-400">
                            {shop.category}
                          </td>
                          <td className="px-3 py-3">{shop.size} ô</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                  <div className="border border-zinc-800 p-4">
                    <h3 className="text-xs font-black uppercase text-zinc-300">
                      Cấp vật phẩm
                    </h3>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!itemTarget) {
                          setLoadError("Hãy chọn người chơi trước.");
                          return;
                        }
                        mutate(
                          `/api/admin/users/${itemTarget}/items`,
                          "POST",
                          { itemId, quantity: Number(itemQuantity) },
                          "Đã cấp vật phẩm và ghi audit log.",
                        );
                      }}
                      className="mt-4 space-y-3"
                    >
                      <label className="block text-[11px] font-bold text-zinc-500">
                        Người chơi
                        <select
                          value={itemTarget}
                          onChange={(event) =>
                            setItemTarget(event.target.value)
                          }
                          className="mt-1 block w-full border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                        >
                          <option value="">Chọn tài khoản</option>
                          {(sectionData.users || []).map((player) => (
                            <option key={player._id} value={player._id}>
                              {player.displayName} (@{player.username})
                            </option>
                          ))}
                        </select>
                      </label>
                      {!sectionData.users && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const result = await request(
                                "/api/admin/users?limit=50",
                                token,
                              );
                              setData((current) => ({
                                ...current,
                                users: result.users,
                              }));
                            } catch (error) {
                              setLoadError(error.message);
                            }
                          }}
                          className="text-[10px] font-bold text-emerald-300 underline"
                        >
                          Tải danh sách tài khoản
                        </button>
                      )}
                      <label className="block text-[11px] font-bold text-zinc-500">
                        Mã vật phẩm
                        <input
                          value={itemId}
                          onChange={(event) => setItemId(event.target.value)}
                          pattern="[A-Za-z0-9_-]{1,64}"
                          required
                          placeholder="vd: skin_cavien_neon"
                          className="mt-1 block w-full border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                        />
                      </label>
                      <label className="block text-[11px] font-bold text-zinc-500">
                        Số lượng
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={itemQuantity}
                          onChange={(event) =>
                            setItemQuantity(event.target.value)
                          }
                          required
                          className="mt-1 block w-full border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                        />
                      </label>
                      <button
                        disabled={busy || !itemId || !itemTarget}
                        className="w-full bg-emerald-500 px-3 py-2.5 text-xs font-black text-zinc-950 disabled:opacity-40"
                      >
                        Cấp vật phẩm
                      </button>
                    </form>
                  </div>
                  <div className="border-l-2 border-amber-500/60 bg-zinc-900/50 p-4 text-xs leading-relaxed text-zinc-400">
                    Kho đồ được lưu theo mã itemId và số lượng. Hệ thống hiệu
                    ứng trang trí (skin, nổ) nhận diện mã trực tiếp từ danh mục
                    Store.
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "leaderboard" && sectionData && (
            <>
              <PanelHeading
                title="Bảng xếp hạng"
                detail="Xếp theo số trận thắng, đồng hạng theo số trận đã chơi."
              />
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-[10px] uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Người chơi</th>
                      <th className="px-3 py-2">Thắng</th>
                      <th className="px-3 py-2">Trận</th>
                      <th className="px-3 py-2">Tỷ lệ thắng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {sectionData.map((player, index) => (
                      <tr key={player._id}>
                        <td className="px-3 py-3 text-zinc-500">{index + 1}</td>
                        <td className="px-3 py-3 font-bold">
                          {player.displayName}
                          {player.isDonor && (
                            <span className="ml-1 text-amber-300">✨</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-emerald-300">
                          {player.wins}
                        </td>
                        <td className="px-3 py-3">{player.matches}</td>
                        <td className="px-3 py-3">
                          {player.matches
                            ? `${((player.wins / player.matches) * 100).toFixed(1)}%`
                            : "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "reports" && sectionData && (
            <>
              <PanelHeading
                title="Báo cáo / Gian lận"
                detail="Thay đổi trạng thái sẽ được ghi vào audit log."
              />
              <div className="space-y-2">
                {sectionData.map((report) => (
                  <article
                    key={report._id}
                    className="border border-zinc-800 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold">
                          {report.reporterName}{" "}
                          <span className="font-normal text-zinc-500">
                            báo cáo {report.reportedPlayer || "trận đấu"}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-zinc-600">
                          {report.matchId} ·{" "}
                          {new Date(report.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <select
                        value={report.status}
                        onChange={(event) =>
                          mutate(
                            `/api/admin/reports/${report._id}`,
                            "PATCH",
                            {
                              status: event.target.value,
                              adminNote: report.adminNote || "",
                            },
                            "Đã cập nhật trạng thái báo cáo.",
                          )
                        }
                        className="border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px]"
                      >
                        <option value="open">Mới</option>
                        <option value="reviewing">Đang xem</option>
                        <option value="resolved">Đã xử lý</option>
                        <option value="dismissed">Bỏ qua</option>
                      </select>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
                      {report.reason}
                    </p>
                    {report.adminNote && (
                      <p className="mt-2 text-[10px] text-zinc-500">
                        Ghi chú: {report.adminNote}
                      </p>
                    )}
                  </article>
                ))}
              </div>
              {!sectionData.length && (
                <EmptyState>Chưa có báo cáo được gửi.</EmptyState>
              )}
            </>
          )}

          {tab === "announcements" && sectionData && (
            <>
              <PanelHeading
                title="Thông báo"
                detail="Thông báo sẽ xuất hiện ở sảnh người chơi."
              />
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  mutate(
                    "/api/admin/settings",
                    "PUT",
                    { announcement: announcementDraft },
                    "Đã cập nhật thông báo sảnh.",
                  );
                }}
                className="max-w-2xl"
              >
                <label className="block text-xs font-bold text-zinc-400">
                  Nội dung{" "}
                  <span className="font-normal text-zinc-600">
                    ({announcementDraft.length}/500)
                  </span>
                  <textarea
                    maxLength={500}
                    rows={5}
                    value={announcementDraft}
                    onChange={(event) =>
                      setAnnouncementDraft(event.target.value)
                    }
                    placeholder="Nhập thông báo bảo trì, sự kiện hoặc cập nhật…"
                    className="mt-2 block w-full resize-y border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                  />
                </label>
                <button
                  disabled={busy}
                  className="mt-3 bg-emerald-500 px-4 py-2.5 text-xs font-black text-zinc-950"
                >
                  Lưu thông báo
                </button>
              </form>
              {announcementDraft && (
                <div className="mt-8 max-w-2xl border-l-2 border-amber-400 bg-amber-950/30 px-4 py-3">
                  <div className="text-[10px] font-black uppercase text-amber-300">
                    Xem trước sảnh
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs text-amber-100">
                    {announcementDraft}
                  </p>
                </div>
              )}
            </>
          )}

          {tab === "payments" && sectionData && (
            <>
              <PanelHeading
                title="Đơn nạp Hẻm Coin"
                detail="Chỉ duyệt sau khi đã đối soát giao dịch nhận tiền. Mỗi đơn chỉ cộng ví một lần."
              />
              <div className="space-y-2">
                {sectionData.map((order) => (
                  <article
                    key={order._id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/50 px-3 py-3"
                  >
                    <div>
                      <div className="font-mono text-xs font-black text-cyan-200">
                        {order.orderCode}
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-400">
                        {order.userId?.displayName || "Tài khoản"} · @
                        {order.userId?.username || "—"}
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-500">
                        {Number(order.amountVnd).toLocaleString("vi-VN")} đ →{" "}
                        {order.coinAmount} Hẻm Coin · hết hạn{" "}
                        {new Date(order.expiresAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase ${order.status === "pending" ? "text-amber-300" : order.status === "credited" ? "text-emerald-300" : "text-zinc-500"}`}
                      >
                        {order.status}
                      </span>
                      {order.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              mutate(
                                `/api/admin/payments/${order._id}/approve`,
                                "POST",
                                {},
                                "Đã cộng Hẻm Coin sau khi đối soát.",
                              )
                            }
                            className="border border-emerald-700 px-2 py-1.5 text-[10px] font-bold text-emerald-200"
                          >
                            Xác nhận đã nhận tiền
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              mutate(
                                `/api/admin/payments/${order._id}/reject`,
                                "POST",
                                {},
                                "Đã từ chối đơn nạp.",
                              )
                            }
                            className="border border-rose-900 px-2 py-1.5 text-[10px] text-rose-300"
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {!sectionData.length && (
                <EmptyState>Chưa có đơn nạp Coin.</EmptyState>
              )}
            </>
          )}

          {tab === "analytics" && sectionData && (
            <>
              <PanelHeading
                title="Thống kê"
                detail="Tóm tắt tài khoản và 30 ngày gần nhất."
              />
              <div className="grid gap-px bg-zinc-800 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Tài khoản" value={sectionData.players} />
                <Metric label="Tổng trận đã lưu" value={sectionData.matches} />
                <Metric
                  label="Trận 30 ngày"
                  value={sectionData.recentMatches}
                  tone="text-emerald-300"
                />
                <Metric
                  label="Người ủng hộ / bị khóa"
                  value={`${sectionData.donors} / ${sectionData.bannedPlayers}`}
                />
              </div>
              <div className="mt-8 max-w-3xl">
                <h3 className="mb-3 text-xs font-black uppercase text-zinc-400">
                  Trận theo ngày
                </h3>
                {sectionData.dailyMatches.length ? (
                  <div className="space-y-2">
                    {sectionData.dailyMatches.map((day) => {
                      const max = Math.max(
                        ...sectionData.dailyMatches.map((item) => item.count),
                        1,
                      );
                      return (
                        <div
                          key={day._id}
                          className="grid grid-cols-[6rem_minmax(0,1fr)_2rem] items-center gap-3 text-[10px]"
                        >
                          <span className="font-mono text-zinc-500">
                            {day._id}
                          </span>
                          <div className="h-2 bg-zinc-800">
                            <div
                              className="h-2 bg-emerald-500"
                              style={{ width: `${(day.count / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-right tabular-nums">
                            {day.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState>
                    Chưa có dữ liệu trận trong 30 ngày gần nhất.
                  </EmptyState>
                )}
              </div>
            </>
          )}

          {tab === "audit" && sectionData && (
            <>
              <PanelHeading
                title="Audit Log"
                detail="100 thao tác quản trị gần nhất."
              />
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full min-w-160 text-left text-xs">
                  <thead className="bg-zinc-900 text-[10px] uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Thời gian</th>
                      <th className="px-3 py-2">Quản trị viên</th>
                      <th className="px-3 py-2">Thao tác</th>
                      <th className="px-3 py-2">Đối tượng</th>
                      <th className="px-3 py-2">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {sectionData.map((entry) => (
                      <tr key={entry._id}>
                        <td className="whitespace-nowrap px-3 py-3 text-zinc-500">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-3">{entry.adminName}</td>
                        <td className="px-3 py-3 font-mono text-emerald-300">
                          {entry.action}
                        </td>
                        <td className="px-3 py-3">
                          {entry.targetType}{" "}
                          <span className="font-mono text-[10px] text-zinc-500">
                            {entry.targetId}
                          </span>
                        </td>
                        <td className="max-w-64 truncate px-3 py-3 font-mono text-[10px] text-zinc-500">
                          {JSON.stringify(entry.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!sectionData.length && (
                <EmptyState>Chưa có thao tác được ghi nhận.</EmptyState>
              )}
            </>
          )}

          {tab === "settings" && sectionData && (
            <>
              <PanelHeading
                title="Cấu hình game"
                detail="Thay đổi ghép trận được áp dụng ngay và lưu trong MongoDB."
              />
              <div className="max-w-2xl divide-y divide-zinc-800 border-y border-zinc-800">
                <div className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <div className="text-sm font-bold">
                      Ghép trận và tạo phòng
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Tạm dừng tiếp nhận trận mới khi bảo trì.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sectionData.matchmakingEnabled}
                    onClick={() =>
                      mutate(
                        "/api/admin/settings",
                        "PUT",
                        { matchmakingEnabled: !sectionData.matchmakingEnabled },
                        sectionData.matchmakingEnabled
                          ? "Đã tạm dừng ghép trận."
                          : "Đã mở lại ghép trận.",
                      )
                    }
                    className={`relative h-7 w-12 border transition ${sectionData.matchmakingEnabled ? "border-emerald-400 bg-emerald-600" : "border-zinc-600 bg-zinc-800"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 bg-white transition-all ${sectionData.matchmakingEnabled ? "left-6" : "left-0.5"}`}
                    />
                  </button>
                </div>
                <div className="py-4 text-xs leading-relaxed text-zinc-500">
                  Kích thước bản đồ, bộ quán và luật chơi đang do code server
                  quản lý để tránh cấu hình không hợp lệ. Chưa mở sửa trực tiếp
                  trong production.
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
