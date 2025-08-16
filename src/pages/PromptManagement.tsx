import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, Link, Plus, Trash2, Settings, User, Bot, Search, Cloud, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FileUpload from "@/components/FileUpload";
import FileSearchTest from "@/components/FileSearchTest";
import { PromptManagementSidebar } from "@/components/PromptManagementSidebar";
import { AppLayout } from "@/components/AppLayout";


interface PersonalContext {
  businessName: string;
  details: string;
}

interface SystemPrompt {
  systemInstructions: string;
}

interface ToolConfig {
  webSearch: boolean;
  fileSearch: boolean;
  weatherApi: boolean;
  timeApi: boolean;
  customTools: CustomTool[];
}

interface CustomTool {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey: string;
  description: string;
  status?: 'testing' | 'success' | 'error' | 'unknown';
  lastTested?: string;
  responseTime?: number;
}

interface TriggerConfig {
  mode: 'keyword' | 'nlp';
  keywords: string[];
  nlpIntents: string[];
  nlpCustomInstructions: string;
}

interface FileReference {
  id: string;
  name: string;
  type: 'upload' | 'google_docs' | 'google_sheets';
  url: string;
}

export default function PromptManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [personalContext, setPersonalContext] = useState<PersonalContext>({
    businessName: "Muthanna Alfaris - مثنى الفارس",
    details: "Role: Project Manager In GenAI And T&S at Meta\n\nExperience: 9+ years spanning People Management, AI systems design, global operations, ethical automation, and post-conflict development\n\nBackground: Strategic and hands-on Project Manager at Meta, leading high-impact, cross-functional programs involving AI agents, multi-agent workflows, and intelligent enforcement systems that scale across cultures, time zones, and vendor ecosystems\n\nPhilosophy: Champions human-centered AI—using automation to empower people, not replace them\n\nScope: Programs often exceed $50M in scope, coordinate 100+ outsourced workers globally, and directly impact the experience of billions of users\n\nPersonal details: Born in Qayyarah, south of Mosul, Iraq. Religion: Islam. Current address: Dublin, Ireland."
  });

  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt>({
    systemInstructions: "You are an AI assistant developed by Muthanna Alfaris responding to Facebook comments and direct messages. You support multiple languages and dialects, especially Iraqi accent and Arabic dialects.\n\nIMPORTANT INSTRUCTIONS:\n- Always identify yourself as an AI assistant created/developed by Muthanna Alfaris\n- Never assume or adopt Muthanna's personality - you are his AI assistant, not him personally\n- When asked about the developer/creator, provide information about Muthanna Alfaris\n- Respond in the same language as the user's question\n- Understand and adapt to different Arabic dialects, especially Iraqi dialect\n- Be helpful and professional while maintaining clear boundaries about your identity"
  });

  const [toolConfig, setToolConfig] = useState<ToolConfig>({
    webSearch: true,
    fileSearch: false,
    weatherApi: false,
    timeApi: false,
    customTools: []
  });

  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>({
    mode: 'keyword',
    keywords: ['ai'],
    nlpIntents: ['product_inquiry', 'service_request', 'support_needed'],
    nlpCustomInstructions: 'Respond to product inquiries, service requests, and support needs. Escalate political discussions, personal matters, or sensitive topics to human moderators.'
  });

  const [fileReferences, setFileReferences] = useState<FileReference[]>([]);
  const [newCustomTool, setNewCustomTool] = useState<Omit<CustomTool, 'id'>>({
    name: '',
    apiEndpoint: '',
    apiKey: '',
    description: '',
    status: 'unknown'
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.display_name || session.user.email || '',
            email: session.user.email || '',
            fb_user_id: profile.fb_user_id || '',
            subscription_status: 'trial',
            trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    };
    getCurrentUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Load configuration on component mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const { data: response, error } = await supabase.functions.invoke('manage-prompt-config', {
        body: { action: 'get_active' }
      });
      
      if (error) {
        console.error('Error loading configuration:', error);
        toast({
          title: "Load Error",
          description: "Failed to load configuration",
          variant: "destructive"
        });
        return;
      }

      const config = response.data;
      if (config) {
        setConfigId(config.id);
        setPersonalContext({
          businessName: config.business_name || "Muthanna Alfaris - مثنى الفارس",
          details: config.details || "Role: Project Manager In GenAI And T&S at Meta\n\nExperience: 9+ years spanning People Management, AI systems design, global operations, ethical automation, and post-conflict development\n\nBackground: Strategic and hands-on Project Manager at Meta, leading high-impact, cross-functional programs involving AI agents, multi-agent workflows, and intelligent enforcement systems that scale across cultures, time zones, and vendor ecosystems\n\nPhilosophy: Champions human-centered AI—using automation to empower people, not replace them\n\nScope: Programs often exceed $50M in scope, coordinate 100+ outsourced workers globally, and directly impact the experience of billions of users\n\nPersonal details: Born in Qayyarah, south of Mosul, Iraq. Religion: Islam. Current address: Dublin, Ireland."
        });
        setSystemPrompts({
          systemInstructions: config.system_instructions || "You are an AI assistant developed by Muthanna Alfaris responding to Facebook comments and direct messages. You support multiple languages and dialects, especially Iraqi accent and Arabic dialects.\n\nIMPORTANT INSTRUCTIONS:\n- Always identify yourself as an AI assistant\n- Never assume or adopt Muthanna's personality - you are his AI assistant, not him personally\n- When asked about the developer/creator, provide information about Muthanna Alfaris\n- When asked about a specific post, ONLY discuss the actual content of that post, not information about Muthanna\n- If post content is provided, analyze and explain THAT content specifically\n- Respond in the same language as the user's question\n- Understand and adapt to different Arabic dialects, especially Iraqi dialect\n- Be helpful and professional while maintaining clear boundaries about your identity"
        });
        setToolConfig({
          webSearch: config.web_search_enabled ?? true,
          fileSearch: config.file_search_enabled ?? false,
          weatherApi: config.weather_api_enabled ?? false,
          timeApi: config.time_api_enabled ?? false,
          customTools: config.custom_tools || []
        });
        setTriggerConfig({
          mode: config.trigger_mode || 'keyword',
          keywords: config.keywords || ['ai'],
          nlpIntents: config.nlp_intents || ['product_inquiry', 'service_request', 'support_needed'],
          nlpCustomInstructions: config.nlp_custom_instructions || 'Respond to product inquiries, service requests, and support needs. Escalate political discussions, personal matters, or sensitive topics to human moderators.'
        });
        setFileReferences(config.file_references || []);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: "Load Error", 
        description: "Failed to load configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomTool = () => {
    if (!newCustomTool.name || !newCustomTool.apiEndpoint) {
      toast({
        title: "Missing Information",
        description: "Please provide tool name and API endpoint",
        variant: "destructive"
      });
      return;
    }

    const tool: CustomTool = {
      ...newCustomTool,
      id: Date.now().toString(),
      status: 'unknown'
    };

    setToolConfig(prev => ({
      ...prev,
      customTools: [...prev.customTools, tool]
    }));

    setNewCustomTool({ 
      name: '', 
      apiEndpoint: '', 
      apiKey: '', 
      description: '',
      status: 'unknown'
    });
    
    toast({
      title: "Tool Added",
      description: `${tool.name} has been added to your custom tools`
    });
  };

  const testCustomTool = async (toolId: string) => {
    const tool = toolConfig.customTools.find(t => t.id === toolId);
    if (!tool) return;

    // Update tool status to testing
    setToolConfig(prev => ({
      ...prev,
      customTools: prev.customTools.map(t => 
        t.id === toolId ? { ...t, status: 'testing' } : t
      )
    }));

    try {
      const { data: response, error } = await supabase.functions.invoke('test-custom-tool', {
        body: {
          apiEndpoint: tool.apiEndpoint,
          apiKey: tool.apiKey
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const isSuccess = response.success;
      const status = isSuccess ? 'success' : 'error';

      setToolConfig(prev => ({
        ...prev,
        customTools: prev.customTools.map(t => 
          t.id === toolId ? { 
            ...t, 
            status,
            lastTested: new Date().toISOString(),
            responseTime: response.responseTime
          } : t
        )
      }));

      toast({
        title: isSuccess ? "Tool Test Successful" : "Tool Test Failed",
        description: isSuccess 
          ? `Tool is working correctly (${response.responseTime}ms)` 
          : `Error: ${response.error || 'Unknown error'}`,
        variant: isSuccess ? "default" : "destructive"
      });

    } catch (error) {
      setToolConfig(prev => ({
        ...prev,
        customTools: prev.customTools.map(t => 
          t.id === toolId ? { 
            ...t, 
            status: 'error',
            lastTested: new Date().toISOString()
          } : t
        )
      }));

      toast({
        title: "Tool Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const removeCustomTool = (id: string) => {
    setToolConfig(prev => ({
      ...prev,
      customTools: prev.customTools.filter(tool => tool.id !== id)
    }));
  };

  const addFileReference = (type: 'google_docs' | 'google_sheets', url: string, name: string) => {
    const fileRef: FileReference = {
      id: Date.now().toString(),
      name,
      type,
      url
    };
    setFileReferences(prev => [...prev, fileRef]);
  };

  const removeFileReference = (id: string) => {
    setFileReferences(prev => prev.filter(file => file.id !== id));
  };

  const saveConfiguration = async () => {
    try {
      setLoading(true);
      
      const configData = {
        business_name: personalContext.businessName,
        details: personalContext.details,
        system_instructions: systemPrompts.systemInstructions,
        web_search_enabled: toolConfig.webSearch,
        file_search_enabled: toolConfig.fileSearch,
        weather_api_enabled: toolConfig.weatherApi,
        time_api_enabled: toolConfig.timeApi,
        custom_tools: toolConfig.customTools,
        trigger_mode: triggerConfig.mode,
        keywords: triggerConfig.keywords,
        nlp_intents: triggerConfig.nlpIntents,
        nlp_custom_instructions: triggerConfig.nlpCustomInstructions,
        file_references: fileReferences
      };

      const { data: response, error } = await supabase.functions.invoke('manage-prompt-config', {
        body: configData
      });

      if (error) {
        throw new Error(error.message);
      }

      setConfigId(response.data.id);
      toast({
        title: "Configuration Saved",
        description: "Your prompt configuration has been saved successfully"
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save configuration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getToolStatusIcon = (status?: string) => {
    switch (status) {
      case 'testing':
        return <AlertCircle className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Add state for active section
  const [activeSection, setActiveSection] = useState('personal');

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Personal Context</CardTitle>
              <CardDescription>
                Configure personal information that the AI will use when responding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business/Person Name</Label>
                <Input
                  id="businessName"
                  value={personalContext.businessName}
                  onChange={(e) => setPersonalContext(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Enter your business name or personal name"
                />
              </div>
              <div>
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  value={personalContext.details}
                  onChange={(e) => setPersonalContext(prev => ({ ...prev, details: e.target.value }))}
                  rows={12}
                  placeholder="Enter all relevant details about yourself, your business, role, experience, philosophy, background, etc."
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'prompts':
        return (
          <Card>
            <CardHeader>
              <CardTitle>System Instructions</CardTitle>
              <CardDescription>
                Configure how the AI responds in all contexts (comments and direct messages)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="systemInstructions">System Instructions</Label>
                <Textarea
                  id="systemInstructions"
                  value={systemPrompts.systemInstructions}
                  onChange={(e) => setSystemPrompts(prev => ({ ...prev, systemInstructions: e.target.value }))}
                  rows={12}
                  className="mt-2"
                  placeholder="Enter detailed instructions for how the AI should behave and respond to users..."
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'tools':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Tools Configuration</CardTitle>
              <CardDescription>
                Enable and configure tools that the AI can use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="webSearch">Web Search</Label>
                    <p className="text-sm text-muted-foreground">Search the web for current information</p>
                  </div>
                  <Switch
                    id="webSearch"
                    checked={toolConfig.webSearch}
                    onCheckedChange={(checked) => setToolConfig(prev => ({ ...prev, webSearch: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="fileSearch">File Search</Label>
                    <p className="text-sm text-muted-foreground">Search through uploaded files</p>
                  </div>
                  <Switch
                    id="fileSearch"
                    checked={toolConfig.fileSearch}
                    onCheckedChange={(checked) => setToolConfig(prev => ({ ...prev, fileSearch: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weatherApi">Weather API</Label>
                    <p className="text-sm text-muted-foreground">Get current weather information</p>
                  </div>
                  <Switch
                    id="weatherApi"
                    checked={toolConfig.weatherApi}
                    onCheckedChange={(checked) => setToolConfig(prev => ({ ...prev, weatherApi: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="timeApi">Time API</Label>
                    <p className="text-sm text-muted-foreground">Get current time and date</p>
                  </div>
                  <Switch
                    id="timeApi"
                    checked={toolConfig.timeApi}
                    onCheckedChange={(checked) => setToolConfig(prev => ({ ...prev, timeApi: checked }))}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Custom Tools</h3>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="toolName">Tool Name</Label>
                      <Input
                        id="toolName"
                        placeholder="e.g., Currency Converter"
                        value={newCustomTool.name}
                        onChange={(e) => setNewCustomTool(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="apiEndpoint">API Endpoint</Label>
                      <Input
                        id="apiEndpoint"
                        placeholder="https://api.example.com/convert"
                        value={newCustomTool.apiEndpoint}
                        onChange={(e) => setNewCustomTool(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="apiKey">API Key (Optional)</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter API key if required"
                        value={newCustomTool.apiKey}
                        onChange={(e) => setNewCustomTool(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="What this tool does"
                        value={newCustomTool.description}
                        onChange={(e) => setNewCustomTool(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={addCustomTool} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Custom Tool
                  </Button>
                </div>

                {toolConfig.customTools.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {toolConfig.customTools.map((tool) => (
                      <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{tool.name}</h4>
                            {getToolStatusIcon(tool.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{tool.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{tool.apiEndpoint}</p>
                          {tool.lastTested && (
                            <p className="text-xs text-muted-foreground">
                              Last tested: {new Date(tool.lastTested).toLocaleString()}
                              {tool.responseTime && ` (${tool.responseTime}ms)`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testCustomTool(tool.id)}
                            disabled={tool.status === 'testing'}
                          >
                            {tool.status === 'testing' ? 'Testing...' : 'Test'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeCustomTool(tool.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'triggers':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Trigger Configuration</CardTitle>
              <CardDescription>
                Configure when the AI should respond to messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="triggerMode">Trigger Mode</Label>
                <Select
                  value={triggerConfig.mode}
                  onValueChange={(value: 'keyword' | 'nlp') => setTriggerConfig(prev => ({ ...prev, mode: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Keyword-based</SelectItem>
                    <SelectItem value="nlp">NLP Intent Detection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {triggerConfig.mode === 'keyword' && (
                <div>
                  <Label>Trigger Keywords</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {triggerConfig.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {keyword}
                          <button
                            onClick={() => setTriggerConfig(prev => ({
                              ...prev,
                              keywords: prev.keywords.filter((_, i) => i !== index)
                            }))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add new keyword"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = e.currentTarget.value.trim();
                            if (value) {
                              setTriggerConfig(prev => ({
                                ...prev,
                                keywords: [...prev.keywords, value]
                              }));
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {triggerConfig.mode === 'nlp' && (
                <div className="space-y-4">
                  <div>
                    <Label>NLP Intents</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {triggerConfig.nlpIntents.map((intent, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {intent}
                            <button
                              onClick={() => setTriggerConfig(prev => ({
                                ...prev,
                                nlpIntents: prev.nlpIntents.filter((_, i) => i !== index)
                              }))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add new intent (e.g., product_inquiry)"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = e.currentTarget.value.trim();
                              if (value) {
                                setTriggerConfig(prev => ({
                                  ...prev,
                                  nlpIntents: [...prev.nlpIntents, value]
                                }));
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="nlpInstructions">Response & Escalation Guidelines</Label>
                    <Textarea
                      id="nlpInstructions"
                      value={triggerConfig.nlpCustomInstructions}
                      onChange={(e) => setTriggerConfig(prev => ({ ...prev, nlpCustomInstructions: e.target.value }))}
                      rows={6}
                      className="mt-2"
                      placeholder="Define when to respond vs escalate. Example: Respond to product inquiries, service requests, and support needs. Escalate political discussions, personal matters, or sensitive topics to human moderators."
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Specify when the AI should respond versus when it should escalate to human moderators. Include guidelines for handling different types of content.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'files':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>File Management</CardTitle>
                <CardDescription>
                  Upload files or link to Google Docs/Sheets for the AI to reference
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Upload Files</h3>
                  <FileUpload onFileUploaded={(fileRef) => setFileReferences(prev => [...prev, fileRef])} />
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center gap-2"
                    onClick={() => {
                      const url = prompt("Enter Google Docs URL:");
                      const name = prompt("Enter document name:");
                      if (url && name) addFileReference('google_docs', url, name);
                    }}
                  >
                    <Link className="h-6 w-6" />
                    <span>Link Google Docs</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center gap-2"
                    onClick={() => {
                      const url = prompt("Enter Google Sheets URL:");
                      const name = prompt("Enter spreadsheet name:");
                      if (url && name) addFileReference('google_sheets', url, name);
                    }}
                  >
                    <Link className="h-6 w-6" />
                    <span>Link Google Sheets</span>
                  </Button>
                </div>

                {fileReferences.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Referenced Files</h3>
                    {fileReferences.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {file.type === 'upload' && <Upload className="h-4 w-4" />}
                          {file.type === 'google_docs' && <Link className="h-4 w-4" />}
                          {file.type === 'google_sheets' && <Link className="h-4 w-4" />}
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{file.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeFileReference(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <FileSearchTest fileReferences={fileReferences} />
          </>
        );

      default:
        return null;
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout 
      user={currentUser} 
      onLogout={handleLogout}
      sidebar={
        <PromptManagementSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />
      }
    >
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prompt Management</h1>
            <p className="text-muted-foreground">
              Configure your AI assistant's behavior, tools, and triggers
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {renderSectionContent()}
        
        <div className="mt-8 flex justify-end">
          <Button onClick={saveConfiguration} disabled={loading} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}