// Function to copy room allocation and transport details from first day to all days
export const copyRoomDetailsToAllDays = (itineraries: any[]) => {
  if (itineraries.length <= 1) return itineraries; // Nothing to copy if there's only one day
  
  const firstDay = itineraries[0];
  
  // Extract only the room allocations and transport details arrays from the first day
  const roomAllocations = firstDay.roomAllocations || [];
  const transportDetails = firstDay.transportDetails || [];
  
  // Create new itineraries array with updated values
  return itineraries.map((itinerary, idx) => {
    // Skip the first day (index 0) as it's the source
    if (idx === 0) return itinerary;
    
    return {
      ...itinerary,
      // Deep copy the arrays to ensure we don't share references
      roomAllocations: JSON.parse(JSON.stringify(roomAllocations)),
      transportDetails: JSON.parse(JSON.stringify(transportDetails))
    };
  });
};
