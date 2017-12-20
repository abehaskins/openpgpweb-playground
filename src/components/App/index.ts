// VueJS modules
import Vue from "vue";
import { Component, Inject, Model, Prop, Watch } from "vue-property-decorator";

import Boilerplate from "../Boilerplate";

import FirebaseSingleton from "../../services/FirebaseSingleton";
import { ReadFile } from "../../utils";
import {pubkey} from "../../keys";

const openpgp = require("openpgp");
(window as any).openpgp = openpgp;

@Component({
  components: { Boilerplate }
})
export default class App extends Vue {
  name = "app";
  fst: FirebaseSingleton;
  secret = "hello world";
  img_src = "";

  async mounted() {
    this.fst = await FirebaseSingleton.GetInstance();

    await this.DoDecryptedFileDownload();
  }

  async DoEncryptedFileUpload(plaindata: Uint8Array) {
    const options = {
      data: plaindata,
      publicKeys: openpgp.key.readArmored(pubkey).keys,
      armor: false
    };

    const ciphertext = await openpgp.encrypt(options);
    const encrypted = ciphertext.message.packets.write();

    const storageRef = this.fst.storage.ref("/encrypted/file.pgp");
    const snapshot = await storageRef.put(encrypted);
    console.log(snapshot.state);
  }

  async DoDecryptedFileDownload() {
    const self = this;
    const url = await this.fst.storage
      .ref("/encrypted/file.pgp")
      .getDownloadURL();

    self.img_src = url;
  }

  async OnFileChanged(e: Event) {
    const self = this;
    const file = (e.target as HTMLInputElement).files[0];
    const array = await ReadFile(file);
    await self.DoEncryptedFileUpload(array);
  }
}

require("./template.html")(App);
