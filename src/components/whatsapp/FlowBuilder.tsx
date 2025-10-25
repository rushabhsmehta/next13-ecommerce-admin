"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import JSON5 from "json5";
import { toast } from "react-hot-toast";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code,
  Copy,
  Eye,
  ExternalLink,
  History,
  Loader2,
  PlayCircle,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Upload,
  Workflow,
  Wand2,
} from "lucide-react";
import VisualFlowEditor from "./VisualFlowEditor";

interface FlowRecord {
  id: string;
  name: string;
  status: string;
  categories?: string[];
}

interface TemplateCreationResponseData {
  flow_id?: string;
  flow_name: string;
  status: string;
  categories?: string[];
  flow_json: unknown;
  id?: string;
}

interface FlowVersion {
  id: string;
  flowId: string;
  name: string;
  versionNumber: number;
  flowJson: any;
  createdBy?: string;
  notes?: string | null;
  createdAt: string;
}

interface FlowFieldConfig {
  name: string;
  label: string;
  type: "TextInput" | "TextArea" | "CheckboxGroup" | "RadioButtonsGroup" | "Dropdown" | "DatePicker" | "OptIn" | "TextHeading" | "TextSubheading" | "TextBody" | "TextCaption" | "Image" | "EmbeddedLink" | "Footer";
  required?: boolean;
  description?: string;
  options?: Array<{ id: string; title: string; description?: string }>;
  text?: string; // For display components
  src?: string; // For Image
  href?: string; // For EmbeddedLink
}

type TemplateType = "signup" | "appointment" | "survey" | "lead_generation";

type FlowBuilderTab = "flows" | "designer" | "preview" | "versions";

type DesignerMode = "wizard" | "json" | "visual";

const TEMPLATE_HINTS: Record<TemplateType, string> = {
  signup: "Collect customer details for registration and onboarding",
  appointment: "Offer multi-step scheduling with service selection",
  survey: "Gather structured feedback from respondents",
  lead_generation: "Capture lead contact details and preferences",
};

const FLOW_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-500",
  PUBLISHED: "bg-emerald-600",
  DEPRECATED: "bg-amber-600",
  BLOCKED: "bg-red-600",
  THROTTLED: "bg-orange-600",
};

const DEFAULT_SCREEN_JSON = `{
  "version": "7.3",
  "screens": [
    {
      "id": "WELCOME",
      "title": "Welcome",
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Paragraph",
            "text": "Customize this flow by adding your components"
          },
          {
            "type": "Footer",
            "label": "Continue",
            "on-click-action": {
              "name": "complete",
              "payload": {
                "screen": "WELCOME"
              }
            }
          }
        ]
      },
      "terminal": true,
      "success": true
    }
  ]
}`;

const DEFAULT_FIELD: FlowFieldConfig = {
  name: "field_1",
  label: "Field Label",
  type: "TextInput",
  required: true,
};

async function apiRequest<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const json = await response.json();
  if (!json?.success) {
    throw new Error(json?.error || "Request failed");
  }
  return json as T;
}

