import { useState } from "react";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  // mode: 'LOGIN' | 'REGISTER' | 'FORGOT'
  const [mode, setMode] = useState("LOGIN");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleResetForm = () => {
    setError("");
    setSuccessMsg("");
    setUsername("");
    setPassword("");
    setDisplayName("");
    setNewPassword("");
  };

  const switchMode = (newMode) => {
    handleResetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    let endpoint = "/api/login";
    let payload = {};

    if (mode === "LOGIN") {
      endpoint = "/api/login";
      payload = { username, password };
    } else if (mode === "REGISTER") {
      endpoint = "/api/register";
      payload = { username, password, displayName };
    } else if (mode === "FORGOT") {
      endpoint = "/api/forgot-password";
      payload = { username, displayName, newPassword };
    }

    try {
      const res = await fetch(
        `https://san-quan-hem-backend.onrender.com${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đã có lỗi xảy ra!");

      if (mode === "FORGOT") {
        setSuccessMsg(data.message);
        setTimeout(() => switchMode("LOGIN"), 2000);
      } else {
        // Lưu Token & Thông tin User vào LocalStorage khi Đăng nhập / Đăng ký
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        onAuthSuccess(data.user);
        onClose();
      }
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
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs p-2.5 rounded-xl text-center font-bold">
            ✅ {successMsg}
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

          {/* Biệt danh (Cần khi Đăng ký & Xác minh Quên mật khẩu) */}
          {(mode === "REGISTER" || mode === "FORGOT") && (
            <input
              type="text"
              placeholder="Tên hiển thị (Biệt danh lúc đăng ký)..."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
              required
            />
          )}

          {/* Mật khẩu cũ / Mật khẩu mới */}
          {mode !== "FORGOT" ? (
            <input
              type="password"
              placeholder="Mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
              required
            />
          ) : (
            <input
              type="password"
              placeholder="Nhập mật khẩu MỚI..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition"
              required
            />
          )}

          {/* Nút Quên mật khẩu nhỏ khi ở giao diện Đăng nhập */}
          {mode === "LOGIN" && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => switchMode("FORGOT")}
                className="text-[11px] text-amber-400/80 hover:text-amber-300 font-semibold hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          {/* Nút Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black py-3 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider mt-1"
          >
            {mode === "LOGIN" && "ĐĂNG NHẬP NGAY"}
            {mode === "REGISTER" && "TẠO TÀI KHOẢN MỚI"}
            {mode === "FORGOT" && "ĐẶT LẠI MẬT KHẨU"}
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

          {(mode === "REGISTER" || mode === "FORGOT") && (
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
