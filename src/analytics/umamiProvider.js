export class UmamiProvider {
  constructor(host, websiteId) {
    this.host = host
    this.websiteId = websiteId
  }

  initialize() {
    if (!this.host || !this.websiteId || typeof document === 'undefined') return

    const scriptId = 'umami-script'
    if (document.getElementById(scriptId)) return

    const script = document.createElement('script')
    script.id = scriptId
    script.defer = true
    script.src = `${this.host.replace(/\/$/, '')}/script.js`
    script.setAttribute('data-website-id', this.websiteId)
    script.addEventListener('error', () => {
      console.warn('[Analytics] Umami script failed to load')
    })

    document.head.appendChild(script)
  }

  track(event, properties) {
    if (!this.host || !this.websiteId || typeof window === 'undefined') return
    if (typeof window.umami?.track !== 'function') return

    window.umami.track(event, properties)
  }
}
