import { useEffect, useState } from 'react'
import { api, type VisionSettings } from '../api'
import './KeySettings.css'

interface Props {
  open: boolean
  onClose: () => void
  onChanged?: () => void
}

export function KeySettings({ open, onClose, onChanged }: Props) {
  const [status, setStatus] = useState<VisionSettings | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setOkMsg(null)
    setKeyInput('')
    void api
      .getVisionSettings()
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [open])

  if (!open) return null

  async function save() {
    if (!keyInput.trim()) {
      setError('Paste a Gemini API key first')
      return
    }
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      const next = await api.setVisionKey(keyInput.trim())
      setStatus(next)
      setKeyInput('')
      setOkMsg('Saved. Photo estimates will use this key.')
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeAppKey() {
    if (!confirm('Remove the key stored in this app? Env / DigitalOcean keys (if any) stay.')) {
      return
    }
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      const next = await api.clearVisionKey()
      setStatus(next)
      setOkMsg('App key removed.')
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fuel-sheet key-settings" role="dialog" aria-modal aria-label="API key settings">
      <div className="fuel-sheet__backdrop" onClick={onClose} />
      <div className="fuel-sheet__panel key-settings__panel">
        <header className="fuel-sheet__head">
          <div>
            <h2>Vision API key</h2>
            <p>Update Gemini without reopening DigitalOcean</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="fuel-sheet__body">
          <div className={`key-status ${status?.configured ? 'is-on' : 'is-off'}`}>
            <strong>{status?.configured ? 'Photo AI ready' : 'Photo AI offline'}</strong>
            <span>
              {status?.provider ?? 'none'}
              {status?.model ? ` · ${status.model}` : ''}
              {status?.source ? ` · key from ${status.source}` : ''}
              {status?.key_hint ? ` · ${status.key_hint}` : ''}
            </span>
          </div>

          <label className="field">
            <span>Gemini API key</span>
            <div className="key-input-row">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste new AI Studio key…"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" className="btn btn--ghost" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <p className="hint">
            Get a key at{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              aistudio.google.com/apikey
            </a>
            . Stored in this app’s database (not shown again in full). In-app key overrides
            DigitalOcean env until you remove it.
          </p>

          <div className="key-actions">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save key'}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              disabled={busy || !status?.has_app_key}
              onClick={() => void removeAppKey()}
            >
              Remove app key
            </button>
          </div>

          {okMsg && <p className="key-ok">{okMsg}</p>}
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
