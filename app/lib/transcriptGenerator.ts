import { jsPDF } from "jspdf";
import { Message, MessageSender } from "@/components/logic/context";

export interface TranscriptMetadata {
  sessionDate: string;
  sessionDuration?: string;
  avatarName?: string;
}

export function generateTranscriptPDF(
  messages: Message[],
  metadata?: TranscriptMetadata
) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Add header
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("BrewSpot Becca Conversation Transcript", margin, yPosition);
  yPosition += 12;

  // Add metadata
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);

  if (metadata?.sessionDate) {
    pdf.text(`Session Date: ${metadata.sessionDate}`, margin, yPosition);
    yPosition += 6;
  }

  if (metadata?.sessionDuration) {
    pdf.text(`Duration: ${metadata.sessionDuration}`, margin, yPosition);
    yPosition += 6;
  }

  if (metadata?.avatarName) {
    pdf.text(`Avatar: ${metadata.avatarName}`, margin, yPosition);
    yPosition += 6;
  }

  // Add separator line
  yPosition += 4;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Reset text color for messages
  pdf.setTextColor(0, 0, 0);

  // Add messages
  messages.forEach((message, index) => {
    const isUser = message.sender === MessageSender.CLIENT;
    const senderLabel = isUser ? "User" : "Becca";

    // Check if we need a new page before adding message
    checkPageBreak(20);

    // Add sender label
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");

    // Set color: Blue for user, coffee brown for Becca
    if (isUser) {
      pdf.setTextColor(50, 100, 200);
    } else {
      pdf.setTextColor(184, 114, 65);
    }

    pdf.text(senderLabel + ":", margin, yPosition);
    yPosition += 6;

    // Add message content
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);

    const lines = pdf.splitTextToSize(message.content, maxWidth);

    lines.forEach((line: string) => {
      checkPageBreak(6);
      pdf.text(line, margin + 5, yPosition);
      yPosition += 5;
    });

    // Add spacing between messages
    yPosition += 6;
  });

  // Add footer on last page
  const totalPages = pdf.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    pdf.text(
      "Generated with BrewSpot Becca Practice Session",
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  return pdf;
}

export function downloadTranscriptPDF(
  messages: Message[],
  metadata?: TranscriptMetadata
) {
  const pdf = generateTranscriptPDF(messages, metadata);
  const filename = `brewspot-becca-transcript-${new Date().toISOString().slice(0, 10)}.pdf`;

  pdf.save(filename);
}
