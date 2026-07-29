const EBIRD_API_KEY = process.env.NEXT_PUBLIC_EBIRD_API_KEY

export interface EbirdObservation {
  speciesCode: string
  comName: string
  sciName: string
  locId: string
  locName: string
  obsDt: string
  howMany?: number | null
  lat: number
  lng: number
  subId: string
}

/**
 * Fetch all observations from a specific eBird checklist
 */
export async function fetchChecklistData(checklistId: string): Promise<EbirdObservation[]> {
  if (!EBIRD_API_KEY) {
    throw new Error('eBird API key not configured')
  }

  const cleanId = extractChecklistId(checklistId)

  // Step 1: Get checklist details (has species codes and counts but not names)
  const checklistUrl = `https://api.ebird.org/v2/product/checklist/view/${cleanId}`
  const checklistRes = await fetch(checklistUrl, {
    headers: { 'X-eBirdApiToken': EBIRD_API_KEY },
  })

  if (!checklistRes.ok) {
    if (checklistRes.status === 404) throw new Error(`Checklist ${cleanId} not found`)
    throw new Error(`eBird API error: ${checklistRes.status}`)
  }

  const checklistData = await checklistRes.json()
  const obs = checklistData.obs || []

  if (obs.length === 0) return []

  // Step 2: Fetch taxonomy for all species codes to get common names
  const speciesCodes = obs.map((o: any) => o.speciesCode).join(',')
  const taxonomyUrl = `https://api.ebird.org/v2/ref/taxonomy/ebird?species=${speciesCodes}&fmt=json`

  const taxonomyRes = await fetch(taxonomyUrl, {
    headers: { 'X-eBirdApiToken': EBIRD_API_KEY },
  })

  const taxonomy = taxonomyRes.ok ? await taxonomyRes.json() : []

  // Create lookup map: speciesCode -> {comName, sciName}
  const taxonomyMap = new Map<string, { comName: string, sciName: string }>()
  for (const tax of taxonomy) {
    taxonomyMap.set(tax.speciesCode, {
      comName: tax.comName || 'Unknown',
      sciName: tax.sciName || '',
    })
  }

  // Step 3: Combine checklist obs with taxonomy data
  const observations: EbirdObservation[] = obs.map((o: any) => {
    const taxInfo = taxonomyMap.get(o.speciesCode) || { comName: o.speciesCode, sciName: '' }
    const howManyStr = o.howManyStr || o.howManyAtleast || ''

    return {
      speciesCode: o.speciesCode,
      comName: taxInfo.comName,
      sciName: taxInfo.sciName,
      locId: checklistData.locId || '',
      locName: checklistData.loc?.name || 'Unknown location',
      obsDt: checklistData.obsDt || '',
      howMany: howManyStr === 'X' || !howManyStr ? null : parseInt(howManyStr) || null,
      lat: checklistData.loc?.latitude || 0,
      lng: checklistData.loc?.longitude || 0,
      subId: cleanId,
    }
  })

  return observations
}

/**
 * Extract checklist ID from URL or return as-is
 */
export function extractChecklistId(input: string): string {
  const trimmed = input.trim()

  if (/^S\d+$/i.test(trimmed)) return trimmed.toUpperCase()

  const checklistMatch = trimmed.match(/\/checklist\/(S\d+)/i)
  if (checklistMatch) return checklistMatch[1].toUpperCase()

  const idMatch = trimmed.match(/(S\d+)/i)
  if (idMatch) return idMatch[1].toUpperCase()

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
 * Get unique species from a list of observations
 */
export function getUniqueSpecies(observations: EbirdObservation[]): EbirdObservation[] {
  const uniqueMap = new Map<string, EbirdObservation>()

  for (const obs of observations) {
    const existing = uniqueMap.get(obs.speciesCode)
    if (!existing) {
      uniqueMap.set(obs.speciesCode, obs)
    } else {
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