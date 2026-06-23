<script setup>
import { ref } from 'vue'

const feedbackEmail = 'bachata.calendar@gmail.com'
const feedbackTypes = [
  'Report a problem',
  'Event information needs updating',
  'Suggest an improvement',
  'General feedback'
]

const feedbackType = ref(feedbackTypes[0])
const feedbackMessage = ref('')
const feedbackError = ref('')

function sendFeedback() {
  feedbackError.value = ''

  const message = feedbackMessage.value.trim()
  if (!message) {
    feedbackError.value = 'Please add a message before sending feedback.'
    return
  }

  const bodyLines = [
    `Feedback type: ${feedbackType.value}`,
    '',
    'Message:',
    message,
    '',
    `Submitted: ${new Date().toISOString()}`
  ]

  const subject = `Copenhagen Bachata Calendar Feedback - ${feedbackType.value}`
  const mailtoUrl = `mailto:${feedbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`

  window.location.href = mailtoUrl
}
</script>

<template>
  <div class="help-page">
    <section class="hero">
      <h1>Help &amp; About</h1>
      <p>Learn how Copenhagen Bachata Calendar works, who created it, and how you can help keep it useful for the community.</p>
    </section>

    <section class="card help-section">
      <h2>What is Copenhagen Bachata Calendar?</h2>
      <p>Community-driven calendar for discovering bachata events in and around Copenhagen.</p>
      <p>The goal is to make it easier for dancers to discover socials, workshops, festivals, and parties while keeping event information in one place.</p>
      <ul class="help-list">
        <li>Browse events</li>
        <li>Save events to My Events</li>
        <li>Export events to their personal calendar</li>
        <li>Submit missing events to help keep the calendar up to date</li>
      </ul>
    </section>

    <section class="card help-section">
      <h2>Created By</h2>
      <p>Copenhagen Bachata Calendar is created and maintained by Dancemaniacs Kasia &amp; Dominik.</p>
      <p>International bachata teachers, performers, DJs, and community organizers based in Copenhagen. They have taught, performed, judged competitions, and contributed to dance events across Denmark and internationally.</p>
      <p>They are also the creators of Bachata Freedom, a concept focused on musicality, creativity, connection, and freedom of expression in partner dancing.</p>
      <div class="help-social-links" aria-label="Dancemaniacs social links">
        <a href="https://www.instagram.com/dancemaniacs_kasiadominik" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="https://www.facebook.com/dancemaniacskd" target="_blank" rel="noopener noreferrer">Facebook</a>
      </div>
    </section>

    <section class="card help-section">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-list">
        <details>
          <summary>How do I save events?</summary>
          <p>Create a free account, then use the heart button on an event to save it to My Events.</p>
        </details>
        <details>
          <summary>How do I export events to my calendar?</summary>
          <p>Open an event and use Add to Calendar, or save events to My Events and export all saved events from there.</p>
        </details>
        <details>
          <summary>How do I submit a missing event?</summary>
          <p>Log in and use Submit Event. Our team will review the information and add it to the calendar if everything looks correct.</p>
        </details>
        <details>
          <summary>Why is my submitted event not visible yet?</summary>
          <p>Submitted events are reviewed before they appear publicly so the calendar stays accurate and useful.</p>
        </details>
      </div>
    </section>

    <section class="card help-section">
      <h2>Get Involved</h2>
      <p>Found a problem, missing information, or have an idea for improvement?</p>
      <p>Help us make Copenhagen Bachata Calendar better.</p>

      <form class="feedback-form" @submit.prevent="sendFeedback">
        <div class="field">
          <label for="feedback-type">Feedback type</label>
          <select id="feedback-type" v-model="feedbackType">
            <option v-for="type in feedbackTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>

        <div class="field">
          <label for="feedback-message">Message *</label>
          <textarea id="feedback-message" v-model="feedbackMessage" required placeholder="Tell us what you noticed or what could be improved." />
        </div>
        <p v-if="feedbackError" class="status">{{ feedbackError }}</p>

        <div class="form-actions">
          <button class="button" type="submit">Continue in Email</button>
        </div>
      </form>

      <p>You can also email us directly at <a :href="`mailto:${feedbackEmail}`">{{ feedbackEmail }}</a>.</p>
      <p class="field-help">Future versions of the platform may include Submit Feedback, Suggest Feature, and Report Issue tools.</p>
    </section>

    <section class="card help-section">
      <h2>Additional Information</h2>
      <div class="help-social-links" aria-label="Additional information links">
        <RouterLink to="/privacy">Privacy</RouterLink>
        <RouterLink to="/terms">Terms of Use</RouterLink>
      </div>
    </section>
  </div>
</template>
