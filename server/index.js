require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const nodemailer = require("nodemailer");
const User = require("./models/User");
const OAuthFlow = require("./models/OAuthFlow");
const GameMatch = require("./models/GameMatch");
const AdminAuditLog = require("./models/AdminAuditLog");
const GameReport = require("./models/GameReport");
const GameSettings = require("./models/GameSettings");
const Friendship = require("./models/Friendship");
const DirectMessage = require("./models/DirectMessage");
const ProfileReaction = require("./models/ProfileReaction");
const GameChallenge = require("./models/GameChallenge");
const createAdminRouter = require("./adminRouter");
const createSocialRouter = require("./socialRouter");

// --- BÍ MẬT LẤY TỪ BIẾN MÔI TRƯỜNG (.env / Render Dashboard) ---
const { MONGO_URI, JWT_SECRET } = process.env;
if (!MONGO_URI || !JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    "❌ Cần MONGO_URI và JWT_SECRET dài ít nhất 32 ký tự trong .env / biến môi trường!",
  );
  process.exit(1);
}

const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || "587", 10);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM;
const mailTransport =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_FROM &&
  Number.isInteger(SMTP_PORT) &&
  SMTP_PORT > 0 &&
  SMTP_PORT <= 65_535
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: SMTP_PORT,
        secure: process.env.SMTP_SECURE === "true" || SMTP_PORT === 465,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;
const emailDeliveryConfigured = RESEND_API_KEY
  ? Boolean(RESEND_FROM)
  : Boolean(mailTransport);

const sendPasswordResetEmail = async (email, code) => {
  const subject = "Mã xác minh đặt lại mật khẩu";
  const text = `Mã xác minh của bạn là ${code}. Mã hết hạn sau 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;

  if (RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const error = new Error(`Resend returned HTTP ${response.status}.`);
      error.code = `RESEND_HTTP_${response.status}`;
      throw error;
    }
    return;
  }

  if (!mailTransport) throw new Error("Email delivery is not configured.");
  await mailTransport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text,
  });
};

const getUtcWeekStart = (date = new Date()) => {
  const weekStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  return weekStart;
};

const updatePlayerStats = (userId, isWinner) => {
  const weekStart = getUtcWeekStart();
  const weeklyMatches = {
    $cond: [
      { $eq: ["$weeklyWeekStart", weekStart] },
      { $add: [{ $ifNull: ["$weeklyMatches", 0] }, 1] },
      1,
    ],
  };
  const weeklyWins = {
    $cond: [
      { $eq: ["$weeklyWeekStart", weekStart] },
      { $add: [{ $ifNull: ["$weeklyWins", 0] }, isWinner ? 1 : 0] },
      isWinner ? 1 : 0,
    ],
  };

  return User.findByIdAndUpdate(userId, [
    {
      $set: {
        matches: { $add: [{ $ifNull: ["$matches", 0] }, 1] },
        wins: { $add: [{ $ifNull: ["$wins", 0] }, isWinner ? 1 : 0] },
        weeklyMatches,
        weeklyWins,
        weeklyWeekStart: weekStart,
      },
    },
  ]);
};

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isValidEmail = (value) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getRecoveryEmail = (user) => {
  const email = normalizeEmail(user.email);
  if (isValidEmail(email)) return email;
  const username = normalizeEmail(user.username);
  return isValidEmail(username) ? username : null;
};

const hashPasswordResetCode = (userId, code) =>
  crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${userId}:${code}`)
    .digest("hex");

const matchesPasswordResetCode = (userId, code, storedHash) => {
  if (typeof storedHash !== "string") return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashPasswordResetCode(userId, code), "hex");
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
};

const ALLOWED_ORIGINS = (
  process.env.CLIENT_ORIGINS ||
  "https://san-quan-hem.vercel.app,http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Quá nhiều lần thử. Vui lòng đợi 15 phút rồi thử lại." },
});

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Quá nhiều yêu cầu gửi mã. Vui lòng thử lại sau." },
});

const passwordResetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Quá nhiều lần nhập mã. Vui lòng thử lại sau." },
});

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Quá nhiều lần đổi mật khẩu. Vui lòng thử lại sau." },
});

let matchmakingEnabled = true;

const requireAuthenticatedUser = async (req, res, next) => {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ message: "Vui lòng đăng nhập lại." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload.userId !== "string") {
      return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ." });
    }

    const user = await User.findById(payload.userId);
    if (!user || (payload.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: "Vui lòng đăng nhập lại." });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: "Tài khoản đã bị tạm khóa." });
    }

    req.authenticatedUser = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ." });
  }
};

const ADMIN_USERNAMES = new Set(
  (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map((username) => username.trim().toLowerCase())
    .filter(Boolean),
);

const requireAdmin = (req, res, next) =>
  requireAuthenticatedUser(req, res, () => {
    if (!ADMIN_USERNAMES.size) {
      return res
        .status(503)
        .json({ message: "Chưa cấu hình tài khoản quản trị." });
    }
    if (!ADMIN_USERNAMES.has(req.authenticatedUser.username.toLowerCase())) {
      return res.status(403).json({ message: "Bạn không có quyền quản trị." });
    }
    return next();
  });

app.get("/api/admin/session", requireAdmin, (req, res) => {
  res.json({
    id: req.authenticatedUser._id,
    displayName: req.authenticatedUser.displayName,
    username: req.authenticatedUser.username,
  });
});

app.get("/api/announcements", async (req, res) => {
  if (mongoose.connection.readyState !== 1)
    return res.json({ announcement: "" });
  try {
    const settings = await GameSettings.findOne({ key: "global" })
      .select("announcement")
      .lean();
    res.json({ announcement: settings?.announcement || "" });
  } catch {
    res.json({ announcement: "" });
  }
});

app.post("/api/reports", requireAuthenticatedUser, async (req, res) => {
  const { matchId, reportedPlayer = "", reason } = req.body || {};
  if (
    typeof matchId !== "string" ||
    !matchId.trim() ||
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.length > 1000 ||
    typeof reportedPlayer !== "string" ||
    reportedPlayer.length > 64
  ) {
    return res.status(400).json({ message: "Thông tin báo cáo không hợp lệ." });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: "Cơ sở dữ liệu chưa sẵn sàng." });
  }
  const report = await GameReport.create({
    matchId: matchId.trim(),
    reporterId: req.authenticatedUser._id,
    reporterName: req.authenticatedUser.displayName,
    reportedPlayer: reportedPlayer.trim(),
    reason: reason.trim(),
  });
  res.status(201).json({ id: report.id, status: report.status });
});

// --- KẾT NỐI MONGODB ATLAS CLOUD ---
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Đã kết nối MongoDB Atlas Cloud thành công!");
    const settings = await GameSettings.findOne({ key: "global" }).lean();
    if (settings) matchmakingEnabled = settings.matchmakingEnabled !== false;
  })
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB Atlas:", err.message));

const OAUTH_PROVIDERS = new Set(["google", "facebook"]);
const getOAuthCredentials = (provider) =>
  provider === "google"
    ? {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }
    : {
        clientId: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
      };
