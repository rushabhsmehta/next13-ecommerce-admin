"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Settings,
  Save,
  ChevronDown,
  ChevronRight,
  Type,
  AlignLeft,
  List,
  Calendar,
  CheckSquare,
  Circle,
  Image as ImageIcon,
  Link,
  Send,
  ArrowRight,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Component type definitions matching WhatsApp Flow spec
type ComponentType =
  | "TextInput"
  | "TextArea"
  | "TextHeading"
  | "TextSubheading"
  | "TextBody"
  | "TextCaption"
  | "Dropdown"
  | "OptIn"
  | "DatePicker"
  | "CheckboxGroup"
  | "RadioButtonsGroup"
  | "Footer"
  | "Image"
  | "EmbeddedLink"
  | "Form";

interface ComponentConfig {
  type: ComponentType;
  name?: string;
  label?: string;
  required?: boolean;
  enabled?: boolean;
  visible?: boolean;
  [key: string]: any;
}

interface FlowScreen {
  id: string;
  title: string;
  terminal?: boolean;
  success?: boolean;
  data?: Record<string, any>;
  layout: {
    type: "SingleColumnLayout";
    children: ComponentConfig[];
  };
}

interface FlowJSON {
  version: string;
  screens: FlowScreen[];
  data_api_version?: string;
  data_channel_uri?: string;
  routing_model?: Record<string, any>;
}

// Component palette with metadata
const COMPONENT_PALETTE: Record<
  ComponentType,
  {
    icon: any;
    label: string;
    description: string;
    category: "input" | "display" | "action";
    defaultProps: Partial<ComponentConfig>;
  }
> = {
  TextInput: {
    icon: Type,
    label: "Text Input",
    description: "Single-line text field",
    category: "input",
    defaultProps: {
      type: "TextInput",
      name: "text_input_1",
      label: "Enter text",
      required: false,
      "input-type": "text",
    },
  },
  TextArea: {
    icon: AlignLeft,
    label: "Text Area",
    description: "Multi-line text field",
    category: "input",
    defaultProps: {
      type: "TextArea",
      name: "text_area_1",
      label: "Enter details",
      required: false,
      "max-length": 1000,
    },
  },
  Dropdown: {
    icon: List,
    label: "Dropdown",
    description: "Single selection dropdown",
    category: "input",
    defaultProps: {
      type: "Dropdown",
      name: "dropdown_1",
      label: "Select option",
      required: false,
      "data-source": [
        { id: "opt1", title: "Option 1" },
        { id: "opt2", title: "Option 2" },
      ],
    },
  },
  DatePicker: {
    icon: Calendar,
    label: "Date Picker",
    description: "Date selection field",
    category: "input",
    defaultProps: {
      type: "DatePicker",
      name: "date_picker_1",
      label: "Select date",
      required: false,
    },
  },
  CheckboxGroup: {
    icon: CheckSquare,
    label: "Checkbox Group",
    description: "Multiple selection checkboxes",
    category: "input",
    defaultProps: {
      type: "CheckboxGroup",
      name: "checkbox_group_1",
      label: "Select options",
      required: false,
      "data-source": [
        { id: "opt1", title: "Option 1" },
        { id: "opt2", title: "Option 2" },
      ],
    },
  },
  RadioButtonsGroup: {
    icon: Circle,
    label: "Radio Buttons",
    description: "Single selection radio group",
    category: "input",
    defaultProps: {
      type: "RadioButtonsGroup",
      name: "radio_group_1",
      label: "Choose one",
      required: false,
      "data-source": [
        { id: "opt1", title: "Option 1" },
        { id: "opt2", title: "Option 2" },
      ],
    },
  },
  OptIn: {
    icon: CheckSquare,
    label: "Opt-In",
    description: "Checkbox for opt-in consent",
    category: "input",
    defaultProps: {
      type: "OptIn",
      name: "opt_in_1",
      label: "I agree to terms",
      required: true,
    },
  },
  TextHeading: {
    icon: Type,
    label: "Heading",
    description: "Large heading text",
    category: "display",
    defaultProps: {
      type: "TextHeading",
      text: "Heading Text",
    },
  },
  TextSubheading: {
    icon: Type,
    label: "Subheading",
    description: "Medium subheading text",
    category: "display",
    defaultProps: {
      type: "TextSubheading",
      text: "Subheading Text",
    },
  },
  TextBody: {
    icon: AlignLeft,
    label: "Body Text",
    description: "Regular body text",
    category: "display",
    defaultProps: {
      type: "TextBody",
      text: "Body text content",
    },
  },
  TextCaption: {
    icon: AlignLeft,
    label: "Caption",
    description: "Small caption text",
    category: "display",
    defaultProps: {
      type: "TextCaption",
      text: "Caption text",
    },
  },
  Image: {
    icon: ImageIcon,
    label: "Image",
    description: "Display an image",
    category: "display",
    defaultProps: {
      type: "Image",
      src: "https://example.com/image.jpg",
      "alt-text": "Image description",
    },
  },
  EmbeddedLink: {
    icon: Link,
    label: "Link",
    description: "Embedded hyperlink",
    category: "display",
    defaultProps: {
      type: "EmbeddedLink",
      text: "Click here",
      "on-click-action": {
        name: "open_url",
        payload: {
          url: "https://example.com",
        },
      },
    },
  },
  Footer: {
    icon: Send,
    label: "Footer Button",
    description: "Action button at screen bottom",
    category: "action",
    defaultProps: {
      type: "Footer",
      label: "Continue",
      "on-click-action": {
        name: "complete",
        payload: {},
      },
    },
  },
  Form: {
    icon: AlignLeft,
    label: "Form Container",
    description: "Group form fields together",
    category: "input",
    defaultProps: {
      type: "Form",
      name: "form_1",
      children: [],
    },
  },
};

