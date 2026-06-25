export const PRICE_TYPES = {
  FREE: 'free',
  FIXED: 'fixed',
  MULTIPLE: 'multiple',
  LINK: 'link'
}

export function createDefaultPrice() {
  return { type: PRICE_TYPES.FREE, amount: '', options: [{ label: '', amount: '' }], note: '' }
}

export function isFreeLegacyPrice(priceText) {
  const value = String(priceText || '').trim().toLowerCase()
  if (!value) return true

  return /^(free|gratis)$/.test(value) || /^0+([.,]0+)?(\s*(dkk|kr|kr\.))?$/.test(value)
}

function parseJsonPrice(priceText) {
  if (typeof priceText !== 'string') return null
  const raw = priceText.trim()
  if (!raw.startsWith('{')) return null

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function normalizeAmount(value) {
  return String(value ?? '').trim().replace(',', '.')
}

function displayAmount(value) {
  const normalized = normalizeAmount(value)
  if (!normalized) return ''
  return normalized.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

function toNumber(value) {
  const number = Number(normalizeAmount(value))
  return Number.isFinite(number) ? number : null
}

export function normalizePrice(priceText) {
  const structured = parseJsonPrice(priceText)

  if (structured?.type === PRICE_TYPES.FREE) {
    return { ...createDefaultPrice(), type: PRICE_TYPES.FREE }
  }

  if (structured?.type === PRICE_TYPES.FIXED) {
    return { ...createDefaultPrice(), type: PRICE_TYPES.FIXED, amount: displayAmount(structured.amount) }
  }

  if (structured?.type === PRICE_TYPES.MULTIPLE) {
    const options = Array.isArray(structured.options)
      ? structured.options.map((option) => ({
        label: String(option?.label ?? '').trim(),
        amount: displayAmount(option?.amount)
      })).filter((option) => option.label || option.amount)
      : []

    return {
      ...createDefaultPrice(),
      type: PRICE_TYPES.MULTIPLE,
      options: options.length ? options : [{ label: '', amount: '' }]
    }
  }

  if (structured?.type === PRICE_TYPES.LINK) {
    return { ...createDefaultPrice(), type: PRICE_TYPES.LINK, note: String(structured.note ?? '').trim() }
  }

  const rawValue = String(priceText || '').trim()
  if (!rawValue || isFreeLegacyPrice(rawValue)) {
    return { ...createDefaultPrice(), type: PRICE_TYPES.FREE }
  }

  if (/^\d+([.,]\d+)?(\s*(dkk|kr|kr\.))?$/i.test(rawValue)) {
    return { ...createDefaultPrice(), type: PRICE_TYPES.FIXED, amount: displayAmount(rawValue.replace(/\s*(dkk|kr|kr\.)$/i, '')) }
  }

  return { ...createDefaultPrice(), type: PRICE_TYPES.LINK, note: rawValue }
}

export function serializePrice(price) {
  const normalized = price || createDefaultPrice()

  if (normalized.type === PRICE_TYPES.FIXED) {
    return JSON.stringify({ type: PRICE_TYPES.FIXED, amount: displayAmount(normalized.amount) })
  }

  if (normalized.type === PRICE_TYPES.MULTIPLE) {
    const options = (normalized.options || [])
      .map((option) => ({ label: String(option.label || '').trim(), amount: displayAmount(option.amount) }))
      .filter((option) => option.label || option.amount)

    return JSON.stringify({ type: PRICE_TYPES.MULTIPLE, options: options.length ? options : [{ label: '', amount: '' }] })
  }

  if (normalized.type === PRICE_TYPES.LINK) {
    const note = String(normalized.note || '').trim()
    return JSON.stringify({ type: PRICE_TYPES.LINK, ...(note ? { note } : {}) })
  }

  return JSON.stringify({ type: PRICE_TYPES.FREE })
}

export function isFreePrice(priceText) {
  return normalizePrice(priceText).type === PRICE_TYPES.FREE
}

export function formatPriceDisplay(priceText) {
  const price = normalizePrice(priceText)

  if (price.type === PRICE_TYPES.FREE) return 'FREE'
  if (price.type === PRICE_TYPES.LINK) return 'SEE LINK'
  if (price.type === PRICE_TYPES.FIXED) return `${displayAmount(price.amount)} DKK`

  const amounts = price.options.map((option) => toNumber(option.amount)).filter((amount) => amount !== null)
  if (!amounts.length) return 'SEE LINK'

  const min = Math.min(...amounts)
  const max = Math.max(...amounts)

  if (min === max) return `${displayAmount(min)} DKK`
  return `${displayAmount(min)}–${displayAmount(max)} DKK`
}

export function getPriceDetails(priceText) {
  const price = normalizePrice(priceText)

  if (price.type === PRICE_TYPES.MULTIPLE) {
    return price.options.filter((option) => option.label && option.amount)
  }

  return []
}

export function getPriceNote(priceText) {
  const price = normalizePrice(priceText)
  return price.type === PRICE_TYPES.LINK ? price.note : ''
}