const getOAuthCallbackUrl = (provider, req) => {
  const serverUrl = (
    process.env.PUBLIC_SERVER_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/+$/, "");
  return `${serverUrl}/api/auth/${provider}/callback`;
};
const redirectToClient = (res, query) => {
  const target = new URL(
    process.env.CLIENT_URL || "https://san-quan-hem.vercel.app",
  );
  Object.entries(query).forEach(([key, value]) =>
    target.searchParams.set(key, value),
  );
  return res.redirect(target.toString());
};
const hashOAuthValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const createOAuthAuthorizationUrl = async (provider, purpose, req, user) => {
  const credentials = getOAuthCredentials(provider);
  if (!credentials.clientId || !credentials.clientSecret) {
    throw Object.assign(new Error("OAuth provider is not configured."), {
      code: "provider_not_configured",
    });
  }

  const state = crypto.randomBytes(32).toString("base64url");
  await OAuthFlow.create({
    stateHash: hashOAuthValue(state),
    provider,
    purpose,
    userId: user?._id,
    tokenVersion: user?.tokenVersion,
    expiresAt: new Date(Date.now() + 10 * 60_000),
  });

  const redirectUri = getOAuthCallbackUrl(provider, req);
  const authorizationUrl =
    provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL("https://www.facebook.com/v22.0/dialog/oauth");
  authorizationUrl.search = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: provider === "google" ? "openid email profile" : "public_profile",
    state,
    ...(provider === "google" && { prompt: "select_account" }),
  }).toString();
  return authorizationUrl.toString();
};

const fetchOAuthProfile = async (provider, code, req) => {
  const credentials = getOAuthCredentials(provider);
  const redirectUri = getOAuthCallbackUrl(provider, req);
  let tokenUrl;
  let tokenOptions;

  if (provider === "google") {
    tokenUrl = "https://oauth2.googleapis.com/token";
    tokenOptions = {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    };
  } else {
    tokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
    tokenUrl.search = new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: redirectUri,
    }).toString();
    tokenOptions = { method: "GET" };
  }

  const tokenResponse = await fetch(tokenUrl, {
    ...tokenOptions,
    signal: AbortSignal.timeout(15_000),
  });
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw Object.assign(new Error("OAuth token exchange failed."), {
      code: "provider_exchange_failed",
    });
  }

  const profileUrl =
    provider === "google"
      ? "https://openidconnect.googleapis.com/v1/userinfo"
      : "https://graph.facebook.com/v22.0/me?fields=id,name";
  const profileResponse = await fetch(profileUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    signal: AbortSignal.timeout(15_000),
  });
  const profile = await profileResponse.json().catch(() => ({}));
  const providerId = provider === "google" ? profile.sub : profile.id;
  if (!profileResponse.ok || typeof providerId !== "string") {
    throw Object.assign(new Error("OAuth profile request failed."), {
      code: "provider_profile_failed",
    });
  }

  const verifiedEmail =
    provider === "google" && profile.email_verified === true;
  return {
    id: providerId,
    name: typeof profile.name === "string" ? profile.name.trim() : "",
    email:
      verifiedEmail && typeof profile.email === "string"
        ? normalizeEmail(profile.email)
        : "",
    verifiedEmail,
  };
};

const getOrCreateOAuthUser = async (provider, profile) => {
  const providerField = provider === "google" ? "googleId" : "facebookId";
  let user = await User.findOne({ [providerField]: profile.id });
  if (user) return user;

  if (provider === "google" && profile.verifiedEmail && profile.email) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      if (user.googleId && user.googleId !== profile.id) {
        throw Object.assign(new Error("Google account is already linked."), {
          code: "account_link_conflict",
        });
      }
      user.googleId = profile.id;
      await user.save();
      return user;
    }
  }

  if (profile.email && (await User.findOne({ email: profile.email }))) {
    throw Object.assign(new Error("An account already uses this email."), {
      code: "account_requires_link",
    });
  }

  const prefix = provider === "google" ? "g_" : "f_";
  let username = `${prefix}${profile.id}`.slice(0, 32);
  if (await User.exists({ username })) {
    username = `${prefix}${crypto.randomBytes(10).toString("hex")}`;
  }
  const randomPassword = crypto.randomBytes(32).toString("hex");
  user = new User({
    username,
    ...(profile.email && { email: profile.email }),
    password: await bcrypt.hash(randomPassword, 10),
    passwordAuthEnabled: false,
    displayName: profile.name.slice(0, 32) || "Người chơi",
    [providerField]: profile.id,
  });
  await user.save();
  return user;
};

const oauthUserPayload = (user) => ({
  id: user._id,
  username: user.username,
  displayName: user.displayName,
  wins: user.wins,
  matches: user.matches,
  isDonor: Boolean(user.isDonor),
});

const oauthFlowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

// --- API AUTHENTICATION ---
app.get("/api/auth/providers", requireAuthenticatedUser, (req, res) => {
  const user = req.authenticatedUser;
  res.json({
    google: Boolean(user.googleId),
    facebook: Boolean(user.facebookId),
    password: user.passwordAuthEnabled !== false,
  });
});

app.get("/api/auth/:provider/start", oauthFlowLimiter, async (req, res) => {
  const { provider } = req.params;
  if (!OAUTH_PROVIDERS.has(provider)) return res.sendStatus(404);
  try {
    const url = await createOAuthAuthorizationUrl(provider, "login", req);
    return res.redirect(url);
  } catch (err) {
    return redirectToClient(res, {
      oauth_error:
        err.code === "provider_not_configured"
          ? `${provider}_not_configured`
          : "oauth_start_failed",
    });
  }
});

app.post(
  "/api/auth/:provider/link",
  oauthFlowLimiter,
  requireAuthenticatedUser,
  async (req, res) => {
    const { provider } = req.params;
    if (!OAUTH_PROVIDERS.has(provider)) return res.sendStatus(404);
    try {
      const url = await createOAuthAuthorizationUrl(
        provider,
        "link",
        req,
        req.authenticatedUser,
      );
      return res.json({ url });
    } catch (err) {
      return res
        .status(err.code === "provider_not_configured" ? 503 : 500)
        .json({
          message:
            err.code === "provider_not_configured"
              ? `Đăng nhập ${provider} chưa được cấu hình.`
              : "Không thể bắt đầu liên kết tài khoản.",
        });
    }
  },
);