interface VisualFlowEditorProps {
  initialFlow?: FlowJSON;
  onSave: (flow: FlowJSON) => void;
  onCancel?: () => void;
}

export default function VisualFlowEditor({
  initialFlow,
  onSave,
  onCancel,
}: VisualFlowEditorProps) {
  const [flowJson, setFlowJson] = useState<FlowJSON>(
    initialFlow || {
      version: "7.3",
      screens: [
        {
          id: "SCREEN_1",
          title: "Welcome",
          layout: {
            type: "SingleColumnLayout",
            children: [],
          },
        },
      ],
    }
  );

  const [selectedScreenIndex, setSelectedScreenIndex] = useState(0);
  const [selectedComponentIndex, setSelectedComponentIndex] = useState<number | null>(null);
  const [selectedNestedIndex, setSelectedNestedIndex] = useState<number | null>(null); // For Form children
  const [viewMode, setViewMode] = useState<"design" | "preview">("design");

  const currentScreen = flowJson.screens[selectedScreenIndex];
  
  // Get the currently selected component (either top-level or nested)
  const getSelectedComponent = () => {
    if (selectedComponentIndex === null) return null;
    const topLevelComponent = currentScreen.layout.children[selectedComponentIndex];
    if (!topLevelComponent) return null;
    if (selectedNestedIndex !== null && topLevelComponent.type === "Form" && (topLevelComponent as any).children) {
      return (topLevelComponent as any).children[selectedNestedIndex];
    }
    return topLevelComponent;
  };

  // Screen management
  const addScreen = useCallback(() => {
    const newScreenId = `SCREEN_${flowJson.screens.length + 1}`;
    setFlowJson((prev) => ({
      ...prev,
      screens: [
        ...prev.screens,
        {
          id: newScreenId,
          title: `Screen ${prev.screens.length + 1}`,
          layout: {
            type: "SingleColumnLayout",
            children: [],
          },
        },
      ],
    }));
    setSelectedScreenIndex(flowJson.screens.length);
  }, [flowJson.screens.length]);

  const deleteScreen = useCallback(
    (index: number) => {
      if (flowJson.screens.length === 1) {
        alert("Cannot delete the last screen");
        return;
      }
      setFlowJson((prev) => ({
        ...prev,
        screens: prev.screens.filter((_, i) => i !== index),
      }));
      setSelectedScreenIndex(Math.max(0, index - 1));
    },
    [flowJson.screens.length]
  );

  const updateScreen = useCallback(
    (updates: Partial<FlowScreen>) => {
      setFlowJson((prev) => ({
        ...prev,
        screens: prev.screens.map((screen, i) =>
          i === selectedScreenIndex ? { ...screen, ...updates } : screen
        ),
      }));
    },
    [selectedScreenIndex]
  );

  // Component management
  const addComponent = useCallback(
    (componentType: ComponentType) => {
      const config = COMPONENT_PALETTE[componentType];
      const newComponent = { ...config.defaultProps } as ComponentConfig;

      setFlowJson((prev) => {
        const updatedScreens = [...prev.screens];
        updatedScreens[selectedScreenIndex] = {
          ...updatedScreens[selectedScreenIndex],
          layout: {
            ...updatedScreens[selectedScreenIndex].layout,
            children: [...updatedScreens[selectedScreenIndex].layout.children, newComponent],
          },
        };
        return { ...prev, screens: updatedScreens };
      });

      setSelectedComponentIndex(currentScreen.layout.children.length);
    },
    [selectedScreenIndex, currentScreen.layout.children.length]
  );

  const deleteComponent = useCallback(
    (index: number) => {
      setFlowJson((prev) => {
        const updatedScreens = [...prev.screens];
        updatedScreens[selectedScreenIndex] = {
          ...updatedScreens[selectedScreenIndex],
          layout: {
            ...updatedScreens[selectedScreenIndex].layout,
            children: updatedScreens[selectedScreenIndex].layout.children.filter(
              (_, i) => i !== index
            ),
          },
        };
        return { ...prev, screens: updatedScreens };
      });
      setSelectedComponentIndex(null);
    },
    [selectedScreenIndex]
  );

  const updateComponent = useCallback(
    (index: number, updates: Partial<ComponentConfig>) => {
      setFlowJson((prev) => {
        const updatedScreens = [...prev.screens];
        updatedScreens[selectedScreenIndex] = {
          ...updatedScreens[selectedScreenIndex],
          layout: {
            ...updatedScreens[selectedScreenIndex].layout,
            children: updatedScreens[selectedScreenIndex].layout.children.map((comp, i) =>
              i === index ? { ...comp, ...updates } : comp
            ),
          },
        };
        return { ...prev, screens: updatedScreens };
      });
    },
    [selectedScreenIndex]
  );

  const moveComponent = useCallback(
    (fromIndex: number, toIndex: number) => {
      setFlowJson((prev) => {
        const updatedScreens = [...prev.screens];
        const children = [...updatedScreens[selectedScreenIndex].layout.children];
        const [moved] = children.splice(fromIndex, 1);
        children.splice(toIndex, 0, moved);

        updatedScreens[selectedScreenIndex] = {
          ...updatedScreens[selectedScreenIndex],
          layout: {
            ...updatedScreens[selectedScreenIndex].layout,
            children,
          },
        };
        return { ...prev, screens: updatedScreens };
      });
    },
    [selectedScreenIndex]
  );

  const handleSave = () => {
    onSave(flowJson);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4 bg-gradient-to-br from-background via-background to-muted/20 p-2 rounded-xl">
      {/* Component Palette - Left Sidebar with Enhanced Styling */}
      <Card className="w-64 border-2 shadow-xl">
        <CardHeader className="pb-3 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Component Library
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">Click to add to your screen</p>
        </CardHeader>
        <ScrollArea className="h-[calc(100%-5rem)]">
          <CardContent className="space-y-4 pb-4 pt-4">
            {/* Input Components */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Input Fields</h4>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </div>
              <div className="space-y-1">
                {(Object.entries(COMPONENT_PALETTE) as [ComponentType, typeof COMPONENT_PALETTE[ComponentType]][]).filter(
                  ([_, config]) => config.category === "input"
                ).map(([type, config]) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-auto py-2.5 hover:bg-primary/10 hover:border-primary/50 border border-transparent transition-all hover:shadow-sm"
                    onClick={() => addComponent(type)}
                  >
                    <config.icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="text-left flex-1">
                      <div className="text-xs font-semibold">{config.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{config.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Display Components */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Display</h4>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
              </div>
              <div className="space-y-1">
                {(Object.entries(COMPONENT_PALETTE) as [ComponentType, typeof COMPONENT_PALETTE[ComponentType]][]).filter(
                  ([_, config]) => config.category === "display"
                ).map(([type, config]) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-auto py-2.5 hover:bg-purple-500/10 hover:border-purple-500/50 border border-transparent transition-all hover:shadow-sm"
                    onClick={() => addComponent(type)}
                  >
                    <config.icon className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <div className="text-left flex-1">
                      <div className="text-xs font-semibold">{config.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{config.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Components */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-600">Actions</h4>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
              </div>
              <div className="space-y-1">
                {(Object.entries(COMPONENT_PALETTE) as [ComponentType, typeof COMPONENT_PALETTE[ComponentType]][]).filter(
                  ([_, config]) => config.category === "action"
                ).map(([type, config]) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-auto py-2.5 hover:bg-green-500/10 hover:border-green-500/50 border border-transparent transition-all hover:shadow-sm"
                    onClick={() => addComponent(type)}
                  >
                    <config.icon className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="text-left flex-1">
                      <div className="text-xs font-semibold">{config.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{config.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Main Canvas - Step-by-Step Design */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Step 1: Screen Navigation */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-3 pt-3 bg-gradient-to-r from-blue-500/10 to-blue-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                  1
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Select & Manage Screens</CardTitle>
                  <p className="text-xs text-muted-foreground">Navigate between flow screens</p>
                </div>
              </div>
              <Button variant="default" size="sm" onClick={addScreen} className="shadow-md hover:shadow-lg transition-shadow">
                <Plus className="h-3 w-3 mr-1.5" />
                New Screen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {flowJson.screens.map((screen, index) => (
                <Button
                  key={screen.id}
                  variant={selectedScreenIndex === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedScreenIndex(index)}
                  className={cn(
                    "flex-shrink-0 relative transition-all",
                    selectedScreenIndex === index && "shadow-md ring-2 ring-primary/20"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {screen.title}
                    {screen.terminal && (
                      <Badge variant={screen.success ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {screen.success ? "✓ Success" : "END"}
                      </Badge>
                    )}
                  </div>
                  {flowJson.screens.length > 1 && (
                    <Trash2
                      className="ml-2 h-3 w-3 opacity-50 hover:opacity-100 hover:text-destructive transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteScreen(index);
                      }}
                    />
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Screen Configuration */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-3 pt-3 bg-gradient-to-r from-purple-500/10 to-purple-500/5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                2
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm font-bold">Configure &ldquo;{currentScreen.title}&rdquo;</CardTitle>
                <p className="text-xs text-muted-foreground">Set screen properties and behavior</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3 pb-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                  Screen ID
                  <Badge variant="outline" className="text-[9px] px-1">REQUIRED</Badge>
                </Label>
                <Input
                  value={currentScreen.id}
                  onChange={(e) => updateScreen({ id: e.target.value })}
                  className="h-8 text-sm font-mono"
                  placeholder="SCREEN_NAME"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                  Display Title
                  <Badge variant="outline" className="text-[9px] px-1">REQUIRED</Badge>
                </Label>
                <Input
                  value={currentScreen.title}
                  onChange={(e) => updateScreen({ title: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="User-facing title"
                />
              </div>
            </div>
            <div className="flex items-center gap-6 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2.5">
                <Switch
                  checked={currentScreen.terminal || false}
                  onCheckedChange={(checked) => updateScreen({ terminal: checked })}
                  id="terminal"
                />
                <Label htmlFor="terminal" className="text-xs font-medium cursor-pointer">
                  <span className="font-semibold">Terminal Screen</span>
                  <span className="text-muted-foreground ml-1">(End of flow)</span>
                </Label>
              </div>
              {currentScreen.terminal && (
                <div className="flex items-center gap-2.5">
                  <Switch
                    checked={currentScreen.success || false}
                    onCheckedChange={(checked) => updateScreen({ success: checked })}
                    id="success"
                  />
                  <Label htmlFor="success" className="text-xs font-medium cursor-pointer">
                    <span className="font-semibold">Success Screen</span>
                    <span className="text-muted-foreground ml-1">(Positive outcome)</span>
                  </Label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Build Screen Content */}
        <Card className="flex-1 border-2 shadow-lg flex flex-col overflow-hidden">
          <CardHeader className="pb-3 pt-3 bg-gradient-to-r from-green-500/10 to-green-500/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                3
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Build Screen Content</CardTitle>
                <p className="text-xs text-muted-foreground">Add and arrange components from the left panel</p>
              </div>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="pt-4 pb-4 space-y-3">
              {currentScreen.layout.children.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-sm font-medium mb-1">No components yet</div>
                  <div className="text-xs">Click components from the left panel to add them</div>
                </div>
              )}
              {currentScreen.layout.children.map((component, index) => (
                <div key={index}>
                  <div
                    className={cn(
                      "border-2 rounded-lg p-3 cursor-pointer transition-all",
                      selectedComponentIndex === index && selectedNestedIndex === null
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50 hover:shadow-sm"
                    )}
                    onClick={() => {
                      setSelectedComponentIndex(index);
                      setSelectedNestedIndex(null); // Reset nested selection when clicking parent
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 cursor-grab hover:bg-primary/10"
                      >
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">
                            {component.type}
                          </Badge>
                          {component.name && (
                            <span className="text-xs text-muted-foreground truncate">
                              {component.name}
                            </span>
                          )}
                          {component.type === "Form" && (component as any).children && (
                            <Badge variant="secondary" className="text-[10px]">
                              {(component as any).children.length} items
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm">
                          {component.label || 
                           component.text || 
                           (component.type === "Form" && component.name ? `Form Container: ${component.name}` : null) ||
                           (component.type === "Image" ? "Image component" : null) ||
                           (component.type === "Footer" ? `Button: ${component.label || "Continue"}` : null) ||
                             COMPONENT_PALETTE[component.type as ComponentType]?.label || 
                             "Component"}
                          </div>
                          {/* Show data-source options preview for top-level components */}
                          {(component.type === "RadioButtonsGroup" || component.type === "Dropdown" || component.type === "CheckboxGroup") && 
                           (component as any)["data-source"] && 
                           Array.isArray((component as any)["data-source"]) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Options: {((component as any)["data-source"] as any[]).slice(0, 3).map((opt: any) => opt.title || opt.id).join(", ")}
                              {((component as any)["data-source"] as any[]).length > 3 && ` +${((component as any)["data-source"] as any[]).length - 3} more`}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteComponent(index);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Show Form children nested */}
                    {component.type === "Form" && (component as any).children && (
                      <div className="ml-8 mt-2 space-y-2 border-l-2 border-muted pl-3">
                        {((component as any).children as ComponentConfig[]).map((child: ComponentConfig, childIndex: number) => (
                          <div
                            key={childIndex}
                            className={cn(
                              "border rounded-md p-2 cursor-pointer transition-colors",
                              selectedComponentIndex === index && selectedNestedIndex === childIndex
                                ? "bg-primary/10 border-primary"
                                : "bg-muted/30 hover:bg-muted/50 hover:border-primary/50"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComponentIndex(index);
                              setSelectedNestedIndex(childIndex);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {child.type}
                              </Badge>
                              {child.name && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {child.name}
                                </span>
                              )}
                            </div>
                            <div className="text-xs mt-1">
                              {child.label || child.text || 
                               (child.type === "Footer" ? `Button: ${child.label || "Continue"}` : null) ||
                               COMPONENT_PALETTE[child.type as ComponentType]?.label}
                            </div>
                            {/* Show data-source options preview */}
                            {(child.type === "RadioButtonsGroup" || child.type === "Dropdown" || child.type === "CheckboxGroup") && 
                             (child as any)["data-source"] && 
                             Array.isArray((child as any)["data-source"]) && (
                              <div className="text-[10px] text-muted-foreground mt-1">
                                Options: {((child as any)["data-source"] as any[]).slice(0, 3).map((opt: any) => opt.title || opt.id).join(", ")}
                                {((child as any)["data-source"] as any[]).length > 3 && ` +${((child as any)["data-source"] as any[]).length - 3} more`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Step 4: Actions */}
        <Card className="border-2 shadow-lg">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button variant="outline" onClick={() => setViewMode(viewMode === "design" ? "preview" : "design")} className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                {viewMode === "design" ? "Preview" : "Design"}
              </Button>
              <Button onClick={handleSave} className="flex-1 shadow-md">
                <Save className="h-4 w-4 mr-2" />
                Save Flow
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Panel - Right Sidebar */}
      {selectedComponentIndex !== null && getSelectedComponent() && (
        <ComponentPropertiesPanel
          component={getSelectedComponent()!}
          onUpdate={(updates) => {
            if (selectedNestedIndex !== null) {
              // Update nested component within Form
              const parentComponent = currentScreen.layout.children[selectedComponentIndex] as any;
              const updatedChildren = [...parentComponent.children];
              updatedChildren[selectedNestedIndex] = { ...updatedChildren[selectedNestedIndex], ...updates };
              updateComponent(selectedComponentIndex, { children: updatedChildren });
            } else {
              // Update top-level component
              updateComponent(selectedComponentIndex, updates);
            }
          }}
          onClose={() => {
            setSelectedComponentIndex(null);
            setSelectedNestedIndex(null);
          }}
          isNested={selectedNestedIndex !== null}
        />
      )}
    </div>
  );
}

// Component Properties Panel
interface ComponentPropertiesPanelProps {
  component: ComponentConfig;
  onUpdate: (updates: Partial<ComponentConfig>) => void;
  onClose: () => void;
  isNested?: boolean;
}

function ComponentPropertiesPanel({ component, onUpdate, onClose, isNested }: ComponentPropertiesPanelProps) {
  const hasDataSource = "data-source" in component && Array.isArray(component["data-source"]);

  return (
    <div className="w-80 border rounded-lg bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Properties</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            ×
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="w-fit">
            {component.type}
          </Badge>
          {isNested && (
            <Badge variant="secondary" className="text-[10px]">
              Inside Form
            </Badge>
          )}
        </div>
      </CardHeader>
      <ScrollArea className="h-[calc(100%-5rem)]">
        <CardContent className="space-y-4 pb-4">
          {/* Common Properties */}
          {component.name !== undefined && (
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={component.name || ""}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="h-8 text-sm mt-1"
              />
            </div>
          )}

          {component.label !== undefined && (
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={component.label || ""}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="h-8 text-sm mt-1"
              />
            </div>
          )}

          {component.text !== undefined && (
            <div>
              <Label className="text-xs">Text</Label>
              <Textarea
                value={component.text || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                className="text-sm mt-1 min-h-[60px]"
              />
            </div>
          )}

          {component.required !== undefined && (
            <div className="flex items-center gap-2">
              <Switch
                checked={component.required || false}
                onCheckedChange={(checked) => onUpdate({ required: checked })}
              />
              <Label className="text-xs">Required</Label>
            </div>
          )}

          {/* Data Source for dropdown/select components */}
          {hasDataSource && (
            <div>
              <Label className="text-xs">Options</Label>
              <div className="space-y-2 mt-1">
                {(component["data-source"] as any[]).map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option.title}
                      onChange={(e) => {
                        const newDataSource = [...(component["data-source"] as any[])];
                        newDataSource[index] = { ...option, title: e.target.value };
                        onUpdate({ "data-source": newDataSource });
                      }}
                      placeholder="Option text"
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const newDataSource = (component["data-source"] as any[]).filter((_, i) => i !== index);
                        onUpdate({ "data-source": newDataSource });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDataSource = [
                      ...(component["data-source"] as any[]),
                      { id: `opt${(component["data-source"] as any[]).length + 1}`, title: "New Option" },
                    ];
                    onUpdate({ "data-source": newDataSource });
                  }}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Type-specific properties */}
          {component.type === "TextInput" && (
            <div>
              <Label className="text-xs">Input Type</Label>
              <Select
                value={component["input-type"] || "text"}
                onValueChange={(value) => onUpdate({ "input-type": value })}
              >
                <SelectTrigger className="h-8 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="passcode">Passcode</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {component.type === "Image" && (
            <>
              <div>
                <Label className="text-xs">Image URL</Label>
                <Input
                  value={component.src || ""}
                  onChange={(e) => onUpdate({ src: e.target.value })}
                  className="h-8 text-sm mt-1"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <Label className="text-xs">Alt Text</Label>
                <Input
                  value={component["alt-text"] || ""}
                  onChange={(e) => onUpdate({ "alt-text": e.target.value })}
                  className="h-8 text-sm mt-1"
                />
              </div>
            </>
          )}

          {component.type === "Footer" && (
            <div>
              <Label className="text-xs">Action Type</Label>
              <Select
                value={component["on-click-action"]?.name || "complete"}
                onValueChange={(value) => {
                  onUpdate({
                    "on-click-action": {
                      name: value,
                      payload: value === "complete" ? {} : { screen: "NEXT_SCREEN" },
                    },
                  });
                }}
              >
                <SelectTrigger className="h-8 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complete">Complete Flow</SelectItem>
                  <SelectItem value="navigate">Navigate to Screen</SelectItem>
                  <SelectItem value="data_exchange">Data Exchange</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </div>
  );
}
