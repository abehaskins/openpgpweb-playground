const openpgp = require("openpgp");
openpgp.initWorker({ path: "/dist/artifacts/openpgp.worker.min.js" }); // set the relative web worker path

let singleton:PGPSingleton;

export class PGPSingleton {
  private privateKey: any;

  static GetInstance(): PGPSingleton {
    if (singleton) return singleton;
    else return singleton = new PGPSingleton();
  }

    Initialize(armoredPrivateKey: string, passphrase: string) {
        this.privateKey = openpgp.key.readArmored(armoredPrivateKey).keys[0];
        this.privateKey.decrypt(passphrase);

        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker.addEventListener("message", async event => {
            console.log(`Found an encrypted thing to parse!`, event.data);

            const fileArray = await ReadFile(event.data.blob);

            const options = {
                message: openpgp.message.read(fileArray),
                privateKey: this.privateKey,
                format: "binary"
            };

            const decrypted = await openpgp.decrypt(options);
            const response = event.data;
            response.blob = new Blob([decrypted.data]);

            console.log("Sending decrypted response to ServiceWorker", response);

            navigator.serviceWorker.controller.postMessage(response);
        });
    }


    async GetEncryptedBlob(
        file: File,
        publicKeys: string[]
    ) {
        publicKeys = publicKeys.map(apk => {
            return openpgp.key.readArmored(apk).keys[0];
        });

        const options = {
            data: await ReadFile(file),
            armor: false,
            publicKeys
        };

        const ciphertext = await openpgp.encrypt(options);
        return ciphertext.message.packets.write();
    }

    async GetEncryptedString(
        str: string,
        publicKeys: string[]
    ) {
        publicKeys = publicKeys.map(apk => {
            return openpgp.key.readArmored(apk).keys[0];
        });

        const options = {
            data: str,
            armor: true,
            publicKeys
        };

        const ciphertext = await openpgp.encrypt(options);
        return ciphertext.data;
    }

    async GetDecryptedString(
        encryptedString: string
    ) {
        const options = {
            message: openpgp.message.readArmored(encryptedString),
            privateKey: this.privateKey
        };

        const ciphertext = await openpgp.decrypt(options);
        return ciphertext.data;
    }

    async ClearBlobCache() {
        await caches.delete("decrypted_blobs");
    }
}

export async function GenerateKeyPair(
    name: string,
    email: string,
    passphrase: string
) {
    var options = {
        userIds: [{ name, email }],
        numBits: 4096,
        passphrase
    };

    const key = await openpgp.generateKey(options);

    const privateKey = key.privateKeyArmored;
    const publicKey = key.publicKeyArmored;
    return { privateKey, publicKey };
}

function ReadFile(data: File | Blob): Promise<Uint8Array> {
  return new Promise((resolve, _) => {
    const reader = new FileReader();

    reader.onload = async function() {
      resolve(new Uint8Array(this.result));
    };
    reader.readAsArrayBuffer(data);
  });
}
