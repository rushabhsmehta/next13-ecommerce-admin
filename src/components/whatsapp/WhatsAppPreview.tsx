"use client";

import React from 'react';

type Button = {
  text?: string;
  type?: string;
  url?: string;
  phone_number?: string;
  phone?: string;
  example?: string;
  otp_type?: string;
};

type HeaderData = {
  format?: string;
  text?: string;
  example?: string;
  location?: {
    latitude?: string;
    longitude?: string;
    name?: string;
    address?: string;
  };
};

export default function WhatsAppPreview({
  body,
  header,
  footer,
  buttons = [],
  business = 'Business Account',
}: {
  body: string;
  header?: HeaderData;
  footer?: string;
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

  const renderHeader = () => {
    if (!header) return null;

    if (header.format === 'TEXT' && header.text) {
      return (
        <div className="font-semibold text-[13.5px] mb-1.5">
          {header.text}
        </div>
      );
    }

    if (header.format === 'IMAGE' || header.format === 'GIF') {
      return (
        <div className="bg-gray-200 rounded-md mb-2 flex items-center justify-center h-32 text-gray-500 text-xs">
          {header.example ? (
            <img src={header.example} alt="Header" className="w-full h-32 object-cover rounded-md" />
          ) : (
            <span>🖼️ {header.format} Header</span>
          )}
        </div>
      );
    }

    if (header.format === 'VIDEO') {
      return (
        <div className="bg-gray-800 rounded-md mb-2 flex items-center justify-center h-32 text-white text-xs">
          <span>▶️ Video Header</span>
        </div>
      );
    }

    if (header.format === 'DOCUMENT') {
      return (
        <div className="bg-gray-100 rounded-md mb-2 p-2.5 flex items-center gap-2 text-xs border border-gray-200">
          <span className="text-red-500 text-lg">📄</span>
          <div>
            <div className="font-medium text-gray-700">Document</div>
            <div className="text-gray-400">PDF</div>
          </div>
        </div>
      );
    }

    if (header.format === 'LOCATION') {
      return (
        <div className="bg-green-50 rounded-md mb-2 p-2.5 flex items-center gap-2 text-xs border border-green-200">
          <span className="text-lg">📍</span>
          <div>
            <div className="font-medium text-gray-700">
              {header.location?.name || 'Location'}
            </div>
            <div className="text-gray-400">
              {header.location?.address || 'Address will be provided at send time'}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderButton = (b: Button, idx: number) => {
    let icon = '';
    let label = b.text || b.type || 'Button';

    switch (b.type) {
      case 'URL':
        icon = '🔗';
        break;
      case 'PHONE_NUMBER':
        icon = '📞';
        break;
      case 'QUICK_REPLY':
        icon = '↩️';
        break;
      case 'COPY_CODE':
        icon = '📋';
        label = b.example ? `Copy: ${b.example}` : 'Copy code';
        break;
      case 'FLOW':
        icon = '⚡';
        break;
      case 'OTP':
        icon = b.otp_type === 'COPY_CODE' ? '📋' : '✨';
        label = b.otp_type === 'COPY_CODE' ? 'Copy code' :
                b.otp_type === 'ONE_TAP' ? 'Autofill' : 'Verify';
        break;
      case 'VOICE_CALL':
        icon = '📱';
        break;
      case 'MPM':
        icon = '🛍️';
        label = b.text || 'View products';
        break;
      case 'SPM':
        icon = '🏷️';
        label = b.text || 'View product';
        break;
      default:
        icon = '';
    }

    return (
      <button
        key={idx}
        className="w-full px-3 py-2 text-center text-[13px] text-[#128C7E] bg-white/60 hover:bg-white/90 border border-[#bde5dc] rounded-md transition-colors"
      >
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </button>
    );
  };

  // Separate quick replies from CTA buttons (WhatsApp renders them differently)
  const ctaButtons = buttons.filter(b =>
    b.type && !['QUICK_REPLY'].includes(b.type)
  );
  const quickReplies = buttons.filter(b =>
    b.type === 'QUICK_REPLY'
  );

  return (
    <div className="w-full max-w-2xl rounded-xl overflow-hidden border bg-white shadow-sm">
      {/* WhatsApp Header */}
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
        <div className="max-w-[80%] ml-auto bg-[#d9fdd3] rounded-lg shadow overflow-hidden">
          {/* Header */}
          <div className="p-3 pb-0">
            {renderHeader()}
          </div>

          {/* Body */}
          <div className="px-3 pb-1">
            {body.split('\n').map((line, i) => (
              <p key={i} className="text-[13px] leading-relaxed mb-1 last:mb-0">
                {line.replace(/\*([^*]+)\*/g, '**$1**')}
              </p>
            ))}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-3 pb-1">
              <p className="text-[11px] text-gray-500 italic">{footer}</p>
            </div>
          )}

          {/* Timestamp */}
          <div className="px-3 pb-2">
            <p className="text-[11px] text-gray-600 text-right">20:22 {ticks}</p>
          </div>

          {/* CTA Buttons (URL, Phone, etc) */}
          {ctaButtons.length > 0 && (
            <div className="border-t border-[#c5eac0] space-y-px">
              {ctaButtons.map((b, idx) => renderButton(b, idx))}
            </div>
          )}

          {/* Quick Reply Buttons */}
          {quickReplies.length > 0 && (
            <div className="border-t border-[#c5eac0] p-2 flex flex-wrap gap-1.5">
              {quickReplies.map((b, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full text-[12px] bg-white/80 text-[#128C7E] border border-[#bde5dc]"
                >
                  {b.text || 'Quick Reply'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
