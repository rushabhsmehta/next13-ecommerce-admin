"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  INQUIRY_LIFECYCLE_OPTIONS,
  type InquiryLifecycle,
  resolveInquiryLifecycleParam,
} from "@/lib/inquiry-statuses";

export const LifecycleFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = resolveInquiryLifecycleParam({
    lifecycle: searchParams?.get("lifecycle"),
    noTourPackageQuery: searchParams?.get("noTourPackageQuery") === "1",
    defaultLifecycle: "pending",
  });

  const onLifecycleChange = (lifecycle: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("noTourPackageQuery");
    if (lifecycle === "pending") {
      // Default bucket — keep URL tidy but still explicit for shareable links
      params.set("lifecycle", "pending");
    } else {
      params.set("lifecycle", lifecycle);
    }
    params.set("page", "1");
    router.push(`/inquiries?${params.toString()}`);
  };

  return (
    <Tabs value={current} onValueChange={onLifecycleChange}>
      <TabsList>
        {INQUIRY_LIFECYCLE_OPTIONS.map((option) => (
          <TabsTrigger key={option.value} value={option.value as InquiryLifecycle}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
