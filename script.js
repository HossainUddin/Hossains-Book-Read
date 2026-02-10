import * as pdfjsLib from "./pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.mjs";

const fileInput = document.getElementById("file-input");
const canvas = document.getElementById("pdf-render");
const ctx = canvas.getContext("2d");
const textLayer = document.getElementById("text-layer");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const pageInfo = document.getElementById("page-info");

let pdfDoc = null;
let pageNum = 1;
const scale = 1.5;

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  pdfDoc = await pdfjsLib.getDocument(url).promise;
  pageNum = 1;
  renderPage(pageNum);
});

async function renderPage(num) {
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  // TEXT LAYER
  textLayer.innerHTML = "";
  textLayer.style.width = viewport.width + "px";
  textLayer.style.height = viewport.height + "px";

  const textContent = await page.getTextContent();

  pdfjsLib.renderTextLayer({
    textContent,
    container: textLayer,
    viewport,
    textDivs: []
  });

  pageInfo.innerText = `${num} / ${pdfDoc.numPages}`;
}

// BUTTONS
prevBtn.onclick = () => {
  if (pageNum > 1) {
    pageNum--;
    renderPage(pageNum);
  }
};

nextBtn.onclick = () => {
  if (pageNum < pdfDoc.numPages) {
    pageNum++;
    renderPage(pageNum);
  }
};
