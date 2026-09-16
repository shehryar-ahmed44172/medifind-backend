import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subDir = '';
    
    // Determine subdirectory based on fieldname or route
    if (file.fieldname === 'report') subDir = 'reports';
    else if (file.fieldname === 'file' && req.baseUrl?.startsWith('/api/chat')) subDir = 'chat';
    else if (file.fieldname === 'file') subDir = 'documents';   // registration docs (CNIC, employee card)
    else if (file.fieldname === 'image') subDir = 'profile';
    else subDir = 'others';
    
    const targetPath = path.join(uploadDir, subDir);
    
    // Ensure subdirectory exists
    if (subDir && !fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    
    cb(null, targetPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter: images, PDFs, audio and Word documents only
const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf',
  '.m4a', '.aac', '.mp3', '.wav', '.ogg', '.webm', '.mp4',
  '.doc', '.docx',
];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeOk =
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('audio/') ||
    ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    // mobile clients often send application/octet-stream — fall back to the extension
    file.mimetype === 'application/octet-stream';

  if (mimeOk && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed: images, PDF, audio and Word documents.'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});
