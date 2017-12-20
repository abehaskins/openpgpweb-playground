export const isTesting = process.env.NODE_ENV == "test";

export function ParseURL(href: string) {
  var parser = document.createElement("a");
  // parser.href = "http://example.com:3000/pathname/?search=test#hash";
  parser.href = href;

  // parser.protocol; // => "http:"
  // parser.hostname; // => "example.com"
  // parser.port;     // => "3000"
  // parser.pathname; // => "/pathname/"
  // parser.search;   // => "?search=test"
  // parser.hash;     // => "#hash"
  // parser.host;     // => "example.com:3000"

  return parser;
}

export function ReadFile(data: File | Blob): Promise<Uint8Array> {
  return new Promise((resolve, _) => {
    const reader = new FileReader();

    reader.onload = async function() {
      resolve(new Uint8Array(this.result));
    };
    reader.readAsArrayBuffer(data);
  });
}
