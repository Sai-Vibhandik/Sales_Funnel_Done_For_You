const axios = require('axios');
const pdf = require('pdf-parse');
const fs = require('fs');

// Common font families for matching
const COMMON_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Nunito', 'Ubuntu', 'Playfair Display', 'Merriweather', 'Lora', 'Source Sans Pro',
  'PT Sans', 'Muli', 'Work Sans', 'Quicksand', 'Rubik', 'Heebo', 'Barlow',
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma',
  'Proxima Nova', 'Avenir', 'Futura', 'Gill Sans', 'Century Gothic', 'Arial Black'
];

// Default empty values
const DEFAULT_COLORS = {
  primary: { hex: '', name: 'Primary' },
  secondary: { hex: '', name: 'Secondary' },
  tertiary: { hex: '', name: 'Tertiary' }
};

const DEFAULT_TYPOGRAPHY = {
  title: { fontFamily: '' },
  subtitle: { fontFamily: '' },
  body: { fontFamily: '' }
};

// Common hex color regex patterns
const HEX_COLOR_REGEX = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;

/**
 * Extract brand information from a PDF
 * @param {string} fileUrl - URL or path to the PDF file
 * @returns {Object} Extracted brand data
 */
async function extractBrandInfo(fileUrl) {
  console.log('=== Starting Brand Extraction ===');
  console.log('File URL:', fileUrl);

  // Default result structure
  const defaultResult = {
    colors: { ...DEFAULT_COLORS },
    typography: { ...DEFAULT_TYPOGRAPHY }
  };

  try {
    let pdfBuffer;
    let pdfText = '';

    // Check if it's a URL or local file
    if (fileUrl && fileUrl.startsWith('http')) {
      // Download PDF from URL (Cloudinary or other)
      console.log('Downloading PDF from URL...');
      try {
        const response = await axios.get(fileUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'Accept': 'application/pdf,*/*'
          }
        });
        pdfBuffer = Buffer.from(response.data);
        console.log('PDF downloaded successfully, size:', pdfBuffer.length, 'bytes');
      } catch (downloadError) {
        console.error('PDF download error:', downloadError.message);
        return defaultResult;
      }
    } else if (fileUrl) {
      // Read local file
      console.log('Reading local file...');
      try {
        if (!fs.existsSync(fileUrl)) {
          console.error('Local file not found:', fileUrl);
          return defaultResult;
        }
        pdfBuffer = fs.readFileSync(fileUrl);
        console.log('Local file read, size:', pdfBuffer.length, 'bytes');
      } catch (readError) {
        console.error('File read error:', readError.message);
        return defaultResult;
      }
    } else {
      console.error('No file URL provided');
      return defaultResult;
    }

    // Check if buffer is valid
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('Empty PDF buffer');
      return defaultResult;
    }

    // Parse PDF to extract text
    console.log('Parsing PDF...');
    try {
      const pdfData = await pdf(pdfBuffer);
      pdfText = pdfData.text || '';
      console.log('PDF parsed successfully');
      console.log('Text extracted length:', pdfText.length, 'characters');

      // Log first 1000 chars for debugging
      if (pdfText.length > 0) {
        console.log('Text preview (first 1000 chars):', pdfText.substring(0, 1000));
      } else {
        console.log('WARNING: No text extracted from PDF (might be image-based)');
      }
    } catch (pdfError) {
      console.error('PDF parse error:', pdfError.message);
      return defaultResult;
    }

    // Extract using regex
    const extractedData = extractWithRegex(pdfText);
    return extractedData;

  } catch (error) {
    console.error('Brand extraction error:', error.message);
    console.error('Stack:', error.stack);
    return defaultResult;
  }
}

/**
 * Extract brand info using regex patterns from PDF text
 * @param {string} text - Extracted PDF text
 * @returns {Object} Structured brand data
 */
