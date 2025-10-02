"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, X, Minimize2, Maximize2 } from "lucide-react";

interface DebugLog {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  category: string;
  message: string;
  data?: any;
}

export const DebugLogPanel = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Capture console.log calls
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      originalLog(...args);
      captureLog('info', args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      captureLog('warning', args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      captureLog('error', args);
    };

    // Expose global function to add logs
    (window as any).addDebugLog = (category: string, message: string, data?: any) => {
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'info',
        category,
        message,
        data
      }]);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const captureLog = (level: 'info' | 'warning' | 'error', args: any[]) => {
    const firstArg = args[0];
    
    // Only capture our emoji-prefixed logs
    if (typeof firstArg === 'string' && /[🎬🏨🔄📦📥🎨✨✅⚠️❌🔍📋🆕]/.test(firstArg)) {
      const category = firstArg.match(/\[(.*?)\]/)?.[1] || 'GENERAL';
      const message = firstArg;
      const data = args.length > 1 ? args.slice(1) : undefined;
      
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info',
        category,
        message,
        data
      }]);
    }
  };

  const copyToClipboard = () => {
    const logText = logs.map(log => {
      const dataStr = log.data ? '\n' + JSON.stringify(log.data, null, 2) : '';
      return `[${log.timestamp}] [${log.category}] ${log.message}${dataStr}`;
    }).join('\n\n');

    navigator.clipboard.writeText(logText);
    alert('Logs copied to clipboard!');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: isMinimized ? '300px' : '600px',
        maxHeight: isMinimized ? '50px' : '500px',
        zIndex: 9999,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}
    >
      <Card className="border-2 border-blue-500">
        <CardHeader className="p-3 bg-blue-50 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-blue-800">
            🔍 Debug Logs ({logs.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        {!isMinimized && (
          <CardContent className="p-3">
            <div className="flex gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> Copy All Logs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearLogs}
                className="flex items-center gap-1"
              >
                Clear
              </Button>
            </div>
            <textarea
              ref={textAreaRef}
              readOnly
              className="w-full h-[350px] p-2 text-xs font-mono bg-gray-900 text-green-400 border border-gray-700 rounded resize-none overflow-auto"
              value={logs.map(log => {
                const dataStr = log.data ? '\n' + JSON.stringify(log.data, null, 2) : '';
                return `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}${dataStr}`;
              }).join('\n\n')}
            />
            <div className="mt-2 text-xs text-gray-500">
              Scroll to see all logs. Click &quot;Copy All Logs&quot; to copy everything.
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
