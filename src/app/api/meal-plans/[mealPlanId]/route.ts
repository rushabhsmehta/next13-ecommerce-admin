import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function GET(req: Request, props: { params: Promise<{ mealPlanId: string }> }) {
  const params = await props.params;
  try {
    const mealPlan = await prismadb.mealPlan.findUnique({
      where: {
        id: params.mealPlanId
      }
    });
    
    return NextResponse.json(mealPlan);
  } catch (error) {
    console.log('[MEAL_PLAN_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ mealPlanId: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json();
    const { name, code, description, isActive } = body;
    
    if (!name && !code && description === undefined && isActive === undefined) {
      return new NextResponse("At least one field must be provided for update", { status: 400 });
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const mealPlan = await prismadb.mealPlan.update({
      where: {
        id: params.mealPlanId
      },
      data: updateData
    });
    
    return NextResponse.json(mealPlan);
  } catch (error) {
    console.log('[MEAL_PLAN_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ mealPlanId: string }> }) {
  const params = await props.params;
  try {
    // Check if meal plan is being used
    const usageCount = await prismadb.roomAllocation.count({
      where: {
        mealPlanId: params.mealPlanId
      }
    });
    
    if (usageCount > 0) {
      // Set to inactive instead of deleting
      const mealPlan = await prismadb.mealPlan.update({
        where: {
          id: params.mealPlanId
        },
        data: {
          isActive: false
        }
      });
      
      return NextResponse.json(mealPlan);
    }
    
    // If not used, safe to delete
    const mealPlan = await prismadb.mealPlan.delete({
      where: {
        id: params.mealPlanId
      }
    });
    
    return NextResponse.json(mealPlan);
  } catch (error) {
    console.log('[MEAL_PLAN_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
