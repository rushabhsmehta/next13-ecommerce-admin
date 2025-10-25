import { NextRequest, NextResponse } from 'next/server';
import {
  listFlows,
  getFlow,
  createFlow,
  deleteFlow,
  publishFlow,
  deprecateFlow,
  getFlowJSON,
  updateFlowJSON,
  getFlowPreview,
  type CreateFlowRequest,
  type FlowJSON,
} from '@/lib/whatsapp-flows';

/**
 * GET /api/whatsapp/flows/manage
 * List and manage WhatsApp Flows
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const flowId = searchParams.get('id');

    switch (action) {
      case 'list': {
        const flows = await listFlows();
        return NextResponse.json({
          success: true,
          data: flows.data,
          count: flows.data.length,
        });
      }

      case 'get': {
        if (!flowId) {
          return NextResponse.json(
            { success: false, error: 'Flow ID required' },
            { status: 400 }
          );
        }

        const flow = await getFlow(flowId);
        return NextResponse.json({
          success: true,
          data: flow,
        });
      }

      case 'json': {
        if (!flowId) {
          return NextResponse.json(
            { success: false, error: 'Flow ID required' },
            { status: 400 }
          );
        }

        const flowJson = await getFlowJSON(flowId);
        return NextResponse.json({
          success: true,
          data: flowJson,
        });
      }

      case 'preview': {
        if (!flowId) {
          return NextResponse.json(
            { success: false, error: 'Flow ID required' },
            { status: 400 }
          );
        }

        const preview = await getFlowPreview(flowId);
        return NextResponse.json({
          success: true,
          data: preview,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error managing flows:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to manage flows',
        details: error.response?.data || error,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/whatsapp/flows/manage
 * Create or update a flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'create';

    switch (action) {
      case 'create': {
        const { name, categories, clone_flow_id } = body as CreateFlowRequest & { action?: string };

        if (!name || !categories) {
          return NextResponse.json(
            { success: false, error: 'Name and categories are required' },
            { status: 400 }
          );
        }

        const flow = await createFlow({ name, categories, clone_flow_id });

        return NextResponse.json({
          success: true,
          data: flow,
          message: 'Flow created successfully',
        });
      }

      case 'update_json': {
        const { flowId, flowJson } = body as { flowId: string; flowJson: FlowJSON; action?: string };

        if (!flowId || !flowJson) {
          return NextResponse.json(
            { success: false, error: 'Flow ID and flow JSON are required' },
            { status: 400 }
          );
        }

        const result = await updateFlowJSON(flowId, flowJson);
        
        // Check if upload failed with validation errors
        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to update flow JSON',
            validation_errors: result.validation_errors,
            flow_json: flowJson,
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          data: result,
          message: 'Flow JSON updated successfully',
        });
      }

      case 'publish': {
        const { flowId } = body;

        if (!flowId) {
          return NextResponse.json(
            { success: false, error: 'Flow ID is required' },
            { status: 400 }
          );
        }

        const result = await publishFlow(flowId);

        if (result.validation_errors && result.validation_errors.length > 0) {
          return NextResponse.json({
            success: false,
            error: 'Flow has validation errors',
            validation_errors: result.validation_errors,
          });
        }

        return NextResponse.json({
          success: true,
          data: result,
          message: 'Flow published successfully',
        });
      }

      case 'deprecate': {
        const { flowId } = body;

        if (!flowId) {
          return NextResponse.json(
            { success: false, error: 'Flow ID is required' },
            { status: 400 }
          );
        }

        const result = await deprecateFlow(flowId);

        return NextResponse.json({
          success: true,
          data: result,
          message: 'Flow deprecated successfully',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error in flow operation:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to perform flow operation',
        details: error.response?.data || error,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/flows/manage
 * Delete a flow
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flowId = searchParams.get('id');

    if (!flowId) {
      return NextResponse.json(
        { success: false, error: 'Flow ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteFlow(flowId);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Flow deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting flow:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete flow',
        details: error.response?.data || error,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * OPTIONS /api/whatsapp/flows/manage
 */
export async function OPTIONS() {
  return NextResponse.json({
    message: 'WhatsApp Flows Management API',
    methods: {
      GET: 'List flows, get flow details, or get flow JSON',
      POST: 'Create, update, publish, or deprecate flows',
      DELETE: 'Delete a flow',
    },
    GET_actions: {
      list: 'List all flows',
      get: 'Get flow details (requires id)',
      json: 'Get flow JSON (requires id)',
      preview: 'Get flow preview URL (requires id)',
    },
    POST_actions: {
      create: 'Create a new flow',
      update_json: 'Update flow JSON',
      publish: 'Publish a flow',
      deprecate: 'Deprecate a flow',
    },
    examples: {
      list_flows: 'GET /api/whatsapp/flows/manage?action=list',
      get_flow: 'GET /api/whatsapp/flows/manage?action=get&id=FLOW_ID',
      get_json: 'GET /api/whatsapp/flows/manage?action=json&id=FLOW_ID',
      create_flow: {
        method: 'POST',
        body: {
          action: 'create',
          name: 'My Flow',
          categories: ['SIGN_UP'],
        },
      },
      publish_flow: {
        method: 'POST',
        body: {
          action: 'publish',
          flowId: 'FLOW_ID',
        },
      },
      delete_flow: 'DELETE /api/whatsapp/flows/manage?id=FLOW_ID',
    },
  });
}