app.get("/api/auth/:provider/callback", oauthFlowLimiter, async (req, res) => {
  const { provider } = req.params;
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!OAUTH_PROVIDERS.has(provider) || !state) {
    return redirectToClient(res, { oauth_error: "invalid_oauth_state" });
  }

  try {
    const flow = await OAuthFlow.findOneAndDelete({
      stateHash: hashOAuthValue(state),
      provider,
      purpose: { $in: ["login", "link"] },
      expiresAt: { $gt: new Date() },
    });
    if (!flow) {
      return redirectToClient(res, { oauth_error: "invalid_oauth_state" });
    }
    if (req.query.error || typeof req.query.code !== "string") {
      return redirectToClient(res, { oauth_error: "oauth_cancelled" });
    }

    const profile = await fetchOAuthProfile(provider, req.query.code, req);
    const providerField = provider === "google" ? "googleId" : "facebookId";

    if (flow.purpose === "link") {
      const user = await User.findById(flow.userId);
      if (!user || (flow.tokenVersion || 0) !== (user.tokenVersion || 0)) {
        return redirectToClient(res, { oauth_error: "session_expired" });
      }
      const linkedUser = await User.findOne({ [providerField]: profile.id });
      if (linkedUser && !linkedUser._id.equals(user._id)) {
        return redirectToClient(res, {
          oauth_error: "provider_already_linked",
        });
      }
      user[providerField] = profile.id;
      await user.save();
      return redirectToClient(res, { oauth_linked: provider });
    }

    const user = await getOrCreateOAuthUser(provider, profile);
    const code = crypto.randomBytes(32).toString("base64url");
    await OAuthFlow.create({
      codeHash: hashOAuthValue(code),
      provider,
      purpose: "exchange",
      userId: user._id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    return redirectToClient(res, { oauth_code: code });
  } catch (err) {
    console.error("OAuth callback failed:", { provider, code: err.code });
    const oauthError =
      err.code === "account_requires_link"
        ? "account_requires_link"
        : err.code === "account_link_conflict"
          ? "provider_already_linked"
          : "oauth_failed";
    return redirectToClient(res, { oauth_error: oauthError });
  }
});

app.post("/api/auth/exchange", oauthFlowLimiter, async (req, res) => {
  const { code } = req.body || {};
  if (typeof code !== "string" || code.length > 100) {
    return res.status(400).json({ message: "Mã đăng nhập không hợp lệ." });
  }

  try {
    const flow = await OAuthFlow.findOneAndDelete({
      codeHash: hashOAuthValue(code),
      purpose: "exchange",
      expiresAt: { $gt: new Date() },
    });
    if (!flow) {
      return res.status(400).json({ message: "Mã đăng nhập đã hết hạn." });
    }
    const user = await User.findById(flow.userId);
    if (!user)
      return res.status(400).json({ message: "Tài khoản không tồn tại." });
    if (user.isBanned) {
      return res.status(403).json({ message: "Tài khoản đã bị tạm khóa." });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        tokenVersion: user.tokenVersion || 0,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    return res.json({ token, user: oauthUserPayload(user) });
  } catch (err) {
    console.error("OAuth code exchange failed:", err.message);
    return res.status(500).json({ message: "Không thể hoàn tất đăng nhập." });
  }
});

app.post("/api/register", authLimiter, async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    if (
      typeof username !== "string" ||
      username.trim().length < 3 ||
      username.trim().length > 32 ||
      !isValidEmail(normalizedEmail) ||
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72 ||
      (displayName !== undefined &&
        (typeof displayName !== "string" || displayName.trim().length > 32))
    ) {
      return res
        .status(400)
        .json({ message: "Thông tin đăng ký không hợp lệ." });
    }

    const normalizedUsername = username.trim();
    const normalizedDisplayName = displayName?.trim() || normalizedUsername;

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Tên tài khoản hoặc email đã được sử dụng!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      displayName: normalizedDisplayName,
    });
    await newUser.save();

    const token = jwt.sign(
      {
        userId: newUser._id.toString(),
        username: normalizedUsername,
        tokenVersion: newUser.tokenVersion,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
    res.json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        displayName: newUser.displayName,
        wins: newUser.wins,
        matches: newUser.matches,
        isDonor: Boolean(newUser.isDonor),
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Tên tài khoản hoặc email đã được sử dụng!" });
    }
    res.status(500).json({ message: "Lỗi máy chủ!" });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (
      typeof username !== "string" ||
      !username.trim() ||
      username.length > 32 ||
      typeof password !== "string" ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res
        .status(400)
        .json({ message: "Tài khoản hoặc mật khẩu không đúng!" });
    }

    const normalizedUsername = username.trim();
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Tài khoản hoặc mật khẩu không đúng!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Tài khoản hoặc mật khẩu không đúng!" });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: "Tài khoản đã bị tạm khóa." });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: normalizedUsername,
        tokenVersion: user.tokenVersion || 0,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        wins: user.wins,
        matches: user.matches,
        isDonor: Boolean(user.isDonor),
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Lỗi máy chủ!" });
  }
});

app.post(
  "/api/password/change",
  passwordChangeLimiter,
  requireAuthenticatedUser,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const user = req.authenticatedUser;
    const hasPassword = user.passwordAuthEnabled !== false;
    if (
      (hasPassword &&
        (typeof currentPassword !== "string" ||
          !currentPassword ||
          Buffer.byteLength(currentPassword, "utf8") > 72)) ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      Buffer.byteLength(newPassword, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Mật khẩu mới phải có ít nhất 8 ký tự và không quá 72 byte.",
      });
    }

    try {
      if (
        hasPassword &&
        !(await bcrypt.compare(currentPassword, user.password))
      ) {
        return res
          .status(400)
          .json({ message: "Mật khẩu hiện tại không chính xác." });
      }
      if (hasPassword && currentPassword === newPassword) {
        return res.status(400).json({
          message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          tokenVersion: { $in: [user.tokenVersion || 0, null] },
        },
        {
          $set: { password: hashedPassword, passwordAuthEnabled: true },
          $inc: { tokenVersion: 1 },
          $unset: {
            passwordResetOtpHash: 1,
            passwordResetOtpExpiresAt: 1,
            passwordResetOtpAttempts: 1,
            passwordResetRequestedAt: 1,
          },
        },
        { new: true },
      );
      if (!updatedUser) {
        return res.status(401).json({ message: "Vui lòng đăng nhập lại." });
      }

      const token = jwt.sign(
        {
          userId: updatedUser._id.toString(),
          username: updatedUser.username,
          tokenVersion: updatedUser.tokenVersion || 0,
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );
      return res.json({
        token,
        message: "Đổi mật khẩu thành công.",
      });
    } catch (err) {
      console.error("Password change failed:", err.message);
      return res.status(500).json({ message: "Lỗi máy chủ!" });
    }
  },
);

app.post("/api/forgot-password", async (req, res) => {
  res.status(410).json({
    message:
      "Endpoint cũ đã ngừng hoạt động. Hãy dùng luồng gửi mã OTP qua email.",
  });
});

app.post(
  "/api/password-reset/request",
  passwordResetRequestLimiter,
  async (req, res) => {
    if (!emailDeliveryConfigured) {
      return res.status(503).json({
        message: "Dịch vụ email khôi phục chưa được cấu hình trên máy chủ.",
      });
    }

    const { username } = req.body || {};
    if (
      typeof username !== "string" ||
      !username.trim() ||
      username.length > 254
    ) {
      return res.status(400).json({ message: "Tên tài khoản không hợp lệ." });
    }

    const genericMessage =
      "Nếu tài khoản có email khôi phục, mã xác minh sẽ được gửi đến địa chỉ đó.";

    try {
      const user = await User.findOne({ username: username.trim() });
      if (!user) return res.json({ message: genericMessage });

      const email = getRecoveryEmail(user);
      if (!email) return res.json({ message: genericMessage });

      const now = new Date();
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          $or: [
            { passwordResetRequestedAt: { $exists: false } },
            {
              passwordResetRequestedAt: {
                $lte: new Date(now.getTime() - 60_000),
              },
            },
          ],
        },
        {
          $set: {
            passwordResetOtpHash: hashPasswordResetCode(user._id, code),
            passwordResetOtpExpiresAt: new Date(now.getTime() + 10 * 60_000),
            passwordResetOtpAttempts: 0,
            passwordResetRequestedAt: now,
          },
        },
        { new: true },
      );
      if (!updatedUser) return res.json({ message: genericMessage });

      try {
        await sendPasswordResetEmail(email, code);
      } catch (err) {
        await User.updateOne(
          { _id: user._id },
          {
            $unset: {
              passwordResetOtpHash: 1,
              passwordResetOtpExpiresAt: 1,
              passwordResetOtpAttempts: 1,
              passwordResetRequestedAt: 1,
            },
          },
        );
        console.error("Password reset email delivery failed:", {
          code: err.code,
          command: err.command,
          responseCode: err.responseCode,
          message: err.message,
        });
        return res.status(503).json({
          message: "Không gửi được email lúc này. Vui lòng thử lại sau.",
        });
      }

      res.json({ message: genericMessage });
    } catch (err) {
      console.error("Password reset request failed:", err.message);
      res.status(500).json({ message: "Lỗi máy chủ!" });
    }
  },
);

