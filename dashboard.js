import { auth } from "./firebaseConfig.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Global state
let currentUser = null;
let tasks = [];
let currentDate = new Date();
let currentView = "month";

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadTasks();
  initializeCalendar();
  setupDragAndDrop();
});

// Check authentication
function checkAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Not authenticated, redirect to login
      window.location.href = "Login.html";
    } else {
      // Authenticated, set user info
      currentUser = user;
      const userNameElement = document.getElementById("userName");
      userNameElement.textContent = user.displayName || user.email || "User";
      renderTasks();
      renderCalendar();
    }
  });
}

// Task Management
function loadTasks() {
  const savedTasks = localStorage.getItem(
    `tasks_${auth.currentUser?.uid || "default"}`
  );
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  }
}

function saveTasks() {
  if (currentUser) {
    localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
  }
}

function addTask(taskData) {
  const task = {
    id: Date.now().toString(),
    title: taskData.title,
    description: taskData.description || "",
    dueDate: taskData.dueDate,
    priority: taskData.priority,
    tag: taskData.tag || "",
    scheduledDate: null, // For calendar scheduling
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  saveTasks();
  renderTasks();
  renderCalendar();
}

function removeTask(taskId) {
  tasks = tasks.filter((t) => t.id !== taskId);
  saveTasks();
  renderTasks();
  renderCalendar();
}

function updateTaskSchedule(taskId, scheduledDate) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.scheduledDate = scheduledDate;
    saveTasks();
    renderCalendar();
  }
}

// Render Tasks
function renderTasks() {
  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    taskList.innerHTML =
      '<p class="empty-state">No tasks yet. Create one to get started!</p>';
    return;
  }

  // Sort tasks by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  sortedTasks.forEach((task) => {
    const taskCard = createTaskCard(task);
    taskList.appendChild(taskCard);
  });
}

function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  card.draggable = true;
  card.dataset.taskId = task.id;

  const priorityClass = `priority-${task.priority.toLowerCase()}`;
  const dueDate = new Date(task.dueDate);
  const formattedDate = dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  card.innerHTML = `
    <div class="task-card-header">
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      <button class="delete-task" onclick="handleDeleteTask('${
        task.id
      }')" title="Delete task">×</button>
    </div>
    <div class="task-card-body">
      <div class="task-meta">
        <span class="task-date">📅 ${formattedDate}</span>
        <span class="task-priority ${priorityClass}">${task.priority}</span>
      </div>
      ${task.tag ? `<span class="task-tag">${escapeHtml(task.tag)}</span>` : ""}
    </div>
  `;

  // Drag event handlers
  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", task.id);
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });

  return card;
}

// Calendar Functions
function initializeCalendar() {
  renderCalendar();
}

function renderCalendar() {
  const container = document.getElementById("calendarContainer");
  container.innerHTML = "";

  if (currentView === "month") {
    renderMonthView(container);
  } else if (currentView === "week") {
    renderWeekView(container);
  } else {
    renderDayView(container);
  }

  updateCalendarTitle();
}

function renderMonthView(container) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Create calendar grid
  const calendarGrid = document.createElement("div");
  calendarGrid.className = "calendar-grid month-view";

  // Add day headers
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  dayHeaders.forEach((day) => {
    const header = document.createElement("div");
    header.className = "calendar-day-header";
    header.textContent = day;
    calendarGrid.appendChild(header);
  });

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    calendarGrid.appendChild(emptyCell);
  }

  // Add day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = createDayCell(year, month, day);
    calendarGrid.appendChild(dayCell);
  }

  container.appendChild(calendarGrid);
}

function renderWeekView(container) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const date = currentDate.getDate();
  const dayOfWeek = currentDate.getDay();

  // Get start of week (Sunday)
  const weekStart = new Date(year, month, date - dayOfWeek);
  const weekGrid = document.createElement("div");
  weekGrid.className = "calendar-grid week-view";

  // Day headers
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  dayHeaders.forEach((day) => {
    const header = document.createElement("div");
    header.className = "calendar-day-header";
    header.textContent = day;
    weekGrid.appendChild(header);
  });

  // Day cells for the week
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(weekStart);
    currentDay.setDate(weekStart.getDate() + i);
    const dayCell = createDayCell(
      currentDay.getFullYear(),
      currentDay.getMonth(),
      currentDay.getDate()
    );
    weekGrid.appendChild(dayCell);
  }

  container.appendChild(weekGrid);
}

