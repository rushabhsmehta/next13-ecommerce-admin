import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prismadb from "@/lib/prismadb"

export async function GET(req: NextRequest, props: { params: Promise<{ locationId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth()

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 })
    }

    const { locationId } = params

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 })
    }

    // Get all seasonal periods for this location
    const seasonalPeriods = await prismadb.locationSeasonalPeriod.findMany({
      where: {
        locationId,
        isActive: true,
      },
      orderBy: [
        { startMonth: 'asc' },
        { startDay: 'asc' }
      ],
      include: {
        location: {
          select: {
            id: true,
            label: true,
          }
        }
      }
    })

    return NextResponse.json(seasonalPeriods)
  } catch (error) {
    console.error("[LOCATION_SEASONAL_PERIODS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ locationId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth()

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 })
    }

    const { locationId } = params
    const body = await req.json()

    const {
      seasonType,
      name,
      startMonth,
      startDay,
      endMonth,
      endDay,
      description,
    } = body

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 })
    }

    if (!seasonType || !name || !startMonth || !startDay || !endMonth || !endDay) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Validate season type
    const validSeasonTypes = ['OFF_SEASON', 'PEAK_SEASON', 'SHOULDER_SEASON']
    if (!validSeasonTypes.includes(seasonType)) {
      return new NextResponse("Invalid season type", { status: 400 })
    }

    // Validate month and day ranges
    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
      return new NextResponse("Invalid month values", { status: 400 })
    }

    if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
      return new NextResponse("Invalid day values", { status: 400 })
    }

    // Check if location exists
    const location = await prismadb.location.findUnique({
      where: { id: locationId }
    })

    if (!location) {
      return new NextResponse("Location not found", { status: 404 })
    }

    // Check for overlapping periods
    const existingPeriods = await prismadb.locationSeasonalPeriod.findMany({
      where: {
        locationId,
        isActive: true,
      }
    })

    // Simple overlap check (can be enhanced for complex year-crossing periods)
    const hasOverlap = existingPeriods.some((period: any) => {
      // Convert to day of year for easier comparison
      const newStart = startMonth * 100 + startDay
      const newEnd = endMonth * 100 + endDay
      const existingStart = period.startMonth * 100 + period.startDay
      const existingEnd = period.endMonth * 100 + period.endDay

      // Check for overlap
      return (newStart <= existingEnd && newEnd >= existingStart)
    })

    if (hasOverlap) {
      return new NextResponse("Seasonal period overlaps with existing period", { status: 409 })
    }

    const seasonalPeriod = await prismadb.locationSeasonalPeriod.create({
      data: {
        locationId,
        seasonType,
        name,
        startMonth: parseInt(startMonth),
        startDay: parseInt(startDay),
        endMonth: parseInt(endMonth),
        endDay: parseInt(endDay),
        description,
      },
      include: {
        location: {
          select: {
            id: true,
            label: true,
          }
        }
      }
    })

    return NextResponse.json(seasonalPeriod)
  } catch (error) {
    console.error("[LOCATION_SEASONAL_PERIODS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