app.post(
  "/api/password-reset/verify",
  passwordResetVerifyLimiter,
  async (req, res) => {
    const { username, code, newPassword } = req.body || {};
    if (
      typeof username !== "string" ||
      !username.trim() ||
      username.length > 254 ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code) ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      Buffer.byteLength(newPassword, "utf8") > 72
    ) {
      return res
        .status(400)
        .json({ message: "Thông tin xác minh không hợp lệ." });
    }

    try {
      const user = await User.findOne({ username: username.trim() }).select(
        "+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts",
      );
      const now = new Date();
      if (
        !user ||
        !user.passwordResetOtpHash ||
        !user.passwordResetOtpExpiresAt ||
        user.passwordResetOtpExpiresAt <= now ||
        (user.passwordResetOtpAttempts || 0) >= 5
      ) {
        return res.status(400).json({
          message: "Mã không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.",
        });
      }

      const otpMatches = matchesPasswordResetCode(
        user._id,
        code,
        user.passwordResetOtpHash,
      );
      if (!otpMatches) {
        const updatedUser = await User.findOneAndUpdate(
          {
            _id: user._id,
            passwordResetOtpHash: user.passwordResetOtpHash,
            passwordResetOtpExpiresAt: { $gt: now },
            passwordResetOtpAttempts: { $lt: 5 },
          },
          { $inc: { passwordResetOtpAttempts: 1 } },
          { new: true },
        ).select("+passwordResetOtpAttempts");

        if (updatedUser?.passwordResetOtpAttempts >= 5) {
          await User.updateOne(
            { _id: user._id },
            {
              $unset: {
                passwordResetOtpHash: 1,
                passwordResetOtpExpiresAt: 1,
                passwordResetOtpAttempts: 1,
                passwordResetRequestedAt: 1,
              },
            },
          );
        }

        return res.status(400).json({
          message: "Mã không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          passwordResetOtpHash: user.passwordResetOtpHash,
          passwordResetOtpExpiresAt: { $gt: now },
          passwordResetOtpAttempts: { $lt: 5 },
        },
        {
          $set: { password: hashedPassword },
          $inc: { tokenVersion: 1 },
          $unset: {
            passwordResetOtpHash: 1,
            passwordResetOtpExpiresAt: 1,
            passwordResetOtpAttempts: 1,
            passwordResetRequestedAt: 1,
          },
        },
        { new: true },
      );

      if (!updatedUser) {
        return res.status(400).json({
          message: "Mã không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.",
        });
      }

      io.in(`user:${user._id}`).disconnectSockets(true);
      res.json({ message: "Đặt lại mật khẩu thành công. Hãy đăng nhập lại." });
    } catch (err) {
      console.error("Password reset verification failed:", err.message);
      res.status(500).json({ message: "Lỗi máy chủ!" });
    }
  },
);

app.get("/api/leaderboard", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const weekly = req.query.period === "week";
    const donors = req.query.period === "donors";
    const topUsers = await User.find(
      donors
        ? { isDonor: true }
        : weekly
          ? { weeklyWeekStart: getUtcWeekStart() }
          : {},
    )
      .select(
        donors
          ? "displayName donorSince"
          : "displayName wins matches weeklyWins weeklyMatches isDonor",
      )
      .sort(
        donors
          ? { donorSince: 1, createdAt: 1 }
          : weekly
            ? { weeklyWins: -1, weeklyMatches: 1 }
            : { wins: -1, matches: 1 },
      )
      .limit(10);
    res.json(
      topUsers.map((user) => {
        const result = user.toObject();
        if (weekly) {
          result.wins = result.weeklyWins || 0;
          result.matches = result.weeklyMatches || 0;
        }
        return result;
      }),
    );
  } catch (err) {
    console.error("Leaderboard Error:", err.message);
    res.json([]);
  }
});

// --- GAME SOCKET.IO LOGIC ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.data.userId = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload.userId !== "string") {
      return next(new Error("Token tài khoản không hợp lệ."));
    }

    const user = await User.findById(payload.userId).select(
      "tokenVersion isBanned username displayName",
    );
    if (!user || (payload.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return next(
        new Error("Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại."),
      );
    }
    if (user.isBanned) return next(new Error("Tài khoản đã bị tạm khóa."));

    socket.data.userId = user._id.toString();
    socket.data.username = user.username;
    socket.data.displayName = user.displayName;
    next();
  } catch {
    next(new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));
  }
});

const getPlayerName = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, 32)
    : "Phượt Thủ";

const isSocketPayload = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const matchmakingQueues = { "1v1": [], "2v2": [] };
const searchTimers = new Map();
const activeRooms = {};

app.use(
  "/api/admin",
  createAdminRouter({
    User,
    GameMatch,
    GameReport,
    GameSettings,
    AdminAuditLog,
    activeRooms,
    matchmakingQueues,
    io,
    requireAdmin,
    onSettingsUpdated: (settings) => {
      matchmakingEnabled = settings.matchmakingEnabled !== false;
    },
  }),
);

const getModeSettings = (mode = "1v1") =>
  mode === "2v2"
    ? { mode: "2v2", gridSize: 10, playerCount: 4 }
    : { mode: "1v1", gridSize: 8, playerCount: 2 };

const selectRandomShops = (mode = "1v1") => {
  const pool2 = [
    {
      id: "cavien",
      name: "Xe Cá Viên Chiên",
      size: 2,
      icon: "/cavienchien.png",
    },
  ];
  const pool3 = [
    { id: "trasua", name: "Tiệm Trà Sữa", size: 3, icon: "/trasua.png" },
    { id: "bunrieu", name: "Gánh Bún Riêu", size: 3, icon: "/bunrieu.png" },
  ];
  const pool4 = [
    { id: "quanoc", name: "Quán Ốc Quen", size: 4, icon: "/donuong.png" },
    { id: "quannhau", name: "Khu Nhậu Vỉa Hè", size: 4, icon: "/quannhau.png" },
  ];
  const pool5 = [
    {
      id: "quannhau5",
      name: "Khu Nhậu Vỉa Hè",
      size: 5,
      icon: "/quannhau.png",
    },
  ];

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return mode === "2v2"
    ? [pickRandom(pool2), pickRandom(pool3), pickRandom(pool4), ...pool5]
    : [pickRandom(pool2), pickRandom(pool3), pickRandom(pool4)];
};

const generateBotBoard = (shops, gridSize = 8) => {
  const board = Array(gridSize * gridSize).fill(null);
  shops.forEach((shop) => {
    let placed = false;
    while (!placed) {
      const isHorizontal = Math.random() < 0.5;
      const startIndex = Math.floor(Math.random() * board.length);
      let row = Math.floor(startIndex / gridSize);
      let col = startIndex % gridSize;

      if (isHorizontal && col + shop.size > gridSize)
        col = gridSize - shop.size;
      if (!isHorizontal && row + shop.size > gridSize)
        row = gridSize - shop.size;

      const adjustedIndex = row * gridSize + col;
      const indices = [];
      for (let i = 0; i < shop.size; i++) {
        indices.push(
          isHorizontal ? adjustedIndex + i : adjustedIndex + i * gridSize,
        );
      }

      const isOverlap = indices.some((idx) => board[idx] !== null);
      if (!isOverlap) {
        indices.forEach((idx) => {
          board[idx] = { shopId: shop.id, icon: shop.icon, name: shop.name };
        });
        placed = true;
      }
    }
  });
  return board;
};

