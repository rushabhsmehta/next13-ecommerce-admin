"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Package,
  Phone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTravelWhatsAppUrl } from "@/lib/travel-site-config";
import { useTravelPath } from "./travel-path-provider";

type DestinationOption = {
  id: string;
  label: string;
};

interface InquiryCtaProps {
  destinations: DestinationOption[];
}

export function InquiryCta({ destinations }: InquiryCtaProps) {
  const { href } = useTravelPath();
  const whatsappUrl = getTravelWhatsAppUrl(
    "Hi, I'd like help planning a trip with Aagam Holidays."
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationId, setLocationId] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedPhone = phone.replace(/\D/g, "");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!locationId) {
      setError("Please select a destination.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/travel/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          name: name.trim(),
          phone: normalizedPhone,
          journeyDate: journeyDate || undefined,
          numAdults: 2,
          source: "homepage_callback",
          remarks: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Submission failed");
      }

      setSuccess(true);
      setName("");
      setPhone("");
      setLocationId("");
      setJourneyDate("");
      setMessage("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="callback" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 p-8 sm:p-10 lg:p-12">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="absolute top-6 right-8 opacity-30 hidden sm:block">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                <Sparkles className="w-3 h-3" /> Free consultation
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
                Request a callback — we&apos;ll plan it for you
              </h2>
              <p className="text-white/80 mt-3 text-sm sm:text-base leading-relaxed">
                Share your name, number, and where you&apos;d like to go. Our travel
                experts will call you back with customised options — no obligation.
              </p>

              <div className="flex items-center gap-4 mt-5 flex-wrap">
                {["Free Customisation", "24/7 Support", "Best Price"].map((badge) => (
                  <span
                    key={badge}
                    className="flex items-center gap-1.5 text-white/90 text-xs font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                    {badge}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 bg-green-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-600 transition-colors text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat on WhatsApp
                  </a>
                )}
                <Link
                  href={href("/packages")}
                  className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/20 transition-colors border border-white/30 text-sm"
                >
                  <Package className="w-4 h-4" />
                  Browse Packages
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/10">
              {success ? (
                <div className="text-center py-8 space-y-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Request received!</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Thank you. Our team will call you within one business day to discuss
                    your trip.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSuccess(false)}
                    className="mt-2"
                  >
                    Submit another request
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Get a free callback</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Fill in your details and we&apos;ll reach out shortly.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="callback-name">Your name</Label>
                    <Input
                      id="callback-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="callback-phone">Mobile number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="callback-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile"
                        className="pl-10"
                        required
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="callback-destination">Where do you want to go?</Label>
                    <Select value={locationId} onValueChange={setLocationId} required>
                      <SelectTrigger id="callback-destination">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="callback-date">Preferred travel date (optional)</Label>
                    <Input
                      id="callback-date"
                      type="date"
                      value={journeyDate}
                      onChange={(e) => setJourneyDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="callback-message">Anything else? (optional)</Label>
                    <Textarea
                      id="callback-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Group size, budget, special requests…"
                      rows={3}
                    />
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-11"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Request callback"
                    )}
                  </Button>

                  <p className="text-xs text-gray-400 text-center">
                    By submitting, you agree we may contact you about your enquiry.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
