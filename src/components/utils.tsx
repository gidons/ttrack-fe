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