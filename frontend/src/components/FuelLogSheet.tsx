import { useEffect, useMemo, useState } from 'react'
import { api, type EstimateResult, type FoodPackEntry, type MealItem } from '../api'
import './FuelLogSheet.css'

interface Props {
  goalId: number
  accent: string
  targetKcal: number
  onClose: () => void
  onConfirmed: () => void
}

type DraftItem = MealItem & { key: string }

function toDraft(items: MealItem[]): DraftItem[] {
  return items.map((it) => ({
    ...it,
    key: crypto.randomUUID(),
    name: it.name,
    portion_desc: it.portion_desc || '',
    grams_est: it.grams_est ?? null,
    kcal_low: it.kcal_low || 0,
    kcal_mid: it.kcal_mid || 0,
    kcal_high: it.kcal_high || 0,
    confidence: it.confidence ?? 0.5,
    from_memory: it.from_memory,
  }))
}

export function FuelLogSheet({ goalId, accent, targetKcal, onClose, onConfirmed }: Props) {
  const [hint, setHint] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<EstimateResult | null>(null)
  const [items, setItems] = useState<DraftItem[]>([])
  const [packQuery, setPackQuery] = useState('')
  const [packHits, setPackHits] = useState<FoodPackEntry[]>([])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    if (!packQuery.trim()) {
      setPackHits([])
      return
    }
    const t = setTimeout(() => {
      void api.getFoodPack(packQuery).then(setPackHits).catch(() => setPackHits([]))
    }, 250)
    return () => clearTimeout(t)
  }, [packQuery])

  const totals = useMemo(() => {
    const low = items.reduce((s, i) => s + (i.kcal_low || 0), 0)
    const mid = items.reduce((s, i) => s + (i.kcal_mid || 0), 0)
    const high = items.reduce((s, i) => s + (i.kcal_high || 0), 0)
    return { low, mid, high }
  }, [items])

  function onPickFile(f: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
    setEstimate(null)
    setItems([])
  }

  async function runEstimate(offlineOnly = false) {
    setEstimating(true)
    setError(null)
    try {
      let result: EstimateResult
      if (offlineOnly || !file) {
        result = file
          ? await api.estimatePlate(file, hint || undefined, true)
          : await api.estimateOffline(hint || undefined)
      } else {
        result = await api.estimatePlate(file, hint || undefined, false)
      }
      setEstimate(result)
      setItems(toDraft(result.items))
    } catch (e) {
      // network fail → offline
      try {
        const result = await api.estimateOffline(hint || undefined)
        setEstimate({
          ...result,
          notes: `Fallback offline: ${e instanceof Error ? e.message : 'estimate failed'}. ${result.notes}`,
        })
        setItems(toDraft(result.items))
      } catch (e2) {
        setError(e2 instanceof Error ? e2.message : 'Estimate failed')
      }
    } finally {
      setEstimating(false)
    }
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it
        const next = { ...it, ...patch }
        // keep range coherent if mid edited alone
        if (patch.kcal_mid != null && patch.kcal_low == null && patch.kcal_high == null) {
          const mid = Number(patch.kcal_mid) || 0
          next.kcal_low = Math.round(mid * 0.82)
          next.kcal_high = Math.round(mid * 1.18)
        }
        return next
      }),
    )
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }

  function addBlank() {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        name: '',
        portion_desc: '',
        grams_est: null,
        kcal_low: 0,
        kcal_mid: 0,
        kcal_high: 0,
        confidence: 0.5,
      },
    ])
  }

  async function addFromPack(entry: FoodPackEntry) {
    try {
      const item = await api.packItem(entry.id, 0)
      setItems((prev) => [...prev, ...toDraft([item])])
      setPackQuery('')
      setPackHits([])
    } catch {
      const p = entry.portions?.[0]
      const grams = p?.grams ?? 100
      const mid = Math.round((entry.kcal_per_100g * grams) / 100)
      setItems((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          name: entry.name,
          portion_desc: p?.label ?? 'serve',
          grams_est: grams,
          kcal_low: Math.round(mid * 0.82),
          kcal_mid: mid,
          kcal_high: Math.round(mid * 1.18),
          confidence: 0.75,
        },
      ])
    }
  }

  async function confirm() {
    const clean = items
      .filter((i) => i.name.trim() && i.kcal_mid > 0)
      .map(({ key: _k, id: _id, meal_id: _m, ...rest }) => rest)
    if (!clean.length) {
      setError('Add at least one food item with calories')
      return
    }
    setConfirming(true)
    setError(null)
    try {
      await api.confirmMeal(goalId, {
        source: estimate?.source || (file ? 'vision' : 'catalog'),
        photo_path: estimate?.photo_path,
        note: estimate?.notes || '',
        confidence: estimate?.overall_confidence,
        items: clean,
      })
      onConfirmed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirm failed')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fuel-sheet" role="dialog" aria-modal="true" aria-label="Log plate">
      <div className="fuel-sheet__backdrop" onClick={onClose} />
      <div className="fuel-sheet__panel">
        <header className="fuel-sheet__head">
          <div>
            <h2>Log plate</h2>
            <p>Photo → estimate → correct → confirm</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="fuel-sheet__body">
          <label className="fuel-capture">
            {preview ? (
              <img src={preview} alt="Plate preview" className="fuel-capture__img" />
            ) : (
              <span className="fuel-capture__placeholder">
                <span className="fuel-capture__cam">📷</span>
                <strong>Take or upload a plate photo</strong>
                <span>Camera opens on mobile · gallery works everywhere</span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <p className="fuel-selected">
              Selected: {file.name} · tap the image area to change
            </p>
          )}

          <label className="field">
            <span>Hint (optional)</span>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="lunch · thali · biryani · south Indian"
            />
          </label>

          <div className="fuel-sheet__actions">
            <button
              type="button"
              className="btn btn--primary"
              style={{ background: accent }}
              disabled={estimating}
              onClick={() => void runEstimate(false)}
            >
              {estimating ? 'Estimating…' : file ? 'Estimate from photo' : 'Suggest from pack'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={estimating}
              onClick={() => void runEstimate(true)}
            >
              Offline only
            </button>
          </div>

          {estimate && (
            <div className="fuel-note">
              <strong>{estimate.vision_used ? 'Vision' : estimate.source}</strong>
              {' · '}
              conf {Math.round(estimate.overall_confidence * 100)}%
              <br />
              {estimate.notes}
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="fuel-totals" style={{ borderColor: accent }}>
                <span className="fuel-totals__label">This meal</span>
                <span className="fuel-totals__mid" style={{ color: accent }}>
                  ~{totals.mid} kcal
                </span>
                <span className="fuel-totals__range">
                  range {totals.low}–{totals.high}
                  {targetKcal ? ` · day target ${targetKcal}` : ''}
                </span>
              </div>

              <ul className="fuel-items">
                {items.map((it) => (
                  <li key={it.key} className="fuel-item">
                    <input
                      className="fuel-item__name"
                      value={it.name}
                      onChange={(e) => updateItem(it.key, { name: e.target.value })}
                      placeholder="Food name"
                    />
                    <input
                      className="fuel-item__portion"
                      value={it.portion_desc}
                      onChange={(e) => updateItem(it.key, { portion_desc: e.target.value })}
                      placeholder="portion"
                    />
                    <label className="fuel-item__kcal">
                      mid
                      <input
                        type="number"
                        min={0}
                        value={it.kcal_mid}
                        onChange={(e) =>
                          updateItem(it.key, { kcal_mid: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                    <span className="fuel-item__range">
                      {it.kcal_low}–{it.kcal_high}
                    </span>
                    <button
                      type="button"
                      className="fuel-item__rm"
                      onClick={() => removeItem(it.key)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <div className="fuel-add-row">
                <button type="button" className="text-link" onClick={addBlank}>
                  + custom item
                </button>
                <input
                  className="fuel-pack-search"
                  value={packQuery}
                  onChange={(e) => setPackQuery(e.target.value)}
                  placeholder="Search food pack…"
                />
              </div>
              {packHits.length > 0 && (
                <div className="fuel-pack-hits">
                  {packHits.slice(0, 8).map((h) => (
                    <button key={h.id} type="button" onClick={() => void addFromPack(h)}>
                      {h.name}
                      <span>{h.kcal_per_100g}/100g</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn btn--primary btn--block"
                style={{ background: accent }}
                disabled={confirming}
                onClick={() => void confirm()}
              >
                {confirming ? 'Saving…' : `Confirm ~${totals.mid} kcal`}
              </button>
            </>
          )}

          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
