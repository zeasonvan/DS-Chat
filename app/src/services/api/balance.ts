import { ApiError, API_ORIGIN, request } from './client.js'

export type BalanceInfo = {
  currency: string
  total_balance: string
  granted_balance: string
  topped_up_balance: string
}

export type UserBalance = {
  is_available: boolean
  balance_infos: BalanceInfo[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isBalanceInfo = (value: unknown): value is BalanceInfo =>
  isRecord(value) &&
  typeof value.currency === 'string' &&
  typeof value.total_balance === 'string' &&
  typeof value.granted_balance === 'string' &&
  typeof value.topped_up_balance === 'string'

const isUserBalance = (value: unknown): value is UserBalance =>
  isRecord(value) &&
  typeof value.is_available === 'boolean' &&
  Array.isArray(value.balance_infos) &&
  value.balance_infos.every(isBalanceInfo)

/** GET /user/balance：查询账号余额，不产生费用 */
export const fetchUserBalance = async (
  apiKey: string,
  signal?: AbortSignal
): Promise<UserBalance> => {
  const response = await request(`${API_ORIGIN}/user/balance`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
  })
  const body: unknown = await response.json()
  if (!isUserBalance(body)) {
    throw new ApiError('protocol', 'Invalid balance response')
  }
  return body
}
