export const LISTING_FEE = 100
export const DAILY_REWARD = 250
export const SIGNUP_BONUS = 2_000
export const HOUSE_CUT_BASIS_POINTS = 1_200

export function getPurchaseDistribution(price: number) {
  if (!Number.isSafeInteger(price) || price <= 0) {
    throw new RangeError('Price must be a positive integer number of Bones')
  }

  const houseCut = Math.floor((price * HOUSE_CUT_BASIS_POINTS) / 10_000)
  return { houseCut, sellerProceeds: price - houseCut }
}
