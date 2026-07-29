const EBIRD_API_KEY = process.env.NEXT_PUBLIC_EBIRD_API_KEY

interface EbirdObservation {
  speciesCode: string
  comName: string      // Common name
  sciName: string      // Scientific name
  locId: string
  locName: string
  obsDt: string        // Observation date
  howMany?: number
  lat: number
  lng: number
  obsValid: boolean
  obsReviewed: boolean
  subId: string        // Checklist ID
}

/**
 * Fetch all observations from a specific eBird checklist
 */
export async function fetchChecklistData(checklistId: string): Promise<EbirdObservation[]> {
  if (!EBIRD_API_KEY) {
    throw new Error('eBird API key not configured')
  }

  // Clean the ID (in case user pastes full URL)
  const cleanId = extractChecklistId(checklistId)

  const url = `https://api.ebird.org/v2/product/checklist/view/${cleanId}`

  const response = await fetch(url, {
    headers: {
      'X-eBirdApiToken': EBIRD_API_KEY,
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Checklist ${cleanId} not found`)
    }
    throw new Error(`eBird API error: ${response.status}`)
  }

  const data = await response.json()

  // eBird returns { obs: [...], loc, ... }
  // Transform to our format
  const observations = (data.obs || []).map((o: any) => ({
    speciesCode: o.speciesCode,
    comName: o.comName || 'Unknown',
    sciName: o.sciName || '',
    locId: data.locId,
    locName: data.loc?.name || 'Unknown location',
    obsDt: data.obsDt,
    howMany: o.howManyStr === 'X' ? null : parseInt(o.howManyStr) || null,
    lat: data.loc?.latitude || 0,
    lng: data.loc?.longitude || 0,
    obsValid: true,
    obsReviewed: false,
    subId: cleanId,
  }))

  return observations
}

/**
 * Extract checklist ID from a URL or return as-is if already an ID
 * Examples:
 *   S123456789 → S123456789
 *   https://ebird.org/checklist/S123456789 → S123456789
 *   https://ebird.org/tripreport/12345 → 12345 (trip report - won't work with this endpoint)
 */
export function extractChecklistId(input: string): string {
  const trimmed = input.trim()

  // Already just an ID (starts with S followed by numbers)
  if (/^S\d+$/i.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  // Extract from URL - look for /checklist/S123456
  const checklistMatch = trimmed.match(/\/checklist\/(S\d+)/i)
  if (checklistMatch) {
    return checklistMatch[1].toUpperCase()
  }

  // Extract just the S-number if present anywhere
  const idMatch = trimmed.match(/(S\d+)/i)
  if (idMatch) {
    return idMatch[1].toUpperCase()
  }

  return trimmed
}

/**
 * Fetch multiple checklists and combine
 */
export async function fetchMultipleChecklists(checklistIds: string[]): Promise<{
  observations: EbirdObservation[]
  errors: string[]
}> {
  const observations: EbirdObservation[] = []
  const errors: string[] = []

  for (const id of checklistIds) {
    try {
      const obs = await fetchChecklistData(id)
      observations.push(...obs)
    } catch (err: any) {
      errors.push(`${id}: ${err.message}`)
    }
  }

  return { observations, errors }
}

/**
 * Get unique species from a list of observations (deduplicated by species code)
 * If a species appears in multiple checklists, keep the highest count
 */
export function getUniqueSpecies(observations: EbirdObservation[]): EbirdObservation[] {
  const uniqueMap = new Map<string, EbirdObservation>()

  for (const obs of observations) {
    const existing = uniqueMap.get(obs.speciesCode)
    if (!existing) {
      uniqueMap.set(obs.speciesCode, obs)
    } else {
      // Keep the one with higher count
      const existingCount = existing.howMany || 0
      const newCount = obs.howMany || 0
      if (newCount > existingCount) {
        uniqueMap.set(obs.speciesCode, obs)
      }
    }
  }

  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.comName.localeCompare(b.comName)
  )
}