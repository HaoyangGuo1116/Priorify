import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Global state
let currentUser = null;
let tasks = [];
let currentDate = new Date();
let currentView = "month";
let sortType = "none"; // "none", "priority", "ddl"

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
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
      // For anonymous users, show "Guest" instead of email
      userNameElement.textContent = user.isAnonymous
        ? "Guest"
        : user.displayName || user.email || "User";
      // Load tasks from Firestore
      loadTasksFromFirestore();
    }
  });
}

// Task Management with Firestore
function loadTasksFromFirestore() {
  if (!currentUser) return;

  const tasksRef = collection(db, "tasks");
  const q = query(tasksRef, where("userId", "==", currentUser.uid));

  // Set up real-time listener for tasks
  onSnapshot(q, (snapshot) => {
    tasks = [];
    snapshot.forEach((docSnap) => {
      const taskData = docSnap.data();
      tasks.push({
        id: docSnap.id,
        ...taskData,
      });
    });
    renderTasks();
    renderCalendar();
  });
}

async function saveTaskToFirestore(task) {
  if (!currentUser) {
    console.error("Failed to save task: user not logged in");
    alert("Please log in before creating tasks.");
    return null;
  }

  try {
    const tasksRef = collection(db, "tasks");
    const taskData = {
      ...task,
      userId: currentUser.uid,
      createdAt: task.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("Saving task:", {
      userId: currentUser.uid,
      isAnonymous: currentUser.isAnonymous,
      title: task.title,
    });

    const docRef = await addDoc(tasksRef, taskData);
    console.log("Task saved successfully, ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving task to Firestore:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error(
      "Current user:",
      currentUser
        ? {
            uid: currentUser.uid,
            email: currentUser.email,
            isAnonymous: currentUser.isAnonymous,
          }
        : "Not logged in"
    );

    // Provide more specific error messages
    let errorMessage = "Failed to create task. Please try again.";
    if (error.code === "permission-denied") {
      errorMessage =
        "You do not have permission to create tasks.\n\nPossible reasons:\n1. Firestore security rules are not properly configured\n2. User is not properly logged in\n\nPlease check Firestore security rules in Firebase Console to ensure authenticated users can create tasks.\n\nCurrent user ID: " +
        (currentUser?.uid || "Not logged in");
    } else if (error.code === "unavailable") {
      errorMessage =
        "Network connection failed. Please check your network and try again.";
    } else if (error.code === "unauthenticated") {
      errorMessage = "User is not logged in. Please log in again.";
      // Re-check authentication status
      checkAuth();
    } else if (error.message) {
      errorMessage = `Failed to create task: ${error.message}`;
    }

    alert(errorMessage);
    return null;
  }
}

async function updateTaskInFirestore(taskId, updates) {
  if (!currentUser) return;

  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating task in Firestore:", error);
    alert("Failed to update task. Please try again.");
  }
}

