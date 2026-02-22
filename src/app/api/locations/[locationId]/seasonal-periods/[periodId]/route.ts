import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prismadb from "@/lib/prismadb"

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ locationId: string; periodId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth()

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 })
    }

    const { locationId, periodId } = params

    if (!locationId || !periodId) {
      return new NextResponse("Location ID and Period ID are required", { status: 400 })
    }

    const seasonalPeriod = await prismadb.locationSeasonalPeriod.findUnique({
      where: {
        id: periodId,
        locationId,
      },
      include: {
        location: {
          select: {
            id: true,
            label: true,
          }
        },
        tourPackagePricings: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            tourPackage: {
              select: {
                id: true,
                tourPackageName: true,
              }
            }
          }
        }
      }
    })

    if (!seasonalPeriod) {
      return new NextResponse("Seasonal period not found", { status: 404 })
    }

    return NextResponse.json(seasonalPeriod)
  } catch (error) {
    console.error("[LOCATION_SEASONAL_PERIOD_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ locationId: string; periodId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth()

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 })
    }

    const { locationId, periodId } = params
    const body = await req.json()

    const {
      seasonType,
      name,
      startMonth,
      startDay,
      endMonth,
      endDay,
      description,
      isActive,
    } = body

    if (!locationId || !periodId) {
      return new NextResponse("Location ID and Period ID are required", { status: 400 })
    }

    // Check if seasonal period exists
    const existingPeriod = await prismadb.locationSeasonalPeriod.findUnique({
      where: {
        id: periodId,
        locationId,
      }
    })

    if (!existingPeriod) {
      return new NextResponse("Seasonal period not found", { status: 404 })
    }

    // Validate season type if provided
    if (seasonType) {
      const validSeasonTypes = ['OFF_SEASON', 'PEAK_SEASON', 'SHOULDER_SEASON']
      if (!validSeasonTypes.includes(seasonType)) {
        return new NextResponse("Invalid season type", { status: 400 })
      }
    }

    // Validate month and day ranges if provided
    if (startMonth && (startMonth < 1 || startMonth > 12)) {
      return new NextResponse("Invalid start month", { status: 400 })
    }
    if (endMonth && (endMonth < 1 || endMonth > 12)) {
      return new NextResponse("Invalid end month", { status: 400 })
    }
    if (startDay && (startDay < 1 || startDay > 31)) {
      return new NextResponse("Invalid start day", { status: 400 })
    }
    if (endDay && (endDay < 1 || endDay > 31)) {
      return new NextResponse("Invalid end day", { status: 400 })
    }

    // Check for overlapping periods if dates are being updated
    if (startMonth || startDay || endMonth || endDay) {
      const newStartMonth = startMonth || existingPeriod.startMonth
      const newStartDay = startDay || existingPeriod.startDay
      const newEndMonth = endMonth || existingPeriod.endMonth
      const newEndDay = endDay || existingPeriod.endDay

      const otherPeriods = await prismadb.locationSeasonalPeriod.findMany({
        where: {
          locationId,
          isActive: true,
          id: { not: periodId } // Exclude current period
        }
      })

      // Simple overlap check
      const hasOverlap = otherPeriods.some(period => {
        const newStart = newStartMonth * 100 + newStartDay
        const newEnd = newEndMonth * 100 + newEndDay
        const existingStart = period.startMonth * 100 + period.startDay
        const existingEnd = period.endMonth * 100 + period.endDay

        return (newStart <= existingEnd && newEnd >= existingStart)
      })

      if (hasOverlap) {
        return new NextResponse("Seasonal period overlaps with existing period", { status: 409 })
      }
    }

    const updatedPeriod = await prismadb.locationSeasonalPeriod.update({
      where: {
        id: periodId,
        locationId,
      },
      data: {
        ...(seasonType && { seasonType }),
        ...(name && { name }),
        ...(startMonth && { startMonth: parseInt(startMonth) }),
        ...(startDay && { startDay: parseInt(startDay) }),
        ...(endMonth && { endMonth: parseInt(endMonth) }),
        ...(endDay && { endDay: parseInt(endDay) }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
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

    return NextResponse.json(updatedPeriod)
  } catch (error) {
    console.error("[LOCATION_SEASONAL_PERIOD_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ locationId: string; periodId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth()

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 })
    }

    const { locationId, periodId } = params

    if (!locationId || !periodId) {
      return new NextResponse("Location ID and Period ID are required", { status: 400 })
    }

    // Check if seasonal period exists
    const existingPeriod = await prismadb.locationSeasonalPeriod.findUnique({
      where: {
        id: periodId,
        locationId,
      },
      include: {
        tourPackagePricings: true
      }
    })

    if (!existingPeriod) {
      return new NextResponse("Seasonal period not found", { status: 404 })
    }

    // Check if any tour package pricing periods are using this seasonal period
    if (existingPeriod.tourPackagePricings.length > 0) {
      return new NextResponse(
        `Cannot delete seasonal period: ${existingPeriod.tourPackagePricings.length} tour package pricing periods are using it`,
        { status: 409 }
      )
    }

    await prismadb.locationSeasonalPeriod.delete({
      where: {
        id: periodId,
        locationId,
      }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[LOCATION_SEASONAL_PERIOD_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
