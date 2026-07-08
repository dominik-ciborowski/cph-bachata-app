<script setup>
import { PRICE_TYPES } from '../lib/pricing'

const price = defineModel({
  type: Object,
  required: true
})

function addPriceOption() {
  price.value.options = [...(price.value.options || []), { label: '', amount: '' }]
}

function removePriceOption(index) {
  const nextOptions = (price.value.options || []).filter((_, optionIndex) => optionIndex !== index)
  price.value.options = nextOptions.length ? nextOptions : [{ label: '', amount: '' }]
}
</script>

<template>
  <div class="field price-editor">
    <label for="price-type">Price</label>
    <select id="price-type" v-model="price.type">
      <option :value="PRICE_TYPES.FREE">Free</option>
      <option :value="PRICE_TYPES.FIXED">Fixed Price</option>
      <option :value="PRICE_TYPES.MULTIPLE">Multiple Prices</option>
      <option :value="PRICE_TYPES.LINK">See Event Link</option>
    </select>

    <div v-if="price.type === PRICE_TYPES.FIXED" class="field price-editor__nested">
      <label for="price-amount">Amount (DKK)</label>
      <input id="price-amount" v-model="price.amount" type="number" min="0" step="1" placeholder="140" required />
    </div>

    <div v-else-if="price.type === PRICE_TYPES.MULTIPLE" class="price-editor__nested price-options">
      <div class="price-options__header" aria-hidden="true">
        <span>Label</span>
        <span>Price (DKK)</span>
      </div>

      <div v-for="(option, index) in price.options" :key="index" class="price-options__row">
        <input v-model="option.label" :aria-label="`Price label ${index + 1}`" placeholder="Drop-in" required />
        <input v-model="option.amount" :aria-label="`Price amount ${index + 1}`" type="number" min="0" step="1" placeholder="140" required />
        <button class="button secondary button--compact" type="button" :disabled="price.options.length === 1" @click="removePriceOption(index)">Remove</button>
      </div>

      <button class="button secondary button--compact price-options__add" type="button" @click="addPriceOption">Add price</button>
      <p class="field-help">Add one row per ticket option, for example “Drop-in” and “Season”.</p>
    </div>

    <div v-else-if="price.type === PRICE_TYPES.LINK" class="field price-editor__nested">
      <label for="price-note">Optional note</label>
      <input id="price-note" v-model="price.note" placeholder="Ticket options available on the event page." />
      <p class="field-help">Use this when pricing depends on options listed on the event page.</p>
    </div>

    <p v-else class="field-help">This event will be shown as free.</p>
  </div>
</template>
