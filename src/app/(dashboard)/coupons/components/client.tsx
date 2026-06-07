"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  BadgePercent,
  CheckCircle2,
  Copy,
  Gift,
  Megaphone,
  Pause,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscountAmount: number | null;
  minBookingAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  totalRedemptionLimit: number | null;
  perCustomerLimit: number | null;
  requiresApproval: boolean;
  approvalRequiredAboveAmount: number | null;
  eligibilityRules: any;
  codes: Array<{ id: string; code: string; status: string; redeemedCount: number; maxRedemptions: number | null }>;
  redemptions: Array<{
    id: string;
    code: string;
    status: string;
    customerName: string | null;
    customerMobile: string | null;
    discountAmount: number | null;
    taxableAmountAfterDiscount: number | null;
    validationMessage: string | null;
    createdAt: string;
    inquiry?: { id: string; customerName: string } | null;
    tourPackageQuery?: { id: string; tourPackageQueryName: string | null; tourPackageQueryNumber: string | null } | null;
    saleDetail?: { id: string; invoiceNumber: string | null } | null;
  }>;
};

type Option = { id: string; label?: string | null; tourPackageName?: string | null; tourCategory?: string | null };

type FormState = {
  name: string;
  code: string;
  codes: string;
  description: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: string;
  maxDiscountAmount: string;
  minBookingAmount: string;
  startsAt: string;
  endsAt: string;
  totalRedemptionLimit: string;
  perCustomerLimit: string;
  requiresApproval: boolean;
  approvalRequiredAboveAmount: string;
  publicVisible: boolean;
  locationIds: string;
  tourPackageIds: string;
  tourCategories: string;
  customerMobiles: string;
  minAdults: string;
  budgetCapAmount: string;
};

const initialForm: FormState = {
  name: "",
  code: "",
  codes: "",
  description: "",
  discountType: "PERCENT",
  discountValue: "",
  maxDiscountAmount: "",
  minBookingAmount: "",
  startsAt: "",
  endsAt: "",
  totalRedemptionLimit: "",
  perCustomerLimit: "1",
  requiresApproval: false,
  approvalRequiredAboveAmount: "",
  publicVisible: true,
  locationIds: "",
  tourPackageIds: "",
  tourCategories: "",
  customerMobiles: "",
  minAdults: "",
  budgetCapAmount: "",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  DRAFT: "bg-slate-100 text-slate-800",
  PAUSED: "bg-amber-100 text-amber-800",
  EXPIRED: "bg-red-100 text-red-800",
  ARCHIVED: "bg-gray-100 text-gray-700",
  REQUESTED: "bg-blue-100 text-blue-800",
  VALIDATED: "bg-green-100 text-green-800",
  APPROVAL_REQUIRED: "bg-purple-100 text-purple-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  APPLIED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  VOIDED: "bg-gray-100 text-gray-700",
};

function splitList(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function money(value: number | null | undefined) {
  return formatPrice(Number(value || 0));
}

function campaignDiscount(c: Campaign) {
  if (c.discountType === "PERCENT") {
    return `${c.discountValue}%${c.maxDiscountAmount ? ` up to ${money(c.maxDiscountAmount)}` : ""}`;
  }
  return money(c.discountValue);
}

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN") : "Open";
}

function aggregate(campaign: Campaign) {
  const applied = campaign.redemptions.filter((r) => r.status === "APPLIED");
  return {
    requested: campaign.redemptions.length,
    applied: applied.length,
    discountCost: applied.reduce((sum, r) => sum + (r.discountAmount || 0), 0),
    revenue: applied.reduce((sum, r) => sum + (r.taxableAmountAfterDiscount || 0), 0),
  };
}

