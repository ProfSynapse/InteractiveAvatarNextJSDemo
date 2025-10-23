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
  const margin = 20;
  const pageWidth = 210; // Standard A4 width in mm
  const maxWidth = pageWidth - margin * 2;

  // Create a temporary PDF to measure content accurately
  const tempPdf = new jsPDF({
    unit: 'mm',
    format: 'a4'
  });

  // Pre-calculate exact height needed
  let calculatedHeight = margin; // Start with top margin

  // Header
  tempPdf.setFontSize(20);
  calculatedHeight += 12;

  // Metadata
  tempPdf.setFontSize(10);
  if (metadata?.sessionDate) calculatedHeight += 6;
  if (metadata?.sessionDuration) calculatedHeight += 6;
  if (metadata?.avatarName) calculatedHeight += 6;
  calculatedHeight += 4 + 10; // separator line + spacing

  // Feedback section
  if (metadata?.feedback) {
    const feedbackLines = metadata.feedback.split('\n');
    for (const line of feedbackLines) {
      if (line.trim().startsWith('|')) {
        calculatedHeight += 15; // Row height estimate
      } else if (line.startsWith('# ')) {
        calculatedHeight += 10;
      } else if (line.startsWith('## ')) {
        calculatedHeight += 8;
      } else if (line.trim() === '---') {
        calculatedHeight += 8;
      } else if (line.trim()) {
        calculatedHeight += 6;
      } else {
        calculatedHeight += 3;
      }
    }
    calculatedHeight += 14; // separator + header
  }

  // Messages
  tempPdf.setFontSize(10);
  messages.forEach((message) => {
    calculatedHeight += 6; // sender label
    const lines = tempPdf.splitTextToSize(message.content, maxWidth);
    calculatedHeight += lines.length * 5; // content lines
    calculatedHeight += 6; // spacing
  });

  // Footer
  calculatedHeight += 30;

  // Create actual PDF with calculated height (add 10% safety buffer)
  const pageHeight = Math.max(297, calculatedHeight * 1.1);

  const pdf = new jsPDF({
    unit: 'mm',
    format: [pageWidth, pageHeight]
  });

  let yPosition = margin;

  // Dummy function - no page breaks in continuous mode
  const checkPageBreak = (requiredSpace: number) => {
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
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
        i++;
        continue;
      }

      // Check for headers
      if (line.startsWith('# ')) {
        checkPageBreak(12);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(184, 114, 65); // Coffee brown
        const text = line.replace(/^#\s+/, '');
        pdf.text(text, margin, yPosition);
        yPosition += 10;
        i++;
        continue;
      }

      if (line.startsWith('## ')) {
        checkPageBreak(10);
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(50, 50, 50);
        const text = line.replace(/^##\s+/, '');
        pdf.text(text, margin, yPosition);
        yPosition += 8;
        i++;
        continue;
      }

      if (line.startsWith('### ')) {
        checkPageBreak(9);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(80, 80, 80);
        const text = line.replace(/^###\s+/, '');
        pdf.text(text, margin, yPosition);
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
        pdf.text('•', margin + 5, yPosition);

        let xOffset = margin + 12;
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
              xOffset = margin + 12; // Indent continuation
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

      // Check if this is the start of a table
      if (line.trim().startsWith('|')) {
        const tableRows: string[] = [];

        // Collect all consecutive table rows
        while (i < feedbackLines.length && feedbackLines[i].trim().startsWith('|')) {
          tableRows.push(feedbackLines[i]);
          i++;
        }

        // Parse and render table
        if (tableRows.length >= 2) {
          const headerRow = tableRows[0].split('|').map(cell => cell.trim()).filter(cell => cell);
          const dataRows = tableRows.slice(2).map(row =>
            row.split('|').map(cell => cell.trim()).filter(cell => cell)
          );

          // Calculate column widths
          const numCols = headerRow.length;
          const colWidth = (maxWidth - 5) / numCols;

          checkPageBreak(15 + dataRows.length * 12);

          // Track table start position for border drawing
          const tableStartY = yPosition - 5;

          // Draw header
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0); // Black text for table
          pdf.setFillColor(240, 235, 225);
          pdf.rect(margin, tableStartY, maxWidth, 10, 'F');

          headerRow.forEach((header, idx) => {
            const xPos = margin + 2 + (idx * colWidth);
            const segments = parseMarkdownFormatting(header);
            let xOffset = xPos;

            segments.forEach(segment => {
              const fontStyle = segment.bold && segment.italic ? "bolditalic" :
                               segment.bold ? "bold" :
                               segment.italic ? "italic" : "bold";
              pdf.setFont("helvetica", fontStyle);
              pdf.text(segment.text, xOffset, yPosition, { maxWidth: colWidth - 4 });
              xOffset += pdf.getTextWidth(segment.text);
            });
          });

          yPosition += 10;

          // Draw data rows
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(0, 0, 0); // Black text for table data

          const rowYPositions: number[] = []; // Track Y positions for horizontal lines

          dataRows.forEach((row, rowIdx) => {
            const rowHeight = Math.max(15, ...row.map(cell => {
              const lines = pdf.splitTextToSize(cell, colWidth - 4);
              return lines.length * 4 + 6;
            }));

            checkPageBreak(rowHeight + 5);

            // Track row start position
            rowYPositions.push(yPosition - 3);

            // Alternate row coloring
            if (rowIdx % 2 === 0) {
              pdf.setFillColor(252, 250, 245);
              pdf.rect(margin, yPosition - 3, maxWidth, rowHeight, 'F');
            }

            row.forEach((cell, colIdx) => {
              const xPos = margin + 2 + (colIdx * colWidth);
              const segments = parseMarkdownFormatting(cell);
              let currentY = yPosition;
              let currentX = xPos;
              let currentLineText = '';

              segments.forEach(segment => {
                const fontStyle = segment.bold && segment.italic ? "bolditalic" :
                                 segment.bold ? "bold" :
                                 segment.italic ? "italic" : "normal";
                pdf.setFont("helvetica", fontStyle);

                const words = segment.text.split(' ');
                words.forEach(word => {
                  const testText = currentLineText + (currentLineText ? ' ' : '') + word;
                  const testWidth = pdf.getTextWidth(testText);

                  if (testWidth > colWidth - 4 && currentLineText) {
                    pdf.text(currentLineText, currentX, currentY);
                    currentY += 4;
                    currentLineText = word;
                    currentX = xPos;
                  } else {
                    currentLineText = testText;
                  }
                });
              });

              if (currentLineText) {
                pdf.text(currentLineText, currentX, currentY);
              }
            });

            yPosition += rowHeight;
          });

          // Calculate actual table height and draw borders
          const totalTableHeight = yPosition - tableStartY;
          pdf.setDrawColor(220, 210, 200);
          pdf.setLineWidth(0.5);

          // Draw outer border
          pdf.rect(margin, tableStartY, maxWidth, totalTableHeight);

          // Draw horizontal line after header
          pdf.line(margin, tableStartY + 10, margin + maxWidth, tableStartY + 10);

          // Draw horizontal lines between rows
          rowYPositions.forEach((rowY) => {
            pdf.line(margin, rowY, margin + maxWidth, rowY);
          });

          // Draw column separators
          for (let col = 1; col < numCols; col++) {
            const xPos = margin + (col * colWidth);
            pdf.line(xPos, tableStartY, xPos, yPosition);
          }

          yPosition += 8;
        }
        i++; // Move past the table
        continue;
      }

      // Regular paragraph text (default case)
      checkPageBreak(8);
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);

      const text = line.trim();
      const segments = parseMarkdownFormatting(text);

      let currentX = margin;
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

          if (currentX - margin + testWidth > maxWidth && currentLine) {
            // Line is full, print current line and start new one
            pdf.text(currentLine, currentX, yPosition);
            yPosition += 5;
            checkPageBreak(5);
            currentLine = word;
            currentX = margin;
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
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Add "Conversation Transcript" header
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Conversation Transcript", margin, yPosition);
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
