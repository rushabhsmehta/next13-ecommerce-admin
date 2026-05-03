"use client";

import { useState, useEffect, useRef } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Mail, KeyRound, User } from "lucide-react";

type Step = "email" | "otp" | "profile";
type FlowType = "signIn" | "signUp";

interface EmailOtpFormProps {
  returnTo: string;
}

export function EmailOtpForm({ returnTo }: EmailOtpFormProps) {
  const router = useRouter();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [step, setStep] = useState<Step>("email");
  const [flowType, setFlowType] = useState<FlowType>("signIn");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isReady = signInLoaded && signUpLoaded;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startResendTimer() {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isReady || !email.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Try sign-in first
      await signIn!.create({ strategy: "email_code", identifier: email.trim() });
      setFlowType("signIn");
      setStep("otp");
      startResendTimer();
    } catch (signInError: unknown) {
      // User not found — try sign-up
      try {
        await signUp!.create({ emailAddress: email.trim() });
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setFlowType("signUp");
        setStep("otp");
        startResendTimer();
      } catch (signUpError: unknown) {
        const msg = extractClerkError(signUpError) ?? extractClerkError(signInError) ?? "Something went wrong. Please try again.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isReady || code.length < 6) return;
    setLoading(true);
    setError(null);

    try {
      if (flowType === "signIn") {
        const result = await signIn!.attemptFirstFactor({ strategy: "email_code", code });
        if (result.status === "complete") {
          await setSignInActive!({ session: result.createdSessionId });
          // Check if TravelAppUser already exists
          const res = await fetch("/api/travel-auth/profile");
          const travelUser = await res.json();
          if (travelUser) {
            router.push(returnTo);
          } else {
            setStep("profile");
          }
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } else {
        const result = await signUp!.attemptEmailAddressVerification({ code });
        if (result.status === "complete") {
          await setSignUpActive!({ session: result.createdSessionId });
          setStep("profile");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      }
    } catch (err: unknown) {
      setError(extractClerkError(err) ?? "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!isReady || resendTimer > 0) return;
    setLoading(true);
    setError(null);
    try {
      if (flowType === "signIn") {
        await signIn!.create({ strategy: "email_code", identifier: email.trim() });
      } else {
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      }
      startResendTimer();
    } catch (err: unknown) {
      setError(extractClerkError(err) ?? "Failed to resend. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/travel-auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save profile");
      }
      router.push(returnTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
      setLoading(false);
    }
  }

  // Auto-submit OTP when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && step === "otp" && !loading) {
      handleOtpSubmit(new Event("submit") as unknown as React.FormEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <Card className="w-full max-w-sm shadow-lg border-orange-100">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 mx-auto mb-2">
          {step === "email" && <Mail className="w-6 h-6 text-orange-500" />}
          {step === "otp" && <KeyRound className="w-6 h-6 text-orange-500" />}
          {step === "profile" && <User className="w-6 h-6 text-orange-500" />}
        </div>
        <CardTitle className="text-center text-xl">
          {step === "email" && "Sign in to Aagam Holidays"}
          {step === "otp" && "Check your email"}
          {step === "profile" && "Complete your profile"}
        </CardTitle>
        <CardDescription className="text-center text-sm">
          {step === "email" && "Enter your email to receive a verification code"}
          {step === "otp" && (
            <>
              We sent a 6-digit code to{" "}
              <span className="font-medium text-gray-700">{email}</span>
            </>
          )}
          {step === "profile" && "Just a few details to get you started"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Step 1: Email */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              disabled={loading || !isReady || !email.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
            </Button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                disabled={loading}
                className="text-center text-xl tracking-[0.5em] font-mono"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); setError(null); }}
                className="text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
              >
                Change email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || loading}
                className="text-orange-500 hover:text-orange-600 disabled:text-gray-400 disabled:cursor-not-allowed underline-offset-2 hover:underline"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Profile */}
        {step === "profile" && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone number{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get started"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function extractClerkError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { errors?: Array<{ message?: string; longMessage?: string }> };
  if (Array.isArray(e.errors) && e.errors.length > 0) {
    return e.errors[0].longMessage ?? e.errors[0].message ?? null;
  }
  if ("message" in e && typeof (e as { message?: string }).message === "string") {
    return (e as { message: string }).message;
  }
  return null;
}
