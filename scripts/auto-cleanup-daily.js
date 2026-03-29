/**
 * Automated daily cleanup for the WhatsApp Postgres database.
 *
 * Intended for a Railway scheduled task:
 *   node scripts/auto-cleanup-daily.js
 */

const { PrismaClient } = require("@prisma/whatsapp-client");

const prisma = new PrismaClient();

function compactMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return metadata ?? null;
  }

  const next = { ...metadata };
  delete next.rawMessage;
  delete next.raw_message;
  delete next.rawPayload;
  delete next.raw_payload;

  if (next.interactive && typeof next.interactive === "object") {
    next.interactive = {
      type: next.interactive.type,
      bodyText: next.interactive.bodyText,
      buttonReply: next.interactive.buttonReply,
      listReply: next.interactive.listReply,
      nfmReply: next.interactive.nfmReply,
      flowResponse: next.interactive.flowResponse
        ? {
            parsedResponse: next.interactive.flowResponse.parsedResponse,
            summary: next.interactive.flowResponse.summary,
            flow_token: next.interactive.flowResponse.flow_token,
            flow_id: next.interactive.flowResponse.flow_id,
            name: next.interactive.flowResponse.name,
          }
        : undefined,
    };
  }

  return next;
}

function compactPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload ?? null;
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return payload;
  }

  const message = payload.messages[0] || {};

  return {
    messaging_product: payload.messaging_product,
    metadata: payload.metadata
      ? {
          display_phone_number: payload.metadata.display_phone_number,
          phone_number_id: payload.metadata.phone_number_id,
        }
      : undefined,
    contacts: Array.isArray(payload.contacts)
      ? payload.contacts.map((contact) => ({
          wa_id: contact?.wa_id,
          profile: contact?.profile ? { name: contact.profile.name } : undefined,
        }))
      : undefined,
    messages: [
      {
        id: message.id,
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        text: message.text ? { body: message.text.body } : undefined,
        image: message.image
          ? {
              id: message.image.id,
              caption: message.image.caption,
              mime_type: message.image.mime_type,
              sha256: message.image.sha256,
            }
          : undefined,
        video: message.video
          ? {
              id: message.video.id,
              caption: message.video.caption,
              mime_type: message.video.mime_type,
              sha256: message.video.sha256,
            }
          : undefined,
        audio: message.audio
          ? {
              id: message.audio.id,
              mime_type: message.audio.mime_type,
              sha256: message.audio.sha256,
            }
          : undefined,
        document: message.document
          ? {
              id: message.document.id,
              caption: message.document.caption,
              filename: message.document.filename,
              mime_type: message.document.mime_type,
              sha256: message.document.sha256,
            }
          : undefined,
        sticker: message.sticker
          ? {
              id: message.sticker.id,
              mime_type: message.sticker.mime_type,
              sha256: message.sticker.sha256,
            }
          : undefined,
        interactive: message.interactive
          ? {
              type: message.interactive.type,
              body: message.interactive.body,
              header: message.interactive.header,
              button_reply: message.interactive.button_reply,
              list_reply: message.interactive.list_reply,
              nfm_reply: message.interactive.nfm_reply,
              flow_response: message.interactive.flow_response,
              action: message.interactive.action,
            }
          : undefined,
        reaction: message.reaction,
        location: message.location,
        contacts: Array.isArray(message.contacts) ? message.contacts : undefined,
        flow: message.flow,
      },
    ],
  };
}

async function compactRecentMessages(sevenDaysAgo, compactBefore) {
  let totalCompacted = 0;
  let cursorId = null;

  while (true) {
    const candidates = await prisma.whatsAppMessage.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
          lt: compactBefore,
        },
      },
      orderBy: {
        id: "asc",
      },
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        metadata: true,
        payload: true,
      },
      take: 200,
    });

    if (candidates.length === 0) {
      break;
    }

    for (const message of candidates) {
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          metadata: compactMetadata(message.metadata),
          payload: compactPayload(message.payload),
        },
      });
    }

    totalCompacted += candidates.length;
    cursorId = candidates[candidates.length - 1].id;
    console.log(`   Compacted ${totalCompacted} message records so far...`);
  }

  return totalCompacted;
}

