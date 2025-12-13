import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Global state
let currentUser = null;

// Initialize profile page
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
});

// Check authentication
function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Not authenticated, redirect to login
      window.location.href = "Login.html";
    } else {
      // Authenticated, set current user and load info
      currentUser = user;
      await loadUserInfo(user);
      loadStatistics(user);
    }
  });
}

// Load user information
async function loadUserInfo(user) {
  const displayNameElement = document.getElementById("displayName");
  const userEmailElement = document.getElementById("userEmail");
  const userIdElement = document.getElementById("userId");
  const userNameElement = document.getElementById("userName");

  // Try to load displayName from Firestore first, fallback to Auth
  let displayName = user.displayName || null;

  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.displayName) {
        displayName = userData.displayName;
      }
    }
  } catch (error) {
    console.error("Error loading user data from Firestore:", error);
  }

  // Update display
  const displayNameText = user.isAnonymous
    ? "Guest User"
    : displayName || "Not set";

  displayNameElement.textContent = displayNameText;
  userEmailElement.textContent = user.isAnonymous
    ? "Anonymous account"
    : user.email || "N/A";
  userIdElement.textContent = user.uid || "N/A";
  userNameElement.textContent = user.isAnonymous
    ? "Guest"
    : displayName || user.email || "User";

  // Disable edit for anonymous users
  const editButton = document.getElementById("editDisplayNameBtn");
  if (editButton) {
    if (user.isAnonymous) {
      editButton.style.display = "none";
    } else {
      editButton.style.display = "block";
    }
  }
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

// Display Name Edit Functions
window.enableEditDisplayName = function () {
  if (!currentUser || currentUser.isAnonymous) {
    alert("Anonymous users cannot modify their display names.");
    return;
  }

  const displayNameElement = document.getElementById("displayName");
  const displayNameDisplay = document.getElementById("displayNameDisplay");
  const displayNameEdit = document.getElementById("displayNameEdit");
  const displayNameInput = document.getElementById("displayNameInput");

  // Get current display name
  const currentDisplayName = displayNameElement.textContent.trim();

  // Set input value (remove "Not set" if it's the placeholder)
  displayNameInput.value =
    currentDisplayName === "Not set" ? "" : currentDisplayName;

  // Show edit mode, hide display mode
  displayNameDisplay.style.display = "none";
  displayNameEdit.style.display = "block";

  // Focus on input
  setTimeout(() => {
    displayNameInput.focus();
    displayNameInput.select();
  }, 10);
};

window.cancelEditDisplayName = function () {
  const displayNameDisplay = document.getElementById("displayNameDisplay");
  const displayNameEdit = document.getElementById("displayNameEdit");
  const displayNameInput = document.getElementById("displayNameInput");

  // Reset input
  displayNameInput.value = "";

  // Show display mode, hide edit mode
  displayNameDisplay.style.display = "flex";
  displayNameEdit.style.display = "none";
};

window.saveDisplayName = async function () {
  if (!currentUser || currentUser.isAnonymous) {
    alert("Anonymous users cannot modify their display names.");
    return;
  }

  const displayNameInput = document.getElementById("displayNameInput");
  const newDisplayName = displayNameInput.value.trim();

  // Validate
  if (newDisplayName.length === 0) {
    alert("Display name cannot be left blank");
    return;
  }

  if (newDisplayName.length > 50) {
    alert("Display names cannot exceed 50 characters");
    return;
  }

  // Disable input and show loading
  displayNameInput.disabled = true;
  const saveButton = document.querySelector(".save-button");
  const cancelButton = document.querySelector(".cancel-button");
  const originalSaveText = saveButton.textContent;
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  cancelButton.disabled = true;

  try {
    // Update Firebase Auth profile
    await updateProfile(currentUser, {
      displayName: newDisplayName,
    });

    // Save to Firestore users collection
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(
      userDocRef,
      {
        displayName: newDisplayName,
        email: currentUser.email,
        uid: currentUser.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Update UI
    const displayNameElement = document.getElementById("displayName");
    const userNameElement = document.getElementById("userName");

    displayNameElement.textContent = newDisplayName;
    userNameElement.textContent = newDisplayName;

    // Switch back to display mode
    cancelEditDisplayName();

    // Show success message
    alert("Display name has been updated");
  } catch (error) {
    console.error("Error updating display name:", error);

    let errorMessage = "Failed to update display name. Please try again";
    if (error.code === "permission-denied") {
      errorMessage =
        "You do not have permission to update. Please check your login status";
    } else if (error.message) {
      errorMessage = `Update failed: ${error.message}`;
    }

    alert(errorMessage);
  } finally {
    // Re-enable input and buttons
    displayNameInput.disabled = false;
    saveButton.disabled = false;
    saveButton.textContent = originalSaveText;
    cancelButton.disabled = false;
  }
};

// Allow saving with Enter key
document.addEventListener("DOMContentLoaded", () => {
  // This will run after the page loads
  setTimeout(() => {
    const displayNameInput = document.getElementById("displayNameInput");
    if (displayNameInput) {
      displayNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          saveDisplayName();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelEditDisplayName();
        }
      });
    }
  }, 100);
});