async function deleteTaskFromFirestore(taskId) {
  if (!currentUser) return;

  try {
    const taskRef = doc(db, "tasks", taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error("Error deleting task from Firestore:", error);
    alert("Failed to delete task. Please try again.");
  }
}

async function addTask(taskData) {
  if (!currentUser) {
    alert("Please log in to create tasks.");
    return false;
  }

  // Parse date and time as local time (not UTC)
  // taskData.taskDate is in format YYYY-MM-DD (local date)
  // taskData.taskTime is in format HH:MM (local time)
  const [year, month, day] = taskData.taskDate.split("-").map(Number);
  const [hours, minutes] = taskData.taskTime.split(":").map(Number);

  // Create date in local timezone
  const dateTime = new Date(year, month - 1, day, hours, minutes);

  // Store as ISO string (Firestore will store this correctly)
  const scheduledDate = dateTime.toISOString();

  // For dueDate, store as YYYY-MM-DD string to avoid timezone issues
  const dueDate = taskData.taskDate;

  const task = {
    title: taskData.title,
    description: taskData.description || "",
    dueDate: dueDate, // Due date (YYYY-MM-DD format, date only)
    priority: taskData.priority,
    tag: taskData.tag || "",
    scheduledDate: scheduledDate, // Full date-time for calendar scheduling
    reminderTime: scheduledDate, // Same as scheduledDate - the reminder time
    completed: false,
    createdAt: new Date().toISOString(),
  };

  // Save to Firestore - the real-time listener will update the UI
  const taskId = await saveTaskToFirestore(task);
  return taskId !== null;
}

async function removeTask(taskId) {
  if (!currentUser) return;

  // Delete from Firestore - the real-time listener will update the UI
  await deleteTaskFromFirestore(taskId);
}

async function updateTaskSchedule(taskId, scheduledDate) {
  if (!currentUser) return;

  // Parse the scheduledDate (ISO string) to extract the date part for dueDate
  // When new Date() is created from ISO string, getFullYear(), getMonth(), getDate()
  // return values in local timezone, which is what we want
  const scheduledDateObj = new Date(scheduledDate);

  // Get local date components to match the dropped date
  const year = scheduledDateObj.getFullYear();
  const month = String(scheduledDateObj.getMonth() + 1).padStart(2, "0");
  const day = String(scheduledDateObj.getDate()).padStart(2, "0");
  const dueDate = `${year}-${month}-${day}`;

  // Update in Firestore - the real-time listener will update the UI
  await updateTaskInFirestore(taskId, {
    dueDate: dueDate, // Update due date to match the dropped date
    scheduledDate: scheduledDate,
    reminderTime: scheduledDate,
  });
}

async function toggleTaskComplete(taskId) {
  if (!currentUser) return;

  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    // Update in Firestore - the real-time listener will update the UI
    await updateTaskInFirestore(taskId, {
      completed: !task.completed,
    });
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

  // Sort tasks based on selected sort type
  let sortedTasks;

  if (sortType === "none") {
    // Default: Show in creation order (by createdAt timestamp)
    sortedTasks = [...tasks].sort((a, b) => {
      // Sort by creation time (oldest first)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
  } else if (sortType === "priority") {
    // Sort by priority: High > Medium > Low > Unsure, then by due date, completed tasks last
    const priorityOrder = { High: 4, Medium: 3, Low: 2, Unsure: 1 };

    sortedTasks = [...tasks].sort((a, b) => {
      // Completed tasks go to the end
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      // Both are either completed or incomplete, sort by priority, then due date
      const priorityDiff =
        (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);

      // If priorities are different, return the difference
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // If priorities are the same, sort by due date
      const partsA = a.dueDate.split("-").map(Number);
      const partsB = b.dueDate.split("-").map(Number);
      const dateA = new Date(partsA[0], partsA[1] - 1, partsA[2]);
      const dateB = new Date(partsB[0], partsB[1] - 1, partsB[2]);
      return dateA - dateB;
    });
  } else if (sortType === "ddl") {
    // Sort by due date (DDL), completed tasks last
    sortedTasks = [...tasks].sort((a, b) => {
      // Completed tasks go to the end
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      // Both are either completed or incomplete, sort by due date
      const partsA = a.dueDate.split("-").map(Number);
      const partsB = b.dueDate.split("-").map(Number);
      const dateA = new Date(partsA[0], partsA[1] - 1, partsA[2]);
      const dateB = new Date(partsB[0], partsB[1] - 1, partsB[2]);
      return dateA - dateB;
    });
  } else {
    // Fallback to creation order
    sortedTasks = [...tasks].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
  }

  sortedTasks.forEach((task) => {
    const taskCard = createTaskCard(task);
    taskList.appendChild(taskCard);
  });
}

function createTaskCard(task) {
  const card = document.createElement("div");
  const isCompleted = task.completed || false;
  card.className = `task-card ${isCompleted ? "task-completed" : ""}`;
  card.draggable = !isCompleted; // Disable dragging for completed tasks
  card.dataset.taskId = task.id;

  const priorityClass = `priority-${task.priority.toLowerCase()}`;

  // Parse dueDate correctly - it's stored as YYYY-MM-DD string
  // Parse as local date to avoid timezone issues
  const dueDateParts = task.dueDate.split("-").map(Number);
  const dueDate = new Date(
    dueDateParts[0],
    dueDateParts[1] - 1,
    dueDateParts[2]
  );

  const formattedDate = dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  card.innerHTML = `
    <div class="task-card-header">
      <h3 class="task-title ${
        isCompleted ? "completed-text" : ""
      }">${escapeHtml(task.title)}</h3>
      <div class="task-card-actions">
        <button class="view-details-button" onclick="event.stopPropagation(); showTaskDetails('${
          task.id
        }')" title="View details">👁️</button>
        <button class="delete-task" onclick="event.stopPropagation(); handleDeleteTask('${
          task.id
        }')" title="Delete task">×</button>
      </div>
    </div>
    <div class="task-card-body">
      <div class="task-meta">
        <div class="task-date-container">
          <span class="task-date ${
            isCompleted ? "completed-text" : ""
          }">📅 ${formattedDate}</span>
          ${
            !isCompleted
              ? `<button class="edit-date-button" onclick="event.stopPropagation(); enableEditDueDate('${task.id}')" title="Edit due date">✏️</button>`
              : ""
          }
        </div>
        <span class="task-priority ${priorityClass}">${task.priority}</span>
      </div>
      ${
        task.tag
          ? `<span class="task-tag ${
              isCompleted ? "completed-text" : ""
            }">${escapeHtml(task.tag)}</span>`
          : ""
      }
    </div>
  `;

  // Click to toggle completion
  card.addEventListener("click", (e) => {
    // Don't toggle if clicking on buttons
    if (
      !e.target.classList.contains("delete-task") &&
      !e.target.closest(".delete-task") &&
      !e.target.classList.contains("view-details-button") &&
      !e.target.closest(".view-details-button")
    ) {
      toggleTaskComplete(task.id);
    }
  });

  // Drag event handlers (only for incomplete tasks)
  if (!isCompleted) {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", task.id);
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
  }

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

  container.appendChild(dayGrid);

  // Render tasks for this day after the grid is appended
  renderTasksInDayView(dayGrid, year, month, day);
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
  // Create a date object for the cell day (at midnight)
  const cellDate = new Date(year, month, day);

  // Filter tasks that have scheduledDate or reminderTime matching this cell's day
  const scheduledTasks = tasks.filter((task) => {
    // Prefer reminderTime if available, otherwise use scheduledDate
    const dateToCheck = task.reminderTime || task.scheduledDate;
    if (!dateToCheck) return false;

    // Parse the scheduled date (it's stored as ISO string)
    const scheduled = new Date(dateToCheck);

    // Convert to local date for comparison (remove time component)
    const scheduledLocal = new Date(
      scheduled.getFullYear(),
      scheduled.getMonth(),
      scheduled.getDate()
    );

    // Use isSameDay function to ensure accurate date comparison
    return isSameDay(scheduledLocal, cellDate);
  });

  scheduledTasks.forEach((task) => {
    const taskBlock = document.createElement("div");
    const isCompleted = task.completed || false;
    taskBlock.className = `calendar-task priority-${task.priority.toLowerCase()} ${
      isCompleted ? "task-completed-calendar" : ""
    }`;
    taskBlock.textContent = task.title;
    taskBlock.title = `${task.title} - ${task.priority}${
      isCompleted ? " (Completed)" : ""
    }`;
    taskBlock.dataset.taskId = task.id;

    // Add click handler to toggle completion
    taskBlock.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTaskComplete(task.id);
    });

    cell.querySelector(".day-dropzone").appendChild(taskBlock);
  });
}

function renderTasksInDayView(container, year, month, day) {
  // Create a date object for the current day being viewed (at midnight)
  const currentDayDate = new Date(year, month, day);

  // Filter tasks that have scheduledDate or reminderTime matching the current day
  const scheduledTasks = tasks.filter((task) => {
    // Prefer reminderTime if available, otherwise use scheduledDate
    const dateToCheck = task.reminderTime || task.scheduledDate;
    if (!dateToCheck) return false;

    // Parse the scheduled date (it's stored as ISO string)
    const scheduled = new Date(dateToCheck);

    // Convert to local date for comparison (remove time component)
    const scheduledLocal = new Date(
      scheduled.getFullYear(),
      scheduled.getMonth(),
      scheduled.getDate()
    );

    // Use isSameDay function to ensure accurate date comparison
    // This ensures tasks only show on the exact day they are scheduled
    return isSameDay(scheduledLocal, currentDayDate);
  });

  // Position tasks by hour (rounded down to nearest hour)
  scheduledTasks.forEach((task) => {
    // Use reminderTime if available, otherwise use scheduledDate
    const dateToUse = task.reminderTime || task.scheduledDate;
    // Parse the scheduled date (it's stored as ISO string)
    const scheduled = new Date(dateToUse);

    // Get local hour (not UTC) for proper display
    const hour = scheduled.getHours(); // Local hour 0-23
    const roundedHour = Math.max(0, Math.min(23, hour));

    // Find the dropzone with matching hour attribute
    const dropzone = container.querySelector(
      `.day-cell-dropzone[data-hour="${roundedHour}"]`
    );
    if (dropzone) {
      const taskBlock = document.createElement("div");
      const isCompleted = task.completed || false;
      taskBlock.className = `calendar-task priority-${task.priority.toLowerCase()} ${
        isCompleted ? "task-completed-calendar" : ""
      }`;
      taskBlock.textContent = task.title;

      // Show the actual reminder time in tooltip (in local time)
      const actualTime = scheduled.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      taskBlock.title = `${task.title} - ${task.priority} - ${actualTime}${
        isCompleted ? " (Completed)" : ""
      }`;
      taskBlock.dataset.taskId = task.id;

      // Add click handler to toggle completion
      taskBlock.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTaskComplete(task.id);
      });

      dropzone.appendChild(taskBlock);
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

// Sort Functions
window.changeSortType = function (type) {
  sortType = type;

  // Update select element to reflect current selection
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.value = type;
  }

  // Re-render tasks with new sort order
  renderTasks();
};

// Filter Functions
window.openFilterModal = function () {
  const modal = document.getElementById("filterModalOverlay");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
};

window.closeFilterModal = function () {
  const modal = document.getElementById("filterModalOverlay");
  modal.style.display = "none";
  document.body.style.overflow = "";
};

// Modal Functions
window.openCreateTaskModal = function () {
  const modal = document.getElementById("modalOverlay");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Reset form and button state
  const form = document.getElementById("createTaskForm");
  form.reset();

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Save Task";
  }

  // Set today as default date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("taskDate").value = today;

  // Set current time + 1 hour as default time
  const oneHourLater = new Date();
  oneHourLater.setHours(oneHourLater.getHours() + 1);
  const timeString = oneHourLater.toTimeString().slice(0, 5);
  document.getElementById("taskTime").value = timeString;
};

window.closeCreateTaskModal = function () {
  const modal = document.getElementById("modalOverlay");
  modal.style.display = "none";
  document.body.style.overflow = "";

  // Reset form
  const form = document.getElementById("createTaskForm");
  form.reset();

  // Reset submit button state (in case it was left in "Saving..." state)
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Save Task";
  }
};

window.handleCreateTask = async function (event) {
  event.preventDefault();

  const formData = {
    title: document.getElementById("taskTitle").value.trim(),
    description: document.getElementById("taskDescription").value.trim(),
    taskDate: document.getElementById("taskDate").value,
    taskTime: document.getElementById("taskTime").value,
    priority: document.getElementById("taskPriority").value,
    tag: document.getElementById("taskTag").value,
  };

  // Validate required fields
  if (!formData.title) {
    alert("Please enter a task title");
    return;
  }

  if (!formData.taskDate || !formData.taskTime) {
    alert("Please select a date and time");
    return;
  }

  // Show loading state (optional: you can add a loading spinner)
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton ? submitButton.textContent : "";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";
  }

  try {
    const success = await addTask(formData);
    if (success) {
      // Reset button state before closing modal
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
      closeCreateTaskModal();
    } else {
      // Error already shown in saveTaskToFirestore, but keep modal open
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  } catch (error) {
    console.error("Error creating task:", error);
    alert("Failed to create task. Please try again.");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
};

window.handleDeleteTask = function (taskId) {
  if (confirm("Are you sure you want to delete this task?")) {
    removeTask(taskId);
  }
};

// Edit Due Date Functions
window.enableEditDueDate = function (taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.completed) return;

  // Find the task card - use dataset.taskId attribute
  const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
  if (!taskCard) return;

  const dateContainer = taskCard.querySelector(".task-date-container");
  if (!dateContainer) return;

  // Get current due date
  const currentDueDate = task.dueDate; // YYYY-MM-DD format

  // Create edit UI
  const editHtml = `
    <div class="edit-date-input-container">
      <input
        type="date"
        class="edit-date-input"
        id="editDueDateInput_${taskId}"
        value="${currentDueDate}"
        min="${new Date().toISOString().split("T")[0]}"
      />
      <div class="edit-date-actions">
        <button class="save-date-button" onclick="event.stopPropagation(); saveDueDate('${taskId}')">✓</button>
        <button class="cancel-date-button" onclick="event.stopPropagation(); cancelEditDueDate('${taskId}', '${currentDueDate}')">×</button>
      </div>
    </div>
  `;

  // Replace date display with edit input
  dateContainer.innerHTML = editHtml;

  // Focus on date input
  setTimeout(() => {
    const input = document.getElementById(`editDueDateInput_${taskId}`);
    if (input) {
      input.focus();
      input.select();
    }
  }, 10);

  // Handle Enter key
  const input = document.getElementById(`editDueDateInput_${taskId}`);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveDueDate(taskId);
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditDueDate(taskId, currentDueDate);
      }
    });
  }
};

window.cancelEditDueDate = function (taskId, originalDate) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  // Parse original date for display
  const dateParts = originalDate.split("-").map(Number);
  const dueDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const formattedDate = dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Restore original display - use dataset.taskId attribute
  const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
  if (!taskCard) return;

  const dateContainer = taskCard.querySelector(".task-date-container");
  if (dateContainer) {
    const isCompleted = task.completed || false;
    dateContainer.innerHTML = `
      <span class="task-date ${
        isCompleted ? "completed-text" : ""
      }">📅 ${formattedDate}</span>
      ${
        !isCompleted
          ? `<button class="edit-date-button" onclick="event.stopPropagation(); enableEditDueDate('${taskId}')" title="Edit due date">✏️</button>`
          : ""
      }
    `;
  }
};

window.saveDueDate = async function (taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.completed) return;

  const input = document.getElementById(`editDueDateInput_${taskId}`);
  if (!input) return;

  const newDueDate = input.value.trim();
  if (!newDueDate) {
    alert("Please select a date");
    return;
  }

  // Disable input during save
  input.disabled = true;

  try {
    // Parse new due date
    const [year, month, day] = newDueDate.split("-").map(Number);
    const newDateObj = new Date(year, month - 1, day);

    // Update scheduledDate and reminderTime to match new date
    // Keep the same time from existing scheduledDate if available
    let newScheduledDate = null;
    if (task.scheduledDate || task.reminderTime) {
      const oldScheduled = new Date(task.scheduledDate || task.reminderTime);
      // Preserve the time from old scheduledDate, update to new date
      newScheduledDate = new Date(
        year,
        month - 1,
        day,
        oldScheduled.getHours(),
        oldScheduled.getMinutes()
      );
    } else {
      // If no scheduled time, set to noon of the new date
      newScheduledDate = new Date(year, month - 1, day, 12, 0);
    }

    // Update task in Firestore
    await updateTaskInFirestore(taskId, {
      dueDate: newDueDate,
      scheduledDate: newScheduledDate.toISOString(),
      reminderTime: newScheduledDate.toISOString(),
    });

    // Re-render will happen automatically via real-time listener
  } catch (error) {
    console.error("Error updating due date:", error);
    alert("Failed to update due date. Please try again.");
    input.disabled = false;
  }
};

// Task Details Functions
window.showTaskDetails = function (taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const modal = document.getElementById("taskDetailsModal");
  const titleElement = document.getElementById("taskDetailsTitle");
  const contentElement = document.getElementById("taskDetailsContent");

  titleElement.textContent = task.title;

  // Format dates - parse dueDate correctly as local date
  const dueDateParts = task.dueDate.split("-").map(Number);
  const dueDate = new Date(
    dueDateParts[0],
    dueDateParts[1] - 1,
    dueDateParts[2]
  );
  const formattedDueDate = dueDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let scheduledInfo = "Not scheduled";
  if (task.reminderTime || task.scheduledDate) {
    // scheduledDate is stored as ISO string, parse as is
    const scheduledDate = new Date(task.reminderTime || task.scheduledDate);
    scheduledInfo = scheduledDate.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  const createdAt = new Date(task.createdAt);
  const formattedCreatedAt = createdAt.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const priorityClass = `priority-${task.priority.toLowerCase()}`;
  const statusText = task.completed ? "Completed ✓" : "Pending";
  const statusClass = task.completed
    ? "task-status-completed"
    : "task-status-pending";

  contentElement.innerHTML = `
    <div class="task-detail-section">
      <label>Status</label>
      <div class="task-detail-value ${statusClass}">${statusText}</div>
    </div>

    <div class="task-detail-section">
      <label>Description</label>
      <div class="task-detail-value">${
        task.description || "No description provided"
      }</div>
    </div>

    <div class="task-detail-section">
      <label>Due Date</label>
      <div class="task-detail-value">${formattedDueDate}</div>
    </div>

    <div class="task-detail-section">
      <label>Scheduled Time</label>
      <div class="task-detail-value">${scheduledInfo}</div>
    </div>

    <div class="task-detail-section">
      <label>Priority</label>
      <div class="task-detail-value">
        <span class="task-priority ${priorityClass}">${task.priority}</span>
      </div>
    </div>

    ${
      task.tag
        ? `
    <div class="task-detail-section">
      <label>Tag</label>
      <div class="task-detail-value">
        <span class="task-tag">${escapeHtml(task.tag)}</span>
      </div>
    </div>
    `
        : ""
    }

    <div class="task-detail-section">
      <label>Created At</label>
      <div class="task-detail-value">${formattedCreatedAt}</div>
    </div>
  `;

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
};

window.closeTaskDetailsModal = function () {
  const modal = document.getElementById("taskDetailsModal");
  modal.style.display = "none";
  document.body.style.overflow = "";
};

// User Menu Functions
window.toggleUserMenu = function () {
  const dropdown = document.getElementById("userMenuDropdown");
  dropdown.classList.toggle("show");
};

window.handleProfile = function () {
  window.location.href = "Profile.html";
  document.getElementById("userMenuDropdown").classList.remove("show");
};

window.handleSignOut = async function () {
  try {
    await signOut(auth);
    window.location.href = "index.html";
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
