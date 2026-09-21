import { useState, useEffect, useRef } from "react";
import {
  X,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Lock,
  User,
  AlertCircle,
  CloudSun,
} from "lucide-react";
import { usePrefs } from "@/lib/prefs";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "phone" | "email";
}

export function AuthModal({ isOpen, onClose, defaultMode = "phone" }: AuthModalProps) {
  const { prefs, login } = usePrefs();
  const [tab, setTab] = useState<"phone" | "email">(defaultMode);
  
  // Phone form states
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"input" | "otp">("input");

  // Email form states
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState<"input" | "otp">("input");

  // Shared user info
  const [userName, setUserName] = useState(prefs.name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Sync default mode on open
  useEffect(() => {
    if (isOpen) {
      setTab(defaultMode);
      setError(null);
      setSuccess(null);
      setIsLoading(false);
      setPhoneStep("input");
      setEmailStep("input");
      setPhoneOtp("");
      setEmailOtp("");
      setTimeout(() => {
        if (defaultMode === "phone") {
          phoneInputRef.current?.focus();
        } else {
          emailInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, defaultMode]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if ((phoneStep === "otp" || emailStep === "otp") && countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [countdown, phoneStep, emailStep]);

  if (!isOpen) return null;

  // Handle Send OTP for Phone
  const handleSendPhoneOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setPhoneStep("otp");
      setCountdown(30);
      setTimeout(() => otpInputRef.current?.focus(), 80);
    }, 600);
  };

  // Handle Verify Phone OTP
  const handleVerifyPhoneOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (phoneOtp.trim().length < 4) {
      setError("Please enter the 6-digit OTP sent to your phone");
      return;
    }
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const fullPhone = `${countryCode} ${phone.trim()}`;
      login({
        type: "phone",
        identifier: fullPhone,
        name: userName.trim() || prefs.name || "Mausam Citizen",
      });
      setSuccess(`Signed in as ${fullPhone}`);
      setTimeout(() => {
        onClose();
      }, 1200);
    }, 700);
  };

  // Handle Send OTP for Email
  const handleSendEmailOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setEmailStep("otp");
      setCountdown(30);
      setTimeout(() => otpInputRef.current?.focus(), 80);
    }, 600);
  };

  // Handle Verify Email OTP
  const handleVerifyEmailOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (emailOtp.trim().length < 4) {
      setError("Please enter the 6-digit verification code");
      return;
    }
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const fullEmail = email.trim().toLowerCase();
      login({
        type: "email",
        identifier: fullEmail,
        name: userName.trim() || prefs.name || fullEmail.split("@")[0],
      });
      setSuccess(`Signed in as ${fullEmail}`);
      setTimeout(() => {
        onClose();
      }, 1200);
    }, 700);
  };

  // Quick Demo Auto-fill handlers
  const autoFillPhoneDemo = () => {
    setCountryCode("+91");
    setPhone("9876543210");
    setUserName("Vandana Sharma");
    setError(null);
  };

  const autoFillEmailDemo = () => {
    setEmail("vandana.sharma@imd.gov.in");
    setUserName("Vandana Sharma");
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Mausam Insight"
    >
      <div className="card-surface relative w-full max-w-md overflow-hidden rounded-3xl border border-border shadow-float animate-scale-in bg-card">
        {/* Top Header Background Banner */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-sky-500/5 to-transparent border-b border-border/60">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl hero-gradient text-on-hero shadow-glow">
                <CloudSun className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-foreground">
                  Citizen Sign In
                </h2>
                <p className="text-[11.5px] text-muted-foreground font-medium">
                  IMD MAUSAM Weather & Alert Portal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="press flex h-8 w-8 items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-[12px] text-muted-foreground leading-relaxed">
            Sign in with your <strong>phone number</strong> or <strong>email</strong> to receive instant severe weather bulletins, agro advisories, and sync radar settings.
          </p>

          {/* Tab Selector: Phone or Email */}
          <div className="mt-4 flex rounded-2xl bg-secondary/80 p-1 border border-border/60">
            <button
              onClick={() => {
                setTab("phone");
                setError(null);
              }}
              className={`press flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                tab === "phone"
                  ? "bg-card text-primary shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Mobile Number</span>
            </button>
            <button
              onClick={() => {
                setTab("email");
                setError(null);
              }}
              className={`press flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                tab === "email"
                  ? "bg-card text-primary shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email Address</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Form Area */}
        <div className="p-6">
          {/* Success Banner */}
          {success && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-emerald-700 dark:text-emerald-300 text-[13px] font-bold animate-fade-in">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-destructive text-[12px] font-semibold animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ------------------------------------------- */}
          {/* TAB 1: PHONE NUMBER LOGIN                   */}
          {/* ------------------------------------------- */}
          {tab === "phone" && (
            <div>
              {phoneStep === "input" ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  {/* Name field (optional) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Your Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g. Vandana Sharma"
                        className="w-full rounded-2xl bg-secondary/80 pl-10 pr-4 py-2.5 text-[13.5px] font-medium outline-none ring-primary/30 focus:ring-2 border border-border/70 text-foreground"
                      />
                    </div>
                  </div>

                  {/* Phone input */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="rounded-2xl bg-secondary/80 px-3 py-2.5 text-[13px] font-bold border border-border/70 text-foreground outline-none cursor-pointer"
                      >
                        <option value="+91">🇮🇳 +91 (IN)</option>
                        <option value="+1">🇺🇸 +1 (US)</option>
                        <option value="+44">🇬🇧 +44 (UK)</option>
                        <option value="+971">🇦🇪 +971 (UAE)</option>
                        <option value="+65">🇸🇬 +65 (SG)</option>
                      </select>

                      <div className="relative flex-1 flex items-center">
                        <Phone className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                        <input
                          ref={phoneInputRef}
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="10-digit number (98765 43210)"
                          className="w-full rounded-2xl bg-secondary/80 pl-10 pr-4 py-2.5 text-[13.5px] font-semibold outline-none ring-primary/30 focus:ring-2 border border-border/70 text-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick autofill helper */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[11px] text-muted-foreground">Quick Testing:</span>
                    <button
                      type="button"
                      onClick={autoFillPhoneDemo}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Use Demo Number</span>
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13.5px] font-extrabold text-primary-foreground shadow-glow hover:opacity-95 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Generating OTP…</span>
                      </>
                    ) : (
                      <>
                        <span>Get Verification OTP</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Phone OTP Verification step */
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4 animate-fade-in">
                  <div className="rounded-2xl bg-secondary/70 p-3.5 border border-border/60 text-center">
                    <p className="text-[11px] text-muted-foreground">Enter the 6-digit OTP code sent to:</p>
                    <p className="font-mono text-sm font-extrabold text-foreground mt-0.5">
                      {countryCode} {phone}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPhoneStep("input")}
                      className="text-[11px] text-primary font-bold hover:underline mt-1"
                    >
                      Change phone number
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">
                      6-Digit SMS OTP Code
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        ref={otpInputRef}
                        type="text"
                        maxLength={6}
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        placeholder="e.g. 123456"
                        className="w-full text-center tracking-[0.3em] font-mono text-lg font-bold rounded-2xl bg-secondary/80 pl-10 pr-4 py-2.5 outline-none ring-primary/30 focus:ring-2 border border-border/70 text-foreground"
                      />
                    </div>
                  </div>

                  {/* Auto fill demo OTP */}
                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      type="button"
                      onClick={() => setPhoneOtp("123456")}
                      className="text-[11.5px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-fill Demo OTP (123456)</span>
                    </button>

                    <span className="text-[11px] text-muted-foreground">
                      {countdown > 0 ? (
                        <span>Resend in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCountdown(30);
                            setPhoneOtp("");
                          }}
                          className="font-bold text-primary hover:underline"
                        >
                          Resend Code
                        </button>
                      )}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13.5px] font-extrabold text-primary-foreground shadow-glow hover:opacity-95 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verifying Credentials…</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Verify & Complete Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ------------------------------------------- */}
          {/* TAB 2: EMAIL ADDRESS LOGIN                  */}
          {/* ------------------------------------------- */}
          {tab === "email" && (
            <div>
              {emailStep === "input" ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-4">
                  {/* Name field (optional) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Your Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g. Vandana Sharma"
                        className="w-full rounded-2xl bg-secondary/80 pl-10 pr-4 py-2.5 text-[13.5px] font-medium outline-none ring-primary/30 focus:ring-2 border border-border/70 text-foreground"
                      />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Email Address
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        ref={emailInputRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. citizen@imd.gov.in"
                        className="w-full rounded-2xl bg-secondary/80 pl-10 pr-4 py-2.5 text-[13.5px] font-medium outline-none ring-primary/30 focus:ring-2 border border-border/70 text-foreground"
                      />
                    </div>
                  </div>

                  {/* Quick autofill helper */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[11px] text-muted-foreground">Quick Testing:</span>
                    <button
                      type="button"
                      onClick={autoFillEmailDemo}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Use Demo Email</span>
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13.5px] font-extrabold text-primary-foreground shadow-glow hover:opacity-95 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Sending Magic Link…</span>
                      </>
                    ) : (
                      <>
                        <span>Continue with Email</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Email OTP Verification step */
                <form onSubmit={handleVerifyEmailOtp} className="space-y-4 animate-fade-in">
                  <div className="rounded-2xl bg-secondary/70 p-3.5 border border-border/60 text-center">
                    <p className="text-[11px] text-muted-foreground">Enter the 6-digit passcode sent to:</p>
                    <p className="font-mono text-sm font-extrabold text-foreground mt-0.5">{email}</p>
                    <button
                      type="button"
                      onClick={() => setEmailStep("input")}
                      className="text-[11px] text-primary font-bold hover:underline mt-1"
                    >
                      Change email address
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">
                      6-Digit Email Verification Code
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        placeholder="e.g. 123456"
                        className="w-full text-center tracking-[0.3em] font-mono text-lg font-bold rounded-2xl bg-secondary/80 pl-10 pr-4 py-2.5 outline-none ring-primary/30 focus:ring-2 border border-border/70 text-foreground"
                      />
                    </div>
                  </div>

                  {/* Auto fill demo OTP */}
                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEmailOtp("123456")}
                      className="text-[11.5px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-fill Demo Code (123456)</span>
                    </button>

                    <span className="text-[11px] text-muted-foreground">
                      {countdown > 0 ? (
                        <span>Resend in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCountdown(30);
                            setEmailOtp("");
                          }}
                          className="font-bold text-primary hover:underline"
                        >
                          Resend Code
                        </button>
                      )}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13.5px] font-extrabold text-primary-foreground shadow-glow hover:opacity-95 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verifying Code…</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Privacy and IMD Disclaimer */}
          <div className="mt-5 pt-4 border-t border-border/60 text-center">
            <p className="text-[11px] text-muted-foreground">
              🔒 Encrypted session. Your credentials are used exclusively for meteorological alert dispatchers and Doppler radar personalization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
