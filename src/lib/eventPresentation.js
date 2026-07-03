import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  Medal,
  Sparkles,
  Tag,
  Trophy,
  Users
} from 'lucide-vue-next'

const CATEGORY_CONFIG = {
  social: {
    label: 'Social',
    icon: Users,
    className: 'category-badge--social'
  },
  party: {
    label: 'Party',
    icon: Users,
    className: 'category-badge--social'
  },
  class: {
    label: 'Class',
    icon: GraduationCap,
    className: 'category-badge--class'
  },
  workshop: {
    label: 'Workshop',
    icon: BookOpen,
    className: 'category-badge--workshop'
  },
  festival: {
    label: 'Festival',
    icon: Sparkles,
    className: 'category-badge--festival'
  },
  bootcamp: {
    label: 'Bootcamp',
    icon: Trophy,
    className: 'category-badge--bootcamp'
  },
  competition: {
    label: 'Competition',
    icon: Medal,
    className: 'category-badge--competition'
  },
  default: {
    icon: Tag,
    className: 'category-badge--default'
  }
}

export function getCategoryKey(category) {
  return (category || '').toLowerCase().trim().replace(/\s+/g, '-')
}

export function getCategoryMeta(category) {
  const key = getCategoryKey(category)
  const config = CATEGORY_CONFIG[key] || CATEGORY_CONFIG.default

  return {
    key,
    label: config.label || category || 'Other',
    icon: config.icon,
    className: config.className
  }
}

export { formatPriceDisplay, getPriceDetails, getPriceNote, isFreePrice } from './pricing.js'

export const EventLinkIcon = ExternalLink
