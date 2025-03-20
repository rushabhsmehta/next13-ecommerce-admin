/**
 * Calculate GST amount based on price, percentage and whether GST is included
 * @param price The price value
 * @param gstPercentage GST percentage (e.g., 5, 12, 18)
 * @returns The GST amount
 */
export const calculateGST = (price: number, gstPercentage: number): number => {
  if (price <= 0 || gstPercentage <= 0) return 0;
 
    return parseFloat(((price * gstPercentage) / 100).toFixed(2));
  
};

/**
 * Calculate total amount including GST
 * @param price The base price 
 * @param gstPercentage GST percentage (e.g., 5, 12, 18)
 * @returns The total amount including GST
 */
export const calculateTotalWithGST = (price: number, gstPercentage: number): number => {
  if (price <= 0) return 0;
  
  
    // If GST is not included, add GST to the price
    const gstAmount = calculateGST(price, gstPercentage);
    return parseFloat((price + gstAmount).toFixed(2));
 
};

/**
 * Calculate base price excluding GST from a total that includes GST
 * @param totalWithGST The total amount including GST
 * @param gstPercentage GST percentage (e.g., 5, 12, 18) 
 * @returns The base price excluding GST
 */
export const calculateBasePrice = (totalWithGST: number, gstPercentage: number): number => {
  if (totalWithGST <= 0 || gstPercentage <= 0) return totalWithGST;
  
  // Formula: Base price = Total ÷ (1 + GST%/100)
  return parseFloat((totalWithGST / (1 + gstPercentage/100)).toFixed(2));
};

