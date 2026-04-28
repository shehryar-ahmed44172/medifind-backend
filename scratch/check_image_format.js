const fs = require('fs');

const filePath = 'c:/Users/OCS/StudioProjects/medifind_mobile_application/assets/logos/medifind_app_icon.png';

try {
  const buffer = fs.readFileSync(filePath);
  const header = buffer.toString('hex', 0, 8);
  console.log('File Header:', header);

  if (header.startsWith('89504e47')) {
    console.log('Format: PNG');
  } else if (header.startsWith('ffd8ff')) {
    console.log('Format: JPEG');
  } else if (header.startsWith('47494638')) {
    console.log('Format: GIF');
  } else {
    console.log('Format: Unknown');
  }
} catch (err) {
  console.error('Error:', err.message);
}
