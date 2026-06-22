import { expect, test } from '@playwright/test'

const upcomingEvent = {
  id: 'event-1',
  title: 'Regression Bachata Social',
  category: 'social',
  location: 'Copenhagen Studio',
  organizer: 'Dancemaniacs',
  organizer_record: { id: 'org-1', name: 'Dancemaniacs', verified: true },
  description: 'First paragraph with details.\n\nSecond paragraph stays readable on the detail page.',
  price_text: '0',
  event_link: 'https://example.com/event',
  start_time: '2099-06-20T18:00:00.000Z',
  end_time: '2099-06-20T21:00:00.000Z',
  status: 'approved'
}

async function mockPublicSupabase(page) {
  await page.route('**/auth/v1/user**', route => route.fulfill({ status: 401, json: { message: 'No session' } }))
  await page.route('**/rest/v1/events**', route => {
    const url = route.request().url()
    const body = url.includes('id=eq.event-1') ? upcomingEvent : [upcomingEvent]
    route.fulfill({ status: 200, json: body, headers: { 'content-range': '0-0/1' } })
  })
}

test.beforeEach(async ({ page }) => {
  await mockPublicSupabase(page)
})

test('home page loads and event cards keep descriptions off the list', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Find your next dance night.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: upcomingEvent.title })).toBeVisible()
  await expect(page.getByText('First paragraph with details.')).toHaveCount(0)
})

test('public direct routes load', async ({ page }) => {
  for (const path of ['/help', '/privacy']) {
    await page.goto(path)
    await expect(page.locator('main')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
  }
})

test('anonymous mobile navigation shows login/register and help/about', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation menu' }).click()

  await expect(page.getByRole('link', { name: 'Login / Register' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Help & About' })).toBeVisible()
})

test('event detail page preserves description line breaks', async ({ page }) => {
  await page.goto('/events/event-1')

  const description = page.locator('.detail-description')
  await expect(description).toContainText('First paragraph with details.\n\nSecond paragraph stays readable')
  await expect(description).toHaveCSS('white-space', 'pre-line')
})

test.describe.skip('authenticated navigation', () => {
  test('shows authenticated navigation links', async ({ page }) => {
    // Skipped until the app has a small local auth test seam; this suite intentionally avoids real Google OAuth and production Supabase data.
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'My Events' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Submit Event' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Account' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Help & About' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  })
})
