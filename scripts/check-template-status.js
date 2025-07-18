#!/usr/bin/env node

/**
 * WhatsApp Template Status Checker
 * 
 * This script checks the approval status of WhatsApp templates
 * Usage: node check-template-status.js [contentSid]
 */

const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkTemplateStatus(contentSid) {
  try {
    const approvalRequests = await client.content.v1
      .contents(contentSid)
      .approvalRequests
      .list();
    
    const whatsappApproval = approvalRequests.find(req => req.name === 'whatsapp');
    
    if (whatsappApproval) {
      return {
        status: whatsappApproval.status,
        name: whatsappApproval.name,
        category: whatsappApproval.category,
        rejection_reason: whatsappApproval.rejection_reason || null
      };
    }
    
    return { status: 'not_submitted', name: null, category: null, rejection_reason: null };
  } catch (error) {
    console.error(`Failed to check status for ${contentSid}:`, error.message);
    return { status: 'error', name: null, category: null, rejection_reason: error.message };
  }
}

async function updateTemplateStatus(contentSid, status, rejectionReason = null) {
  try {
    const updateData = { status };
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    
    await prisma.whatsAppTemplate.update({
      where: { contentSid },
      data: updateData
    });
    console.log(`Updated template ${contentSid} status to: ${status}`);
  } catch (error) {
    console.error(`Failed to update template ${contentSid} in database:`, error.message);
  }
}

async function checkAllTemplates() {
  console.log('🔍 Checking WhatsApp template approval status...\n');

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.error('❌ Twilio credentials not found in environment variables');
    process.exit(1);
  }

  try {
    // Get all pending templates from database
    const templates = await prisma.whatsAppTemplate.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' }
    });

    if (templates.length === 0) {
      console.log('✅ No pending templates found');
      return;
    }

    console.log(`📋 Found ${templates.length} pending templates to check:\n`);

    const statusCounts = {
      approved: 0,
      rejected: 0,
      pending: 0,
      error: 0
    };

    for (const template of templates) {
      console.log(`📝 Checking: ${template.name} (${template.contentSid})`);
      
      const approval = await checkTemplateStatus(template.contentSid);
      
      switch (approval.status) {
        case 'approved':
          console.log(`✅ APPROVED: ${template.name}`);
          await updateTemplateStatus(template.contentSid, 'approved');
          statusCounts.approved++;
          break;
          
        case 'rejected':
          console.log(`❌ REJECTED: ${template.name}`);
          if (approval.rejection_reason) {
            console.log(`   Reason: ${approval.rejection_reason}`);
          }
          await updateTemplateStatus(template.contentSid, 'rejected', approval.rejection_reason);
          statusCounts.rejected++;
          break;
          
        case 'pending':
          console.log(`⏳ PENDING: ${template.name}`);
          statusCounts.pending++;
          break;
          
        case 'not_submitted':
          console.log(`⚠️  NOT SUBMITTED: ${template.name}`);
          statusCounts.error++;
          break;
          
        default:
          console.log(`❓ UNKNOWN STATUS: ${template.name} - ${approval.status}`);
          statusCounts.error++;
      }
      
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }

    console.log('📊 Summary:');
    console.log(`✅ Approved: ${statusCounts.approved}`);
    console.log(`❌ Rejected: ${statusCounts.rejected}`);
    console.log(`⏳ Still Pending: ${statusCounts.pending}`);
    console.log(`⚠️  Errors: ${statusCounts.error}`);

    if (statusCounts.rejected > 0) {
      console.log('\n💡 For rejected templates:');
      console.log('   1. Review the rejection reason');
      console.log('   2. Create a new template with fixes');
      console.log('   3. Cannot edit existing templates');
    }

    if (statusCounts.approved > 0) {
      console.log('\n🎉 Approved templates can now be used to send WhatsApp messages!');
    }

  } catch (error) {
    console.error('❌ Error checking templates:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkSingleTemplate(contentSid) {
  console.log(`🔍 Checking template: ${contentSid}\n`);

  const approval = await checkTemplateStatus(contentSid);
  
  console.log('📋 Template Status:');
  console.log(`   Status: ${approval.status}`);
  console.log(`   Name: ${approval.name || 'N/A'}`);
  console.log(`   Category: ${approval.category || 'N/A'}`);
  
  if (approval.rejection_reason) {
    console.log(`   Rejection Reason: ${approval.rejection_reason}`);
  }

  // Update in database if it exists
  try {
    const template = await prisma.whatsAppTemplate.findUnique({
      where: { contentSid }
    });
    
    if (template) {
      await updateTemplateStatus(contentSid, approval.status, approval.rejection_reason);
    }
  } catch (error) {
    console.log(`⚠️  Could not update database: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  const contentSid = process.argv[2];
  
  if (contentSid) {
    checkSingleTemplate(contentSid)
      .then(() => {
        console.log('✅ Template status check completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
      });
  } else {
    checkAllTemplates()
      .then(() => {
        console.log('✅ All templates checked');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
      });
  }
}

module.exports = { checkTemplateStatus, updateTemplateStatus, checkAllTemplates };
