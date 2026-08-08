// In dev, Vite proxies /api → FastAPI. Override with VITE_API_URL if needed.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface SubGoal {
  id: number
  goal_id: number
  title: string
  icon: string
  sort_order: number
}

export interface DayCheckin {
  id: number
  goal_id: number
  day: string
  completed: boolean
  sub_goal_id: number | null
  note: string
}

export interface MealItem {
  id?: number
  meal_id?: number
  name: string
  portion_desc: string
  grams_est: number | null
  kcal_low: number
  kcal_mid: number
  kcal_high: number
  confidence: number
  from_memory?: boolean
}

export interface MealLog {
  id: number
  goal_id: number
  day: string
  source: string
  photo_path: string | null
  note: string
  total_kcal_low: number
  total_kcal_mid: number
  total_kcal_high: number
  confidence: number
  confirmed_at: string
  items: MealItem[]
}

export interface Goal {
  id: number
  title: string
  description: string
  icon: string
  duration_days: number
  start_date: string
  accent_color: string
  completion_emoji: string
  is_active: boolean
  sort_order: number
  created_at: string
  kind: 'habit' | 'fuel' | string
  fuel_target_kcal: number | null
  sub_goals: SubGoal[]
  checkins?: DayCheckin[]
  meals?: MealLog[]
  momentum: number
  status_label: string
  completed_days: number
  current_streak: number
  today_kcal_mid?: number | null
  today_kcal_low?: number | null
  today_kcal_high?: number | null
  today_remaining_mid?: number | null
  vision_configured?: boolean
}

export interface GoalCreatePayload {
  title: string
  description?: string
  icon?: string
  duration_days?: number
  start_date?: string
  accent_color?: string
  completion_emoji?: string
  is_active?: boolean
  sort_order?: number
  kind?: string
  fuel_target_kcal?: number | null
  sub_goals?: { title: string; icon?: string; sort_order?: number }[]
}

export type GoalUpdatePayload = Partial<GoalCreatePayload>

export interface EstimateResult {
  source: string
  items: MealItem[]
  notes: string
  overall_confidence: number
  total_kcal_low: number
  total_kcal_mid: number
  total_kcal_high: number
  vision_used: boolean
  photo_path: string | null
}

export interface DayFuel {
  day: string
  meals_count: number
  total_kcal_low: number
  total_kcal_mid: number
  total_kcal_high: number
  target_kcal: number | null
  remaining_mid: number | null
  meals: MealLog[]
}

export interface FoodPackEntry {
  id: string
  name: string
  aliases: string[]
  kcal_per_100g: number
  portions: { label: string; grams: number }[]
}

export interface FoodMemory {
  id: number
  normalized_name: string
  display_name: string
  portion_desc: string
  grams_est: number | null
  kcal_mid: number
  kcal_low: number
  kcal_high: number
  use_count: number
  last_used: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(options?.headers ?? {}),
    },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  listGoals: () => request<Goal[]>('/api/goals'),
  getGoal: (id: number) => request<Goal>(`/api/goals/${id}`),
  createGoal: (payload: GoalCreatePayload) =>
    request<Goal>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateGoal: (id: number, payload: GoalUpdatePayload) =>
    request<Goal>(`/api/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteGoal: (id: number) =>
    request<void>(`/api/goals/${id}`, { method: 'DELETE' }),
  toggleCheckin: (goalId: number, day: string, completed?: boolean) =>
    request<DayCheckin>(`/api/goals/${goalId}/checkins`, {
      method: 'POST',
      body: JSON.stringify({ day, completed }),
    }),
  addSubGoal: (goalId: number, title: string, icon = 'sub-dot') =>
    request<SubGoal>(`/api/goals/${goalId}/sub-goals`, {
      method: 'POST',
      body: JSON.stringify({ title, icon }),
    }),
  deleteSubGoal: (id: number) =>
    request<void>(`/api/sub-goals/${id}`, { method: 'DELETE' }),

  getFoodPack: (q?: string) =>
    request<FoodPackEntry[]>(
      `/api/fuel/food-pack${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    ),
  getMemory: () => request<FoodMemory[]>('/api/fuel/memory'),
  estimateOffline: (meal_hint?: string) =>
    request<EstimateResult>(
      `/api/fuel/estimate-offline${meal_hint ? `?meal_hint=${encodeURIComponent(meal_hint)}` : ''}`,
    ),
  estimatePlate: async (file: File | null, mealHint?: string, offlineOnly = false) => {
    const fd = new FormData()
    if (file) fd.append('image', file)
    if (mealHint) fd.append('meal_hint', mealHint)
    if (offlineOnly) fd.append('offline_only', 'true')
    return request<EstimateResult>('/api/fuel/estimate', {
      method: 'POST',
      body: fd,
    })
  },
  confirmMeal: (
    goalId: number,
    payload: {
      day?: string
      source?: string
      note?: string
      photo_path?: string | null
      items: Omit<MealItem, 'id' | 'meal_id'>[]
      confidence?: number
    },
  ) =>
    request<MealLog>(`/api/goals/${goalId}/meals`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getFuelDay: (goalId: number, day?: string) =>
    request<DayFuel>(
      `/api/goals/${goalId}/fuel/day${day ? `?day=${day}` : ''}`,
    ),
  deleteMeal: (mealId: number) =>
    request<void>(`/api/meals/${mealId}`, { method: 'DELETE' }),
  packItem: (foodId: string, portionIndex = 0) =>
    request<MealItem>(
      `/api/fuel/pack-item?food_id=${encodeURIComponent(foodId)}&portion_index=${portionIndex}`,
      { method: 'POST' },
    ),
  getVisionSettings: () => request<VisionSettings>('/api/settings/vision'),
  setVisionKey: (api_key: string) =>
    request<VisionSettings>('/api/settings/vision', {
      method: 'PUT',
      body: JSON.stringify({ api_key }),
    }),
  clearVisionKey: () =>
    request<VisionSettings>('/api/settings/vision', { method: 'DELETE' }),
}

export interface VisionSettings {
  configured: boolean
  provider: string | null
  model: string
  source: string | null
  has_app_key: boolean
  has_env_key: boolean
  key_hint: string | null
}
