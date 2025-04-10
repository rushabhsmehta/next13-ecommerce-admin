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
    
    // Log the full request data for diagnosis
    console.log(`[CALCULATION_INPUT] Full request data:`, JSON.stringify(body, null, 2));
    
    const {
      tourStartsFrom,
      tourEndsOn,
      itineraries,
    } = body;

    if (!tourStartsFrom || !tourEndsOn) {
      return new NextResponse("Tour start and end dates are required", { status: 400 });
    }

    if (!itineraries || !Array.isArray(itineraries) || itineraries.length === 0) {
      return new NextResponse("Valid itineraries are required", { status: 400 });
    }const startDate = new Date(tourStartsFrom);
    const endDate = new Date(tourEndsOn);

    // Calculate total tour duration
    const tourDurationDays = differenceInDays(endDate, startDate) + 1;

    // Initialize pricing data with simplified structure
    const pricingData = {
      totalPrice: 0,
      totalRooms: 0,
      breakdown: [] as any[],
      pricingSection: [] as any[],
      mealCost: 0,
      roomCost: 0,
      transportCost: 0,
      datePeriodBreakdown: [] as any[],
      roomAllocations: [] as any[],
      transportDetails: [] as any[]
    };

    // Parse guest numbers with fallbacks
    // Calculate optimal room configuration, taking into account specified occupancy type
    const roomConfig = calculateRoomConfiguration(itineraries);
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
              mealPlan: "CP", // Default meal plan
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
                mealPlan: "CP",
                warning: `No pricing found for room type: ${roomType}`
              });            } else {            // Always use room allocations for calculations              console.log(`[DEBUG] Day ${dayItinerary.dayNumber} - Processing room allocations`);
              console.log(`[DEBUG] Original roomAllocations:`, JSON.stringify(dayItinerary.roomAllocations));
              console.log(`[DEBUG] Hotel pricing available:`, JSON.stringify(hotelPricing));
              
              // If no room allocations are provided, create default ones based on numberofRooms
              const roomAllocations = (dayItinerary.roomAllocations && dayItinerary.roomAllocations.length > 0) 
                ? dayItinerary.roomAllocations 
                : [{
                    roomType: 'Deluxe', // Match exactly what's in the database - "Deluxe" not "Standard"
                    occupancyType: 'Double',
                    quantity: parseInt(dayItinerary.numberofRooms || '1'),
                    mealPlan: 'CP (Breakfast Only)' // Match exactly what's in the database
                  }];
              
              console.log(`[DEBUG] Final roomAllocations being used:`, JSON.stringify(roomAllocations));
              
              // Process all room allocations
              let roomCostForDay = 0;
              let roomBreakdown = [];
              
              for (const room of roomAllocations) {
                // First try to find exact match with meal plan  
                let roomPricing = hotelPricing.find(p => {
                  if (!p) return false;
                  
                  // Use roomType directly from the room allocation without fallbacks
                  const roomTypeMatches = p.roomType.toLowerCase() === room.roomType.toLowerCase();
                  const occupancyTypeMatches = p.occupancyType.toLowerCase() === room.occupancyType.toLowerCase();
                  
                  // Only check meal plans if both exist
                  if (roomTypeMatches && occupancyTypeMatches && p.mealPlan && room.mealPlan) {
                    const pMealPlan = p.mealPlan.toLowerCase();
                    const roomMealPlan = room.mealPlan.toLowerCase();
                    return pMealPlan === roomMealPlan;
                  }
                  
                  // If meal plans don't both exist, just match on room type and occupancy
                  return roomTypeMatches && occupancyTypeMatches;
                });
                
                // If no exact meal plan match, find by room type and occupancy type only
                if (!roomPricing) {
                  roomPricing = hotelPricing.find(p =>
                    p.roomType.toLowerCase() === room.roomType.toLowerCase() &&
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
                    roomType: room.roomType,
                    occupancyType: room.occupancyType,
                    mealPlan: room.mealPlan || 'N/A',
                    quantity: roomQuantity,
                    pricePerRoom: roomPricing.price,
                    totalCost: roomCost,
                    guestNames: room.guestNames || ''
                  });
                } else {
                  // No pricing found for this room configuration
                  roomBreakdown.push({
                    roomType: room.roomType,
                    occupancyType: room.occupancyType,
                    quantity: room.quantity || 1,
                    warning: `No pricing found for ${room.roomType}/${room.occupancyType}`
                  });
                }
              }
              
              // Add the total room cost for the day
              dailyCost = roomCostForDay; // Set dailyCost directly from room allocations
              pricingData.roomCost += roomCostForDay;
              console.log(`Day ${dayItinerary.dayNumber}: Total daily cost from room allocations: ${dailyCost}`);
              
              // Store the room breakdown for this day
              pricingData.roomAllocations = pricingData.roomAllocations || [];
              pricingData.roomAllocations.push({
                dayNumber: dayItinerary.dayNumber,
                date: currentDate.toISOString().split('T')[0],
                hotelName: hotel.name,
                totalCost: roomCostForDay,
                rooms: roomBreakdown
              });
            }            // Add meal costs if not included in room price - check each room allocation's meal plan
            const mealsIncluded = dayItinerary.mealsIncluded || [];
            
            // Calculate total rooms from room allocations for more accurate meal costs
            let totalRoomCount = 0;
            const roomMealPlans = [];
            
            // Process each room allocation's meal plan separately
            if (dayItinerary.roomAllocations && dayItinerary.roomAllocations.length > 0) {
              for (const room of dayItinerary.roomAllocations) {
                const roomQuantity = room.quantity || 1;
                totalRoomCount += roomQuantity;
                
                // Get the meal plan for this specific room
                const roomMealPlan = room.mealPlan || "EP (No Meals)";
                roomMealPlans.push(roomMealPlan);
                
                // Calculate meal costs based on each room's meal plan
                if (!roomMealPlan.includes("AP")) { // Not All Meals
                  const breakfastCost = 350; // per room
                  const lunchCost = 500; // per room
                  const dinnerCost = 550; // per room
                  
                  if (roomMealPlan.includes("No Meal Plan") || roomMealPlan.includes("EP")) {
                    // No meals included - charge for all meals specified in the itinerary
                    if (mealsIncluded.includes("Breakfast")) {
                      mealCost += breakfastCost * roomQuantity;
                    }
                    
                    if (mealsIncluded.includes("Lunch")) {
                      mealCost += lunchCost * roomQuantity;
                    }
                    
                    if (mealsIncluded.includes("Dinner")) {
                      mealCost += dinnerCost * roomQuantity;
                    }
                  } else if (roomMealPlan.includes("CP") || roomMealPlan.includes("Breakfast")) {
                    // Only breakfast included - charge for lunch and dinner
                    if (mealsIncluded.includes("Lunch")) {
                      mealCost += lunchCost * roomQuantity;
                    }
                    
                    if (mealsIncluded.includes("Dinner")) {
                      mealCost += dinnerCost * roomQuantity;
                    }
                  } else if (roomMealPlan.includes("MAP")) {
                    // Breakfast and dinner included - charge only for lunch
                    if (mealsIncluded.includes("Lunch")) {
                      mealCost += lunchCost * roomQuantity;
                    }
                  }
                }
              }
            } else {
              // Fallback to simple calculation if no room allocations
              const mealPlan = dayItinerary.mealPlan || "EP (No Meals)";
              const numberOfRooms = parseInt(dayItinerary.numberofRooms || "1");
              totalRoomCount = numberOfRooms;
              
              // Calculate meal costs based on meal plan
              if (!mealPlan.includes("AP")) { // Not All Meals
                const breakfastCost = 350; // per room
                const lunchCost = 500; // per room
                const dinnerCost = 550; // per room
                
                if (mealPlan.includes("No Meal Plan") || mealPlan.includes("EP")) {
                  // No meals included - charge for all meals specified in the itinerary
                  if (mealsIncluded.includes("Breakfast")) {
                    mealCost += breakfastCost * numberOfRooms;
                  }
                  
                  if (mealsIncluded.includes("Lunch")) {
                    mealCost += lunchCost * numberOfRooms;
                  }
                  
                  if (mealsIncluded.includes("Dinner")) {
                    mealCost += dinnerCost * numberOfRooms;
                  }
                } else if (mealPlan.includes("CP") || mealPlan.includes("Breakfast")) {
                  // Only breakfast included - charge for lunch and dinner
                  if (mealsIncluded.includes("Lunch")) {
                    mealCost += lunchCost * numberOfRooms;
                  }
                  
                  if (mealsIncluded.includes("Dinner")) {
                    mealCost += dinnerCost * numberOfRooms;
                  }
                } else if (mealPlan.includes("MAP")) {
                  // Breakfast and dinner included - charge only for lunch
                  if (mealsIncluded.includes("Lunch")) {
                    mealCost += lunchCost * numberOfRooms;
                  }
                }
              }
            }// Track costs for specific date periods for seasonal price differences
            // Make sure matchingPricing[0] exists before accessing its properties
            if (matchingPricing && matchingPricing[0]) {
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
    }    // Generate simplified pricing section for the form
    pricingData.pricingSection = [
      {
        name: "Package Total",
        price: `₹${Math.round(pricingData.totalPrice).toLocaleString()}`,
        description: "Total package cost"
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