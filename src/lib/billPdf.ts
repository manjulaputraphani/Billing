import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { invoke } from "@tauri-apps/api/core";
import type { SaleBillDetail } from "../db/billing";
import type { ShopDetails } from "../db/settings";
import { buildBillHtml } from "./printBill";

/** Safe bin file name: `SD-2026-000001.pdf`. */
export function billPdfName(billNo: string): string {
  const clean = billNo.replace(/[^A-Za-z0-9_-]/g, "");
  return `${clean || "bill"}.pdf`;
}

/** Render the invoice HTML into an A4 PDF (image-based; see docs/DECISIONS.md). */
async function buildBillPdfBytes(detail: SaleBillDetail, shop: ShopDetails): Promise<Uint8Array> {
  const frame = document.createElement("iframe");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);
  try {
    const doc = frame.contentWindow?.document;
    if (!doc) throw new Error("Could not render the invoice");
    doc.open();
    doc.write(buildBillHtml(detail, shop));
    doc.close();
    if (doc.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        frame.onload = () => resolve();
      });
    }
    const canvas = await html2canvas(doc.body, { scale: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = 210;
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWidth, imageHeight);
    return new Uint8Array(pdf.output("arraybuffer") as ArrayBuffer);
  } finally {
    frame.remove();
  }
}

/** Generate the bill PDF into the temp bin; returns the full path. */
export async function saveBillPdf(detail: SaleBillDetail, shop: ShopDetails): Promise<string> {
  const bytes = await buildBillPdfBytes(detail, shop);
  return invoke<string>("save_bill_pdf", {
    name: billPdfName(detail.billNo),
    bytes: Array.from(bytes),
  });
}

/** Delete a bin PDF after it was successfully sent. */
export function deleteBillPdf(path: string): Promise<void> {
  return invoke("delete_bill_pdf", { path });
}

/** Drop bin PDFs older than a day (called when Bills loads). */
export function purgeBillBin(): Promise<number> {
  return invoke("purge_bill_bin");
}