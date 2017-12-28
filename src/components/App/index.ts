// VueJS modules
import Vue from "vue";
import { Component, Inject, Model, Prop, Watch } from "vue-property-decorator";

import Boilerplate from "../Boilerplate";

import FirebaseSingleton from "../../services/FirebaseSingleton";
import { PGPSingleton } from "../../pgp";
import { pubkey, will_pubkey } from "../../keys";

@Component({
  components: { Boilerplate }
})
export default class App extends Vue {
  name = "app";
  fst: FirebaseSingleton;
  pgp: PGPSingleton;
  img_src = "";

  async mounted() {
    this.fst = await FirebaseSingleton.GetInstance();
    this.pgp = await PGPSingleton.GetInstance();

    this.img_src = await this.fst.storage
        .ref("/encrypted/file.pgp")
        .getDownloadURL();

    const msg = await this.pgp.GetEncryptedString("hi there", [will_pubkey]);
    const plaintext = await this.pgp.GetDecryptedString(msg);

    console.log(msg, plaintext);
  }

  async OnFileChanged(e: Event) {
    const file = (e.target as HTMLInputElement).files[0];
    const ref = this.fst.storage.ref("/encrypted/file.pgp");

    const blob = await this.pgp.GetEncryptedBlob(file, [pubkey, will_pubkey]);
    const snapshot = await ref.put(blob);

    return snapshot.state;
  }

  async ClearCache() {
    await this.pgp.ClearBlobCache();
    console.log("Decrypted blob cache cleared!");
  }
}

require("./template.html")(App);
