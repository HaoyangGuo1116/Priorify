import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Initialize profile page
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
});

// Check authentication
function checkAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Not authenticated, redirect to login
      window.location.href = "Login.html";
    } else {
      // Authenticated, load user info and statistics
      loadUserInfo(user);
      loadStatistics(user);
    }
  });
}

// Load user information
function loadUserInfo(user) {
  const displayNameElement = document.getElementById("displayName");
  const userEmailElement = document.getElementById("userEmail");
  const userIdElement = document.getElementById("userId");
  const userNameElement = document.getElementById("userName");

  displayNameElement.textContent = user.displayName || "Not set";
  userEmailElement.textContent = user.email || "N/A";
  userIdElement.textContent = user.uid || "N/A";
  userNameElement.textContent = user.displayName || user.email || "User";
}

// Load user statistics
async function loadStatistics(user) {
  // Load tasks from Firestore
  const tasksRef = collection(db, "tasks");
  const q = query(tasksRef, where("userId", "==", user.uid));

  let tasks = [];
  try {
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      tasks.push(doc.data());
    });
  } catch (error) {
    console.error("Error loading tasks for statistics:", error);
    tasks = [];
  }

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Priority distribution
  const highPriorityCount = tasks.filter(
    (task) => task.priority === "High"
  ).length;
  const mediumPriorityCount = tasks.filter(
    (task) => task.priority === "Medium"
  ).length;
  const lowPriorityCount = tasks.filter(
    (task) => task.priority === "Low"
  ).length;

  // Update DOM
  document.getElementById("totalTasks").textContent = totalTasks;
  document.getElementById("completedTasks").textContent = completedTasks;
  document.getElementById("pendingTasks").textContent = pendingTasks;
  document.getElementById("completionRate").textContent = `${completionRate}%`;
  document.getElementById("highPriorityCount").textContent = highPriorityCount;
  document.getElementById("mediumPriorityCount").textContent =
    mediumPriorityCount;
  document.getElementById("lowPriorityCount").textContent = lowPriorityCount;
}

// User menu functions
window.toggleUserMenu = function () {
  const dropdown = document.getElementById("userMenuDropdown");
  dropdown.classList.toggle("show");
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
  if (userMenu && !userMenu.contains(e.target)) {
    const dropdown = document.getElementById("userMenuDropdown");
    if (dropdown) {
      dropdown.classList.remove("show");
    }
  }
});
