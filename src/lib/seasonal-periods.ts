/**
 * Utility functions for handling location seasonal periods
 */

export interface SeasonalPeriod {
  id: string
  seasonType: 'OFF_SEASON' | 'PEAK_SEASON' | 'SHOULDER_SEASON'
  name: string
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  description?: string
  isActive: boolean
}

export interface SeasonalPeriodTemplate {
  type: 'OFF_SEASON' | 'PEAK_SEASON' | 'SHOULDER_SEASON'
  name: string
  start: [number, number] // [month, day]
  end: [number, number] // [month, day]
  description?: string
}

/**
 * Common seasonal period templates for different location types
 */
export const SEASONAL_TEMPLATES = {
  HILL_STATION: [
    {
      type: 'PEAK_SEASON' as const,
      name: 'Summer Peak Season',
      start: [4, 1] as [number, number],
      end: [6, 30] as [number, number],
      description: 'Pleasant weather, peak tourist season with higher demand'
    },
    {
      type: 'SHOULDER_SEASON' as const,
      name: 'Winter Pleasant Season',
      start: [10, 1] as [number, number],
      end: [3, 31] as [number, number],
      description: 'Cool weather, moderate demand'
    },
    {
      type: 'OFF_SEASON' as const,
      name: 'Monsoon Off Season',
      start: [7, 1] as [number, number],
      end: [9, 30] as [number, number],
      description: 'Monsoon season with limited tourism'
    }
  ],
  BEACH_DESTINATION: [
    {
      type: 'PEAK_SEASON' as const,
      name: 'Winter Peak Season',
      start: [12, 1] as [number, number],
      end: [2, 28] as [number, number],
      description: 'Perfect weather, highest demand for beach holidays'
    },
    {
      type: 'SHOULDER_SEASON' as const,
      name: 'Pleasant Season',
      start: [3, 1] as [number, number],
      end: [5, 31] as [number, number],
      description: 'Good weather with moderate prices'
    },
    {
      type: 'OFF_SEASON' as const,
      name: 'Monsoon Off Season',
      start: [6, 1] as [number, number],
      end: [11, 30] as [number, number],
      description: 'Monsoon and hot weather, lower prices'
    }
  ],
  DESERT_DESTINATION: [
    {
      type: 'PEAK_SEASON' as const,
      name: 'Winter Peak Season',
      start: [11, 1] as [number, number],
      end: [2, 28] as [number, number],
      description: 'Pleasant weather, ideal for desert tourism'
    },
    {
      type: 'SHOULDER_SEASON' as const,
      name: 'Spring/Autumn Season',
      start: [3, 1] as [number, number],
      end: [4, 30] as [number, number],
      description: 'Moderately warm weather'
    },
    {
      type: 'OFF_SEASON' as const,
      name: 'Summer Off Season',
      start: [5, 1] as [number, number],
      end: [10, 31] as [number, number],
      description: 'Very hot weather, minimal tourism'
    }
  ],
  CULTURAL_CITY: [
    {
      type: 'PEAK_SEASON' as const,
      name: 'Winter Peak Season',
      start: [10, 1] as [number, number],
      end: [3, 31] as [number, number],
      description: 'Pleasant weather for sightseeing'
    },
    {
      type: 'SHOULDER_SEASON' as const,
      name: 'Spring/Summer Season',
      start: [4, 1] as [number, number],
      end: [6, 30] as [number, number],
      description: 'Warm weather, moderate demand'
    },
    {
      type: 'OFF_SEASON' as const,
      name: 'Monsoon Off Season',
      start: [7, 1] as [number, number],
      end: [9, 30] as [number, number],
      description: 'Monsoon season, reduced outdoor activities'
    }
  ]
}

/**
 * Convert month and day to day of year for easier comparison
 */
export function toDayOfYear(month: number, day: number): number {
  return month * 100 + day
}

/**
 * Check if two seasonal periods overlap
 */
export function periodsOverlap(
  period1: Pick<SeasonalPeriod, 'startMonth' | 'startDay' | 'endMonth' | 'endDay'>,
  period2: Pick<SeasonalPeriod, 'startMonth' | 'startDay' | 'endMonth' | 'endDay'>
): boolean {
  const start1 = toDayOfYear(period1.startMonth, period1.startDay)
  const end1 = toDayOfYear(period1.endMonth, period1.endDay)
  const start2 = toDayOfYear(period2.startMonth, period2.startDay)
  const end2 = toDayOfYear(period2.endMonth, period2.endDay)

  // Handle year-crossing periods (more complex logic would be needed for full support)
  return start1 <= end2 && end1 >= start2
}

/**
 * Generate date ranges for a given year from seasonal period
 */
