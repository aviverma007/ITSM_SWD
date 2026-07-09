// API_SERVICE.js - Place this in your src folder

// Get API URL from environment variable, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const apiService = {
  // ========== TICKETS (Enhanced) ==========
  
  async getAllTasks() {
    try {
      const res = await fetch(`${API_URL}/tickets`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      return await res.json();
    } catch (err) {
      console.error('Error fetching tickets:', err);
      return [];
    }
  },

  async getTask(id) {
    try {
      const res = await fetch(`${API_URL}/tickets/${id}`);
      if (!res.ok) throw new Error('Failed to fetch ticket');
      return await res.json();
    } catch (err) {
      console.error('Error fetching ticket:', err);
      return null;
    }
  },

  async createTask(task) {
    try {
      const res = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      return await res.json();
    } catch (err) {
      console.error('Error creating ticket:', err);
      return null;
    }
  },

  async updateTask(id, updates) {
    try {
      const res = await fetch(`${API_URL}/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update ticket');
      return await res.json();
    } catch (err) {
      console.error('Error updating ticket:', err);
      return null;
    }
  },

  async deleteTask(id) {
    try {
      const res = await fetch(`${API_URL}/tickets/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete ticket');
      return await res.json();
    } catch (err) {
      console.error('Error deleting ticket:', err);
      return null;
    }
  },

  async getDeletedTickets() {
    try {
      const res = await fetch(`${API_URL}/tickets/deleted/all`);
      if (!res.ok) throw new Error('Failed to fetch deleted tickets');
      return await res.json();
    } catch (err) {
      console.error('Error fetching deleted tickets:', err);
      return [];
    }
  },

  async restoreTicket(id) {
    try {
      const res = await fetch(`${API_URL}/tickets/${id}/restore`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to restore ticket');
      return await res.json();
    } catch (err) {
      console.error('Error restoring ticket:', err);
      return null;
    }
  },

  async permanentlyDeleteTicket(id) {
    try {
      const res = await fetch(`${API_URL}/tickets/${id}/permanent`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to permanently delete ticket');
      return await res.json();
    } catch (err) {
      console.error('Error permanently deleting ticket:', err);
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

  // ========== APPLICATIONS ==========

  async getAllApplications() {
    try {
      const res = await fetch(`${API_URL}/applications`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      return await res.json();
    } catch (err) {
      console.error('Error fetching applications:', err);
      return [];
    }
  },

  async addApplication(app) {
    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app)
      });
      if (!res.ok) throw new Error('Failed to add application');
      return await res.json();
    } catch (err) {
      console.error('Error adding application:', err);
      return null;
    }
  },

  async deleteApplication(id) {
    try {
      const res = await fetch(`${API_URL}/applications/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete application');
      return await res.json();
    } catch (err) {
      console.error('Error deleting application:', err);
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

  // ========== USERS ==========

  async getAllUsers() {
    try {
      const res = await fetch(`${API_URL}/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return await res.json();
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  },

  async addUser(user) {
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!res.ok) throw new Error('Failed to add user');
      return await res.json();
    } catch (err) {
      console.error('Error adding user:', err);
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
