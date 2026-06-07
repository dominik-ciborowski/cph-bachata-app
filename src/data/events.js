const today = new Date()

function dateWithOffset(dayOffset, time) {
  const date = new Date(today)
  date.setDate(today.getDate() + dayOffset)

  const [hours, minutes] = time.split(':').map(Number)
  date.setHours(hours, minutes, 0, 0)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

export const events = [
  {
    id: 1,
    title: 'Bachata @ BLOX',
    organizer: 'DanceManiacs',
    location: 'BLOX Copenhagen',
    category: 'Social',
    price_text: 'Free',
    facebook_url: 'https://facebook.com/events/example-blox',
    description: 'Outdoor bachata social by the water.',
    start_time: dateWithOffset(0, '18:30'),
    end_time: dateWithOffset(0, '22:00')
  },
  {
    id: 2,
    title: 'Friday Bachata Practica',
    organizer: 'Copenhagen Bachata Academy',
    location: 'Norrebrohallen',
    category: 'Class',
    price_text: '80 DKK',
    facebook_url: 'https://facebook.com/events/example-practica',
    description: 'Beginner-friendly class followed by open practice.',
    start_time: dateWithOffset(1, '19:00'),
    end_time: dateWithOffset(1, '21:30')
  },
  {
    id: 3,
    title: 'Saturday Bachata Night',
    organizer: 'Salsa Libre Copenhagen',
    location: 'Kedelhallen',
    category: 'Party',
    price_text: '120 DKK',
    facebook_url: 'https://facebook.com/events/example-night',
    description: 'Bachata party with DJ, intro class and social dancing.',
    start_time: dateWithOffset(5, '20:00'),
    end_time: dateWithOffset(6, '01:00')
  },
  {
    id: 4,
    title: 'Sensual Bachata Workshop',
    organizer: 'Bachata House CPH',
    location: 'Valby Kulturhus',
    category: 'Workshop',
    price_text: '150 DKK',
    facebook_url: 'https://facebook.com/events/example-workshop',
    description: 'Two-hour workshop focused on partnerwork and musicality.',
    start_time: dateWithOffset(6, '14:00'),
    end_time: dateWithOffset(6, '16:00')
  },
  {
    id: 5,
    title: 'After Work Bachata',
    organizer: 'Latin Collective',
    location: 'DGI Byen',
    category: 'Social',
    price_text: 'Free',
    facebook_url: 'https://facebook.com/events/example-after-work',
    description: 'Casual social for dancers of all levels.',
    start_time: dateWithOffset(10, '17:30'),
    end_time: dateWithOffset(10, '20:30')
  }
]
