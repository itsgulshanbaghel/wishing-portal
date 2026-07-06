const sharp = require('sharp');
const { createCanvas } = require('canvas');
const path = require('path');

/**
 * Generate a beautiful OG preview image
 * Uses Canvas for rendering complex layouts with gradients and text
 */
async function generateOGImage(data) {
  try {
    const {
      recipientName = 'Someone Special',
      eventType = 'Birthday',
      creatorName = 'A Friend',
      mood = 'happy',
      message = 'Wishing you happiness!',
      color = 'gradient', // gradient, pink, purple, gold, blue
      templateId = null
    } = data;

    // Define color schemes based on mood or event
    const colorSchemes = {
      birthday: {
        primary: '#FF6B9D',
        secondary: '#FFA5D5',
        accent: '#FFE66D',
        bg: 'linear-gradient(135deg, #FFE5EC 0%, #FFE8F5 100%)'
      },
      anniversary: {
        primary: '#D63384',
        secondary: '#E85FAD',
        accent: '#FF9FBE',
        bg: 'linear-gradient(135deg, #FFE8F0 0%, #FFF0FA 100%)'
      },
      proposal: {
        primary: '#C41E3A',
        secondary: '#FF1744',
        accent: '#FFB6C1',
        bg: 'linear-gradient(135deg, #FFE8E8 0%, #FFF0F0 100%)'
      },
      festival: {
        primary: '#FF8C00',
        secondary: '#FFB347',
        accent: '#FFD700',
        bg: 'linear-gradient(135deg, #FFF5E1 0%, #FFFACD 100%)'
      },
      default: {
        primary: '#7B5DF6',
        secondary: '#FF7A2F',
        accent: '#A78BFA',
        bg: 'linear-gradient(135deg, #F0EBFF 0%, #FFF0E8 100%)'
      }
    };

    const scheme = colorSchemes[eventType?.toLowerCase()] || colorSchemes.default;

    // Create canvas
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Create gradient background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#FFE5EC');
    grad.addColorStop(0.5, '#FFF5F0');
    grad.addColorStop(1, '#F0EBFF');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Add decorative circles (background elements)
    ctx.fillStyle = 'rgba(255, 192, 203, 0.3)';
    ctx.beginPath();
    ctx.arc(150, 100, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(176, 224, 230, 0.2)';
    ctx.beginPath();
    ctx.arc(1050, 530, 150, 0, Math.PI * 2);
    ctx.fill();

    // Add main heading with gradient effect
    ctx.font = 'bold 72px "Arial", sans-serif';
    ctx.fillStyle = scheme.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Main greeting text
    const greeting = `Happy ${eventType}`;
    ctx.fillText(greeting, width / 2, 80);

    // Recipient name in large, bold text
    ctx.font = 'bold 90px "Arial Black", sans-serif';
    ctx.fillStyle = scheme.primary;
    
    const maxNameWidth = width - 100;
    let fontSize = 90;
    ctx.font = `bold ${fontSize}px "Arial Black", sans-serif`;
    
    // Fit text if too long
    while (ctx.measureText(recipientName).width > maxNameWidth && fontSize > 40) {
      fontSize -= 5;
      ctx.font = `bold ${fontSize}px "Arial Black", sans-serif`;
    }
    
    ctx.fillText(recipientName, width / 2, 160);

    // Heart emoji
    ctx.font = '60px Arial';
    ctx.fillText('💝', width / 2 - 60, 270);

    // Message/Quote
    ctx.font = '22px "Segoe UI", Arial';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    
    // Word wrap the message
    const maxWidth = width - 100;
    const lineHeight = 28;
    let y = 350;
    
    const words = message.split(' ');
    let line = '';
    
    for (let word of words) {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > maxWidth) {
        if (line) {
          ctx.fillText(line, width / 2, y);
          y += lineHeight;
        }
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, width / 2, y);
    }

    // Call to action button
    ctx.fillStyle = scheme.primary;
    const buttonY = 520;
    const buttonX = width / 2;
    const buttonWidth = 400;
    const buttonHeight = 60;
    
    // Draw rounded rectangle for button
    ctx.beginPath();
    ctx.roundRect(buttonX - buttonWidth / 2, buttonY, buttonWidth, buttonHeight, 15);
    ctx.fill();

    // Button text
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tap to open your surprise', buttonX, buttonY + buttonHeight / 2);

    // Creator attribution (bottom right)
    ctx.font = '14px Arial';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`From ${creatorName}`, width - 30, height - 20);

    // Website branding (bottom left)
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = scheme.primary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('🎂 thegreeter.in', 30, height - 20);

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');
    return buffer;

  } catch (error) {
    console.error('Error generating OG image:', error);
    throw error;
  }
}

/**
 * Generate OG meta tags based on website data
 */
function generateOGMetaTags(data, websiteUrl) {
  const {
    recipientName = 'Someone Special',
    eventType = 'Birthday',
    creatorName = 'A Friend',
    message = '',
    templateName = 'Standard'
  } = data;

  const eventEmojis = {
    birthday: '🎂',
    anniversary: '💍',
    proposal: '💎',
    festival: '🎉',
    others: '🎁'
  };

  const emoji = eventEmojis[eventType?.toLowerCase()] || eventEmojis.others;

  // Construct description
  let description = `${emoji} Happy ${eventType} ${recipientName}! `;
  if (creatorName) {
    description += `A special wish from ${creatorName}.`;
  }
  if (message && message.length > 0) {
    const preview = message.substring(0, 80) + (message.length > 80 ? '...' : '');
    description += ` "${preview}"`;
  } else {
    description += ` A special birthday wish just for you!`;
  }

  return {
    title: `Happy ${eventType} ${recipientName} 💝`,
    description: description.substring(0, 160), // Twitter limit
    type: 'website',
    url: websiteUrl,
    siteName: 'TheGreeter'
  };
}

/**
 * Save OG image to file system
 */
async function saveOGImage(buffer, filename) {
  const fs = require('fs').promises;
  const uploadsDir = path.join(__dirname, 'uploads', 'og-images');
  
  try {
    // Create directory if it doesn't exist
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, buffer);
    
    return `/uploads/og-images/${filename}`;
  } catch (error) {
    console.error('Error saving OG image:', error);
    throw error;
  }
}

module.exports = {
  generateOGImage,
  generateOGMetaTags,
  saveOGImage
};
