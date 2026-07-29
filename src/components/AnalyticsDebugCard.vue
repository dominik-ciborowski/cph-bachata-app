<script setup>
import { ref } from 'vue'
import { analytics, analyticsDebug } from '@/analytics'

// TEMPORARY: Remove this component after analytics verification is complete.
const collapsed = ref(false)
</script>

<template>
  <aside class="analytics-debug" aria-label="Analytics debug information">
    <button
      class="analytics-debug__toggle"
      type="button"
      :aria-expanded="!collapsed"
      @click="collapsed = !collapsed"
    >
      <strong>Analytics debug</strong>
      <span aria-hidden="true">{{ collapsed ? '＋' : '−' }}</span>
    </button>

    <div v-if="!collapsed" class="analytics-debug__content">
      <dl>
        <div>
          <dt>Analytics enabled</dt>
          <dd>{{ analyticsDebug.enabled ? 'Yes' : 'No' }}</dd>
        </div>
        <div>
          <dt>Umami script status</dt>
          <dd>{{ analyticsDebug.umamiStatus }}</dd>
        </div>
        <div>
          <dt>Umami host</dt>
          <dd class="analytics-debug__host">{{ analyticsDebug.umamiHost }}</dd>
        </div>
      </dl>

      <h2>Last events</h2>
      <p v-if="analytics.debugEvents.length === 0" class="analytics-debug__empty">No events tracked yet.</p>
      <ol v-else class="analytics-debug__events">
        <li v-for="(entry, index) in analytics.debugEvents" :key="index">
          <strong>{{ entry.event }}</strong>
          <code v-if="entry.properties !== undefined">{{ JSON.stringify(entry.properties) }}</code>
        </li>
      </ol>
    </div>
  </aside>
</template>

<style scoped>
.analytics-debug {
  position: fixed;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 1000;
  width: min(24rem, calc(100vw - 1.5rem));
  max-height: calc(100vh - 1.5rem);
  overflow: auto;
  color: #f8fafc;
  background: #172033;
  border: 1px solid #64748b;
  border-radius: 0.75rem;
  box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 30%);
  font-size: 0.8rem;
}

.analytics-debug__toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 0.85rem;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.analytics-debug__content {
  padding: 0 0.85rem 0.85rem;
}

.analytics-debug dl,
.analytics-debug__events {
  margin: 0;
}

.analytics-debug dl > div {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.analytics-debug dt {
  color: #cbd5e1;
}

.analytics-debug dd {
  margin: 0;
  font-weight: 600;
}

.analytics-debug__host,
.analytics-debug code {
  overflow-wrap: anywhere;
}

.analytics-debug h2 {
  margin: 0.8rem 0 0.35rem;
  font-size: 0.8rem;
}

.analytics-debug__events {
  padding-left: 1.25rem;
}

.analytics-debug__events li + li {
  margin-top: 0.45rem;
}

.analytics-debug code {
  display: block;
  margin-top: 0.15rem;
  color: #dbeafe;
  white-space: pre-wrap;
}

.analytics-debug__empty {
  margin: 0;
  color: #cbd5e1;
}
</style>
