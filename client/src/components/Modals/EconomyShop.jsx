import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../../utils/api";

const CATEGORIES = [
  ["all", "Tất cả"],
  ["avatar_frame", "Khung avatar"],
  ["profile_background", "Nền hồ sơ"],
  ["nameplate", "Danh hiệu"],
  ["hit_effect", "Hiệu ứng trúng"],
  ["miss_effect", "Hiệu ứng trượt"],
  ["sunk_effect", "Hiệu ứng hạ quán"],
  ["shop_skin", "Skin quán"],
  ["victory_effect", "Hiệu ứng thắng"],
];
const CATEGORY_ICONS = {
  avatar_frame: "◉",
  profile_background: "▧",
  nameplate: "▰",
  hit_effect: "✦",
  miss_effect: "≈",
  sunk_effect: "✹",
  shop_skin: "🍜",
  victory_effect: "✷",
};

async function economyRequest(path, token, options = {}) {
  const response = await fetch(apiUrl(`/api/economy${path}`), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.message || "Không thể hoàn tất yêu cầu.");
  return data;
}

const formatVnd = (amount) =>
  `${Number(amount || 0).toLocaleString("vi-VN")} đ`;
const getToken = () => localStorage.getItem("token");
const estimateTopupCoins = (amountVnd, packages) => {
  let rateTier = packages[0];
  for (const pack of packages) {
    if (amountVnd >= pack.amountVnd) rateTier = pack;
  }
  if (!rateTier) return 0;
  return Number(
    (BigInt(amountVnd) * BigInt(rateTier.coinAmount)) /
      BigInt(rateTier.amountVnd),
  );
};