// HÀM 3: Kiểm tra & làm sạch sơ đồ do client gửi lên.
// - Đúng 3 quán của phòng, đúng số ô, nằm thẳng hàng liền nhau (ngang hoặc dọc)
// - Xây lại bàn cờ từ đầu để loại bỏ mọi cờ "shot" do client tự gắn
const sanitizeBoard = (board, shops, gridSize = 8) => {
  if (!Array.isArray(board) || board.length !== gridSize * gridSize)
    return null;

  const clean = Array(gridSize * gridSize).fill(null);
  const indicesByShop = {};

  for (let i = 0; i < gridSize * gridSize; i++) {
    const cell = board[i];
    if (cell === null || cell === undefined) continue;

    const shop = shops.find((s) => s.id === cell.shopId);
    if (!shop) return null;

    if (!indicesByShop[shop.id]) indicesByShop[shop.id] = [];
    indicesByShop[shop.id].push(i);
    clean[i] = { shopId: shop.id, icon: shop.icon, name: shop.name };
  }

  for (const shop of shops) {
    const idxs = indicesByShop[shop.id];
    if (!idxs || idxs.length !== shop.size) return null;

    const first = idxs[0];
    const last = idxs[idxs.length - 1];
    const isHorizontal =
      Math.floor(first / gridSize) === Math.floor(last / gridSize) &&
      idxs.every((v, k) => k === 0 || v === idxs[k - 1] + 1);
    const isVertical = idxs.every(
      (v, k) => k === 0 || v === idxs[k - 1] + gridSize,
    );

    if (!isHorizontal && !isVertical) return null;
  }

  return clean;
};

const publicRoomPlayers = (room) =>
  Object.values(room.players).map((player) => ({
    socketId: player.socketId,
    name: player.name,
    team: player.team,
    ready: Boolean(player.ready),
    eliminated: Boolean(player.eliminated),
    connected: player.connected !== false,
  }));

const roomOverview = (room) => ({
  roomId: room.roomId,
  roomCode: room.roomCode || null,
  hostSocketId: room.hostSocketId,
  mode: room.mode,
  gridSize: room.gridSize,
  playerCount: room.playerCount,
  gameState: room.gameState,
  shops: room.shops,
  players: publicRoomPlayers(room),
  turn: room.turn,
});

const emitRoomUpdate = (room) => {
  const overview = roomOverview(room);
  io.to(room.roomId).emit("room_lobby_update", overview);
  return overview;
};

const createGameRoom = (roomId, mode, players, options = {}) => {
  const settings = getModeSettings(mode);
  const room = {
    roomId,
    roomCode: options.roomCode || null,
    hostSocketId: options.hostSocketId || null,
    isPrivate: Boolean(options.isPrivate),
    isBotRoom: Boolean(options.isBotRoom),
    botSocketId: options.botSocketId || null,
    mode: settings.mode,
    gridSize: settings.gridSize,
    playerCount: settings.playerCount,
    players,
    shotLog: [],
    shops: selectRandomShops(settings.mode),
    gameState: options.waiting ? "WAITING_FRIEND" : "SETUP",
    turn: null,
    turnOrder: [],
    turnIndex: 0,
  };
  activeRooms[roomId] = room;
  return room;
};

const notifyMatchFound = (room, message) => {
  room.gameState = "SETUP";
  const players = publicRoomPlayers(room);
  Object.values(room.players).forEach((player) => {
    if (player.isBot) return;
    io.to(player.socketId).emit("match_found", {
      ...roomOverview(room),
      team: player.team,
      message,
    });
  });
  io.to(room.roomId).emit("room_lobby_update", {
    ...roomOverview(room),
    players,
  });
};

const getTurnOrder = (room) => {
  const redPlayers = Object.values(room.players).filter(
    (player) => player.team === "red",
  );
  const bluePlayers = Object.values(room.players).filter(
    (player) => player.team === "blue",
  );
  const order = [];
  const firstTeam = Math.random() < 0.5 ? "red" : "blue";
  const firstPlayers = firstTeam === "red" ? redPlayers : bluePlayers;
  const secondPlayers = firstTeam === "red" ? bluePlayers : redPlayers;

  for (
    let i = 0;
    i < Math.max(firstPlayers.length, secondPlayers.length);
    i++
  ) {
    if (firstPlayers[i]) order.push(firstPlayers[i].socketId);
    if (secondPlayers[i]) order.push(secondPlayers[i].socketId);
  }
  return order;
};

const isBoardDestroyed = (board) =>
  board.some((cell) => cell?.shopId) &&
  board.every((cell) => !cell?.shopId || cell.shot === "HIT");

const getWinningTeam = (room) => {
  for (const team of ["red", "blue"]) {
    const teamPlayers = Object.values(room.players).filter(
      (player) => player.team === team,
    );
    if (
      teamPlayers.length &&
      teamPlayers.every((player) => player.eliminated)
    ) {
      return team === "red" ? "blue" : "red";
    }
  }
  return null;
};

const getNextTurnId = (room, previousTurnId, keepTurn = false) => {
  const currentPlayer = room.players[previousTurnId];
  if (keepTurn && currentPlayer && !currentPlayer.eliminated) {
    return previousTurnId;
  }

  for (let offset = 1; offset <= room.turnOrder.length; offset++) {
    const index = (room.turnIndex + offset) % room.turnOrder.length;
    const candidateId = room.turnOrder[index];
    const candidate = room.players[candidateId];
    if (candidate && !candidate.eliminated) {
      room.turnIndex = index;
      return candidateId;
    }
  }
  return null;
};

const startRoomIfReady = (room) => {
  const players = Object.values(room.players);
  if (
    room.gameState !== "SETUP" ||
    players.length !== room.playerCount ||
    !players.every((player) => player.ready)
  ) {
    emitRoomUpdate(room);
    return false;
  }

  room.gameState = "PLAYING";
  room.gameId = crypto.randomUUID();
  room.startedAt = new Date();
  room.turnOrder = getTurnOrder(room);
  room.turnIndex = 0;
  room.turn = room.turnOrder[room.turnIndex];
  io.to(room.roomId).emit("start_coin_flip", {
    firstTurnId: room.turn,
    firstTeam: room.players[room.turn]?.team,
    turnOrder: room.turnOrder,
    gameId: room.gameId,
  });
  return true;
};

const updateFinishedGameStats = async (room, winnerTeam) => {
  if (room.isBotRoom) {
    const human = Object.values(room.players).find((player) => !player.isBot);
    if (human?.userId) {
      await updatePlayerStats(human.userId, winnerTeam === human.team);
    }
    return;
  }

  await Promise.all(
    Object.values(room.players)
      .filter((player) => player.userId)
      .map((player) =>
        updatePlayerStats(player.userId, player.team === winnerTeam),
      ),
  );
};

const broadcastGameOver = async (room, winnerTeam) => {
  room.gameState = "FINISHED";
  room.finishedAt = new Date();
  io.to(room.roomId).emit("game_over", {
    winnerTeam,
    shots: room.shotLog || [],
    winnerPlayerIds: Object.values(room.players)
      .filter((player) => player.team === winnerTeam)
      .map((player) => player.socketId),
    winnerBoards: Object.values(room.players)
      .filter((player) => player.team === winnerTeam)
      .map((player) => ({
        name: player.name,
        board: player.board.map((cell) =>
          cell
            ? { shopId: cell.shopId || null, shot: cell.shot || null }
            : null,
        ),
      })),
  });
  if (mongoose.connection.readyState === 1) {
    try {
      await GameMatch.create({
        gameId: room.gameId || crypto.randomUUID(),
        roomId: room.roomId,
        mode: room.mode,
        gridSize: room.gridSize,
        winnerTeam,
        shops: room.shops,
        startedAt: room.startedAt || room.finishedAt,
        finishedAt: room.finishedAt,
        players: Object.values(room.players).map((player) => ({
          userId: player.userId || null,
          name: player.name,
          team: player.team,
          board: (player.board || []).map((cell, index) => ({
            index,
            shopId: cell?.shopId || null,
            shot: cell?.shot || null,
          })),
        })),
        shots: room.shotLog || [],
      });
    } catch (err) {
      console.error("Lỗi lưu lịch sử trận:", err.message);
    }
  }
  try {
    await updateFinishedGameStats(room, winnerTeam);
  } catch (err) {
    console.error("Lỗi cập nhật kết quả:", err.message);
  }
};