function renderDayView(container) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();

  const dayGrid = document.createElement("div");
  dayGrid.className = "calendar-grid day-view";

  // Time slots for the day
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push(i);
  }

  hours.forEach((hour) => {
    const timeSlot = document.createElement("div");
    timeSlot.className = "day-time-slot";
    const dropzone = document.createElement("div");
    dropzone.className = "day-cell-dropzone";
    dropzone.dataset.year = year;
    dropzone.dataset.month = month;
    dropzone.dataset.day = day;
    dropzone.dataset.hour = hour;

    const timeLabel = document.createElement("div");
    timeLabel.className = "time-label";
    timeLabel.textContent = formatHour(hour);

    timeSlot.appendChild(timeLabel);
    timeSlot.appendChild(dropzone);
    dayGrid.appendChild(timeSlot);
  });

  // Render tasks for this day
  renderTasksInDayView(dayGrid, year, month, day);
  container.appendChild(dayGrid);
}

function createDayCell(year, month, day) {
  const dayCell = document.createElement("div");
  const cellDate = new Date(year, month, day);
  const isToday = isSameDay(cellDate, new Date());
  const isCurrentMonth = cellDate.getMonth() === currentDate.getMonth();

  dayCell.className = `calendar-day ${isToday ? "today" : ""} ${
    !isCurrentMonth ? "other-month" : ""
  }`;
  dayCell.dataset.year = year;
  dayCell.dataset.month = month;
  dayCell.dataset.day = day;

  // Day number
  const dayNumber = document.createElement("div");
  dayNumber.className = "day-number";
  dayNumber.textContent = day;
  dayCell.appendChild(dayNumber);

  // Drop zone
  const dropZone = document.createElement("div");
  dropZone.className = "day-dropzone";
  dayCell.appendChild(dropZone);

  // Render scheduled tasks for this day
  renderTasksInCell(dayCell, year, month, day);

  return dayCell;
}

function renderTasksInCell(cell, year, month, day) {
  const scheduledTasks = tasks.filter((task) => {
    if (!task.scheduledDate) return false;
    const scheduled = new Date(task.scheduledDate);
    return (
      scheduled.getFullYear() === year &&
      scheduled.getMonth() === month &&
      scheduled.getDate() === day
    );
  });

  scheduledTasks.forEach((task) => {
    const taskBlock = document.createElement("div");
    taskBlock.className = `calendar-task priority-${task.priority.toLowerCase()}`;
    taskBlock.textContent = task.title;
    taskBlock.title = `${task.title} - ${task.priority}`;
    cell.querySelector(".day-dropzone").appendChild(taskBlock);
  });
}

function renderTasksInDayView(container, year, month, day) {
  const scheduledTasks = tasks.filter((task) => {
    if (!task.scheduledDate) return false;
    const scheduled = new Date(task.scheduledDate);
    return (
      scheduled.getFullYear() === year &&
      scheduled.getMonth() === month &&
      scheduled.getDate() === day
    );
  });

  // Tasks would be positioned by hour in day view
  // For now, we'll add them to the appropriate time slot
  scheduledTasks.forEach((task) => {
    const scheduled = new Date(task.scheduledDate);
    const hour = scheduled.getHours();
    const timeSlot = container.querySelector(
      `[data-hour="${hour}"] .day-cell-dropzone`
    );
    if (timeSlot) {
      const taskBlock = document.createElement("div");
      taskBlock.className = `calendar-task priority-${task.priority.toLowerCase()}`;
      taskBlock.textContent = task.title;
      timeSlot.appendChild(taskBlock);
    }
  });
}

