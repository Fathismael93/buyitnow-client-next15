// Script pour enregistrer le service worker

// Ne s'exécute que dans un navigateur compatible et en production
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', function () {
    // Délai de 3 secondes pour ne pas bloquer le chargement initial de la page
    setTimeout(() => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(function (registration) {
          console.log(
            'Service Worker enregistré avec succès:',
            registration.scope,
          );

          // Vérifier si un nouveau service worker est en attente d'installation
          if (registration.waiting) {
            // Notifier l'utilisateur de la mise à jour
            notifyUpdate(registration);
          }

          // Écouter les mises à jour du service worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                notifyUpdate(registration);
              }
            });
          });
        })
        .catch(function (error) {
          console.log("Échec de l'enregistrement du Service Worker:", error);
        });
    }, 3000);

    // Recharger la page lors d'un changement de service worker contrôlant la page
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// Fonction pour notifier l'utilisateur d'une mise à jour
function notifyUpdate(registration) {
  // Créer la notification de mise à jour
  const updateNotification = document.createElement('div');
  updateNotification.className = 'sw-update-notification';
  updateNotification.innerHTML = `
      <div class="sw-update-content">
        <p>Une nouvelle version de l'application est disponible!</p>
        <button id="sw-update-button">Mettre à jour</button>
      </div>
    `;

  // Ajouter le style de la notification
  const style = document.createElement('style');
  style.textContent = `
      .sw-update-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #2563eb;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        max-width: 300px;
        animation: sw-notification-fadein 0.5s;
      }
      
      .sw-update-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      
      .sw-update-content p {
        margin: 0 0 12px 0;
        font-size: 14px;
      }
      
      #sw-update-button {
        padding: 8px 16px;
        background-color: white;
        color: #2563eb;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;
      }
      
      #sw-update-button:hover {
        background-color: #f3f4f6;
      }
      
      @keyframes sw-notification-fadein {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;

  // Ajouter la notification et le style au document
  document.head.appendChild(style);
  document.body.appendChild(updateNotification);

  // Ajouter l'événement de clic pour mettre à jour
  document.getElementById('sw-update-button').addEventListener('click', () => {
    if (registration.waiting) {
      // Demander au service worker en attente de prendre le contrôle
      registration.waiting.postMessage({ action: 'skipWaiting' });
    }

    // Nettoyer la notification
    updateNotification.remove();
    style.remove();
  });
}