async function cleanupDatabase() {
  console.log("Starting automated daily cleanup...");
  console.log(`Running at: ${new Date().toISOString()}\n`);

  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log("Retention policies:");
    console.log(`   Analytics events: ${threeDaysAgo.toISOString()} (3 days)`);
    console.log(`   Compact message blobs: ${twoDaysAgo.toISOString()} (2 days)`);
    console.log(`   Delete messages: ${sevenDaysAgo.toISOString()} (7 days)`);
    console.log(`   Inactive sessions: ${twoHoursAgo.toISOString()} (2 hours)`);
    console.log(`   Old campaign recipients: ${thirtyDaysAgo.toISOString()} (30 days)\n`);

    let totalDeleted = 0;

    console.log("Deleting analytics events older than 3 days...");
    const deletedAnalytics = await prisma.whatsAppAnalyticsEvent.deleteMany({
      where: {
        createdAt: {
          lt: threeDaysAgo,
        },
      },
    });
    console.log(`   Deleted ${deletedAnalytics.count} analytics events\n`);
    totalDeleted += deletedAnalytics.count;

    console.log("Compacting WhatsApp message blobs older than 2 days...");
    const totalCompacted = await compactRecentMessages(sevenDaysAgo, twoDaysAgo);
    console.log(`   Compacted ${totalCompacted} message records\n`);

    console.log("Deleting WhatsApp messages older than 7 days...");
    const deletedMessages = await prisma.whatsAppMessage.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });
    console.log(`   Deleted ${deletedMessages.count} messages\n`);
    totalDeleted += deletedMessages.count;

    console.log("Deleting inactive WhatsApp sessions...");
    const deletedSessions = await prisma.whatsAppSession.deleteMany({
      where: {
        updatedAt: {
          lt: twoHoursAgo,
        },
      },
    });
    console.log(`   Deleted ${deletedSessions.count} inactive sessions\n`);
    totalDeleted += deletedSessions.count;

    console.log("Deleting old recipients from finished campaigns...");
    const oldCampaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: {
          in: ["completed", "failed", "cancelled"],
        },
        updatedAt: {
          lt: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
      },
    });

    const oldCampaignIds = oldCampaigns.map((campaign) => campaign.id);
    console.log(`   Found ${oldCampaignIds.length} old finished campaigns`);

    let deletedRecipients = 0;
    if (oldCampaignIds.length > 0) {
      const recipientsResult = await prisma.whatsAppCampaignRecipient.deleteMany({
        where: {
          campaignId: {
            in: oldCampaignIds,
          },
        },
      });
      deletedRecipients = recipientsResult.count;
    }
    console.log(`   Deleted ${deletedRecipients} old campaign recipients\n`);
    totalDeleted += deletedRecipients;

    console.log("Current database counts after cleanup:");
    const [
      analyticsCount,
      messagesCount,
      sessionsCount,
      recipientsCount,
      customersCount,
      campaignsCount,
    ] = await Promise.all([
      prisma.whatsAppAnalyticsEvent.count(),
      prisma.whatsAppMessage.count(),
      prisma.whatsAppSession.count(),
      prisma.whatsAppCampaignRecipient.count(),
      prisma.whatsAppCustomer.count(),
      prisma.whatsAppCampaign.count(),
    ]);

    console.log(`   Analytics events: ${analyticsCount}`);
    console.log(`   Messages: ${messagesCount}`);
    console.log(`   Sessions: ${sessionsCount}`);
    console.log(`   Campaign recipients: ${recipientsCount}`);
    console.log(`   Customers: ${customersCount}`);
    console.log(`   Campaigns: ${campaignsCount}\n`);

    console.log(`Compacted records: ${totalCompacted}`);
    console.log(`Cleanup complete. Total records deleted: ${totalDeleted}`);
    console.log(`Finished at: ${new Date().toISOString()}\n`);
  } catch (error) {
    console.error("Cleanup failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDatabase()
  .then(() => {
    console.log("Daily cleanup job completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Daily cleanup job failed:", error);
    process.exit(1);
  });