function updateCalendarTitle() {
  const titleElement = document.getElementById("calendarTitle");
  const options = {
    month: "long",
    year: "numeric",
  };

  if (currentView === "week") {
    const weekStart = getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    titleElement.textContent = `${weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${weekEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  } else if (currentView === "day") {
    titleElement.textContent = currentDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } else {
    titleElement.textContent = currentDate.toLocaleDateString("en-US", options);
  }
}

// Navigation
window.navigateCalendar = function (direction) {
  if (currentView === "month") {
    currentDate.setMonth(currentDate.getMonth() + direction);
  } else if (currentView === "week") {
    currentDate.setDate(currentDate.getDate() + direction * 7);
  } else {
    currentDate.setDate(currentDate.getDate() + direction);
  }
  renderCalendar();
};

window.switchView = function (view) {
  currentView = view;

  // Update button states
  document.querySelectorAll(".view-button").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(`${view}ViewButton`).classList.add("active");

  renderCalendar();
};

// Drag and Drop
function setupDragAndDrop() {
  const calendarContainer = document.getElementById("calendarContainer");

  calendarContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    const dropZone = e.target.closest(".day-dropzone, .day-cell-dropzone");
    if (dropZone) {
      dropZone.classList.add("drag-over");
    }
  });

  calendarContainer.addEventListener("dragleave", (e) => {
    const dropZone = e.target.closest(".day-dropzone, .day-cell-dropzone");
    if (dropZone) {
      dropZone.classList.remove("drag-over");
    }
  });

  calendarContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    const dropZone = e.target.closest(".day-dropzone, .day-cell-dropzone");
    if (dropZone) {
      dropZone.classList.remove("drag-over");

      const taskId = e.dataTransfer.getData("text/plain");

      // Get date from the drop zone or parent elements
      let year, month, day, hour;

      if (dropZone.classList.contains("day-cell-dropzone")) {
        // Day view - get from the dropzone itself
        year = parseInt(dropZone.dataset.year);
        month = parseInt(dropZone.dataset.month);
        day = parseInt(dropZone.dataset.day);
        hour = parseInt(dropZone.dataset.hour || 12);
      } else {
        // Month/Week view - get from parent calendar-day
        const calendarDay = dropZone.closest(".calendar-day");
        if (calendarDay) {
          year = parseInt(calendarDay.dataset.year);
          month = parseInt(calendarDay.dataset.month);
          day = parseInt(calendarDay.dataset.day);
          hour = 12; // Default to noon
        }
      }

      if (year !== undefined && month !== undefined && day !== undefined) {
        const scheduledDate = new Date(year, month, day, hour);
        updateTaskSchedule(taskId, scheduledDate.toISOString());
      }
    }
  });
}

// Modal Functions
window.openCreateTaskModal = function () {
  const modal = document.getElementById("modalOverlay");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Set today as default due date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("taskDueDate").value = today;
};

window.closeCreateTaskModal = function () {
  const modal = document.getElementById("modalOverlay");
  modal.style.display = "none";
  document.body.style.overflow = "";
  document.getElementById("createTaskForm").reset();
};

window.handleCreateTask = function (event) {
  event.preventDefault();

  const formData = {
    title: document.getElementById("taskTitle").value,
    description: document.getElementById("taskDescription").value,
    dueDate: document.getElementById("taskDueDate").value,
    priority: document.getElementById("taskPriority").value,
    tag: document.getElementById("taskTag").value,
  };

  addTask(formData);
  closeCreateTaskModal();
};

window.handleDeleteTask = function (taskId) {
  if (confirm("Are you sure you want to delete this task?")) {
    removeTask(taskId);
  }
};

// User Menu Functions
window.toggleUserMenu = function () {
  const dropdown = document.getElementById("userMenuDropdown");
  dropdown.classList.toggle("show");
};

window.handleProfile = function () {
  alert("Profile feature coming soon!");
  document.getElementById("userMenuDropdown").classList.remove("show");
};

window.handleSignOut = async function () {
  try {
    await signOut(auth);
    window.location.href = "Login.html";
  } catch (error) {
    console.error("Error signing out:", error);
    alert("Error signing out. Please try again.");
  }
};

// Close user menu when clicking outside
document.addEventListener("click", (e) => {
  const userMenu = document.querySelector(".user-menu-container");
  if (!userMenu.contains(e.target)) {
    document.getElementById("userMenuDropdown").classList.remove("show");
  }
});

// Utility Functions
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function formatHour(hour) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