export default function EconomyShop({
  isOpen,
  onClose,
  currentUser,
  onAccountUpdate,
}) {
  const [tab, setTab] = useState("store");
  const [category, setCategory] = useState("all");
  const [config, setConfig] = useState(null);
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [equippedCosmetics, setEquippedCosmetics] = useState([]);
  const [wallet, setWallet] = useState({ xuBalance: 0, hemCoinBalance: 0 });
  const [orders, setOrders] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [customTopupAmount, setCustomTopupAmount] = useState("10000");
  const [dailyRewardAvailable, setDailyRewardAvailable] = useState(false);
  const [busyItem, setBusyItem] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const loadShop = useCallback(async () => {
    try {
      const paymentConfig = await economyRequest("/config");
      setConfig(paymentConfig);
      const authToken = getToken();
      if (!authToken) return null;
      const [catalog, account, paymentOrders, achievementList] =
        await Promise.all([
          economyRequest("/items", authToken),
          economyRequest("/me", authToken),
          economyRequest("/topups", authToken),
          economyRequest("/achievements", authToken),
        ]);
      setItems(catalog.items || []);
      setInventory(catalog.inventory || []);
      setEquippedCosmetics(catalog.equippedCosmetics || []);
      setWallet(catalog.wallet || { xuBalance: 0, hemCoinBalance: 0 });
      setOrders(paymentOrders || []);
      setAchievements(achievementList || []);
      setDailyRewardAvailable(account.dailyRewardAvailable !== false);
      return account;
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    Promise.resolve().then(loadShop);
  }, [isOpen, loadShop]);

  useEffect(() => {
    if (!isOpen || tab !== "topup" || !getToken()) return;
    const timer = setInterval(async () => {
      try {
        const [account, paymentOrders] = await Promise.all([
          economyRequest("/me", getToken()),
          economyRequest("/topups", getToken()),
        ]);
        setWallet({
          xuBalance: account.xuBalance || 0,
          hemCoinBalance: account.hemCoinBalance || 0,
        });
        setOrders(paymentOrders || []);
        setActiveOrder((currentOrder) => {
          if (!currentOrder) return currentOrder;
          const refreshedOrder = paymentOrders.find(
            (order) => order.orderCode === currentOrder.orderCode,
          );
          return refreshedOrder
            ? { ...currentOrder, ...refreshedOrder }
            : currentOrder;
        });
      } catch {
        // A missed refresh is harmless; the player can retry manually.
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [isOpen, tab, currentUser?.id]);

  if (!isOpen) return null;

  const owned = new Set(inventory.map((item) => item.itemId));
  const equipped = new Set(equippedCosmetics.map((item) => item.itemId));
  const activeOrderStatus = activeOrder?.status || "pending";
  const customAmountVnd = Number(customTopupAmount);
  const customCoinEstimate =
    config &&
    Number.isSafeInteger(customAmountVnd) &&
    customAmountVnd >= config.minTopupAmountVnd
      ? estimateTopupCoins(customAmountVnd, config.packages)
      : 0;
  const visibleItems = items.filter(
    (item) => category === "all" || item.category === category,
  );

  const runAction = async (itemId, action) => {
    setBusyItem(itemId);
    setError("");
    setNotice("");
    try {
      await action();
      const account = await loadShop();
      if (account) onAccountUpdate?.(account);
      setNotice("Đã cập nhật ví và bộ sưu tập.");
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyItem("");
    }
  };

  const buyItem = (item) =>
    runAction(item.itemId, async () => {
      await economyRequest("/purchase", getToken(), {
        method: "POST",
        body: JSON.stringify({ itemId: item.itemId }),
      });
    });

  const equipItem = (item) =>
    runAction(item.itemId, async () => {
      await economyRequest("/equip", getToken(), {
        method: "POST",
        body: JSON.stringify({ itemId: item.itemId }),
      });
    });

  const unequipItem = (item) =>
    runAction(item.itemId, async () => {
      await economyRequest("/unequip", getToken(), {
        method: "POST",
        body: JSON.stringify({ slot: item.category }),
      });
    });

  const claimDaily = () =>
    runAction("daily", async () => {
      const result = await economyRequest("/daily/claim", getToken(), {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice(`Đã nhận ${result.reward} Xu Hẻm.`);
      setDailyRewardAvailable(false);
    });

  const claimAchievement = (achievement) =>
    runAction(achievement.id, async () => {
      const result = await economyRequest(
        `/achievements/${achievement.id}/claim`,
        getToken(),
        { method: "POST", body: JSON.stringify({}) },
      );
      setNotice(`Đã nhận ${result.reward} Xu Hẻm.`);
    });

  const createTopup = (packageId, amountVnd) =>
    runAction(packageId, async () => {
      const order = await economyRequest("/topups", getToken(), {
        method: "POST",
        body: JSON.stringify(
          packageId === "custom" ? { packageId, amountVnd } : { packageId },
        ),
      });
      setActiveOrder(order);
      setTab("topup");
    });

  const formatPrice = (item) =>
    `${Number(item.price).toLocaleString("vi-VN")} ${item.currency === "xu" ? "Xu" : "Coin"}`;

  return (
    <div className="absolute inset-0 z-70 flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-4">
      <section className="flex h-[min(94dvh,54rem)] w-full max-w-4xl flex-col overflow-hidden border-2 border-amber-500/50 bg-slate-950 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-amber-500/25 bg-slate-900 px-4 py-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
              Sưu tầm, không tăng sức mạnh
            </div>
            <h2 className="text-lg font-black">Cửa hàng Hẻm</h2>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="hidden text-right text-[10px] font-bold sm:block">
                <span className="text-amber-300">
                  🪙 {wallet.xuBalance.toLocaleString("vi-VN")}
                </span>
                <span className="mx-2 text-slate-700">|</span>
                <span className="text-cyan-200">
                  💎 {wallet.hemCoinBalance.toLocaleString("vi-VN")}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa hàng"
              className="h-9 w-9 border border-slate-700 text-lg text-slate-300 hover:border-amber-400 hover:text-white"
            >
              ×
            </button>
          </div>
        </header>

        <nav
          className="flex border-b border-slate-800 px-2"
          aria-label="Cửa hàng và ví"
        >
          {[
            ["store", "Mỹ phẩm"],
            ["topup", "Nạp Hẻm Coin"],
            ["wallet", "Ví & giao dịch"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`border-b-2 px-3 py-3 text-[11px] font-black ${tab === id ? "border-amber-400 text-amber-200" : "border-transparent text-slate-500 hover:text-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {notice && (
            <div
              role="status"
              className="mb-3 border-l-2 border-emerald-400 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200"
            >
              {notice}
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

          {!currentUser ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="text-3xl">🪙</div>
                <h3 className="mt-3 text-sm font-black">
                  Đăng nhập để dùng cửa hàng
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Ví và vật phẩm gắn với tài khoản, không chuyển đổi giữa người
                  chơi.
                </p>
              </div>
            </div>
          ) : (
            <>
              {tab === "store" && (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="border border-amber-500/30 bg-amber-950/20 px-3 py-2">
                      <div className="text-[9px] font-bold uppercase text-amber-300">
                        Xu Hẻm
                      </div>
                      <div className="mt-1 text-lg font-black tabular-nums">
                        {wallet.xuBalance.toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div className="border border-cyan-500/30 bg-cyan-950/20 px-3 py-2">
                      <div className="text-[9px] font-bold uppercase text-cyan-200">
                        Hẻm Coin
                      </div>
                      <div className="mt-1 text-lg font-black tabular-nums">
                        {wallet.hemCoinBalance.toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={claimDaily}
                      disabled={!dailyRewardAvailable || busyItem === "daily"}
                      className="border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-left disabled:opacity-50"
                    >
                      <span className="block text-[9px] font-bold uppercase text-emerald-300">
                        Điểm danh
                      </span>
                      <span className="mt-1 block text-xs font-black">
                        {dailyRewardAvailable
                          ? "+50 Xu hôm nay"
                          : "Đã nhận hôm nay"}
                      </span>
                    </button>
                  </div>
                  <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
                    {CATEGORIES.map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCategory(id)}
                        aria-pressed={category === id}
                        className={`shrink-0 border px-2.5 py-1.5 text-[10px] font-bold ${category === id ? "border-amber-400 bg-amber-400/10 text-amber-200" : "border-slate-800 text-slate-500"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleItems.map((item) => {
                      const hasItem = owned.has(item.itemId);
                      const isEquipped = equipped.has(item.itemId);
                      const enough =
                        item.currency === "xu"
                          ? wallet.xuBalance >= item.price
                          : wallet.hemCoinBalance >= item.price;
                      return (
                        <article
                          key={item.itemId}
                          className="flex min-h-40 flex-col border border-slate-800 bg-slate-900/70 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="grid h-8 w-8 place-items-center border border-slate-700 bg-slate-950 text-lg">
                              {CATEGORY_ICONS[item.category] || "◇"}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase ${item.currency === "xu" ? "text-amber-300" : "text-cyan-200"}`}
                            >
                              {item.currency === "xu"
                                ? "🪙 Xu Hẻm"
                                : "💎 Hẻm Coin"}
                            </span>
                          </div>
                          <h3 className="mt-3 text-xs font-black">
                            {item.name}
                          </h3>
                          <p className="mt-1 flex-1 text-[10px] leading-relaxed text-slate-500">
                            {item.description}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <b className="text-xs tabular-nums">
                              {formatPrice(item)}
                            </b>
                            {hasItem ? (
                              <button
                                type="button"
                                disabled={busyItem === item.itemId}
                                onClick={() =>
                                  isEquipped
                                    ? unequipItem(item)
                                    : equipItem(item)
                                }
                                className="border border-slate-700 px-2 py-1.5 text-[10px] font-bold text-emerald-200 disabled:text-slate-600"
                              >
                                {isEquipped ? "Bỏ dùng" : "Trang bị"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={!enough || busyItem === item.itemId}
                                onClick={() => buyItem(item)}
                                className="bg-amber-400 px-2.5 py-1.5 text-[10px] font-black text-slate-950 disabled:bg-slate-800 disabled:text-slate-500"
                              >
                                {enough ? "Mua" : "Thiếu tiền"}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}

              {tab === "topup" && (
                <div className="mx-auto max-w-3xl">
                  <div className="mb-4 border-l-2 border-cyan-300 bg-cyan-950/20 px-3 py-2 text-[11px] leading-relaxed text-cyan-100">
                    Hẻm Coin chỉ mua vật phẩm trang trí, không mua lợi thế trong
                    trận. Chuyển đúng số tiền và giữ nguyên mã đơn trong nội
                    dung chuyển khoản.
                  </div>
                  {activeOrder ? (
                    <div className="grid gap-5 border border-cyan-500/30 bg-slate-900/60 p-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                      <div className="mx-auto h-44 w-44 bg-white p-2">
                        <img
                          src={activeOrder.qrUrl}
                          alt="QR chuyển khoản nạp Hẻm Coin"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase text-cyan-200">
                          {activeOrderStatus === "credited"
                            ? "Đã cộng Hẻm Coin"
                            : activeOrderStatus === "expired"
                              ? "Đơn nạp đã hết hạn"
                              : activeOrderStatus === "rejected"
                                ? "Đơn nạp bị từ chối"
                                : "Đơn nạp đang chờ"}
                        </div>
                        <div className="mt-2 text-2xl font-black text-cyan-100">
                          {activeOrder.coinAmount} 💎
                        </div>
                        <dl className="mt-3 space-y-2 text-xs">
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Số tiền</dt>
                            <dd className="font-bold">
                              {formatVnd(activeOrder.amountVnd)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Ngân hàng</dt>
                            <dd className="font-bold">
                              {activeOrder.bank?.bankCode} ·{" "}
                              {activeOrder.bank?.accountNumber}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Chủ tài khoản</dt>
                            <dd className="font-bold">
                              {activeOrder.bank?.accountName}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">
                              Nội dung bắt buộc
                            </dt>
                            <dd className="select-all font-mono font-black text-amber-300">
                              {activeOrder.orderCode}
                            </dd>
                          </div>
                        </dl>
                        <p
                          aria-live="polite"
                          className={`mt-3 text-[10px] leading-relaxed ${activeOrderStatus === "credited" ? "text-emerald-300" : activeOrderStatus === "rejected" ? "text-rose-300" : "text-slate-400"}`}
                        >
                          {activeOrderStatus === "credited"
                            ? "Giao dịch đã được xác nhận. Hẻm Coin đã cộng vào ví."
                            : activeOrderStatus === "expired"
                              ? "Đơn đã hết hạn. Vui lòng tạo đơn mới; không chuyển khoản theo mã đơn này."
                              : activeOrderStatus === "rejected"
                                ? "Đơn bị từ chối. Nếu bạn đã chuyển khoản, vui lòng liên hệ admin để được kiểm tra."
                                : activeOrder.autoConfirmationEnabled
                                  ? "Đang chờ SePay xác nhận giao dịch. Nếu đã chuyển khoản mà quá vài phút chưa cập nhật, admin sẽ kiểm tra thủ công."
                                  : "Đang chờ admin xác nhận đã nhận tiền. Hẻm Coin sẽ được cộng sau khi admin duyệt."}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveOrder(null);
                            loadShop();
                          }}
                          className="mt-3 border border-slate-700 px-3 py-2 text-[10px] font-bold"
                        >
                          Ẩn mã QR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(config?.packages || []).map((pack) => (
                          <article
                            key={pack.id}
                            className="border border-slate-800 bg-slate-900/70 p-4"
                          >
                            <div className="text-[10px] font-black uppercase text-slate-400">
                              {pack.label}
                            </div>
                            <div className="mt-3 text-2xl font-black text-cyan-100">
                              {pack.coinAmount} 💎
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {formatVnd(pack.amountVnd)}
                            </div>
                            <div className="mt-4 text-[9px] text-slate-600">
                              Tỷ lệ quy đổi hiển thị trước khi thanh toán.
                            </div>
                            <button
                              type="button"
                              onClick={() => createTopup(pack.id)}
                              disabled={busyItem === pack.id}
                              className="mt-4 w-full bg-cyan-300 px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"
                            >
                              Tạo QR nạp
                            </button>
                          </article>
                        ))}
                      </div>
                      <div className="mt-4 border border-cyan-500/30 bg-slate-900/70 p-4">
                        <label
                          htmlFor="custom-topup-amount"
                          className="text-xs font-black uppercase text-cyan-100"
                        >
                          Nạp số tiền tùy chọn
                        </label>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                          <input
                            id="custom-topup-amount"
                            type="number"
                            min={config?.minTopupAmountVnd || 10000}
                            step="1000"
                            inputMode="numeric"
                            value={customTopupAmount}
                            onChange={(event) =>
                              setCustomTopupAmount(event.target.value)
                            }
                            className="min-w-0 border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                          />
                          <div className="text-sm font-bold text-cyan-100">
                            {customCoinEstimate.toLocaleString("vi-VN")} 💎
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              createTopup("custom", customAmountVnd)
                            }
                            disabled={
                              busyItem === "custom" || customCoinEstimate < 1
                            }
                            className="bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"
                          >
                            Tạo QR nạp
                          </button>
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                          Tối thiểu {formatVnd(config?.minTopupAmountVnd)}. Tỷ
                          giá tăng theo các mốc gói nạp; Coin được làm tròn
                          xuống.
                        </p>
                      </div>
                    </>
                  )}
                  <p className="mt-4 text-[10px] text-slate-500">
                    Gói đã tạo có hiệu lực 60 phút. Không chuyển khoản nếu đơn
                    đã hết hạn.
                  </p>
                </div>
              )}

              {tab === "wallet" && (
                <div className="mx-auto max-w-3xl">
                  <div className="mb-4 grid gap-2 sm:grid-cols-2">
                    <div className="border border-amber-500/30 px-4 py-3">
                      <span className="text-[10px] font-bold uppercase text-amber-300">
                        🪙 Xu Hẻm
                      </span>
                      <b className="mt-1 block text-2xl">
                        {wallet.xuBalance.toLocaleString("vi-VN")}
                      </b>
                      <small className="text-[10px] text-slate-500">
                        Kiếm từ trận, điểm danh và thành tích.
                      </small>
                    </div>
                    <div className="border border-cyan-500/30 px-4 py-3">
                      <span className="text-[10px] font-bold uppercase text-cyan-200">
                        💎 Hẻm Coin
                      </span>
                      <b className="mt-1 block text-2xl">
                        {wallet.hemCoinBalance.toLocaleString("vi-VN")}
                      </b>
                      <small className="text-[10px] text-slate-500">
                        Nhận từ giao dịch nạp đã xác nhận.
                      </small>
                    </div>
                  </div>
                  <h3 className="mb-2 text-xs font-black uppercase text-slate-400">
                    Giao dịch gần đây
                  </h3>
                  <div className="divide-y divide-slate-800 border-y border-slate-800">
                    {(wallet.transactions || []).map((entry) => (
                      <div
                        key={entry._id}
                        className="flex items-center justify-between gap-3 py-2.5 text-[10px]"
                      >
                        <span>
                          <b className="block text-slate-200">
                            {entry.description || entry.type}
                          </b>
                          <time className="mt-1 block text-slate-600">
                            {new Date(entry.createdAt).toLocaleString()}
                          </time>
                        </span>
                        <span
                          className={`font-mono font-black ${entry.delta > 0 ? "text-emerald-300" : "text-rose-300"}`}
                        >
                          {entry.delta > 0 ? "+" : ""}
                          {entry.delta}{" "}
                          {entry.currency === "xu" ? "Xu" : "Coin"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {!wallet.transactions?.length && (
                    <p className="py-5 text-center text-xs text-slate-500">
                      Chưa có giao dịch.
                    </p>
                  )}
                  <h3 className="mb-2 mt-6 text-xs font-black uppercase text-slate-400">
                    Thành tích nhận Xu
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {achievements.map((achievement) => (
                      <article
                        key={achievement.id}
                        className="border border-slate-800 p-3"
                      >
                        <h4 className="text-xs font-black">
                          {achievement.title}
                        </h4>
                        <p className="mt-1 min-h-8 text-[10px] text-slate-500">
                          {achievement.description}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-300">
                            +{achievement.reward} Xu
                          </span>
                          <button
                            type="button"
                            disabled={
                              !achievement.unlocked ||
                              achievement.claimed ||
                              busyItem === achievement.id
                            }
                            onClick={() => claimAchievement(achievement)}
                            className="border border-emerald-700/50 px-2 py-1 text-[9px] font-bold text-emerald-200 disabled:border-slate-800 disabled:text-slate-600"
                          >
                            {achievement.claimed
                              ? "Đã nhận"
                              : achievement.unlocked
                                ? "Nhận"
                                : "Chưa mở"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <h3 className="mb-2 mt-6 text-xs font-black uppercase text-slate-400">
                    Đơn nạp
                  </h3>
                  <div className="divide-y divide-slate-800 border-y border-slate-800">
                    {orders.map((order) => (
                      <div
                        key={order._id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 text-[10px]"
                      >
                        <span className="font-mono text-amber-200">
                          {order.orderCode}
                        </span>
                        <span>
                          {formatVnd(order.amountVnd)} → {order.coinAmount} Coin
                        </span>
                        <span
                          className={
                            order.status === "credited"
                              ? "text-emerald-300"
                              : order.status === "pending"
                                ? "text-amber-300"
                                : "text-slate-500"
                          }
                        >
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
