import { processDueCampaigns } from '../src/lib/whatsapp-campaign-worker';

async function main() {
  const maxCampaigns = process.env.WHATSAPP_WORKER_MAX_CAMPAIGNS
    ? Number(process.env.WHATSAPP_WORKER_MAX_CAMPAIGNS)
    : undefined;
  const budgetMs = process.env.WHATSAPP_WORKER_BUDGET_MS
    ? Number(process.env.WHATSAPP_WORKER_BUDGET_MS)
    : undefined;
  const campaignId = process.env.WHATSAPP_WORKER_CAMPAIGN_ID || undefined;

  const result = await processDueCampaigns({
    maxCampaigns,
    budgetMs,
    campaignId,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('[whatsapp-worker] Failed:', error);
  process.exit(1);
});
