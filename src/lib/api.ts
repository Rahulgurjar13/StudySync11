// API Client for Express + MongoDB backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper to get auth token from localStorage
const getToken = () => {
  return localStorage.getItem('authToken');
};

// Helper to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`[API] ${options.method || 'GET'} ${API_URL}${url}`);

  try {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      console.error(`[API] Error ${response.status}:`, error);
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`[API] Response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[API] Request failed:`, error);
    if (error.message) {
      throw error;
    }
    throw new Error('Network request failed. Please check your connection.');
  }
};

// Auth API
export const auth = {
  register: async (email: string, password: string, fullName: string) => {
    // Clear all previous user data before registering
    localStorage.clear();
    
    const data = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('[AUTH] User registered:', data.user.email, 'ID:', data.user.id);
    }
    return data;
  },

  login: async (email: string, password: string) => {
    // Clear all previous user data before logging in
    localStorage.clear();
    
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('[AUTH] User logged in:', data.user.email, 'ID:', data.user.id);
    }
    return data;
  },

  logout: () => {
    console.log('[AUTH] Logging out - clearing all data');
    // Clear ALL localStorage to prevent data leaks between users
    localStorage.clear();
    // Also clear sessionStorage
    sessionStorage.clear();
  },

  getCurrentUser: async () => {
    try {
      const data = await fetchWithAuth('/auth/me');
      return data.user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },

  getSession: () => {
    const token = getToken();
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  },
};

// Tasks API
export const tasks = {
  getAll: async () => {
    const data = await fetchWithAuth('/tasks');
    // Normalize _id to id for frontend and fix userId
    return data.tasks.map((task: any) => ({
      ...task,
      id: task._id,
      userId: typeof task.userId === 'object' ? task.userId._id : task.userId
    }));
  },

  create: async (task: { title: string; description?: string; completed?: boolean; isShared?: boolean; partnershipId?: string }) => {
    const data = await fetchWithAuth('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    // Normalize _id to id for frontend and fix userId
    return {
      ...data.task,
      id: data.task._id,
      userId: typeof data.task.userId === 'object' ? data.task.userId._id : data.task.userId
    };
  },

  update: async (id: string, updates: { title?: string; description?: string; completed?: boolean }) => {
    const data = await fetchWithAuth(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    // Normalize _id to id for frontend and fix userId
    return {
      task: {
        ...data.task,
        id: data.task._id,
        userId: typeof data.task.userId === 'object' ? data.task.userId._id : data.task.userId
      },
      points: data.points // Include point information from backend
    };
  },

  delete: async (id: string) => {
    await fetchWithAuth(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },
};

// Partnerships API
export const partnerships = {
  getAll: async () => {
    const data = await fetchWithAuth('/partnerships');
    return data.partnerships;
  },

  getPending: async () => {
    const data = await fetchWithAuth('/partnerships/pending');
    return data.pendingRequests;
  },

  getSent: async () => {
    const data = await fetchWithAuth('/partnerships/sent');
    return data.sentRequests;
  },

  create: async (partnerEmail: string) => {
    const data = await fetchWithAuth('/partnerships', {
      method: 'POST',
      body: JSON.stringify({ partnerEmail }),
    });
    return data;
  },

  accept: async (id: string) => {
    const data = await fetchWithAuth(`/partnerships/${id}/accept`, {
      method: 'PUT',
    });
    return data;
  },

  decline: async (id: string) => {
    const data = await fetchWithAuth(`/partnerships/${id}/decline`, {
      method: 'PUT',
    });
    return data;
  },

  delete: async (id: string) => {
    await fetchWithAuth(`/partnerships/${id}`, {
      method: 'DELETE',
    });
  },
};

// Shared Resources API
export const resources = {
  getAll: async () => {
    const data = await fetchWithAuth('/resources');
    return data.resources;
  },

  create: async (resource: { title: string; description?: string; url?: string; resourceType: string; partnershipId: string }) => {
    const data = await fetchWithAuth('/resources', {
      method: 'POST',
      body: JSON.stringify(resource),
    });
    return data.resource;
  },

  delete: async (id: string) => {
    await fetchWithAuth(`/resources/${id}`, {
      method: 'DELETE',
    });
  },
};

// Focus Sessions API
export const focus = {
  getMonthData: async (year: number, month: number) => {
    const data = await fetchWithAuth(`/focus/month/${year}/${month}`);
    return data.sessions;
  },

  getAllData: async () => {
    const data = await fetchWithAuth('/focus/all');
    return data.sessions;
  },

  recordSession: async (focusMinutes: number, sessionType: 'focus' | 'break' = 'focus') => {
    const data = await fetchWithAuth('/focus/session', {
      method: 'POST',
      body: JSON.stringify({ focusMinutes, sessionType }),
    });
    return data.session;
  },

  getStreak: async () => {
    const data = await fetchWithAuth('/focus/streak');
    return data;
  },

  getMonthStats: async (year: number, month: number) => {
    const data = await fetchWithAuth(`/focus/stats/${year}/${month}`);
    return data;
  },

  // Get today's accumulated focus time (only completed sessions from database)
  getTodayProgress: async () => {
    const data = await fetchWithAuth('/focus/today');
    return {
      focusMinutes: data.focusMinutes || 0,
      completedMinutes: data.completedMinutes || 0,
      activeMinutes: data.activeMinutes || 0,
      sessionsCompleted: data.sessionsCompleted || 0,
      achieved: data.achieved || false,
      sessionStartTime: data.sessionStartTime || null,
      lastUpdated: data.lastUpdated || null
    };
  },

  // Update active session minutes (when pausing)
  updateActiveSession: async (activeMinutes: number, sessionStartTime?: number) => {
    const data = await fetchWithAuth('/focus/active-session', {
      method: 'POST',
      body: JSON.stringify({ 
        activeMinutes,
        sessionStartTime: sessionStartTime ? new Date(sessionStartTime).toISOString() : null
      }),
    });
    return data;
  },

  // Auto-save active session in real-time
  autoSaveActiveSession: async (elapsedMinutes: number, sessionStartTime?: number) => {
    const data = await fetchWithAuth('/focus/active-session', {
      method: 'POST',
      body: JSON.stringify({ 
        elapsedMinutes,
        sessionStartTime: sessionStartTime ? new Date(sessionStartTime).toISOString() : null
      }),
    });
    return data;
  },
};

// Points API
export const points = {
  getMe: async () => {
    const data = await fetchWithAuth('/points/me');
    return data;
  },

  getHistory: async (limit: number = 50) => {
    const data = await fetchWithAuth(`/points/history?limit=${limit}`);
    return data;
  },

  getStats: async () => {
    const data = await fetchWithAuth('/points/stats');
    return data;
  },

  getLeaderboard: async (limit: number = 10) => {
    const data = await fetchWithAuth(`/points/leaderboard?limit=${limit}`);
    return data;
  },
};

export const api = {
  auth,
  tasks,
  partnerships,
  resources,
  focus,
  points,
};
