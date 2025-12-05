import { auth } from "./firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Check if user is already authenticated
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, redirect to dashboard
    window.location.href = "Dashboard.html";
  }
});

// Tab switching functionality
window.switchTab = function (tab) {
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const errorMessage = document.getElementById("errorMessage");

  // Hide error message when switching tabs
  errorMessage.style.display = "none";

  if (tab === "login") {
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
  } else {
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    signupForm.classList.add("active");
    loginForm.classList.remove("active");
  }
};

// Show error message
function showError(message) {
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

// Hide error message
function hideError() {
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.style.display = "none";
}

// Set loading state for button
function setLoading(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (isLoading) {
    button.disabled = true;
    const originalText = button.textContent;
    button.dataset.originalText = originalText;
    button.textContent =
      buttonId === "loginButton" ? "Logging in..." : "Creating account...";
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

// Handle login
window.handleLogin = async function (event) {
  event.preventDefault();
  hideError();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const loginButton = document.getElementById("loginButton");

  setLoading("loginButton", true);

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Success - redirect will happen via onAuthStateChanged
    window.location.href = "Dashboard.html";
  } catch (error) {
    setLoading("loginButton", false);
    let errorMessage = "Invalid email or password.";

    // Provide more specific error messages
    switch (error.code) {
      case "auth/invalid-email":
        errorMessage = "Invalid email address.";
        break;
      case "auth/user-disabled":
        errorMessage = "This account has been disabled.";
        break;
      case "auth/user-not-found":
        errorMessage = "No account found with this email.";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password.";
        break;
      case "auth/invalid-credential":
        errorMessage = "Invalid email or password.";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later.";
        break;
      default:
        errorMessage = error.message || "An error occurred. Please try again.";
    }

    showError(errorMessage);
  }
};

// Handle signup
window.handleSignup = async function (event) {
  event.preventDefault();
  hideError();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById(
    "signupConfirmPassword"
  ).value;
  const passwordMatchError = document.getElementById("passwordMatchError");

  // Validate password match
  if (password !== confirmPassword) {
    passwordMatchError.style.display = "block";
    return;
  } else {
    passwordMatchError.style.display = "none";
  }

  // Validate password length
  if (password.length < 6) {
    showError("Password must be at least 6 characters long.");
    return;
  }

  setLoading("signupButton", true);

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Update profile with name if provided
    if (name) {
      await updateProfile(userCredential.user, {
        displayName: name,
      });
    }

    // Success - redirect will happen via onAuthStateChanged
    window.location.href = "Dashboard.html";
  } catch (error) {
    setLoading("signupButton", false);
    let errorMessage = "An error occurred. Please try again.";

    // Provide more specific error messages
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "This email is already in use.";
        break;
      case "auth/invalid-email":
        errorMessage = "Invalid email address.";
        break;
      case "auth/operation-not-allowed":
        errorMessage = "Email/password accounts are not enabled.";
        break;
      case "auth/weak-password":
        errorMessage = "Password is too weak. Please use a stronger password.";
        break;
      default:
        errorMessage = error.message || "An error occurred. Please try again.";
    }

    showError(errorMessage);
  }
};
