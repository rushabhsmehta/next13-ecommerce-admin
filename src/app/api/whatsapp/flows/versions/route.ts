import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import {
  saveFlowVersion,
  listFlowVersions,
  getFlowVersion,
  deleteFlowVersion,
  validateFlowJSON,
} from '@/lib/whatsapp-flows';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');
    const flowId = searchParams.get('flowId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    if (versionId) {
      const version = await getFlowVersion(versionId);
      if (!version) {
        return NextResponse.json(
          { success: false, error: 'Version not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: version });
    }

    if (!flowId) {
      return NextResponse.json(
        { success: false, error: 'flowId query parameter is required' },
        { status: 400 }
      );
    }

    const versions = await listFlowVersions(flowId, limit ?? 25);

    return NextResponse.json({
      success: true,
      data: versions,
      count: versions.length,
    });
  } catch (error: any) {
    console.error('[FLOW_VERSIONS_GET]', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve flow versions',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId, name, flowJson, notes } = body ?? {};

    if (!flowId || !name || !flowJson) {
      return NextResponse.json(
        { success: false, error: 'flowId, name, and flowJson are required' },
        { status: 400 }
      );
    }

    const validation = validateFlowJSON(flowJson);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flow JSON is invalid',
          validationErrors: validation.errors,
        },
        { status: 422 }
      );
    }

    const { userId } = auth();

    const version = await saveFlowVersion({
      flowId,
      name,
      flowJson,
      notes,
      createdBy: userId ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data: version,
      message: 'Flow version saved',
    });
  } catch (error: any) {
    console.error('[FLOW_VERSIONS_POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to save flow version',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('id');

    if (!versionId) {
      return NextResponse.json(
        { success: false, error: 'Version id is required' },
        { status: 400 }
      );
    }

    await deleteFlowVersion(versionId);

    return NextResponse.json({
      success: true,
      message: 'Flow version deleted',
    });
  } catch (error: any) {
    console.error('[FLOW_VERSIONS_DELETE]', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to delete flow version',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({
    message: 'WhatsApp Flow Versions API',
    methods: {
      GET: 'List versions for a flow or retrieve a specific version',
      POST: 'Save a flow JSON snapshot as a new version',
      DELETE: 'Remove a saved version',
    },
    parameters: {
      GET: {
        flowId: 'Flow id to list versions for',
        versionId: 'Optional version id to retrieve a single version',
        limit: 'Optional limit for number of versions (default 25)',
      },
      DELETE: {
        id: 'Version id to delete',
      },
    },
  });
}
