"use client";

import React, { useEffect, useState } from "react";

type Status = {
  connected: boolean;
  twilioNumber?: string;
  messagesLast24h?: number;
};

export default function TwilioWidget() {
  const [status, setStatus] = useState<Status | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await fetch('/api/whatsapp/config');
        if (s.ok) setStatus(await s.json());
      } catch (e) {}

      try {
        const r = await fetch('/api/whatsapp/messages?limit=5');
        if (r.ok) setRecent(await r.json());
      } catch (e) {}
    })();
  }, []);

  const sendTest = async () => {
    setError(null);
    setSending(true);
    try {
      const testNumber = process.env.NEXT_PUBLIC_WHATSAPP_TEST_NUMBER;
      if (!testNumber) {
        setError('Set NEXT_PUBLIC_WHATSAPP_TEST_NUMBER in your local env to send test messages');
        setSending(false);
        return;
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testNumber.replace('whatsapp:', ''), message: 'Test message from admin dashboard' })
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || 'Failed to send');
      } else {
        // refresh messages
        const r = await fetch('/api/whatsapp/messages?limit=5');
        if (r.ok) setRecent(await r.json());
      }
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, border: '1px solid #eee', borderRadius: 8, padding: 12, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>WhatsApp — Twilio</div>
          <div style={{ fontSize: 12, color: '#666' }}>Integration status & recent messages</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: status?.connected ? '#059669' : '#b91c1c', fontWeight: 700 }}>
            {status?.connected ? 'Connected' : 'Disconnected'}
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>{status?.twilioNumber || 'No number'}</div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Recent messages</div>
        <div style={{ maxHeight: 160, overflow: 'auto', paddingRight: 6 }}>
          {recent && recent.length ? recent.map((m: any, i: number) => (
            <div key={i} style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.from || m.sender || m.to}</div>
              <div style={{ fontSize: 12, color: '#555' }}>{m.body || m.message || m.text}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>{new Date(m.createdAt || m.timestamp || Date.now()).toLocaleString()}</div>
            </div>
          )) : <div style={{ fontSize: 13, color: '#777' }}>No recent messages</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={sendTest} disabled={sending} style={{ flex: 1, padding: '8px 10px', background: '#0ea5a3', color: 'white', border: 'none', borderRadius: 6 }}>
          {sending ? 'Sending…' : 'Send test message'}
        </button>
  <button onClick={() => window.open('/api/whatsapp/env-check','_blank')} style={{ padding: '8px 10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          Debug
        </button>
      </div>

      {error && <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 13 }}>{error}</div>}
    </div>
  );
}
