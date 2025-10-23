import { jsPDF } from "jspdf";
import { Message, MessageSender } from "@/components/logic/context";

export interface TranscriptMetadata {
  sessionDate: string;
  sessionDuration?: string;
  avatarName?: string;
  feedback?: string; // Markdown feedback from AI evaluation
}

interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

function parseMarkdownFormatting(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentIndex = 0;

  // Combined pattern for bold, italic, and bold+italic
  // Matches: ***text***, **text**, *text*, _text_
  const pattern = /(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      segments.push({
        text: text.substring(currentIndex, match.index),
        bold: false,
        italic: false
      });
    }

    // Determine what was matched
    if (match[1]) {
      // ***text*** - bold and italic
      segments.push({ text: match[2], bold: true, italic: true });
    } else if (match[3]) {
      // **text** - bold only
      segments.push({ text: match[4], bold: true, italic: false });
    } else if (match[5]) {
      // *text* - italic only
      segments.push({ text: match[6], bold: false, italic: true });
    } else if (match[7]) {
      // _text_ - italic only
      segments.push({ text: match[8], bold: false, italic: true });
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({
      text: text.substring(currentIndex),
      bold: false,
      italic: false
    });
  }

  // If no formatting found, return the whole text
  if (segments.length === 0) {
    segments.push({ text, bold: false, italic: false });
  }

  return segments;
}

