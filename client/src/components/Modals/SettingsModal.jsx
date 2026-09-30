import { useEffect, useState } from "react";
import { apiUrl } from "../../utils/api";

export default function SettingsModal({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  bgmVolume,
  onChangeBgmVolume,
  sfxVolume,
  onChangeSfxVolume,
  showTaunt,
  onToggleTaunt,
  vibrate,
  onToggleVibrate,
  playerName = "Phượt Thủ Hẻm",
  isAuthenticated,
  onPasswordChanged,
}) {
  const [activeTab, setActiveTab] = useState("GENERAL"); // GENERAL | GAMEPLAY | ACCOUNT
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState({
    google: false,
    facebook: false,
    password: true,
  });
  const [linkingProvider, setLinkingProvider] = useState("");
  const [providerError, setProviderError] = useState("");

  useEffect(() => {
    if (!isOpen || activeTab !== "ACCOUNT" || !isAuthenticated) return;
    const controller = new AbortController();
    fetch(apiUrl("/api/auth/providers"), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) {
          setLinkedProviders(data);
        } else {
          setProviderError(
            data.message || "Không tải được trạng thái liên kết.",
          );
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setProviderError("Không tải được trạng thái liên kết.");
        }
      });
    return () => controller.abort();
  }, [activeTab, isAuthenticated, isOpen]);

  if (!isOpen) return null;

  const handleLinkProvider = async (provider) => {
    setProviderError("");
    setLinkingProvider(provider);
    try {
      const response = await fetch(apiUrl(`/api/auth/${provider}/link`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể liên kết.");
      window.location.assign(data.url);
    } catch (error) {
      setProviderError(error.message);
      setLinkingProvider("");
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch(apiUrl("/api/password/change"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          ...(linkedProviders.password && { currentPassword }),
          newPassword,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Không đổi được mật khẩu.");

      onPasswordChanged(data.token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(data.message);
    } catch (error) {
      setPasswordError(
        error.name === "TimeoutError"
          ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại."
          : error.message,
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative">
        {/* Nút Đóng Popup */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-slate-800 hover:bg-slate-700 text-amber-200 rounded-full font-bold flex items-center justify-center border border-amber-500/30 transition active:scale-95"
        >
          ✕
        </button>

        {/* Tiêu đề Modal */}
        <div className="text-center mt-1">
          <div className="inline-block bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow mb-1">
            Góc Tùy Chỉnh
          </div>
          <h2 className="text-xl font-black text-amber-300 tracking-wider uppercase drop-shadow">
            ⚙️ CÀI ĐẶT TRÒ CHƠI
          </h2>
        </div>

        {/* Thanh Tab Chuyển Đổi Nhanh */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-[11px] font-black">
          <button
            onClick={() => setActiveTab("GENERAL")}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === "GENERAL"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-amber-200"
            }`}
          >
            🔊 Âm Thanh
          </button>
          <button
            onClick={() => setActiveTab("GAMEPLAY")}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === "GAMEPLAY"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-amber-200"
            }`}
          >
            🎮 Lối Chơi
          </button>
          <button
            onClick={() => setActiveTab("ACCOUNT")}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === "ACCOUNT"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-amber-200"
            }`}
          >
            👤 Tài Khoản
          </button>
        </div>

        {/* NỘI DUNG THEO TAB */}
        <div className="flex flex-col gap-3 min-h-[220px]">
          {/* TAB 1: CÀI ĐẶT ÂM THANH */}
          {activeTab === "GENERAL" && (
            <div className="flex flex-col gap-3 animate-fade-in">
              {/* Tất cả âm thanh */}
              <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
                  🔔 Tất Cả Âm Thanh
                </span>
                <button
                  onClick={onToggleSound}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                    soundEnabled
                      ? "bg-emerald-500 justify-end"
                      : "bg-slate-700 justify-start"
                  }`}
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                </button>
              </div>

              {/* Nhạc nền BGM Volume */}
              <div className="flex flex-col gap-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>🎵 Nhạc Nền Quán Hẻm</span>
                  <span className="text-amber-400 font-mono">
                    {soundEnabled ? `${Math.round(bgmVolume * 100)}%` : "MUTE"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={!soundEnabled}
                  value={bgmVolume}
                  onChange={(e) =>
                    onChangeBgmVolume(parseFloat(e.target.value))
                  }
                  className="w-full accent-amber-500 cursor-pointer disabled:opacity-30"
                />
              </div>

              {/* Hiệu ứng SFX Volume */}
              <div className="flex flex-col gap-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>💥 Hiệu Ứng Tiếng Bắn / Nổ</span>
                  <span className="text-amber-400 font-mono">
                    {soundEnabled ? `${Math.round(sfxVolume * 100)}%` : "MUTE"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={!soundEnabled}
                  value={sfxVolume}
                  onChange={(e) =>
                    onChangeSfxVolume(parseFloat(e.target.value))
                  }
                  className="w-full accent-amber-500 cursor-pointer disabled:opacity-30"
                />
              </div>
            </div>
          )}

          {/* TAB 2: LỐI CHƠI & HIỂN THỊ */}
          {activeTab === "GAMEPLAY" && (
            <div className="flex flex-col gap-3 animate-fade-in">
              {/* Bật/Tắt Chữ Chọc Quê */}
              <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-amber-100">
                    💬 Chữ Chọc Quê (Taunts)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Hiện chữ khi bắn trúng / hụt
                  </span>
                </div>
                <button
                  onClick={onToggleTaunt}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                    showTaunt
                      ? "bg-emerald-500 justify-end"
                      : "bg-slate-700 justify-start"
                  }`}
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                </button>
              </div>

              {/* Bật/Tắt Rung Điện Thoại */}
              <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-amber-100">
                    📳 Rung Khi Bị Bắn
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Rung phản hồi haptic trên điện thoại
                  </span>
                </div>
                <button
                  onClick={onToggleVibrate}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                    vibrate
                      ? "bg-emerald-500 justify-end"
                      : "bg-slate-700 justify-start"
                  }`}
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TÀI KHOẢN & TÁC GIẢ */}
          {activeTab === "ACCOUNT" && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
                    🛵
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-amber-200">
                      {playerName || "Phượt Thủ Hẻm"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      ● Đang Hoạt Động
                    </span>
                  </div>
                </div>
              </div>

              {isAuthenticated ? (
                <form
                  onSubmit={handleChangePassword}
                  className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2.5"
                >
                  <h3 className="text-xs font-black text-amber-200">
                    ĐỔI MẬT KHẨU
                  </h3>
                  {linkedProviders.password && (
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Mật khẩu hiện tại"
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      maxLength={72}
                      required
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-amber-100 text-xs focus:outline-none focus:border-amber-400"
                    />
                  )}
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={8}
                    maxLength={72}
                    required
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-amber-100 text-xs focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    maxLength={72}
                    required
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-amber-100 text-xs focus:outline-none focus:border-amber-400"
                  />
                  {passwordError && (
                    <p role="alert" className="text-[11px] text-red-300">
                      {passwordError}
                    </p>
                  )}
                  {passwordNotice && (
                    <p role="status" className="text-[11px] text-emerald-300">
                      {passwordNotice}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 rounded-lg text-slate-950 text-xs font-black"
                  >
                    {changingPassword ? "ĐANG ĐỔI..." : "CẬP NHẬT MẬT KHẨU"}
                  </button>
                </form>
              ) : (
                <p className="text-center text-[11px] text-slate-400">
                  Đăng nhập để đổi mật khẩu mà không cần email.
                </p>
              )}

              {isAuthenticated && (
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2">
                  <h3 className="text-xs font-black text-amber-200">
                    ĐĂNG NHẬP & KHÔI PHỤC
                  </h3>
                  {providerError && (
                    <p role="alert" className="text-[11px] text-red-300">
                      {providerError}
                    </p>
                  )}
                  {["google", "facebook"].map((provider) => (
                    <div
                      key={provider}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-slate-300 capitalize">
                        {provider}
                      </span>
                      {linkedProviders[provider] ? (
                        <span className="text-[11px] text-emerald-300">
                          Đã liên kết
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(linkingProvider)}
                          onClick={() => handleLinkProvider(provider)}
                          className="px-3 py-1.5 rounded-lg border border-amber-500/50 text-amber-200 text-[11px] font-bold disabled:opacity-50"
                        >
                          {linkingProvider === provider
                            ? "ĐANG MỞ..."
                            : "Liên kết"}
                        </button>
                      )}
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-500">
                    Liên kết trước để có thể đăng nhập nếu quên mật khẩu.
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-3.5 rounded-2xl border border-amber-500/30 flex flex-col items-center gap-2.5 text-center shadow-inner">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                    Được Phát Triển Bởi
                  </span>
                  <h3 className="text-base font-black text-amber-200 tracking-wider uppercase mt-0.5">
                    🚀 UASAOKHONGCHAY
                  </h3>
                </div>

                <div className="flex items-center justify-center gap-2.5 w-full pt-1">
                  <a
                    href="https://www.tiktok.com/@uasaokhongchay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 rounded-xl text-[11px] font-bold text-amber-100 flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
                  >
                    <span>🎵</span> TikTok
                  </a>
                  <a
                    href="https://www.youtube.com/@uasaokhongchay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-red-500 rounded-xl text-[11px] font-bold text-amber-100 flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
                  >
                    <span>▶️</span> YouTube
                  </a>
                  <a
                    href="https://www.facebook.com/uasaokhongchay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl text-[11px] font-bold text-amber-100 flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
                  >
                    <span>📘</span> Facebook
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nút Hoàn Tất */}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black py-3 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider mt-1"
        >
          HOÀN TẤT CÀI ĐẶT
        </button>
      </div>
    </div>
  );
}