const applyShot = async (room, shooterId, targetId, targetIndex) => {
  const shooter = room.players[shooterId];
  const target = room.players[targetId];
  const targetBoard = target.board;
  const targetCell = targetBoard[targetIndex];
  const isHit = Boolean(targetCell?.shopId);
  let sunkShopId = null;

  if (isHit) {
    targetCell.shot = "HIT";
    const sameShop = targetBoard.filter(
      (cell) => cell?.shopId === targetCell.shopId,
    );
    if (sameShop.every((cell) => cell.shot === "HIT")) {
      sunkShopId = targetCell.shopId;
    }
  } else {
    targetBoard[targetIndex] = { shot: "MISS" };
  }

  target.eliminated = isBoardDestroyed(targetBoard);
  const winnerTeam = getWinningTeam(room);
  const keepTurn = room.mode === "1v1" && isHit;
  const nextTurnId = winnerTeam
    ? null
    : getNextTurnId(room, shooterId, keepTurn);
  room.turn = nextTurnId;
  room.shotLog ||= [];
  room.shotLog.push({
    sequence: room.shotLog.length + 1,
    shooterId: shooter.userId || null,
    shooterName: shooter.name,
    targetId: target.userId || null,
    targetName: target.name,
    targetIndex,
    result: sunkShopId ? "SUNK" : isHit ? "HIT" : "MISS",
    shopId: sunkShopId,
    createdAt: new Date(),
  });

  io.to(room.roomId).emit("shot_result", {
    shooterId,
    targetSocketId: targetId,
    targetIndex,
    isHit,
    sunkShopId,
    nextTurnId,
    players: publicRoomPlayers(room),
  });

  if (winnerTeam) {
    await broadcastGameOver(room, winnerTeam);
  } else if (room.isBotRoom && nextTurnId === room.botSocketId) {
    setTimeout(() => triggerBotShot(room.roomId), isHit ? 2500 : 1000);
  }
};

const triggerBotShot = (roomId) => {
  const room = activeRooms[roomId];
  if (!room || room.gameState !== "PLAYING" || room.turn !== room.botSocketId)
    return;

  const targetPlayers = Object.values(room.players).filter(
    (player) =>
      player.team !== room.players[room.botSocketId].team && !player.eliminated,
  );
  const targets = targetPlayers.flatMap((player) =>
    player.board
      .map((cell, index) =>
        cell?.shot ? null : { socketId: player.socketId, index },
      )
      .filter(Boolean),
  );
  if (!targets.length) return;

  const target = targets[Math.floor(Math.random() * targets.length)];
  io.to(roomId).emit("opponent_aiming", {
    shooterId: room.botSocketId,
    targetSocketId: target.socketId,
    targetIndex: target.index,
  });

  setTimeout(() => {
    const currentRoom = activeRooms[roomId];
    if (
      !currentRoom ||
      currentRoom.gameState !== "PLAYING" ||
      currentRoom.turn !== currentRoom.botSocketId
    ) {
      return;
    }
    applyShot(
      currentRoom,
      currentRoom.botSocketId,
      target.socketId,
      target.index,
    );
  }, 1000);
};

const resetRoomForRematch = (room) => {
  room.shops = selectRandomShops(room.mode);
  room.gameState = "SETUP";
  room.shotLog = [];
  room.turn = null;
  room.turnOrder = [];
  room.turnIndex = 0;

  Object.values(room.players).forEach((p) => {
    p.rematch = false;
    p.eliminated = false;
    if (room.isBotRoom && p.socketId === room.botSocketId) {
      p.board = generateBotBoard(room.shops, room.gridSize);
      p.ready = true;
    } else {
      p.board = [];
      p.ready = false;
    }
  });
};

const removeFromMatchmaking = (socketId) => {
  for (const mode of ["1v1", "2v2"]) {
    matchmakingQueues[mode] = matchmakingQueues[mode].filter(
      (entry) => entry.socketId !== socketId,
    );
  }
  const timer = searchTimers.get(socketId);
  if (timer) clearTimeout(timer);
  searchTimers.delete(socketId);
};

const createMatchFromQueue = (mode, entries) => {
  const roomId = `match_${crypto.randomBytes(8).toString("hex")}`;
  const players = Object.fromEntries(
    entries.map((entry, index) => [
      entry.socketId,
      {
        socketId: entry.socketId,
        name: entry.name,
        userId: entry.userId,
        team: index % 2 === 0 ? "red" : "blue",
        board: [],
        ready: false,
        eliminated: false,
        isBot: false,
      },
    ]),
  );
  const room = createGameRoom(roomId, mode, players);

  entries.forEach((entry) => {
    entry.socket.join(roomId);
    const timer = searchTimers.get(entry.socketId);
    if (timer) clearTimeout(timer);
    searchTimers.delete(entry.socketId);
  });
  notifyMatchFound(
    room,
    mode === "2v2"
      ? "Đã tìm đủ 4 phượt thủ! Hai đội sẵn sàng xếp quán."
      : "Đã tìm thấy đối thủ! Sẵn sàng xếp quán.",
  );
};

const startBotMatch = (entry) => {
  const roomId = `bot_${crypto.randomBytes(8).toString("hex")}`;
  const botSocketId = `bot_${crypto.randomBytes(8).toString("hex")}`;
  const players = {
    [entry.socketId]: {
      socketId: entry.socketId,
      name: entry.name,
      userId: entry.userId,
      team: "red",
      board: [],
      ready: false,
      eliminated: false,
      isBot: false,
    },
    [botSocketId]: {
      socketId: botSocketId,
      name: "Bot Sếp Gọi 🤖",
      userId: null,
      team: "blue",
      board: [],
      ready: true,
      eliminated: false,
      isBot: true,
    },
  };
  const room = createGameRoom(roomId, "1v1", players, {
    isBotRoom: true,
    botSocketId,
  });
  players[botSocketId].board = generateBotBoard(room.shops, room.gridSize);
  entry.socket.join(roomId);
  notifyMatchFound(room, "Đã ghép trận cùng Cao Thủ AI!");
};

const tryMatchmaking = (mode) => {
  const needed = getModeSettings(mode).playerCount;
  const queue = matchmakingQueues[mode];
  while (queue.length >= needed) {
    const entries = queue.splice(0, needed);
    createMatchFromQueue(mode, entries);
  }
};

const handleRoomDeparture = async (room, socketId) => {
  const player = room.players[socketId];
  if (!player) return;

  if (room.gameState === "WAITING_FRIEND") {
    if (room.hostSocketId === socketId) {
      io.to(room.roomId).emit("opponent_left", "Chủ phòng đã hủy phòng.");
      delete activeRooms[room.roomId];
    } else {
      delete room.players[socketId];
      io.to(room.roomId).emit("room_lobby_update", roomOverview(room));
    }
    return;
  }

  if (room.gameState === "SETUP") {
    io.to(room.roomId).emit(
      "opponent_left",
      "Một người đã rời phòng trước khi trận bắt đầu. Hãy tạo trận mới.",
    );
    delete activeRooms[room.roomId];
    return;
  }

  if (room.gameState === "FINISHED") {
    io.to(room.roomId).emit("opponent_left", "Người chơi đã rời phòng.");
    delete activeRooms[room.roomId];
    return;
  }

  player.eliminated = true;
  player.connected = false;
  const winnerTeam = getWinningTeam(room);
  if (!winnerTeam && room.turn === socketId) {
    room.turn = getNextTurnId(room, socketId, false);
  }
  io.to(room.roomId).emit("room_player_left", {
    playerId: socketId,
    players: publicRoomPlayers(room),
    nextTurnId: room.turn,
  });
  if (winnerTeam) {
    await broadcastGameOver(room, winnerTeam);
  } else if (room.isBotRoom && room.turn === room.botSocketId) {
    setTimeout(() => triggerBotShot(room.roomId), 1000);
  }
};

