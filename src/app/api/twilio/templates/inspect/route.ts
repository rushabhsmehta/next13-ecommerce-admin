import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function GET(request: NextRequest) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    console.log('Fetching Twilio templates...');
    const contents = await client.content.v1.contents.list({ limit: 50 });
    
    console.log('Raw Twilio templates response:');
    contents.forEach((template, index) => {
      console.log(`\n=== Template ${index + 1} ===`);
      console.log('SID:', template.sid);
      console.log('Friendly Name:', template.friendlyName);
      console.log('Language:', template.language);
      console.log('Types:', JSON.stringify(template.types, null, 2));
      console.log('Variables:', JSON.stringify(template.variables, null, 2));
      console.log('Date Created:', template.dateCreated);
      console.log('Date Updated:', template.dateUpdated);
    });

    const templateData = contents.map(template => ({
      sid: template.sid,
      friendlyName: template.friendlyName,
      language: template.language,
      types: template.types,
      variables: template.variables,
      dateCreated: template.dateCreated,
      dateUpdated: template.dateUpdated,
      url: template.url
    }));

    return NextResponse.json({
      success: true,
      count: templateData.length,
      templates: templateData,
      raw: contents
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error inspecting Twilio templates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to inspect templates',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
