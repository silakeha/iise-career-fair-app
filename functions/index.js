/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at
 * https://firebase.google.com/docs/functions
 */

const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialize Admin SDK
// When deployed, this automatically uses the project's default credentials
// Explicitly set project ID to ensure consistency
admin.initializeApp({
  projectId: "iise-care",
});

exports.createRecruiterAccount = onCall(
    {
      region: "us-central1",
      enforceAppCheck: false,
    },
    async (request) => {
      const data = request.data;
      // Log context for debugging - check all available properties
      // These logs will appear in Firebase Console -> Functions -> Logs
      console.log("=== FUNCTION CALLED ===");
      console.log("request.auth exists:", !!request.auth);
      console.log("request.auth.uid:", request.auth?.uid);
      console.log("request.auth.token.email:", request.auth?.token?.email);
      console.log("All request keys:", Object.keys(request || {}));
      // Don't stringify the entire request - it contains circular references
      // Log only the relevant parts
      console.log("Request data:", JSON.stringify(data, null, 2));
      console.log("Request auth info:", {
        uid: request.auth?.uid,
        email: request.auth?.token?.email,
      });
      // Verify the caller is authenticated
      // For callable functions v2, request.auth should be present
      // if user is authenticated
      if (!request.auth || !request.auth.uid) {
        console.error("=== AUTHENTICATION FAILED ===");
        console.error("request.auth is:", request.auth);
        console.error("request.auth type:", typeof request.auth);
        console.error("request keys:", Object.keys(request || {}));
        // Don't stringify the entire request - it contains circular references
        console.error("Request data:", JSON.stringify(data, null, 2));
        const {HttpsError} = require("firebase-functions/v2/https");
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated. " +
            "Please ensure you are logged in.",
        );
      }

      console.log("=== AUTHENTICATION SUCCESS ===");
      console.log("Authenticated user UID:", request.auth.uid);
      console.log(
          "Authenticated user email:",
          request.auth.token?.email,
      );

      const userDoc = await admin.firestore()
          .collection("users")
          .doc(request.auth.uid)
          .get();
      if (!userDoc.exists || userDoc.data().role !== "organizer") {
        const {HttpsError} = require("firebase-functions/v2/https");
        throw new HttpsError(
            "permission-denied",
            "Only organizers can create recruiter accounts",
        );
      }

      const {email, name, companyName} = data;

      if (!email || !name || !companyName) {
        const {HttpsError} = require("firebase-functions/v2/https");
        throw new HttpsError(
            "invalid-argument",
            "Missing required fields",
        );
      }

      try {
        // Create user using Admin SDK (doesn't sign in)
        const userRecord = await admin.auth().createUser({
          email: email,
          emailVerified: false,
          // Generate a random password - user will reset it via email
          password: Math.random().toString(36).slice(-12) +
            Math.random().toString(36).slice(-12) + "A1!",
        });

        // Create user document in Firestore
        await admin.firestore()
            .collection("users")
            .doc(userRecord.uid)
            .set({
              email: email,
              name: name,
              role: "recruiter",
              companyName: companyName,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        // Password reset email will be sent from frontend

        return {
          success: true,
          uid: userRecord.uid,
          email: email,
          message: "Recruiter account created successfully",
        };
      } catch (error) {
        console.error("Error creating recruiter:", error);
        const {HttpsError} = require("firebase-functions/v2/https");
        throw new HttpsError(
            "internal",
            "Error creating recruiter account",
        );
      }
    },
);