export function CouponsClient({
  initialCampaigns,
  locations,
  tourPackages,
}: {
  initialCampaigns: Campaign[];
  locations: Option[];
  tourPackages: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialCampaigns;
    return initialCampaigns.filter((campaign) => {
      return (
        campaign.name.toLowerCase().includes(q) ||
        campaign.codes.some((code) => code.code.toLowerCase().includes(q))
      );
    });
  }, [initialCampaigns, query]);

  const totals = useMemo(() => {
    return initialCampaigns.reduce(
      (acc, campaign) => {
        const a = aggregate(campaign);
        acc.requested += a.requested;
        acc.applied += a.applied;
        acc.discountCost += a.discountCost;
        acc.revenue += a.revenue;
        return acc;
      },
      { requested: 0, applied: 0, discountCost: 0, revenue: 0 }
    );
  }, [initialCampaigns]);

  function patchForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createCampaign() {
    setLoading(true);
    try {
      await axios.post("/api/coupons", {
        ...form,
        discountValue: Number(form.discountValue),
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        minBookingAmount: form.minBookingAmount ? Number(form.minBookingAmount) : null,
        totalRedemptionLimit: form.totalRedemptionLimit
          ? Number(form.totalRedemptionLimit)
          : null,
        perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : null,
        approvalRequiredAboveAmount: form.approvalRequiredAboveAmount
          ? Number(form.approvalRequiredAboveAmount)
          : null,
        codes: splitList(form.codes),
        eligibilityRules: {
          publicVisible: form.publicVisible,
          locationIds: splitList(form.locationIds),
          tourPackageIds: splitList(form.tourPackageIds),
          tourCategories: splitList(form.tourCategories),
          customerMobiles: splitList(form.customerMobiles),
          minAdults: form.minAdults ? Number(form.minAdults) : undefined,
          budgetCapAmount: form.budgetCapAmount ? Number(form.budgetCapAmount) : undefined,
          whatsappShareEnabled: true,
        },
      });
      toast.success("Coupon campaign created");
      setForm(initialForm);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Could not create coupon");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(campaign: Campaign, status: string) {
    try {
      await axios.patch(`/api/coupons/${campaign.id}`, { status });
      toast.success(`Campaign ${status.toLowerCase()}`);
      router.refresh();
    } catch {
      toast.error("Could not update campaign");
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <Heading
          title="Coupons"
          description="Campaigns, customer redemptions, approvals, and growth offers"
        />
        <Button onClick={() => router.refresh()} variant="outline">
          Refresh
        </Button>
      </div>
      <Separator />

      <div className="grid gap-3 md:grid-cols-4">
        <Metric icon={Megaphone} label="Campaigns" value={initialCampaigns.length.toString()} />
        <Metric icon={Send} label="Requested" value={totals.requested.toString()} />
        <Metric icon={CheckCircle2} label="Applied" value={totals.applied.toString()} />
        <Metric icon={BadgePercent} label="Discount Cost" value={money(totals.discountCost)} />
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          <TabsTrigger value="growth">Growth Ideas</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search campaign or code"
            className="max-w-sm"
          />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Codes</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead className="text-right">Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((campaign) => {
                  const stats = aggregate(campaign);
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="font-medium">{campaign.name}</div>
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs ${STATUS_STYLES[campaign.status]}`}>
                          {campaign.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {campaign.codes.slice(0, 4).map((code) => (
                            <Button
                              key={code.id}
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1"
                              onClick={() => copyCode(code.code)}
                            >
                              <Copy className="h-3 w-3" />
                              {code.code}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{campaignDiscount(campaign)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dateLabel(campaign.startsAt)} to {dateLabel(campaign.endsAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{stats.applied}/{campaign.totalRedemptionLimit || "∞"} applied</div>
                        <div className="text-xs text-muted-foreground">{money(stats.discountCost)} cost</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(campaign, campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}
                          >
                            <Pause className="mr-1 h-3 w-3" />
                            {campaign.status === "ACTIVE" ? "Pause" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus(campaign, "ARCHIVED")}
                          >
                            Archive
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Campaign</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Campaign name">
                <Input value={form.name} onChange={(e) => patchForm("name", e.target.value)} />
              </Field>
              <Field label="Primary code">
                <Input value={form.code} onChange={(e) => patchForm("code", e.target.value.toUpperCase())} placeholder="DIWALI500" />
              </Field>
              <Field label="Discount type">
                <Select value={form.discountType} onValueChange={(v: "PERCENT" | "FIXED") => patchForm("discountType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Percent</SelectItem>
                    <SelectItem value="FIXED">Fixed INR</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Discount value">
                <Input type="number" value={form.discountValue} onChange={(e) => patchForm("discountValue", e.target.value)} />
              </Field>
              <Field label="Max discount">
                <Input type="number" value={form.maxDiscountAmount} onChange={(e) => patchForm("maxDiscountAmount", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Minimum booking amount">
                <Input type="number" value={form.minBookingAmount} onChange={(e) => patchForm("minBookingAmount", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Starts">
                <Input type="date" value={form.startsAt} onChange={(e) => patchForm("startsAt", e.target.value)} />
              </Field>
              <Field label="Ends">
                <Input type="date" value={form.endsAt} onChange={(e) => patchForm("endsAt", e.target.value)} />
              </Field>
              <Field label="Total redemption cap">
                <Input type="number" value={form.totalRedemptionLimit} onChange={(e) => patchForm("totalRedemptionLimit", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Per customer cap">
                <Input type="number" value={form.perCustomerLimit} onChange={(e) => patchForm("perCustomerLimit", e.target.value)} />
              </Field>
              <Field label="Location IDs">
                <Textarea value={form.locationIds} onChange={(e) => patchForm("locationIds", e.target.value)} placeholder={locations.slice(0, 3).map((l) => `${l.label}: ${l.id}`).join("\n")} />
              </Field>
              <Field label="Package IDs">
                <Textarea value={form.tourPackageIds} onChange={(e) => patchForm("tourPackageIds", e.target.value)} placeholder={tourPackages.slice(0, 3).map((p) => `${p.tourPackageName}: ${p.id}`).join("\n")} />
              </Field>
              <Field label="Tour categories">
                <Input value={form.tourCategories} onChange={(e) => patchForm("tourCategories", e.target.value)} placeholder="Domestic, International, Honeymoon" />
              </Field>
              <Field label="Customer mobiles">
                <Input value={form.customerMobiles} onChange={(e) => patchForm("customerMobiles", e.target.value)} placeholder="Optional comma separated" />
              </Field>
              <Field label="More codes">
                <Textarea value={form.codes} onChange={(e) => patchForm("codes", e.target.value.toUpperCase())} placeholder="One code per line or comma separated" />
              </Field>
              <Field label="Description">
                <Textarea value={form.description} onChange={(e) => patchForm("description", e.target.value)} />
              </Field>
              <div className="flex items-center gap-3">
                <Switch checked={form.publicVisible} onCheckedChange={(v) => patchForm("publicVisible", v)} />
                <Label>Visible in public/mobile offers</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.requiresApproval} onCheckedChange={(v) => patchForm("requiresApproval", v)} />
                <Label>Require admin approval</Label>
              </div>
              <Field label="Approval above discount">
                <Input type="number" value={form.approvalRequiredAboveAmount} onChange={(e) => patchForm("approvalRequiredAboveAmount", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Campaign discount budget">
                <Input type="number" value={form.budgetCapAmount} onChange={(e) => patchForm("budgetCapAmount", e.target.value)} placeholder="Optional" />
              </Field>
              <div className="md:col-span-2">
                <Button onClick={createCampaign} disabled={loading} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Coupon Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redemptions">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialCampaigns.flatMap((campaign) =>
                  campaign.redemptions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.code}</TableCell>
                      <TableCell>
                        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLES[r.status] || "bg-muted"}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>{r.customerName || r.inquiry?.customerName || r.customerMobile || "N/A"}</TableCell>
                      <TableCell>
                        {r.tourPackageQuery?.tourPackageQueryName ||
                          r.tourPackageQuery?.tourPackageQueryNumber ||
                          r.saleDetail?.invoiceNumber ||
                          "Inquiry"}
                      </TableCell>
                      <TableCell className="text-right">{money(r.discountAmount)}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {r.validationMessage || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="growth">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["WhatsApp campaign links", "Share package links with coupon prefilled for seasonal offers."],
              ["Abandoned enquiry recovery", "Send a short-lived coupon when a lead has no follow-up after 48 hours."],
              ["Referral codes", "Let past customers share codes and earn future booking credit."],
              ["Early-bird campaigns", "Unlock discounts when travel date is at least 30 days away."],
              ["Group-size unlocks", "Apply offers only when adult count crosses a group threshold."],
              ["AI suggestions", "Recommend coupon amount based on value, margin, season, and lead status."],
            ].map(([title, text]) => (
              <Card key={title}>
                <CardContent className="flex gap-3 p-4">
                  <div className="mt-1 rounded-md bg-muted p-2">
                    {title.includes("Referral") ? <Gift className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-medium">{title}</div>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-muted p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