export function generateTranscriptPDF(
  messages: Message[],
  metadata?: TranscriptMetadata
) {
  const topMargin = 30;
  const bottomMargin = 30;
  const sideMargin = 20;
  const pageWidth = 210; // Standard A4 width in mm
  const pageHeight = 297; // Standard A4 height in mm
  const maxWidth = pageWidth - sideMargin * 2;
  const maxYPosition = pageHeight - bottomMargin;

  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4'
  });

  let yPosition = topMargin;

  // Function to check if we need a new page and add one if necessary
  const checkPageBreak = (requiredSpace: number, isHeading: boolean = false) => {
    // For headings, require extra space (at least 2-3 lines of content after)
    const minimumContentSpace = isHeading ? 15 : 0;
    const totalRequiredSpace = requiredSpace + minimumContentSpace;

    if (yPosition + totalRequiredSpace > maxYPosition) {
      pdf.addPage();
      yPosition = topMargin;
      return true;
    }
    return false;
  };

  // Add header
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("BrewSpot Becca Conversation Transcript", sideMargin, yPosition);
  yPosition += 12;

  // Add metadata
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);

  if (metadata?.sessionDate) {
    pdf.text(`Session Date: ${metadata.sessionDate}`, sideMargin, yPosition);
    yPosition += 6;
  }

  if (metadata?.sessionDuration) {
    pdf.text(`Duration: ${metadata.sessionDuration}`, sideMargin, yPosition);
    yPosition += 6;
  }

  if (metadata?.avatarName) {
    pdf.text(`Avatar: ${metadata.avatarName}`, sideMargin, yPosition);
    yPosition += 6;
  }

  // Add separator line
  yPosition += 4;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(sideMargin, yPosition, pageWidth - sideMargin, yPosition);
  yPosition += 10;

  // Reset text color for messages
  pdf.setTextColor(0, 0, 0);

  // Add feedback section if available
  if (metadata?.feedback) {
    checkPageBreak(20);

    // Parse and render markdown feedback - process in sequential order
    const feedbackLines = metadata.feedback.split('\n');
    let i = 0;

    while (i < feedbackLines.length) {
      const line = feedbackLines[i];

      // Skip empty lines but add minimal spacing
      if (line.trim() === '') {
        yPosition += 3;
        i++;
        continue;
      }

      // Check for horizontal rule
      if (line.trim() === '---') {
        checkPageBreak(8);
        pdf.setDrawColor(200, 200, 200);
        pdf.line(sideMargin, yPosition, pageWidth - sideMargin, yPosition);
        yPosition += 8;
        i++;
        continue;
      }

      // Check for headers
      if (line.startsWith('# ')) {
        checkPageBreak(12, true); // true indicates this is a heading
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(184, 114, 65); // Coffee brown
        const text = line.replace(/^#\s+/, '');
        pdf.text(text, sideMargin, yPosition);
        yPosition += 10;
        i++;
        continue;
      }

      if (line.startsWith('## ')) {
        checkPageBreak(10, true); // true indicates this is a heading
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(50, 50, 50);
        const text = line.replace(/^##\s+/, '');
        pdf.text(text, sideMargin, yPosition);
        yPosition += 8;
        i++;
        continue;
      }

      if (line.startsWith('### ')) {
        checkPageBreak(9, true); // true indicates this is a heading
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(80, 80, 80);
        const text = line.replace(/^###\s+/, '');
        pdf.text(text, sideMargin, yPosition);
        yPosition += 7;
        i++;
        continue;
      }

      // Check for bullet points
      if (line.trim().startsWith('- ')) {
        checkPageBreak(8);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        const text = line.trim().replace(/^-\s+/, '');
        const segments = parseMarkdownFormatting(text);

        // Render bullet point
        pdf.text('•', sideMargin + 5, yPosition);

        let xOffset = sideMargin + 12;
        let currentLine = '';

        segments.forEach((segment, idx) => {
          // Set font style based on bold and italic
          const fontStyle = segment.bold && segment.italic ? "bolditalic" :
                           segment.bold ? "bold" :
                           segment.italic ? "italic" : "normal";
          pdf.setFont("helvetica", fontStyle);

          // Simple word wrapping
          const words = segment.text.split(' ');
          words.forEach((word, wordIdx) => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = pdf.getTextWidth(testLine);

            if (testWidth > maxWidth - 17 && currentLine) {
              // Line is full, print and start new line
              pdf.text(currentLine, xOffset, yPosition);
              yPosition += 5;
              checkPageBreak(5);
              currentLine = word;
              xOffset = sideMargin + 12; // Indent continuation
            } else {
              currentLine = testLine;
            }
          });

          // Print accumulated text at segment boundary if not last segment
          if (idx < segments.length - 1 && currentLine) {
            pdf.text(currentLine, xOffset, yPosition);
            xOffset += pdf.getTextWidth(currentLine);
            currentLine = '';
          }
        });

        // Print any remaining text
        if (currentLine) {
          pdf.text(currentLine, xOffset, yPosition);
        }

        yPosition += 6;
        i++;
        continue;
      }


      // Regular paragraph text (default case)
      checkPageBreak(8);
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);

      const text = line.trim();
      const segments = parseMarkdownFormatting(text);

      let currentX = sideMargin;
      let currentLine = '';

      segments.forEach((segment, segIdx) => {
        // Set font style based on bold and italic
        const fontStyle = segment.bold && segment.italic ? "bolditalic" :
                         segment.bold ? "bold" :
                         segment.italic ? "italic" : "normal";
        pdf.setFont("helvetica", fontStyle);

        const words = segment.text.split(' ');
        words.forEach((word, wordIdx) => {
          const separator = (currentLine || wordIdx > 0) ? ' ' : '';
          const testText = currentLine + separator + word;
          const testWidth = pdf.getTextWidth(testText);

          if (currentX - sideMargin + testWidth > maxWidth && currentLine) {
            // Line is full, print current line and start new one
            pdf.text(currentLine, currentX, yPosition);
            yPosition += 5;
            checkPageBreak(5);
            currentLine = word;
            currentX = sideMargin;
          } else {
            currentLine = testText;
          }
        });

        // At segment boundary, render accumulated text if not last segment
        if (segIdx < segments.length - 1 && currentLine) {
          pdf.text(currentLine, currentX, yPosition);
          currentX += pdf.getTextWidth(currentLine);
          currentLine = '';
        }
      });

      // Render any remaining text
      if (currentLine) {
        pdf.text(currentLine, currentX, yPosition);
      }

      yPosition += 6;
      i++;
    }

    // Add extra separator after feedback
    yPosition += 4;
    checkPageBreak(10);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(sideMargin, yPosition, pageWidth - sideMargin, yPosition);
    yPosition += 10;

    // Add "Conversation Transcript" header
    checkPageBreak(10, true); // Avoid orphan heading
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Conversation Transcript", sideMargin, yPosition);
    yPosition += 10;
  }

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

    pdf.text(senderLabel + ":", sideMargin, yPosition);
    yPosition += 6;

    // Add message content
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);

    const lines = pdf.splitTextToSize(message.content, maxWidth);

    lines.forEach((line: string) => {
      checkPageBreak(6);
      pdf.text(line, sideMargin + 5, yPosition);
      yPosition += 5;
    });

    // Add spacing between messages
    yPosition += 6;
  });

  // Add footer
  yPosition += 10;
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    "Generated with BrewSpot Becca Practice Session",
    pageWidth / 2,
    yPosition,
    { align: "center" }
  );

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