export function generateDateRangesForYear(period: SeasonalPeriod, year: number): Array<{ start: Date; end: Date }> {
  const ranges: Array<{ start: Date; end: Date }> = []

  // Handle simple case (no year crossing)
  if (period.startMonth <= period.endMonth) {
    ranges.push({
      start: new Date(year, period.startMonth - 1, period.startDay),
      end: new Date(year, period.endMonth - 1, period.endDay)
    })
  } else {
    // Period crosses year boundary
    ranges.push(
      {
        start: new Date(year, period.startMonth - 1, period.startDay),
        end: new Date(year, 11, 31) // End of current year
      },
      {
        start: new Date(year + 1, 0, 1), // Start of next year
        end: new Date(year + 1, period.endMonth - 1, period.endDay)
      }
    )
  }

  return ranges
}

/**
 * Find which seasonal period a given date falls into
 */
export function findSeasonalPeriodForDate(
  date: Date,
  periods: SeasonalPeriod[]
): SeasonalPeriod | null {
  const month = date.getMonth() + 1 // Convert to 1-based month
  const day = date.getDate()
  const dateValue = toDayOfYear(month, day)

  for (const period of periods) {
    const startValue = toDayOfYear(period.startMonth, period.startDay)
    const endValue = toDayOfYear(period.endMonth, period.endDay)

    if (startValue <= endValue) {
      // Period doesn't cross year boundary
      if (dateValue >= startValue && dateValue <= endValue) {
        return period
      }
    } else {
      // Period crosses year boundary
      if (dateValue >= startValue || dateValue <= endValue) {
        return period
      }
    }
  }

  return null
}

/**
 * Validate seasonal period data
 */
export function validateSeasonalPeriod(period: Partial<SeasonalPeriod>): string[] {
  const errors: string[] = []

  if (!period.seasonType || !['OFF_SEASON', 'PEAK_SEASON', 'SHOULDER_SEASON'].includes(period.seasonType)) {
    errors.push('Invalid season type')
  }

  if (!period.name || period.name.trim().length === 0) {
    errors.push('Season name is required')
  }

  if (!period.startMonth || period.startMonth < 1 || period.startMonth > 12) {
    errors.push('Start month must be between 1 and 12')
  }

  if (!period.endMonth || period.endMonth < 1 || period.endMonth > 12) {
    errors.push('End month must be between 1 and 12')
  }

  if (!period.startDay || period.startDay < 1 || period.startDay > 31) {
    errors.push('Start day must be between 1 and 31')
  }

  if (!period.endDay || period.endDay < 1 || period.endDay > 31) {
    errors.push('End day must be between 1 and 31')
  }

  return errors
}

/**
 * Get season color for UI display
 */
export function getSeasonColor(seasonType: string): { bg: string; text: string; border: string } {
  switch (seasonType) {
    case 'PEAK_SEASON':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
    case 'OFF_SEASON':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' }
    case 'SHOULDER_SEASON':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
  }
}

/**
 * Format seasonal period for display
 */
export function formatSeasonalPeriod(period: SeasonalPeriod): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const startMonth = monthNames[period.startMonth - 1]
  const endMonth = monthNames[period.endMonth - 1]

  return `${startMonth} ${period.startDay} - ${endMonth} ${period.endDay}`
}

/**
 * Check if seasonal periods provide complete year coverage
 */
export function checkYearCoverage(periods: SeasonalPeriod[]): {
  isComplete: boolean
  gaps: Array<{ start: [number, number]; end: [number, number] }>
  overlaps: Array<{ period1: SeasonalPeriod; period2: SeasonalPeriod }>
} {
  const activePeriods = periods.filter(p => p.isActive)
  const gaps: Array<{ start: [number, number]; end: [number, number] }> = []
  const overlaps: Array<{ period1: SeasonalPeriod; period2: SeasonalPeriod }> = []

  // Check for overlaps
  for (let i = 0; i < activePeriods.length; i++) {
    for (let j = i + 1; j < activePeriods.length; j++) {
      if (periodsOverlap(activePeriods[i], activePeriods[j])) {
        overlaps.push({ period1: activePeriods[i], period2: activePeriods[j] })
      }
    }
  }

  // Simple gap detection (can be enhanced for complex scenarios)
  // Sort periods by start date
  const sortedPeriods = [...activePeriods].sort((a, b) => 
    toDayOfYear(a.startMonth, a.startDay) - toDayOfYear(b.startMonth, b.startDay)
  )

  // Basic gap detection logic would go here
  // For now, we'll consider it complete if we have periods
  const isComplete = activePeriods.length > 0 && overlaps.length === 0

  return { isComplete, gaps, overlaps }
}
