export function download(url: string | null) {
    if (url == null) {
        return;
    }
    console.log("Downloading from " + url)
    const link = document.createElement('a');
    link.href = url;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);            
}

export async function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function isEmpty(obj: object) {
  return Object.keys(obj).length === 0
}

export const SHARP_SYM = '♯'
export const FLAT_SYM = '♭'
export function displayKeyValue(value: string) {
  return value.replace('#', SHARP_SYM).replace('b', FLAT_SYM)
}

export function topLevelObj(o: object) {
  return `{ ${Object.keys(o).map(k => `${k}: ${o[k]}`).join(", ") }`
}

export function toJson(o: object) {
  const circularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "<circRef>"
        }
        seen.add(value);
      }
      return value;
    };
  };

  return JSON.stringify(o, circularReplacer())
}