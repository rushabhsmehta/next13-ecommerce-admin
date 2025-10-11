import { NextRequest, NextResponse } from 'next/server';
import { 
  listTemplates, 
  getAllTemplates, 
  searchTemplates,
  analyzeTemplateQuality,
  extractTemplateParameters,
  type TemplateCategory,
  type TemplateStatus
} from '@/lib/whatsapp-templates';

/**
 * GET /api/whatsapp/templates/manage
 * Advanced template management with filtering, search, and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const action = searchParams.get('action') || 'list';
    const limit = parseInt(searchParams.get('limit') || '50');
    const after = searchParams.get('after') || undefined;
    const status = searchParams.get('status') as TemplateStatus | undefined;
    const category = searchParams.get('category') as TemplateCategory | undefined;
    const language = searchParams.get('language') || undefined;
    const nameSearch = searchParams.get('name') || undefined;
    const contentSearch = searchParams.get('content') || undefined;

    switch (action) {
      case 'list': {
        // Simple paginated list
        const result = await listTemplates({
          limit,
          after,
          status,
          category,
          language,
        });

        return NextResponse.json({
          success: true,
          data: result.data,
          paging: result.paging,
          count: result.data.length,
        });
      }

      case 'all': {
        // Get all templates (handles pagination automatically)
        const templates = await getAllTemplates({
          status,
          category,
          language,
        });

        return NextResponse.json({
          success: true,
          data: templates,
          count: templates.length,
        });
      }

      case 'search': {
        // Advanced search
        if (!nameSearch && !contentSearch) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Provide "name" or "content" parameter for search' 
            },
            { status: 400 }
          );
        }

        const results = await searchTemplates({
          name: nameSearch,
          category,
          status,
          language,
          contentSearch,
        });

        return NextResponse.json({
          success: true,
          data: results,
          count: results.length,
          query: {
            name: nameSearch,
            content: contentSearch,
            category,
            status,
            language,
          },
        });
      }

      case 'analytics': {
        // Get analytics about templates
        const templates = await getAllTemplates({ status, category, language });
        const analytics = analyzeTemplateQuality(templates);

        return NextResponse.json({
          success: true,
          analytics,
          templates: templates.map(t => ({
            id: t.id,
            name: t.name,
            language: t.language,
            status: t.status,
            category: t.category,
            quality: t.quality_score,
            parameters: extractTemplateParameters(t),
          })),
        });
      }

      case 'approved': {
        // Get only approved templates (commonly used)
        const templates = await getAllTemplates({ status: 'APPROVED', category, language });

        return NextResponse.json({
          success: true,
          data: templates,
          count: templates.length,
        });
      }

      case 'by-category': {
        if (!category) {
          return NextResponse.json(
            { success: false, error: 'Category parameter required' },
            { status: 400 }
          );
        }

        const templates = await getAllTemplates({ status: 'APPROVED', category, language });

        return NextResponse.json({
          success: true,
          category,
          data: templates,
          count: templates.length,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error managing templates:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to manage templates',
        details: error.response?.data || error,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/templates/manage
 * Delete a template
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const id = searchParams.get('id');

    if (!name && !id) {
      return NextResponse.json(
        { success: false, error: 'Provide either "name" or "id" parameter' },
        { status: 400 }
      );
    }

  const { deleteTemplate } = await import('@/lib/whatsapp-templates');

  const identifier = (name ?? id) as string;
  const result = await deleteTemplate(identifier, id ?? undefined);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
      data: result,
    });

  } catch (error: any) {
    console.error('Error deleting template:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete template',
        details: error.response?.data || error,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * OPTIONS /api/whatsapp/templates/manage
 * Get documentation
 */
export async function OPTIONS() {
  return NextResponse.json({
    message: 'Advanced Template Management API',
    methods: {
      GET: 'List, search, and analyze templates',
      DELETE: 'Delete a template',
    },
    GET_actions: {
      list: 'Paginated list of templates',
      all: 'All templates (auto-pagination)',
      search: 'Search templates by name or content',
      analytics: 'Get quality analytics',
      approved: 'Get only approved templates',
      'by-category': 'Get templates by category',
    },
    query_parameters: {
      action: 'Action to perform (list, all, search, analytics, approved, by-category)',
      limit: 'Number of results per page (default: 50)',
      after: 'Pagination cursor',
      status: 'Filter by status (APPROVED, PENDING, REJECTED, PAUSED, DISABLED)',
      category: 'Filter by category (AUTHENTICATION, MARKETING, UTILITY)',
      language: 'Filter by language (e.g., en_US)',
      name: 'Search by template name',
      content: 'Search in template content',
    },
    examples: {
      list_all_approved: '/api/whatsapp/templates/manage?action=approved',
      search_by_name: '/api/whatsapp/templates/manage?action=search&name=order',
      get_analytics: '/api/whatsapp/templates/manage?action=analytics',
      list_marketing: '/api/whatsapp/templates/manage?action=by-category&category=MARKETING',
      delete_template: 'DELETE /api/whatsapp/templates/manage?name=template_name',
    },
  });
}
