'use client';

import { useEffect, useState, useRef, useMemo, useCallback, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'react-hot-toast';
import { Send, MessageSquare, Settings, CheckCircle, XCircle, FileText, Plus, Sun, Moon, Cloud, Info, Smile, Search, X, MoreVertical, ArrowRight, ImageIcon, ShoppingBag, Check, ChevronsUpDown, Filter, UploadCloud, Loader2, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { formatLocalDate } from '@/lib/timezone-utils';


interface WhatsAppMessage {
  id: string;
  to: string;
  from: string;
  message: string;
  messageSid?: string;
  status: string;
  direction: string;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}


type WhatsAppProvider = 'meta' | 'unknown';

interface WhatsAppConfig {
  provider?: WhatsAppProvider;
  isCloudConfigured?: boolean;
  whatsappNumber?: string;
  isMetaConfigured?: boolean;
  meta?: {
    phoneNumberId: string;
    apiVersion: string;
    hasAccessToken: boolean;
  } | null;
}

interface OrganizationInfo {
  id?: string;
  name?: string;
  logoUrl?: string | null;
}

interface WhatsAppTemplateButton {
  type?: string;
  index?: number;
  text?: string;
  url?: string;
  phone?: string;
  flowId?: string;
  flowName?: string;
  flowCta?: string;
  flowMessageVersion?: string;
  flowAction?: string;
  flowActionData?: any;
  flowToken?: string;
  flowRedirectUrl?: string;
  flowTokenLabel?: string;
}

interface WhatsAppFlowButtonDefault {
  index?: number;
  text?: string;
  action?: {
    flow_id?: string;
    flow_name?: string;
    flow_cta?: string;
    flow_action?: string;
    flow_action_data?: any;
    flow_action_payload?: any;
    flow_message_version?: string;
    flow_redirect_url?: string;
    flow_token_label?: string;
  };
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[] | Record<string, string>;
  language?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  components?: any[];
  whatsapp?: {
    hasCta: boolean;
    buttons: WhatsAppTemplateButton[];
  };
  flowDefaults?: WhatsAppFlowButtonDefault[];
}

type CatalogOption = {
  id: string;
  name: string | null;
  metaCatalogId: string | null;
  currency?: string | null;
  isActive?: boolean | null;
  isPublic?: boolean | null;
  autoSync?: boolean | null;
};

type CatalogProductOption = {
  id: string;
  name: string;
  retailerId: string;
  sku?: string | null;
};

const stripWhatsAppPrefix = (value?: string | null) => {
  if (!value) return '';
  return value.replace(/^whatsapp:/i, '').trim();
};

const normalizeContactAddress = (value?: string | null) => {
  if (!value) return null;
  const stripped = stripWhatsAppPrefix(value);
  if (!stripped || /^business$/i.test(stripped)) return null;
  if (stripped.startsWith('+')) return stripped;
  const digits = stripped.replace(/[^\d]/g, '');
  if (!digits) return stripped;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  return `+${digits}`;
};

const formatContactLabel = (value?: string | null) => {
  const normalized = normalizeContactAddress(value);
  if (normalized) return normalized;
  const stripped = stripWhatsAppPrefix(value);
  return stripped || 'Unknown contact';
};

const DEFAULT_MESSAGE_FETCH_LIMIT = 1000; // Fetch all messages to ensure all responded contacts are included
const INITIAL_VISIBLE_MESSAGES = 5;
const LOAD_MORE_MESSAGES_STEP = 5;
const inlineUploadConfiguredMb = Number(process.env.NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILE_SIZE_MB ?? 100);
const INLINE_UPLOAD_MAX_MB = Number.isFinite(inlineUploadConfiguredMb) && inlineUploadConfiguredMb > 0 ? inlineUploadConfiguredMb : 100;
const INLINE_UPLOAD_MAX_BYTES = INLINE_UPLOAD_MAX_MB * 1024 * 1024;

export default function WhatsAppSettingsPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<{ [key: string]: string }>({});
  const [useTemplate, setUseTemplate] = useState(true);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [org, setOrg] = useState<OrganizationInfo>({});
  const [darkPreview, setDarkPreview] = useState(true);
  const [deliveryStage, setDeliveryStage] = useState<0 | 1 | 2 | 3>(0);
  const [previewWide, setPreviewWide] = useState(true);
  const BASE_PREVIEW_WIDTH = 720; // px
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState('');
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCatalogComposer, setShowCatalogComposer] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  const [isLoadingPreviousMessages, setIsLoadingPreviousMessages] = useState(false);
  const lastReadMapRef = useRef<Record<string, number>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [visibleMessageCounts, setVisibleMessageCounts] = useState<Record<string, number>>({});
  const [variableUploadState, setVariableUploadState] = useState<Record<string, { isLoading: boolean; error?: string; fileName?: string }>>({});
  const variableFileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const manualContactsRef = useRef<Record<string, Contact>>({});

  // Debug Logs State
  type DebugLog = {
    id: string;
    timestamp: Date;
    type: 'info' | 'success' | 'error' | 'warning';
    action: string;
    details: any;
  };
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebugLogs, setShowDebugLogs] = useState(true);

  // Interactive WhatsApp-like preview state
  type ChatMsgMetadata = {
    templateId?: string;
    templateName?: string;
    headerImage?: string;
    buttons?: Array<{ type?: string; text?: string; url?: string; phone?: string; sub_type?: string; index?: number }>;
    flowButtons?: Array<{ index: number; parameter: any; warnings?: string[] }>;
    components?: any[];
    variables?: Record<string, any>;
    flowSummary?: Record<string, any>;
    flowSummaryRaw?: any;
    flowToken?: string;
    flowTokenLabel?: string;
    flowName?: string;
    flowId?: string;
    flowSubmission?: {
      flowId?: string;
      flowName?: string;
      flowToken?: string;
      response?: any;
      raw?: any;
      screen?: any;
    };
    whatsappType?: string;
    contactName?: string;
    waId?: string;
    textPreview?: string;
    media?: {
      id?: string;
      mimeType?: string;
      filename?: string;
      caption?: string;
      sha256?: string;
      size?: number;
      url?: string;
      localUrl?: string;
    };
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
      url?: string;
    };
    interactive?: {
      type?: string;
      buttonReply?: { id?: string; title?: string; payload?: string };
      listReply?: { id?: string; title?: string; description?: string };
      original?: any;
      bodyText?: string;
      flowResponse?: any;
      nfmReply?: any;
    };
    sharedContacts?: Array<any>;
    reaction?: any;
    rawMessage?: any;
    rawPayload?: any;
    catalog?: {
      type?: 'product' | 'product_list';
      catalogId?: string;
      productRetailerId?: string;
      productIds?: string[];
      sections?: Array<{ title?: string; productItems: string[] }>;
    };
  };

  type ChatMsg = {
    id: string;
    text: string;
    direction: 'in' | 'out';
    ts: number;
    status?: 0 | 1 | 2 | 3;
    metadata?: ChatMsgMetadata;
  };
  type CatalogInteractivePayload =
    | {
      type: 'product';
      body: string;
      footer?: string;
      header?: { type: 'text'; text: string };
      catalogId: string;
      productRetailerId: string;
    }
    | {
      type: 'product_list';
      body: string;
      footer?: string;
      header: { type: 'text'; text: string };
      catalogId: string;
      sections: Array<{ title?: string; productItems: Array<{ productRetailerId: string }> }>;
    };
  type Contact = { id: string; name: string; phone: string; avatarText?: string };
  type FlowSubmissionDetails = {
    summary?: Record<string, any>;
    flowName?: string;
    flowToken?: string;
    responseText?: string;
    isFlowReply: boolean;
  };

  type PendingMedia = {
    file: File;
    previewUrl?: string;
    type: 'image' | 'document';
    mimeType: string;
    fileName: string;
    size: number;
  };

  type UploadedMediaResult = {
    success: true;
    mediaId: string;
    type: 'image' | 'document';
    mimeType: string;
    fileName: string;
    size: number;
  };

  const sortContactsByRecent = useCallback((list: Contact[], convoMap: Record<string, ChatMsg[]>) => {
    return list.sort((a, b) => {
      const lastMsgA = convoMap[a.id]?.[convoMap[a.id].length - 1];
      const lastMsgB = convoMap[b.id]?.[convoMap[b.id].length - 1];
      const timeA = lastMsgA?.ts || 0;
      const timeB = lastMsgB?.ts || 0;
      return timeB - timeA;
    });
  }, []);

  const safeParseFlowJson = (raw: unknown): any | null => {
    if (!raw) return null;
    if (typeof raw === 'object') {
      return raw;
    }
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  };

  const tryParseJsonString = (input: unknown): unknown => {
    if (typeof input !== 'string') return input;
    const trimmed = input.trim();
    if (!trimmed) return input;
    const firstChar = trimmed[0];
    if (firstChar !== '{' && firstChar !== '[') return input;
    try {
      return JSON.parse(trimmed);
    } catch {
      return input;
    }
  };

  const humanizeFlowLabel = (key: string) => {
    return key
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatFlowDetailValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const normalized = tryParseJsonString(value);
    if (normalized !== value) {
      return formatFlowDetailValue(normalized);
    }
    if (Array.isArray(value)) {
      return value
        .map((entry) => formatFlowDetailValue(entry))
        .filter((entry) => entry.length > 0)
        .join(', ');
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([nestedKey, nestedValue]) => {
          const formatted = formatFlowDetailValue(nestedValue);
          if (!formatted) return '';
          return `${humanizeFlowLabel(nestedKey)}: ${formatted}`;
        })
        .filter((entry) => entry.length > 0);
      return entries.join('; ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const formatFlowValuePreview = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const normalized = tryParseJsonString(value);
    if (normalized !== value) {
      return formatFlowValuePreview(normalized);
    }
    if (Array.isArray(value)) {
      return value
        .map((entry) => formatFlowValuePreview(entry))
        .filter((entry) => entry.length > 0)
        .join(', ');
    }
    if (typeof value === 'object') {
      const nested = Object.values(value as Record<string, unknown>)
        .map((entry) => formatFlowValuePreview(entry))
        .filter((entry) => entry.length > 0);
      return nested.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const isSameCalendarDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const formatChatDateLabel = (timestamp: number): string => {
    const messageDate = new Date(timestamp);
    const now = new Date();

    if (isSameCalendarDay(messageDate, now)) {
      return 'Today';
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameCalendarDay(messageDate, yesterday)) {
      return 'Yesterday';
    }

    return formatLocalDate(messageDate, 'EEE, MMM d, yyyy');
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || Number.isNaN(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / Math.pow(1024, index);
    return `${index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
  };

  const coerceFlowSummaryObject = (input: unknown): Record<string, any> | null => {
    if (!input) {
      return null;
    }
    const normalized = tryParseJsonString(input);
    if (normalized !== input) {
      return coerceFlowSummaryObject(normalized);
    }
    if (Array.isArray(input)) {
      const aggregate: Record<string, any> = {};
      input.forEach((entry, index) => {
        if (entry === null || entry === undefined) {
          return;
        }
        if (typeof entry === 'object' && !Array.isArray(entry)) {
          const objectEntry = entry as Record<string, any>;
          const keyCandidate =
            objectEntry.label ||
            objectEntry.title ||
            objectEntry.question ||
            objectEntry.key ||
            objectEntry.name ||
            objectEntry.id;
          const key = typeof keyCandidate === 'string' && keyCandidate.trim().length > 0
            ? keyCandidate
            : `Field ${index + 1}`;

          const valueCandidate =
            objectEntry.value ??
            objectEntry.answer ??
            objectEntry.response ??
            objectEntry.selection ??
            objectEntry.selected_option ??
            objectEntry.selectedValue ??
            objectEntry.text ??
            objectEntry.content ??
            objectEntry.answers ??
            objectEntry.values ??
            objectEntry.data ??
            entry;

          aggregate[key] = valueCandidate;
        } else {
          aggregate[`Field ${index + 1}`] = entry;
        }
      });
      return Object.keys(aggregate).length > 0 ? aggregate : null;
    }
    if (typeof input === 'object') {
      const record = input as Record<string, any>;
      if (Object.keys(record).length === 0) {
        return null;
      }
      return record;
    }
    return null;
  };

  const extractFlowSubmissionDetails = (
    metadata?: ChatMsg['metadata']
  ): FlowSubmissionDetails | null => {
    if (!metadata) return null;

    const interactiveOriginal =
      metadata.interactive?.original ||
      (metadata.rawMessage && metadata.rawMessage.interactive) ||
      undefined;

    const nfmReply =
      interactiveOriginal?.nfm_reply ||
      interactiveOriginal?.nfm_response ||
      metadata.rawMessage?.interactive?.nfm_reply ||
      metadata.rawMessage?.interactive?.nfm_response;

    const responseJsonCandidate =
      nfmReply?.response_json ??
      nfmReply?.responseJson ??
      interactiveOriginal?.response_json ??
      interactiveOriginal?.responseJson ??
      metadata.flowSummaryRaw ??
      metadata.flowSubmission?.response;

    const parsed = safeParseFlowJson(responseJsonCandidate);

    const candidates: Array<Record<string, any>> = [];
    const pushCandidate = (value: unknown) => {
      const coerced = coerceFlowSummaryObject(value);
      if (coerced) {
        candidates.push(coerced);
      }
    };

    pushCandidate(metadata.flowSubmission?.response);
    pushCandidate(metadata.flowSummary);
    pushCandidate(metadata.flowSummaryRaw);
    pushCandidate(metadata.flowSubmission?.screen);
    pushCandidate(metadata.interactive?.flowResponse?.parsedResponse);
    pushCandidate(metadata.interactive?.flowResponse?.summary);
    pushCandidate(metadata.interactive?.nfmReply);
    if (parsed) {
      pushCandidate(parsed.summary);
      if (parsed.data) {
        pushCandidate(parsed.data.summary);
        pushCandidate(parsed.data);
      }
      pushCandidate(parsed.submission);
      pushCandidate(parsed.answers);
      pushCandidate(parsed.fields);
      pushCandidate(parsed.submissions);
      pushCandidate(parsed.form);
      pushCandidate(parsed.formData);
      pushCandidate(parsed.form_data);
      pushCandidate(parsed.results);
      pushCandidate(parsed.responses);
      if (parsed.steps) {
        pushCandidate(parsed.steps);
      }
      if (parsed.sections) {
        pushCandidate(parsed.sections);
      }
      if (parsed.questions) {
        pushCandidate(parsed.questions);
      }
    }

    const summary = candidates[0];

    const flowTokenCandidates = [
      metadata.flowToken,
      metadata.flowTokenLabel,
      metadata.flowSubmission?.flowToken,
      metadata.interactive?.flowResponse?.flow_token,
      metadata.interactive?.flowResponse?.flowToken,
      metadata.variables?.flowToken,
      metadata.variables?._flow_token,
      nfmReply?.flow_token,
      nfmReply?.flowToken,
      parsed?.flow_token,
      parsed?.flowToken,
      parsed?.data?.flow_token,
      parsed?.data?.flowToken,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    const flowNameCandidates = [
      metadata.flowName,
      metadata.flowSubmission?.flowName,
      metadata.interactive?.flowResponse?.name,
      metadata.interactive?.flowResponse?.flow_name,
      nfmReply?.flow_name,
      nfmReply?.flowName,
      nfmReply?.name,
      parsed?.flow_name,
      parsed?.flowName,
      parsed?.data?.flow_name,
      parsed?.data?.flowName,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    const flowToken = flowTokenCandidates[0];
    const flowName = flowNameCandidates[0];

    const responseBodyCandidates = [
      nfmReply?.body,
      parsed?.body,
      parsed?.message,
      parsed?.text,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    const isFlowReply = Boolean(nfmReply || metadata.flowSummary || summary);

    const responseText = isFlowReply ? responseBodyCandidates[0] : undefined;

    if (!summary && !flowToken && !flowName && !responseText) {
      return isFlowReply ? { summary, flowName, flowToken, responseText, isFlowReply } : null;
    }

    return {
      summary,
      flowName,
      flowToken,
      responseText,
      isFlowReply,
    };
  };
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [convos, setConvos] = useState<Record<string, ChatMsg[]>>({});
  const [visibleContactsCount, setVisibleContactsCount] = useState(25); // Load 25 contacts at a time
  const [showOnlyResponded, setShowOnlyResponded] = useState(true); // Filter to show only contacts with responses (DEFAULT: true)
  const [typing, setTyping] = useState(false);
  const [liveSend, setLiveSend] = useState(true); // ✅ ENABLE LIVE SENDING
  const [sendingLive, setSendingLive] = useState(false);
  const [catalogMode, setCatalogMode] = useState<'single' | 'multi'>('single');
  const [catalogRecipient, setCatalogRecipient] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const [catalogHeader, setCatalogHeader] = useState('Explore our catalog');
  const [catalogBody, setCatalogBody] = useState('Here are a few picks we think you will love.');
  const [catalogFooter, setCatalogFooter] = useState('Reply if you need more details.');
  const [catalogProductId, setCatalogProductId] = useState('');
  const [catalogProductIds, setCatalogProductIds] = useState('');
  const [catalogSectionTitle, setCatalogSectionTitle] = useState('Featured');
  const [catalogOptions, setCatalogOptions] = useState<CatalogOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [catalogProductOptions, setCatalogProductOptions] = useState<CatalogProductOption[]>([]);
  const [catalogProductsLoading, setCatalogProductsLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [catalogSelectOpen, setCatalogSelectOpen] = useState(false);
  const [productSelectOpen, setProductSelectOpen] = useState(false);
  const [multiProductSelectOpen, setMultiProductSelectOpen] = useState(false);
  const [sendingCatalog, setSendingCatalog] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const catalogsLoadingRef = useRef(false);
  const catalogProductsLoadingRef = useRef(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  // Ref for auto-scrolling to bottom of chat
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const selectedCatalogOption = useMemo(() => {
    if (!catalogId) return null;
    return (
      catalogOptions.find(
        (option) => option.metaCatalogId === catalogId || option.id === catalogId
      ) || null
    );
  }, [catalogId, catalogOptions]);

  const selectedSingleProductOption = useMemo(() => {
    if (!catalogProductId) return null;
    return catalogProductOptions.find((option) => option.retailerId === catalogProductId) || null;
  }, [catalogProductId, catalogProductOptions]);

  const selectedProductSummaries = useMemo(() => {
    if (selectedProductIds.length === 0) return [] as Array<{ id: string; label: string }>;
    return selectedProductIds.map((retailerId) => {
      const match = catalogProductOptions.find((option) => option.retailerId === retailerId);
      const label = match ? `${match.name} • ${match.retailerId}` : retailerId;
      return { id: retailerId, label };
    });
  }, [selectedProductIds, catalogProductOptions]);


  const catalogSelectionLabel = useMemo(() => {
    if (catalogsLoading) {
      return 'Loading catalogs…';
    }
    if (selectedCatalogOption) {
      const id = selectedCatalogOption.metaCatalogId || selectedCatalogOption.id;
      const name = selectedCatalogOption.name || id;
      const currency = selectedCatalogOption.currency ? ` • ${selectedCatalogOption.currency}` : '';
      return `${name}${currency}`;
    }
    if (catalogId) {
      return `Custom: ${catalogId}`;
    }
    return 'Select catalog';
  }, [catalogsLoading, selectedCatalogOption, catalogId]);

  const singleProductLabel = useMemo(() => {
    if (catalogProductsLoading) {
      return 'Loading products…';
    }
    if (selectedSingleProductOption) {
      return `${selectedSingleProductOption.name} • ${selectedSingleProductOption.retailerId}`;
    }
    if (catalogProductId) {
      return `Custom: ${catalogProductId}`;
    }
    return 'Select product';
  }, [catalogProductsLoading, selectedSingleProductOption, catalogProductId]);

  const multiProductLabel = useMemo(() => {
    if (catalogProductsLoading) {
      return 'Loading products…';
    }
    if (selectedProductIds.length === 1) {
      return selectedProductSummaries[0]?.label ?? 'Select products';
    }
    if (selectedProductIds.length > 1) {
      return `${selectedProductIds.length} products selected`;
    }
    return 'Select products';
  }, [catalogProductsLoading, selectedProductIds.length, selectedProductSummaries]);

  const filteredContacts = contacts
    .filter(c =>
    (c.name.toLowerCase().includes(chatSearchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(chatSearchTerm.toLowerCase()))
    )
    .filter(c => {
      // If "responded only" filter is on, check if contact has inbound messages
      if (showOnlyResponded) {
        const convo = convos[c.id] || [];
        return convo.some(m => m.direction === 'in');
      }
      return true;
    })
    .slice(0, visibleContactsCount); // Apply pagination limit

  const totalAvailableContacts = contacts
    .filter(c =>
    (c.name.toLowerCase().includes(chatSearchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(chatSearchTerm.toLowerCase()))
    )
    .filter(c => {
      if (showOnlyResponded) {
        const convo = convos[c.id] || [];
        return convo.some(m => m.direction === 'in');
      }
      return true;
    }).length;

  const hasMoreContacts = filteredContacts.length < totalAvailableContacts;

  // Debug logging
  useEffect(() => {
    if (showOnlyResponded) {
      console.log('🔍 [FILTER DEBUG]', {
        visibleContactsCount,
        filteredContactsLength: filteredContacts.length,
        totalAvailableContacts,
        hasMoreContacts,
        showOnlyResponded,
        totalContacts: contacts.length
      });
    }
  }, [filteredContacts.length, hasMoreContacts, totalAvailableContacts, visibleContactsCount, showOnlyResponded, contacts.length]);

  const handleAddNewChat = () => {
    if (!newChatNumber) return;
    const normalized = normalizeContactAddress(newChatNumber);
    if (!normalized) {
      toast.error('Invalid phone number. Use digits with country code (e.g. +1234567890 or 1234567890).');
      return;
    }
    const newContact: Contact = {
      id: normalized,
      name: normalized,
      phone: normalized,
      avatarText: normalized.replace(/\D/g, '').slice(-2) || 'CT'
    };

    manualContactsRef.current[normalized] = newContact;

    setContacts(prev => prev.some(c => c.id === normalized) ? prev : [...prev, newContact]);
    setConvos(prev => (prev[normalized] ? prev : { ...prev, [normalized]: [] }));
    setVisibleMessageCounts(prev => (prev[normalized] ? prev : { ...prev, [normalized]: INITIAL_VISIBLE_MESSAGES }));
    setActiveId(normalized);
    setShowNewChatDialog(false);
    setNewChatNumber('');
  };

  const substituteTemplate = (body: string, vars: { [k: string]: string }) => {
    if (!body) return '';
    return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => (vars?.[k] ?? `{{${k}}}`));
  };

  const extractPlaceholders = (text: string): string[] => {
    if (!text) return [];
    const set = new Set<string>();
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      set.add(m[1]);
    }
    return Array.from(set);
  };

  const getMessagePreviewLabel = (message?: ChatMsg): string => {
    if (!message) return 'Start a conversation';
    const metadata = message.metadata;
    const flowDetails = extractFlowSubmissionDetails(metadata);

    if (metadata?.templateName || metadata?.templateId) {
      return `Template • ${metadata.templateName || metadata.templateId}`;
    }

    const whatsappType = metadata?.whatsappType;
    if (whatsappType && whatsappType !== 'text') {
      switch (whatsappType) {
        case 'image':
          return 'Media • Image';
        case 'video':
          return 'Media • Video';
        case 'audio':
          return 'Media • Audio';
        case 'document':
          return metadata?.media?.filename
            ? `Document • ${metadata.media.filename}`
            : 'Media • Document';
        case 'sticker':
          return 'Sticker';
        case 'location':
          return metadata?.location?.name
            ? `Location • ${metadata.location.name}`
            : 'Location shared';
        case 'contacts':
          {
            const count = metadata?.sharedContacts?.length || 1;
            return count > 1 ? `Contacts • ${count} shared` : 'Contact shared';
          }
        case 'interactive':
          if (metadata.interactive?.buttonReply?.title) {
            return `Button reply • ${metadata.interactive.buttonReply.title}`;
          }
          if (metadata.interactive?.listReply?.title) {
            return `List reply • ${metadata.interactive.listReply.title}`;
          }
          if (metadata.catalog?.type === 'product') {
            const label = metadata.catalog.productRetailerId || metadata.interactive?.bodyText || flowDetails?.responseText;
            return label ? `Catalog • ${label}` : 'Catalog product';
          }
          if (metadata.catalog?.type === 'product_list') {
            const count = metadata.catalog.productIds?.length || 0;
            if (count > 0) {
              return `Catalog • ${count} item${count === 1 ? '' : 's'}`;
            }
            return metadata.interactive?.bodyText || 'Catalog selection';
          }
          if (flowDetails?.summary) {
            const entries = Object.entries(flowDetails.summary).filter(([_, value]) => {
              if (value === null || value === undefined) return false;
              if (typeof value === 'string' && value.trim().length === 0) return false;
              if (Array.isArray(value) && value.length === 0) return false;
              if (
                typeof value === 'object' &&
                !Array.isArray(value) &&
                Object.keys(value as Record<string, unknown>).length === 0
              ) {
                return false;
              }
              return true;
            });

            if (entries.length > 0) {
              const preview = entries
                .slice(0, 2)
                .map(([key, value]) => `${humanizeFlowLabel(key)}: ${formatFlowValuePreview(value)}`)
                .filter((part) => part.trim().length > 0)
                .join(' • ');
              if (preview) {
                return preview;
              }
            }
          }
          if (flowDetails?.responseText) {
            return flowDetails.responseText;
          }
          if (flowDetails?.flowName) {
            return `Flow response • ${flowDetails.flowName}`;
          }
          if (flowDetails?.flowToken) {
            return `Flow response • ${flowDetails.flowToken}`;
          }
          return 'Interactive response';
        default:
          break;
      }
    }

    const text = message.text?.trim();
    return text || metadata?.textPreview || 'Start a conversation';
  };

  const getTemplateComponentSample = (component: any): string => {
    if (!component) return '';
    if (typeof component.text === 'string') return component.text;
    const example = component.example ?? {};
    if (Array.isArray(example.header_text) && example.header_text.length > 0) {
      return example.header_text[0];
    }
    if (Array.isArray(example.body_text) && example.body_text.length > 0) {
      return example.body_text[0];
    }
    if (Array.isArray(example.body_texts) && example.body_texts.length > 0) {
      return example.body_texts[0];
    }
    if (typeof example.text === 'string') {
      return example.text;
    }
    return '';
  };

  const renderMessageContent = (msg: ChatMsg) => {
    const metadata = msg.metadata || {};
    const segments: JSX.Element[] = [];
    const flowDetails = extractFlowSubmissionDetails(metadata);

    const whatsappType = metadata.whatsappType;
    const media = metadata.media;

    const buildMediaSrc = (mediaId?: string | null) => {
      if (!mediaId) return null;
      return `/api/whatsapp/media/${mediaId}`;
    };

    const flowSummaryEntries = flowDetails?.summary
      ? Object.entries(flowDetails.summary).filter(([_, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim().length === 0) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.keys(value as Record<string, unknown>).length === 0
        ) {
          return false;
        }
        return true;
      })
      : [];

    const flowSummaryElements = flowSummaryEntries
      .map(([key, value]) => {
        const formatted = formatFlowDetailValue(value);
        if (!formatted) return null;
        return (
          <div
            key={`flow-field-${key}`}
            className={cn(
              'rounded-lg border px-3 py-2',
              msg.direction === 'out'
                ? 'border-white/15 bg-white/5'
                : 'border-emerald-100 bg-emerald-50'
            )}
          >
            <div
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wide',
                msg.direction === 'out' ? 'text-white/70' : 'text-emerald-700'
              )}
            >
              {humanizeFlowLabel(key)}
            </div>
            <div
              className={cn(
                'mt-0.5 text-sm whitespace-pre-wrap leading-relaxed',
                msg.direction === 'out' ? 'text-white' : 'text-emerald-900'
              )}
            >
              {formatted}
            </div>
          </div>
        );
      })
      .filter((element): element is JSX.Element => element !== null);

    if (whatsappType && whatsappType !== 'text') {
      if (whatsappType === 'image' && (media?.id || media?.localUrl)) {
        const src = media?.localUrl || (media?.id ? buildMediaSrc(media.id) : null);
        segments.push(
          <div key="image" className="overflow-hidden rounded-xl border border-white/10 bg-black/10">
            {src ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={media.caption || 'Received image'}
                  className="max-h-80 w-full object-cover"
                />
              </>
            ) : (
              <div className="p-4 text-sm">Image attachment unavailable</div>
            )}
            {(media.caption || metadata.textPreview) && (
              <div className="px-3 py-2 text-sm whitespace-pre-wrap">
                {media.caption || metadata.textPreview}
              </div>
            )}
          </div>
        );
      } else if (whatsappType === 'video' && (media?.id || media?.localUrl)) {
        const src = media?.localUrl || (media?.id ? buildMediaSrc(media.id) : null);
        segments.push(
          <div key="video" className="overflow-hidden rounded-xl border border-white/10 bg-black/10">
            {src ? (
              <video controls className="w-full" src={src} />
            ) : (
              <div className="p-4 text-sm">Video attachment unavailable</div>
            )}
            {(media.caption || metadata.textPreview) && (
              <div className="px-3 py-2 text-sm whitespace-pre-wrap">
                {media.caption || metadata.textPreview}
              </div>
            )}
          </div>
        );
      } else if ((whatsappType === 'audio' || whatsappType === 'voice') && (media?.id || media?.localUrl)) {
        const src = media?.localUrl || (media?.id ? buildMediaSrc(media.id) : null);
        segments.push(
          <div key="audio" className="rounded-xl border border-white/10 bg-white/5 p-3">
            {src ? (
              <audio controls className="w-full" src={src} />
            ) : (
              <div className="text-sm">Audio attachment unavailable</div>
            )}
            {metadata.textPreview && (
              <p className="mt-2 text-xs opacity-80">{metadata.textPreview}</p>
            )}
          </div>
        );
      } else if (whatsappType === 'document' && (media?.id || media?.localUrl || media?.url)) {
        const src = media?.localUrl || (media?.id ? buildMediaSrc(media.id) : media?.url || null);
        segments.push(
          <a
            key="document"
            href={src || '#'}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors",
              msg.direction === 'out' ? 'border-white/20 hover:bg-white/10' : 'border-emerald-200 hover:bg-emerald-50'
            )}
          >
            <FileText className="h-4 w-4" />
            <div className="flex-1">
              <div className="font-medium">{media.filename || 'Document'}</div>
              {media.mimeType && (
                <div className="text-xs opacity-80">{media.mimeType}</div>
              )}
            </div>
          </a>
        );
      } else if (whatsappType === 'location' && metadata.location) {
        const { latitude, longitude, name, address } = metadata.location;
        const mapsUrl = metadata.location.url || `https://maps.google.com/?q=${latitude},${longitude}`;
        segments.push(
          <div key="location" className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="font-semibold text-sm">{name || 'Location shared'}</div>
            {address && <div className="text-xs opacity-80">{address}</div>}
            <div className="mt-2 text-xs">
              Lat: {latitude} • Lng: {longitude}
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium underline"
            >
              Open in Maps
            </a>
          </div>
        );
      } else if (whatsappType === 'contacts' && metadata.sharedContacts?.length) {
        segments.push(
          <div key="contacts" className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="font-semibold text-sm">Shared Contacts</div>
            {metadata.sharedContacts.map((contact, idx) => (
              <div key={idx} className="rounded-lg bg-white/10 px-3 py-2 text-xs">
                <div className="font-medium">
                  {contact?.name?.formatted_name || contact?.name?.first_name || 'Contact'}
                </div>
                {Array.isArray(contact?.phones) && contact.phones.length > 0 && (
                  <div className="mt-1">
                    {contact.phones.map((phone: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="opacity-70">{phone.type || 'phone'}:</span>
                        <span>{phone.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      } else if (whatsappType === 'interactive' && metadata.interactive) {
        const interactive = metadata.interactive;
        const interactiveType = (interactive.type || '').toLowerCase();
        const catalog = metadata.catalog;
        const isCatalog =
          catalog?.type === 'product' ||
          catalog?.type === 'product_list' ||
          interactiveType === 'product' ||
          interactiveType === 'product_list';

        if (isCatalog) {
          const resolvedCatalogType = catalog?.type || (interactiveType as 'product' | 'product_list');
          const resolvedBody =
            interactive.bodyText || metadata.textPreview || catalog?.productRetailerId || msg.text;
          const productIds = (() => {
            if (resolvedCatalogType === 'product') {
              return catalog?.productRetailerId ? [catalog.productRetailerId] : [];
            }
            return catalog?.productIds || [];
          })();

          segments.push(
            <div
              key="catalog"
              className={cn(
                'rounded-xl border p-3 text-sm',
                msg.direction === 'out'
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              )}
            >
              <div
                className={cn(
                  'font-semibold mb-1',
                  msg.direction === 'out' ? 'text-white' : 'text-emerald-900'
                )}
              >
                Catalog message
              </div>
              {resolvedBody && (
                <div className="whitespace-pre-wrap leading-relaxed">{resolvedBody}</div>
              )}
              {catalog?.catalogId && (
                <div className="mt-2 text-xs opacity-80">
                  Catalog ID: {catalog.catalogId}
                </div>
              )}
              {productIds.length > 0 && (
                <div className="mt-2 space-y-1">
                  {productIds.map((id, idx) => (
                    <div
                      key={`${id}-${idx}`}
                      className={cn(
                        'rounded border px-3 py-1 text-xs',
                        msg.direction === 'out' ? 'border-white/20 bg-white/10' : 'border-emerald-200 bg-white'
                      )}
                    >
                      {id}
                    </div>
                  ))}
                </div>
              )}
              {catalog?.sections && catalog.sections.length > 0 && (
                <div className="mt-3 space-y-2">
                  {catalog.sections.map((section, idx) => (
                    <div key={`catalog-section-${idx}`} className="space-y-1">
                      {section.title && (
                        <div className="text-xs uppercase tracking-wide opacity-70">
                          {section.title}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {section.productItems.map((itemId, itemIdx) => (
                          <span
                            key={`${itemId}-${itemIdx}`}
                            className={cn(
                              'rounded border px-2 py-0.5 text-[11px] font-medium',
                              msg.direction === 'out' ? 'border-white/20 text-white/90' : 'border-emerald-200 text-emerald-900'
                            )}
                          >
                            {itemId}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        } else {
          const hasSummary = flowSummaryElements.length > 0;
          segments.push(
            <div
              key="interactive"
              className={cn(
                'rounded-xl border p-3 text-sm',
                msg.direction === 'out'
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              )}
            >
              <div
                className={cn(
                  'font-semibold mb-1',
                  msg.direction === 'out' ? 'text-white' : 'text-emerald-900'
                )}
              >
                {flowDetails?.isFlowReply ? 'Flow submission' : 'Interactive response'}
              </div>
              {flowDetails?.flowName && (
                <div className="text-xs uppercase tracking-wide opacity-80">
                  {flowDetails.flowName}
                </div>
              )}
              {flowDetails?.responseText && (
                <div className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {flowDetails.responseText}
                </div>
              )}
              {interactive.buttonReply && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs uppercase opacity-70">Button</div>
                  <div>{interactive.buttonReply.title}</div>
                  {interactive.buttonReply.payload && (
                    <div className="mt-1 text-xs opacity-80">
                      Payload: {interactive.buttonReply.payload}
                    </div>
                  )}
                </div>
              )}
              {interactive.listReply && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs uppercase opacity-70">List selection</div>
                  <div>{interactive.listReply.title}</div>
                  {interactive.listReply.description && (
                    <div className="mt-1 text-xs opacity-80">{interactive.listReply.description}</div>
                  )}
                </div>
              )}
              {flowDetails?.flowToken && (
                <div className="mt-2 text-[11px] uppercase tracking-wide opacity-60">
                  Flow Token: {flowDetails.flowToken}
                </div>
              )}
              {hasSummary && (
                <div className="mt-3 space-y-2">{flowSummaryElements}</div>
              )}
              {!flowDetails?.isFlowReply && !interactive.buttonReply && !interactive.listReply && (
                <div className="text-xs opacity-70">No additional data captured.</div>
              )}
            </div>
          );
        }
      } else if (whatsappType === 'sticker' && media?.id) {
        const src = buildMediaSrc(media.id);
        segments.push(
          <div key="sticker" className="flex justify-center">
            {src ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Sticker" className="h-32 w-32" />
              </>
            ) : (
              <div className="p-4 text-sm">Sticker unavailable</div>
            )}
          </div>
        );
      }
    }

    const isTemplateMessage = Boolean(metadata.templateId || metadata.templateName);

    if (isTemplateMessage) {
      const variables = (metadata.variables as Record<string, any>) || {};
      const variableAny = variables as any;
      const components = metadata.components || [];
      const findComponent = (type: string) =>
        components.find((c: any) => (c?.type || c?.role || '')?.toString().toLowerCase() === type.toLowerCase());

      const headerComponent = findComponent('header');
      const footerComponent = findComponent('footer');
      const bodyComponent = findComponent('body');

      const headerTemplate = getTemplateComponentSample(headerComponent);
      const footerTemplate = getTemplateComponentSample(footerComponent);
      const bodyTemplate = getTemplateComponentSample(bodyComponent);

      const headerOverride = variableAny?.header?.text ?? variableAny?.header_text ?? variableAny?._header_text;
      const headerText = headerOverride || (headerTemplate ? substituteTemplate(headerTemplate, variables) : '');

      const bodyText = bodyTemplate ? substituteTemplate(bodyTemplate, variables) : (msg.text || '');

      const footerOverride = variableAny?.footer?.text ?? variableAny?.footer_text ?? variableAny?._footer_text;
      const footerText = footerTemplate ? substituteTemplate(footerTemplate, variables) : footerOverride;

      segments.push(
        <div key="template" className="space-y-2">
          <div className={cn(
            "flex items-center gap-2 text-xs uppercase tracking-wide font-semibold",
            msg.direction === 'out' ? 'text-white/80' : 'text-emerald-600'
          )}>
            <FileText className="h-3.5 w-3.5" />
            <span className="truncate">{metadata.templateName || metadata.templateId || 'Template'}</span>
          </div>

          {headerText && (
            <p className={cn(
              "text-sm font-semibold",
              msg.direction === 'out' ? 'text-white' : 'text-emerald-700'
            )}>
              {headerText}
            </p>
          )}

          <p className="text-sm whitespace-pre-wrap leading-relaxed">{bodyText || msg.text}</p>

          {footerText && (
            <p className={cn(
              "text-xs italic opacity-80",
              msg.direction === 'out' ? 'text-white/80' : 'text-muted-foreground'
            )}>
              {footerText}
            </p>
          )}
        </div>
      );
    } else {
      const textContent = metadata.textPreview || msg.text;
      const looksLikePlaceholder = typeof textContent === 'string'
        ? /^\s*\[[^\]]+\]\s*$/.test(textContent)
        : false;
      const shouldHidePlaceholder = looksLikePlaceholder && whatsappType && whatsappType !== 'text';

      if (textContent && !shouldHidePlaceholder) {
        segments.push(
          <p key="text" className="text-sm whitespace-pre-wrap leading-relaxed">
            {textContent}
          </p>
        );
      }
    }

    if (whatsappType !== 'interactive' && flowDetails?.isFlowReply && flowSummaryElements.length > 0) {
      segments.push(
        <div key="flow-summary" className="mt-2 space-y-2">
          {flowSummaryElements}
        </div>
      );
    }

    if (segments.length === 0) {
      return <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>;
    }

    return <div className="space-y-2">{segments}</div>;
  };

  const buildTemplateSubmission = (
    template: WhatsAppTemplate | undefined,
    stateVars: { [key: string]: string }
  ) => {
    const processed: Record<string, any> = {};
    const flowButtons = new Map<number, any>();
    const flowWarnings: Array<{ index: number; error: string }> = [];

    let documentLink: string | null = null;
    let documentFilename: string | null = null;
    let headerTextOverride: string | null = null;

    const bodyVarSet = new Set<string>();
    if (template) {
      const bodyVars = Array.isArray(template.variables) && template.variables.length > 0
        ? (template.variables as string[])
        : extractPlaceholders(template.body);
      bodyVars.forEach((v) => bodyVarSet.add(String(v)));

      const headerComponent = template.components?.find((c: any) => c.type === 'HEADER' || c.type === 'header');
      if (headerComponent?.text) {
        extractPlaceholders(headerComponent.text).forEach((v) => bodyVarSet.add(String(v)));
      }
    }

    Object.entries(stateVars).forEach(([key, rawValue]) => {
      if (rawValue === undefined || rawValue === null) {
        return;
      }
      const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
      if (value === '') {
        return;
      }

      if (key === '_header_image') {
        processed.headerImage = value;
        return;
      }

      if (key === '_header_video') {
        processed.header = {
          type: 'video',
          video: { link: value },
        };
        return;
      }

      if (key === '_header_document') {
        documentLink = value;
        return;
      }

      if (key === '_header_document_filename') {
        documentFilename = value;
        return;
      }

      if (key === '_header_text') {
        headerTextOverride = value;
        return;
      }

      const urlMatch = key.match(/^_button_(\d+)_url$/);
      if (urlMatch) {
        const idx = Number(urlMatch[1]);
        processed[`button${idx}`] = [value];
        return;
      }

      const flowMatch = key.match(/^_flow_(\d+)_(.+)$/);
      if (flowMatch) {
        const idx = Number(flowMatch[1]);
        const field = flowMatch[2];
        const existing = flowButtons.get(idx) || { index: idx };

        if (field === 'token') {
          existing.flow_token = value;
        } else if (field === 'id') {
          existing.flow_id = value;
        } else if (field === 'name') {
          existing.flow_name = value;
        } else if (field === 'cta') {
          existing.flow_cta = value;
        } else if (field === 'message_version') {
          existing.flow_message_version = value;
        } else if (field === 'action') {
          existing.flow_action = value;
        } else if (field === 'action_data') {
          existing._raw_action_data = value;
          if (typeof value === 'string' && value.trim().length > 0) {
            try {
              existing.flow_action_data = JSON.parse(value);
            } catch (err: any) {
              existing.flow_action_data = value;
              existing._action_data_error = err?.message || 'Invalid JSON';
            }
          }
        } else if (field === 'action_payload') {
          existing.flow_action_payload = value;
        } else if (field === 'token_label') {
          existing.flow_token_label = value;
        } else {
          existing[field] = value;
        }

        flowButtons.set(idx, existing);
        return;
      }

      if (bodyVarSet.has(key) || /^\d+$/.test(key)) {
        processed[key] = value;
        return;
      }

      processed[key] = value;
    });

    if (documentLink) {
      processed.header = {
        type: 'document',
        document: {
          link: documentLink,
          filename: documentFilename || 'document.pdf',
        },
      };
    } else if (headerTextOverride) {
      processed.header = {
        type: 'text',
        text: headerTextOverride,
      };
    }

    const flowButtonArray: Array<{ index: number; parameter: any; warnings?: string[] }> = [];

    flowButtons.forEach((flow, idx) => {
      const parameter: any = {
        type: 'flow',
        flow_token: flow.flow_token || `flow-${Date.now()}-${idx}`,
        flow_message_version: flow.flow_message_version || '3',
      };

      if (flow.flow_id) parameter.flow_id = flow.flow_id;
      if (flow.flow_name) parameter.flow_name = flow.flow_name;
      if (flow.flow_cta) parameter.flow_cta = flow.flow_cta;
      if (flow.flow_action) parameter.flow_action = flow.flow_action;
      if (flow.flow_action_data !== undefined && flow.flow_action_data !== '') {
        parameter.flow_action_data = flow.flow_action_data;
      }
      if (flow.flow_action_payload) {
        parameter.flow_action_payload = flow.flow_action_payload;
      }
      if (flow.flow_token_label) {
        parameter.flow_token_label = flow.flow_token_label;
      }

      if (flow._action_data_error) {
        flowWarnings.push({ index: idx, error: flow._action_data_error });
      }

      processed[`_flow_button_${idx}`] = parameter;
      flowButtonArray.push({
        index: idx,
        parameter,
        warnings: flow._action_data_error ? [flow._action_data_error] : undefined,
      });
    });

    return {
      variables: processed,
      flowButtons: flowButtonArray,
      warnings: flowWarnings,
    };
  };

  const orderTemplateVariableKeys = (keys: string[]) => {
    const body: string[] = [];
    const header: string[] = [];
    const button: string[] = [];
    const flow: string[] = [];
    const other: string[] = [];

    keys.forEach((key) => {
      if (key.startsWith('_flow_')) {
        flow.push(key);
      } else if (key.startsWith('_header')) {
        header.push(key);
      } else if (key.startsWith('_button_')) {
        button.push(key);
      } else if (key.startsWith('_')) {
        other.push(key);
      } else {
        body.push(key);
      }
    });

    return [...body, ...header, ...button, ...flow, ...other];
  };

  const formatVariableLabel = (variable: string) => {
    if (/^\d+$/.test(variable)) {
      return `Body Variable {{${variable}}}`;
    }

    if (variable.startsWith('_header_document')) {
      return variable.endsWith('filename') ? 'Header Document Filename' : 'Header Document URL';
    }

    if (variable === '_header_image') return 'Header Image URL';
    if (variable === '_header_video') return 'Header Video URL';
    if (variable === '_header_text') return 'Header Text';

    const buttonMatch = variable.match(/^_button_(\d+)_url$/);
    if (buttonMatch) {
      const idx = Number(buttonMatch[1]) + 1;
      return `Button ${idx} URL Parameter`;
    }

    const flowMatch = variable.match(/^_flow_(\d+)_(.+)$/);
    if (flowMatch) {
      const idx = Number(flowMatch[1]) + 1;
      const field = flowMatch[2]
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
      return `Flow Button ${idx} ${field}`;
    }

    return variable
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  };

  const variableHelperText = (variable: string): string | undefined => {
    if (variable === '_header_image') return 'Public HTTPS link to the header image.';
    if (variable === '_header_video') return 'Public HTTPS link to the header video.';
    if (variable === '_header_document') return 'Public HTTPS link to the document (PDF, etc.).';
    if (variable === '_header_document_filename') return 'Filename that will appear to the recipient (e.g., brochure.pdf).';

    const flowMatch = variable.match(/^_flow_(\d+)_(.+)$/);
    if (flowMatch) {
      const field = flowMatch[2];
      if (field === 'token') return 'Unique token for this flow invocation. Auto-generated but editable.';
      if (field === 'message_version') return 'Flow message version (default 3).';
      if (field === 'id') return 'Flow ID from WhatsApp Flows Manager.';
      if (field === 'name') return 'Human readable flow name for logging.';
      if (field === 'cta') return 'CTA label shown on the button.';
      if (field === 'action') return 'Optional flow action (navigate or data_exchange).';
      if (field === 'action_data') return 'JSON payload passed as flow_action_data.';
      if (field === 'action_payload') return 'Optional JSON payload for flow_action_payload.';
    }

    return undefined;
  };

  const isLongFormField = (variable: string) => /action_data|payload|json/i.test(variable);

  const getVariableUploadConfig = (variable: string) => {
    if (variable === '_header_document') {
      return {
        accept: 'application/pdf',
        label: 'PDF',
        description: 'Document'
      } as const;
    }
    if (variable === '_header_image') {
      return {
        accept: 'image/*',
        label: 'Image',
        description: 'Image'
      } as const;
    }
    return null;
  };

  const handleVariableFileUpload = useCallback(
    async (variable: string, file: File) => {
      const config = getVariableUploadConfig(variable);
      if (!config) {
        return;
      }

      if (file.size > INLINE_UPLOAD_MAX_BYTES) {
        toast.error(`File exceeds the ${INLINE_UPLOAD_MAX_MB} MB limit.`);
        return;
      }

      setVariableUploadState((prev) => ({
        ...prev,
        [variable]: { isLoading: true, error: undefined, fileName: file.name },
      }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/uploads/images', {
          method: 'POST',
          body: formData,
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || 'Upload failed');
        }

        const uploadedFile = Array.isArray(payload?.files) ? payload.files[0] : payload?.file;
        const secureUrl = uploadedFile?.secureUrl || uploadedFile?.secure_url || uploadedFile?.url;

        if (!secureUrl) {
          throw new Error('Upload response did not include a URL');
        }

        setTemplateVariables((prev) => ({
          ...prev,
          [variable]: secureUrl,
          ...(variable === '_header_document' && !prev['_header_document_filename']
            ? { _header_document_filename: file.name }
            : {}),
        }));

        toast.success(`${config.description} uploaded`);

        setVariableUploadState((prev) => ({
          ...prev,
          [variable]: { isLoading: false, error: undefined, fileName: file.name },
        }));
      } catch (error: any) {
        console.error('[template-variable-upload] Failed to upload media', error);
        toast.error(error?.message || 'Upload failed');
        setVariableUploadState((prev) => ({
          ...prev,
          [variable]: { isLoading: false, error: error?.message || 'Upload failed' },
        }));
      }
    },
    [setTemplateVariables]
  );

  const handleCopyVariableValue = useCallback(
    async (variable: string) => {
      const value = templateVariables[variable];
      if (!value) {
        toast.error('Nothing to copy');
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        toast.error('Clipboard not available');
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        toast.success('Link copied');
      } catch (error: any) {
        console.error('[template-variable-copy] Failed to copy URL', error);
        toast.error('Unable to copy the link');
      }
    },
    [templateVariables]
  );

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/whatsapp/messages?limit=${DEFAULT_MESSAGE_FETCH_LIMIT}`);
      const result = await response.json();
      if (result.success) {
        setMessages(result.messages);
        setMessageOffset(0);
        // Debug logging to track message types
        const outboundCount = result.messages.filter((m: any) => m.direction === 'outbound' || m.direction === 'out').length;
        const inboundCount = result.messages.filter((m: any) => m.direction === 'inbound' || m.direction === 'in').length;
        console.log('📨 Fetched messages:', result.messages.length, `(outbound: ${outboundCount}, inbound: ${inboundCount})`);
        result.messages.slice(0, 5).forEach((m: any, idx: number) => {
          console.log(`  [${idx}] direction=${m.direction}, to=${m.to}, message=${m.message?.substring(0, 50) || 'N/A'}`);
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  const fetchPreviousMessages = useCallback(async () => {
    setIsLoadingPreviousMessages(true);
    try {
      const newOffset = messageOffset + DEFAULT_MESSAGE_FETCH_LIMIT;
      const response = await fetch(`/api/whatsapp/messages?limit=${DEFAULT_MESSAGE_FETCH_LIMIT}&skip=${newOffset}`);
      const result = await response.json();
      if (result.success && result.messages.length > 0) {
        setMessages(prev => [...result.messages, ...prev]);
        setMessageOffset(newOffset);
        console.log('📨 Loaded previous messages:', result.messages.length);
        toast.success(`Loaded ${result.messages.length} previous message(s)`);
      } else {
        toast.success('No more previous messages');
      }
    } catch (error) {
      console.error('Error fetching previous messages:', error);
      toast.error('Failed to load previous messages');
    } finally {
      setIsLoadingPreviousMessages(false);
    }
  }, [messageOffset]);

  // Debug Logging Helper
  const addDebugLog = useCallback((type: 'info' | 'success' | 'error' | 'warning', action: string, details: any = {}) => {
    const log: DebugLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      action,
      details: typeof details === 'object' ? details : { value: details }
    };
    setDebugLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100 logs
  }, []);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
    addDebugLog('info', 'Debug logs cleared', { count: 0 });
  }, [addDebugLog]);

  const exportDebugLogs = () => {
    const logsText = debugLogs.map(log =>
      `[${log.timestamp.toISOString()}] [${log.type.toUpperCase()}] ${log.action}\n${JSON.stringify(log.details, null, 2)}`
    ).join('\n\n' + '='.repeat(80) + '\n\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-debug-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addDebugLog('success', 'Debug logs exported', { count: debugLogs.length });
  };

  const fetchCatalogSummary = useCallback(async () => {
    if (catalogsLoadingRef.current) return;
    catalogsLoadingRef.current = true;
    setCatalogsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/catalog');
      if (!response.ok) {
        throw new Error('Failed to load catalog summary');
      }
      const data = await response.json();
      if (Array.isArray(data.availableCatalogs)) {
        setCatalogOptions(data.availableCatalogs);
      }
      if (data?.defaultCatalogId) {
        setCatalogId((current) => current || data.defaultCatalogId);
      }
    } catch (error) {
      console.error('Error fetching catalog summary', error);
      toast.error('Unable to load catalog list');
    } finally {
      catalogsLoadingRef.current = false;
      setCatalogsLoading(false);
    }
  }, []);

  const fetchCatalogProducts = useCallback(async () => {
    if (catalogProductsLoadingRef.current) return;
    catalogProductsLoadingRef.current = true;
    setCatalogProductsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/catalog/packages?limit=200&includeVariants=false');
      if (!response.ok) {
        throw new Error('Failed to load catalog products');
      }
      const payload = await response.json();
      const options: CatalogProductOption[] = Array.isArray(payload?.data)
        ? payload.data
          .map((item: any) => {
            const retailerId = item?.retailerId || item?.product?.sku || item?.product?.retailerId;
            if (!retailerId) {
              return null;
            }
            const name = item?.title || item?.product?.name || 'Untitled product';
            return {
              id: item?.id || retailerId,
              name,
              retailerId: String(retailerId).trim(),
              sku: item?.product?.sku || null,
            } as CatalogProductOption;
          })
          .filter((option: CatalogProductOption | null): option is CatalogProductOption => Boolean(option))
        : [];

      const uniqueByRetailer = options.reduce<CatalogProductOption[]>((acc, option) => {
        if (!acc.some((entry) => entry.retailerId === option.retailerId)) {
          acc.push(option);
        }
        return acc;
      }, []);

      uniqueByRetailer.sort((a, b) => a.name.localeCompare(b.name));
      setCatalogProductOptions(uniqueByRetailer);
    } catch (error) {
      console.error('Error fetching catalog products', error);
      toast.error('Unable to load catalog products');
    } finally {
      catalogProductsLoadingRef.current = false;
      setCatalogProductsLoading(false);
    }
  }, []);

  const removePendingMedia = useCallback(() => {
    setPendingMedia((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
    setMediaUploadError(null);
  }, []);

  const handleMediaSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }

      if (selectedTemplate) {
        toast.error('Remove the selected template before attaching media.');
        return;
      }

      const lowerName = file.name?.toLowerCase() || '';
      let resolvedType: PendingMedia['type'] | null = null;

      if (file.type?.startsWith('image/')) {
        resolvedType = 'image';
      } else if (file.type === 'application/pdf') {
        resolvedType = 'document';
      } else if (['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
        resolvedType = 'document';
      } else if (lowerName.endsWith('.pdf')) {
        resolvedType = 'document';
      }

      if (!resolvedType) {
        setMediaUploadError('Only images and PDFs can be sent from the live chat right now.');
        toast.error('Only images and PDF documents are supported right now.');
        return;
      }

      const imageLimit = 16 * 1024 * 1024;
      const documentLimit = 25 * 1024 * 1024;
      if (resolvedType === 'image' && file.size > imageLimit) {
        setMediaUploadError('Images must be 16MB or smaller.');
        toast.error('Images must be 16MB or smaller.');
        return;
      }
      if (resolvedType === 'document' && file.size > documentLimit) {
        setMediaUploadError('Documents must be 25MB or smaller.');
        toast.error('Documents must be 25MB or smaller.');
        return;
      }

      setPendingMedia((current) => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl);
        }
        const previewUrl = URL.createObjectURL(file);
        return {
          file,
          previewUrl,
          type: resolvedType as PendingMedia['type'],
          mimeType: file.type || (resolvedType === 'document' ? 'application/pdf' : 'image/jpeg'),
          fileName: file.name || `attachment-${Date.now()}`,
          size: file.size,
        };
      });

      setMediaUploadError(null);
      addDebugLog('info', '🖇️ Media attached', {
        type: resolvedType,
        fileName: file.name,
        size: file.size,
      });

      toast.success(resolvedType === 'image' ? 'Image attached' : 'Document attached');
    },
    [selectedTemplate, addDebugLog]
  );

  const uploadPendingMedia = useCallback(
    async (media: PendingMedia, caption?: string): Promise<UploadedMediaResult> => {
      const formData = new FormData();
      formData.append('file', media.file, media.fileName);
      formData.append('type', media.type);
      formData.append('fileName', media.fileName);
      formData.append('mimeType', media.mimeType);
      formData.append('size', String(media.size));
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch('/api/whatsapp/media/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to upload media');
      }

      const result = json as UploadedMediaResult;
      addDebugLog('success', '✅ Media uploaded to WhatsApp', {
        mediaId: result.mediaId,
        type: result.type,
        fileName: result.fileName,
        size: result.size,
      });

      return result;
    },
    [addDebugLog]
  );

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/whatsapp/config');
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error('Error fetching WhatsApp config:', error);
      }
    };

    const fetchOrg = async () => {
      try {
        const res = await fetch('/api/settings/organization');
        const data = await res.json();
        setOrg({ id: data?.id, name: data?.name, logoUrl: data?.logoUrl });
      } catch (e) {
        // non-blocking
      }
    };

    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/whatsapp/templates');
        const data = await response.json();
        if (data.success) {
          setTemplates(data.templates);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchConfig();
    fetchMessages();
    fetchTemplates();
    fetchCatalogSummary();
    fetchOrg();

    // Auto-refresh messages every 10 seconds
    const messageRefreshInterval = setInterval(() => {
      fetchMessages();
    }, 10000);

    return () => {
      clearInterval(messageRefreshInterval);
    };
  }, [fetchMessages, fetchCatalogSummary]);

  useEffect(() => {
    if (!showCatalogComposer) {
      return;
    }

    if (!catalogsLoading && catalogOptions.length === 0) {
      fetchCatalogSummary();
    }

    if (!catalogProductsLoading && catalogProductOptions.length === 0) {
      fetchCatalogProducts();
    }

    setSelectedProductIds((prev) => {
      const parsed = catalogProductIds
        .split(/[\s,;]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      const unique = Array.from(new Set(parsed));
      if (prev.length === unique.length && prev.every((value, index) => value === unique[index])) {
        return prev;
      }
      return unique;
    });
  }, [showCatalogComposer, catalogsLoading, catalogOptions.length, catalogProductsLoading, catalogProductOptions.length, catalogProductIds, fetchCatalogSummary, fetchCatalogProducts]);

  // Simple delivery animation for preview bubble: none -> sent -> delivered -> read
  useEffect(() => {
    if (!phoneNumber && !selectedTemplate) return; // animate only when form has content
    setDeliveryStage(0);
    const t1 = setTimeout(() => setDeliveryStage(1), 500);
    const t2 = setTimeout(() => setDeliveryStage(2), 1000);
    const t3 = setTimeout(() => setDeliveryStage(3), 1500);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [phoneNumber, selectedTemplate]);

  // Initialize contacts & conversations from recent messages
  useEffect(() => {
    const buildContactsAndConvos = () => {
      if (!messages || messages.length === 0) {
        console.log('🚫 buildContactsAndConvos: No messages to process');
        return { contacts: [], convos: {} };
      }

      const contactMap: Record<string, Contact> = {};
      const convoMap: Record<string, ChatMsg[]> = {};

      // Debug: Log message breakdown
      const outboundMsgs = messages.filter(m => m.direction === 'outbound' || m.direction === 'out');
      const inboundMsgs = messages.filter(m => m.direction === 'inbound' || m.direction === 'in');
      console.log('🔍 buildContactsAndConvos processing', messages.length, `messages (outbound: ${outboundMsgs.length}, inbound: ${inboundMsgs.length})`);

      // Group messages by phone number
      messages.forEach((msg, msgIdx) => {
        const normalizedFrom = normalizeContactAddress(msg.from);
        const normalizedTo = normalizeContactAddress(msg.to);
        const baseMetadata = ((msg as any).metadata || {}) as ChatMsg['metadata'];

        const contactPhone = msg.direction === 'inbound'
          ? (normalizedFrom || normalizedTo)
          : (normalizedTo || normalizedFrom);

        // Debug: Log first few messages to understand phone normalization
        if (msgIdx < 3) {
          console.log(`  [Msg ${msgIdx}] dir=${msg.direction}, from=${msg.from}, to=${msg.to}`);
          console.log(`    normalized: from=${normalizedFrom}, to=${normalizedTo}, contactPhone=${contactPhone}`);
        }

        if (!contactPhone) {
          console.log(`  [Msg ${msgIdx}] SKIPPED: contactPhone is null or empty`);
          return;
        }

        // Check if message has an associated WhatsAppCustomer
        const whatsappCustomer = (msg as any).whatsappCustomer;
        const customerName = whatsappCustomer
          ? `${whatsappCustomer.firstName}${whatsappCustomer.lastName ? ' ' + whatsappCustomer.lastName : ''}`
          : null;

        const profileName = baseMetadata?.contactName;
        const displayName = customerName
          ? customerName
          : profileName
            ? profileName
            : msg.direction === 'inbound'
              ? formatContactLabel(msg.from)
              : formatContactLabel(msg.to);

        // Create contact if not exists
        if (!contactMap[contactPhone]) {
          contactMap[contactPhone] = {
            id: contactPhone,
            name: displayName,
            phone: contactPhone,
            avatarText: contactPhone.replace(/\D/g, '').slice(-2) || 'CT'
          };
        } else if ((customerName || profileName) && contactMap[contactPhone].name !== displayName) {
          // Update contact name if we have a customer name or profile name
          contactMap[contactPhone] = {
            ...contactMap[contactPhone],
            name: displayName,
          };
        }

        // Add message to conversation
        if (!convoMap[contactPhone]) {
          convoMap[contactPhone] = [];
        }

        // Extract readable message text and template metadata
        let messageText = msg.message || baseMetadata?.textPreview || '[No content]';
        let templateMetadata: ChatMsg['metadata'] = undefined;

        // Check if message has metadata with template info (cast to any to avoid TS error until Prisma regenerates)
        const msgMetadata = (msg as any).metadata;
        if (msgMetadata?.templateId || msgMetadata?.templateName) {
          const template = templates.find(t => t.id === msgMetadata.templateId || t.name === msgMetadata.templateName);
          const templateButtons = Array.isArray(msgMetadata?.buttons)
            ? msgMetadata.buttons
            : template?.whatsapp?.buttons;
          templateMetadata = {
            templateId: template?.id || msgMetadata?.templateId,
            templateName: template?.name || msgMetadata?.templateName,
            headerImage: msgMetadata?.headerImage || msgMetadata?.header?.image,
            buttons: templateButtons,
            flowButtons: Array.isArray(msgMetadata?.flowButtons) ? msgMetadata.flowButtons : undefined,
            components: template?.components || msgMetadata?.components,
            variables: msgMetadata?.variables,
          };
        }

        if (baseMetadata?.whatsappType && baseMetadata.whatsappType !== 'text') {
          switch (baseMetadata.whatsappType) {
            case 'image':
              messageText = baseMetadata.media?.caption || baseMetadata.textPreview || '📷 Image';
              break;
            case 'video':
              messageText = baseMetadata.media?.caption || '🎞️ Video';
              break;
            case 'audio':
              messageText = '🎧 Audio message';
              break;
            case 'document':
              messageText = baseMetadata.media?.filename || '📄 Document';
              break;
            case 'sticker':
              messageText = '🩵 Sticker';
              break;
            case 'location':
              messageText = baseMetadata.location?.name
                ? `📍 ${baseMetadata.location.name}`
                : '📍 Location shared';
              break;
            case 'contacts':
              {
                const contactCount = baseMetadata.sharedContacts?.length || 1;
                messageText = contactCount > 1 ? `👥 Shared ${contactCount} contacts` : '👤 Shared contact';
              }
              break;
            case 'interactive':
              if (baseMetadata.catalog?.type === 'product') {
                const label = baseMetadata.catalog.productRetailerId || baseMetadata.textPreview || 'Catalog product';
                messageText = `🛍️ Catalog • ${label}`;
                break;
              }
              if (baseMetadata.catalog?.type === 'product_list') {
                const count = baseMetadata.catalog.productIds?.length || 0;
                messageText = count > 0
                  ? `🛍️ Catalog • ${count} item${count === 1 ? '' : 's'}`
                  : '🛍️ Catalog shared';
                break;
              }
              if (baseMetadata.interactive?.buttonReply?.title) {
                messageText = `↩️ Button reply: ${baseMetadata.interactive.buttonReply.title}`;
              } else if (baseMetadata.interactive?.listReply?.title) {
                messageText = `📋 List reply: ${baseMetadata.interactive.listReply.title}`;
              } else {
                messageText = '🧾 Interactive response';
              }
              break;
            default:
              messageText = baseMetadata.textPreview || messageText;
          }
        }

        // If message is in old template ID format like [template:HXa7...], try to make it readable
        if (messageText.startsWith('[template:')) {
          const templateId = messageText.match(/\[template:([^\]]+)\]/)?.[1];
          if (templateId) {
            const template = templates.find(t => t.id === templateId);
            if (template) {
              messageText = template.body;
              templateMetadata = {
                templateId: template.id,
                templateName: template.name,
                buttons: template.whatsapp?.buttons,
                components: template.components,
              };
            } else {
              messageText = `Template: ${templateId}`;
            }
          }
        }

        const mergedMetadata: ChatMsg['metadata'] = {
          ...(baseMetadata || {}),
          ...(templateMetadata || {}),
        };

        convoMap[contactPhone].push({
          id: msg.id || msg.messageSid || `msg-${Math.random()}`,
          text: messageText,
          direction: msg.direction === 'inbound' ? 'in' : 'out',
          ts: new Date(msg.createdAt).getTime(),
          status: msg.status === 'delivered' ? 2 : msg.status === 'read' ? 3 : msg.status === 'sent' ? 1 : 0,
          metadata: mergedMetadata
        });
      });

      // Sort messages in each conversation by timestamp
      Object.keys(convoMap).forEach(phone => {
        convoMap[phone].sort((a, b) => a.ts - b.ts);
      });

      // Convert contacts to array and sort by most recent message
      const contactsList = sortContactsByRecent(Object.values(contactMap), convoMap);

      // Debug: Log built conversations
      console.log('✅ Built', contactsList.length, 'contacts with convos');

      // Categorize contacts
      const templateOnlyContacts = contactsList.filter(c => {
        const convo = convoMap[c.id] || [];
        return convo.every(m => m.direction === 'out');
      });
      const twoWayContacts = contactsList.filter(c => {
        const convo = convoMap[c.id] || [];
        return convo.some(m => m.direction === 'in');
      });

      console.log(`  📊 Breakdown: ${twoWayContacts.length} two-way, ${templateOnlyContacts.length} template-only`);

      contactsList.slice(0, 10).forEach(contact => {
        const convo = convoMap[contact.id] || [];
        const outboundInConvo = convo.filter(m => m.direction === 'out').length;
        const inboundInConvo = convo.filter(m => m.direction === 'in').length;
        console.log(`  - ${contact.name} (${contact.phone}): ${convo.length} messages (out: ${outboundInConvo}, in: ${inboundInConvo})`);
      });

      return {
        contacts: contactsList,
        convos: convoMap
      };
    };

    const { contacts: newContacts, convos: newConvos } = buildContactsAndConvos();

    const pendingManualContacts = Object.values(manualContactsRef.current);
    if (pendingManualContacts.length > 0) {
      let needsResort = false;
      pendingManualContacts.forEach(contact => {
        const hasRealMessages = (newConvos[contact.id]?.length ?? 0) > 0;
        if (hasRealMessages) {
          delete manualContactsRef.current[contact.id];
          return;
        }

        if (!newConvos[contact.id]) {
          newConvos[contact.id] = [];
        }

        if (!newContacts.some(c => c.id === contact.id)) {
          newContacts.push(contact);
          needsResort = true;
        }
      });

      if (needsResort) {
        sortContactsByRecent(newContacts, newConvos);
      }
    }

    if (newContacts.length > 0) {
      setContacts(newContacts);
      setConvos(newConvos);

      let resolvedActiveId = activeId;
      if (!resolvedActiveId || !newContacts.some(c => c.id === resolvedActiveId)) {
        resolvedActiveId = newContacts[0].id;
        const history = newConvos[resolvedActiveId] || [];
        const lastTs = history.length > 0 ? history[history.length - 1].ts : Date.now();
        lastReadMapRef.current[resolvedActiveId] = lastTs;
        setActiveId(resolvedActiveId);
      }

      const unreadSummary: Record<string, number> = {};
      newContacts.forEach(contact => {
        const history = newConvos[contact.id] || [];
        if (!history.length) {
          return;
        }
        const lastReadTs = lastReadMapRef.current[contact.id] ?? 0;
        const unread = history.reduce((count, msg) => (
          msg.direction === 'in' && msg.ts > lastReadTs ? count + 1 : count
        ), 0);
        if (unread > 0) {
          unreadSummary[contact.id] = unread;
        }
      });
      setUnreadCounts(unreadSummary);

      setVisibleMessageCounts(prev => {
        let changed = false;
        const next: Record<string, number> = { ...prev };

        // Ensure every contact has an entry with at least the initial count
        newContacts.forEach(contact => {
          const history = newConvos[contact.id] || [];
          const desired = Math.min(INITIAL_VISIBLE_MESSAGES, history.length || INITIAL_VISIBLE_MESSAGES);
          if (!next[contact.id]) {
            next[contact.id] = desired || INITIAL_VISIBLE_MESSAGES;
            changed = true;
          }
        });

        // Remove entries for contacts no longer present
        Object.keys(next).forEach(key => {
          if (!newContacts.some(contact => contact.id === key)) {
            delete next[key];
            changed = true;
          }
        });

        return changed ? next : prev;
      });

      console.log('✅ Loaded contacts:', newContacts.length);
      console.log('✅ Conversations:', Object.keys(newConvos).length);
      console.log('✅ Contact IDs:', newContacts.map(c => c.id));
      console.log('📊 Contact details:', newContacts.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        msgCount: newConvos[c.id]?.length || 0
      })));
    } else {
      // Clear contacts if no messages
      setContacts([]);
      setConvos({});
      setUnreadCounts({});
      setVisibleMessageCounts({});
      console.log('⚠️ No contacts to display');
    }
  }, [messages, templates, activeId, sortContactsByRecent]);

  const activeContact = contacts.find(c => c.id === activeId) || null;

  useEffect(() => {
    const normalizedPhone = normalizeContactAddress(activeContact?.phone);
    if (normalizedPhone) {
      setCatalogRecipient(normalizedPhone);
    } else if (!activeContact?.phone) {
      setCatalogRecipient('');
    }
  }, [activeContact?.phone]);

  const activeContactId = activeContact?.id;
  const activeContactMessages = useMemo(() => {
    if (!activeContactId) {
      return [];
    }
    return convos[activeContactId] || [];
  }, [activeContactId, convos]);

  const activeVisibleCount = activeContactId
    ? (visibleMessageCounts[activeContactId] ?? Math.min(
      INITIAL_VISIBLE_MESSAGES,
      activeContactMessages.length || INITIAL_VISIBLE_MESSAGES
    ))
    : INITIAL_VISIBLE_MESSAGES;

  const activeVisibleMessages = useMemo(
    () => activeContactMessages.slice(-activeVisibleCount),
    [activeContactMessages, activeVisibleCount]
  );
  const hasMoreActiveMessages = activeContactMessages.length > activeVisibleMessages.length;

  // Debug: Log active conversation state
  useEffect(() => {
    if (activeContact) {
      console.log(`📱 Active contact: ${activeContact.name} (${activeContact.phone})`);
      console.log(`  Total messages in conversation: ${activeContactMessages.length}`);
      console.log(`  Visible count: ${activeVisibleCount}`);
      console.log(`  Currently showing: ${activeVisibleMessages.length} messages`);
      if (activeContactMessages.length > 0) {
        const outbound = activeContactMessages.filter(m => m.direction === 'out').length;
        const inbound = activeContactMessages.filter(m => m.direction === 'in').length;
        console.log(`  Message breakdown - Outbound: ${outbound}, Inbound: ${inbound}`);
      }
    }
  }, [activeContact, activeContactMessages, activeVisibleCount, activeVisibleMessages]);

  useEffect(() => {
    if (!activeId) {
      return;
    }

    const history = convos[activeId] || [];

    if (history.length === 0) {
      setUnreadCounts(prev => {
        if (!prev[activeId]) return prev;
        const next = { ...prev };
        delete next[activeId];
        return next;
      });
      return;
    }

    const latestTimestamp = history[history.length - 1].ts;
    if ((lastReadMapRef.current[activeId] ?? 0) < latestTimestamp) {
      lastReadMapRef.current[activeId] = latestTimestamp;
    }

    setUnreadCounts(prev => {
      if (!prev[activeId]) return prev;
      const next = { ...prev };
      delete next[activeId];
      return next;
    });
  }, [activeId, convos]);
  const shouldShowTemplateDialog = showTemplatePreview && !!selectedTemplate;
  const orderedTemplateVariableKeys = orderTemplateVariableKeys(Object.keys(templateVariables));

  const activeTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedTemplate),
    [templates, selectedTemplate]
  );

  const templateFlowDefaults = useMemo(() => {
    const defaults = activeTemplate?.flowDefaults;
    return Array.isArray(defaults) ? defaults : [];
  }, [activeTemplate]);

  const flowDefaultsIndexMap = useMemo(() => {
    const map = new Map<number, WhatsAppFlowButtonDefault>();
    templateFlowDefaults.forEach((entry) => {
      if (entry && typeof entry === 'object' && typeof entry.index === 'number') {
        map.set(entry.index, entry);
      }
    });
    return map;
  }, [templateFlowDefaults]);

  const flowDefaultsTextMap = useMemo(() => {
    const map = new Map<string, WhatsAppFlowButtonDefault>();
    templateFlowDefaults.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const text = (entry as WhatsAppFlowButtonDefault).text;
      if (typeof text === 'string' && text.trim()) {
        map.set(text.trim(), entry);
      }
    });
    return map;
  }, [templateFlowDefaults]);

  const templateFlowButtons = useMemo(
    () => activeTemplate?.whatsapp?.buttons?.filter((btn) => btn.type === 'FLOW') ?? [],
    [activeTemplate]
  );

  const resolveFlowDefaults = useCallback(
    (flowIndex: number, button?: WhatsAppTemplateButton | undefined) => {
      const candidates: Array<WhatsAppFlowButtonDefault | undefined> = [];
      if (typeof flowIndex === 'number') {
        candidates.push(flowDefaultsIndexMap.get(flowIndex));
      }
      if (button) {
        const buttonIndex = typeof button.index === 'number' ? button.index : undefined;
        if (typeof buttonIndex === 'number') {
          candidates.push(flowDefaultsIndexMap.get(buttonIndex));
        }
        if (button.text && button.text.trim()) {
          candidates.push(flowDefaultsTextMap.get(button.text.trim()));
        }
      }
      return candidates.find((candidate) => candidate && typeof candidate === 'object');
    },
    [flowDefaultsIndexMap, flowDefaultsTextMap]
  );

  const flowVariableGroups = useMemo(
    () => {
      const groups = new Map<number, string[]>();
      orderedTemplateVariableKeys.forEach((key) => {
        const match = key.match(/^_flow_(\d+)_/);
        if (!match) return;
        const idx = Number(match[1]);
        const existing = groups.get(idx) || [];
        existing.push(key);
        groups.set(idx, existing);
      });
      return Array.from(groups.entries()).map(([index, variables]) => ({ index, variables }));
    },
    [orderedTemplateVariableKeys]
  );

  const standardVariableKeys = useMemo(
    () => orderedTemplateVariableKeys.filter((key) => !key.startsWith('_flow_')),
    [orderedTemplateVariableKeys]
  );

  const requiredTemplateVariableKeys = useMemo(() => {
    return orderedTemplateVariableKeys.filter((key) => {
      if (key.startsWith('_flow_')) {
        if (/_(action|action_data|action_payload)$/.test(key)) {
          return false;
        }
        if (/_token_label$/.test(key)) {
          return false;
        }
        return true;
      }
      if (key.startsWith('_header_')) {
        // Only require the media/text value, not helper fields like filename
        return !key.endsWith('_filename');
      }
      return true;
    });
  }, [orderedTemplateVariableKeys]);

  const missingRequiredTemplateKeys = useMemo(() => {
    return requiredTemplateVariableKeys.filter((key) => {
      const value = templateVariables[key];
      if (value === undefined || value === null) {
        return true;
      }
      if (typeof value === 'string' && value.trim() === '') {
        return true;
      }
      return false;
    });
  }, [requiredTemplateVariableKeys, templateVariables]);

  const hasMissingRequiredTemplateVars = missingRequiredTemplateKeys.length > 0;

  const flowFieldPriority = (variable: string) => {
    const match = variable.match(/^_flow_\d+_(.+)$/);
    if (!match) return 99;
    const order = [
      'token',
      'token_label',
      'message_version',
      'id',
      'name',
      'cta',
      'action',
      'action_payload',
      'action_data',
    ];
    const field = match[1];
    const idx = order.indexOf(field);
    return idx === -1 ? order.length + 1 : idx;
  };

  const renderVariableControl = (
    variable: string,
    options: {
      idPrefix?: string;
      textareaRows?: number;
      helperClassName?: string;
      labelClassName?: string;
    } = {}
  ) => {
    const helper = variableHelperText(variable);
    const fieldId = `${options.idPrefix ?? 'var'}-${variable}`;
    const currentValue = templateVariables[variable] ?? '';
    const isLongField = isLongFormField(variable);
    const label = formatVariableLabel(variable);
    const textareaRows = options.textareaRows ?? (isLongField ? 6 : 4);
    const uploadConfig = getVariableUploadConfig(variable);
    const uploadState = variableUploadState[variable];

    return (
      <div key={variable} className="space-y-1.5">
        <Label htmlFor={fieldId} className={cn('text-sm font-medium', options.labelClassName)}>
          {label}
        </Label>
        {isLongField ? (
          <Textarea
            id={fieldId}
            placeholder={`Enter ${label.toLowerCase()}`}
            value={currentValue}
            onChange={(e) =>
              setTemplateVariables((prev) => ({
                ...prev,
                [variable]: e.target.value,
              }))
            }
            rows={textareaRows}
            className="mt-1 font-mono"
          />
        ) : (
          <Input
            id={fieldId}
            placeholder={`Enter value for ${label}`}
            value={currentValue}
            onChange={(e) =>
              setTemplateVariables((prev) => ({
                ...prev,
                [variable]: e.target.value,
              }))
            }
            className="mt-1"
            autoComplete="off"
          />
        )}
        {helper && (
          <p className={cn('text-xs text-muted-foreground', options.helperClassName)}>{helper}</p>
        )}
        {uploadConfig && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <input
              type="file"
              accept={uploadConfig.accept}
              ref={(element) => {
                if (element) {
                  variableFileInputsRef.current[variable] = element;
                } else {
                  delete variableFileInputsRef.current[variable];
                }
              }}
              className="hidden"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile) {
                  handleVariableFileUpload(variable, selectedFile);
                }
                event.target.value = '';
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => variableFileInputsRef.current[variable]?.click()}
              disabled={uploadState?.isLoading}
            >
              {uploadState?.isLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-1.5 h-4 w-4" />
                  Upload {uploadConfig.label}
                </>
              )}
            </Button>
            {currentValue && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-emerald-700 hover:text-emerald-600 dark:text-emerald-300"
                onClick={() => handleCopyVariableValue(variable)}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy URL
              </Button>
            )}
            <span className="text-muted-foreground">
              Stored in Media Library · Max {INLINE_UPLOAD_MAX_MB} MB
            </span>
          </div>
        )}
        {uploadState?.error && (
          <p className="text-xs text-destructive">{uploadState.error}</p>
        )}
      </div>
    );
  };

  const regenerateFlowTokens = useCallback(
    (flowIndex?: number) => {
      if (flowVariableGroups.length === 0) return;

      setTemplateVariables((prev) => {
        const next = { ...prev };
        const stamp = Date.now();
        const buildToken = (idx: number) => {
          const targetGroup = flowVariableGroups.find((group) => group.index === idx);
          const hasTokenField = targetGroup?.variables.some((variable) => variable.endsWith('_token'));
          if (!hasTokenField) return;
          const token =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `flow-${stamp}-${idx}-${Math.floor(Math.random() * 1000)}`;
          next[`_flow_${idx}_token`] = token;
        };

        if (typeof flowIndex === 'number') {
          buildToken(flowIndex);
        } else {
          flowVariableGroups.forEach((group) => buildToken(group.index));
        }

        return next;
      });

      toast.success(
        typeof flowIndex === 'number' ? 'Flow token regenerated' : 'Flow tokens refreshed'
      );
    },
    [flowVariableGroups]
  );

  const applyFlowDefaults = useCallback(
    (flowIndex: number) => {
      const btn = templateFlowButtons[flowIndex];
      const group = flowVariableGroups.find((g) => g.index === flowIndex);
      if (!group) {
        toast.error('No flow fields available for this template');
        return;
      }

      const defaults = resolveFlowDefaults(flowIndex, btn) || undefined;
      const defaultAction = defaults?.action;

      setTemplateVariables((prev) => {
        const next = { ...prev };

        group.variables.forEach((variable) => {
          const match = variable.match(/^_flow_\d+_(.+)$/);
          if (!match) {
            return;
          }
          const field = match[1];

          const assign = (value: any, fallback?: string) => {
            if (value === undefined || value === null) {
              if (fallback !== undefined) {
                next[variable] = fallback;
              }
              return;
            }
            if (typeof value === 'object') {
              next[variable] = JSON.stringify(value, null, 2);
            } else {
              next[variable] = String(value);
            }
          };

          switch (field) {
            case 'token': {
              const defaultToken =
                btn?.flowToken ||
                (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                  ? crypto.randomUUID()
                  : `flow-${Date.now()}-${flowIndex}`);
              assign(defaultToken);
              break;
            }
            case 'message_version':
              assign(
                defaultAction?.flow_message_version ??
                btn?.flowMessageVersion ??
                next[variable] ??
                '3'
              );
              break;
            case 'id':
              assign(defaultAction?.flow_id ?? btn?.flowId ?? next[variable]);
              break;
            case 'name':
              assign(
                defaultAction?.flow_name ??
                btn?.flowName ??
                btn?.text ??
                next[variable]
              );
              break;
            case 'cta':
              assign(
                defaultAction?.flow_cta ??
                btn?.flowCta ??
                btn?.text ??
                next[variable]
              );
              break;
            case 'action':
              assign(defaultAction?.flow_action ?? btn?.flowAction ?? next[variable]);
              break;
            case 'action_data':
              assign(defaultAction?.flow_action_data ?? btn?.flowActionData ?? next[variable]);
              break;
            case 'action_payload':
              assign(
                defaultAction?.flow_action_payload ??
                (btn as any)?.flowActionPayload ??
                next[variable]
              );
              break;
            case 'token_label':
              assign(
                defaultAction?.flow_token_label ??
                (btn as any)?.flowTokenLabel ??
                next[variable]
              );
              break;
            case 'redirect_url':
              assign(
                defaultAction?.flow_redirect_url ??
                btn?.flowRedirectUrl ??
                next[variable]
              );
              break;
            default:
              if (defaultAction && field in defaultAction) {
                assign((defaultAction as any)[field] ?? next[variable]);
              } else {
                assign(next[variable]);
              }
          }
        });

        return next;
      });

      toast.success('Flow defaults applied');
    },
    [flowVariableGroups, templateFlowButtons, resolveFlowDefaults]
  );

  // Auto-scroll to bottom when messages change or active contact changes
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [convos, activeId]);

  const sendPreviewMessage = () => {
    if (!activeContact) {
      addDebugLog('error', '❌ No Active Contact', { action: 'send_attempt_blocked' });
      return;
    }

    if (selectedTemplate && pendingMedia) {
      toast.error('Remove the attachment before sending a template message.');
      addDebugLog('warning', '⚠️ Attachment blocked for template send', {});
      return;
    }

    addDebugLog('info', '📤 Send Message Initiated', {
      contactName: activeContact.name,
      contactPhone: activeContact.phone,
      hasTemplate: !!selectedTemplate,
      templateId: selectedTemplate || null,
    });

    const selectedTemplateId = selectedTemplate;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    const hasVars = tpl && (Array.isArray(tpl.variables) ? tpl.variables.length > 0 : Object.keys(extractPlaceholders(tpl.body)).length > 0);

    if (selectedTemplateId && hasVars && Object.values(templateVariables).some((v) => !v)) {
      addDebugLog('warning', '⚠️ Template Variables Not Filled', {
        templateId: selectedTemplateId,
        templateName: tpl?.name,
        requiredVariables: Object.keys(templateVariables),
        filledVariables: Object.entries(templateVariables)
          .filter(([_, v]) => v)
          .map(([k]) => k),
        missingVariables: Object.entries(templateVariables)
          .filter(([_, v]) => !v)
          .map(([k]) => k),
      });
      return;
    }

    const base = selectedTemplateId ? tpl?.body || '' : message || '';
    const composedText = selectedTemplateId ? substituteTemplate(base, templateVariables) : base;
    const trimmedText = composedText.trim();
    const mediaToSend = pendingMedia;

    if (!trimmedText && !mediaToSend) {
      addDebugLog('error', '❌ Empty Message', { action: 'send_blocked' });
      return;
    }

    addDebugLog('info', '📝 Message Text Prepared', {
      isTemplate: !!selectedTemplateId,
      originalText: base,
      substitutedText: composedText,
      variablesUsed: selectedTemplateId ? Object.keys(templateVariables) : [],
    });

    const submission = selectedTemplateId && tpl
      ? buildTemplateSubmission(tpl, templateVariables)
      : { variables: {}, flowButtons: [], warnings: [] };
    const processedVariables = submission.variables;

    addDebugLog('info', '🔄 Template Variables Transformed', {
      keys: Object.keys(processedVariables),
      flowButtonCount: submission.flowButtons.length,
      headerIncluded: Boolean(processedVariables.header || processedVariables.headerImage),
    });

    submission.warnings?.forEach(({ index, error }) => {
      addDebugLog('warning', '⚠️ Flow Action Data Warning', { buttonIndex: index, error });
    });

    const templateMetadata = selectedTemplateId && tpl
      ? {
        templateId: tpl.id,
        templateName: tpl.name,
        headerImage: processedVariables.headerImage || templateVariables['_header_image'],
        buttons: tpl.whatsapp?.buttons || [],
        components: tpl.components || [],
        flowButtons: submission.flowButtons,
        variables: processedVariables,
      }
      : undefined;

    if (templateMetadata) {
      addDebugLog('info', '🎨 Template Metadata Built', {
        templateId: templateMetadata.templateId,
        templateName: templateMetadata.templateName,
        hasHeaderImage: !!templateMetadata.headerImage,
        buttonCount: templateMetadata.buttons.length,
        componentCount: templateMetadata.components.length,
        components: templateMetadata.components.map((c: any) => c.type),
      });
    }

    const fallbackPreview = mediaToSend
      ? mediaToSend.type === 'image'
        ? '📷 Image attachment'
        : `📄 ${mediaToSend.fileName}`
      : '';
    const textPreview = trimmedText || fallbackPreview || undefined;
    const displayText = trimmedText || fallbackPreview || composedText || '[message]';

    const localMetadata: ChatMsgMetadata = {
      ...(templateMetadata || {}),
      textPreview,
    };

    if (mediaToSend) {
      localMetadata.whatsappType = mediaToSend.type;
      localMetadata.media = {
        filename: mediaToSend.fileName,
        mimeType: mediaToSend.mimeType,
        caption: trimmedText || undefined,
        size: mediaToSend.size,
        localUrl: mediaToSend.previewUrl,
      };
    }

    setMessage('');
    if (selectedTemplateId) {
      setSelectedTemplate('');
      setTemplateVariables({});
      setShowTemplatePreview(false);
      addDebugLog('info', '🧹 Template Selection Cleared', { templateId: selectedTemplateId });
    }
    if (mediaToSend) {
      setPendingMedia(null);
      setMediaUploadError(null);
    }

    const id = `m${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    addDebugLog('success', '✅ Message Added to UI', {
      messageId: id,
      timestamp: now,
      direction: 'out',
      hasMetadata: !!(templateMetadata || mediaToSend),
    });

    setConvos((prev) => {
      const arr = prev[activeContact.id] ? [...prev[activeContact.id]] : [];
      arr.push({
        id,
        text: displayText,
        direction: 'out',
        ts: now,
        status: 0,
        metadata: localMetadata,
      });
      return { ...prev, [activeContact.id]: arr };
    });
    // Animate status per message id
    setTimeout(
      () =>
        setConvos((p) => ({
          ...p,
          [activeContact.id]: p[activeContact.id].map((m) =>
            m.id === id ? { ...m, status: 1 } : m
          ),
        })),
      400
    );
    setTimeout(
      () =>
        setConvos((p) => ({
          ...p,
          [activeContact.id]: p[activeContact.id].map((m) =>
            m.id === id ? { ...m, status: 2 } : m
          ),
        })),
      900
    );
    setTimeout(
      () =>
        setConvos((p) => ({
          ...p,
          [activeContact.id]: p[activeContact.id].map((m) =>
            m.id === id ? { ...m, status: 3 } : m
          ),
        })),
      1400
    );

    if (liveSend) {
      addDebugLog('info', '🌐 Live Send Enabled - Preparing API Call', {
        liveSendStatus: true,
        recipientPhone: activeContact.phone,
      });

      setSendingLive(true);
      const to = activeContact.phone;
      (async () => {
        try {
          if (selectedTemplateId) {
            if (!tpl) {
              throw new Error('Selected template not found');
            }
            const apiPayload = {
              to,
              templateId: tpl.id,
              templateName: tpl.name,
              templateBody: tpl.body,
              languageCode: tpl.language || 'en_US',
              variables: processedVariables,
              saveToDb: true,
              metadata: {
                templateId: tpl.id,
                templateName: tpl.name,
                sentFrom: 'chat_interface',
                flowButtons: submission.flowButtons,
              },
            };

            addDebugLog('info', '📦 API Payload Constructed', {
              endpoint: '/api/whatsapp/send-template',
              payload: apiPayload,
            });

            const res = await fetch('/api/whatsapp/send-template', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apiPayload),
            });
            const j = await res.json();
            if (!res.ok || j?.success === false) {
              const errorPayload: any = j?.error ?? j?.errors ?? j;
              const displayMessage =
                errorPayload?.displayMessage ||
                errorPayload?.message ||
                errorPayload?.error ||
                'Failed to send message';
              const errorMsg =
                errorPayload?.message ||
                errorPayload?.error ||
                j?.message ||
                displayMessage;

              addDebugLog('error', '❌ Live Send API Error', {
                status: res.status,
                statusText: res.statusText,
                errorPayload,
              });

              toast.error(displayMessage, { duration: 6000 });
              throw new Error(errorMsg);
            }

            addDebugLog('success', '✅ Text Message Sent Successfully!', {
              messageId: j.messageId || j.messageSid,
              dbRecordId: j.dbRecord?.id,
              dbRecordDirection: j.dbRecord?.direction,
              timestamp: new Date().toISOString(),
            });

            console.log('🔄 Sent successfully, scheduling fetchMessages in 1 second...');
            toast.success('Message sent');
            setTimeout(() => {
              console.log('⏱️ 1 second elapsed, calling fetchMessages()...');
              fetchMessages();
            }, 1000);
          } else {
            if (mediaToSend) {
              addDebugLog('info', '📎 Sending media message', {
                to,
                fileName: mediaToSend.fileName,
                size: mediaToSend.size,
              });
            } else {
              addDebugLog('info', '💬 Sending regular text message', {
                to,
                messageLength: composedText.length,
              });
            }

            const payload: Record<string, any> = {
              to,
              saveToDb: true,
            };

            let metadataForApi: ChatMsgMetadata | undefined;

            if (mediaToSend) {
              setIsUploadingMedia(true);
              try {
                const uploadResult = await uploadPendingMedia(mediaToSend, trimmedText);
                payload.media = {
                  id: uploadResult.mediaId,
                  type: mediaToSend.type,
                  caption: trimmedText || undefined,
                  filename: mediaToSend.fileName,
                };
                if (trimmedText) {
                  payload.message = trimmedText;
                }
                metadataForApi = {
                  whatsappType: mediaToSend.type,
                  media: {
                    id: uploadResult.mediaId,
                    filename: mediaToSend.fileName,
                    mimeType: mediaToSend.mimeType,
                    caption: trimmedText || undefined,
                    size: mediaToSend.size,
                  },
                  textPreview: textPreview || displayText,
                };
              } finally {
                setIsUploadingMedia(false);
              }
            } else {
              payload.message = composedText;
              if (templateMetadata || textPreview) {
                metadataForApi = {
                  ...(templateMetadata || {}),
                  ...(textPreview ? { textPreview } : {}),
                };
              }
            }

            if (metadataForApi) {
              payload.metadata = metadataForApi;
            }

            const res = await fetch('/api/whatsapp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const j = await res.json();

            if (!res.ok || j?.success === false) {
              const errorPayload: any = j?.error ?? j?.errors ?? j;
              const requiresTemplate = Boolean(errorPayload?.requiresTemplate);
              const metaErrorCode = errorPayload?.metaErrorCode;
              const displayMessageBase =
                errorPayload?.displayMessage ||
                errorPayload?.message ||
                errorPayload?.error ||
                'Failed to send message';
              const detail = errorPayload?.details;
              let displayMessage = displayMessageBase;
              if (metaErrorCode) {
                displayMessage = `${displayMessageBase} (Error ${metaErrorCode})`;
              }
              if (detail && detail !== displayMessageBase) {
                displayMessage += `\n\n${detail}`;
              }
              if (requiresTemplate) {
                displayMessage += '\n\nPlease use a template message instead.';
              }

              addDebugLog('error', mediaToSend ? '❌ Media message API error' : '❌ Text Message API Error', {
                status: res.status,
                statusText: res.statusText,
                errorPayload,
              });

              toast.error(displayMessage, { duration: requiresTemplate ? 8000 : 6000 });
              throw new Error(displayMessageBase);
            }

            addDebugLog(
              'success',
              mediaToSend ? '✅ Media message sent successfully!' : '✅ Text Message Sent Successfully!',
              {
                messageId: j.messageId || j.messageSid,
                timestamp: new Date().toISOString(),
              }
            );

            toast.success('Message sent');
            setTimeout(() => fetchMessages(), 1000);
          }
        } catch (e: any) {
          if (mediaToSend) {
            setPendingMedia(mediaToSend);
            setMediaUploadError(e?.message || 'Failed to send media');
          }
          addDebugLog('error', '❌ Live Send Exception', {
            errorMessage: e?.message || String(e),
            errorStack: e?.stack,
            wasTemplate: !!selectedTemplateId,
            hadMedia: !!mediaToSend,
          });
          toast.error(`Live send failed: ${e?.message || e}`);
        } finally {
          setSendingLive(false);
          addDebugLog('info', 'Live send process completed', {
            sendingLive: false,
          });
        }
      })();
    } else {
      addDebugLog('info', 'Live send disabled - message only shown in UI', {
        liveSendStatus: false,
      });
    }
    // ❌ REMOVED: Fake reply simulation - Real messages will come from webhook
    // setTyping(true);
    // setTimeout(() => {
    //   setTyping(false);
    //   const rid = `r${Math.random().toString(36).slice(2,8)}`;
    //   setConvos(p => {
    //     const arr = [...(p[activeContact.id] || [])];
    //     arr.push({ id: rid, text: '👍 Noted!', direction: 'in', ts: Date.now(), status: 3 });
    //     return { ...p, [activeContact.id]: arr };
    //   });
    // }, 1800);
  };

  const sendCatalogMessage = useCallback(async () => {
    const resolvedRecipient = normalizeContactAddress(catalogRecipient || activeContact?.phone);
    if (!resolvedRecipient) {
      toast.error('Select a recipient phone number first.');
      return;
    }

    const trimmedCatalogId = catalogId.trim();
    if (!trimmedCatalogId) {
      toast.error('Catalog ID is required.');
      return;
    }

    const trimmedHeader = catalogHeader.trim();
    const trimmedFooter = catalogFooter.trim();
    const resolvedBody = catalogBody.trim() || 'Browse these items from our catalog.';

    let interactivePayload: CatalogInteractivePayload | null = null;
    let metadataCatalog: ChatMsgMetadata['catalog'] = undefined;

    if (catalogMode === 'single') {
      const trimmedProductId = catalogProductId.trim();
      if (!trimmedProductId) {
        toast.error('Product Retailer ID is required for a single product message.');
        return;
      }

      interactivePayload = {
        type: 'product',
        body: resolvedBody,
        footer: trimmedFooter || undefined,
        catalogId: trimmedCatalogId,
        productRetailerId: trimmedProductId,
      };

      metadataCatalog = {
        type: 'product',
        catalogId: trimmedCatalogId,
        productRetailerId: trimmedProductId,
        productIds: [trimmedProductId],
      };
    } else {
      const parsedIdsSource = selectedProductIds.length > 0
        ? selectedProductIds
        : catalogProductIds
          .split(/[\s,;]+/)
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);

      const parsedIds = Array.from(new Set(parsedIdsSource.map((id) => id.trim()).filter((id) => id.length > 0)));

      if (parsedIds.length === 0) {
        toast.error('Add at least one product retailer ID for the catalog list.');
        return;
      }

      const sectionTitle = catalogSectionTitle.trim() || undefined;
      const sectionPayload = [
        {
          title: sectionTitle,
          productItems: parsedIds.map((id) => ({ productRetailerId: id })),
        },
      ];

      const headerText = trimmedHeader || sectionTitle || 'Product Catalog';

      interactivePayload = {
        type: 'product_list',
        body: resolvedBody,
        footer: trimmedFooter || undefined,
        header: { type: 'text', text: headerText },
        catalogId: trimmedCatalogId,
        sections: sectionPayload,
      };

      metadataCatalog = {
        type: 'product_list',
        catalogId: trimmedCatalogId,
        productIds: parsedIds,
        sections: sectionPayload.map((section) => ({
          title: section.title,
          productItems: section.productItems.map((item) => item.productRetailerId),
        })),
      };
    }

    if (!interactivePayload) {
      toast.error('Unable to prepare catalog message.');
      return;
    }

    try {
      setSendingCatalog(true);

      const metadataPayload: ChatMsgMetadata = {
        whatsappType: 'interactive',
        textPreview: resolvedBody,
        interactive: {
          type: interactivePayload.type,
          bodyText: resolvedBody,
          original: interactivePayload,
        },
        catalog: metadataCatalog,
      };

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: resolvedRecipient,
          type: 'interactive',
          interactive: interactivePayload,
          metadata: metadataPayload,
          saveToDb: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        const detail = result?.error || result?.details || 'Failed to send catalog message';
        toast.error(detail);
        return;
      }

      toast.success('Catalog message sent');
      setShowCatalogComposer(false);

      if (activeContact && activeContact.phone === resolvedRecipient) {
        const localId = `catalog-${Date.now()}`;
        const timestamp = Date.now();
        const localMetadata: ChatMsgMetadata = {
          whatsappType: 'interactive',
          textPreview: resolvedBody,
          interactive: {
            type: interactivePayload.type,
            original: interactivePayload,
            bodyText: resolvedBody,
          },
          catalog: metadataCatalog,
        };

        const localMessage: ChatMsg = {
          id: localId,
          text: resolvedBody,
          direction: 'out',
          ts: timestamp,
          status: 0,
          metadata: localMetadata,
        };

        setConvos((prev) => {
          const existing = prev[activeContact.id] ? [...prev[activeContact.id]] : [];
          existing.push(localMessage);
          return { ...prev, [activeContact.id]: existing };
        });

        setTimeout(() => {
          setConvos((prev) => ({
            ...prev,
            [activeContact.id]: (prev[activeContact.id] || []).map((msg) =>
              msg.id === localId ? { ...msg, status: 1 } : msg
            ),
          }));
        }, 300);
        setTimeout(() => {
          setConvos((prev) => ({
            ...prev,
            [activeContact.id]: (prev[activeContact.id] || []).map((msg) =>
              msg.id === localId ? { ...msg, status: 2 } : msg
            ),
          }));
        }, 700);
        setTimeout(() => {
          setConvos((prev) => ({
            ...prev,
            [activeContact.id]: (prev[activeContact.id] || []).map((msg) =>
              msg.id === localId ? { ...msg, status: 3 } : msg
            ),
          }));
        }, 1100);
      }

      setTimeout(() => fetchMessages(), 1200);
    } catch (error: any) {
      console.error('Failed to send catalog message', error);
      toast.error(error?.message || 'Failed to send catalog message');
    } finally {
      setSendingCatalog(false);
    }
  }, [
    catalogRecipient,
    catalogId,
    catalogHeader,
    catalogBody,
    catalogFooter,
    catalogProductId,
    catalogProductIds,
    selectedProductIds,
    catalogSectionTitle,
    catalogMode,
    activeContact,
    fetchMessages,
  ]);

  const openTemplatePreview = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    setShowTemplatePreview(true);
  };

  const sendTestMessage = async () => {
    // Use active contact from chat interface or fallback to phone number
    // Priority: activeContact (from chat) > phoneNumber (from form)
    const recipientPhone = activeContact?.phone || phoneNumber;

    if (!recipientPhone) {
      toast.error('Please select a contact or enter phone number');
      return;
    }

    console.log('📤 Sending to:', recipientPhone);
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl) {
      toast.error('Selected template could not be found');
      return;
    }

    setIsLoading(true);
    try {
      const submission = buildTemplateSubmission(tpl, templateVariables);
      const processedVariables = submission.variables;

      submission.warnings?.forEach(({ index, error }) => {
        addDebugLog('warning', '⚠️ Flow Action Data Warning (Test Send)', { buttonIndex: index, error });
      });

      // Always use unified endpoint; it will route to Cloud Template or local text
      const response = await fetch('/api/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone,
          templateId: tpl.id,
          templateName: tpl.name,
          templateBody: tpl.body, // Include template body for better message preview
          languageCode: tpl.language || 'en_US',
          variables: processedVariables,
          metadata: {
            templateId: tpl.id,
            templateName: tpl.name,
            headerImage: processedVariables.headerImage,
            buttons: tpl.whatsapp?.buttons,
            components: tpl.components,
            flowButtons: submission.flowButtons,
          }
        }),
      });

      const result = await response.json();
      setLastResult(result);

      if (result.success) {
        toast.success('Message sent successfully!');

        // If we're in chat mode, add the message to the conversation immediately
        if (activeContact) {
          const messageText = substituteTemplate(tpl.body, processedVariables);
          const tempId = `temp-${Date.now()}`;
          setConvos(prev => {
            const arr = prev[activeContact.phone] ? [...prev[activeContact.phone]] : [];
            arr.push({
              id: tempId,
              text: messageText,
              direction: 'out',
              ts: Date.now(),
              status: 1,
              metadata: {
                templateId: tpl.id,
                templateName: tpl.name,
                headerImage: processedVariables.headerImage,
                buttons: tpl.whatsapp?.buttons,
                components: tpl.components,
                flowButtons: submission.flowButtons,
              }
            });
            return { ...prev, [activeContact.phone]: arr };
          });
        }

        setPhoneNumber('');
        setMessage('');
        setSelectedTemplate('');
        setTemplateVariables({});

        // Refresh messages from database
        setTimeout(() => fetchMessages(), 1000);
      } else {
        toast.error(`Failed to send message: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
      setShowTemplatePreview(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    addDebugLog('info', '🎯 Template Selection Started', { templateId });

    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      addDebugLog('error', 'Template Not Found', { templateId, availableCount: templates.length });
      return;
    }

    addDebugLog('success', '✅ Template Found', {
      id: template.id,
      name: template.name,
      language: template.language,
      category: template.category,
      status: template.status
    });

    const vars: { [key: string]: string } = {};

    const list = Array.isArray(template.variables) && template.variables.length > 0
      ? (template.variables as string[])
      : extractPlaceholders(template.body);

    addDebugLog('info', '📝 Body Variables Extracted', {
      bodyText: template.body,
      variableCount: list?.length || 0,
      variables: list || []
    });

    (list || []).forEach((variable: string) => {
      vars[variable] = '';
    });

    const components = template.components || [];
    const headerComponent = components.find((c: any) => c.type === 'HEADER' || c.type === 'header');

    if (headerComponent) {
      const headerFormat = headerComponent.format || headerComponent.type;

      addDebugLog('info', '🖼️ Header Component Found', {
        format: headerFormat,
        hasText: !!headerComponent.text,
        text: headerComponent.text || null
      });

      if (headerFormat === 'IMAGE' || headerFormat === 'image') {
        vars['_header_image'] = '';
        addDebugLog('info', 'Added IMAGE header variable', { field: '_header_image' });
      } else if (headerFormat === 'VIDEO' || headerFormat === 'video') {
        vars['_header_video'] = '';
        addDebugLog('info', 'Added VIDEO header variable', { field: '_header_video' });
      } else if (headerFormat === 'DOCUMENT' || headerFormat === 'document') {
        vars['_header_document'] = '';
        vars['_header_document_filename'] = '';
        addDebugLog('info', 'Added DOCUMENT header variables', {
          fields: ['_header_document', '_header_document_filename']
        });
      } else if (headerFormat === 'TEXT' || headerFormat === 'text') {
        const headerText = headerComponent.text || '';
        const headerVars = extractPlaceholders(headerText);

        addDebugLog('info', 'Processing TEXT header', {
          headerText,
          headerVariableCount: headerVars.length,
          headerVariables: headerVars
        });

        headerVars.forEach((v: string) => {
          if (!vars[v]) vars[v] = '';
        });
      }
    } else {
      addDebugLog('info', 'No header component found', { componentCount: components.length });
    }

    const buttonComponents = components.filter((c: any) =>
      (c.type === 'BUTTONS' || c.type === 'buttons') && c.buttons
    );

    if (buttonComponents.length > 0) {
      addDebugLog('info', '🔘 Button Components Found', { count: buttonComponents.length });

      buttonComponents.forEach((btnComp: any, compIndex: number) => {
        btnComp.buttons?.forEach((btn: any, index: number) => {
          if (btn.type === 'URL' && btn.url && btn.url.includes('{{')) {
            vars[`_button_${index}_url`] = '';
            addDebugLog('info', 'Added URL button variable', {
              buttonIndex: index,
              field: `_button_${index}_url`,
              urlPattern: btn.url,
              buttonText: btn.text
            });
          } else if (btn.type === 'FLOW') {
            const flowIndex = index;
            const defaultToken = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `flow-${Date.now()}-${flowIndex}`;

            vars[`_flow_${flowIndex}_token`] = btn.flowToken || defaultToken;
            vars[`_flow_${flowIndex}_message_version`] = btn.flowMessageVersion || '3';
            vars[`_flow_${flowIndex}_id`] = btn.flowId || '';
            vars[`_flow_${flowIndex}_name`] = btn.flowName || btn.text || '';
            vars[`_flow_${flowIndex}_cta`] = btn.flowCta || btn.text || '';
            vars[`_flow_${flowIndex}_action`] = btn.flowAction || '';

            const flowActionData = btn.flowActionData || null;
            vars[`_flow_${flowIndex}_action_data`] = flowActionData
              ? JSON.stringify(flowActionData, null, 2)
              : '';

            addDebugLog('info', 'Added FLOW button variables', {
              buttonIndex: index,
              token: vars[`_flow_${flowIndex}_token`],
              flowId: vars[`_flow_${flowIndex}_id`],
              flowName: vars[`_flow_${flowIndex}_name`],
              flowCta: vars[`_flow_${flowIndex}_cta`],
              flowAction: vars[`_flow_${flowIndex}_action`],
              hasActionData: !!vars[`_flow_${flowIndex}_action_data`]
            });
          }
        });
      });
    }

    const totalVariables = Object.keys(vars).length;
    addDebugLog('success', '✨ Template Variables Initialized', {
      totalCount: totalVariables,
      allVariables: Object.keys(vars),
      bodyVars: list || [],
      headerVars: headerComponent ? 'yes' : 'no',
      buttonVars: buttonComponents.length > 0 ? 'yes' : 'no'
    });

    setTemplateVariables(vars);
    setShowTemplatePreview(true);
    setMessage('');
  };

  const runDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const [cfgRes, tplRes] = await Promise.all([
        fetch('/api/whatsapp/config'),
        fetch('/api/whatsapp/templates?debug=1')
      ]);
      const cfg = await cfgRes.json();
      const tpl = await tplRes.json();
      const summary = {
        cloudConfigured: !!cfg.isCloudConfigured,
        phoneNumberId: cfg.whatsappNumber,
        templatesCount: tpl.count || (tpl.templates?.length || 0),
        sampleTemplates: (tpl.templates || []).slice(0, 5).map((t: any) => ({ name: t.name, status: t.status, hasCta: !!t.whatsapp?.hasCta })),
        debug: tpl.debug || [],
      };
      setDiagResult(summary);
      toast.success('Diagnostics complete');
    } catch (e: any) {
      setDiagResult({ error: e?.message || String(e) });
      toast.error('Diagnostics failed');
    } finally {
      setDiagLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-blue-500">Sent</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-green-500">Delivered</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSelectContact = useCallback((contactId: string) => {
    const history = convos[contactId] || [];
    const lastTs = history.length > 0 ? history[history.length - 1].ts : Date.now();
    lastReadMapRef.current[contactId] = lastTs;

    setUnreadCounts(prev => {
      if (!prev[contactId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[contactId];
      return next;
    });

    setVisibleMessageCounts(prev => {
      const existing = prev[contactId];
      const desired = Math.min(
        INITIAL_VISIBLE_MESSAGES,
        history.length || INITIAL_VISIBLE_MESSAGES
      );
      if (existing && existing >= desired) {
        return prev;
      }
      return { ...prev, [contactId]: desired };
    });

    setActiveId(contactId);
  }, [convos]);

  const handleLoadMoreMessages = useCallback((contactId: string) => {
    setVisibleMessageCounts(prev => {
      const current = prev[contactId] ?? INITIAL_VISIBLE_MESSAGES;
      const historyLength = (convos[contactId] || []).length;
      const nextCount = Math.min(historyLength, current + LOAD_MORE_MESSAGES_STEP);
      if (nextCount === current) {
        return prev;
      }
      return { ...prev, [contactId]: nextCount };
    });
  }, [convos]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">WhatsApp Business</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAdvanced(v => !v)}>
          {showAdvanced ? 'Hide Admin Tools' : 'Show Admin Tools'}
        </Button>
      </div>

      {showAdvanced ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-6">
            {/* Send Message Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Send Test Message</span>
                </CardTitle>
                <CardDescription>
                  Send a test WhatsApp message using your configured provider
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Recipient Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Include country code (e.g., +1 for US, +91 for India)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useTemplate"
                      checked={useTemplate}
                      onChange={(e) => setUseTemplate(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="useTemplate">Use Message Template</Label>
                  </div>
                </div>

                {useTemplate ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Template</Label>
                      <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                              {template.language ? ` (${template.language})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTemplate && (
                      <div className="space-y-3">
                        <div className="bg-muted p-3 rounded space-y-2">
                          <Label className="text-sm font-medium">Template Preview:</Label>
                          <p className="text-sm mt-1">
                            {templates.find(t => t.id === selectedTemplate)?.body}
                          </p>
                          {(() => {
                            const tpl = templates.find(t => t.id === selectedTemplate) as WhatsAppTemplate | undefined;
                            if (!tpl) return null;
                            const isCloudTemplate = !!tpl.whatsapp || typeof tpl.status === 'string';
                            if (!isCloudTemplate) return null;
                            return (
                              <div className="flex flex-wrap items-center gap-2 pt-2">
                                {tpl.status && (<Badge variant="outline" className="text-xs">{tpl.status}</Badge>)}
                                {tpl.whatsapp?.hasCta ? (
                                  <>
                                    <Badge variant="default" className="text-xs">CTA</Badge>
                                    {tpl.whatsapp.buttons.slice(0, 3).map((b, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">{b.text || b.type}</Badge>
                                    ))}
                                    {tpl.whatsapp.buttons.length > 3 && (
                                      <span className="text-xs text-muted-foreground">+{tpl.whatsapp.buttons.length - 3} more</span>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-xs">No CTA</Badge>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {Object.keys(templateVariables).length > 0 && (
                          <div className="space-y-2">
                            <Label>Template Variables</Label>
                            {Object.keys(templateVariables).map((variable) => {
                              // Determine field type and label
                              let fieldLabel = variable;
                              let fieldPlaceholder = `Enter ${variable}`;
                              let fieldType = 'text';

                              if (variable === '_header_image') {
                                fieldLabel = '📷 Header Image URL';
                                fieldPlaceholder = 'https://example.com/image.jpg';
                                fieldType = 'url';
                              } else if (variable === '_header_video') {
                                fieldLabel = '🎥 Header Video URL';
                                fieldPlaceholder = 'https://example.com/video.mp4';
                                fieldType = 'url';
                              } else if (variable === '_header_document') {
                                fieldLabel = '📄 Header Document URL';
                                fieldPlaceholder = 'https://example.com/document.pdf';
                                fieldType = 'url';
                              } else if (variable === '_header_document_filename') {
                                fieldLabel = '📝 Document Filename';
                                fieldPlaceholder = 'document.pdf';
                              } else if (variable.startsWith('_button_')) {
                                const btnMatch = variable.match(/_button_(\d+)_url/);
                                if (btnMatch) {
                                  const btnIndex = parseInt(btnMatch[1]);
                                  fieldLabel = `🔗 Button ${btnIndex + 1} URL Parameter`;
                                  fieldPlaceholder = 'dynamic-value';
                                }
                              } else {
                                fieldLabel = `{{${variable}}}`;
                              }

                              return (
                                <div key={variable} className="space-y-1">
                                  <Label className="text-sm font-medium">{fieldLabel}</Label>
                                  <Input
                                    type={fieldType}
                                    placeholder={fieldPlaceholder}
                                    value={templateVariables[variable] || ''}
                                    onChange={(e) => setTemplateVariables({
                                      ...templateVariables,
                                      [variable]: e.target.value
                                    })}
                                    className={variable.startsWith('_header_') || variable.startsWith('_button_') ? 'border-blue-200' : ''}
                                  />
                                  {variable === '_header_image' && (
                                    <p className="text-xs text-muted-foreground">
                                      Must be HTTPS. Try: https://picsum.photos/800/400
                                    </p>
                                  )}
                                  {variable === '_header_video' && (
                                    <p className="text-xs text-muted-foreground">
                                      Must be HTTPS and publicly accessible
                                    </p>
                                  )}
                                  {variable === '_header_document' && (
                                    <p className="text-xs text-muted-foreground">
                                      Must be HTTPS. Supported: PDF, DOC, DOCX, etc.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Enter your message here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full"
                    />
                  </div>
                )}

                <Button
                  onClick={sendTestMessage}
                  disabled={isLoading || !phoneNumber || !selectedTemplate}
                  className="w-full bg-[#25D366] hover:bg-[#22c15e] text-white"
                >
                  {isLoading ? 'Sending...' : 'Send Message'}
                </Button>
              </CardContent>
            </Card>

            {/* Configuration Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Configuration</span>
                </CardTitle>
                <CardDescription>
                  Current WhatsApp Business API configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Active Provider</Label>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted p-2 rounded flex-1">
                      {config ? (
                        config.provider === 'meta'
                          ? 'Meta WhatsApp Cloud API'
                          : 'Not configured'
                      ) : 'Loading...'}
                    </code>
                    {config?.provider === 'unknown' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>

                {config?.isCloudConfigured && (
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-muted p-2 rounded flex-1">
                        {config?.whatsappNumber || 'Not configured'}
                      </code>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                )}

                <Separator />

                {config?.isCloudConfigured ? (
                  <div className="space-y-2">
                    <Label>Webhook URL (Cloud API)</Label>
                    <code className="text-sm bg-muted p-2 rounded block">
                      https://admin.aagamholidays.com/api/whatsapp/webhook
                    </code>
                    <p className="text-sm text-muted-foreground">
                      Configure this URL and your verify token in Meta Developer Console (WhatsApp Cloud API)
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Meta WhatsApp Cloud API is not configured. Please set META_WHATSAPP_PHONE_NUMBER_ID and META_WHATSAPP_ACCESS_TOKEN.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Last Result */}
          {lastResult && (
            <Card>
              <CardHeader>
                <CardTitle>Last Send Result</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(lastResult, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Available Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Available Templates</span>
              </CardTitle>
              <CardDescription>
                Pre-defined message templates with variable placeholders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-muted-foreground">No approved templates found. Configure and approve templates in Meta Business Manager.</p>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{template.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {(() => {
                            const ts = template.updatedAt || template.createdAt;
                            return ts ? new Date(ts).toLocaleDateString() : '—';
                          })()}
                        </span>
                      </div>

                      <div className="bg-muted p-3 rounded space-y-2">
                        <p className="text-sm">{template.body}</p>
                        {/* WhatsApp CTA hints */}
                        {template.whatsapp || template.status ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {template.status && (<Badge variant="outline" className="text-xs">{template.status}</Badge>)}
                            {template.language && (<Badge variant="secondary" className="text-xs">{template.language}</Badge>)}
                            {template.category && (<Badge variant="outline" className="text-xs capitalize">{template.category.toLowerCase()}</Badge>)}
                            {template.whatsapp?.hasCta ? (
                              <>
                                <Badge variant="default" className="text-xs">CTA</Badge>
                                {template.whatsapp.buttons.slice(0, 4).map((b, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{b.text || b.type}</Badge>
                                ))}
                                {template.whatsapp.buttons.length > 4 && (
                                  <span className="text-xs text-muted-foreground">+{template.whatsapp.buttons.length - 4} more</span>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs">No CTA</Badge>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {Array.isArray(template.variables) && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm text-muted-foreground">Variables:</span>
                          {(template.variables as string[]).map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cloud API Diagnostics */}
          <Card>
            <CardHeader>
              <CardTitle>Cloud API Diagnostics</CardTitle>
              <CardDescription>Quick health check for configuration and templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button onClick={runDiagnostics} variant="outline" disabled={diagLoading}>
                  {diagLoading ? 'Running…' : 'Run Diagnostics'}
                </Button>
              </div>
              {diagResult && (
                <div className="text-sm bg-muted p-3 rounded">
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(diagResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Debug Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Debug Logs</span>
                  <Badge variant="secondary">{debugLogs.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowDebugLogs(!showDebugLogs)}
                    variant="ghost"
                    size="sm"
                  >
                    {showDebugLogs ? 'Hide' : 'Show'}
                  </Button>
                  {debugLogs.length > 0 && (
                    <>
                      <Button onClick={exportDebugLogs} variant="outline" size="sm">
                        Export
                      </Button>
                      <Button onClick={clearDebugLogs} variant="outline" size="sm">
                        Clear
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                Detailed logs of template selection, variable extraction, and sending process
              </CardDescription>
            </CardHeader>
            {showDebugLogs && (
              <CardContent>
                {debugLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No debug logs yet. Select a template or send a message to see logs.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {debugLogs.map((log) => {
                      const typeColors = {
                        info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
                        success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
                        error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
                        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100'
                      };

                      const typeIcons = {
                        info: '📘',
                        success: '✅',
                        error: '❌',
                        warning: '⚠️'
                      };

                      return (
                        <div
                          key={log.id}
                          className={`border rounded-lg p-3 text-sm ${typeColors[log.type]}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2 font-medium">
                              <span>{typeIcons[log.type]}</span>
                              <span>{log.action}</span>
                            </div>
                            <span className="text-xs opacity-70">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          {Object.keys(log.details).length > 0 && (
                            <div className="mt-2 text-xs opacity-80">
                              <pre className="whitespace-pre-wrap font-mono overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>
                Last 10 WhatsApp messages sent from your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button onClick={() => fetchMessages()} variant="outline">
                  Refresh Messages
                </Button>
                <Button onClick={() => fetchPreviousMessages()} variant="outline" disabled={isLoadingPreviousMessages}>
                  {isLoadingPreviousMessages ? 'Loading...' : 'Load Previous Messages'}
                </Button>
              </div>

              {messages.length === 0 ? (
                <p className="text-muted-foreground">No messages found. Send a test message to see results here.</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">To: {msg.to}</span>
                          {getStatusBadge(msg.status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm">{msg.message}</p>
                      </div>

                      {msg.messageSid && (
                        <div className="text-xs text-muted-foreground">
                          SID: {msg.messageSid}
                        </div>
                      )}

                      {msg.errorMessage && (
                        <Alert variant="destructive">
                          <AlertDescription className="text-sm">
                            Error: {msg.errorMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex h-[calc(100vh-12rem)] rounded-2xl border overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-100 shadow-xl dark:from-[#0b141a] dark:via-[#111b21] dark:to-[#0b141a] dark:border-slate-800/80">
          <style jsx global>{`
            .scrollbar-custom::-webkit-scrollbar {
              width: 6px;
            }
            .scrollbar-custom::-webkit-scrollbar-track {
              background: transparent;
            }
            .scrollbar-custom::-webkit-scrollbar-thumb {
              background: hsl(var(--muted-foreground) / 0.2);
              border-radius: 3px;
            }
            .scrollbar-custom::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.4);
            }
          `}</style>

          {/* Chat Sidebar */}
          <div className="flex w-80 flex-col border-r border-emerald-100/60 bg-white/70 backdrop-blur-md dark:border-slate-800 dark:bg-[#111b21]/80">
            <div className="flex items-center justify-between border-b border-emerald-100/60 bg-white/60 p-4 backdrop-blur dark:border-slate-800 dark:bg-[#0b141a]/70">
              <div>
                <h1 className="text-2xl font-bold">Chats</h1>
                <p className="text-xs text-muted-foreground">
                  {filteredContacts.length} of {contacts.length} shown
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={showOnlyResponded ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setShowOnlyResponded(v => !v)}
                  className={showOnlyResponded ? "h-9 w-9 bg-emerald-500 hover:bg-emerald-600" : "h-9 w-9"}
                  title={showOnlyResponded ? "Showing only responded contacts (click to see all)" : "Click to show only responded contacts"}
                >
                  <Filter className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDarkPreview(v => !v)}
                  className="h-9 w-9"
                  title="Toggle dark/light preview"
                >
                  {darkPreview ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewChatDialog(true)}
                  className="h-9 w-9"
                  title="New chat"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="border-b border-emerald-100/60 bg-white/50 p-3 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0b141a]/70">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  className="h-10 border border-emerald-100/70 bg-white/80 pl-9 backdrop-blur-sm focus-visible:ring-emerald-400 dark:border-slate-700 dark:bg-[#1f2c33]/80"
                  value={chatSearchTerm}
                  onChange={(e) => setChatSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-custom">
              {filteredContacts.map(c => {
                const history = convos[c.id] || [];
                const last = history[history.length - 1];
                const isActive = activeId === c.id;
                const lastPreviewText = getMessagePreviewLabel(last);
                const unreadCount = unreadCounts[c.id] || 0;
                const showUnread = unreadCount > 0;
                const timestampLabel = last
                  ? new Date(last.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30",
                      isActive && "bg-emerald-200/80 text-emerald-900 shadow-md dark:bg-emerald-900/50 dark:text-emerald-100"
                    )}
                    onClick={() => handleSelectContact(c.id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold">
                        {c.avatarText || c.phone.replace(/\D/g, '').slice(-2) || 'CT'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate">{c.name}</span>
                        <div className="flex items-center gap-2 ml-2">
                          {showUnread && (
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                          <span className="text-muted-foreground text-xs flex-shrink-0">
                            {timestampLabel}
                          </span>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-xs truncate">
                        {lastPreviewText}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Load More Contacts Button */}
              {hasMoreContacts && (
                <div className="p-2">
                  <Button
                    onClick={() => setVisibleContactsCount(prev => prev + 25)}
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  >
                    Load {Math.min(25, totalAvailableContacts - filteredContacts.length)} more contacts
                  </Button>
                </div>
              )}

            </div>
          </div>

          {/* Chat Main */}
          <div className="flex flex-1 flex-col bg-transparent">
            {activeContact ? (
              <>
                <div className="flex items-center justify-between border-b border-emerald-100/60 bg-white/60 p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0b141a]/70">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold">
                        {activeContact.avatarText || activeContact.phone.replace(/\D/g, '').slice(-2) || 'CT'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{activeContact.name}</h2>
                      <p className="text-muted-foreground text-sm">
                        {activeContact.phone.replace(/^whatsapp:/, '')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        fetchMessages();
                        toast.success('Messages refreshed');
                      }}
                      title="Refresh messages"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowContactInfo(true)}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-transparent p-6 scrollbar-custom">
                  {hasMoreActiveMessages && (
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoadMoreMessages(activeContact.id)}
                        className="text-xs font-medium"
                      >
                        Load earlier messages
                      </Button>
                    </div>
                  )}

                  {activeVisibleMessages.map((m, index) => {
                    const templateButtons = m.metadata?.buttons ?? [];
                    const flowButtons = m.metadata?.flowButtons ?? [];
                    const hasAnyButtons = templateButtons.length > 0 || flowButtons.length > 0;
                    const previousMessage = activeVisibleMessages[index - 1];
                    const messageDate = new Date(m.ts);
                    const showDateSeparator = !previousMessage || !isSameCalendarDay(messageDate, new Date(previousMessage.ts));

                    return (
                      <div key={m.id} className="space-y-2">
                        {showDateSeparator && (
                          <div className="flex justify-center">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm dark:bg-emerald-900/60 dark:text-emerald-100">
                              {formatChatDateLabel(m.ts)}
                            </span>
                          </div>
                        )}
                        <div className={cn(
                          "flex items-start gap-3",
                          m.direction === 'out' && "justify-end"
                        )}>
                          {m.direction === 'in' && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-xs font-semibold">
                                {activeContact.avatarText || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-[70%] rounded-3xl p-3 shadow-md",
                              m.direction === 'out'
                                ? "rounded-br-xl border border-emerald-400/60 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-500 text-white shadow-emerald-500/20"
                                : "rounded-bl-xl border border-emerald-100/70 bg-white/90 text-slate-900 backdrop-blur-sm dark:border-[#1f2c33] dark:bg-[#1f2c33]/80 dark:text-slate-100"
                            )}
                          >
                            {m.metadata?.headerImage && (
                              <div className="mb-2 -mt-3 -mx-3 overflow-hidden rounded-t-2xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={m.metadata.headerImage}
                                  alt="Header"
                                  className="w-full h-auto max-h-[200px] object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              </div>
                            )}

                            {renderMessageContent(m)}

                            {/* WhatsApp-style timestamp and status */}
                            <div
                              className={cn(
                                "mt-2 flex items-center gap-1 text-xs",
                                m.direction === 'out'
                                  ? "justify-end text-white/80"
                                  : "justify-start text-emerald-800/80 dark:text-emerald-200/80"
                              )}
                            >
                              <span>{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {m.direction === 'out' && (
                                <span className="inline-flex">
                                  {m.status === 0 && <span className="opacity-50">🕐</span>}
                                  {m.status === 1 && <span className="opacity-70">✓</span>}
                                  {m.status === 2 && <span className="opacity-90">✓✓</span>}
                                  {m.status === 3 && <span className="text-blue-300">✓✓</span>}
                                </span>
                              )}
                            </div>

                            {hasAnyButtons && (
                              <div className={cn(
                                "-mx-3 mt-3 -mb-3 border-t pt-1",
                                m.direction === 'out' ? "border-white/30" : "border-emerald-100/60 dark:border-[#1f2c33]"
                              )}>
                                {templateButtons.map((btn, idx) => (
                                  <button
                                    key={`tpl-${idx}`}
                                    className={cn(
                                      "w-full px-3 py-2.5 text-sm font-medium text-center transition-colors",
                                      idx > 0 && (m.direction === 'out' ? "border-t border-white/20" : "border-t border-border"),
                                      m.direction === 'out'
                                        ? "text-white hover:bg-white/15"
                                        : "text-emerald-700 hover:bg-emerald-100/60 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                                    )}
                                    onClick={() => {
                                      if (btn.url) window.open(btn.url, '_blank');
                                      if (btn.phone) window.open(`tel:${btn.phone}`, '_blank');
                                    }}
                                  >
                                    {btn.type === 'PHONE_NUMBER' && '📞 '}
                                    {(btn.type === 'URL' || btn.sub_type === 'url') && '🔗 '}
                                    {btn.text || 'Button'}
                                  </button>
                                ))}

                                {flowButtons.map(({ index, parameter }) => {
                                  const cta = parameter?.flow_cta || parameter?.flow_name || `Flow Button ${index + 1}`;
                                  return (
                                    <button
                                      key={`flow-${index}`}
                                      className={cn(
                                        "w-full px-3 py-2.5 text-sm font-medium text-center transition-colors",
                                        (templateButtons.length > 0 || index > 0) && (m.direction === 'out' ? "border-t border-white/20" : "border-t border-border"),
                                        "cursor-default",
                                        m.direction === 'out'
                                          ? "text-white hover:bg-white/10"
                                          : "text-emerald-700 hover:bg-emerald-100/60 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                                      )}
                                      disabled
                                      title="Flow buttons launch inside WhatsApp"
                                    >
                                      <span className="inline-flex items-center justify-center gap-2">
                                        <ArrowRight className="h-3.5 w-3.5" />
                                        <span>{cta}</span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {typing && (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-xs font-semibold">
                          {activeContact.avatarText || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-2xl rounded-bl-md border border-emerald-100/70 bg-white/90 p-4 shadow-sm dark:border-[#1f2c33] dark:bg-[#1f2c33]/80">
                        <div className="flex gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatMessagesEndRef} />
                </div>

                {showCatalogComposer && (
                  <div className="border-t border-emerald-100/60 bg-white/80 px-4 py-4 space-y-4 text-sm backdrop-blur-md dark:border-slate-800 dark:bg-[#0b141a]/80">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">Catalog message</p>
                        <p className="text-xs text-muted-foreground">Share products from your WhatsApp catalog.</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                        onClick={() => setShowCatalogComposer(false)}
                        title="Close catalog composer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="inline-catalog-recipient">Recipient</Label>
                        <Input
                          id="inline-catalog-recipient"
                          type="tel"
                          placeholder="Defaults to the active chat"
                          value={catalogRecipient}
                          onChange={(event) => setCatalogRecipient(event.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Leave blank to use the open conversation.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inline-catalog-mode">Catalog Mode</Label>
                        <Select
                          value={catalogMode}
                          onValueChange={(value) => setCatalogMode(value as 'single' | 'multi')}
                        >
                          <SelectTrigger id="inline-catalog-mode">
                            <SelectValue placeholder="Choose catalog message type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single product</SelectItem>
                            <SelectItem value="multi">Multi-product catalog</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="inline-catalog-id">Catalog</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Popover open={catalogSelectOpen} onOpenChange={setCatalogSelectOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="justify-between gap-2 sm:min-w-[220px]"
                                disabled={catalogsLoading && catalogOptions.length === 0}
                              >
                                <span className="truncate text-left text-sm font-medium">
                                  {catalogSelectionLabel}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[320px] p-0">
                              {catalogsLoading && catalogOptions.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">Loading catalogs…</div>
                              ) : (
                                <Command>
                                  <CommandInput placeholder="Search catalog..." />
                                  <CommandEmpty>No catalogs found.</CommandEmpty>
                                  <CommandList>
                                    <CommandGroup heading="Synced catalogs">
                                      {catalogOptions.map((option) => {
                                        const value = option.metaCatalogId || option.id;
                                        const isSelected = value === catalogId;
                                        return (
                                          <CommandItem
                                            key={option.id}
                                            value={value}
                                            onSelect={() => {
                                              setCatalogId(value);
                                              setCatalogSelectOpen(false);
                                            }}
                                          >
                                            <Check className={cn('mr-2 h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                                            <div className="flex flex-col">
                                              <span className="text-sm font-medium">{option.name || value}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {option.metaCatalogId || option.id}
                                                {option.currency ? ` • ${option.currency}` : ''}
                                              </span>
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                    <CommandGroup>
                                      <CommandItem
                                        key="custom-catalog"
                                        onSelect={() => {
                                          setCatalogSelectOpen(false);
                                          setCatalogId('');
                                        }}
                                      >
                                        <Check className={cn('mr-2 h-4 w-4 shrink-0', !catalogId ? 'opacity-100' : 'opacity-0')} />
                                        <span>Use custom catalog ID</span>
                                      </CommandItem>
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              )}
                            </PopoverContent>
                          </Popover>
                          <Input
                            id="inline-catalog-id"
                            placeholder="Commerce Manager catalog ID"
                            value={catalogId}
                            onChange={(event) => setCatalogId(event.target.value)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Pick from your synced catalogs or paste any Meta catalog ID.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inline-catalog-header">Header (optional)</Label>
                        <Input
                          id="inline-catalog-header"
                          placeholder="Featured trips, seasonal offers..."
                          value={catalogHeader}
                          onChange={(event) => setCatalogHeader(event.target.value)}
                          disabled={catalogMode === 'single'}
                        />
                        {catalogMode === 'single' && (
                          <p className="text-xs text-muted-foreground">
                            Single product messages do not support headers.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inline-catalog-body">Message Body</Label>
                      <Textarea
                        id="inline-catalog-body"
                        rows={3}
                        placeholder="Guidance required by Meta - describe what you are sending."
                        value={catalogBody}
                        onChange={(event) => setCatalogBody(event.target.value)}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="inline-catalog-footer">Footer (optional)</Label>
                        <Input
                          id="inline-catalog-footer"
                          placeholder="Add a short closing note"
                          value={catalogFooter}
                          onChange={(event) => setCatalogFooter(event.target.value)}
                        />
                      </div>
                      {catalogMode === 'single' ? (
                        <div className="space-y-2">
                          <Label htmlFor="inline-catalog-product-id">Product Retailer ID</Label>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Popover open={productSelectOpen} onOpenChange={setProductSelectOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="justify-between gap-2 sm:min-w-[220px]"
                                  disabled={catalogProductsLoading && catalogProductOptions.length === 0}
                                >
                                  <span className="truncate text-left text-sm font-medium">
                                    {singleProductLabel}
                                  </span>
                                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[340px] p-0">
                                {catalogProductsLoading && catalogProductOptions.length === 0 ? (
                                  <div className="p-4 text-sm text-muted-foreground">Loading products…</div>
                                ) : (
                                  <Command>
                                    <CommandInput placeholder="Search product..." />
                                    <CommandEmpty>No catalog products found.</CommandEmpty>
                                    <CommandList>
                                      <CommandGroup heading="Catalog products">
                                        {catalogProductOptions.map((option) => {
                                          const isSelected = option.retailerId === catalogProductId;
                                          return (
                                            <CommandItem
                                              key={option.retailerId}
                                              value={option.retailerId}
                                              onSelect={() => {
                                                setCatalogProductId(option.retailerId);
                                                setProductSelectOpen(false);
                                              }}
                                            >
                                              <Check className={cn('mr-2 h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                                              <div className="flex flex-col">
                                                <span className="text-sm font-medium">{option.name}</span>
                                                <span className="text-xs text-muted-foreground">{option.retailerId}</span>
                                              </div>
                                            </CommandItem>
                                          );
                                        })}
                                      </CommandGroup>
                                      <CommandGroup>
                                        <CommandItem
                                          key="custom-product"
                                          onSelect={() => {
                                            setProductSelectOpen(false);
                                            setCatalogProductId('');
                                          }}
                                        >
                                          <Check className={cn('mr-2 h-4 w-4 shrink-0', catalogProductId ? 'opacity-0' : 'opacity-100')} />
                                          <span>Use custom retailer ID</span>
                                        </CommandItem>
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                )}
                              </PopoverContent>
                            </Popover>
                            <Input
                              id="inline-catalog-product-id"
                              placeholder="product_retailer_id"
                              value={catalogProductId}
                              onChange={(event) => setCatalogProductId(event.target.value)}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Select a synced product or paste any Meta retailer ID.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="inline-catalog-section-title">Section Title (optional)</Label>
                          <Input
                            id="inline-catalog-section-title"
                            placeholder="Recommended tours"
                            value={catalogSectionTitle}
                            onChange={(event) => setCatalogSectionTitle(event.target.value)}
                          />
                          <Label htmlFor="inline-catalog-product-ids">Product Retailer IDs</Label>
                          <div className="space-y-2">
                            <Popover open={multiProductSelectOpen} onOpenChange={setMultiProductSelectOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="justify-between gap-2 sm:min-w-[220px]"
                                  disabled={catalogProductsLoading && catalogProductOptions.length === 0}
                                >
                                  <span className="truncate text-left text-sm font-medium">
                                    {multiProductLabel}
                                  </span>
                                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[360px] p-0">
                                {catalogProductsLoading && catalogProductOptions.length === 0 ? (
                                  <div className="p-4 text-sm text-muted-foreground">Loading products…</div>
                                ) : (
                                  <Command>
                                    <CommandInput placeholder="Search product..." />
                                    <CommandEmpty>No catalog products found.</CommandEmpty>
                                    <CommandList>
                                      <CommandGroup heading="Catalog products">
                                        {catalogProductOptions.map((option) => {
                                          const isSelected = selectedProductIds.includes(option.retailerId);
                                          return (
                                            <CommandItem
                                              key={option.retailerId}
                                              value={option.retailerId}
                                              onSelect={() => {
                                                setSelectedProductIds((prev) => {
                                                  const has = prev.includes(option.retailerId);
                                                  const next = has
                                                    ? prev.filter((value) => value !== option.retailerId)
                                                    : [...prev, option.retailerId];
                                                  setCatalogProductIds(next.join('\n'));
                                                  return next;
                                                });
                                              }}
                                            >
                                              <Check className={cn('mr-2 h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                                              <div className="flex flex-col">
                                                <span className="text-sm font-medium">{option.name}</span>
                                                <span className="text-xs text-muted-foreground">{option.retailerId}</span>
                                              </div>
                                            </CommandItem>
                                          );
                                        })}
                                      </CommandGroup>
                                      <CommandGroup>
                                        <CommandItem
                                          key="clear-multi"
                                          onSelect={() => {
                                            setSelectedProductIds([]);
                                            setCatalogProductIds('');
                                            setMultiProductSelectOpen(false);
                                          }}
                                        >
                                          <Check className={cn('mr-2 h-4 w-4 shrink-0', selectedProductIds.length === 0 ? 'opacity-100' : 'opacity-0')} />
                                          <span>Clear selected products</span>
                                        </CommandItem>
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                )}
                              </PopoverContent>
                            </Popover>
                            {selectedProductSummaries.length > 0 && (
                              <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                                {selectedProductSummaries.map((summary) => (
                                  <span key={summary.id} className="rounded-full bg-muted px-2 py-0.5">
                                    {summary.label}
                                  </span>
                                ))}
                              </div>
                            )}
                            <Textarea
                              id="inline-catalog-product-ids"
                              rows={3}
                              placeholder="Enter one product_retailer_id per line or separate with commas"
                              value={catalogProductIds}
                              onChange={(event) => {
                                const raw = event.target.value;
                                setCatalogProductIds(raw);
                                const parsed = raw
                                  .split(/[\s,;]+/)
                                  .map((entry) => entry.trim())
                                  .filter((entry) => entry.length > 0);
                                setSelectedProductIds(Array.from(new Set(parsed)));
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Search your catalog and we&rsquo;ll fill the IDs, or paste them manually.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Meta requires a body message and valid product identifiers before sending.
                      </p>
                      <Button
                        onClick={sendCatalogMessage}
                        disabled={
                          sendingCatalog ||
                          !catalogId.trim() ||
                          (catalogMode === 'single'
                            ? !catalogProductId.trim()
                            : catalogProductIds.trim().length === 0)
                        }
                        className="bg-[#128C7E] text-white hover:bg-[#0f776b] md:px-6"
                      >
                        {sendingCatalog ? 'Sending Catalog…' : 'Send Catalog Message'}
                      </Button>
                    </div>
                  </div>
                )}

                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleMediaSelect}
                />

                {pendingMedia && (
                  <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-emerald-100/70 bg-white/90 p-3 text-sm shadow-sm dark:border-[#1f2c33] dark:bg-[#111b21]/80">
                    {pendingMedia.type === 'image' ? (
                      <div className="h-14 w-14 overflow-hidden rounded-lg border border-emerald-100/70 bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pendingMedia.previewUrl}
                          alt={pendingMedia.fileName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200">
                        <FileText className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {pendingMedia.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(pendingMedia.size)} • {pendingMedia.mimeType || (pendingMedia.type === 'image' ? 'Image' : 'Document')}
                      </p>
                      {mediaUploadError && (
                        <p className="mt-1 text-xs text-red-500">{mediaUploadError}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-red-500"
                      onClick={removePendingMedia}
                      title="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-center gap-3 border-t border-emerald-100/60 bg-white/70 p-4 backdrop-blur-md dark:border-slate-800 dark:bg-[#0b141a]/80",
                    showCatalogComposer && "border-t-0"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    title="Select template"
                  >
                    <FileText className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-muted-foreground hover:text-foreground hover:bg-accent",
                      showCatalogComposer && "bg-emerald-500 text-white hover:bg-emerald-600"
                    )}
                    onClick={() => {
                      if (!activeContact) {
                        toast.error('Select a chat before sending a catalog message.');
                        return;
                      }
                      const normalizedPhone = normalizeContactAddress(activeContact.phone);
                      if (normalizedPhone && !catalogRecipient.trim()) {
                        setCatalogRecipient(normalizedPhone);
                      }
                      setShowCatalogComposer((prev) => !prev);
                    }}
                    title="Send catalog message"
                  >
                    <ShoppingBag className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                    onClick={() => mediaInputRef.current?.click()}
                    title="Attach media"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                        <Smile className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 border-0">
                      <EmojiPicker
                        onEmojiClick={(emoji) => setMessage(m => m + emoji.emoji)}
                        theme={darkPreview ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                      />
                    </PopoverContent>
                  </Popover>

                  <Input
                    placeholder={selectedTemplate ? 'Template selected. Type to clear.' : 'Type a message...'}
                    className="h-11 flex-1 rounded-full border border-emerald-100/70 bg-white/80 px-4 text-slate-900 shadow-inner focus-visible:ring-emerald-400 dark:border-[#1f2c33] dark:bg-[#1f2c33]/80 dark:text-slate-100"
                    value={selectedTemplate ? substituteTemplate(templates.find(t => t.id === selectedTemplate)?.body || '', templateVariables) : message}
                    onChange={(e) => {
                      if (selectedTemplate) {
                        setSelectedTemplate('');
                        setTemplateVariables({});
                        setShowTemplatePreview(false);
                      }
                      setMessage(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendPreviewMessage();
                      }
                    }}
                  />

                  <Button
                    size="icon"
                    className="rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 hover:from-emerald-600 hover:to-teal-600"
                    onClick={sendPreviewMessage}
                    disabled={!activeContact || sendingLive || isUploadingMedia}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>

                {showTemplatePicker && (
                  <div className="absolute bottom-20 left-4 right-4 max-w-md mx-auto">
                    <div className="overflow-hidden rounded-xl border border-emerald-100/70 bg-white/90 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-[#111b21]/90">
                      <div className="flex items-center justify-between border-b border-emerald-100/60 bg-emerald-50/60 p-4 dark:border-slate-800 dark:bg-[#1f2c33]/80">
                        <div className="text-sm font-semibold">Select a template</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTemplatePicker(false)}
                          className="h-7 w-7 p-0 hover:bg-accent"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="max-h-60 overflow-y-auto scrollbar-custom">
                        {templates.map(template => (
                          <button
                            key={template.id}
                            onClick={() => {
                              handleTemplateChange(template.id);
                              setShowTemplatePicker(false);
                            }}
                            className="block w-full border-b border-emerald-50/70 px-4 py-3 text-left transition-all hover:bg-emerald-50/60 hover:shadow-sm dark:border-slate-800/80 dark:hover:bg-emerald-900/30"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm">{template.name}</span>
                              {template.status && (
                                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">{template.status}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{template.body}</p>
                          </button>
                        ))}
                        {templates.length === 0 && (
                          <div className="p-6 text-sm text-muted-foreground text-center">
                            No templates available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a chat</p>
                  <p className="text-sm">Choose a conversation from the left to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {shouldShowTemplateDialog && (
        <Dialog
          open={shouldShowTemplateDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowTemplatePreview(false);
              setSelectedTemplate('');
              setTemplateVariables({});
              setShowTemplatePicker(false);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Template: {templates.find(t => t.id === selectedTemplate)?.name}</DialogTitle>
              <DialogDescription>
                {(liveSend && activeContact) || phoneNumber ? (
                  <>Sending to: <strong>{activeContact?.name || 'Contact'}</strong> ({activeContact?.phone || phoneNumber})</>
                ) : (
                  <>Fill in the details to preview and send this template</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Show phone number field only if:
                  - No active contact (chat mode has activeContact)
                  - AND no phone number pre-filled (admin tools mode has phoneNumber)
              */}
              {!activeContact && !phoneNumber && (
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Label htmlFor="dialog-phone" className="text-sm font-semibold">📱 Recipient Phone Number</Label>
                  <Input
                    id="dialog-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground">Include country code (e.g., +91 for India)</p>
                </div>
              )}

              {/* Template Variables */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Template Variables</h4>
                {standardVariableKeys.length === 0 && flowVariableGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This template doesn&rsquo;t require any variables. You&rsquo;re good to send it as-is.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {standardVariableKeys.length > 0 && (
                      <div className="space-y-3">
                        {standardVariableKeys.map((variable) => renderVariableControl(variable))}
                      </div>
                    )}

                    {flowVariableGroups.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h5 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                              Flow Button Configuration
                            </h5>
                            <p className="text-xs text-emerald-600/80 dark:text-emerald-300/80">
                              Review flow metadata before sending. Tokens should stay unique per send.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                            onClick={() => regenerateFlowTokens()}
                          >
                            Regenerate all tokens
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {flowVariableGroups.map(({ index, variables }) => {
                            const templateBtn = templateFlowButtons[index];
                            const flowIdValue = templateVariables[`_flow_${index}_id`] || templateBtn?.flowId || '';
                            const flowActionValue = templateVariables[`_flow_${index}_action`] || templateBtn?.flowAction || '';
                            const flowTokenValue = templateVariables[`_flow_${index}_token`] || templateBtn?.flowToken || '';
                            const flowDisplayName =
                              templateVariables[`_flow_${index}_cta`] ||
                              templateVariables[`_flow_${index}_name`] ||
                              templateBtn?.flowCta ||
                              templateBtn?.flowName ||
                              templateBtn?.text ||
                              `Flow Button ${index + 1}`;

                            const orderedFields = [...variables].sort(
                              (a, b) => flowFieldPriority(a) - flowFieldPriority(b)
                            );

                            return (
                              <div
                                key={index}
                                className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-900/20"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                      Flow Button {index + 1}
                                    </p>
                                    <p className="text-xs text-emerald-700/90 dark:text-emerald-300/70">
                                      {flowDisplayName}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 border-emerald-300/80 px-3 text-emerald-700 hover:bg-emerald-100/60 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                                      onClick={() => regenerateFlowTokens(index)}
                                    >
                                      New token
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-8 bg-emerald-500/90 px-3 text-white hover:bg-emerald-600/90 dark:bg-emerald-600/80"
                                      onClick={() => applyFlowDefaults(index)}
                                    >
                                      Use template defaults
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                  {flowTokenValue && (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-300/80 text-emerald-800 dark:border-emerald-700 dark:text-emerald-100"
                                    >
                                      Token: {flowTokenValue.length > 18 ? `${flowTokenValue.slice(0, 18)}…` : flowTokenValue}
                                    </Badge>
                                  )}
                                  {flowIdValue && (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-300/80 text-emerald-800 dark:border-emerald-700 dark:text-emerald-100"
                                    >
                                      Flow ID: {flowIdValue}
                                    </Badge>
                                  )}
                                  {flowActionValue && (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-300/80 text-emerald-800 dark:border-emerald-700 dark:text-emerald-100"
                                    >
                                      Action: {flowActionValue}
                                    </Badge>
                                  )}
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  {orderedFields.map((variable) =>
                                    renderVariableControl(variable, {
                                      idPrefix: `flow-${index}`,
                                      textareaRows: variable.includes('action_data') ? 8 : undefined,
                                      helperClassName: 'text-emerald-700 dark:text-emerald-300/80',
                                      labelClassName: 'text-emerald-800 dark:text-emerald-200',
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Section */}
              <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp Message Preview
                </h4>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 overflow-hidden shadow-lg max-w-sm mx-auto">
                  {/* Header Component - All Formats */}
                  {(() => {
                    const tpl = templates.find(t => t.id === selectedTemplate);
                    const components = tpl?.components || [];
                    const headerComponent = components.find((c: any) =>
                      (c.type === 'HEADER' || c.type === 'header')
                    );

                    if (!headerComponent) return null;

                    const headerFormat = (headerComponent.format || '').toUpperCase();

                    // IMAGE Header
                    if (headerFormat === 'IMAGE' && templateVariables['_header_image']) {
                      return (
                        <div className="w-full bg-gray-100 dark:bg-gray-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={templateVariables['_header_image']}
                            alt="Header"
                            className="w-full h-auto max-h-48 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      );
                    }

                    // VIDEO Header
                    if (headerFormat === 'VIDEO' && templateVariables['_header_video']) {
                      return (
                        <div className="w-full bg-gray-900">
                          <video
                            src={templateVariables['_header_video']}
                            className="w-full h-auto max-h-48"
                            controls
                          />
                        </div>
                      );
                    }

                    // DOCUMENT Header
                    if (headerFormat === 'DOCUMENT' && templateVariables['_header_document']) {
                      return (
                        <div className="w-full bg-gray-100 dark:bg-gray-800 p-3 flex items-center gap-3">
                          <FileText className="h-8 w-8 text-red-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {templateVariables['_header_document_filename'] || 'document.pdf'}
                            </p>
                            <p className="text-xs text-muted-foreground">PDF Document</p>
                          </div>
                        </div>
                      );
                    }

                    // TEXT Header
                    if (headerFormat === 'TEXT' && headerComponent.text) {
                      return (
                        <div className="px-3 pt-3 pb-1">
                          <p className="text-base font-bold text-gray-900 dark:text-white">
                            {substituteTemplate(headerComponent.text, templateVariables)}
                          </p>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {/* Body Component */}
                  <div className="px-3 py-3">
                    <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                      {substituteTemplate(
                        templates.find(t => t.id === selectedTemplate)?.body || '',
                        templateVariables
                      )}
                    </p>
                  </div>

                  {/* Footer Component */}
                  {(() => {
                    const tpl = templates.find(t => t.id === selectedTemplate);
                    const components = tpl?.components || [];
                    const footerComponent = components.find((c: any) =>
                      (c.type === 'FOOTER' || c.type === 'footer')
                    );

                    if (footerComponent && footerComponent.text) {
                      return (
                        <div className="px-3 pb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {footerComponent.text}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Buttons Component */}
                  {(() => {
                    const tpl = templates.find(t => t.id === selectedTemplate);
                    if (tpl?.whatsapp?.buttons && tpl.whatsapp.buttons.length > 0) {
                      return (
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          {tpl.whatsapp.buttons.map((btn, idx) => (
                            <button
                              key={idx}
                              className="w-full px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-t first:border-t-0 border-gray-200 dark:border-gray-700 text-center transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                toast(`Button: ${btn.text || btn.type}`);
                              }}
                            >
                              {btn.type === 'PHONE_NUMBER' && '📞 '}
                              {btn.type === 'URL' && '🔗 '}
                              {btn.type === 'QUICK_REPLY' && '↩️ '}
                              {btn.type === 'FLOW' && '🧭 '}
                              {btn.text || btn.type}
                            </button>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                {hasMissingRequiredTemplateVars && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ Complete the required fields to enable sending.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTemplatePreview(false);
                  setSelectedTemplate('');
                  setTemplateVariables({});
                  setShowTemplatePicker(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  sendTestMessage();
                  setSelectedTemplate('');
                  setTemplateVariables({});
                  setShowTemplatePreview(false);
                  setShowTemplatePicker(false);
                }}
                disabled={(!activeContact && !phoneNumber) || hasMissingRequiredTemplateVars}
                className="bg-[#25D366] hover:bg-[#22c15e] text-white"
              >
                Send Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new chat</DialogTitle>
            <DialogDescription>Enter a phone number in E.164 format to start a new conversation.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="+1234567890"
              value={newChatNumber}
              onChange={(e) => setNewChatNumber(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>Cancel</Button>
            <Button onClick={handleAddNewChat}>Start Chat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {activeContact && (
        <Dialog open={showContactInfo} onOpenChange={setShowContactInfo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact Info</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <p><span className="font-semibold">Name:</span> {activeContact.name}</p>
              <p><span className="font-semibold">Phone:</span> {activeContact.phone}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowContactInfo(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}



