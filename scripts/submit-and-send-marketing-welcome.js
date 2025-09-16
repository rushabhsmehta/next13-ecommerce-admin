// FILE REMOVED: see submit-and-send-marketing-welcome.js.deleted
  filled = filled.replace(/\{\{\s*first_name\s*\}\}/gi, sample.first_name);
  filled = filled.replace(/\{\{\s*discount_code\s*\}\}/gi, sample.discount_code);
  filled = filled.replace(/\{\{\s*discount_percentage\s*\}\}/gi, sample.discount_percentage);
  // Fallback for numeric placeholders
  filled = filled.replace(/\{\{\s*1\s*\}\}/g, sample.first_name);
  filled = filled.replace(/\{\{\s*2\s*\}\}/g, sample.discount_code);
  filled = filled.replace(/\{\{\s*3\s*\}\}/g, sample.discount_percentage);
  return filled;
}

(async ()=>{
  try {
    const content = await findContent();
    if (!content) {
      console.error('Could not find content by SID or friendlyName:', contentSidOrName);
      process.exit(1);
    }

    console.log('Found content:', content.sid, 'friendlyName:', content.friendlyName);

    // Check current status
    const status = await checkTemplateStatus(content.sid);
    console.log('Current WhatsApp approval status:', status);

    if (status === 'not_found' || status === 'no_approvals' || status === 'unknown') {
      console.log('Attempting to submit for WhatsApp approval...');
      const r = await submitApprovalIfNeeded(content);
      console.log('Approval submission result:', r && (r.error || r.result ? 'submitted' : r.reason));
    } else {
      console.log('No submission needed (status:', status, ')');
    }

    // Send fallback filled message immediately so user gets message even if template not approved
    const bodySource = (content.types && content.types['twilio/text'] && content.types['twilio/text'].body) || 'Hello! Welcome.';
    const filled = fillTemplateBody(bodySource);

    // Sanitize possible malformed env values like 'whatsapps:+123' or double prefixes
    function normalizeWhatsAppNumber(v) {
      if (!v) return v;
      let s = String(v).trim();
      // remove accidental 'whatsapps:' typo
      s = s.replace(/^whatsapps:/i, 'whatsapp:');
      // strip any leading whatsapp: then ensure exactly one
      s = s.replace(/^(?:whatsapp:)+/i, '');
      // remove any stray pluses/spaces then re-add prefix
      s = s.trim();
      return `whatsapp:${s}`;
    }

    const fixedFrom = normalizeWhatsAppNumber(fromRaw);
    const fixedTo = normalizeWhatsAppNumber(recipient);

    console.log('Sending fallback message to', fixedTo);
    const msg = await client.messages.create({ from: fixedFrom, to: fixedTo, body: filled });
    console.log('Fallback message SID:', msg.sid, 'status:', msg.status);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