const startSocialChallengeRoom = async (challenge) => {
  if (!matchmakingEnabled) return null;
  const sender = challenge.senderId;
  const recipient = challenge.recipientId;
  const sockets = [...io.sockets.sockets.values()];
  const senderSocket = sockets.find(
    (socket) => socket.data.userId === String(sender._id),
  );
  const recipientSocket = sockets.find(
    (socket) => socket.data.userId === String(recipient._id),
  );
  if (!senderSocket || !recipientSocket) return null;

  const userIds = [String(sender._id), String(recipient._id)];
  if (
    Object.values(activeRooms).some(
      (room) =>
        ["SETUP", "PLAYING"].includes(room.gameState) &&
        Object.values(room.players).some((player) =>
          userIds.includes(String(player.userId)),
        ),
    )
  ) {
    return null;
  }

  let roomCode;
  let roomId;
  do {
    roomCode = Array.from(
      { length: 5 },
      () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[crypto.randomInt(36)],
    ).join("");
    roomId = `private_${roomCode}`;
  } while (activeRooms[roomId]);

  const players = {
    [senderSocket.id]: {
      socketId: senderSocket.id,
      name: sender.displayName,
      userId: String(sender._id),
      team: "red",
      board: [],
      ready: false,
      eliminated: false,
      isBot: false,
    },
    [recipientSocket.id]: {
      socketId: recipientSocket.id,
      name: recipient.displayName,
      userId: String(recipient._id),
      team: "blue",
      board: [],
      ready: false,
      eliminated: false,
      isBot: false,
    },
  };
  const room = createGameRoom(roomId, challenge.mode || "1v1", players, {
    roomCode,
    hostSocketId: senderSocket.id,
    isPrivate: true,
  });
  senderSocket.join(roomId);
  recipientSocket.join(roomId);
  notifyMatchFound(room, "Bạn bè đã nhận lời hẹn đấu. Hãy xếp quán!");
  return { roomId, roomCode };
};

app.use(
  "/api/social",
  createSocialRouter({
    User,
    GameMatch,
    Friendship,
    DirectMessage,
    ProfileReaction,
    GameChallenge,
    activeRooms,
    io,
    requireAuthenticatedUser,
    startChallengeRoom: startSocialChallengeRoom,
  }),
);

