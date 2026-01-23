import axios from 'axios'
import type { TimeEntry, ProjectSummary } from '@/types'
import { useAuthStore } from '@/stores/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  const authHeader = authStore.getAuthHeader()
  
  console.log('API Request:', config.url, 'Has token:', !!authHeader.Authorization)
  
  if (authHeader.Authorization) {
    config.headers.Authorization = authHeader.Authorization
  }
  
  return config
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn('Unauthorized - clearing token')
      const authStore = useAuthStore()
      authStore.logout()
    }
    
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const timeEntriesApi = {
  async getAll(): Promise<TimeEntry[]> {
    const response = await api.get('/api/timeentries')
    return response.data
  },

  async create(entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeEntry & { lastSaved: string }> {
    const response = await api.post('/api/timeentries', entry)
    return response.data
  },

  async update(id: string, entry: Partial<TimeEntry>): Promise<TimeEntry & { lastSaved: string }> {
    const response = await api.put(`/api/timeentries/${id}`, entry)
    return response.data
  },

  async delete(id: string): Promise<{ message: string; lastSaved: string }> {
    const response = await api.delete(`/api/timeentries/${id}`)
    return response.data
  }
}

export const projectsApi = {
  async getAll(): Promise<ProjectSummary[]> {
    const response = await api.get('/api/projects')
    return response.data
  },

  async create(project: Omit<ProjectSummary, 'totalHours' | 'lastUsed'>): Promise<ProjectSummary & { lastSaved: string }> {
    const response = await api.post('/api/projects', project)
    return response.data
  },

  async update(name: string, project: Partial<ProjectSummary>): Promise<ProjectSummary & { lastSaved: string }> {
    const response = await api.put(`/api/projects/${encodeURIComponent(name)}`, project)
    return response.data
  },

  async delete(name: string): Promise<{ message: string; lastSaved: string }> {
    const response = await api.delete(`/api/projects/${encodeURIComponent(name)}`)
    return response.data
  }
}

export const healthApi = {
  async check(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get('/api/health')
    return response.data
  }
}

export default api
