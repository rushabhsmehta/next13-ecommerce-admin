"use client";

import React from 'react';

type Button = { text?: string; type?: string; url?: string; phone?: string };

export default function WhatsAppPreview({
  body,
  buttons = [],
  business = 'Business Account',
}: {
  body: string;
  buttons?: Button[];
  business?: string;
}) {
  const ticks = (
    <svg width="16" height="12" viewBox="0 0 16 12" className="inline-block align-middle ml-1">
      <path d="M5.5 11L1 6.5l1.2-1.2L5.5 8.7 13.8.5 15 1.7z" fill="#34B7F1"/>
      <path d="M8.5 11L4 6.5l1.2-1.2L8.5 8.7 16.8.5 18 1.7z" fill="#34B7F1" transform="translate(-3)"/>
    </svg>
  );

  const wallpaperStyle: React.CSSProperties = {
    backgroundColor: '#efeae2',
    backgroundImage:
      'radial-gradient(circle at 25px 25px, rgba(0,0,0,0.02) 2px, transparent 0),\
       radial-gradient(circle at 75px 75px, rgba(0,0,0,0.02) 2px, transparent 0)',
    backgroundSize: '100px 100px',
  };

  return (
    <div className="w-full max-w-2xl rounded-xl overflow-hidden border bg-white shadow-sm">
      {/* Header */}
      <div className="bg-[#128C7E] text-white px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">WA</div>
        <div className="flex-1">
          <div className="text-sm font-medium leading-tight">{business}</div>
          <div className="text-[11px] text-white/90">online</div>
        </div>
        <div className="flex items-center gap-3 opacity-80 text-white/90 text-sm">
          <div>🔍</div>
          <div>⋮</div>
        </div>
      </div>

      {/* Chat area */}
      <div className="px-3 py-4 min-h-[260px]" style={wallpaperStyle}>
        {/* Incoming sample */}
        <div className="max-w-[75%] bg-white rounded-lg shadow p-2.5 text-[13px] leading-relaxed mb-2">
          <p className="mb-1">Hello! 👋</p>
          <p className="mb-0 text-[11px] text-gray-500 text-right">20:21</p>
        </div>

        {/* Outgoing template bubble */}
        <div className="max-w-[80%] ml-auto bg-[#d9fdd3] rounded-lg shadow p-3 text-[13px] leading-relaxed">
          {body.split('\n').map((line, i) => (
            <p key={i} className="mb-1 last:mb-0">{line}</p>
          ))}
          {buttons && buttons.length > 0 && (
            <div className="mt-3 pt-2 border-t border-[#c5eac0]">
              <div className="flex flex-wrap gap-2">
                {buttons.slice(0, 3).map((b, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full text-[12px] bg-white/80 text-[#128C7E] border border-[#bde5dc]">
                    {b.text || b.type || 'Button'}
                  </span>
                ))}
                {buttons.length > 3 && (
                  <span className="text-[12px] text-gray-500">+{buttons.length - 3} more</span>
                )}
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-gray-600 text-right">20:22 {ticks}</p>
        </div>
      </div>
    </div>
  );
}
