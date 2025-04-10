import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { differenceInDays, isWithinInterval, parseISO } from "date-fns";

interface TransportDetailInput {
  vehicleType: string;
  quantity: number;
  capacity?: number;
  description?: string;
}

interface RoomAllocationInput {
  roomType: string;
  occupancyType: string;
  quantity: number;
  guestNames?: string;
  mealPlan?: string; // Add meal plan field
}

interface ItineraryInput {
  hotelId: string;
  locationId?: string;
  numberofRooms: string;
  dayNumber: number;
  mealsIncluded?: string[];
  transportDetails?: TransportDetailInput[]; // Using this for vehicle information
  roomAllocations?: RoomAllocationInput[]; // Using this for room occupancy information
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tourStartsFrom,
      tourEndsOn,
      itineraries,
      numAdults,
      numChild5to12,
      numChild0to5
    } = body;

    if (!tourStartsFrom || !tourEndsOn) {
      return new NextResponse("Tour start and end dates are required", { status: 400 });
    }

    if (!itineraries || !Array.isArray(itineraries) || itineraries.length === 0) {
      return new NextResponse("Valid itineraries are required", { status: 400 });
    }

    const startDate = new Date(tourStartsFrom);
    const endDate = new Date(tourEndsOn);

    // Calculate total tour duration
    const tourDurationDays = differenceInDays(endDate, startDate) + 1;    // Initialize pricing data
    const pricingData = {
      totalPrice: 0,
      perPersonPrice: 0,
      perPersonTriplePrice: 0,
      perChild5to12WithBed: 0,
      perChild5to12WithoutBed: 0,
      perChildBelow5: 0,
      totalRooms: 0,
      breakdown: [] as any[],
      pricingSection: [] as any[],
      mealCost: 0,
      roomCost: 0,
      transportCost: 0, // Added transport cost
      datePeriodBreakdown: [] as any[],
      roomAllocations: [] as any[], // Added for mixed room occupancy
      transportDetails: [] as any[] // Added for multiple vehicles
    };

    // Parse guest numbers with fallbacks
    const adultsCount = parseInt(numAdults || "2");
    const childrenCount = parseInt(numChild5to12 || "0");
    const infantsCount = parseInt(numChild0to5 || "0");

    // Calculate optimal room configuration, taking into account specified occupancy type
    const roomConfig = calculateRoomConfiguration(adultsCount, childrenCount, infantsCount, itineraries);
    pricingData.totalRooms = roomConfig.totalRooms;

    // Process each day of the itinerary individually
    for (let day = 0; day < tourDurationDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      // Find the itinerary for this day (match by dayNumber)
      const dayItinerary = itineraries.find((it: ItineraryInput) => it.dayNumber === (day + 1));

      if (!dayItinerary) {
        // Skip days without itinerary
        continue;
      }

      let dailyCost = 0;
      let mealCost = 0;
      let transportCost = 0;
      let transportDescription = "";

      // Process hotel costs if hotel is specified
      if (dayItinerary.hotelId) {
        // Get the hotel details
        const hotel = await prismadb.hotel.findUnique({
          where: { id: dayItinerary.hotelId },
          select: { name: true, locationId: true }
        });

        if (hotel) {
          // Find applicable pricing for this specific date
          const hotelPricing = await prismadb.hotelPricing.findMany({
            where: {
              hotelId: dayItinerary.hotelId,
              isActive: true,
              startDate: { lte: currentDate },
              endDate: { gte: currentDate }
            }
          }); if (hotelPricing.length === 0) {
            // No pricing found for this date, use fallback pricing
            pricingData.breakdown.push({
              dayNumber: dayItinerary.dayNumber,
              date: currentDate.toISOString().split('T')[0],
              hotelName: hotel.name,
              roomType: "Standard", // Default room type
              basePrice: 0,
              total: 0,
              roomsNeeded: roomConfig.totalRooms,
              mealPlan: "N/A", // Default meal plan
              warning: "No pricing available for this date"
            });
          } else {
            // Select room type-specific pricing from room allocations or default to Standard
            const roomType = "Standard"; // Default to Standard if no specific room allocations
            const matchingPricing = hotelPricing.filter(price =>
              price.roomType.toLowerCase() === roomType.toLowerCase());

            if (matchingPricing.length === 0) {
              // No pricing for this room type, add warning and continue
              pricingData.breakdown.push({
                dayNumber: dayItinerary.dayNumber,
                date: currentDate.toISOString().split('T')[0],
                hotelName: hotel.name,
                roomType: roomType,
                basePrice: 0,
                total: 0,
                roomsNeeded: roomConfig.totalRooms,
                mealPlan: "N/A",
                warning: `No pricing found for room type: ${roomType}`
              });
            } else {
              // Calculate cost for each room type needed
              // Check if roomAllocations array is present and has items
              if (dayItinerary.roomAllocations && dayItinerary.roomAllocations.length > 0) {
                // Process mixed occupancy room configurations
                let roomCostForDay = 0;
                let roomBreakdown = []; for (const room of dayItinerary.roomAllocations) {
                  // First try to find exact match with meal plan
                  let roomPricing = hotelPricing.find(p =>
                    p.roomType.toLowerCase() === (room.roomType || roomType).toLowerCase() &&
                    p.occupancyType.toLowerCase() === room.occupancyType.toLowerCase() &&
                    p.mealPlan && room.mealPlan &&
                    p.mealPlan.toLowerCase() === room.mealPlan.toLowerCase());

                  // If no exact meal plan match, find by room type and occupancy type only
                  if (!roomPricing) {
                    roomPricing = hotelPricing.find(p =>
                      p.roomType.toLowerCase() === (room.roomType || roomType).toLowerCase() &&
                      p.occupancyType.toLowerCase() === room.occupancyType.toLowerCase());

                    if (roomPricing) {
                      console.log(`Found fallback pricing for ${room.roomType}/${room.occupancyType} without exact meal plan match`);
                    }
                  }

                  if (roomPricing) {
                    // Calculate cost for this room configuration
                    const roomQuantity = room.quantity || 1;
                    const roomCost = roomPricing.price * roomQuantity;
                    roomCostForDay += roomCost;
                    // Add to breakdown for detailed reporting
                    roomBreakdown.push({
                      roomType: room.roomType || roomType,
                      occupancyType: room.occupancyType,
                      mealPlan: room.mealPlan || 'N/A', // Add meal plan information from room allocation
                      quantity: roomQuantity,
                      pricePerRoom: roomPricing.price,
                      totalCost: roomCost,
                      guestNames: room.guestNames || ''
                    });
                  } else {
                    // No pricing found for this room configuration
                    roomBreakdown.push({
                      roomType: room.roomType || roomType,
                      occupancyType: room.occupancyType,
                      quantity: room.quantity || 1,
                      warning: `No pricing found for ${room.roomType || roomType}/${room.occupancyType}`
                    });
                  }
                }
                // Add the total room cost for the day                console.log(`Day ${dayItinerary.dayNumber}: Adding room cost of ${roomCostForDay} to daily cost`);
                dailyCost += roomCostForDay;
                // Explicitly add to room cost tracking
                pricingData.roomCost += roomCostForDay;
                console.log(`Day ${dayItinerary.dayNumber}: Total daily cost after adding room cost: ${dailyCost}`);

                // Store the room breakdown for this day
                pricingData.roomAllocations = pricingData.roomAllocations || [];
                pricingData.roomAllocations.push({
                  dayNumber: dayItinerary.dayNumber,
                  date: currentDate.toISOString().split('T')[0],
                  hotelName: hotel.name,
                  totalCost: roomCostForDay,
                  rooms: roomBreakdown
                });
              }
              // Use calculated configuration since we removed the occupancyType field
              else {
                // Fallback to calculated configuration based on room allocations
                calculateCostBasedOnRoomConfig(
                  matchingPricing,
                  roomConfig,
                  dailyCost
                );
              }
              // Use calculated room configuration
              dailyCost = calculateCostBasedOnRoomConfig(
                matchingPricing,
                roomConfig,
                0  // Start with 0 to avoid accumulation
              );
            }

            // Add meal costs if not included in room price
            // Prioritize the explicitly specified meal plan if available
            const mealPlan = dayItinerary.mealPlan || matchingPricing[0].mealPlan || "EP (No Meals)";
            const mealsIncluded = dayItinerary.mealsIncluded || [];

            // If hotel doesn't include all meals, calculate additional meal costs
            if (!mealPlan.includes("AP")) { // Not All Meals
              if (mealPlan.includes("No Meal Plan") || mealPlan.includes("EP")) {
                // No meals included - charge for all meals specified in the itinerary
                const breakfastCost = 350; // per person
                const lunchCost = 500; // per person
                const dinnerCost = 550; // per person

                const totalPeople = adultsCount + childrenCount; // Infants usually don't incur meal costs

                if (mealsIncluded.includes("Breakfast")) {
                  mealCost += breakfastCost * totalPeople;
                }

                if (mealsIncluded.includes("Lunch")) {
                  mealCost += lunchCost * totalPeople;
                }

                if (mealsIncluded.includes("Dinner")) {
                  mealCost += dinnerCost * totalPeople;
                }
              } else if (mealPlan.includes("CP") || mealPlan.includes("Breakfast")) {
                // Only breakfast included - charge for lunch and dinner
                const lunchCost = 500; // per person
                const dinnerCost = 550; // per person

                const totalPeople = adultsCount + childrenCount;

                if (mealsIncluded.includes("Lunch")) {
                  mealCost += lunchCost * totalPeople;
                }

                if (mealsIncluded.includes("Dinner")) {
                  mealCost += dinnerCost * totalPeople;
                }
              } else if (mealPlan.includes("MAP")) {
                // Breakfast and dinner included - charge only for lunch
                const lunchCost = 500; // per person

                const totalPeople = adultsCount + childrenCount;

                if (mealsIncluded.includes("Lunch")) {
                  mealCost += lunchCost * totalPeople;
                }
              }
            }

            // Track costs for specific date periods for seasonal price differences
            const periodKey = `${matchingPricing[0].startDate.toISOString().split('T')[0]}_${matchingPricing[0].endDate.toISOString().split('T')[0]}`;

            const existingPeriod = pricingData.datePeriodBreakdown.find(p => p.key === periodKey);
            if (existingPeriod) {
              existingPeriod.totalCost += (dailyCost + mealCost);
              existingPeriod.days += 1;
            } else {
              pricingData.datePeriodBreakdown.push({
                key: periodKey,
                startDate: matchingPricing[0].startDate.toISOString().split('T')[0],
                endDate: matchingPricing[0].endDate.toISOString().split('T')[0],
                days: 1,
                totalCost: (dailyCost + mealCost)
              });
            }
          }
        }
      }
      // Calculate transport costs if vehicle type is specified (multiple vehicles or single)
      let transportDetailsArray = [];

      // Check for multiple vehicles first (new approach)
      if (dayItinerary.transportDetails && Array.isArray(dayItinerary.transportDetails) && dayItinerary.transportDetails.length > 0) {
        const locationId = dayItinerary.locationId || itineraries[0].locationId;
        if (locationId) {
          // Process each vehicle in the transportDetails array
          for (const transportDetail of dayItinerary.transportDetails) {
            if (!transportDetail.vehicleType) continue;

            const vehicleType = transportDetail.vehicleType;
            const quantity = transportDetail.quantity || 1;

            // Get pricing for this vehicle type
            const transportPricing = await prismadb.transportPricing.findMany({
              where: {
                locationId: locationId,
                vehicleType: vehicleType,
                isActive: true,
                startDate: { lte: currentDate },
                endDate: { gte: currentDate }
              }
            });

            if (transportPricing.length > 0) {
              const pricing = transportPricing[0];
              let vehicleCost = 0;
              let vehicleDescription = '';

              // Calculate cost based on transport type (per day or per trip)
              if (pricing.transportType === "PerDay") {
                vehicleCost = pricing.price * quantity;
                vehicleDescription = `${quantity} x ${pricing.vehicleType} (${pricing.capacity || ''}) - Per day`;
              } else {
                // For "PerTrip" type, charge once for the entire duration
                if (day === 0) { // Only charge on the first day to avoid duplicate charges
                  vehicleCost = pricing.price * quantity;
                  vehicleDescription = `${quantity} x ${pricing.vehicleType} (${pricing.capacity || ''}) - One time`;
                }
              }

              // Add to total transport cost
              transportCost += vehicleCost;

              // Track individual vehicle details
              if (vehicleCost > 0) {
                transportDetailsArray.push({
                  vehicleType: pricing.vehicleType,
                  quantity: quantity,
                  capacity: pricing.capacity,
                  cost: vehicleCost,
                  description: vehicleDescription
                });
              }
            } else {
              // No pricing found for this vehicle
              transportDetailsArray.push({
                vehicleType: vehicleType,
                quantity: quantity,
                cost: 0,
                description: `${vehicleType} - No pricing available`
              });
            }
          }
        }
      }      // No fallback needed since we'll rely only on transportDetails
      else {
        // Skip transport cost calculation if no transportDetails are provided
        const locationId = dayItinerary.locationId || itineraries[0].locationId;
        if (locationId) {
          // We'll add a default transport detail for tracking purposes
          transportDescription = "No transport details specified";

          transportDetailsArray.push({
            vehicleType: "Not specified",
            quantity: 0,
            cost: 0,
            description: transportDescription
          });
        }
      }


      // Add transport cost to the total
      pricingData.transportCost += transportCost;

      // Calculate total daily cost
      const totalDailyCost = dailyCost + mealCost + transportCost;
      pricingData.totalPrice += totalDailyCost;
      pricingData.roomCost += dailyCost;
      pricingData.mealCost += mealCost;
      // Save detailed breakdown
      if (dayItinerary.hotelId || transportCost > 0) {
        const hotel = dayItinerary.hotelId ? await prismadb.hotel.findUnique({
          where: { id: dayItinerary.hotelId },
          select: { name: true }
        }) : null;        // Generate a summary of meal plans if room allocations exist
        // Using a more compatible approach without Set 
        const mealPlanSummary = dayItinerary.roomAllocations && dayItinerary.roomAllocations.length > 0
          ? Array.from(new Set(dayItinerary.roomAllocations.map((r: RoomAllocationInput) => r.mealPlan || 'N/A'))).join(', ')
          : "N/A";

        // Check if an entry for this day already exists in the breakdown
        const existingDayIndex = pricingData.breakdown.findIndex(
          item => item.dayNumber === dayItinerary.dayNumber &&
            item.date === currentDate.toISOString().split('T')[0]
        );

        if (existingDayIndex >= 0) {
          // Update the existing entry instead of creating a new one
          const existingDay = pricingData.breakdown[existingDayIndex];
          existingDay.roomCost += dailyCost;
          existingDay.mealCost += mealCost;
          existingDay.transportCost += transportCost;
          existingDay.total += totalDailyCost;

          // Merge meal plans if they differ
          if (existingDay.mealPlan !== mealPlanSummary && mealPlanSummary !== 'N/A') {
            existingDay.mealPlan = [existingDay.mealPlan, mealPlanSummary]
              .filter(plan => plan && plan !== 'N/A')
              .join(', ') || 'N/A';
          }

          console.log(`Updated existing day ${dayItinerary.dayNumber} in breakdown, new total: ${existingDay.total}`);
        } else {          // Create a new entry if this is the first occurrence of this day
          pricingData.breakdown.push({
            dayNumber: dayItinerary.dayNumber,
            date: currentDate.toISOString().split('T')[0],
            hotelName: hotel ? hotel.name : "N/A",
            roomType: "Standard", // Default room type since we're using roomAllocations for room details
            basePrice: dailyCost > 0 ? dailyCost / (parseInt(dayItinerary.numberofRooms || "1")) : 0,
            roomCost: dailyCost,
            mealCost: mealCost,
            transportCost: transportCost,
            transportType: transportDescription,
            total: totalDailyCost,
            roomsBreakdown: `Double: ${roomConfig.doubleRooms}, Triple: ${roomConfig.tripleRooms}, Single: ${roomConfig.singleRooms}`,
            roomsNeeded: roomConfig.totalRooms,
            mealPlan: mealPlanSummary
          });

          console.log(`Added new day ${dayItinerary.dayNumber} to breakdown, total: ${totalDailyCost}`);
        }
      }
    }

    // Calculate per person prices based on accurate distribution
    if (adultsCount > 0) {
      pricingData.perPersonPrice = Math.round(pricingData.totalPrice / adultsCount);
      pricingData.perPersonTriplePrice = Math.round(pricingData.perPersonPrice * 0.85); // Slight discount for triple
      pricingData.perChild5to12WithBed = Math.round(pricingData.perPersonPrice * 0.8);
      pricingData.perChild5to12WithoutBed = Math.round(pricingData.perPersonPrice * 0.5);
      pricingData.perChildBelow5 = childrenCount > 0 ? Math.round(pricingData.perPersonPrice * 0.1) : 0; // Nominal charge
    }

    // Generate detailed pricing section for the form
    pricingData.pricingSection = [
      {
        name: "Package Total",
        price: `₹${Math.round(pricingData.totalPrice).toLocaleString()}`,
        description: `Total package cost for ${adultsCount} adult(s), ${childrenCount} child(ren) & ${infantsCount} infant(s)`
      },
      {
        name: "Per Person (Double Occupancy)",
        price: `₹${Math.round(pricingData.perPersonPrice).toLocaleString()}`,
        description: "Per adult price based on double sharing"
      },
      {
        name: "Per Person (Triple Occupancy)",
        price: `₹${Math.round(pricingData.perPersonTriplePrice).toLocaleString()}`,
        description: "Per adult price based on triple sharing (where applicable)"
      }
    ];

    // Add cost breakdown by category if any costs exist
    if (pricingData.roomCost > 0 || pricingData.mealCost > 0 || pricingData.transportCost > 0) {
      pricingData.pricingSection.push({
        name: "Cost Breakdown",
        price: "",
        description: "Detailed cost breakdown by category"
      });

      if (pricingData.roomCost > 0) {
        pricingData.pricingSection.push({
          name: "Accommodation",
          price: `₹${Math.round(pricingData.roomCost).toLocaleString()}`,
          description: "Total cost for all accommodations"
        });
      }

      if (pricingData.mealCost > 0) {
        pricingData.pricingSection.push({
          name: "Meals",
          price: `₹${Math.round(pricingData.mealCost).toLocaleString()}`,
          description: "Total cost for all included meals"
        });
      }

      if (pricingData.transportCost > 0) {
        pricingData.pricingSection.push({
          name: "Transport",
          price: `₹${Math.round(pricingData.transportCost).toLocaleString()}`,
          description: "Total cost for all vehicles and transfers"
        });
      }
    }

    // Only add child prices if there are children
    if (childrenCount > 0 || infantsCount > 0) {
      pricingData.pricingSection.push(
        {
          name: "Child (5-12 Years) with Extra Bed",
          price: `₹${Math.round(pricingData.perChild5to12WithBed).toLocaleString()}`,
          description: "Price per child with extra bed"
        },
        {
          name: "Child (5-12 Years) without Bed",
          price: `₹${Math.round(pricingData.perChild5to12WithoutBed).toLocaleString()}`,
          description: "Price per child without extra bed"
        }
      );
    }

    if (infantsCount > 0) {
      pricingData.pricingSection.push({
        name: "Child Below 5 Years",
        price: pricingData.perChildBelow5 > 0 ? `₹${Math.round(pricingData.perChildBelow5).toLocaleString()}` : "Complimentary",
        description: "With parents (sharing bed)"
      });
    }

    // Add date period breakdown (for seasonal pricing display)
    if (pricingData.datePeriodBreakdown.length > 0) {
      pricingData.pricingSection.push({
        name: "Period-wise Breakdown",
        price: "",
        description: "Detailed cost breakdown by season"
      });

      for (const period of pricingData.datePeriodBreakdown) {
        pricingData.pricingSection.push({
          name: `${period.startDate} to ${period.endDate} (${period.days} night${period.days > 1 ? 's' : ''})`,
          price: `₹${Math.round(period.totalCost).toLocaleString()}`,
          description: `Season-specific pricing for ${period.days} night${period.days > 1 ? 's' : ''}`
        });
      }
    }

    return NextResponse.json(pricingData);
  } catch (error) {
    console.error("[CALCULATE_PACKAGE_PRICE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * Helper function to calculate room configuration based on guest numbers
 * and respect specified occupancy preferences
 */
function calculateRoomConfiguration(
  adults: number,
  children: number,
  infants: number,
  itineraries: ItineraryInput[]
) {  // Check if any itineraries have specific occupancy type preferences in room allocations
  const hasSpecificOccupancyType = itineraries.some(itinerary =>
    itinerary.roomAllocations && itinerary.roomAllocations.length > 0);

  // If room allocations are specified, adjust the calculation
  if (hasSpecificOccupancyType) {
    // Count rooms by occupancy type
    let doubleRooms = 0;
    let tripleRooms = 0;
    let singleRooms = 0;
    let childWithBed = 0;
    let childWithoutBed = 0;      // Go through the itineraries and count the rooms by type from roomAllocations
    for (const itinerary of itineraries) {
      if (!itinerary.roomAllocations || itinerary.roomAllocations.length === 0) continue;

      // Process each room allocation
      for (const room of itinerary.roomAllocations) {
        const roomCount = parseInt(room.quantity.toString() || '1');

        switch (room.occupancyType.toLowerCase()) {
          case 'double':
            doubleRooms += roomCount;
            break;
          case 'triple':
            tripleRooms += roomCount;
            break;
          case 'single':
            singleRooms += roomCount;
            break;
          case 'child with bed':
            childWithBed += roomCount;
            break;
          case 'child without bed':
            childWithoutBed += roomCount;
            break;
        }
      }
    }

    const totalRooms = doubleRooms + tripleRooms + singleRooms;

    return {
      doubleRooms,
      tripleRooms,
      singleRooms,
      childWithBed,
      childWithoutBed,
      totalRooms: totalRooms > 0 ? totalRooms : 1 // Ensure at least one room
    };
  }

  // If no specific occupancy types, use the original logic
  // Initialize room counts
  let doubleRooms = 0;
  let tripleRooms = 0;
  let singleRooms = 0;
  let childWithBed = 0;
  let childWithoutBed = 0;

  // Base logic: Prioritize filling double rooms, then add triple or single as needed

  // Step 1: Assign adults to rooms
  if (adults === 1) {
    singleRooms = 1;
  } else {
    // Calculate double rooms needed
    doubleRooms = Math.floor(adults / 2);

    // Any remaining adults?
    const remainingAdults = adults % 2;

    if (remainingAdults === 1) {
      // We have one adult left - they'll need their own room
      // Options: a) Put them in a single room, b) use a triple room with children if any
      if (children > 0) {
        // If we have children, we might be able to use a triple room
        tripleRooms = 1;

        // This triple room can accommodate 1 adult + 2 children, or 1 adult + 1 child with bed
        childWithBed = Math.min(children, 1); // At most 1 child with bed in this room
        childWithoutBed = Math.min(children - childWithBed, 1); // At most 1 child without bed

        // Remaining children will be handled later
      } else {
        // No children, so just use a single room
        singleRooms = 1;
      }
    }
  }

  // Step 2: Assign remaining children
  const remainingChildren = children - childWithBed - childWithoutBed;

  if (remainingChildren > 0) {
    // Child allocation strategies:
    // 1. Children with parents in existing rooms (already handled above)
    // 2. Children in their own room (e.g., triple room for 3 children)
    // 3. Children with bed vs. without bed

    // For simplicity, we'll use additional double rooms for remaining children
    // 2 children per room (with beds)
    const additionalRoomsForChildren = Math.ceil(remainingChildren / 2);
    doubleRooms += additionalRoomsForChildren;
    childWithBed += remainingChildren;
  }

  // Total rooms
  const totalRooms = doubleRooms + tripleRooms + singleRooms;

  return {
    doubleRooms,
    tripleRooms,
    singleRooms,
    childWithBed,
    childWithoutBed,
    totalRooms
  };
}

/**
 * Helper function to calculate costs based on room configuration
 */
function calculateCostBasedOnRoomConfig(
  matchingPricing: any[],
  roomConfig: ReturnType<typeof calculateRoomConfiguration>,
  dailyCost: number
) {
  // Double rooms
  if (roomConfig.doubleRooms > 0) {
    const doublePricing = matchingPricing.find(p => p.occupancyType === "Double");
    if (doublePricing) {
      dailyCost += doublePricing.price * roomConfig.doubleRooms;
    }
  }

  // Triple rooms
  if (roomConfig.tripleRooms > 0) {
    const triplePricing = matchingPricing.find(p => p.occupancyType === "Triple");
    if (triplePricing) {
      dailyCost += triplePricing.price * roomConfig.tripleRooms;
    } else {
      // Fallback: Use double room with extra bed
      const doublePricing = matchingPricing.find(p => p.occupancyType === "Double");
      if (doublePricing) {
        dailyCost += (doublePricing.price * 1.2) * roomConfig.tripleRooms; // 20% extra for extra bed
      }
    }
  }

  // Single rooms
  if (roomConfig.singleRooms > 0) {
    const singlePricing = matchingPricing.find(p => p.occupancyType === "Single");
    if (singlePricing) {
      dailyCost += singlePricing.price * roomConfig.singleRooms;
    } else {
      // Fallback: Use double room as single
      const doublePricing = matchingPricing.find(p => p.occupancyType === "Double");
      if (doublePricing) {
        dailyCost += doublePricing.price * roomConfig.singleRooms;
      }
    }
  }

  // Child with bed
  if (roomConfig.childWithBed > 0) {
    const childWithBedPricing = matchingPricing.find(p => p.occupancyType === "Child with Bed");
    if (childWithBedPricing) {
      dailyCost += childWithBedPricing.price * roomConfig.childWithBed;
    }
  }

  // Child without bed
  if (roomConfig.childWithoutBed > 0) {
    const childWithoutBedPricing = matchingPricing.find(p => p.occupancyType === "Child without Bed");
    if (childWithoutBedPricing) {
      dailyCost += childWithoutBedPricing.price * roomConfig.childWithoutBed;
    }
  }

  return dailyCost;
}