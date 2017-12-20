const NONCACHED_HOSTS = [
  "https://www.googleapis.com/",
  "https://firestore.googleapis.com"
];

const pending = {};

self.addEventListener("message", function(event) {
  pending[event.data.url].resolve(event.data.blob);
  delete pending[event.data.url];
});

self.addEventListener("fetch", function(event) {
  event.respondWith(
    (function() {
      const url = new URL(event.request.url);
      let delivery = Promise.resolve();

      if (
        event.clientId &&
        event.request.method == "GET" &&
        url.pathname.endsWith(".pgp")
      ) {
        console.log(`Potentially encrypted request found ${event.request.url}`);
        delivery = getCachedDecryptedBlobFromURL(event.request.url)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log(`Serving from cache.`);
              return cachedResponse;
            }

            return clients.get(event.clientId).then(client => {
              if (!client) {
                console.log("Client is dead, abort");
                return;
              }

              return getDecryptedBlobFromURL(client, event.request.url);
            });
          })
          .then(decryptedResponse => {
            if (!decryptedResponse) {
              console.log(
                "Decrypted response isn't valid. Fallback to original."
              );
              return;
            }

            return setCachedDecryptedBlobFromURL(
              event.request.url,
              decryptedResponse
            ).then(() => {
              console.log("Serving new decrypted response!");
              return decryptedResponse;
            });
          });
      }

      return delivery.then(resp => {
        return resp || fetch(event.request);
      });
    })()
  );
});

function getCachedDecryptedBlobFromURL(url) {
  return caches.open("decrypted_blobs").then(function(cache) {
    return cache.match(new Request(url)).then(function(response) {
      return response;
    });
  });
}

function setCachedDecryptedBlobFromURL(url, response) {
  return caches.open("decrypted_blobs").then(function(cache) {
    cache.put(new Request(url), response.clone());
  });
}

function getDecryptedBlobFromURL(client, url) {
  return fetch(new Request(url))
    .then(resp => {
      return resp.blob();
    })
    .then(blob => {
      if (blob.type == "application/octet-stream") {
        pending[url] = {};
        pending[url].promise = new Promise((resolve, reject) => {
          pending[url].resolve = resolve;
          pending[url].reject = reject;
        });

        client.postMessage({
          url,
          blob
        });

        return pending[url].promise.then(blob => {
          return new Response(blob);
        });
      }
    });
}
