// DOM Elements
const customerName = document.getElementById('customerName');
const customerPhone = document.getElementById('customerPhone');
const followUpDate = document.getElementById('followUpDate');
const saveBtn = document.getElementById('saveBtn');
const reminderList = document.getElementById('reminderList');
const clearBtn = document.getElementById('clearBtn');

// Set default date to today
followUpDate.value = new Date().toISOString().split('T')[0];

// Load and display reminders when popup opens
document.addEventListener('DOMContentLoaded', loadReminders);

// Save new reminder
saveBtn.addEventListener('click', () => {
  const name = customerName.value.trim();
  const phone = customerPhone.value.trim();
  const date = followUpDate.value;

  if (!name || !phone || !date) {
    alert('Please fill in all fields!');
    return;
  }

  // Create reminder object
  const reminder = {
    id: Date.now(), // unique ID
    name: name,
    phone: phone,
    date: date,
    createdAt: new Date().toISOString()
  };

  // Get existing reminders, add new one, save back
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    reminders.push(reminder);
    chrome.storage.local.set({ reminders: reminders }, () => {
      // Clear inputs
      customerName.value = '';
      customerPhone.value = '';
      followUpDate.value = new Date().toISOString().split('T')[0];
      loadReminders(); // Refresh the list
    });
  });
});

// Load and display all reminders
function loadReminders() {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    
    if (reminders.length === 0) {
      reminderList.innerHTML = `<div class="empty-state">🎯 No reminders yet. Add one above!</div>`;
      return;
    }

    // Sort by follow-up date (soonest first)
    reminders.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Build HTML for each reminder
    reminderList.innerHTML = reminders.map(reminder => {
      const today = new Date();
      const followDate = new Date(reminder.date);
      const daysUntil = Math.ceil((followDate - today) / (1000 * 60 * 60 * 24));
      
      let dateLabel = reminder.date;
      if (daysUntil === 0) dateLabel += ' 🔴 Today';
      else if (daysUntil === 1) dateLabel += ' ⚠️ Tomorrow';
      else if (daysUntil < 0) dateLabel += ' ⏰ Overdue';

      return `
        <div class="reminder-item">
          <div class="info">
            <span class="name">${escapeHtml(reminder.name)}</span>
            <span class="phone">📱 ${escapeHtml(reminder.phone)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="date">${dateLabel}</span>
            <button class="delete-btn" data-id="${reminder.id}">✕</button>
          </div>
        </div>
      `;
    }).join('');

    // Add delete event listeners to all delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        deleteReminder(id);
      });
    });
  });
}

// Delete a single reminder by ID
function deleteReminder(id) {
  chrome.storage.local.get(['reminders'], (result) => {
    let reminders = result.reminders || [];
    reminders = reminders.filter(r => r.id !== id);
    chrome.storage.local.set({ reminders: reminders }, loadReminders);
  });
}

// Clear all reminders
clearBtn.addEventListener('click', () => {
  if (confirm('Delete all reminders?')) {
    chrome.storage.local.set({ reminders: [] }, loadReminders);
  }
});

// Simple helper to prevent XSS (just good practice)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
