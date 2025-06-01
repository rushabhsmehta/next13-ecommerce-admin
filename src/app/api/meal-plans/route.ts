import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET() {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const mealPlans = await prismadb.mealPlan.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(mealPlans);
  } catch (error) {
    console.log('[MEAL_PLANS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { name, code, description } = body;
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name || !code) {
      return new NextResponse("Name and code are required", { status: 400 });
    }
    
    const mealPlan = await prismadb.mealPlan.create({
      data: {
        name,
        code,
        description: description || ''
      }
    });
    
    return NextResponse.json(mealPlan);
  } catch (error) {
    console.log('[MEAL_PLANS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
