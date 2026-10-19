/**
 * Client half of the Web Chat panel bundle.
 *
 * Adds a "Web Chat" entry to the left sidebar. Selecting it fills the central
 * panel with an Electron `<webview>` guest that loads
 * https://chat.deepseek.com/. The guest lease and its storage partition come
 * from the desktop preload bridge the shipped Sidebar Browser uses, so the
 * DeepSeek page keeps its own login inside the harness window.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-deepseek-web-panel',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Copy namespace owned by this plugin. */
    const NS = 'deepseekWebPanel'
    /** Main-panel key; the sidebar panel entry addresses the same id. */
    const PANEL_ID = 'deepseek-web'
    /** DeepSeek's consumer web chat. */
    const CHAT_URL = 'https://chat.deepseek.com/'
    /** Stable storage account: cookies survive panel switches during one app run. */
    const STORAGE_ACCOUNT = 'deepseek-web:panel'

    /** Simplified Chinese dictionary (key-set source of truth). */
    const zh = {
      panel: '网页对话',
      loading: '正在打开 DeepSeek 网页版…',
      failed: '网页加载失败',
      retry: '重新加载',
      openExternal: '在浏览器打开',
      unavailable: '当前客户端无法内嵌网页，请在 DSH 桌面版中使用这个页面。',
    }
    /** English dictionary, complete against the zh key set. */
    const en = {
      panel: 'Web Chat',
      loading: 'Opening DeepSeek Web…',
      failed: 'The page failed to load',
      retry: 'Reload',
      openExternal: 'Open in browser',
      unavailable: 'This client cannot embed web pages. Use this page in DSH Desktop.',
    }

    /** Inline button shared by the toolbar and the state card. */
    const buttonStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 28,
      padding: '0 10px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 8,
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary)',
      cursor: 'pointer',
      font: 'inherit',
      flex: 'none',
    }

    /** Left-sidebar glyph: a chat bubble with three dots. */
    function WebChatIcon({ size = 16 }) {
      return h('svg', {
        viewBox: '0 0 20 20',
        width: size,
        height: size,
        'aria-hidden': true,
        focusable: false,
        style: { display: 'block', flex: 'none' },
      },
      h('path', {
        d: 'M4.3 4.2h11.4c1 0 1.8.8 1.8 1.8v6.2c0 1-.8 1.8-1.8 1.8H9.2l-3.4 2.6v-2.6H4.3c-1 0-1.8-.8-1.8-1.8V6c0-1 .8-1.8 1.8-1.8Z',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinejoin: 'round',
      }),
      h('circle', { cx: 6.6, cy: 9, r: 1, fill: 'currentColor' }),
      h('circle', { cx: 10, cy: 9, r: 1, fill: 'currentColor' }),
      h('circle', { cx: 13.4, cy: 9, r: 1, fill: 'currentColor' }),
      )
    }

    /** Refresh glyph: a circular arrow. */
    function ReloadIcon() {
      return h('svg', {
        viewBox: '0 0 20 20',
        width: 15,
        height: 15,
        fill: 'none',
        'aria-hidden': true,
        focusable: false,
        style: { display: 'block', flex: 'none' },
      },
      h('path', {
        d: 'M15.5 9.2a5.7 5.7 0 1 1-1.6-4',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
      }),
      h('path', {
        d: 'M15.8 2.9v3.6h-3.6',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
      )
    }

    /** Centered state card drawn over the empty panel while no page is shown. */
    const overlayStyle = {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 24,
      boxSizing: 'border-box',
      color: 'var(--dsw-alias-label-secondary)',
      background: 'var(--dsw-alias-bg-base)',
      fontSize: 13,
      lineHeight: '20px',
      textAlign: 'center',
    }

    /**
     * Embed the DeepSeek web chat in the central panel.
     * @param props - slot props carrying the locale-injected translate seat.
     */
    function WebChatPanel({ t }) {
      const hostRef = React.useRef(null)
      const [status, setStatus] = React.useState('loading')
      const [attempt, setAttempt] = React.useState(0)

      React.useEffect(() => {
        const bridge = globalThis.dshDesktop?.browser
        const host = hostRef.current
        if (bridge === undefined || host === null) {
          setStatus('unavailable')
          return
        }
        let cancelled = false
        let element
        let lease
        /** The guest's document is ready; the DeepSeek navigation starts exactly once. */
        let started = false
        /** Fail visibly when the guest never becomes ready (for example a rejected lease). */
        const startTimer = window.setTimeout(() => {
          if (!cancelled && !started) setStatus('failed')
        }, 15000)
        setStatus('loading')

        bridge.acquire(STORAGE_ACCOUNT).then((reservation) => {
          if (cancelled) {
            bridge.release(reservation.lease).catch(() => {})
            return
          }
          lease = reservation.lease
          const webview = document.createElement('webview')
          webview.setAttribute('name', reservation.lease)
          webview.setAttribute('partition', reservation.partition)
          webview.setAttribute('allowpopups', '')
          webview.setAttribute('src', 'about:blank#' + reservation.lease)
          webview.dataset.deepseekWebFrame = 'webview'
          webview.style.cssText = '-webkit-app-region:no-drag;border:0;display:flex;flex:auto;width:100%;min-width:0;height:100%;min-height:0;background:var(--dsw-alias-bg-base)'

          const looksLoaded = () => {
            try {
              const url = webview.getURL()
              return typeof url === 'string' && url.startsWith('http')
            } catch {
              return false
            }
          }

          webview.addEventListener('dom-ready', () => {
            if (cancelled || started) return
            started = true
            window.clearTimeout(startTimer)
            // Defer one task so the desktop host records the guest lease in its
            // own dom-ready handler before this navigation starts.
            window.setTimeout(() => {
              if (cancelled) return
              webview.loadURL(CHAT_URL).catch((error) => {
                if (cancelled) return
                if (error !== null && typeof error === 'object' && error.code === 'ERR_ABORTED') return
                console.error('[deepseek-web-panel] page load failed', error)
                setStatus('failed')
              })
            }, 0)
          })
          webview.addEventListener('did-finish-load', () => {
            if (cancelled || !started || !looksLoaded()) return
            setStatus('ready')
          })
          webview.addEventListener('did-fail-load', (event) => {
            if (cancelled || !started || event.isMainFrame === false || event.errorCode === -3) return
            setStatus('failed')
          })
          for (const name of ['render-process-gone', 'destroyed']) {
            webview.addEventListener(name, () => {
              if (cancelled) return
              setStatus('failed')
            })
          }
          host.replaceChildren(webview)
          element = webview
        }).catch((error) => {
          if (cancelled) return
          console.error('[deepseek-web-panel] guest acquire failed', error)
          setStatus('failed')
        })

        return () => {
          cancelled = true
          window.clearTimeout(startTimer)
          const owned = element
          element = undefined
          if (owned !== undefined) owned.remove()
          host.replaceChildren()
          const id = lease
          lease = undefined
          if (id !== undefined) bridge.release(id).catch(() => {})
        }
      }, [attempt])

      const openExternal = () => {
        window.open(CHAT_URL, '_blank', 'noopener,noreferrer')
      }

      return h('div', {
        style: {
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          background: 'var(--dsw-alias-bg-base)',
        },
      },
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 'none',
          height: 34,
          padding: '0 8px',
          borderBottom: '1px solid var(--dsw-alias-border-l1)',
          color: 'var(--dsw-alias-label-secondary)',
          fontSize: 13,
          boxSizing: 'border-box',
        },
      },
      h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 } },
        h(WebChatIcon, { size: 15 }),
        h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('panel')),
      ),
      h('span', { style: { flex: '1' } }),
      h('button', {
        type: 'button',
        title: t('retry'),
        'aria-label': t('retry'),
        onClick: () => setAttempt((value) => value + 1),
        style: { ...buttonStyle, width: 28, height: 28, padding: 0, border: 'none', borderRadius: 8 },
      }, h(ReloadIcon)),
      ),
      h('div', {
        style: { position: 'relative', flex: '1', display: 'flex', minWidth: 0, minHeight: 0 },
      },
      h('div', {
        ref: hostRef,
        style: { flex: '1', display: 'flex', minWidth: 0, minHeight: 0 },
      }),
      status === 'loading' && h('div', { style: overlayStyle, role: 'status' }, t('loading')),
      status === 'failed' && h('div', { style: overlayStyle, role: 'alert' },
        h('span', null, t('failed')),
        h('button', { type: 'button', onClick: () => setAttempt((value) => value + 1), style: buttonStyle }, t('retry')),
      ),
      status === 'unavailable' && h('div', { style: overlayStyle, role: 'alert' },
        h('span', null, t('unavailable')),
        h('button', { type: 'button', onClick: openExternal, style: buttonStyle }, t('openExternal')),
      ),
      ),
      )
    }

    /**
     * Register the main panel and its left-sidebar entry.
     * @param ctx - client plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'deepseek-web-panel: dictionaries')
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      }, WebChatPanel))
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 22,
        locale: NS,
        label: () => t('panel'),
      }, WebChatIcon))
    }

    return {
      inject: ['slots', 'locale'],
      apply,
    }
  },
})
