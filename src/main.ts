import './style.css';
import * as pdfjsLib from 'pdfjs-dist';

// Set strict worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const canvas = document.getElementById("pdf-render") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const textLayer = document.getElementById("text-layer") as HTMLDivElement;
const pdfWrapper = document.getElementById("pdf-wrapper") as HTMLDivElement;

const prevBtn = document.getElementById("prev") as HTMLButtonElement;
const nextBtn = document.getElementById("next") as HTMLButtonElement;
const pageInfo = document.getElementById("page-info") as HTMLSpanElement;

let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending: number | null = null;
let scale = 1.5;

/** 
 * Calculate scale to fit width of container
 */
function getScale(viewport: pdfjsLib.PageViewport): number {
  const containerWidth = pdfWrapper.clientWidth - 20; // verify padding
  if (containerWidth < viewport.width) {
     return containerWidth / (viewport.width / scale);
  }
  return 1.5; // default scale
}

/**
 * Render PDF Page
 */
async function renderPage(num: number) {
  pageRendering = true;
  
  if(!pdfDoc) return;

  // Clear previous text layer
  textLayer.innerHTML = '';

  const page = await pdfDoc.getPage(num);
  
  // Initial viewport to get dimensions
  let viewport = page.getViewport({ scale: 1.5 });
  
  // Calculate responsive scale
  const responsiveScale = getScale(viewport);
  viewport = page.getViewport({ scale: responsiveScale });

  // Update canvas dimensions
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Update text layer dimensions
  textLayer.style.width = `${viewport.width}px`;
  textLayer.style.height = `${viewport.height}px`;

  // Render context
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport
  };

  const renderTask = page.render(renderContext);

  // Wait for render to finish
  try {
    await renderTask.promise;
    pageRendering = false;

    // Render Text Layer
    const textContent = await page.getTextContent();
    // @ts-ignore
    pdfjsLib.renderTextLayer({
      textContent: textContent,
      container: textLayer,
      viewport: viewport,
      textDivs: []
    });

    if (pageNumPending !== null) {
      renderPage(pageNumPending);
      pageNumPending = null;
    }
  } catch (err) {
    console.error("Render Error:", err);
    pageRendering = false;
  }

  // Update page info
  pageInfo.textContent = `${num} / ${pdfDoc.numPages}`;
}

/**
 * Queue Rendering
 */
function queueRenderPage(num: number) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Navigation
 */
function onPrevPage() {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
}

function onNextPage() {
  if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
}

prevBtn.addEventListener('click', onPrevPage);
nextBtn.addEventListener('click', onNextPage);

/**
 * File Load
 */
fileInput.addEventListener("change", async (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;

  const file = files[0];
  const url = URL.createObjectURL(file);

  try {
    const loadingTask = pdfjsLib.getDocument(url);
    pdfDoc = await loadingTask.promise;
    
    pageNum = 1;
    renderPage(pageNum);
  } catch (err) {
    console.error("Error loading PDF:", err);
    alert("Error loading PDF. Please try another file.");
  }
});

/**
 * Responsive Resize
 */
let resizeTimeout: number;
window.addEventListener('resize', () => {
    if (!pdfDoc) return;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        renderPage(pageNum);
    }, 200);
});