export default function FlowBuilder({ onComplete }: { onComplete?: () => void }) {
  const [tab, setTab] = useState<FlowBuilderTab>("flows");
  const [designerMode, setDesignerMode] = useState<DesignerMode>("wizard");

  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<FlowRecord | null>(null);
  const [flowJson, setFlowJson] = useState<string>(DEFAULT_SCREEN_JSON);
  const [flowJsonValid, setFlowJsonValid] = useState(true);
  const [flowJsonErrors, setFlowJsonErrors] = useState<string[]>([]);

  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionNotes, setVersionNotes] = useState("");

  const [loadingFlows, setLoadingFlows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [wizardFlowName, setWizardFlowName] = useState("");
  const [wizardFlowType, setWizardFlowType] = useState<TemplateType>("signup");
  const [wizardFields, setWizardFields] = useState<FlowFieldConfig[]>([
    {
      name: "full_name",
      label: "Full Name",
      type: "TextInput",
      required: true,
    },
    {
      name: "email",
      label: "Email",
      type: "TextInput",
      required: true,
    },
  ]);

  const [wizardStep, setWizardStep] = useState(0);

  useEffect(() => {
    void refreshFlows();
  }, []);

  useEffect(() => {
    if (!flowJson) return;
    try {
      const parsed = JSON5.parse(flowJson);
      const hasScreens = Array.isArray((parsed as any)?.screens) && (parsed as any).screens.length > 0;
      if (!hasScreens) {
        setFlowJsonValid(false);
        setFlowJsonErrors(["Flow JSON must include at least one screen"]);
      } else {
        setFlowJsonValid(true);
        setFlowJsonErrors([]);
      }
    } catch (error: any) {
      setFlowJsonValid(false);
      setFlowJsonErrors([error?.message || "Invalid JSON"]);
    }
  }, [flowJson]);

  const refreshFlows = async (): Promise<FlowRecord[]> => {
    setLoadingFlows(true);
    try {
      const data = await apiRequest<{ data: FlowRecord[]; count: number }>(
        "/api/whatsapp/flows/manage?action=list",
      );
      const nextFlows = data.data ?? [];
      setFlows(nextFlows);
      return nextFlows;
    } catch (error: any) {
      console.error("[FLOW_BUILDER] list flows", error);
      toast.error(error.message || "Failed to load flows");
      return [];
    } finally {
      setLoadingFlows(false);
    }
  };

  const loadFlowDetail = async (flow: FlowRecord) => {
    try {
      const json = await apiRequest<{ data: unknown }>(
        `/api/whatsapp/flows/manage?action=json&id=${flow.id}`,
      );
      setSelectedFlow(flow);
      setFlowJson(JSON.stringify(json.data ?? {}, null, 2));
      setDesignerMode("json");
      setTab("designer");
      setPreviewUrl(null);
      setVersionNotes("");
      void loadVersions(flow.id);
    } catch (error: any) {
      console.error("[FLOW_BUILDER] load flow json", error);
      toast.error(error.message || "Failed to load flow JSON");
    }
  };

  const loadVersions = async (flowId: string) => {
    setVersionsLoading(true);
    try {
      const json = await apiRequest<{ data: FlowVersion[] }>(
        `/api/whatsapp/flows/versions?flowId=${flowId}`,
      );
      setVersions(json.data ?? []);
    } catch (error: any) {
      console.error("[FLOW_BUILDER] load versions", error);
      toast.error(error.message || "Failed to load versions");
    } finally {
      setVersionsLoading(false);
    }
  };

  const handlePublish = async (flow: FlowRecord) => {
    setPublishing(flow.id);
    try {
      await apiRequest(`/api/whatsapp/flows/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", flowId: flow.id }),
      });
      toast.success("Flow published");
      await refreshFlows();
    } catch (error: any) {
      console.error("[FLOW_BUILDER] publish", error);
      toast.error(error.message || "Failed to publish flow");
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (flow: FlowRecord) => {
    setDeleting(flow.id);
    try {
      await apiRequest(`/api/whatsapp/flows/manage?id=${flow.id}`, {
        method: "DELETE",
      });
      toast.success("Flow deleted");
      await refreshFlows();
      if (selectedFlow?.id === flow.id) {
        setSelectedFlow(null);
        setVersions([]);
        setTab("flows");
      }
    } catch (error: any) {
      console.error("[FLOW_BUILDER] delete", error);
      toast.error(error.message || "Failed to delete flow");
    } finally {
      setDeleting(null);
    }
  };

  const handlePreview = async (flow: FlowRecord) => {
    setPreviewLoading(true);
    setSelectedFlow(flow);
    setPreviewUrl(null);
    try {
      const json = await apiRequest<{ data: { preview_url: string } }>(
        `/api/whatsapp/flows/manage?action=preview&id=${flow.id}`,
      );
      setPreviewUrl(json.data?.preview_url ?? null);
      setTab("preview");
    } catch (error: any) {
      console.error("[FLOW_BUILDER] preview", error);
      toast.error(error.message || "Preview unavailable");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(flowJson);
      toast.success("Flow JSON copied");
    } catch (error) {
      console.error("[FLOW_BUILDER] copy json", error);
      toast.error("Clipboard copy failed");
    }
  };

  const handleCreateFlowFromWizard = async () => {
    if (!wizardFlowName.trim()) {
      toast.error("Flow name is required");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { flowName: wizardFlowName };
      if (wizardFlowType === "signup" || wizardFlowType === "lead_generation") {
        payload.fields = wizardFields;
      }
      if (wizardFlowType === "appointment") {
        payload.services = wizardFields.map((field) => ({
          id: field.name,
          title: field.label,
          description: field.description,
        }));
      }
      if (wizardFlowType === "survey") {
        payload.questions = wizardFields.map((field) => ({
          id: field.name,
          question: field.label,
          type: field.type === "RadioButtonsGroup" ? "radio" : "text",
          description: field.description,
        }));
      }

  const response = await apiRequest<{ data: TemplateCreationResponseData }>("/api/whatsapp/flows/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: wizardFlowType,
          options: payload,
          autoPublish: false,
        }),
      });

      toast.success("Flow created");
      setWizardFlowName("");
      setWizardFields([DEFAULT_FIELD]);
      setWizardStep(0);

      const flows = await refreshFlows();
      const newFlowId = response.data?.id || response.data?.flow_id;

      if (newFlowId) {
        let flowToLoad = flows.find((flow) => flow.id === newFlowId);

        if (!flowToLoad) {
          try {
            const detail = await apiRequest<{ data: FlowRecord }>(
              `/api/whatsapp/flows/manage?action=get&id=${newFlowId}`,
            );
            flowToLoad = detail.data;
          } catch (detailError: any) {
            console.error("[FLOW_BUILDER] fetch new flow details", detailError);
          }
        }

        if (flowToLoad) {
          await loadFlowDetail(flowToLoad);
        }
      }
      onComplete?.();
    } catch (error: any) {
      console.error("[FLOW_BUILDER] create flow", error);
      toast.error(error.message || "Failed to create flow");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJsonToMeta = async () => {
    if (!selectedFlow) {
      toast.error("Pick a flow to update");
      return;
    }
    if (!flowJsonValid) {
      toast.error("Fix JSON errors before saving");
      return;
    }

    setSaving(true);
    try {
      const parsed = JSON5.parse(flowJson);
      const response = await apiRequest<{
        data?: {
          success: boolean;
          validation_errors?: any[];
          error?: string;
        };
      }>(`/api/whatsapp/flows/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_json",
          flowId: selectedFlow.id,
          flowJson: parsed,
        }),
      });
      
      // Check for validation errors in response
      const validationErrors = response.data?.validation_errors ?? [];
      if (validationErrors.length > 0) {
        console.error("❌ Flow validation errors:", validationErrors);
        const errorMessages = validationErrors
          .map((err: any) => err.message || err.error_user_msg || JSON.stringify(err))
          .join("; ");
        toast.error(`Validation failed: ${errorMessages}`);
        return;
      }
      
      toast.success("Flow updated in Meta");
      onComplete?.();
    } catch (error: any) {
      console.error("[FLOW_BUILDER] update json", error);
      
      // Try to extract validation errors from error response
      const validationErrors =
        (error && typeof error === "object" && "validation_errors" in error
          ? (error as any).validation_errors
          : undefined) ||
        (error && typeof error === "object" && "response" in error
          ? (error as any).response?.validation_errors
          : undefined);
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        const errorMessages = validationErrors
          .map((err: any) => err.message || err.error_user_msg || JSON.stringify(err))
          .join("; ");
        toast.error(`Validation failed: ${errorMessages}`);
      } else {
        toast.error(error.message || "Failed to update flow JSON");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVersionSnapshot = async () => {
    if (!selectedFlow) {
      toast.error("No flow selected");
      return;
    }
    if (!flowJsonValid) {
      toast.error("Fix JSON errors before saving a version");
      return;
    }

    setSaving(true);
    try {
      const parsed = JSON5.parse(flowJson);
      const response = await apiRequest<{ data: FlowVersion }>("/api/whatsapp/flows/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId: selectedFlow.id,
          name: `${selectedFlow.name} snapshot`,
          flowJson: parsed,
          notes: versionNotes || undefined,
        }),
      });

      toast.success("Version saved");
      setVersionNotes("");
      setVersions((prev) => [response.data, ...prev]);
      setTab("versions");
    } catch (error: any) {
      console.error("[FLOW_BUILDER] save version", error);
      toast.error(error.message || "Failed to save version");
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (version: FlowVersion) => {
    try {
      setFlowJson(JSON.stringify(version.flowJson ?? {}, null, 2));
      toast.success(`Version ${version.versionNumber} loaded`);
      setDesignerMode("json");
      setTab("designer");
    } catch (error: any) {
      console.error("[FLOW_BUILDER] restore version", error);
      toast.error(error.message || "Failed to load version JSON");
    }
  };

  const handleDeleteVersion = async (version: FlowVersion) => {
    try {
      await apiRequest(`/api/whatsapp/flows/versions?id=${version.id}`, {
        method: "DELETE",
      });
      setVersions((prev) => prev.filter((item) => item.id !== version.id));
      toast.success("Version deleted");
    } catch (error: any) {
      console.error("[FLOW_BUILDER] delete version", error);
      toast.error(error.message || "Failed to delete version");
    }
  };

  const addWizardField = useCallback(() => {
    setWizardFields((prev) => {
      const index = prev.length + 1;
      return [
        ...prev,
        {
          ...DEFAULT_FIELD,
          name: `field_${index}`,
          label: `Field ${index}`,
        },
      ];
    });
  }, []);

  const updateWizardField = useCallback((idx: number, updates: Partial<FlowFieldConfig>) => {
    setWizardFields((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...updates };
      return next;
    });
  }, []);

  const removeWizardField = useCallback((idx: number) => {
    setWizardFields((prev) => prev.filter((_, index) => index !== idx));
  }, []);

  const generateWizardFlowJson = useCallback(() => {
    const baseChildren: any[] = [];

    if (wizardFlowType === "appointment") {
      baseChildren.push({
        type: "RadioButtonsGroup",
        name: "service_option",
        label: "Select a service",
        required: true,
        "data-source": wizardFields.map((field) => ({
          id: field.name,
          title: field.label,
          description: field.description,
        })),
      });
    } else {
      baseChildren.push({
        type: "Form",
        name: `${wizardFlowType}_form`,
        children: wizardFields.map((field) => ({
          ...field,
          "data-source": field.options,
        })),
      });
    }

    baseChildren.push({
      type: "Footer",
      label: wizardFlowType === "appointment" ? "Book" : "Submit",
      "on-click-action": {
        name: "complete",
        payload: {
          screen: "PRIMARY",
        },
      },
    });

    const flowJsonObject = {
      version: "7.3",
      screens: [
        {
          id: "PRIMARY",
          title:
            wizardFlowType === "appointment"
              ? "Book Appointment"
              : wizardFlowType === "survey"
              ? "Survey"
              : wizardFlowType === "lead_generation"
              ? "Contact Details"
              : "Registration",
          layout: {
            type: "SingleColumnLayout",
            children: baseChildren,
          },
          terminal: true,
          success: true,
        },
      ],
    };

    return JSON.stringify(flowJsonObject, null, 2);
  }, [wizardFields, wizardFlowType]);

  const wizardSteps = useMemo(
    () => [
      {
        title: "Flow details",
        description: "Name your flow and choose a template",
        content: (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Flow Name</Label>
              <Input
                value={wizardFlowName}
                onChange={(event) => setWizardFlowName(event.target.value)}
                placeholder="e.g. Lead Capture"
              />
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={wizardFlowType} onValueChange={(value) => setWizardFlowType(value as TemplateType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="signup">Sign-up</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="lead_generation">Lead generation</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{TEMPLATE_HINTS[wizardFlowType]}</p>
            </div>
          </div>
        ),
      },
      {
        title: wizardFlowType === "appointment" ? "Services" : "Fields",
        description:
          wizardFlowType === "appointment"
            ? "Add appointment options"
            : "Configure the form components",
        content: (
          <div className="space-y-4">
            {wizardFields.map((field, index) => (
              <Card key={index} className="border-dashed">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{wizardFlowType === "appointment" ? "Service" : "Field"} {index + 1}</Badge>
                      <span className="text-xs text-muted-foreground">{field.type}</span>
                    </div>
                    {wizardFields.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWizardField(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Identifier</Label>
                    <Input
                      value={field.name}
                      onChange={(event) =>
                        updateWizardField(index, {
                          name: event.target.value.toLowerCase().replace(/\s+/g, "_"),
                        })
                      }
                      placeholder="field_identifier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{wizardFlowType === "survey" ? "Question" : "Label"}</Label>
                    <Input
                      value={field.label}
                      onChange={(event) => updateWizardField(index, { label: event.target.value })}
                      placeholder={wizardFlowType === "survey" ? "What would you like to ask?" : "Field label"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) => updateWizardField(index, { type: value as FlowFieldConfig["type"] })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Pick a field type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px] overflow-y-auto">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">INPUT FIELDS</div>
                        <SelectItem value="TextInput">
                          <div className="flex items-center gap-2">
                            <span>📝</span>
                            <span>Text Input</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="TextArea">
                          <div className="flex items-center gap-2">
                            <span>📄</span>
                            <span>Text Area</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Dropdown">
                          <div className="flex items-center gap-2">
                            <span>📋</span>
                            <span>Dropdown</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="DatePicker">
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span>Date Picker</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="RadioButtonsGroup">
                          <div className="flex items-center gap-2">
                            <span>🔘</span>
                            <span>Radio Buttons</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="CheckboxGroup">
                          <div className="flex items-center gap-2">
                            <span>☑️</span>
                            <span>Checkboxes</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="OptIn">
                          <div className="flex items-center gap-2">
                            <span>✅</span>
                            <span>Opt-In</span>
                          </div>
                        </SelectItem>
                        
                        <div className="px-2 py-1.5 text-xs font-semibold text-purple-600 mt-2">DISPLAY</div>
                        <SelectItem value="TextHeading">
                          <div className="flex items-center gap-2">
                            <span>�</span>
                            <span>Heading</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="TextSubheading">
                          <div className="flex items-center gap-2">
                            <span>📑</span>
                            <span>Subheading</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="TextBody">
                          <div className="flex items-center gap-2">
                            <span>📃</span>
                            <span>Body Text</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="TextCaption">
                          <div className="flex items-center gap-2">
                            <span>💬</span>
                            <span>Caption</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Image">
                          <div className="flex items-center gap-2">
                            <span>�️</span>
                            <span>Image</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="EmbeddedLink">
                          <div className="flex items-center gap-2">
                            <span>🔗</span>
                            <span>Link</span>
                          </div>
                        </SelectItem>
                        
                        <div className="px-2 py-1.5 text-xs font-semibold text-green-600 mt-2">ACTIONS</div>
                        <SelectItem value="Footer">
                          <div className="flex items-center gap-2">
                            <span>🔘</span>
                            <span>Footer Button</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Show appropriate fields based on component type */}
                  {!["TextHeading", "TextSubheading", "TextBody", "TextCaption", "Image", "EmbeddedLink", "Footer"].includes(field.type) && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={field.required ?? false}
                          onChange={(event) => updateWizardField(index, { required: event.target.checked })}
                          className="rounded"
                        />
                        Required field
                      </Label>
                      <Textarea
                        value={field.description ?? ""}
                        onChange={(event) => updateWizardField(index, { description: event.target.value })}
                        placeholder="Helper text"
                        rows={2}
                      />
                    </div>
                  )}
                  
                  {/* Text content for display components */}
                  {["TextHeading", "TextSubheading", "TextBody", "TextCaption"].includes(field.type) && (
                    <div className="md:col-span-2">
                      <Label>Text Content</Label>
                      <Textarea
                        value={field.text ?? ""}
                        onChange={(event) => updateWizardField(index, { text: event.target.value })}
                        placeholder="Enter the text to display"
                        rows={2}
                      />
                    </div>
                  )}
                  
                  {/* Image URL */}
                  {field.type === "Image" && (
                    <div className="md:col-span-2">
                      <Label>Image URL</Label>
                      <Input
                        value={field.src ?? ""}
                        onChange={(event) => updateWizardField(index, { src: event.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  )}
                  
                  {/* Link configuration */}
                  {field.type === "EmbeddedLink" && (
                    <div className="md:col-span-2 space-y-2">
                      <div>
                        <Label>Link Text</Label>
                        <Input
                          value={field.text ?? ""}
                          onChange={(event) => updateWizardField(index, { text: event.target.value })}
                          placeholder="Click here"
                        />
                      </div>
                      <div>
                        <Label>URL</Label>
                        <Input
                          value={field.href ?? ""}
                          onChange={(event) => updateWizardField(index, { href: event.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Footer button configuration */}
                  {field.type === "Footer" && (
                    <div className="md:col-span-2">
                      <Label>Button Label</Label>
                      <Input
                        value={field.label}
                        onChange={(event) => updateWizardField(index, { label: event.target.value })}
                        placeholder="Continue"
                      />
                    </div>
                  )}
                  
                  {/* Options for selection components */}
                  {(field.type === "CheckboxGroup" || field.type === "RadioButtonsGroup" || field.type === "Dropdown") && (
                    <div className="md:col-span-2 space-y-2">
                      <Label>Options (one per line)</Label>
                      <Textarea
                        value={(field.options ?? []).map((option) => option.title).join("\n")}
                        onChange={(event) =>
                          updateWizardField(index, {
                            options: event.target.value
                              .split("\n")
                              .filter(Boolean)
                              .map((value, idx) => ({
                                id: `${field.name}_${idx}`,
                                title: value.trim(),
                              })),
                          })
                        }
                        rows={3}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={addWizardField}>
              <Plus className="h-4 w-4 mr-2" /> Add {wizardFlowType === "appointment" ? "Service" : "Field"}
            </Button>
          </div>
        ),
      },
      {
        title: "Review JSON",
        description: "Preview the generated flow before saving",
        content: (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generated JSON</CardTitle>
                <CardDescription>This is what will be uploaded to Meta</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto max-h-[320px]">
                  {generateWizardFlowJson()}
                </pre>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setFlowJson(generateWizardFlowJson());
                  setDesignerMode("json");
                  toast.success("Wizard output loaded into editor");
                }}
              >
                <History className="h-4 w-4 mr-2" /> Send to JSON editor
              </Button>
              <p className="text-xs text-muted-foreground">
                You can still modify the JSON manually before publishing
              </p>
            </div>
          </div>
        ),
      },
    ],
    [
      addWizardField,
      generateWizardFlowJson,
      removeWizardField,
      updateWizardField,
      wizardFlowName,
      wizardFlowType,
      wizardFields,
    ],
  );

  const humanReadableStatus = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "Published";
      case "DEPRECATED":
        return "Deprecated";
      case "BLOCKED":
        return "Blocked";
      case "THROTTLED":
        return "Throttled";
      default:
        return "Draft";
    }
  };

  const statusBadge = (status: string) => {
    const color = FLOW_STATUS_COLORS[status] ?? "bg-slate-500";
    const Icon = status === "PUBLISHED" ? CheckCircle2 : status === "DEPRECATED" ? History : Eye;
    return (
      <Badge className={cn("font-semibold text-white gap-1", color)}>
        <Icon className="h-3 w-3" />
        {humanReadableStatus(status)}
      </Badge>
    );
  };

  const renderWizard = () => (
    <Card className="border-2">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-xl">Template Wizard</CardTitle>
          <CardDescription>Generate flows from opinionated templates</CardDescription>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> JSON validated before upload
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {wizardSteps.map((step, index) => (
            <div key={index} className="flex items-center gap-2">
              <Button
                type="button"
                variant={wizardStep === index ? "default" : "outline"}
                size="icon"
                onClick={() => setWizardStep(index)}
              >
                {index + 1}
              </Button>
              <div className="hidden sm:block">
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < wizardSteps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="border rounded-lg p-6 bg-card">
          {wizardSteps[wizardStep]?.content}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            disabled={wizardStep === 0}
            onClick={() => setWizardStep((prev) => Math.max(0, prev - 1))}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setWizardStep(0);
                setWizardFlowName("");
                setWizardFields([DEFAULT_FIELD]);
              }}
            >
              Reset wizard
            </Button>
            {wizardStep < wizardSteps.length - 1 ? (
              <Button onClick={() => setWizardStep((prev) => Math.min(wizardSteps.length - 1, prev + 1))}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreateFlowFromWizard} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create flow
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderJsonEditor = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Meta Flow JSON</p>
          <p className="text-xs text-muted-foreground">
            Update the JSON payload and push it to Meta or create a version snapshot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyJson}>
            <Copy className="h-4 w-4 mr-1" /> Copy JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFlowJson(DEFAULT_SCREEN_JSON)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Reset template
          </Button>
          <Button
            size="sm"
            onClick={handleSaveJsonToMeta}
            disabled={!selectedFlow || saving || !flowJsonValid}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Save to Meta
          </Button>
        </div>
      </div>

      {!flowJsonValid && flowJsonErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>JSON validation failed</AlertTitle>
          <AlertDescription>
            {flowJsonErrors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Textarea
        value={flowJson}
        onChange={(event) => setFlowJson(event.target.value)}
        rows={26}
        className="font-mono text-xs"
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          {versions.length === 0 ? "No versions saved yet" : `${versions.length} version${versions.length === 1 ? "" : "s"} available`}
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            value={versionNotes}
            onChange={(event) => setVersionNotes(event.target.value)}
            placeholder="Version notes (optional)"
            className="md:w-64"
          />
          <Button
            variant="secondary"
            onClick={handleSaveVersionSnapshot}
            disabled={!selectedFlow || saving || !flowJsonValid}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Save version snapshot
          </Button>
        </div>
      </div>
    </div>
  );

  const renderVisualEditor = () => {
    if (!selectedFlow) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No flow selected</AlertTitle>
          <AlertDescription>
            Please select a flow from the &quot;Flows&quot; tab or create a new one using the Template wizard.
          </AlertDescription>
        </Alert>
      );
    }

    // Parse the flow JSON for the visual editor
    let parsedFlow;
    try {
      parsedFlow = JSON5.parse(flowJson);
    } catch (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid JSON</AlertTitle>
          <AlertDescription>
            The flow JSON contains errors. Please fix them in the JSON editor before using the visual editor.
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDesignerMode("json")}
              >
                <Code className="h-4 w-4 mr-2" />
                Go to JSON editor
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    const handleSaveVisualFlow = async (updatedFlow: any) => {
      try {
        // Convert back to JSON string and update state
        const jsonString = JSON.stringify(updatedFlow, null, 2);
        setFlowJson(jsonString);

        // Save to Meta
        toast.loading("Saving flow to Meta...", { id: "save-visual" });
        
        const response = await fetch("/api/whatsapp/flows/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_json",
            flowId: selectedFlow.id,
            flowJson: updatedFlow,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          // Check for validation errors
          if (data.validation_errors && data.validation_errors.length > 0) {
            const errorMessages = data.validation_errors
              .map((err: any) => err.message || err.error_user_msg || JSON.stringify(err))
              .join("; ");
            throw new Error(`Validation failed: ${errorMessages}`);
          }
          throw new Error(data.error || "Failed to save flow");
        }
        
        // Check for validation errors even in successful response
        if (data.validation_errors && data.validation_errors.length > 0) {
          const errorMessages = data.validation_errors
            .map((err: any) => err.message || err.error_user_msg || JSON.stringify(err))
            .join("; ");
          toast.error(`Validation failed: ${errorMessages}`, { id: "save-visual" });
          return;
        }

        toast.success("Flow saved successfully!", { id: "save-visual" });
      } catch (error: any) {
        console.error("Save visual flow error:", error);
        toast.error(error.message || "Failed to save flow", { id: "save-visual" });
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Visual Flow Editor</p>
            <p className="text-xs text-muted-foreground">
              Drag and drop components to build your flow visually.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDesignerMode("json")}
          >
            <Code className="h-4 w-4 mr-2" />
            Switch to JSON editor
          </Button>
        </div>

        <VisualFlowEditor
          initialFlow={parsedFlow}
          onSave={handleSaveVisualFlow}
          onCancel={() => setDesignerMode("json")}
        />
      </div>
    );
  };

  const renderDesigner = () => (
    <Card className="border-2">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          Flow designer
        </CardTitle>
        <CardDescription>
          {selectedFlow
            ? `Editing ${selectedFlow.name} (${selectedFlow.id})`
            : 'Use the wizard to create a flow or select an existing one from the "Flows" tab.'}
        </CardDescription>
        {selectedFlow && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {statusBadge(selectedFlow.status)}
            {selectedFlow.categories?.map((category) => (
              <Badge key={category} variant="outline">
                {category}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={designerMode} onValueChange={(value) => setDesignerMode(value as DesignerMode)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="wizard">
              <Wand2 className="h-4 w-4 mr-2" />
              Template wizard
            </TabsTrigger>
            <TabsTrigger value="json">
              <Code className="h-4 w-4 mr-2" />
              JSON editor
            </TabsTrigger>
            <TabsTrigger value="visual">
              <Workflow className="h-4 w-4 mr-2" />
              Visual editor
            </TabsTrigger>
          </TabsList>
          <TabsContent value="wizard">{renderWizard()}</TabsContent>
          <TabsContent value="json">{renderJsonEditor()}</TabsContent>
          <TabsContent value="visual">{renderVisualEditor()}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  const renderFlowList = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedFlow ? `Selected: ${selectedFlow.name}` : "Select a flow to edit"}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={refreshFlows}
            disabled={loadingFlows}
          >
            <RefreshCcw className={cn("h-4 w-4 mr-2", loadingFlows && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setTab("designer");
              setDesignerMode("wizard");
              setSelectedFlow(null);
              setWizardStep(0);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> New flow wizard
          </Button>
        </div>
      </div>

      {loadingFlows ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : flows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Workflow className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No flows found</p>
              <p className="text-sm text-muted-foreground">Create a new flow or sync from Meta</p>
            </div>
            <Button onClick={() => setTab("designer")}>
              <Plus className="h-4 w-4 mr-2" /> Create flow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flows.map((flow) => (
            <Card key={flow.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{flow.name}</CardTitle>
                    <CardDescription className="text-xs">{flow.id}</CardDescription>
                  </div>
                  {statusBadge(flow.status)}
                </div>
                <div className="flex flex-wrap gap-1">
                  {flow.categories?.map((category) => (
                    <Badge key={category} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadFlowDetail(flow)}
                  >
                    <Workflow className="h-4 w-4 mr-2" /> Open designer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreview(flow)}
                  >
                    {previewLoading && selectedFlow?.id === flow.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Preview
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {flow.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(flow)}
                      disabled={publishing === flow.id}
                    >
                      {publishing === flow.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PlayCircle className="h-4 w-4 mr-2" />
                      )}
                      Publish
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting === flow.id}
                      >
                        {deleting === flow.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete flow?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the flow from Meta. You can restore a snapshot via versions if available.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(flow)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderPreview = () => (
    <Card className="border-2">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" /> Preview in WhatsApp
        </CardTitle>
        <CardDescription>
          Generate a preview link to open the latest published version inside WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!selectedFlow ? (
          <div className="text-sm text-muted-foreground">Select a flow first to request a preview link.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{selectedFlow.name}</p>
                <p className="text-xs text-muted-foreground">{selectedFlow.id}</p>
              </div>
              <Button onClick={() => handlePreview(selectedFlow)} disabled={previewLoading}>
                {previewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                Generate preview link
              </Button>
            </div>
            {previewUrl ? (
              <Card className="border-dashed">
                <CardContent className="space-y-2 py-4">
                  <p className="text-sm text-muted-foreground">Share this link with a Meta-approved tester:</p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" /> {previewUrl}
                  </a>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4" /> Preview URLs expire quickly; generate a new one when needed.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderVersions = () => (
    <Card className="border-2">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" /> Version history
        </CardTitle>
        <CardDescription>Store JSON snapshots and restore them when needed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFlow ? (
          <div className="text-sm text-muted-foreground">Select a flow to view saved versions.</div>
        ) : versionsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : versions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No versions yet. Save a snapshot from the JSON editor to build history.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <Card key={version.id}>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-base">Version {version.versionNumber}</CardTitle>
                    <CardDescription>
                      Saved on {new Date(version.createdAt).toLocaleString()} {version.createdBy ? `by ${version.createdBy}` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestoreVersion(version)}>
                      <Workflow className="h-4 w-4 mr-2" /> Load into editor
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete version?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This snapshot will be permanently removed. The Meta flow will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteVersion(version)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                {(version.notes || version.flowJson) && (
                  <CardContent className="space-y-2 text-sm">
                    {version.notes && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ShieldCheck className="h-4 w-4" /> {version.notes}
                      </div>
                    )}
                    <details className="rounded border bg-muted/30 p-3">
                      <summary className="cursor-pointer text-xs font-medium">View JSON</summary>
                      <pre className="mt-3 max-h-[240px] overflow-auto rounded bg-background p-3 text-[11px]">
                        {JSON.stringify(version.flowJson, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Flow Builder</h2>
          <p className="text-sm text-muted-foreground">
            Build, preview, and version WhatsApp Flows without leaving the dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={refreshFlows}
            disabled={loadingFlows}
          >
            <RefreshCcw className={cn("h-4 w-4 mr-2", loadingFlows && "animate-spin")}
            />
            Sync from Meta
          </Button>
          <Button
            onClick={() => {
              setTab("designer");
              setDesignerMode("wizard");
              setSelectedFlow(null);
              setWizardStep(0);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Start new flow
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as FlowBuilderTab)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 md:w-auto">
          <TabsTrigger value="flows">Flows</TabsTrigger>
          <TabsTrigger value="designer">Designer</TabsTrigger>
          <TabsTrigger value="preview" disabled={!selectedFlow}>Preview</TabsTrigger>
          <TabsTrigger value="versions" disabled={!selectedFlow}>Versions</TabsTrigger>
        </TabsList>
        <TabsContent value="flows">{renderFlowList()}</TabsContent>
        <TabsContent value="designer">{renderDesigner()}</TabsContent>
        <TabsContent value="preview">{renderPreview()}</TabsContent>
        <TabsContent value="versions">{renderVersions()}</TabsContent>
      </Tabs>
    </div>
  );
}
