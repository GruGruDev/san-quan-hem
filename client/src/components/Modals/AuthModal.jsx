import { useState } from "react";
import { apiUrl } from "../../utils/api";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  // mode: 'LOGIN' | 'REGISTER' | 'RESET_REQUEST' | 'RESET_CONFIRM'
  const [mode, setMode] = useState("LOGIN");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setError("");
    setNotice("");
    setUsername("");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setCode("");
    setNewPassword("");
  };

  const switchMode = (newMode) => {
    handleResetForm();
    setMode(newMode);
  };

  const requestPasswordReset = async () => {
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/password-reset/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Không gửi được mã xác minh.");
      setMode("RESET_CONFIRM");
      setNotice(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (mode === "RESET_REQUEST") {
      await requestPasswordReset();
      return;
    }

    const endpoint =
      mode === "LOGIN"
        ? "/api/login"
        : mode === "REGISTER"
          ? "/api/register"
          : "/api/password-reset/verify";
    const payload =
      mode === "LOGIN"
        ? { username, password }
        : mode === "REGISTER"
          ? { username, email, password, displayName }
          : { username, code, newPassword };

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đã có lỗi xảy ra!");

      if (mode === "RESET_CONFIRM") {
        setMode("LOGIN");
        setPassword("");
        setCode("");
        setNewPassword("");
        setNotice(data.message);
        return;
      }

      // Lưu Token & Thông tin User vào LocalStorage khi Đăng nhập / Đăng ký
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-slate-800 hover:bg-slate-700 text-amber-200 rounded-full font-bold flex items-center justify-center border border-amber-500/30 transition active:scale-95"
        >
          ✕
        </button>

        {/* Tiêu đề Modal */}
        <div className="text-center mt-1">
          <h2 className="text-xl font-black text-amber-300 tracking-wider uppercase drop-shadow">
            {mode === "LOGIN" && "🔑 ĐĂNG NHẬP"}
            {mode === "REGISTER" && "📝 ĐĂNG KÝ TÀI KHOẢN"}
            {mode === "RESET_REQUEST" && "🔐 KHÔI PHỤC MẬT KHẨU"}
            {mode === "RESET_CONFIRM" && "🔐 XÁC MINH EMAIL"}
          </h2>
        </div>

        {/* Thông báo Lỗi / Thành công */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/60 text-red-200 text-xs p-2.5 rounded-xl text-center font-bold animate-shake">
            ⚠️ {error}
          </div>
        )}
        {notice && (
          <div className="bg-sky-950/80 border border-sky-500/50 text-sky-100 text-xs p-2.5 rounded-xl text-center font-bold">
            {notice}
          </div>
        )}

        {/* Form Nhập */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Tên tài khoản */}
          <input
            type="text"
            placeholder="Tên tài khoản..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
            required
            readOnly={mode === "RESET_CONFIRM"}
          />

          {/* Biệt danh */}
          {mode === "REGISTER" && (
            <>
              <input
                type="email"
                placeholder="Email khôi phục..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
                maxLength={254}
                autoComplete="email"
                required
              />
              <input
                type="text"
                placeholder="Tên hiển thị (Biệt danh lúc đăng ký)..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
                maxLength={32}
                required
              />
            </>
          )}

          {(mode === "LOGIN" || mode === "REGISTER") && (
            <input
              type="password"
              placeholder="Mật khẩu (ít nhất 8 ký tự)..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
              minLength={mode === "REGISTER" ? 8 : undefined}
              maxLength={72}
              autoComplete={
                mode === "LOGIN" ? "current-password" : "new-password"
              }
              required
            />
          )}

          {mode === "RESET_CONFIRM" && (
            <>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Mã OTP 6 chữ số"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
                minLength={6}
                maxLength={6}
                required
              />
              <input
                type="password"
                placeholder="Mật khẩu mới (ít nhất 8 ký tự)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                required
              />
            </>
          )}

          {/* Nút Quên mật khẩu nhỏ khi ở giao diện Đăng nhập */}
          {mode === "LOGIN" && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setNotice("");
                  setMode("RESET_REQUEST");
                }}
                className="text-[11px] text-amber-400/80 hover:text-amber-300 font-semibold hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          {/* Nút Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-linear-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black py-3 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider mt-1"
          >
            {mode === "LOGIN" && "ĐĂNG NHẬP NGAY"}
            {mode === "REGISTER" && "TẠO TÀI KHOẢN MỚI"}
            {mode === "RESET_REQUEST" &&
              (submitting ? "ĐANG GỬI MÃ..." : "GỬI MÃ OTP")}
            {mode === "RESET_CONFIRM" &&
              (submitting ? "ĐANG XÁC MINH..." : "ĐẶT LẠI MẬT KHẨU")}
          </button>

          {mode === "RESET_CONFIRM" && (
            <button
              type="button"
              disabled={submitting}
              onClick={requestPasswordReset}
              className="text-xs text-amber-300 underline disabled:opacity-50"
            >
              Gửi mã mới
            </button>
          )}
        </form>

        {/* Chuyển đổi Mode bên dưới */}
        <div className="text-center text-xs text-slate-400 border-t border-slate-800 pt-3">
          {mode === "LOGIN" && (
            <span>
              Chưa có tài khoản?{" "}
              <button
                onClick={() => switchMode("REGISTER")}
                className="text-amber-400 font-black underline hover:text-amber-300"
              >
                Đăng ký ngay
              </button>
            </span>
          )}

          {mode !== "LOGIN" && (
            <span>
              Quay lại đăng nhập?{" "}
              <button
                onClick={() => switchMode("LOGIN")}
                className="text-amber-400 font-black underline hover:text-amber-300"
              >
                Quay lại Đăng nhập
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
