/**
 * Formats a price given in USD cents to a display string in US Dollars.
 * @param cents - Price in USD cents (e.g., 1999 = $19.99)
 * @returns Formatted string like "$19.99"
 */
export const formatPrice = (cents: number): string => {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
};