function extractWithRegex(text) {
  console.log('Using regex extraction...');

  const colors = {
    primary: { hex: '', name: 'Primary' },
    secondary: { hex: '', name: 'Secondary' },
    tertiary: { hex: '', name: 'Tertiary' }
  };

  const typography = {
    title: { fontFamily: '' },
    subtitle: { fontFamily: '' },
    body: { fontFamily: '' }
  };

  if (!text || text.length === 0) {
    console.log('No text to extract from');
    return { colors, typography };
  }

  console.log('Processing text of length:', text.length);

  // Extract hex colors
  const hexMatches = [...text.matchAll(HEX_COLOR_REGEX)];
  const foundColors = hexMatches
    .map(m => m[0])
    .filter(c => {
      const lower = c.toLowerCase();
      // Filter out common UI/utility colors
      return lower !== '#ffffff' &&
             lower !== '#fff' &&
             lower !== '#000000' &&
             lower !== '#000' &&
             lower !== '#ccc' &&
             lower !== '#cccccc' &&
             lower !== '#eee' &&
             lower !== '#eeeeee' &&
             lower !== '#ddd' &&
             lower !== '#dddddd' &&
             lower !== '#f5f5f5' &&
             lower !== '#fafafa' &&
             lower !== '#333' &&
             lower !== '#333333' &&
             lower !== '#666' &&
             lower !== '#666666' &&
             lower !== '#999' &&
             lower !== '#999999';
    });

  console.log('Found hex colors:', foundColors);

  // Assign found colors to brand color slots
  if (foundColors.length >= 1) colors.primary.hex = foundColors[0];
  if (foundColors.length >= 2) colors.secondary.hex = foundColors[1];
  if (foundColors.length >= 3) colors.tertiary.hex = foundColors[2];

  // Extract font families - search for common fonts in text
  const foundFonts = [];
  const lowerText = text.toLowerCase();

  // Search for each known font in the text
  for (const font of COMMON_FONTS) {
    if (lowerText.includes(font.toLowerCase()) && !foundFonts.includes(font)) {
      foundFonts.push(font);
      console.log('Found font in text:', font);
    }
  }

  // Also try regex patterns for font declarations
  const fontPatterns = [
    /font[- ]?family\s*[:\-=]?\s*["']?([A-Za-z\s]+)["']?/gi,
    /typeface\s*[:\-=]?\s*["']?([A-Za-z\s]+)["']?/gi,
    /primary\s*font\s*[:\-=]?\s*["']?([A-Za-z\s]+)["']?/gi,
    /heading\s*font\s*[:\-=]?\s*["']?([A-Za-z\s]+)["']?/gi,
    /body\s*font\s*[:\-=]?\s*["']?([A-Za-z\s]+)["']?/gi,
    /title\s*font\s*[:\-=]?\s*["']?([A-Za-z\s]+)["']?/gi
  ];

  for (const pattern of fontPatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const fontName = match[1]?.trim();
      if (fontName && fontName.length > 2) {
        // Check if extracted font name matches any known font
        const normalizedFontName = fontName.toLowerCase();
        for (const knownFont of COMMON_FONTS) {
          if (normalizedFontName.includes(knownFont.toLowerCase()) && !foundFonts.includes(knownFont)) {
            foundFonts.push(knownFont);
            console.log('Found font via pattern:', knownFont);
          }
        }
      }
    }
  }

  console.log('Found fonts:', foundFonts);

  // Assign found fonts
  if (foundFonts.length >= 1) typography.title.fontFamily = foundFonts[0];
  if (foundFonts.length >= 2) typography.subtitle.fontFamily = foundFonts[1];
  if (foundFonts.length >= 3) typography.body.fontFamily = foundFonts[2];
  // If only one font, use it for all
  if (foundFonts.length === 1) {
    typography.subtitle.fontFamily = foundFonts[0];
    typography.body.fontFamily = foundFonts[0];
  }

  console.log('Extraction result:', JSON.stringify({ colors, typography }, null, 2));

  return { colors, typography };
}

module.exports = {
  extractBrandInfo,
  extractWithRegex,
  COMMON_FONTS
};