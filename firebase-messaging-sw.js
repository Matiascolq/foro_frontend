importScripts("https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBGnkweRgtrVXK2faPz4lA6t82z8pelzM8",
  authDomain: "foroudp-push.firebaseapp.com",
  projectId: "foroudp-push",
  storageBucket: "foroudp-push.firebasestorage.app",
  messagingSenderId: "487382295646",
  appId: "1:487382295646:web:13396681e226472b5b00cf",
  measurementId: "G-JT655HQZKL"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("📩 Notificación Background:", payload);

  const notificationTitle = payload.notification?.title || "Nuevo mensaje";
  const notificationOptions = {
    body: payload.notification?.body || "Tienes nueva actividad",
    icon: "/logo192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
