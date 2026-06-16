import { expect, test } from '@playwright/test'

const events = [
  {
    id: 'free-social',
    title: 'Free Bachata Social',
    created_by: 'organizer-1',
    organizer: 'Dancemaniacs',
    organizer_id: 'org-1',
    organizer_record: { id: 'org-1', name: 'Dancemaniacs', verified: true },
    event_link: null,
    start_time: '2030-06-21T19:00:00.000Z',
    end_time: '2030-06-21T22:00:00.000Z',
    category: 'social',
    location: 'Copenhagen',
    description: 'Community dance night',
    price_text: 'Free',
    approved: true
  },
  {
    id: 'paid-class',
    title: 'Paid Bachata Class',
    created_by: 'organizer-2',
    organizer: 'Studio Copenhagen',
    organizer_id: 'org-2',
    organizer_record: { id: 'org-2', name: 'Studio Copenhagen', verified: false },
    event_link: null,
    start_time: '2030-06-22T18:00:00.000Z',
    end_time: '2030-06-22T19:30:00.000Z',
    category: 'class',
    location: 'Nørrebro',
    description: 'Beginner friendly class',
    price_text: '100 DKK',
    approved: true
  }
]

test.beforeEach(async ({ page }) => {
  await page.route('https://example.supabase.co/auth/v1/user', route => {
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'not authenticated' }) })
  })

  await page.route(/https:\/\/example\.supabase\.co\/rest\/v1\/events.*/, route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(events) })
  })
})

test('app loads and public event list is visible', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Find your next dance night.' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Free Bachata Social/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Paid Bachata Class/ })).toBeVisible()
})

test('Free filter shows free events and hides paid events', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Free' }).click()

  await expect(page.getByRole('link', { name: /Free Bachata Social/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Paid Bachata Class/ })).toHaveCount(0)
})

test('normal public user does not see admin or management actions', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Management/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Add Event' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Edit/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0)
})

test('login page renders without automating OAuth', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
})

test('basic navigation between event list and login works', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Copenhagen Bachata Calendar home').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Find your next dance night.' })).toBeVisible()
})