// --- CHÍNH TẮC SOCKET CONNECTION SCOPE ---
io.on("connection", (socket) => {
  if (socket.data.userId) socket.join(`user:${socket.data.userId}`);
  console.log(`🔌 Người chơi kết nối: ${socket.id}`);

  // Tìm đối thủ ghép ngẫu nhiên
  socket.on("tim_doi_thu", (data = {}) => {
    if (!isSocketPayload(data)) return;
    if (!matchmakingEnabled) {
      socket.emit("opponent_left", "Ghép trận đang tạm dừng để bảo trì.");
      return;
    }
    const mode = data.mode === "2v2" ? "2v2" : "1v1";
    const playerName = getPlayerName(data.name);
    const userId = socket.data.userId;
    removeFromMatchmaking(socket.id);

    if (
      userId &&
      matchmakingQueues[mode].some((entry) => entry.userId === userId)
    ) {
      socket.emit("waiting_for_opponent", "Tài khoản này đã ở trong hàng chờ.");
      return;
    }

    const entry = { socket, socketId: socket.id, name: playerName, userId };
    matchmakingQueues[mode].push(entry);
    socket.emit(
      "waiting_for_opponent",
      mode === "2v2"
        ? "Đang tìm đủ 4 phượt thủ cho trận 2v2..."
        : "Đang tìm phượt thủ cho trận 1v1...",
    );
    tryMatchmaking(mode);

    if (mode === "1v1" && matchmakingQueues[mode].includes(entry)) {
      const timer = setTimeout(() => {
        if (!matchmakingQueues[mode].includes(entry)) return;
        tryMatchmaking(mode);
        if (matchmakingQueues[mode].includes(entry)) {
          removeFromMatchmaking(socket.id);
          startBotMatch(entry);
        }
      }, 8000);
      searchTimers.set(socket.id, timer);
    }
  });

  socket.on("cancel_search", () => {
    removeFromMatchmaking(socket.id);

    for (const [rid, r] of Object.entries(activeRooms)) {
      if (
        r.isPrivate &&
        r.gameState === "WAITING_FRIEND" &&
        r.players[socket.id]
      ) {
        socket.leave(rid);
        handleRoomDeparture(r, socket.id);
      }
    }
  });

  // --- CHẾ ĐỘ PHÒNG KÍN (MÃ HẺM) ---
  socket.on("create_private_room", (data = {}) => {
    if (!isSocketPayload(data)) return;
    if (!matchmakingEnabled) {
      socket.emit("join_private_error", "Tạo phòng đang tạm dừng để bảo trì.");
      return;
    }
    const playerName = getPlayerName(data.name);
    const userId = socket.data.userId;
    const mode = data.mode === "2v2" ? "2v2" : "1v1";
    const roomCode = Array.from(
      { length: 5 },
      () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[crypto.randomInt(36)],
    ).join("");
    const roomId = `private_${roomCode}`;
    const players = {
      [socket.id]: {
        socketId: socket.id,
        name: playerName,
        userId,
        team: "red",
        board: [],
        ready: false,
        eliminated: false,
        isBot: false,
      },
    };
    const room = createGameRoom(roomId, mode, players, {
      roomCode,
      hostSocketId: socket.id,
      isPrivate: true,
      waiting: true,
    });

    socket.join(roomId);
    socket.emit("private_room_created", {
      ...roomOverview(room),
      message: `Đã tạo Hẻm Kín [${roomCode}]! Hãy gửi mã cho bạn bè.`,
    });
    emitRoomUpdate(room);
  });

  socket.on("set_private_mode", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const room = activeRooms[data.roomId];
    if (
      !room?.isPrivate ||
      room.hostSocketId !== socket.id ||
      room.gameState !== "WAITING_FRIEND"
    ) {
      return;
    }

    const settings = getModeSettings(data.mode);
    if (Object.keys(room.players).length > settings.playerCount) {
      socket.emit(
        "join_private_error",
        "Phòng đang có quá nhiều người cho mode này.",
      );
      return;
    }
    room.mode = settings.mode;
    room.gridSize = settings.gridSize;
    room.playerCount = settings.playerCount;
    room.shops = selectRandomShops(settings.mode);
    if (Object.keys(room.players).length === room.playerCount) {
      notifyMatchFound(room, "Chủ phòng đã đổi mode. Trận đấu bắt đầu!");
    } else {
      emitRoomUpdate(room);
    }
  });

  socket.on("join_private_room", (data = {}) => {
    if (!isSocketPayload(data)) return;

    const now = Date.now();
    const recentJoinAttempts = (
      socket.data.privateRoomJoinAttempts || []
    ).filter((timestamp) => now - timestamp < 60_000);
    if (recentJoinAttempts.length >= 10) {
      socket.emit(
        "join_private_error",
        "Bạn thử quá nhiều mã. Vui lòng chờ một phút.",
      );
      return;
    }
    recentJoinAttempts.push(now);
    socket.data.privateRoomJoinAttempts = recentJoinAttempts;

    const playerName = getPlayerName(data.name);
    const userId = socket.data.userId;

    if (typeof data.roomCode !== "string") {
      socket.emit("join_private_error", "Mã Hẻm không hợp lệ!");
      return;
    }
    const roomCode = data.roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(roomCode)) {
      socket.emit("join_private_error", "Mã Hẻm không hợp lệ!");
      return;
    }
    const roomId = `private_${roomCode}`;

    const room = activeRooms[roomId];

    if (!room) {
      socket.emit(
        "join_private_error",
        "Mã Hẻm không tồn tại hoặc đã giải tán!",
      );
      return;
    }

    if (
      room.gameState !== "WAITING_FRIEND" ||
      Object.keys(room.players).length >= room.playerCount
    ) {
      socket.emit(
        "join_private_error",
        "Hẻm này đã đủ người hoặc trận đã bắt đầu!",
      );
      return;
    }

    if (room.players[socket.id]) {
      socket.emit("join_private_error", "Bạn đã ở trong phòng này.");
      return;
    }

    if (
      userId &&
      Object.values(room.players).some((player) => player.userId === userId)
    ) {
      socket.emit(
        "join_private_error",
        "Bạn không thể tự vào phòng kín của chính mình!",
      );
      return;
    }

    const redCount = Object.values(room.players).filter(
      (player) => player.team === "red",
    ).length;
    const blueCount = Object.values(room.players).filter(
      (player) => player.team === "blue",
    ).length;

    room.players[socket.id] = {
      socketId: socket.id,
      name: playerName,
      userId,
      team: redCount <= blueCount ? "red" : "blue",
      board: [],
      ready: false,
      eliminated: false,
      isBot: false,
    };
    socket.join(roomId);
    emitRoomUpdate(room);
    if (Object.keys(room.players).length === room.playerCount) {
      notifyMatchFound(room, "Đã đủ người! Các đội sẵn sàng xếp quán.");
    }
  });

  socket.on("swap_teams", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const room = activeRooms[data.roomId];
    const player = room?.players[socket.id];
    const target = room?.players[data.targetSocketId];
    if (
      !room ||
      !player ||
      player.isBot ||
      !["WAITING_FRIEND", "SETUP"].includes(room.gameState) ||
      Object.values(room.players).some((entry) => entry.ready)
    ) {
      return;
    }

    if (target) {
      if (player === target || player.team === target.team || target.isBot) {
        return;
      }
      [player.team, target.team] = [target.team, player.team];
    } else {
      const targetTeam = data.targetTeam;
      const teamCapacity = room.playerCount / 2;
      const targetTeamCount = Object.values(room.players).filter(
        (entry) => entry.team === targetTeam,
      ).length;
      if (
        !["red", "blue"].includes(targetTeam) ||
        targetTeam === player.team ||
        targetTeamCount >= teamCapacity
      ) {
        return;
      }
      player.team = targetTeam;
    }

    io.to(room.roomId).emit("teams_updated", {
      players: publicRoomPlayers(room),
      gameState: room.gameState,
    });
    emitRoomUpdate(room);
  });

  // Chốt vị trí quán (Sẵn sàng)
  socket.on("ready_place_shops", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId } = data;
    const room = activeRooms[roomId];

    if (!room || !room.players[socket.id]) {
      socket.emit(
        "opponent_left",
        "Lỗi đồng bộ phòng! Vui lòng bấm Tìm Trận để vào lại hẻm mới.",
      );
      return;
    }

    // Chỉ được chốt sơ đồ ở giai đoạn xếp quán — không đổi bàn cờ giữa trận
    if (room.gameState !== "SETUP") return;

    const player = room.players[socket.id];
    if (player.ready) return;
    const cleanBoard = sanitizeBoard(
      data.playerBoard,
      room.shops,
      room.gridSize,
    );
    if (!cleanBoard) {
      socket.emit(
        "board_rejected",
        "Sơ đồ quán không hợp lệ! Hãy xếp đủ các quán rồi chốt lại.",
      );
      return;
    }

    player.board = cleanBoard;
    player.ready = true;
    const gameStarted = startRoomIfReady(room);
    emitRoomUpdate(room);

    if (gameStarted && room.isBotRoom && room.turn === room.botSocketId) {
      setTimeout(() => triggerBotShot(roomId), 4000);
    }
  });

  // Bắn đạn
  socket.on("fire_shot", async (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId, targetIndex } = data;
    const room = activeRooms[roomId];
    if (!room || room.gameState !== "PLAYING" || room.turn !== socket.id)
      return;
    if (
      !Number.isInteger(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= room.gridSize * room.gridSize
    )
      return;

    const shooter = room.players[socket.id];
    const enemies = Object.values(room.players).filter(
      (player) => player.team !== shooter.team && !player.eliminated,
    );
    const targetId = data.targetSocketId || enemies[0]?.socketId;
    const target = room.players[targetId];
    if (!target || target.team === shooter.team || target.eliminated) return;
    if (target.board[targetIndex]?.shot) return;

    await applyShot(room, socket.id, targetId, targetIndex);
  });

  // Truyền tín hiệu ghim vị trí ngắm bắn cho đối thủ
  socket.on("aim_shot", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId, targetIndex } = data;
    const room = activeRooms[roomId];
    if (!room || room.gameState !== "PLAYING" || room.turn !== socket.id)
      return;
    const target = room.players[data.targetSocketId];
    if (
      !target ||
      target.team === room.players[socket.id].team ||
      target.eliminated ||
      !Number.isInteger(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= room.gridSize * room.gridSize
    )
      return;

    io.to(roomId).emit("opponent_aiming", {
      shooterId: socket.id,
      targetSocketId: target.socketId,
      targetIndex,
    });
  });

  // Tái đấu
  socket.on("request_rematch", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId } = data;
    const room = activeRooms[roomId];
    if (!room || !room.players[socket.id] || room.gameState !== "FINISHED")
      return;

    room.players[socket.id].rematch = true;

    const humans = Object.values(room.players).filter(
      (p) => !(room.isBotRoom && p.socketId === room.botSocketId),
    );

    // Phòng đấu Bot: Bot luôn đồng ý. Phòng người: cần cả hai bấm.
    if (humans.every((p) => p.rematch)) {
      resetRoomForRematch(room);
      io.to(roomId).emit("rematch_accepted", {
        message: "Cả đội đã chọn chơi lại! Hãy đặt lại quán ăn!",
        shops: room.shops,
        mode: room.mode,
        gridSize: room.gridSize,
        players: publicRoomPlayers(room),
      });
      emitRoomUpdate(room);
    } else {
      socket
        .to(roomId)
        .emit(
          "opponent_requested_rematch",
          "Đối thủ muốn tái đấu! Nhấn Chơi Lại để tham gia.",
        );
    }
  });

  // Rời phòng chủ động (về sảnh) — báo đối thủ và giải tán phòng
  socket.on("leave_room", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId } = data;
    const room = activeRooms[roomId];
    if (!room || !room.players[socket.id]) return;

    socket.leave(roomId);
    handleRoomDeparture(room, socket.id);
  });

  // Chat
  socket.on("send_chat", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId, text } = data;
    const room = activeRooms[roomId];
    if (room && room.players[socket.id] && typeof text === "string") {
      io.to(roomId).emit("receive_chat", {
        sender: room.players[socket.id].name,
        text: text.slice(0, 200),
      });
    }
  });

  // Xử lý Ngắt kết nối
  socket.on("disconnect", async () => {
    removeFromMatchmaking(socket.id);

    for (const [roomId, room] of Object.entries(activeRooms)) {
      if (room.players[socket.id]) {
        await handleRoomDeparture(room, socket.id);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
