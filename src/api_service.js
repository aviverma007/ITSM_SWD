// API_SERVICE.js - Place this in your src folder

const API_URL = 'http://192.168.66.34:5001/api';

export const apiService = {
  // ========== TASKS ==========
  
  async getAllTasks() {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return await res.json();
    } catch (err) {
      console.error('Error fetching tasks:', err);
      return [];
    }
  },

  async getTask(id) {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`);
      if (!res.ok) throw new Error('Failed to fetch task');
      return await res.json();
    } catch (err) {
      console.error('Error fetching task:', err);
      return null;
    }
  },

  async createTask(task) {
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!res.ok) throw new Error('Failed to create task');
      return await res.json();
    } catch (err) {
      console.error('Error creating task:', err);
      return null;
    }
  },

  async updateTask(id, updates) {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update task');
      return await res.json();
    } catch (err) {
      console.error('Error updating task:', err);
      return null;
    }
  },

  async deleteTask(id) {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete task');
      return await res.json();
    } catch (err) {
      console.error('Error deleting task:', err);
      return null;
    }
  },

  // ========== ASSIGNEES ==========

  async getAllAssignees() {
    try {
      const res = await fetch(`${API_URL}/assignees`);
      if (!res.ok) throw new Error('Failed to fetch assignees');
      return await res.json();
    } catch (err) {
      console.error('Error fetching assignees:', err);
      return [];
    }
  },

  async addAssignee(assignee) {
    try {
      const res = await fetch(`${API_URL}/assignees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignee)
      });
      if (!res.ok) throw new Error('Failed to add assignee');
      return await res.json();
    } catch (err) {
      console.error('Error adding assignee:', err);
      return null;
    }
  },

  async deleteAssignee(id) {
    try {
      const res = await fetch(`${API_URL}/assignees/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete assignee');
      return await res.json();
    } catch (err) {
      console.error('Error deleting assignee:', err);
      return null;
    }
  },

  // ========== STATUS OPTIONS ==========

  async getAllStatusOptions() {
    try {
      const res = await fetch(`${API_URL}/status-options`);
      if (!res.ok) throw new Error('Failed to fetch status options');
      return await res.json();
    } catch (err) {
      console.error('Error fetching status options:', err);
      return [];
    }
  },

  async addStatusOption(option) {
    try {
      const res = await fetch(`${API_URL}/status-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(option)
      });
      if (!res.ok) throw new Error('Failed to add status option');
      return await res.json();
    } catch (err) {
      console.error('Error adding status option:', err);
      return null;
    }
  },

  async deleteStatusOption(id) {
    try {
      const res = await fetch(`${API_URL}/status-options/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete status option');
      return await res.json();
    } catch (err) {
      console.error('Error deleting status option:', err);
      return null;
    }
  },

  // ========== ACTIVITY LOG ==========

  async getActivityLog(taskId) {
    try {
      const res = await fetch(`${API_URL}/activity-log/${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch activity log');
      return await res.json();
    } catch (err) {
      console.error('Error fetching activity log:', err);
      return [];
    }
  },

  // ========== STATS ==========

  async getStats() {
    try {
      const res = await fetch(`${API_URL}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return await res.json();
    } catch (err) {
      console.error('Error fetching stats:', err);
      return null;
    }
  },

  // ========== HEALTH CHECK ==========

  async checkHealth() {
    try {
      const res = await fetch(`${API_URL}/health`);
      return res.ok;
    } catch (err) {
      console.error('Backend health check failed:', err);
      return false;
    }
  }
};
