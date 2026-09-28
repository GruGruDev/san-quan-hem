import { useState } from "react";
import { apiUrl } from "../../utils/api";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  // mode: 'LOGIN' | 'REGISTER'
  const [mode, setMode] = useState("LOGIN");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!isOpen) return null;

  const handleResetForm = () => {
    setError("");
    setNotice("");
    setUsername("");
    setPassword("");
    setDisplayName("");
  };

  const switchMode = (newMode) => {
    handleResetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    const endpoint = mode === "LOGIN" ? "/api/login" : "/api/register";
    const payload =
      mode === "LOGIN"
        ? { username, password }
        : { username, password, displayName };

    try {
      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đã có lỗi xảy ra!");

      // Lưu Token & Thông tin User vào LocalStorage khi Đăng nhập / Đăng ký
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
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
            {mode === "FORGOT" && "🔐 QUÊN MẬT KHẨU"}
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
          />

          {/* Biệt danh */}
          {mode === "REGISTER" && (
            <input
              type="text"
              placeholder="Tên hiển thị (Biệt danh lúc đăng ký)..."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
              required
            />
          )}

          <input
            type="password"
            placeholder="Mật khẩu..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
            required
          />

          {/* Nút Quên mật khẩu nhỏ khi ở giao diện Đăng nhập */}
          {mode === "LOGIN" && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setNotice(
                    "Khôi phục mật khẩu chưa khả dụng do chưa có xác minh danh tính. Vui lòng liên hệ quản trị viên.",
                  );
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
            className="w-full bg-linear-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black py-3 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider mt-1"
          >
            {mode === "LOGIN" && "ĐĂNG NHẬP NGAY"}
            {mode === "REGISTER" && "TẠO TÀI KHOẢN MỚI"}
          </button>
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

          {mode === "REGISTER" && (
            <span>
              Đã nhớ mật khẩu?{" "}
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
